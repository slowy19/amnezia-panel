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
    echo "$(dirname "$script_dir")"
}

get_public_ip() {
    local ip=""

    if command -v curl &> /dev/null; then
        ip=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || true)
    fi

    if [ -z "$ip" ] && command -v curl &> /dev/null; then
        ip=$(curl -s --max-time 5 ipinfo.io/ip 2>/dev/null || true)
    fi

    if [ -z "$ip" ] && command -v dig &> /dev/null; then
        ip=$(dig +short myip.opendns.com @resolver1.opendns.com 2>/dev/null || true)
    fi

    if [ -z "$ip" ]; then
        ip=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")
        print_warning "Could not get public IP, using local IP: $ip"
    fi

    echo "$ip"
}

generate_encryption_key() {
    if command -v node &> /dev/null; then
        node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" 2>/dev/null || echo ""
    elif command -v openssl &> /dev/null; then
        openssl rand -base64 32 2>/dev/null || echo ""
    else
        print_error "Neither node nor openssl found. Cannot generate encryption key."
        exit 1
    fi
}

read_env_value() {
    local key="$1"
    local env_file="$2"
    if [ -f "$env_file" ] && [ -s "$env_file" ]; then
        grep -E "^[[:space:]]*${key}[[:space:]]*=" "$env_file" 2>/dev/null | head -n 1 | cut -d '=' -f2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
    else
        echo ""
    fi
}

prompt_with_default() {
    local var_name="$1"
    local prompt_text="$2"
    local script_default_value="$3"
    local is_secret="${4:-false}"
    local env_file="$5"

    local current_value=""
    local display_value=""
    local default_value="$script_default_value"

    if [ -f "$env_file" ] && [ -s "$env_file" ]; then
        current_value=$(read_env_value "$var_name" "$env_file")
    fi

    if [ -n "$current_value" ] && [ "$current_value" != "\"\"" ] && [ "$current_value" != "''" ]; then
        default_value="$current_value"
    fi

    if [ "$is_secret" = "true" ] && [ -n "$default_value" ]; then
        display_value="[Use existing value]"
    elif [ -n "$default_value" ]; then
        display_value="[$default_value]"
    else
        display_value="[]"
    fi

    exec 3>/dev/tty
    printf "%s %s: " "$prompt_text" "$display_value" >&3

    local user_input
    if [ "$is_secret" = "true" ]; then
        user_input=$(head -1 < /dev/tty)
        if [ -z "$user_input" ] && [ -n "$current_value" ]; then
            echo "$current_value"
        elif [ -z "$user_input" ] && [ -n "$script_default_value" ]; then
            echo "$script_default_value"
        else
            echo "$user_input"
        fi
    else
        user_input=$(head -1 < /dev/tty)
        if [ -z "$user_input" ]; then
            echo "$default_value"
        else
            echo "$user_input"
        fi
    fi
    exec 3>&-
}

add_cron_job() {
    local project_root="$1"
    local backup_script_path="$project_root/scripts/backup-db.sh"

    local cron_command="0 0 */3 * * /bin/bash $backup_script_path"
    local temp_crontab=$(mktemp)

    if ! command -v crontab -l >/dev/null 2>&1; then
        print_message "Installing cron..."
        apt install cron -y
    fi

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
    crontab -l 2>/dev/null | grep -E "(backup|$project_root)" || echo "  (no backup-related cron jobs found)"
}

install_nodejs() {
    if ! command -v node >/dev/null 2>&1; then
        if ! command -v curl >/dev/null 2>&1; then
            apt-get update -y
            apt-get install -y curl
        fi

        print_message "Installing NodeJS and yarn..."
        curl -fsSL https://raw.githubusercontent.com/tj/n/master/bin/n | bash -s lts
        hash -r
    fi

    node -v > /dev/null 2>&1 && npm -v > /dev/null 2>&1

    if ! command -v yarn >/dev/null 2>&1; then
        npm install -g yarn > /dev/null 2>&1
    fi

    yarn -v > /dev/null 2>&1
}

main() {
    PROJECT_ROOT=$(get_project_root)
    PANEL_DIR="$PROJECT_ROOT/panel"

    print_message "Project root: $PROJECT_ROOT"
    print_message "Panel directory: $PANEL_DIR"

    local original_dir=$(pwd)

    if [ ! -d "$PANEL_DIR" ]; then
        print_message "Creating panel directory..."
        mkdir -p "$PANEL_DIR"
    fi

    ENV_FILE="$PANEL_DIR/.env"

    install_nodejs

    print_message "Starting deployment of AmneziaVPN Panel"

    cd "$PANEL_DIR" || {
        print_error "Failed to change directory to $PANEL_DIR"
        exit 1
    }

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
            -subj "/CN=amnezia-panel.local" 2>/dev/null || {
            print_error "Failed to generate SSL certificates"
            exit 1
        }

        print_message "SSL certificates generated successfully"
    else
        print_message "SSL certificates already exist"
    fi

    print_message "Loading default values..."

    PUBLIC_IP=$(get_public_ip)

    print_message "Configuring environment variables (press Enter to use default value):"
    echo "================================================"

    if [ ! -f "$ENV_FILE" ]; then
        print_message "No .env file found, will create new one"
    else
        if [ ! -s "$ENV_FILE" ]; then
            print_message "Found empty .env file, will recreate it"
        else
            print_message "Found existing .env file at $ENV_FILE"
        fi
    fi

    NEXT_PUBLIC_VPN_NAME=$(prompt_with_default "NEXT_PUBLIC_VPN_NAME" "VPN Service Name" "AmneziaVPN" false "$ENV_FILE")

    NEXT_PUBLIC_USES_TELEGRAM_BOT=$(prompt_with_default "NEXT_PUBLIC_USES_TELEGRAM_BOT" "Use Telegram Bot (true/false)" "true" false "$ENV_FILE")

    DB_USER=$(prompt_with_default "DB_USER" "Database username" "username" false "$ENV_FILE")

    DB_PASSWORD=$(prompt_with_default "DB_PASSWORD" "Database password" "password" true "$ENV_FILE")

    DB_NAME=$(prompt_with_default "DB_NAME" "Database name" "panel" false "$ENV_FILE")

    DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}"

    AMNEZIA_API_HOST=$(prompt_with_default "AMNEZIA_API_HOST" "Amnezia API Host" "$PUBLIC_IP" false "$ENV_FILE")

    AMNEZIA_API_PORT=$(prompt_with_default "AMNEZIA_API_PORT" "Amnezia API Port" "80" false "$ENV_FILE")

    AMNEZIA_API_KEY=$(prompt_with_default "AMNEZIA_API_KEY" "Amnezia API Key" "" true "$ENV_FILE")

    TELEGRAM_BOT_TOKEN=$(prompt_with_default "TELEGRAM_BOT_TOKEN" "Telegram Bot Token (optional, press Enter for none)" "" true "$ENV_FILE")

    if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
        NEXT_PUBLIC_USES_TELEGRAM_BOT="false"
    else
        NEXT_PUBLIC_USES_TELEGRAM_BOT="true"
    fi

    ENCRYPTION_KEY=$(read_env_value "ENCRYPTION_KEY" "$ENV_FILE")
    if [ -z "$ENCRYPTION_KEY" ]; then
        print_message "Generating new ENCRYPTION_KEY..."
        ENCRYPTION_KEY=$(generate_encryption_key)
        if [ -n "$ENCRYPTION_KEY" ]; then
            print_message "ENCRYPTION_KEY generated successfully"
        else
            print_error "Failed to generate ENCRYPTION_KEY"
            exit 1
        fi
    else
        print_message "Using existing ENCRYPTION_KEY from .env"
    fi

    NODE_ENV=$(prompt_with_default "NODE_ENV" "Node environment (development/test/production)" "production" false "$ENV_FILE")

    print_message "Creating/updating .env file at $ENV_FILE..."

    ENV_TEMP=$(mktemp)

    cat > "$ENV_TEMP" << EOF
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

    mv "$ENV_TEMP" "$ENV_FILE"

    chmod 600 "$ENV_FILE"

    print_message ".env file created/updated successfully at $ENV_FILE"

    print_message "Installing project dependencies..."
    yarn

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

    docker compose down || true

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

    cd "$original_dir"

    add_cron_job "$PROJECT_ROOT"

    cd "$PANEL_DIR"

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