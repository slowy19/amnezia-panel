#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

get_project_root() {
    local script_dir
    script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    echo "$script_dir"
}

get_public_ip() {
    local ip=""
    
    if command -v curl &> /dev/null; then
        ip=$(curl -s --max-time 5 ifconfig.me)
    fi
    
    if [ -z "$ip" ] && command -v curl &> /dev/null; then
        ip=$(curl -s --max-time 5 ipinfo.io/ip)
    fi
    
    if [ -z "$ip" ] && command -v dig &> /dev/null; then
        ip=$(dig +short myip.opendns.com @resolver1.opendns.com 2>/dev/null || echo "")
    fi
    
    if [ -z "$ip" ]; then
        ip=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")
        print_warning "Could not get public IP, using local IP: $ip"
    fi
    
    echo "$ip"
}

generate_encryption_key() {
    if command -v node &> /dev/null; then
        node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
    elif command -v openssl &> /dev/null; then
        openssl rand -base64 32
    else
        print_error "Neither node nor openssl found. Cannot generate encryption key."
        exit 1
    fi
}

read_env_value() {
    local key="$1"
    if [ -f .env ]; then
        grep -E "^${key}=" .env | cut -d '=' -f2- | sed 's/^"//;s/"$//'
    fi
}

prompt_with_default() {
    local var_name="$1"
    local prompt_text="$2"
    local default_value="$3"
    local is_secret="${4:-false}"
    
    local current_value=$(read_env_value "$var_name")
    if [ -n "$current_value" ]; then
        default_value="$current_value"
    fi
    
    local user_input
    local default_display
    
    if [ "$is_secret" = "true" ] && [ -n "$default_value" ]; then
        default_display="[Use current value]"
    else
        default_display="[$default_value]"
    fi
    
    echo -n "$prompt_text $default_display: "
    
    if [ "$is_secret" = "true" ]; then
        read -s user_input
        echo
    else
        read user_input
    fi
    
    if [ -z "$user_input" ]; then
        echo "$default_value"
    else
        echo "$user_input"
    fi
}

add_cron_job() {
    local project_path="$1"
    local backup_script_path="$project_path/scripts/backup-db.sh"
    
    local cron_command="0 0 */3 * * $backup_script_path"
    local temp_crontab=$(mktemp)
    
    print_message "Setting up cron job for automatic database backup..."
    
    crontab -l 2>/dev/null > "$temp_crontab" || true
    
    if grep -qF "$backup_script_path" "$temp_crontab"; then
        print_message "Cron job already exists"
    else
        echo "$cron_command" >> "$temp_crontab"
        crontab "$temp_crontab"
        print_message "Cron job added: Database backup every 3 days at midnight"
    fi
    
    rm -f "$temp_crontab"
    
    print_message "Current cron jobs:"
    crontab -l 2>/dev/null | grep -E "(backup|$project_path)" || echo "  (no backup-related cron jobs found)"
}

main() {
    PROJECT_ROOT=$(get_project_root)
    cd "$PROJECT_ROOT"
    
    print_message "Starting deployment of AmneziaVPN Panel"
    
    print_message "Checking SSL certificates..."
    if [ ! -d "certs" ]; then
        mkdir -p certs
    fi
    
    if [ ! -f "certs/selfsigned.crt" ] || [ ! -f "certs/selfsigned.key" ]; then
        print_message "Generating self-signed SSL certificates..."
        openssl req -x509 -newkey rsa:4096 \
            -keyout certs/selfsigned.key \
            -out certs/selfsigned.crt \
            -days 365 -nodes \
            -subj "/CN=amnezia-panel.local" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            print_message "SSL certificates generated successfully"
        else
            print_error "Failed to generate SSL certificates"
            exit 1
        fi
    else
        print_message "SSL certificates already exist"
    fi
    
    print_message "Loading default values..."
    
    PUBLIC_IP=$(get_public_ip)
    
    print_message "Configuring environment variables (press Enter to use default value):"
    echo "================================================"
    
    NEXT_PUBLIC_VPN_NAME=$(prompt_with_default "NEXT_PUBLIC_VPN_NAME" "VPN Name" "AmneziaVPN")
    NEXT_PUBLIC_USES_TELEGRAM_BOT=$(prompt_with_default "NEXT_PUBLIC_USES_TELEGRAM_BOT" "Use Telegram Bot (true/false)" "true")
    
    DB_USER=$(prompt_with_default "DB_USER" "Database username" "username")
    DB_PASSWORD=$(prompt_with_default "DB_PASSWORD" "Database password" "password" "true")
    DB_NAME=$(prompt_with_default "DB_NAME" "Database name" "panel")
    
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}"
    
    AMNEZIA_API_HOST=$(prompt_with_default "AMNEZIA_API_HOST" "Amnezia API Host" "$PUBLIC_IP")
    AMNEZIA_API_PORT=$(prompt_with_default "AMNEZIA_API_PORT" "Amnezia API Port" "80")
    AMNEZIA_API_KEY=$(prompt_with_default "AMNEZIA_API_KEY" "Amnezia API Key" "" "true")
    
    TELEGRAM_BOT_TOKEN=$(prompt_with_default "TELEGRAM_BOT_TOKEN" "Telegram Bot Token (optional)" "" "true")
    
    if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
        NEXT_PUBLIC_USES_TELEGRAM_BOT="false"
    else
        NEXT_PUBLIC_USES_TELEGRAM_BOT="true"
    fi
    
    EXISTING_ENCRYPTION_KEY=$(read_env_value "ENCRYPTION_KEY")
    if [ -n "$EXISTING_ENCRYPTION_KEY" ]; then
        ENCRYPTION_KEY="$EXISTING_ENCRYPTION_KEY"
        print_message "Using existing ENCRYPTION_KEY"
    else
        print_message "Generating new ENCRYPTION_KEY..."
        ENCRYPTION_KEY=$(generate_encryption_key)
        if [ -n "$ENCRYPTION_KEY" ]; then
            print_message "ENCRYPTION_KEY generated successfully"
        fi
    fi
    
    NODE_ENV=$(prompt_with_default "NODE_ENV" "Node environment" "production")
    
    print_message "Creating/updating .env file..."
    
    cat > .env << EOF
# VPN Name Service
NEXT_PUBLIC_VPN_NAME="${NEXT_PUBLIC_VPN_NAME}"
# true or false
NEXT_PUBLIC_USES_TELEGRAM_BOT="${NEXT_PUBLIC_USES_TELEGRAM_BOT}"

# PostgreSQL database
DB_USER="${DB_USER}"
DB_PASSWORD="${DB_PASSWORD}"
DB_NAME="${DB_NAME}"
DATABASE_URL="${DATABASE_URL}"

# Domain or IP address of AmneziaVPN
AMNEZIA_API_HOST="${AMNEZIA_API_HOST}"
# Port of Amnezia API
AMNEZIA_API_PORT="${AMNEZIA_API_PORT}"
# API key
AMNEZIA_API_KEY="${AMNEZIA_API_KEY}"

# Telegram Bot Token (optional)
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"

# Key for encrypt VPN config keys
ENCRYPTION_KEY="${ENCRYPTION_KEY}"

# development or test or production
NODE_ENV="${NODE_ENV}"
EOF
    
    print_message ".env file created/updated successfully"
    
    print_message "Checking Docker and Docker Compose..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker using official docs."
        exit 1
    fi
    
    if ! command -v docker compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose using official docs."
        exit 1
    fi
    
    print_message "Building and starting Docker containers..."
    
    docker compose down 2>/dev/null || true

    print_message "Starting Docker..."
    docker compose --env-file .env up -d --build
    
    print_message "Checking container status..."
    
    sleep 5
    
    if docker ps | grep -q "app-amnezia-panel"; then
        print_message "Application container is running"
    else
        print_error "Application container failed to start"
        docker compose logs app
        exit 1
    fi
    
    if docker ps | grep -q "db-amnezia-panel"; then
        print_message "Database container is running"
    else
        print_error "Database container failed to start"
        docker compose logs db
        exit 1
    fi
    
    add_cron_job "$PROJECT_ROOT"
    
    print_message "================================================"
    print_message "Deployment completed successfully!"
    print_message ""
    print_message "Application is available at:"
    print_message "  https://${AMNEZIA_API_HOST}:8443"
    print_message ""
    print_message "Containers running:"
    docker compose ps
    print_message ""
    print_message "To view logs:"
    print_message "  docker compose logs -f"
    print_message ""
    print_message "To stop the application:"
    print_message "  docker compose down"
    print_message ""
    print_warning "Note: Using self-signed certificate. You may need to accept the security warning in your browser."
    print_message "================================================"
}

main "$@"