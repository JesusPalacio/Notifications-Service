const Notification = require('./shared/models/notification');
const NotificationError = require('./shared/models/notificationError');
const EmailTemplateManager = require('./shared/templates/emailTemplates');
const dynamoDBService = require('./shared/utils/dynamodb');
const s3Service = require('./shared/utils/s3');
const sesService = require('./shared/utils/ses');
const logger = require('./shared/utils/logger');

const { 
  TABLE_NAMES, 
  S3_BUCKETS, 
  QUEUE_URLS 
} = require('./config/constants');

/**
 * Lambda handler principal para procesar notificaciones desde SQS
 * @param {Object} event - Evento de SQS con los mensajes
 * @param {Object} context - Contexto de Lambda
 */
exports.handler = async (event, context) => {
  logger.info('Starting notification processing', { 
    recordsCount: event.Records?.length || 0 
  });

  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };

  // Procesar cada mensaje de SQS
  for (const record of event.Records || []) {
    try {
      await processNotificationMessage(record);
      results.successful++;
    } catch (error) {
      logger.error('Failed to process notification message', error);
      results.failed++;
      results.errors.push({
        messageId: record.messageId,
        error: error.message
      });
      
      // Enviar a DLQ si el error es crítico
      await handleProcessingError(record, error);
    }
  }

  logger.info('Notification processing completed', results);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Notifications processed',
      results
    })
  };
};

/**
 * Procesa un mensaje individual de notificación
 * @param {Object} sqsRecord - Record individual de SQS
 */
async function processNotificationMessage(sqsRecord) {
  const messageBody = JSON.parse(sqsRecord.body);
  logger.info('Processing notification message', { 
    messageId: sqsRecord.messageId,
    type: messageBody.type 
  });

  // Validar estructura del mensaje
  validateMessageStructure(messageBody);

  // Crear objeto Notification
  const notification = Notification.fromSQSMessage(
    messageBody, 
    messageBody.email || extractEmailFromMessage(messageBody)
  );

  // Validar notification
  const validation = notification.validate();
  if (!validation.isValid) {
    throw new Error(`Invalid notification data: ${validation.errors.join(', ')}`);
  }

  // Guardar en DynamoDB (estado PENDING)
  await dynamoDBService.saveNotification(TABLE_NAMES.NOTIFICATIONS, notification.toDynamoDBItem());

  try {
    // Obtener template de email
    let emailTemplate = await getEmailTemplate(notification.type);
    
    // Formatear datos para el template
    const formattedData = EmailTemplateManager.formatTemplateData(notification.templateData);

    // Fecha en formato local
    const date = new Date().toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    // Replace {{date}}
    emailTemplate = emailTemplate.replace("{{date}}", date);

    // Replace otros placeholders
    if (formattedData.fullName) {
      emailTemplate = emailTemplate.replace("{{fullName}}", formattedData.fullName);
    }
    
    // Enviar email
    await sesService.sendTemplateEmail(
      notification.email,
      notification.subject,
      emailTemplate,
      formattedData
    );

    // Marcar como enviada y actualizar en DB
    notification.markAsSent();
    await dynamoDBService.saveNotification(TABLE_NAMES.NOTIFICATIONS, notification.toDynamoDBItem());

    logger.info('Notification sent successfully', { 
      notificationId: notification.uuid,
      email: notification.email,
      type: notification.type
    });

  } catch (emailError) {
    // Marcar como fallida
    notification.markAsFailed(emailError.message);
    await dynamoDBService.saveNotification(TABLE_NAMES.NOTIFICATIONS, notification.toDynamoDBItem());

    // Si debe reintentarse, reenviar a SQS (opcional)
    if (notification.shouldRetry()) {
      notification.markForRetry(emailError.message);
      await dynamoDBService.saveNotification(TABLE_NAMES.NOTIFICATIONS, notification.toDynamoDBItem());
      logger.warn('Notification marked for retry', { 
        notificationId: notification.uuid,
        attempts: notification.attempts
      });
    }

    throw emailError;
  }
}

/**
 * Obtiene el template de email (primero intenta S3, luego fallback)
 * @param {string} notificationType - Tipo de notificación
 * @returns {string} Template HTML
 */
async function getEmailTemplate(notificationType) {
  try {
    // Intentar obtener desde S3
    const templateFileName = EmailTemplateManager.getTemplateFileName(notificationType);
    return await s3Service.getCachedEmailTemplate(S3_BUCKETS.EMAIL_TEMPLATES, templateFileName);
  } catch (s3Error) {
    logger.warn('Failed to load template from S3, using default', { 
      type: notificationType,
      error: s3Error.message 
    });
    
    // Usar template por defecto
    return EmailTemplateManager.getTemplate(notificationType);
  }
}

/**
 * Valida la estructura básica del mensaje de SQS
 * @param {Object} messageBody - Cuerpo del mensaje
 */
function validateMessageStructure(messageBody) {
  if (!messageBody.type) {
    throw new Error('Message must have a type field');
  }

  if (!messageBody.data && typeof messageBody.data !== 'object') {
    throw new Error('Message must have a data object');
  }

  if (!messageBody.email && !extractEmailFromMessage(messageBody)) {
    throw new Error('Message must include email address');
  }
}

/**
 * Extrae el email del mensaje si no está en el nivel raíz
 * @param {Object} messageBody - Cuerpo del mensaje
 * @returns {string|null} Email encontrado
 */
function extractEmailFromMessage(messageBody) {
  // Buscar email en diferentes ubicaciones
  return messageBody.email || 
         messageBody.data?.email || 
         messageBody.userEmail ||
         messageBody.data?.userEmail ||
         null;
}

/**
 * Maneja errores de procesamiento enviándolos a la tabla de errores
 * @param {Object} sqsRecord - Record de SQS que falló
 * @param {Error} error - Error ocurrido
 */
async function handleProcessingError(sqsRecord, error) {
  try {
    const messageBody = JSON.parse(sqsRecord.body || '{}');
    
    const notificationError = new NotificationError({
      type: messageBody.type || 'UNKNOWN',
      email: extractEmailFromMessage(messageBody),
      errorType: error.name || 'ProcessingError',
      errorMessage: error.message,
      errorStack: error.stack,
      sqsMessageId: sqsRecord.messageId,
      originalSqsMessage: sqsRecord,
      attempts: 1
    });

    await dynamoDBService.saveNotification(
      TABLE_NAMES.NOTIFICATION_ERRORS, 
      notificationError.toDynamoDBItem()
    );

    logger.info('Error saved to error table', { 
      errorId: notificationError.uuid,
      messageId: sqsRecord.messageId 
    });

  } catch (saveError) {
    logger.error('Failed to save processing error', saveError);
  }
}

/**
 * Función para testing local
 * Simula un evento de SQS para pruebas
 */
exports.testLocal = async () => {
  const testEvent = {
    Records: [
      {
        messageId: 'test-message-1',
        body: JSON.stringify({
          type: 'WELCOME',
          email: 'test@example.com',
          data: {
            fullName: 'Juan Pérez'
          }
        })
      },
      {
        messageId: 'test-message-2',
        body: JSON.stringify({
          type: 'TRANSACTION.PURCHASE',
          email: 'test@example.com',
          data: {
            date: new Date().toISOString(),
            merchant: 'Tienda de Prueba',
            cardId: '1234-5678-9012-3456',
            amount: 50000
          }
        })
      }
    ]
  };

  console.log('🚀 Testing send-notifications lambda locally...');
  const result = await exports.handler(testEvent, {});
  console.log('✅ Test completed:', result);
  return result;
};

// Para testing desde línea de comandos
if (require.main === module) {
  exports.testLocal().catch(console.error);
}