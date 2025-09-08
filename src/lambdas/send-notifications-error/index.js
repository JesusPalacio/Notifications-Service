const NotificationError = require('./shared/models/notificationError');
const dynamoDBService = require('./shared/utils/dynamodb');
const sesService = require('./shared/utils/ses');
const logger = require('./shared/utils/logger');

const { 
  TABLE_NAMES,
  EMAIL_CONFIG
} = require('./config/constants');

/**
 * Lambda handler para procesar errores de notificaciones desde DLQ
 * Esta lambda se activa cuando los mensajes fallan en la lambda principal
 * @param {Object} event - Evento de SQS DLQ con los mensajes fallidos
 * @param {Object} context - Contexto de Lambda
 */
exports.handler = async (event, context) => {
  logger.info('Starting error processing for failed notifications', { 
    recordsCount: event.Records?.length || 0 
  });

  const results = {
    processed: 0,
    resolved: 0,
    criticalErrors: 0,
    adminNotified: 0
  };

  // Procesar cada mensaje fallido de la DLQ
  for (const record of event.Records || []) {
    try {
      const errorInfo = await processFailedMessage(record);
      results.processed++;

      // Si el error fue resuelto automáticamente
      if (errorInfo.resolved) {
        results.resolved++;
      }

      // Si es un error crítico, notificar al admin
      if (errorInfo.isCritical) {
        results.criticalErrors++;
        await notifyAdminOfCriticalError(errorInfo);
        results.adminNotified++;
      }

    } catch (processingError) {
      logger.error('Failed to process error message', processingError);
      // Los errores aquí van a otra DLQ o se logean para revisión manual
    }
  }

  logger.info('Error processing completed', results);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Error processing completed',
      results
    })
  };
};

/**
 * Procesa un mensaje individual que falló
 * @param {Object} sqsRecord - Record individual de SQS DLQ
 * @returns {Object} Información del error procesado
 */
async function processFailedMessage(sqsRecord) {
  let originalMessage;
  
  try {
    originalMessage = JSON.parse(sqsRecord.body);
  } catch (parseError) {
    logger.error('Failed to parse DLQ message body', parseError);
    originalMessage = { type: 'UNKNOWN', data: {} };
  }

  logger.info('Processing failed message', { 
    messageId: sqsRecord.messageId,
    type: originalMessage.type,
    approximateReceiveCount: sqsRecord.attributes?.ApproximateReceiveCount || 'unknown'
  });

  // Determinar el tipo de error y la estrategia de manejo
  const errorAnalysis = analyzeFailureReason(sqsRecord, originalMessage);
  
  // Crear registro de error
  const notificationError = new NotificationError({
    originalNotificationId: originalMessage.notificationId,
    type: originalMessage.type,
    email: extractEmailFromMessage(originalMessage),
    errorType: errorAnalysis.errorType,
    errorMessage: errorAnalysis.errorMessage,
    errorStack: errorAnalysis.errorStack,
    sqsMessageId: sqsRecord.messageId,
    originalSqsMessage: sqsRecord,
    attempts: parseInt(sqsRecord.attributes?.ApproximateReceiveCount || '0')
  });

  // Guardar en tabla de errores
  try {
    await dynamoDBService.saveNotification(
      TABLE_NAMES.NOTIFICATION_ERRORS, 
      notificationError.toDynamoDBItem()
    );
    logger.info('Error record saved', { errorId: notificationError.uuid });
  } catch (saveError) {
    logger.error('Failed to save error record', saveError);
    // En un caso real, esto iría a CloudWatch para alertas críticas
  }

  // Intentar resolución automática según el tipo de error
  const resolutionResult = await attemptAutomaticResolution(
    originalMessage, 
    errorAnalysis, 
    notificationError
  );

  return {
    errorId: notificationError.uuid,
    errorType: errorAnalysis.errorType,
    resolved: resolutionResult.resolved,
    isCritical: notificationError.isCritical(),
    resolutionAction: resolutionResult.action,
    notificationError
  };
}

/**
 * Analiza la razón del fallo basado en el mensaje y atributos SQS
 * @param {Object} sqsRecord - Record de SQS
 * @param {Object} originalMessage - Mensaje original que falló
 * @returns {Object} Análisis del error
 */
function analyzeFailureReason(sqsRecord, originalMessage) {
  const receiveCount = parseInt(sqsRecord.attributes?.ApproximateReceiveCount || '0');
  
  // Determinar tipo de error basado en patrones comunes
  let errorType = 'UNKNOWN_ERROR';
  let errorMessage = 'Message failed to process after multiple attempts';
  let errorStack = null;

  // Si el mensaje contiene información de error de la lambda original
  if (originalMessage.errorInfo) {
    errorType = originalMessage.errorInfo.errorType || 'PROCESSING_ERROR';
    errorMessage = originalMessage.errorInfo.errorMessage || errorMessage;
    errorStack = originalMessage.errorInfo.errorStack;
  } else {
    // Inferir tipo de error basado en características del mensaje
    if (!originalMessage.email && !extractEmailFromMessage(originalMessage)) {
      errorType = 'VALIDATION_ERROR';
      errorMessage = 'Missing email address in notification message';
    } else if (!originalMessage.type) {
      errorType = 'VALIDATION_ERROR';
      errorMessage = 'Missing notification type';
    } else if (receiveCount > 3) {
      errorType = 'REPEATED_FAILURE';
      errorMessage = `Message failed ${receiveCount} times, likely persistent issue`;
    }
  }

  return {
    errorType,
    errorMessage,
    errorStack,
    receiveCount,
    inferredFromDLQ: !originalMessage.errorInfo
  };
}

/**
 * Intenta resolver automáticamente ciertos tipos de errores
 * @param {Object} originalMessage - Mensaje original
 * @param {Object} errorAnalysis - Análisis del error  
 * @param {NotificationError} notificationError - Objeto de error
 * @returns {Object} Resultado del intento de resolución
 */
async function attemptAutomaticResolution(originalMessage, errorAnalysis, notificationError) {
  const result = {
    resolved: "false",
    action: 'LOGGED_FOR_MANUAL_REVIEW'
  };

  try {
    switch (errorAnalysis.errorType) {
      case 'VALIDATION_ERROR':
        // Para errores de validación, intentar corregir datos conocidos
        if (!originalMessage.email && originalMessage.userId) {
          result.action = 'ATTEMPTED_EMAIL_LOOKUP';
          // En un caso real, buscaríamos el email en la base de datos de usuarios
          logger.info('Email lookup needed for user', { userId: originalMessage.userId });
        }
        break;

      case 'TEMPLATE_ERROR':
        // Para errores de template, usar template genérico
        result.action = 'FALLBACK_TEMPLATE_USED';
        await retryWithGenericTemplate(originalMessage);
        result.resolved = true;
        break;

      case 'RATE_LIMIT_ERROR':
        // Para límites de tasa, programar reintento después
        result.action = 'SCHEDULED_FOR_RETRY';
        await scheduleDelayedRetry(originalMessage, '15m');
        result.resolved = true;
        break;

      case 'TEMPORARY_SERVICE_ERROR':
        // Para errores temporales, reintento inmediato una vez
        if (errorAnalysis.receiveCount <= 2) {
          result.action = 'IMMEDIATE_RETRY_ATTEMPTED';
          await retryNotification(originalMessage);
          result.resolved = true;
        }
        break;

      default:
        // Errores desconocidos se logean para revisión manual
        result.action = 'REQUIRES_MANUAL_INVESTIGATION';
        break;
    }

    if (result.resolved) {
      notificationError.markAsResolved('automatic-resolution');
      await dynamoDBService.saveNotification(
        TABLE_NAMES.NOTIFICATION_ERRORS, 
        notificationError.toDynamoDBItem()
      );
    }

  } catch (resolutionError) {
    logger.error('Failed to attempt automatic resolution', resolutionError);
    result.action = 'RESOLUTION_FAILED';
  }

  return result;
}

/**
 * Reintenta enviar la notificación con template genérico
 * @param {Object} originalMessage - Mensaje original
 */
async function retryWithGenericTemplate(originalMessage) {
  logger.info('Retrying with generic template', { 
    type: originalMessage.type,
    email: extractEmailFromMessage(originalMessage)
  });
  
  // En un caso real, aquí se reenviaría a la cola principal con flag especial
  // para usar template genérico
}

/**
 * Programa un reintento después de un delay
 * @param {Object} originalMessage - Mensaje original  
 * @param {string} delay - Delay en formato '15m', '1h', etc.
 */
async function scheduleDelayedRetry(originalMessage, delay) {
  logger.info('Scheduling delayed retry', { 
    delay,
    type: originalMessage.type,
    email: extractEmailFromMessage(originalMessage)
  });
  
  // En un caso real, aquí se usaría SQS con delay o EventBridge
}

/**
 * Reintenta la notificación inmediatamente
 * @param {Object} originalMessage - Mensaje original
 */
async function retryNotification(originalMessage) {
  logger.info('Attempting immediate retry', {
    type: originalMessage.type,
    email: extractEmailFromMessage(originalMessage)
  });
  
  // En un caso real, aquí se reenviaría a la cola principal
}

/**
 * Notifica al administrador sobre errores críticos
 * @param {Object} errorInfo - Información del error crítico
 */
async function notifyAdminOfCriticalError(errorInfo) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@infernobank.com';
    
    const subject = `🚨 Critical Error in Notification Service - ${errorInfo.errorType}`;
    
    const htmlBody = `
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 5px;">
          <h2 style="color: #721c24;">🚨 Critical Notification Service Error</h2>
          
          <h3>Error Details:</h3>
          <ul>
            <li><strong>Error ID:</strong> ${errorInfo.errorId}</li>
            <li><strong>Error Type:</strong> ${errorInfo.errorType}</li>
            <li><strong>Notification Type:</strong> ${errorInfo.notificationError.type}</li>
            <li><strong>User Email:</strong> ${errorInfo.notificationError.email || 'N/A'}</li>
            <li><strong>Attempts:</strong> ${errorInfo.notificationError.attempts}</li>
            <li><strong>Resolution Action:</strong> ${errorInfo.resolutionAction}</li>
          </ul>
          
          <h3>Error Message:</h3>
          <p style="background-color: #fff; padding: 10px; border-left: 4px solid #dc3545;">
            ${errorInfo.notificationError.errorMessage}
          </p>
          
          <p style="margin-top: 20px;">
            <strong>Action Required:</strong> Please investigate this critical error in the notification service.
          </p>
          
          <p style="color: #6c757d; font-size: 12px;">
            This alert was generated automatically by the notification error handler.
          </p>
        </div>
      </body>
      </html>
    `;

    await sesService.sendEmail(adminEmail, subject, htmlBody);
    
    logger.info('Critical error notification sent to admin', { 
      adminEmail,
      errorId: errorInfo.errorId 
    });

  } catch (notificationError) {
    logger.error('Failed to notify admin of critical error', notificationError);
    // En un caso real, esto activaría alertas adicionales (SNS, Slack, etc.)
  }
}

/**
 * Extrae el email del mensaje si no está en el nivel raíz
 * @param {Object} messageBody - Cuerpo del mensaje
 * @returns {string|null} Email encontrado
 */
function extractEmailFromMessage(messageBody) {
  return messageBody.email || 
         messageBody.data?.email || 
         messageBody.userEmail ||
         messageBody.data?.userEmail ||
         null;
}

/**
 * Función para testing local
 * Simula un evento de DLQ para pruebas
 */
exports.testLocal = async () => {
  const testEvent = {
    Records: [
      {
        messageId: 'error-test-1',
        body: JSON.stringify({
          type: 'WELCOME',
          email: 'failed@example.com',
          data: { fullName: 'Failed User' },
          errorInfo: {
            errorType: 'SESError',
            errorMessage: 'Rate limit exceeded',
            errorStack: 'Mock error stack trace'
          }
        }),
        attributes: {
          ApproximateReceiveCount: '3'
        }
      },
      {
        messageId: 'error-test-2',
        body: JSON.stringify({
          type: 'TRANSACTION.PURCHASE',
          // Sin email para simular error de validación
          data: { 
            amount: 50000,
            merchant: 'Test Store'
          }
        }),
        attributes: {
          ApproximateReceiveCount: '1'
        }
      }
    ]
  };

  console.log('🚨 Testing send-notifications-error lambda locally...');
  const result = await exports.handler(testEvent, {});
  console.log('✅ Error handling test completed:', result);
  return result;
};

// Para testing desde línea de comandos
if (require.main === module) {
  exports.testLocal().catch(console.error);
}