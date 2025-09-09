const { NOTIFICATION_TYPES, TEMPLATE_MAPPING } = require('../../config/constants');

class EmailTemplateManager {
  /**
   * Templates por defecto (fallback si no se encuentran en S3)
   */
  static getDefaultTemplates() {
    return {
      [NOTIFICATION_TYPES.WELCOME]: {
        template: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>¡Bienvenido a Inferno Bank!</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background-color: white; border-radius: 10px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #e74c3c; margin: 0; font-size: 28px;">🔥 INFERNO BANK</h1>
                <hr style="border: none; height: 3px; background: linear-gradient(90deg, #e74c3c, #f39c12); margin: 15px 0;">
              </div>
              
              <h2 style="color: #2c3e50; margin-bottom: 20px;">¡Bienvenido {{fullName}}!</h2>
              
              <p style="color: #34495e; font-size: 16px; line-height: 1.6;">
                Nos complace darte la bienvenida a <strong>Inferno Bank</strong>. Tu cuenta ha sido creada exitosamente y ya puedes comenzar a disfrutar de nuestros servicios financieros.
              </p>
              
              <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #2c3e50; margin-top: 0;">¿Qué puedes hacer ahora?</h3>
                <ul style="color: #34495e;">
                  <li>Solicitar tarjetas de débito y crédito</li>
                  <li>Realizar transacciones seguras</li>
                  <li>Consultar tus movimientos</li>
                  <li>Recibir notificaciones en tiempo real</li>
                </ul>
              </div>
              
              <p style="color: #7f8c8d; font-size: 14px; text-align: center; margin-top: 30px;">
                Gracias por confiar en Inferno Bank<br>
                <em>Tu banco de confianza 🔥</em>
              </p>
            </div>
          </body>
          </html>
        `
      },

      [NOTIFICATION_TYPES.USER_LOGIN]: {
        template: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Nuevo acceso a tu cuenta</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h1 style="color: #e74c3c; text-align: center; margin-bottom: 25px;">🔥 INFERNO BANK</h1>
              
              <div style="border-left: 4px solid #3498db; padding-left: 20px; margin: 20px 0;">
                <h3 style="color: #2c3e50; margin: 0;">Acceso detectado</h3>
                <p style="color: #34495e; margin: 10px 0 0 0;">
                  Se ha detectado un nuevo acceso a tu cuenta el <strong>{{date}}</strong>
                </p>
              </div>
              
              <p style="color: #7f8c8d; font-size: 14px; text-align: center; margin-top: 25px;">
                Si no fuiste tú, contacta inmediatamente a soporte
              </p>
            </div>
          </body>
          </html>
        `
      },

      [NOTIFICATION_TYPES.TRANSACTION_PURCHASE]: {
        template: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Compra realizada</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h1 style="color: #e74c3c; text-align: center; margin-bottom: 25px;">🔥 INFERNO BANK</h1>
              
              <div style="text-align: center; background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #27ae60; margin: 0;">💳 Compra Realizada</h2>
                <p style="font-size: 24px; color: #2c3e50; margin: 10px 0; font-weight: bold;">
                  ${{amount}}
                </p>
              </div>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #7f8c8d; font-weight: bold;">Comercio:</td>
                    <td style="padding: 8px 0; color: #2c3e50;">{{merchant}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #7f8c8d; font-weight: bold;">Fecha:</td>
                    <td style="padding: 8px 0; color: #2c3e50;">{{date}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #7f8c8d; font-weight: bold;">Tarjeta:</td>
                    <td style="padding: 8px 0; color: #2c3e50;">****{{cardId}}</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #7f8c8d; font-size: 12px; text-align: center; margin-top: 25px;">
                Transacción procesada exitosamente
              </p>
            </div>
          </body>
          </html>
        `
      },

      [NOTIFICATION_TYPES.CARD_CREATE]: {
        template: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Nueva tarjeta creada</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h1 style="color: #e74c3c; text-align: center; margin-bottom: 25px;">🔥 INFERNO BANK</h1>
              
              <div style="text-align: center; margin: 25px 0;">
                <div style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px; font-size: 18px;">
                  💳 Nueva Tarjeta {{type}}
                </div>
              </div>
              
              <p style="color: #34495e; text-align: center; font-size: 16px;">
                Tu nueva tarjeta {{type}} ha sido creada exitosamente
              </p>
              
              {{#if amount}}
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <p style="color: #27ae60; margin: 0; font-size: 14px;">Límite asignado</p>
                <p style="color: #2c3e50; margin: 5px 0 0 0; font-size: 22px; font-weight: bold;">${{amount}}</p>
              </div>
              {{/if}}
              
              <p style="color: #7f8c8d; font-size: 14px; text-align: center; margin-top: 25px;">
                Fecha de creación: {{date}}
              </p>
            </div>
          </body>
          </html>
        `
      },

      [NOTIFICATION_TYPES.TRANSACTION_SAVE]: {
        template: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Depósito realizado</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h1 style="color: #e74c3c; text-align: center; margin-bottom: 25px;">🔥 INFERNO BANK</h1>
              
              <div style="text-align: center; background-color: #e8f6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #3498db; margin: 0;">💰 Depósito Exitoso</h2>
                <p style="font-size: 24px; color: #2c3e50; margin: 10px 0; font-weight: bold;">
                  +${{amount}}
                </p>
              </div>
              
              <p style="color: #34495e; text-align: center; font-size: 16px;">
                Tu depósito ha sido procesado exitosamente
              </p>
              
              <p style="color: #7f8c8d; font-size: 14px; text-align: center; margin-top: 25px;">
                Fecha: {{date}}
              </p>
            </div>
          </body>
          </html>
        `
      },

      [NOTIFICATION_TYPES.REPORT_ACTIVITY]: {
        template: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Reporte de actividad</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h1 style="color: #e74c3c; text-align: center; margin-bottom: 25px;">🔥 INFERNO BANK</h1>
              <p style="color: #34495e; font-size: 16px; text-align: center;">
                Hemos generado tu reporte de actividad con todas las transacciones del período solicitado.
              </p>
              <div style="text-align: center; margin: 20px 0;">
                <a href="{{url}}" style="background: linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                  Descargar Reporte
                </a>
              </div>
              <p style="color: #7f8c8d; font-size: 14px; text-align: center; margin-top: 25px;">
                Fecha de generación: {{date}}
              </p>
            </div>
          </body>
          </html>
        `
      }
    };
  }

  /**
   * Obtiene el template correcto según el tipo de notificación
   * @param {string} notificationType 
   * @returns {string} Template HTML
   */
  static getTemplate(notificationType) {
    const templates = this.getDefaultTemplates();
    return templates[notificationType]?.template || this.getGenericTemplate();
  }

  /**
   * Template genérico para tipos no definidos
   * @returns {string}
   */
  static getGenericTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Notificación de Inferno Bank</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #e74c3c; text-align: center; margin-bottom: 25px;">🔥 INFERNO BANK</h1>
          
          <h2 style="color: #2c3e50;">Notificación</h2>
          
          <p style="color: #34495e; font-size: 16px;">
            Tienes una nueva notificación de Inferno Bank.
          </p>
          
          <p style="color: #7f8c8d; font-size: 14px; text-align: center; margin-top: 25px;">
            Gracias por usar nuestros servicios
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Formatea variables para los templates
   * @param {Object} data - Datos a formatear
   * @returns {Object} Datos formateados
   */
  static formatTemplateData(data) {
    const formatted = { ...data };

    // Formatear fecha si existe
    if (formatted.date) {
      formatted.date = new Date(formatted.date).toLocaleString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // Formatear cantidad si existe
    if (formatted.amount !== undefined) {
      formatted.amount = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP'
      }).format(formatted.amount);
    }

    // Formatear cardId para mostrar solo últimos 4 dígitos
    if (formatted.cardId) {
      formatted.cardId = formatted.cardId.slice(-4);
    }

    return formatted;
  }

  /**
   * Obtiene el nombre del archivo del template en S3
   * @param {string} notificationType 
   * @returns {string}
   */
  static getTemplateFileName(notificationType) {
    return TEMPLATE_MAPPING[notificationType] || 'generic.html';
  }
}

module.exports = EmailTemplateManager;