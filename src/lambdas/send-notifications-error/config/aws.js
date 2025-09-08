const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { S3Client } = require('@aws-sdk/client-s3');
const { SQSClient } = require('@aws-sdk/client-sqs');
const { SESClient } = require('@aws-sdk/client-ses');

const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.NODE_ENV === 'development' ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined
};


const dynamoDBClient = new DynamoDBClient(awsConfig);
const documentClient = DynamoDBDocumentClient.from(dynamoDBClient);

const s3Client = new S3Client(awsConfig);
const sqsClient = new SQSClient(awsConfig);
const sesClient = new SESClient(awsConfig);

module.exports = {
  dynamoDBClient,
  documentClient,
  s3Client,
  sqsClient,
  sesClient,
  awsConfig
};