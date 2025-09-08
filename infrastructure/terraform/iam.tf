resource "aws_iam_role" "lambda_execution_role" {
  name = "${local.name_prefix}-lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-lambda-execution-role"
    Type = "lambda-role"
  })
}

# Basic Lambda Execution Policy (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_execution_role.name
}

# DynamoDB Policy for Lambda
resource "aws_iam_policy" "lambda_dynamodb_policy" {
  name        = "${local.name_prefix}-lambda-dynamodb-policy"
  description = "Policy for Lambda functions to access DynamoDB tables"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.notifications.arn,
          "${aws_dynamodb_table.notifications.arn}/index/*",
          aws_dynamodb_table.notification_errors.arn,
          "${aws_dynamodb_table.notification_errors.arn}/index/*"
        ]
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb_policy_attachment" {
  policy_arn = aws_iam_policy.lambda_dynamodb_policy.arn
  role       = aws_iam_role.lambda_execution_role.name
}

# SES Policy for Lambda
resource "aws_iam_policy" "lambda_ses_policy" {
  name        = "${local.name_prefix}-lambda-ses-policy"
  description = "Policy for Lambda functions to send emails via SES"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:GetIdentityVerificationAttributes",
          "ses:GetIdentityDkimAttributes",
          "ses:GetSendQuota",
          "ses:GetSendStatistics",
          "ses:ListIdentities",
          "ses:VerifyEmailIdentity"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_ses_policy_attachment" {
  policy_arn = aws_iam_policy.lambda_ses_policy.arn
  role       = aws_iam_role.lambda_execution_role.name
}

# S3 Policy for Lambda (Email Templates)
resource "aws_iam_policy" "lambda_s3_policy" {
  name        = "${local.name_prefix}-lambda-s3-policy"
  description = "Policy for Lambda functions to access S3 email templates"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion"
        ]
        Resource = "${aws_s3_bucket.email_templates.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = aws_s3_bucket.email_templates.arn
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_s3_policy_attachment" {
  policy_arn = aws_iam_policy.lambda_s3_policy.arn
  role       = aws_iam_role.lambda_execution_role.name
}

# SQS Policy for Lambda
resource "aws_iam_policy" "lambda_sqs_policy" {
  name        = "${local.name_prefix}-lambda-sqs-policy"
  description = "Policy for Lambda functions to access SQS queues"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = [
          aws_sqs_queue.notification_email.arn,
          aws_sqs_queue.notification_email_dlq.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueUrl"
        ]
        Resource = [
          aws_sqs_queue.notification_email.arn,
          aws_sqs_queue.notification_email_dlq.arn  
        ]
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_sqs_policy_attachment" {
  policy_arn = aws_iam_policy.lambda_sqs_policy.arn
  role       = aws_iam_role.lambda_execution_role.name
}

# CloudWatch Policy for Lambda (Enhanced Monitoring)
resource "aws_iam_policy" "lambda_cloudwatch_policy" {
  name        = "${local.name_prefix}-lambda-cloudwatch-policy"
  description = "Policy for Lambda functions to write custom CloudWatch metrics and logs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
          "logs:DescribeLogGroups"
        ]
        Resource = "arn:aws:logs:${local.region}:${local.account_id}:*"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_cloudwatch_policy_attachment" {
  policy_arn = aws_iam_policy.lambda_cloudwatch_policy.arn
  role       = aws_iam_role.lambda_execution_role.name
}

# XRay Policy for Lambda (for distributed tracing - optional)
resource "aws_iam_role_policy_attachment" "lambda_xray_policy" {
  count      = var.environment == "prod" ? 1 : 0
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
  role       = aws_iam_role.lambda_execution_role.name
}

# Secrets Manager Policy for Lambda (if needed for future enhancements)
resource "aws_iam_policy" "lambda_secrets_policy" {
  name        = "${local.name_prefix}-lambda-secrets-policy"
  description = "Policy for Lambda functions to access Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "arn:aws:secretsmanager:${local.region}:${local.account_id}:secret:${local.name_prefix}/*"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_secrets_policy_attachment" {
  policy_arn = aws_iam_policy.lambda_secrets_policy.arn
  role       = aws_iam_role.lambda_execution_role.name
}

# Role for other services to send messages to SQS
resource "aws_iam_role" "notification_sender_role" {
  name = "${local.name_prefix}-notification-sender-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${local.account_id}:root"
        }
        Condition = {
          StringEquals = {
            "sts:ExternalId" = "${local.name_prefix}-external-id"
          }
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-notification-sender-role"
    Type = "service-role"
  })
}

# Policy for other services to send notifications
resource "aws_iam_policy" "notification_sender_policy" {
  name        = "${local.name_prefix}-notification-sender-policy"
  description = "Policy for other services to send notification messages to SQS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueUrl",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.notification_email.arn
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "notification_sender_policy_attachment" {
  policy_arn = aws_iam_policy.notification_sender_policy.arn
  role       = aws_iam_role.notification_sender_role.name
}

# Output IAM information
output "iam_roles" {
  description = "IAM roles created for the notification service"
  value = {
    lambda_execution_role = {
      name = aws_iam_role.lambda_execution_role.name
      arn  = aws_iam_role.lambda_execution_role.arn
    }
    notification_sender_role = {
      name = aws_iam_role.notification_sender_role.name
      arn  = aws_iam_role.notification_sender_role.arn
    }
  }
}