resource "aws_s3_bucket" "email_templates" {
  bucket = "${local.account_id}-${local.name_prefix}-${var.email_templates_bucket_suffix}"
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-email-templates"
    Type = "email-templates"
  })
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "email_templates_versioning" {
  bucket = aws_s3_bucket.email_templates.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Server-side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "email_templates_encryption" {
  bucket = aws_s3_bucket.email_templates.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "email_templates_pab" {
  bucket = aws_s3_bucket.email_templates.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket Policy for Lambda access
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

# Upload default email templates
resource "aws_s3_object" "welcome_template" {
  bucket       = aws_s3_bucket.email_templates.id
  key          = "welcome.html"
  content_type = "text/html"
  
  content = templatefile("${path.module}/../email-templates/welcome.html", {})
  
  etag = filemd5("${path.module}/../email-templates/welcome.html")
  
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
  
  etag = filemd5("${path.module}/../email-templates/user-login.html")
  
  tags = merge(local.common_tags, {
    Name = "user-login-email-template"
    Type = "email-template"
  })
}

/* resource "aws_s3_object" "user_update_template" {
  bucket       = aws_s3_bucket.email_templates.id
  key          = "user-update.html" 
  content_type = "text/html"
  
  content = templatefile("${path.module}/../email-templates/user-update.html", {})
  
  etag = filemd5("${path.module}/../email-templates/user-update.html")
  
  tags = merge(local.common_tags, {
    Name = "user-update-email-template"
    Type = "email-template"
  })
}

resource "aws_s3_object" "card_create_template" {
  bucket       = aws_s3_bucket.email_templates.id
  key          = "card-create.html"
  content_type = "text/html"
  
  content = templatefile("${path.module}/../email-templates/card-create.html", {})
  
  etag = filemd5("${path.module}/../email-templates/card-create.html")
  
  tags = merge(local.common_tags, {
    Name = "card-create-email-template"
    Type = "email-template"
  })
}

resource "aws_s3_object" "card_activate_template" {
  bucket       = aws_s3_bucket.email_templates.id
  key          = "card-activate.html"
  content_type = "text/html"
  
  content = templatefile("${path.module}/../email-templates/card-activate.html", {})
  
  etag = filemd5("${path.module}/../email-templates/card-activate.html")
  
  tags = merge(local.common_tags, {
    Name = "card-activate-email-template"
    Type = "email-template"
  })
}

resource "aws_s3_object" "transaction_purchase_template" {
  bucket       = aws_s3_bucket.email_templates.id
  key          = "transaction-purchase.html"
  content_type = "text/html"
  
  content = templatefile("${path.module}/../email-templates/transaction-purchase.html", {})
  
  etag = filemd5("${path.module}/../email-templates/transaction-purchase.html")
  
  tags = merge(local.common_tags, {
    Name = "transaction-purchase-email-template"
    Type = "email-template"
  })
}

resource "aws_s3_object" "transaction_save_template" {
  bucket       = aws_s3_bucket.email_templates.id
  key          = "transaction-save.html"
  content_type = "text/html"
  
  content = templatefile("${path.module}/../email-templates/transaction-save.html", {})
  
  etag = filemd5("${path.module}/../email-templates/transaction-save.html")
  
  tags = merge(local.common_tags, {
    Name = "transaction-save-email-template"
    Type = "email-template"
  })
}

resource "aws_s3_object" "transaction_paid_template" {
  bucket       = aws_s3_bucket.email_templates.id
  key          = "transaction-paid.html"
  content_type = "text/html"
  
  content = templatefile("${path.module}/../email-templates/transaction-paid.html", {})
  
  etag = filemd5("${path.module}/../email-templates/transaction-paid.html")
  
  tags = merge(local.common_tags, {
    Name = "transaction-paid-email-template"
    Type = "email-template"
  })
}

resource "aws_s3_object" "report_activity_template" {
  bucket       = aws_s3_bucket.email_templates.id
  key          = "report-activity.html"
  content_type = "text/html"
  
  content = templatefile("${path.module}/../email-templates/report-activity.html", {})
  
  etag = filemd5("${path.module}/../email-templates/report-activity.html")
  
  tags = merge(local.common_tags, {
    Name = "report-activity-email-template"
    Type = "email-template"
  })
}

# S3 Bucket notification for template updates (optional)
resource "aws_s3_bucket_notification" "email_templates_notification" {
  bucket = aws_s3_bucket.email_templates.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.send_notifications.arn
    events              = ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
    filter_prefix       = ""
    filter_suffix       = ".html"
  }

  depends_on = [aws_lambda_permission.allow_s3_invoke]
}

# Lambda permission for S3 to invoke Lambda (for cache invalidation)
resource "aws_lambda_permission" "allow_s3_invoke" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.send_notifications.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.email_templates.arn
}

# CloudWatch Log Group for S3 access logs (optional)
resource "aws_cloudwatch_log_group" "s3_access_logs" {
  name              = "/aws/s3/${aws_s3_bucket.email_templates.bucket}"
  retention_in_days = 30

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-s3-logs"
    Type = "logs"
  })
} */