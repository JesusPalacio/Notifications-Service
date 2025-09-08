# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}🔥 INFERNO BANK - NOTIFICATION SERVICE TESTING SUITE 🔥${NC}"
echo -e "${BLUE}=================================================================${NC}\n"

# Verificar que existe .env
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo -e "${YELLOW}💡 Copy .env.example to .env and configure your AWS credentials${NC}"
    exit 1
fi

# Verificar dependencias
echo -e "${BLUE}📦 Checking dependencies...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}✅ Dependencies OK${NC}\n"

# Función para ejecutar test con manejo de errores
run_test() {
    local test_name=$1
    local test_file=$2
    local description=$3
    
    echo -e "${BLUE}${BOLD}🧪 $test_name${NC}"
    echo -e "${YELLOW}   $description${NC}"
    
    if node "$test_file"; then
        echo -e "${GREEN}   ✅ $test_name completed${NC}\n"
        return 0
    else
        echo -e "${RED}   ❌ $test_name failed${NC}\n"
        return 1
    fi
}

# Menú de opciones
show_menu() {
    echo -e "${BOLD}📋 Available test suites:${NC}"
    echo "1. 🎨 Template Testing - Test email template generation"
    echo "2. 🗃️  Model Testing - Test data models and validations"  
    echo "3. ⚡ Performance Testing - Test with multiple messages"
    echo "4. 🔗 Integration Testing - Test end-to-end flows"
    echo "5. 📧 Interactive Testing - Menu-driven Lambda testing"
    echo "6. 🚀 Quick Lambda Test - Run built-in test function"
    echo "7. 🎯 All Tests - Run complete test suite"
    echo "8. 🔧 Environment Check - Verify AWS configuration"
    echo "0. Exit"
    echo ""
}

# Test de configuración de ambiente
test_environment() {
    echo -e "${BLUE}${BOLD}🔧 Environment Configuration Check${NC}"
    
    # Verificar variables de entorno
    echo -e "${YELLOW}📋 Checking environment variables...${NC}"
    
    required_vars=("AWS_REGION" "AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY")
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=($var)
        else
            echo -e "${GREEN}   ✅ $var is set${NC}"
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo -e "${RED}   ❌ Missing variables: ${missing_vars[*]}${NC}"
        echo -e "${YELLOW}   💡 Please configure these in your .env file${NC}"
        return 1
    fi
    
    # Verificar estructura de archivos
    echo -e "${YELLOW}📁 Checking file structure...${NC}"
    
    required_files=(
        "src/lambdas/send-notifications/index.js"
        "src/shared/models/notification.js"
        "src/shared/models/notificationError.js"
        "src/shared/templates/emailTemplates.js"
        "src/config/constants.js"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            echo -e "${GREEN}   ✅ $file exists${NC}"
        else
            echo -e "${RED}   ❌ $file missing${NC}"
            return 1
        fi
    done
    
    echo -e "${GREEN}🎉 Environment configuration is complete!${NC}\n"
    return 0
}

# Test rápido de Lambda
quick_test() {
    echo -e "${BLUE}${BOLD}🚀 Quick Lambda Test${NC}"
    echo -e "${YELLOW}Running built-in test function...${NC}"
    
    node -e "
        require('dotenv').config();
        const { testLocal } = require('./src/lambdas/send-notifications/index');
        testLocal().then(() => {
            console.log('\\n✅ Quick test completed');
        }).catch(err => {
            console.error('❌ Quick test failed:', err.message);
            process.exit(1);
        });
    "
}

# Ejecutar todos los tests
run_all_tests() {
    echo -e "${BLUE}${BOLD}🎯 Running Complete Test Suite${NC}\n"
    
    local failed_tests=0
    
    # Test environment first
    if ! test_environment; then
        echo -e "${RED}❌ Environment check failed. Fix configuration before running tests.${NC}"
        return 1
    fi
    
    # Run all test files
    run_test "Template Testing" "scripts/test-templates.js" "Testing email template generation and formatting" || ((failed_tests++))
    run_test "Model Testing" "scripts/test-models.js" "Testing data models and validations" || ((failed_tests++))
    run_test "Performance Testing" "scripts/test-performance.js" "Testing with multiple messages and load" || ((failed_tests++))
    run_test "Integration Testing" "scripts/test-integration.js" "Testing end-to-end notification flows" || ((failed_tests++))
    
    # Summary
    echo -e "${BLUE}${BOLD}📊 Test Suite Summary${NC}"
    if [ $failed_tests -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed successfully!${NC}"
        echo -e "${GREEN}✅ Notification Service is ready for deployment${NC}"
    else
        echo -e "${RED}❌ $failed_tests test(s) failed${NC}"
        echo -e "${YELLOW}💡 Review the output above to fix issues${NC}"
    fi
    
    return $failed_tests
}

# Main execution
main() {
    # Cargar variables de entorno
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    # Si hay argumentos, ejecutar directamente
    if [ $# -gt 0 ]; then
        case $1 in
            "templates")
                run_test "Template Testing" "scripts/test-templates.js" "Testing email templates"
                ;;
            "models")
                run_test "Model Testing" "scripts/test-models.js" "Testing data models"
                ;;
            "performance")
                run_test "Performance Testing" "scripts/test-performance.js" "Testing performance"
                ;;
            "integration")
                run_test "Integration Testing" "scripts/test-integration.js" "Testing integration"
                ;;
            "interactive")
                node scripts/test-local.js
                ;;
            "quick")
                quick_test
                ;;
            "all")
                run_all_tests
                ;;
            "env")
                test_environment
                ;;
            *)
                echo -e "${RED}❌ Unknown option: $1${NC}"
                echo -e "${YELLOW}Available options: templates, models, performance, integration, interactive, quick, all, env${NC}"
                exit 1
                ;;
        esac
        exit $?
    fi
    
    # Menú interactivo
    while true; do
        show_menu
        read -p "🎯 Select an option (0-8): " choice
        
        case $choice in
            1)
                run_test "Template Testing" "scripts/test-templates.js" "Testing email template generation and formatting"
                ;;
            2)
                run_test "Model Testing" "scripts/test-models.js" "Testing data models and validations"
                ;;
            3)
                run_test "Performance Testing" "scripts/test-performance.js" "Testing with multiple messages and load"
                ;;
            4)
                run_test "Integration Testing" "scripts/test-integration.js" "Testing end-to-end notification flows"
                ;;
            5)
                echo -e "${BLUE}🎮 Starting Interactive Testing...${NC}"
                node scripts/test-local.js
                ;;
            6)
                quick_test
                ;;
            7)
                run_all_tests
                ;;
            8)
                test_environment
                ;;
            0)
                echo -e "${GREEN}👋 Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Invalid option${NC}"
                ;;
        esac
        
        echo ""
        read -p "⏸️  Press Enter to continue..."
        clear
    done
}

# Hacer el script ejecutable y ejecutar
main "$@"