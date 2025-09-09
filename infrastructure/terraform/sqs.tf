resource "aws_sqs_queue" "notification_email_dlq" {
  name = "${local.name_prefix}-notification-email-error-sqs"

  # Message retention period 
  message_retention_seconds = var.sqs_message_retention_seconds

  # Visibility timeout
  visibility_timeout_seconds = var.sqs_visibility_timeout_seconds

  # Enable long polling
  receive_wait_time_seconds = var.sqs_receive_wait_time_seconds

  # Server-side encryption
  sqs_managed_sse_enabled = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-notification-email-dlq"
    Type = "dead-letter-queue"
  })
}

# Main Notification Queue
resource "aws_sqs_queue" "notification_email" {
  name = "${local.name_prefix}-notification-email-sqs"

  # Message retention period 
  message_retention_seconds = var.sqs_message_retention_seconds

  # Visibility timeout 
  visibility_timeout_seconds = var.sqs_visibility_timeout_seconds

  # Enable long polling
  receive_wait_time_seconds = var.sqs_receive_wait_time_seconds

  # Dead letter queue configuration
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notification_email_dlq.arn
    maxReceiveCount     = var.dlq_max_receive_count
  })

  # Server-side encryption
  sqs_managed_sse_enabled = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-notification-email-queue"
    Type = "main-queue"
  })

  depends_on = [aws_sqs_queue.notification_email_dlq]
}

# SQS Queue Policy for Lambda access
resource "aws_sqs_queue_policy" "notification_email_policy" {
  queue_url = aws_sqs_queue.notification_email.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowLambdaAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.lambda_execution_role.arn
        }
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = aws_sqs_queue.notification_email.arn
      },
      {
        Sid    = "AllowOtherServicesAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${local.account_id}:root"
        }
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueUrl",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.notification_email.arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = local.account_id
          }
        }
      },
      {
        Sid    = "AllowCrossAccountFrom683104418449"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::683104418449:root"
        }
        Action = "sqs:SendMessage"
        Resource = aws_sqs_queue.notification_email.arn
      }
    ]
  })
}

# SQS DLQ Policy for Error Lambda access
resource "aws_sqs_queue_policy" "notification_email_dlq_policy" {
  queue_url = aws_sqs_queue.notification_email_dlq.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowErrorLambdaAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.lambda_execution_role.arn
        }
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = aws_sqs_queue.notification_email_dlq.arn
      }
    ]
  })
}

# CloudWatch Alarms for Queue Monitoring
resource "aws_cloudwatch_metric_alarm" "notification_queue_dlq_messages" {
  alarm_name          = "${local.name_prefix}-notification-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ApproximateNumberOfVisibleMessages"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "This metric monitors the number of messages in the notification DLQ"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    QueueName = aws_sqs_queue.notification_email_dlq.name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "notification_queue_old_messages" {
  alarm_name          = "${local.name_prefix}-notification-queue-old-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ApproximateAgeOfOldestMessage"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Maximum"
  threshold           = "900" # 15 minutes
  alarm_description   = "This metric monitors the age of the oldest message in the notification queue"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    QueueName = aws_sqs_queue.notification_email.name
  }

  tags = local.common_tags
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${local.name_prefix}-notification-alerts"
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alerts"
    Type = "monitoring"
  })
}

# SNS Topic Subscription (optional - for admin email alerts)
resource "aws_sns_topic_subscription" "admin_email_alerts" {
  count     = var.admin_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.admin_email
}

# Output queue information
output "sqs_queue_info" {
  description = "SQS Queue information"
  value = {
    main_queue = {
      name = aws_sqs_queue.notification_email.name
      url  = aws_sqs_queue.notification_email.url
      arn  = aws_sqs_queue.notification_email.arn
    }
    dlq = {
      name = aws_sqs_queue.notification_email_dlq.name
      url  = aws_sqs_queue.notification_email_dlq.url
      arn  = aws_sqs_queue.notification_email_dlq.arn
    }
  }
}