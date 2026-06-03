#!/bin/bash

# ===================================================================
# Script de Sauvegarde PostgreSQL pour OptiCut Pro V4 (Bash)
# ===================================================================

# Lire depuis le fichier de configuration si disponible
CONFIG_FILE="$(dirname "$0")/backup_config.sh"
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

# Configuration par défaut
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-opticut_pro}"
DB_USER="${DB_USER:-opticut_user}"

log_info "Sauvegarde PostgreSQL - OptiCut Pro V4"
log_info "Host: $DB_HOST, Port: $DB_PORT, DB: $DB_NAME"
