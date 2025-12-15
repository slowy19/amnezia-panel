#!/bin/bash

BACKUP_DIR="/root/backups"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup-${TIMESTAMP}.sql"

ENV_FILE=$(find /root /home /opt -name ".env" -type f 2>/dev/null | head -n 1)

if [ -n "$ENV_FILE" ]; then
    source "$ENV_FILE"
else
    echo "Error: .env file not found!"
    exit 1
fi

mkdir -p ${BACKUP_DIR}
docker exec db-amnezia-panel pg_dump -U ${DB_USER} ${DB_NAME} > "${BACKUP_FILE}"
chmod 400 $BACKUP_FILE

BACKUP_COUNT=$(ls -1 ${BACKUP_DIR}/backup-*.sql 2>/dev/null | wc -l)
if [ "${BACKUP_COUNT}" -gt 3 ]; then
    NUM_TO_DELETE=$((${BACKUP_COUNT} - 3))
    ls -1 ${BACKUP_DIR}/backup-*.sql | sort | head -n ${NUM_TO_DELETE} | xargs -r rm --
fi