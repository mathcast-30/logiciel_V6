# Script de sauvegarde pour PostgreSQL

# Variables
DB_NAME=mydb
DB_USER=user
DB_PASSWORD=password
BACKUP_DIR=/path/to/backup

# Créer un backup
pg_dump -U $DB_USER -W $DB_PASSWORD $DB_NAME > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql
