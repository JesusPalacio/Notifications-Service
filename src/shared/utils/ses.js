const { SendEmailCommand } = require('@aws-sdk/client-ses');
const { sesClient } = require('../../config/aws');
const { EMAIL_CONFIG } = require('../../config/constants');
const logger = require('./logger');

class SESService {
  /**
   * Envía un email usando SES
   * @param {string} toEmail - Email del destinatario
   * @param {string} subject - Asunto del email
   * @param {string} htmlBody - Contenido HTML del email
   * @param {string} textBody - Contenido de texto plano (opcional)
   */
  async sendEmail(toEmail, subject, htmlBody, textBody = null) {
    try {
      const command = new SendEmailCommand({
        Source: `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`,
        Destination: {
          ToAddresses: [toEmail]
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8'
            },
            ...(textBody && {
              Text: {
                Data: textBody,
                Charset: 'UTF-8'
              }
            })
          }
        }
      });

      const result = await sesClient.send(command);
      logger.info(`Email sent successfully to ${toEmail}`, { messageId: result.MessageId });
      return result;
    } catch (error) {
      logger.error(`Error sending email to ${toEmail}`, error);
      throw error;
    }
  }

  /**
   * Reemplaza variables en un template HTML
   * @param {string} template - Template HTML
   * @param {Object} variables - Variables a reemplazar
   */
  replaceTemplateVariables(template, variables) {
    let processedTemplate = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processedTemplate = processedTemplate.replace(regex, value || '');
    }

    return processedTemplate;
  }

  /**
   * Envía email usando template
   * @param {string} toEmail - Email del destinatario
   * @param {string} subject - Asunto del email
   * @param {string} template - Template HTML
   * @param {Object} variables - Variables para el template
   */
  async sendTemplateEmail(toEmail, subject, template, variables = {}) {
    try {
      const htmlBody = this.replaceTemplateVariables(template, variables);
      return await this.sendEmail(toEmail, subject, htmlBody);
    } catch (error) {
      logger.error(`Error sending template email to ${toEmail}`, error);
      throw error;
    }
  }
}

module.exports = new SESService();