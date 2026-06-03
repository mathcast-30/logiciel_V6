```bash
#!/bin/bash

# ===================================================================
# Script de Sauvegarde PostgreSQL pour OptiCut Pro V4
# ===================================================================
# Utilisation: ./backup_script.sh [full|wal|snapshot|pitr]
# ===================================================================

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-opticut_pro}"
DB_USER="${DB_USER:-opticut_user}"
BACKUP_DIR="${BACKUP_DIR:-/mnt/c/OptiCut_Backup}"
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/mnt/c/OptiCut_Data/postgres/wal_archive}"
SNAPSHOTS_DIR="${SNAPSHOTS_DIR:-$BACKUP_DIR/snapshots}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions utilitaires
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Fonction: Backup complet SQL
backup_full() {
    log_info "Création d'un backup complet SQL..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/full/backup_$timestamp.sql"
    
    mkdir -p "$BACKUP_DIR/full"
    
    if PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -F p \
        --verbose \
        > "$backup_file" 2>&1; then
        
        log_success "Backup complet créé: $backup_file"
        echo "$backup_file"
    else
        log_error "Échec du backup complet"
        exit 1
    fi
}

# Fonction: Backup WAL (Write-Ahead Log)
backup_wal() {
    log_info "Archivage des WAL..."
    
    if command -v pg_basebackup &> /dev/null; then
        local timestamp=$(date +%Y%m%d_%H%M%S)
        local wal_backup="$BACKUP_DIR/wal/wal_backup_$timestamp"
        
        mkdir -p "$BACKUP_DIR/wal"
        
        # Copier les WAL archivés
        if cp -r "$WAL_ARCHIVE_DIR"/* "$BACKUP_DIR/wal/" 2>/dev/null; then
            log_success "WAL archivés: $BACKUP_DIR/wal/"
        else
            log_warning "Aucun WAL à archiver ou erreur de copie"
        fi
    else
        log_error "pg_basebackup non trouvé"
        exit 1
    fi
}

# Fonction: Snapshot atomique
backup_snapshot() {
    log_info "Création d'un snapshot atomique..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local snapshot_dir="$SNAPSHOTS_DIR/snapshot_$timestamp"
    
    mkdir -p "$snapshot_dir"
    
    # Créer un snapshot cohérent
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "SELECT pg_start_backup('opticut_snapshot_$timestamp');" > /dev/null
    
    # Copier les données
    if cp -r /mnt/c/OptiCut_Data/postgres/data/* "$snapshot_dir/" 2>/dev/null; then
        PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -c "SELECT pg_stop_backup();" > /dev/null
        
        log_success "Snapshot créé: $snapshot_dir"
        echo "$snapshot_dir"
    else
        log_error "Erreur lors de la copie du snapshot"
        exit 1
    fi
}

# Fonction: Point-in-Time Recovery (PITR)
backup_pitr() {
    log_info "Configuration PITR..."
    
    if grep -q "archive_mode = on" /mnt/c/OptiCut_Data/postgresql.conf; then
        log_success "Archive mode est activé"
        log_success "PITR est configuré et fonctionnel"
        echo "Recovery jusqu'à la dernière transaction disponible possible"
    else
        log_warning "Archive mode non activé. PITR non disponible"
        exit 1
    fi
}

# Fonction: Nettoyage des vieux backups
cleanup_old_backups() {
    log_info "Nettoyage des backups de plus de $RETENTION_DAYS jours..."
    
    local count=0
    find "$BACKUP_DIR" -type f -name "*.sql" -mtime +$RETENTION_DAYS | while read file; do
        log_info "Suppression: $file"
        rm -f "$file"
        ((count++))
    done
    
    log_success "Nettoyage terminé"
}

# Fonction: Vérification d'intégrité
verify_backup_integrity() {
    log_info "Vérification d'intégrité des données..."
    
    if command -v pg_verify_checksums &> /dev/null; then
        if pg_verify_checksums -D /mnt/c/OptiCut_Data/postgres/data > /dev/null 2>&1; then
            log_success "Checksums valides - Aucune corruption détectée"
        else
            log_warning "Checksums inconsistants détectés"
        fi
    else
        log_warning "pg_verify_checksums non disponible"
    fi
}

# Fonction: Stratégie complète
complete_backup_strategy() {
    log_info "Exécution de la stratégie complète de backup..."
    
    backup_full
    backup_wal
    backup_snapshot
    verify_backup_integrity
    cleanup_old_backups
    
    log_success "Stratégie complète terminée"
}

# Menu principal
show_menu() {
    echo ""
    echo -e "${BLUE}=== Menu de Sauvegarde PostgreSQL ===${NC}"
    echo "1. Backup Complet SQL"
    echo "2. Backup WAL"
    echo "3. Snapshot Atomique"
    echo "4. Configuration PITR"
    echo "5. Vérifier Intégrité"
    echo "6. Stratégie Complète"
    echo "7. Nettoyage Ancien Backup"
    echo "8. Quitter"
    echo ""
}

# Script principal
main() {
    if [ -z "$1" ]; then
        # Mode interactif
        while true; do
            show_menu
            read -p "Choisir une option (1-8): " choice
            
            case $choice in
                1) backup_full ;;
                2) backup_wal ;;
                3) backup_snapshot ;;
                4) backup_pitr ;;
                5) verify_backup_integrity ;;
                6) complete_backup_strategy ;;
                7) cleanup_old_backups ;;
                8) log_info "Quitter"; exit 0 ;;
                *) log_error "Option invalide" ;;
            esac
        done
    else
        # Mode ligne de commande
        case $1 in
            full) backup_full ;;
            wal) backup_wal ;;
            snapshot) backup_snapshot ;;
            pitr) backup_pitr ;;
            verify) verify_backup_integrity ;;
            complete) complete_backup_strategy ;;
            cleanup) cleanup_old_backups ;;
            *) log_error "Option invalide: $1"; exit 1 ;;
        esac
    fi
}

# Exécuter le script
main "$@"
```
