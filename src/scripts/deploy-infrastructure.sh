set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TERRAFORM_DIR="$PROJECT_ROOT/infrastructure/terraform"
BUILD_DIR="$PROJECT_ROOT/build"

# Default values
ENVIRONMENT="dev"
AWS_REGION="us-east-1"
AUTO_APPROVE=false
DESTROY=false

# Functions
log() {
    echo -e "${2:-$NC}$1${NC}"
}

log_info() {
    log "ℹ️  $1" "$BLUE"
}

log_success() {
    log "✅ $1" "$GREEN"
}

log_warning() {
    log "⚠️  $1" "$YELLOW"
}

log_error() {
    log "❌ $1" "$RED"
}

show_help() {
    echo -e "${BOLD}Notification Service Infrastructure Deployment${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Environment (dev, staging, prod) [default: dev]"
    echo "  -r, --region REGION      AWS region [default: us-east-1]"
    echo "  -a, --auto-approve       Auto approve Terraform changes"
    echo "  -d, --destroy            Destroy infrastructure"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e dev                    Deploy to dev environment"
    echo "  $0 -e prod -a               Deploy to prod with auto-approve"
    echo "  $0 -e staging -d            Destroy staging environment"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -a|--auto-approve)
            AUTO_APPROVE=true
            shift
            ;;
        -d|--destroy)
            DESTROY=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
    exit 1
fi

log_info "Starting deployment for environment: $ENVIRONMENT"
log_info "AWS Region: $AWS_REGION"

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if terraform is installed
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install Terraform first."
        exit 1
    fi
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install AWS CLI first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check if required directories exist
    if [[ ! -d "$TERRAFORM_DIR" ]]; then
        log_error "Terraform directory not found: $TERRAFORM_DIR"
        exit 1
    fi
    
    # Create build directory if it doesn't exist
    mkdir -p "$BUILD_DIR"
    
    log_success "Prerequisites check passed"
}

# Prepare Lambda packages
prepare_lambda_packages() {
    log_info "Preparing Lambda packages..."
    
    # Package send-notifications lambda
    log_info "Packaging send-notifications lambda..."
    cd "$PROJECT_ROOT/src/lambdas/send-notifications"
    
    if [[ ! -f "package.json" ]]; then
        log_error "package.json not found in send-notifications directory"
        exit 1
    fi
    
    # Install production dependencies
    npm install --production --silent
    
    # Create ZIP package
    zip -r "$BUILD_DIR/send-notifications.zip" . -x "node_modules/.cache/*" "*.log" > /dev/null
    log_success "send-notifications package created"
    
    # Package send-notifications-error lambda
    log_info "Packaging send-notifications-error lambda..."
    cd "$PROJECT_ROOT/src/lambdas/send-notifications-error"
    
    if [[ ! -f "package.json" ]]; then
        log_error "package.json not found in send-notifications-error directory"
        exit 1
    fi
    
    # Install production dependencies
    npm install --production --silent
    
    # Create ZIP package
    zip -r "$BUILD_DIR/send-notifications-error.zip" . -x "node_modules/.cache/*" "*.log" > /dev/null
    log_success "send-notifications-error package created"
    
    cd "$PROJECT_ROOT"
}

# Create email templates if they don't exist
create_email_templates() {
    log_info "Creating email templates..."
    
    local templates_dir="$PROJECT_ROOT/infrastructure/email-templates"
    mkdir -p "$templates_dir"
    
    # List of required templates
    local templates=(
        "welcome.html"
        "user-login.html"
        "user-update.html"
        "card-create.html"
        "card-activate.html"
        "transaction-purchase.html"
        "transaction-save.html"
        "transaction-paid.html"
        "report-activity.html"
    )
    
    for template in "${templates[@]}"; do
        if [[ ! -f "$templates_dir/$template" ]]; then
            log_warning "Template $template not found, creating basic template..."
            cat > "$templates_dir/$template" << EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Inferno Bank Notification</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #e74c3c;">🔥 Inferno Bank</h1>
    <h2>Notification</h2>
    <p>This is a basic template for ${template%. html} notifications.</p>
    <p>Template variables will be replaced here.</p>
    <hr>
    <p style="font-size: 12px; color: #666;">
        This is an automated message from Inferno Bank.
    </p>
</body>
</html>
EOF
        fi
    done
    
    log_success "Email templates ready"
}

# Initialize Terraform
terraform_init() {
    log_info "Initializing Terraform..."
    cd "$TERRAFORM_DIR"
    
    terraform init -input=false
    
    log_success "Terraform initialized"
}

# Plan Terraform changes
terraform_plan() {
    log_info "Planning Terraform changes..."
    cd "$TERRAFORM_DIR"
    
    terraform plan \
        -var="environment=$ENVIRONMENT" \
        -var="aws_region=$AWS_REGION" \
        -out=tfplan
    
    log_success "Terraform plan completed"
}

# Apply Terraform changes
terraform_apply() {
    log_info "Applying Terraform changes..."
    cd "$TERRAFORM_DIR"
    
    if [[ "$AUTO_APPROVE" == true ]]; then
        terraform apply -auto-approve tfplan
    else
        terraform apply tfplan
    fi
    
    log_success "Infrastructure deployed successfully!"
}

# Destroy infrastructure
terraform_destroy() {
    log_warning "This will DESTROY all infrastructure for environment: $ENVIRONMENT"
    
    if [[ "$AUTO_APPROVE" != true ]]; then
        read -p "Are you sure? Type 'yes' to continue: " confirmation
        if [[ "$confirmation" != "yes" ]]; then
            log_info "Destruction cancelled"
            exit 0
        fi
    fi
    
    log_info "Destroying infrastructure..."
    cd "$TERRAFORM_DIR"
    
    if [[ "$AUTO_APPROVE" == true ]]; then
        terraform destroy \
            -var="environment=$ENVIRONMENT" \
            -var="aws_region=$AWS_REGION" \
            -auto-approve
    else
        terraform destroy \
            -var="environment=$ENVIRONMENT" \
            -var="aws_region=$AWS_REGION"
    fi
    
    log_success "Infrastructure destroyed"
}

# Get outputs and update .env file
update_env_file() {
    log_info "Updating .env file with infrastructure outputs..."
    cd "$TERRAFORM_DIR"
    
    # Get Terraform outputs
    local env_content
    env_content=$(terraform output -raw env_file_content 2>/dev/null || echo "")
    
    if [[ -n "$env_content" ]]; then
        echo "$env_content" > "$PROJECT_ROOT/.env.terraform"
        log_success "Environment file created: .env.terraform"
        log_info "Copy your AWS credentials from .env to .env.terraform"
        log_info "Then rename .env.terraform to .env to use the new infrastructure"
    else
        log_warning "Could not retrieve Terraform outputs"
    fi
}

# Show deployment summary
show_summary() {
    log_info "Deployment Summary"
    cd "$TERRAFORM_DIR"
    
    echo ""
    echo -e "${BOLD}📊 Infrastructure Resources:${NC}"
    terraform output lambda_functions 2>/dev/null || echo "Lambda outputs not available"
    echo ""
    terraform output sqs_queue_info 2>/dev/null || echo "SQS outputs not available"
    echo ""
    
    log_success "Deployment completed for environment: $ENVIRONMENT"
    log_info "Check CloudWatch logs for Lambda function monitoring"
    log_info "Check SQS queues in AWS Console for message processing"
}

# Main execution
main() {
    log_info "🔥 Inferno Bank - Notification Service Deployment"
    echo ""
    
    check_prerequisites
    
    if [[ "$DESTROY" == true ]]; then
        terraform_destroy
        exit 0
    fi
    
    prepare_lambda_packages
    create_email_templates
    terraform_init
    terraform_plan
    
    # Ask for confirmation if not auto-approve
    if [[ "$AUTO_APPROVE" != true ]]; then
        echo ""
        read -p "Do you want to apply these changes? (y/N): " apply_confirmation
        if [[ ! "$apply_confirmation" =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    fi
    
    terraform_apply
    update_env_file
    show_summary
}

# Run main function
main "$@"