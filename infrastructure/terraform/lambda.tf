data "archive_file" "send_notifications_zip" {
  type        = "zip"
  output_path = "${path.module}/../../build/send-notifications.zip"
  
  source_dir = "${path.module}/../../src/lambdas/send-notifications"
  
  excludes = [
    "package-lock.json",
    "*.log"
  ]
}

data "archive_file" "send_notifications_error_zip" {
  type        = "zip"
  output_path = "${path.module}/../../build/send-notifications-error.zip"
  
  source_dir = "${path.module}/../../src/lambdas/send-notifications-error"
  
  excludes = [
    "package-lock.json",
    "*.log"
  ]
}

data "archive_file" "generate_report_zip" {
  type        = "zip"
  output_path = "${path.module}/../../build/generate-report.zip"

  source_dir = "${path.module}/../../src/lambdas/generate-report"

  excludes = [
    "package-lock.json",
    "*.log"
  ]
}

# Main Send Notifications Lambda Function
resource "aws_lambda_function" "send_notifications" {
  filename         = data.archive_file.send_notifications_zip.output_path
  function_name    = "${local.name_prefix}-send-notifications"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "index.handler"
  runtime         = local.lambda_runtime
  timeout         = var.lambda_timeout
  memory_size     = var.lambda_memory_size
  
  source_code_hash = data.archive_file.send_notifications_zip.output_base64sha256
  
  # REDUCIDO: Reserved concurrency 
  # reserved_concurrent_executions = 3
  
  environment {
    variables = {
      NODE_ENV                         = var.environment
      NOTIFICATION_TABLE_NAME          = aws_dynamodb_table.notifications.name
      NOTIFICATION_ERROR_TABLE_NAME    = aws_dynamodb_table.notification_errors.name
      EMAIL_TEMPLATES_BUCKET           = aws_s3_bucket.email_templates.bucket
      FROM_EMAIL                       = var.from_email
      FROM_NAME                        = var.from_name
      ADMIN_EMAIL                      = var.admin_email
      LOG_LEVEL                        = var.environment == "prod" ? "info" : "debug"
    }
  }
  
  dead_letter_config {
    target_arn = aws_sqs_queue.notification_email_dlq.arn
  }
  
  tracing_config {
    mode = var.environment == "prod" ? "Active" : "PassThrough"
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-send-notifications"
    Type = "lambda-function"
  })
  
  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.lambda_dynamodb_policy_attachment,
    aws_iam_role_policy_attachment.lambda_ses_policy_attachment,
    aws_iam_role_policy_attachment.lambda_s3_policy_attachment,
    aws_cloudwatch_log_group.send_notifications_logs
  ]
}

# Error Handling Lambda Function - CONCURRENCIA CORREGIDA
resource "aws_lambda_function" "send_notifications_error" {
  filename         = data.archive_file.send_notifications_error_zip.output_path
  function_name    = "${local.name_prefix}-send-notifications-error"
  role            = aws_iam_role.lambda_execution_role.arn
  handler         = "index.handler"
  runtime         = local.lambda_runtime
  timeout         = 120
  memory_size     = 512
  
  source_code_hash = data.archive_file.send_notifications_error_zip.output_base64sha256
  
  # REDUCIDO: Lower concurrency for error processing 
  # reserved_concurrent_executions = 1
  
  environment {
    variables = {
      NODE_ENV                         = var.environment
      NOTIFICATION_TABLE_NAME          = aws_dynamodb_table.notifications.name
      NOTIFICATION_ERROR_TABLE_NAME    = aws_dynamodb_table.notification_errors.name
      EMAIL_TEMPLATES_BUCKET           = aws_s3_bucket.email_templates.bucket
      FROM_EMAIL                       = var.from_email
      FROM_NAME                        = var.from_name
      ADMIN_EMAIL                      = var.admin_email
      LOG_LEVEL                        = var.environment == "prod" ? "info" : "debug"
    }
  }
  
  tracing_config {
    mode = var.environment == "prod" ? "Active" : "PassThrough"
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-send-notifications-error"
    Type = "lambda-function"
  })
  
  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.lambda_dynamodb_policy_attachment,
    aws_iam_role_policy_attachment.lambda_ses_policy_attachment,
    aws_cloudwatch_log_group.send_notifications_error_logs
  ]
}

resource "aws_lambda_function" "generate_report" {
  filename         = data.archive_file.generate_report_zip.output_path
  function_name    = "${local.name_prefix}-generate-report"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "generate-report.handler"
  runtime          = local.lambda_runtime
  timeout          = 60
  memory_size      = 256

  source_code_hash = data.archive_file.generate_report_zip.output_base64sha256

  environment {
    variables = {
      NODE_ENV       = var.environment
      REPORTS_BUCKET = aws_s3_bucket.reports.bucket
      LOG_LEVEL      = var.environment == "prod" ? "info" : "debug"
    }
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-generate-report"
    Type = "lambda-function"
  })

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.lambda_s3_policy_attachment,
    aws_cloudwatch_log_group.generate_report_logs
  ]
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "send_notifications_logs" {
  name              = "/aws/lambda/${local.name_prefix}-send-notifications"
  retention_in_days = var.environment == "prod" ? 30 : 14
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-send-notifications-logs"
    Type = "cloudwatch-logs"
  })
}

resource "aws_cloudwatch_log_group" "send_notifications_error_logs" {
  name              = "/aws/lambda/${local.name_prefix}-send-notifications-error"
  retention_in_days = var.environment == "prod" ? 30 : 14
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-send-notifications-error-logs"
    Type = "cloudwatch-logs"
  })
}

resource "aws_cloudwatch_log_group" "generate_report_logs" {
  name              = "/aws/lambda/${local.name_prefix}-generate-report"
  retention_in_days = var.environment == "prod" ? 30 : 14

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-generate-report-logs"
    Type = "cloudwatch-logs"
  })
}

# SQS Event Source Mapping for Main Lambda
resource "aws_lambda_event_source_mapping" "notification_sqs_trigger" {
  event_source_arn                   = aws_sqs_queue.notification_email.arn
  function_name                      = aws_lambda_function.send_notifications.arn
  enabled                           = true
  batch_size                        = 10
  maximum_batching_window_in_seconds = 5
  
  # Scaling configuration
  scaling_config {
    maximum_concurrency = 5
  }
  
  depends_on = [aws_iam_role_policy_attachment.lambda_sqs_policy_attachment]
}

# SQS Event Source Mapping for Error Lambda (DLQ)
resource "aws_lambda_event_source_mapping" "notification_dlq_trigger" {
  event_source_arn                   = aws_sqs_queue.notification_email_dlq.arn
  function_name                      = aws_lambda_function.send_notifications_error.arn
  enabled                           = true
  batch_size                        = 5
  maximum_batching_window_in_seconds = 10
  
  depends_on = [aws_iam_role_policy_attachment.lambda_sqs_policy_attachment]
}

# Lambda Function URLs (for easy testing - optional)
resource "aws_lambda_function_url" "send_notifications_url" {
  count              = var.environment != "prod" ? 1 : 0
  function_name      = aws_lambda_function.send_notifications.function_name
  authorization_type = "AWS_IAM"
  
  cors {
    allow_credentials = false
    allow_origins     = ["*"]
    allow_methods     = ["POST"]
    allow_headers     = ["date", "keep-alive"]
    expose_headers    = ["date", "keep-alive"]
    max_age          = 86400
  }
}

# CloudWatch Alarms for Lambda Monitoring
resource "aws_cloudwatch_metric_alarm" "send_notifications_error_rate" {
  alarm_name          = "${local.name_prefix}-send-notifications-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors error rate for send notifications lambda"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.send_notifications.function_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "send_notifications_duration" {
  alarm_name          = "${local.name_prefix}-send-notifications-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Average"
  threshold           = "30000"  # 30 seconds
  alarm_description   = "This metric monitors duration for send notifications lambda"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.send_notifications.function_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "send_notifications_throttles" {
  alarm_name          = "${local.name_prefix}-send-notifications-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "This metric monitors throttles for send notifications lambda"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.send_notifications.function_name
  }

  tags = local.common_tags
}

# Lambda Layers (for shared dependencies - optional enhancement)
/* resource "aws_lambda_layer_version" "notification_service_layer" {
  count               = var.environment == "prod" ? 1 : 0
  filename            = "${path.module}/../../build/notification-service-layer.zip"
  layer_name          = "${local.name_prefix}-notification-service-layer"
  compatible_runtimes = [local.lambda_runtime]
  description         = "Shared dependencies for notification service lambdas"
  
  source_code_hash = filebase64sha256("${path.module}/../../build/notification-service-layer.zip")
} */

# Lambda Versions (for production deployments)
resource "aws_lambda_alias" "send_notifications_live" {
  count            = var.environment == "prod" ? 1 : 0
  name             = "live"
  description      = "Live version of send notifications lambda"
  function_name    = aws_lambda_function.send_notifications.function_name
  function_version = aws_lambda_function.send_notifications.version
  
  routing_config {
    additional_version_weights = {
      "$LATEST" = 0.1  # 10% traffic to latest version for blue-green deployment
    }
  }
}

# Output Lambda information
output "lambda_functions" {
  description = "Lambda functions information"
  value = {
    send_notifications = {
      function_name = aws_lambda_function.send_notifications.function_name
      arn          = aws_lambda_function.send_notifications.arn
      version      = aws_lambda_function.send_notifications.version
      function_url = var.environment != "prod" ? aws_lambda_function_url.send_notifications_url[0].function_url : null
    }
    send_notifications_error = {
      function_name = aws_lambda_function.send_notifications_error.function_name
      arn          = aws_lambda_function.send_notifications_error.arn
      version      = aws_lambda_function.send_notifications_error.version
    }
  generate_report = {
      function_name = aws_lambda_function.generate_report.function_name
      arn           = aws_lambda_function.generate_report.arn
      version       = aws_lambda_function.generate_report.version
    }
  }
}