require('dotenv').config();

const { handler } = require('../src/lambdas/send-notifications/index');

/**
 * Script para testing de performance y carga
 */

console.log('⚡ Performance Testing...\n');

/**
 * Crea múltiples mensajes para testing de carga
 * @param {number} count - Número de mensajes
 * @returns {Object} Evento SQS con múltiples mensajes
 */
function createLargeEvent(count) {
  const messages = [];
  const types = ['WELCOME', 'USER.LOGIN', 'TRANSACTION.PURCHASE', 'CARD.CREATE'];
  
  for (let i = 0; i < count; i++) {
    messages.push({
      messageId: `perf-test-${i}`,
      body: JSON.stringify({
        type: types[i % types.length],
        email: `performance${i}@example.com`,
        data: {
          fullName: `User ${i}`,
          amount: Math.floor(Math.random() * 100000),
          date: new Date().toISOString()
        }
      })
    });
  }
  
  return { Records: messages };
}

/**
 * Ejecuta test de performance
 * @param {number} messageCount - Número de mensajes a procesar
 */
async function runPerformanceTest(messageCount) {
  console.log(`🚀 Testing with ${messageCount} messages...`);
  
  const event = createLargeEvent(messageCount);
  const startTime = Date.now();
  
  try {
    const result = await handler(event, { awsRequestId: `perf-test-${messageCount}` });
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📈 Throughput: ${(messageCount / duration * 1000).toFixed(2)} messages/second`);
    console.log(`📊 Average per message: ${(duration / messageCount).toFixed(2)}ms`);
    
    const body = JSON.parse(result.body);
    console.log(`✅ Successful: ${body.results.successful}`);
    console.log(`❌ Failed: ${body.results.failed}`);
    console.log('---');
    
  } catch (error) {
    console.log(`❌ Performance test failed: ${error.message}`);
  }
}

/**
 * Ejecuta múltiples tests de performance
 */
async function runPerformanceTests() {
  const testSizes = [1, 5, 10, 25, 50];
  
  for (const size of testSizes) {
    await runPerformanceTest(size);
    // Pausa entre tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Ejecutar tests de performance
runPerformanceTests().catch(console.error);