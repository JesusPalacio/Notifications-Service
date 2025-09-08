resource "aws_dynamodb_table" "notifications" {
  name           = "${local.name_prefix}-${var.notification_table_name}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "uuid"
  range_key      = "createdAt"

  # Partition key
  attribute {
    name = "uuid"
    type = "S"
  }

  # Sort key  
  attribute {
    name = "createdAt"
    type = "S"
  }

  # GSI for querying by email
  attribute {
    name = "email"
    type = "S"
  }

  # GSI for querying by type
  attribute {
    name = "type"
    type = "S"
  }

  # GSI for querying by status
  attribute {
    name = "status"
    type = "S"
  }

  # Global Secondary Index - Query by Email
  global_secondary_index {
    name     = "EmailIndex"
    hash_key = "email"
    range_key = "createdAt"
    projection_type = "ALL"
  }

  # Global Secondary Index - Query by Type
  global_secondary_index {
    name     = "TypeIndex"
    hash_key = "type"
    range_key = "createdAt"
    projection_type = "ALL"
  }

  # Global Secondary Index - Query by Status
  global_secondary_index {
    name     = "StatusIndex"
    hash_key = "status"
    range_key = "createdAt"
    projection_type = "ALL"
  }

  # Enable point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  # DeletionProtection for production
  deletion_protection_enabled = var.environment == "prod" ? true : false

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-notifications-table"
    Type = "notifications"
  })
}

# DynamoDB Table for Notification Errors
resource "aws_dynamodb_table" "notification_errors" {
  name           = "${local.name_prefix}-${var.notification_error_table_name}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "uuid"
  range_key      = "createdAt"

  # Partition key
  attribute {
    name = "uuid"
    type = "S"
  }

  # Sort key
  attribute {
    name = "createdAt"
    type = "S"
  }

  # For querying by original notification ID
  attribute {
    name = "originalNotificationId"
    type = "S"
  }

  # For querying by error type
  attribute {
    name = "errorType"
    type = "S"
  }

  # For querying by resolution status
  attribute {
    name = "resolved"
    type = "S"
  }

  # Global Secondary Index - Query by Original Notification ID
  global_secondary_index {
    name     = "OriginalNotificationIndex"
    hash_key = "originalNotificationId"
    range_key = "createdAt"
    projection_type = "ALL"
  }

  # Global Secondary Index - Query by Error Type
  global_secondary_index {
    name     = "ErrorTypeIndex"
    hash_key = "errorType"
    range_key = "createdAt"
    projection_type = "ALL"
  }

  # Global Secondary Index - Query by Resolution Status
  global_secondary_index {
    name     = "ResolvedIndex"
    hash_key = "resolved"
    range_key = "createdAt"
    projection_type = "ALL"
  }

  # Enable point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  # DeletionProtection for production
  deletion_protection_enabled = var.environment == "prod" ? true : false

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-notification-errors-table"
    Type = "notification-errors"
  })
}

# DynamoDB Table for Testing (optional, only in dev/staging)
resource "aws_dynamodb_table" "notifications_test" {
  count = var.environment != "prod" ? 1 : 0
  
  name           = "${local.name_prefix}-notifications-test"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "uuid"
  range_key      = "createdAt"

  attribute {
    name = "uuid"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-notifications-test-table"
    Type = "test"
  })
}