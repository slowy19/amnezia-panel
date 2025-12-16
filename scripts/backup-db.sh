#!/bin/bash

BACKUP_DIR="/root/backups"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup-${TIMESTAMP}.sql"

AMNEZIA_PANEL_DIR=$(find /root /home /opt -type d -name "amnezia-panel" 2>/dev/null | head -n 1)

if [ -n "$AMNEZIA_PANEL_DIR" ]; then
    ENV_FILE="${AMNEZIA_PANEL_DIR}/panel/.env"
    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
    else
        echo "Error: .env file not found in amnezia-panel directory!"
        echo "Directory found: $AMNEZIA_PANEL_DIR"
        exit 1
    fi
else
    echo "Error: amnezia-panel directory not found!"
    exit 1
fi

if [ -z "${DB_USER}" ] || [ -z "${DB_NAME}" ]; then
    echo "Error: DB_USER or DB_NAME not set in .env file!"
    exit 1
fi

mkdir -p ${BACKUP_DIR}

if ! docker exec db-amnezia-panel pg_dump -U ${DB_USER} ${DB_NAME} > "${BACKUP_FILE}"; then
    echo "Error: Failed to create database backup!"
    exit 1
fi

chmod 400 "$BACKUP_FILE"
echo "Backup created: $BACKUP_FILE"

BACKUP_COUNT=$(ls -1 ${BACKUP_DIR}/backup-*.sql 2>/dev/null | wc -l)
if [ "${BACKUP_COUNT}" -gt 3 ]; then
    NUM_TO_DELETE=$((${BACKUP_COUNT} - 3))
    ls -1 ${BACKUP_DIR}/backup-*.sql | sort | head -n ${NUM_TO_DELETE} | xargs -r rm --
    echo "Removed $NUM_TO_DELETE old backup(s)"
fi