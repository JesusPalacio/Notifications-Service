output "notification_table_name" {
  description = "Name of the notifications DynamoDB table"
  value       = aws_dynamodb_table.notifications.name
}

output "notification_error_table_name" {
  description = "Name of the notification errors DynamoDB table"
  value       = aws_dynamodb_table.notification_errors.name
}

output "notification_queue_url" {
  description = "URL of the notification SQS queue"
  value       = aws_sqs_queue.notification_email.url
}

output "notification_queue_arn" {
  description = "ARN of the notification SQS queue"
  value       = aws_sqs_queue.notification_email.arn
}

output "notification_dlq_url" {
  description = "URL of the notification DLQ"
  value       = aws_sqs_queue.notification_email_dlq.url
}

output "notification_dlq_arn" {
  description = "ARN of the notification DLQ"
  value       = aws_sqs_queue.notification_email_dlq.arn
}

output "email_templates_bucket_name" {
  description = "Name of the email templates S3 bucket"
  value       = aws_s3_bucket.email_templates.bucket
}

output "send_notifications_lambda_function_name" {
  description = "Name of the send notifications Lambda function"
  value       = aws_lambda_function.send_notifications.function_name
}

output "send_notifications_error_lambda_function_name" {
  description = "Name of the send notifications error Lambda function"
  value       = aws_lambda_function.send_notifications_error.function_name
}

output "lambda_execution_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_execution_role.arn
}

# Environment variables for local testing
output "env_variables" {
  description = "Environment variables for local .env file"
  value = {
    AWS_REGION                        = var.aws_region
    NOTIFICATION_TABLE_NAME           = aws_dynamodb_table.notifications.name
    NOTIFICATION_ERROR_TABLE_NAME     = aws_dynamodb_table.notification_errors.name
    NOTIFICATION_EMAIL_SQS_URL        = aws_sqs_queue.notification_email.url
    NOTIFICATION_EMAIL_ERROR_SQS_URL  = aws_sqs_queue.notification_email_dlq.url
    EMAIL_TEMPLATES_BUCKET            = aws_s3_bucket.email_templates.bucket
    FROM_EMAIL                        = var.from_email
    FROM_NAME                         = var.from_name
    ADMIN_EMAIL                       = var.admin_email
  }
}

output "env_file_content" {
  description = "Content for .env file"
  value = <<-EOF
AWS_REGION=${var.aws_region}
AWS_ACCESS_KEY_ID=your_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here

# DynamoDB Tables
NOTIFICATION_TABLE_NAME=${aws_dynamodb_table.notifications.name}
NOTIFICATION_ERROR_TABLE_NAME=${aws_dynamodb_table.notification_errors.name}

# SQS Queues  
NOTIFICATION_EMAIL_SQS_URL=${aws_sqs_queue.notification_email.url}
NOTIFICATION_EMAIL_ERROR_SQS_URL=${aws_sqs_queue.notification_email_dlq.url}

# S3 Buckets
EMAIL_TEMPLATES_BUCKET=${aws_s3_bucket.email_templates.bucket}

# Email Configuration
FROM_EMAIL=${var.from_email}
FROM_NAME=${var.from_name}
ADMIN_EMAIL=${var.admin_email}

# Environment
NODE_ENV=development
EOF
}