##########################################
# S3 Buckets: Email Templates & Reports
##########################################

# Bucket Email Templates
resource "aws_s3_bucket" "email_templates" {
  bucket = "${local.account_id}-${local.name_prefix}-${var.email_templates_bucket_suffix}"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-email-templates"
    Type = "email-templates"
  })
}

# Bucket Reports
resource "aws_s3_bucket" "reports" {
  bucket = "${local.account_id}-${local.name_prefix}-reports"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-reports"
    Type = "reports"
  })
}

##########################################
# Versioning
##########################################

resource "aws_s3_bucket_versioning" "email_templates_versioning" {
  bucket = aws_s3_bucket.email_templates.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "reports_versioning" {
  bucket = aws_s3_bucket.reports.id
  versioning_configuration {
    status = "Enabled"
  }
}

##########################################
# Server-side Encryption
##########################################

resource "aws_s3_bucket_server_side_encryption_configuration" "email_templates_encryption" {
  bucket = aws_s3_bucket.email_templates.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "reports_encryption" {
  bucket = aws_s3_bucket.reports.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

##########################################
# Public Access Block
##########################################

resource "aws_s3_bucket_public_access_block" "email_templates_pab" {
  bucket = aws_s3_bucket.email_templates.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "reports_pab" {
  bucket = aws_s3_bucket.reports.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

##########################################
# Bucket Policies
##########################################

# Email Templates Policy
resource "aws_s3_bucket_policy" "email_templates_policy" {
  bucket = aws_s3_bucket.email_templates.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowLambdaRead"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.lambda_execution_role.arn
        }
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion"
        ]
        Resource = "${aws_s3_bucket.email_templates.arn}/*"
      },
      {
        Sid    = "AllowLambdaList"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.lambda_execution_role.arn
        }
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.email_templates.arn
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.email_templates_pab]
}

# Reports Policy
resource "aws_s3_bucket_policy" "reports_policy" {
  bucket = aws_s3_bucket.reports.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid    = "AllowLambdaReportsAccess",
        Effect = "Allow",
        Principal = {
          AWS = aws_iam_role.lambda_execution_role.arn
        },
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:ListBucket"
        ],
        Resource = [
          "${aws_s3_bucket.reports.arn}",
          "${aws_s3_bucket.reports.arn}/*"
        ]
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.reports_pab]
}

##########################################
# Upload Default Email Templates
##########################################

resource "aws_s3_object" "welcome_template" {
  bucket       = aws_s3_bucket.email_templates.id
  key          = "welcome.html"
  content_type = "text/html"

  content = templatefile("${path.module}/../email-templates/welcome.html", {})
  etag    = filemd5("${path.module}/../email-templates/welcome.html")

  tags = merge(local.common_tags, {
    Name = "welcome-email-template"
    Type = "email-template"
  })
}

resource "aws_s3_object" "user_login_template" {
  bucket       = aws_s3_bucket.email_templates.id
  key          = "user-login.html"
  content_type = "text/html"

  content = templatefile("${path.module}/../email-templates/user-login.html", {})
  etag    = filemd5("${path.module}/../email-templates/user-login.html")

  tags = merge(local.common_tags, {
    Name = "user-login-email-template"
    Type = "email-template"
  })
}

##########################################
# Notifications (Optional)
##########################################

# Notify Lambda when templates change
resource "aws_s3_bucket_notification" "email_templates_notification" {
  bucket = aws_s3_bucket.email_templates.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.send_notifications.arn
    events              = ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
    filter_suffix       = ".html"
  }

  depends_on = [aws_lambda_permission.allow_s3_invoke]
}

# Allow S3 to invoke Lambda
resource "aws_lambda_permission" "allow_s3_invoke" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.send_notifications.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.email_templates.arn
}

##########################################
# Logs (Optional)
##########################################

resource "aws_cloudwatch_log_group" "s3_access_logs" {
  name              = "/aws/s3/${aws_s3_bucket.email_templates.bucket}"
  retention_in_days = 30

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-s3-logs"
    Type = "logs"
  })
}
