require('dotenv').config();

const { handler, testLocal } = require('../src/lambdas/send-notifications/index');

/**
 * Script principal para testing local del servicio de notificaciones
 */

// Colores para console.log
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Casos de prueba para diferentes tipos de notificaciones
 */
const testCases = {
  welcome: {
    type: 'WELCOME',
    email: 'test.welcome@example.com',
    data: {
      fullName: 'María González'
    }
  },
  
  userLogin: {
    type: 'USER.LOGIN',
    email: 'test.login@example.com',
    data: {
      date: new Date().toISOString()
    }
  },
  
  userUpdate: {
    type: 'USER.UPDATE', 
    email: 'test.update@example.com',
    data: {
      date: new Date().toISOString()
    }
  },
  
  cardCreate: {
    type: 'CARD.CREATE',
    email: 'test.card@example.com',
    data: {
      date: new Date().toISOString(),
      type: 'CREDIT',
      amount: 5000000
    }
  },
  
  cardActivate: {
    type: 'CARD.ACTIVATE',
    email: 'test.activate@example.com',
    data: {
      date: new Date().toISOString(),
      type: 'CREDIT',
      amount: 5000000
    }
  },
  
  transactionPurchase: {
    type: 'TRANSACTION.PURCHASE',
    email: 'test.purchase@example.com',
    data: {
      date: new Date().toISOString(),
      merchant: 'Starbucks Colombia',
      cardId: '1234-5678-9012-3456',
      amount: 25000
    }
  },
  
  transactionSave: {
    type: 'TRANSACTION.SAVE',
    email: 'test.save@example.com',
    data: {
      date: new Date().toISOString(),
      merchant: 'SAVING',
      amount: 100000
    }
  },
  
  transactionPaid: {
    type: 'TRANSACTION.PAID',
    email: 'test.paid@example.com',
    data: {
      date: new Date().toISOString(),
      merchant: 'PSE',
      amount: 50000
    }
  },
  
  reportActivity: {
    type: 'REPORT.ACTIVITY',
    email: 'test.report@example.com',
    data: {
      date: new Date().toISOString(),
      url: 'https://s3.amazonaws.com/my-bucket/report-123.csv'
    }
  }
};

/**
 * Crea un evento SQS simulado
 * @param {Array} messages - Array de mensajes a incluir
 * @returns {Object} Evento SQS simulado
 */
function createSQSEvent(messages) {
  return {
    Records: messages.map((message, index) => ({
      messageId: `test-message-${index + 1}-${Date.now()}`,
      receiptHandle: `test-receipt-${index + 1}`,
      body: JSON.stringify(message),
      attributes: {
        ApproximateReceiveCount: '1',
        SentTimestamp: Date.now().toString(),
        SenderId: 'test-sender',
        ApproximateFirstReceiveTimestamp: Date.now().toString()
      },
      messageAttributes: {},
      md5OfBody: 'test-md5',
      eventSource: 'aws:sqs',
      eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:notification-email-sqs',
      awsRegion: 'us-east-1'
    }))
  };
}

/**
 * Ejecuta un test individual
 * @param {string} testName - Nombre del test
 * @param {Object} testData - Datos del test
 */
async function runSingleTest(testName, testData) {
  log('blue', `\n📧 Testing: ${testName.toUpperCase()}`);
  log('yellow', `Email: ${testData.email}`);
  log('yellow', `Type: ${testData.type}`);
  
  try {
    const sqsEvent = createSQSEvent([testData]);
    const result = await handler(sqsEvent, { awsRequestId: `test-${testName}` });
    
    if (result.statusCode === 200) {
      log('green', '✅ Test passed successfully');
      const body = JSON.parse(result.body);
      log('green', `   Successful: ${body.results.successful}`);
      log('green', `   Failed: ${body.results.failed}`);
    } else {
      log('red', '❌ Test failed');
      log('red', `   Status: ${result.statusCode}`);
    }
  } catch (error) {
    log('red', '❌ Test error:');
    log('red', `   ${error.message}`);
  }
}

/**
 * Ejecuta múltiples tests en batch
 * @param {Array} testNames - Nombres de los tests a ejecutar
 */
async function runBatchTest(testNames) {
  log('blue', '\n🚀 Testing BATCH processing');
  
  const messages = testNames.map(name => testCases[name]);
  log('yellow', `Processing ${messages.length} messages in batch`);
  
  try {
    const sqsEvent = createSQSEvent(messages);
    const result = await handler(sqsEvent, { awsRequestId: 'test-batch' });
    
    if (result.statusCode === 200) {
      log('green', '✅ Batch test passed successfully');
      const body = JSON.parse(result.body);
      log('green', `   Successful: ${body.results.successful}`);
      log('green', `   Failed: ${body.results.failed}`);
      
      if (body.results.errors.length > 0) {
        log('yellow', '   Errors:');
        body.results.errors.forEach(err => {
          log('yellow', `     - ${err.messageId}: ${err.error}`);
        });
      }
    } else {
      log('red', '❌ Batch test failed');
    }
  } catch (error) {
    log('red', '❌ Batch test error:');
    log('red', `   ${error.message}`);
  }
}

/**
 * Test de mensaje malformado
 */
async function testInvalidMessage() {
  log('blue', '\n🚫 Testing INVALID message');
  
  const invalidMessage = {
    // Falta 'type'
    email: 'test@example.com',
    data: { test: 'data' }
  };
  
  try {
    const sqsEvent = createSQSEvent([invalidMessage]);
    const result = await handler(sqsEvent, { awsRequestId: 'test-invalid' });
    
    const body = JSON.parse(result.body);
    if (body.results.failed > 0) {
      log('green', '✅ Invalid message correctly rejected');
      log('green', `   Errors: ${body.results.errors.length}`);
    } else {
      log('red', '❌ Invalid message should have failed');
    }
  } catch (error) {
    log('red', `❌ Unexpected error: ${error.message}`);
  }
}

/**
 * Menú interactivo
 */
function showMenu() {
  console.clear();
  log('bold', '🔥 INFERNO BANK - NOTIFICATION SERVICE TESTING 🔥');
  console.log('\n📋 Available tests:');
  console.log('1.  Welcome notification');
  console.log('2.  User login notification');
  console.log('3.  User update notification');
  console.log('4.  Card create notification');
  console.log('5.  Card activate notification');
  console.log('6.  Transaction purchase notification');
  console.log('7.  Transaction save notification');
  console.log('8.  Transaction paid notification');
  console.log('9.  Report activity notification');
  console.log('10. Test all notifications (batch)');
  console.log('11. Test invalid message');
  console.log('12. Test built-in function');
  console.log('0.  Exit');
  console.log('\n📧 Note: Configure AWS credentials in .env file');
}

/**
 * Función principal interactiva
 */
async function main() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  while (true) {
    showMenu();
    const choice = await question('\n🎯 Select an option (0-12): ');

    switch (choice) {
      case '1':
        await runSingleTest('welcome', testCases.welcome);
        break;
      case '2':
        await runSingleTest('userLogin', testCases.userLogin);
        break;
      case '3':
        await runSingleTest('userUpdate', testCases.userUpdate);
        break;
      case '4':
        await runSingleTest('cardCreate', testCases.cardCreate);
        break;
      case '5':
        await runSingleTest('cardActivate', testCases.cardActivate);
        break;
      case '6':
        await runSingleTest('transactionPurchase', testCases.transactionPurchase);
        break;
      case '7':
        await runSingleTest('transactionSave', testCases.transactionSave);
        break;
      case '8':
        await runSingleTest('transactionPaid', testCases.transactionPaid);
        break;
      case '9':
        await runSingleTest('reportActivity', testCases.reportActivity);
        break;
      case '10':
        await runBatchTest(Object.keys(testCases));
        break;
      case '11':
        await testInvalidMessage();
        break;
      case '12':
        log('blue', '\n🧪 Running built-in test function...');
        await testLocal();
        break;
      case '0':
        log('green', '\n👋 Goodbye!');
        rl.close();
        return;
      default:
        log('red', '❌ Invalid option');
    }

    await question('\n⏸️  Press Enter to continue...');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  runSingleTest,
  runBatchTest,
  testInvalidMessage,
  testCases,
  createSQSEvent
};