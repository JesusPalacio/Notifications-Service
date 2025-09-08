require('dotenv').config();

/**
 * Script para simular integración con otros servicios
 */

console.log('🔗 Integration Testing...\n');

/**
 * Simula el flujo completo de User Service → SQS → Notification Service
 */
async function simulateUserRegistration() {
  console.log('👤 Simulating User Registration Flow...');
  
  // 1. Simular registro de usuario (esto lo haría el User Service)
  const newUser = {
    uuid: 'user-123-456-789',
    name: 'Carlos',
    lastName: 'Mendoza',
    email: 'carlos.mendoza@gmail.com',
    document: '12345678'
  };
  
  console.log(`📝 User registered: ${newUser.name} ${newUser.lastName}`);
  
  // 2. User Service enviaría este mensaje a SQS
  const sqsMessage = {
    type: 'WELCOME',
    email: newUser.email,
    data: {
      fullName: `${newUser.name} ${newUser.lastName}`
    }
  };
  
  console.log('📤 Message sent to SQS:', JSON.stringify(sqsMessage, null, 2));
  
  // 3. Simular procesamiento por nuestra Lambda
  const { handler } = require('../src/lambdas/send-notifications/index');
  const sqsEvent = {
    Records: [{
      messageId: 'integration-test-1',
      body: JSON.stringify(sqsMessage)
    }]
  };
  
  try {
    const result = await handler(sqsEvent, { awsRequestId: 'integration-test' });
    console.log('📧 Notification processed successfully');
    console.log(`📊 Result: ${JSON.stringify(JSON.parse(result.body).results, null, 2)}`);
  } catch (error) {
    console.log(`❌ Integration test failed: ${error.message}`);
  }
}

/**
 * Simula múltiples eventos de diferentes servicios
 */
async function simulateMultiServiceFlow() {
  console.log('\n🏦 Simulating Multi-Service Banking Flow...');
  
  const events = [
    // User registration
    {
      service: 'User Service',
      message: {
        type: 'WELCOME',
        email: 'integration@example.com',
        data: { fullName: 'Integration Test User' }
      }
    },
    
    // Card creation
    {
      service: 'Card Service',
      message: {
        type: 'CARD.CREATE',
        email: 'integration@example.com',
        data: {
          type: 'CREDIT',
          amount: 2000000,
          date: new Date().toISOString()
        }
      }
    },
    
    // Transaction
    {
      service: 'Card Service',
      message: {
        type: 'TRANSACTION.PURCHASE',
        email: 'integration@example.com',
        data: {
          merchant: 'Amazon Colombia',
          cardId: '1234-5678-9012-3456',
          amount: 150000,
          date: new Date().toISOString()
        }
      }
    }
  ];
  
  for (const event of events) {
    console.log(`\n📤 ${event.service} → SQS`);
    console.log(`   Type: ${event.message.type}`);
    
    const sqsEvent = {
      Records: [{
        messageId: `integration-${Date.now()}`,
        body: JSON.stringify(event.message)
      }]
    };
    
    try {
      const { handler } = require('../src/lambdas/send-notifications/index');
      await handler(sqsEvent, { awsRequestId: `integration-${Date.now()}` });
      console.log('   ✅ Processed successfully');
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }
}

// Ejecutar tests de integración
async function runIntegrationTests() {
  await simulateUserRegistration();
  await simulateMultiServiceFlow();
}

runIntegrationTests().catch(console.error);