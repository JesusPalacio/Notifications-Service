require('dotenv').config();

const Notification = require('../src/shared/models/notification');
const NotificationError = require('../src/shared/models/notificationError');
const { NOTIFICATION_TYPES } = require('../src/config/constants');

/**
 * Script para probar los modelos de datos
 */

console.log('🗃️  Testing Data Models...\n');

/**
 * Test del modelo Notification
 */
function testNotificationModel() {
  console.log('📝 Testing Notification Model');
  
  // Test 1: Notification válida
  console.log('\n1. Valid notification:');
  const validNotification = new Notification({
    type: NOTIFICATION_TYPES.WELCOME,
    email: 'test@example.com',
    subject: 'Test Subject',
    templateData: { fullName: 'Test User' }
  });
  
  const validation = validNotification.validate();
  console.log(`✅ Valid: ${validation.isValid}`);
  console.log(`📋 DynamoDB Item:`, JSON.stringify(validNotification.toDynamoDBItem(), null, 2));
  
  // Test 2: Notification inválida
  console.log('\n2. Invalid notification:');
  const invalidNotification = new Notification({
    type: 'INVALID_TYPE',
    email: 'invalid-email',
    subject: ''
  });
  
  const invalidValidation = invalidNotification.validate();
  console.log(`❌ Valid: ${invalidValidation.isValid}`);
  console.log(`🚫 Errors:`, invalidValidation.errors);
  
  // Test 3: From SQS Message
  console.log('\n3. From SQS Message:');
  const sqsMessage = {
    type: NOTIFICATION_TYPES.TRANSACTION_PURCHASE,
    data: {
      merchant: 'Test Store',
      amount: 50000,
      date: new Date().toISOString()
    }
  };
  
  const fromSQS = Notification.fromSQSMessage(sqsMessage, 'sqs@example.com');
  console.log(`📧 Email: ${fromSQS.email}`);
  console.log(`📝 Subject: ${fromSQS.subject}`);
  console.log(`📊 Template Data:`, fromSQS.templateData);
  
  // Test 4: State transitions
  console.log('\n4. State transitions:');
  console.log(`Initial status: ${fromSQS.status}`);
  
  fromSQS.markAsSent();
  console.log(`After markAsSent: ${fromSQS.status}`);
  console.log(`Sent at: ${fromSQS.sentAt}`);
  
  const errorNotification = new Notification({
    type: NOTIFICATION_TYPES.USER_LOGIN,
    email: 'error@example.com',
    subject: 'Test'
  });
  
  errorNotification.markAsFailed('Test error message');
  console.log(`After markAsFailed: ${errorNotification.status}`);
  console.log(`Should retry: ${errorNotification.shouldRetry()}`);
  console.log(`Attempts: ${errorNotification.attempts}`);
}

/**
 * Test del modelo NotificationError
 */
function testNotificationErrorModel() {
  console.log('\n\n🚫 Testing NotificationError Model');
  
  // Test 1: Error básico
  console.log('\n1. Basic error:');
  const basicError = new NotificationError({
    errorType: 'EmailError',
    errorMessage: 'Failed to send email',
    email: 'error@example.com',
    type: NOTIFICATION_TYPES.WELCOME
  });
  
  const validation = basicError.validate();
  console.log(`✅ Valid: ${validation.isValid}`);
  console.log(`📂 Category: ${basicError.getErrorCategory()}`);
  console.log(`⚠️  Critical: ${basicError.isCritical()}`);
  
  // Test 2: From failed notification
  console.log('\n2. From failed notification:');
  const notification = new Notification({
    type: NOTIFICATION_TYPES.CARD_CREATE,
    email: 'failed@example.com',
    subject: 'Test'
  });
  
  const testError = new Error('SES service unavailable');
  testError.name = 'SESError';
  
  const errorFromNotification = NotificationError.fromFailedNotification(
    notification, 
    testError,
    { MessageId: 'test-message-123' }
  );
  
  console.log(`📧 Email: ${errorFromNotification.email}`);
  console.log(`🔤 Error type: ${errorFromNotification.errorType}`);
  console.log(`📂 Category: ${errorFromNotification.getErrorCategory()}`);
  console.log(`📝 DynamoDB Item:`, JSON.stringify(errorFromNotification.toDynamoDBItem(), null, 2));
  
  // Test 3: Resolve error
  console.log('\n3. Resolve error:');
  errorFromNotification.markAsResolved('admin');
  console.log(`✅ Resolved: ${errorFromNotification.resolved}`);
  console.log(`👤 Resolved by: ${errorFromNotification.resolvedBy}`);
}

testNotificationModel();
testNotificationErrorModel();