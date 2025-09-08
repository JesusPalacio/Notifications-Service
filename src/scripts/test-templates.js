require('dotenv').config();

const EmailTemplateManager = require('../src/shared/templates/emailTemplates');
const { NOTIFICATION_TYPES } = require('../src/config/constants');

/**
 * Script para probar templates de email por separado
 */

console.log('🎨 Testing Email Templates...\n');

// Datos de prueba para cada tipo de notificación
const testData = {
  [NOTIFICATION_TYPES.WELCOME]: {
    fullName: 'María José Rodríguez'
  },
  [NOTIFICATION_TYPES.USER_LOGIN]: {
    date: new Date().toISOString()
  },
  [NOTIFICATION_TYPES.TRANSACTION_PURCHASE]: {
    date: new Date().toISOString(),
    merchant: 'Éxito Chapinero',
    cardId: '1234-5678-9012-3456',
    amount: 89500
  },
  [NOTIFICATION_TYPES.CARD_CREATE]: {
    date: new Date().toISOString(),
    type: 'CREDIT',
    amount: 3500000
  }
};

/**
 * Testa la generación de templates
 */
function testTemplateGeneration() {
  Object.values(NOTIFICATION_TYPES).forEach(type => {
    console.log(`\n📧 Testing template: ${type}`);
    
    try {
      // Obtener template
      const template = EmailTemplateManager.getTemplate(type);
      console.log(`✅ Template length: ${template.length} characters`);
      
      // Formatear datos
      const data = testData[type] || {};
      const formattedData = EmailTemplateManager.formatTemplateData(data);
      console.log(`✅ Formatted data:`, formattedData);
      
      // Generar subject
      const subject = require('../src/shared/models/notification').generateSubject(type, data);
      console.log(`✅ Subject: "${subject}"`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  });
}

testTemplateGeneration();