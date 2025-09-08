variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "inferno-bank"
}

variable "notification_table_name" {
  description = "DynamoDB table name for notifications"
  type        = string
  default     = "notification-table"
}

variable "notification_error_table_name" {
  description = "DynamoDB table name for notification errors"
  type        = string
  default     = "notification-error-table"
}

variable "email_templates_bucket_suffix" {
  description = "Suffix for email templates S3 bucket (bucket name will be prefixed with account id)"
  type        = string
  default     = "templates-email-notification"
}

variable "admin_email" {
  description = "Admin email for critical error notifications"
  type        = string
  default     = "jesusdanielpalacioavila50@gmail.com"
}

variable "from_email" {
  description = "From email address for notifications"
  type        = string
  default     = "jesusdanielpalacioavila50@gmail.com"
}

variable "from_name" {
  description = "From name for notifications"
  type        = string
  default     = "Inferno Bank"
}

# Lambda configuration variables
variable "lambda_memory_size" {
  description = "Memory size for Lambda functions"
  type        = number
  default     = 256
}

variable "lambda_timeout" {
  description = "Timeout for Lambda functions"
  type        = number
  default     = 60
}

variable "lambda_reserved_concurrency" {
  description = "Reserved concurrency for Lambda functions"
  type        = number
  default     = 10
}

# SQS configuration variables
variable "sqs_visibility_timeout_seconds" {
  description = "SQS visibility timeout in seconds"
  type        = number
  default     = 300
}

variable "sqs_message_retention_seconds" {
  description = "SQS message retention period in seconds"
  type        = number
  default     = 1209600  # 14 days
}

variable "sqs_receive_wait_time_seconds" {
  description = "SQS receive message wait time in seconds"
  type        = number
  default     = 20
}

variable "dlq_max_receive_count" {
  description = "Maximum receive count before moving message to DLQ"
  type        = number
  default     = 3
}