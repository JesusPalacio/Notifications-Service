const { v4: uuidv4 } = require('uuid');

class NotificationError {
  constructor(data) {
    this.uuid = data.uuid || uuidv4();
    this.originalNotificationId = data.originalNotificationId;
    this.type = data.type;
    this.email = data.email;
    this.errorType = data.errorType;
    this.errorMessage = data.errorMessage;
    this.errorStack = data.errorStack;
    this.sqsMessageId = data.sqsMessageId;
    this.originalSqsMessage = data.originalSqsMessage;
    this.attempts = data.attempts || 0;
    this.lastAttempt = data.lastAttempt || new Date().toISOString();
    this.resolved = data.resolved || false;
    this.resolvedAt = data.resolvedAt || null;
    this.resolvedBy = data.resolvedBy || null;
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  /**
   * Valida que los datos del error sean correctos
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    // Validar errorType
    if (!this.errorType) {
      errors.push('Error type is required');
    }

    // Validar errorMessage
    if (!this.errorMessage || this.errorMessage.trim().length === 0) {
      errors.push('Error message is required');
    }

    // Validar email si está presente
    if (this.email && !this.isValidEmail(this.email)) {
      errors.push('Invalid email format');
    }

    // Validar attempts
    if (typeof this.attempts !== 'number' || this.attempts < 0) {
      errors.push('Attempts must be a non-negative number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida formato de email
   * @param {string} email 
   * @returns {boolean}
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Convierte a formato para DynamoDB
   * @returns {Object}
   */
  toDynamoDBItem() {
    return {
      uuid: this.uuid,
      originalNotificationId: this.originalNotificationId,
      type: this.type,
      email: this.email,
      errorType: this.errorType,
      errorMessage: this.errorMessage,
      errorStack: this.errorStack,
      sqsMessageId: this.sqsMessageId,
      originalSqsMessage: this.originalSqsMessage,
      attempts: this.attempts,
      lastAttempt: this.lastAttempt,
      resolved: this.resolved,
      resolvedAt: this.resolvedAt,
      resolvedBy: this.resolvedBy,
      createdAt: this.createdAt
    };
  }

  /**
   * Crea un error desde una notificación fallida
   * @param {Notification} notification 
   * @param {Error} error 
   * @param {Object} sqsMessage 
   * @returns {NotificationError}
   */
  static fromFailedNotification(notification, error, sqsMessage = null) {
    return new NotificationError({
      originalNotificationId: notification.uuid,
      type: notification.type,
      email: notification.email,
      errorType: error.name || 'UnknownError',
      errorMessage: error.message,
      errorStack: error.stack,
      sqsMessageId: sqsMessage?.MessageId,
      originalSqsMessage: sqsMessage,
      attempts: notification.attempts
    });
  }

  /**
   * Marca el error como resuelto
   * @param {string} resolvedBy - Quien resolvió el error
   */
  markAsResolved(resolvedBy = 'system') {
    this.resolved = true;
    this.resolvedAt = new Date().toISOString();
    this.resolvedBy = resolvedBy;
  }

  /**
   * Obtiene categoría del error para estadísticas
   * @returns {string}
   */
  getErrorCategory() {
    const errorType = this.errorType.toLowerCase();
    
    if (errorType.includes('ses') || errorType.includes('email')) {
      return 'EMAIL_SERVICE';
    } else if (errorType.includes('s3') || errorType.includes('template')) {
      return 'TEMPLATE_ERROR';
    } else if (errorType.includes('dynamodb') || errorType.includes('database')) {
      return 'DATABASE_ERROR';
    } else if (errorType.includes('validation')) {
      return 'VALIDATION_ERROR';
    } else if (errorType.includes('timeout') || errorType.includes('network')) {
      return 'NETWORK_ERROR';
    } else {
      return 'UNKNOWN_ERROR';
    }
  }

  /**
   * Verifica si es un error crítico
   * @returns {boolean}
   */
  isCritical() {
    const criticalErrors = [
      'DATABASE_ERROR',
      'EMAIL_SERVICE'
    ];
    
    return criticalErrors.includes(this.getErrorCategory()) || this.attempts >= 5;
  }
}

module.exports = NotificationError;