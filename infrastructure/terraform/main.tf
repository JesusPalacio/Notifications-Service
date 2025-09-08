terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "inferno-bank"
      Service     = "notification-service"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Local values
locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
  
  # Naming convention
  name_prefix = "${var.project_name}-${var.environment}"
  
  # Common tags
  common_tags = {
    Project     = var.project_name
    Service     = "notification-service"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
  
  # Lambda configuration
  lambda_runtime = "nodejs18.x"
  lambda_timeout = 60
  
  # SQS configuration
  sqs_visibility_timeout = 300  # 5 minutes
  sqs_message_retention  = 1209600  # 14 days
  dlq_max_receive_count  = 3
}