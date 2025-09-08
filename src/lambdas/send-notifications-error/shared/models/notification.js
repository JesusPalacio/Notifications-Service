const { NOTIFICATION_TYPES } = require('../../config/constants');
const { v4: uuidv4 } = require('uuid');

class Notification {
  constructor(data) {
    this.uuid = data.uuid || uuidv4();
    this.type = data.type;
    this.email = data.email;
    this.subject = data.subject;
    this.templateData = data.templateData || {};
    this.status = data.status || 'PENDING';
    this.attempts = data.attempts || 0;
    this.lastAttempt = data.lastAttempt || null;
    this.errorMessage = data.errorMessage || null;
    this.sentAt = data.sentAt || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Valida que los datos de la notificación sean correctos
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    // Validar tipo de notificación
    if (!this.type) {
      errors.push('Notification type is required');
    } else if (!Object.values(NOTIFICATION_TYPES).includes(this.type)) {
      errors.push(`Invalid notification type: ${this.type}`);
    }

    // Validar email
    if (!this.email) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(this.email)) {
      errors.push('Invalid email format');
    }

    // Validar subject
    if (!this.subject || this.subject.trim().length === 0) {
      errors.push('Subject is required');
    }

    // Validar status
    const validStatuses = ['PENDING', 'SENT', 'FAILED', 'RETRY'];
    if (!validStatuses.includes(this.status)) {
      errors.push(`Invalid status: ${this.status}`);
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
      type: this.type,
      email: this.email,
      subject: this.subject,
      templateData: this.templateData,
      status: this.status,
      attempts: this.attempts,
      lastAttempt: this.lastAttempt,
      errorMessage: this.errorMessage,
      sentAt: this.sentAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Crea una notificación desde datos de SQS
   * @param {Object} sqsMessage - Mensaje desde SQS
   * @param {string} email - Email del destinatario
   * @returns {Notification}
   */
  static fromSQSMessage(sqsMessage, email) {
    const { type, data } = sqsMessage;
    
    return new Notification({
      type,
      email,
      subject: this.generateSubject(type, data),
      templateData: data || {}
    });
  }

  /**
   * Genera el asunto del email según el tipo de notificación
   * @param {string} type - Tipo de notificación
   * @param {Object} data - Datos adicionales
   * @returns {string}
   */
  static generateSubject(type, data = {}) {
    const subjects = {
      [NOTIFICATION_TYPES.WELCOME]: '¡Bienvenido a Inferno Bank!',
      [NOTIFICATION_TYPES.USER_LOGIN]: 'Nuevo acceso a tu cuenta',
      [NOTIFICATION_TYPES.USER_UPDATE]: 'Información de cuenta actualizada',
      [NOTIFICATION_TYPES.CARD_CREATE]: `Nueva tarjeta ${data.type || ''} creada`,
      [NOTIFICATION_TYPES.CARD_ACTIVATE]: 'Tarjeta activada exitosamente',
      [NOTIFICATION_TYPES.TRANSACTION_PURCHASE]: `Compra realizada - $${data.amount || 0}`,
      [NOTIFICATION_TYPES.TRANSACTION_SAVE]: `Depósito realizado - $${data.amount || 0}`,
      [NOTIFICATION_TYPES.TRANSACTION_PAID]: `Pago procesado - $${data.amount || 0}`,
      [NOTIFICATION_TYPES.REPORT_ACTIVITY]: 'Reporte de actividad disponible'
    };

    return subjects[type] || 'Notificación de Inferno Bank';
  }

  /**
   * Marca la notificación como enviada
   */
  markAsSent() {
    this.status = 'SENT';
    this.sentAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Marca la notificación como fallida
   * @param {string} errorMessage 
   */
  markAsFailed(errorMessage) {
    this.status = 'FAILED';
    this.errorMessage = errorMessage;
    this.lastAttempt = new Date().toISOString();
    this.attempts += 1;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Marca la notificación para reintento
   * @param {string} errorMessage 
   */
  markForRetry(errorMessage) {
    this.status = 'RETRY';
    this.errorMessage = errorMessage;
    this.lastAttempt = new Date().toISOString();
    this.attempts += 1;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Verifica si debe reintentarse
   * @param {number} maxAttempts 
   * @returns {boolean}
   */
  shouldRetry(maxAttempts = 3) {
    return this.attempts < maxAttempts && this.status === 'RETRY';
  }
}

module.exports = Notification;