from __future__ import annotations
import atexit
import signal
import sys
from types import FrameType
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from Moteur.Backend.Services.IA_Engine.backup import BackupManager # type: ignore

# Tentative d'import robuste pour éviter les erreurs de linter et d'exécution
try:
    # Essai d'import absolu (cas standard depuis la racine)
    from Moteur.Backend.Services.IA_Engine.backup import get_backup_manager # type: ignore
except ImportError:
    try:
        # Essai d'import relatif (cas module)
        from .backup import get_backup_manager # type: ignore
    except ImportError:
        # Fallback pour éviter le crash à l'import (sera géré au runtime)
        get_backup_manager = None # type: ignore

# Initialisation par défaut
is_backup_available = True

class AutoBackupOnShutdown:
    """
    Gestionnaire de sauvegarde automatique à la fermeture du logiciel.
    """
    
    backup_triggered: bool
    
    def __init__(self) -> None:
        self.backup_triggered = False
        self._register_shutdown_handlers()
    
    def _register_shutdown_handlers(self) -> None:
        """Enregistre les handlers pour déclencher la sauvegarde à la fermeture"""
        if not is_backup_available:
            return
        
        # Handler pour exit() normal
        atexit.register(self._perform_shutdown_backup)
        
        # Handlers pour signaux
        try:
            signal.signal(signal.SIGTERM, self._signal_handler)
            signal.signal(signal.SIGINT, self._signal_handler)
        except (AttributeError, ValueError):
            pass
    
    def _signal_handler(self, signum: int, _frame: Optional[FrameType]) -> None:
        """Handler pour les signaux de terminaison"""
        print(f"\n[SHUTDOWN] Signal reçu ({signum}). Sauvegarde en cours...")
        self._perform_shutdown_backup()
        sys.exit(0)
    
    def _perform_shutdown_backup(self) -> None:
        """Effectue la sauvegarde automatique à la fermeture"""
        # Éviter les doublons si appelé plusieurs fois
        if self.backup_triggered or not is_backup_available:
            return
        
        self.backup_triggered = True
        
        if get_backup_manager is None:
            return

        try:
            print("[SHUTDOWN] Sauvegarde automatique avant fermeture...")
            manager = get_backup_manager()
            filename = manager.create_backup(
                is_auto=True, 
                notes="Sauvegarde automatique lors de la fermeture du logiciel"
            )
            print(f"[SHUTDOWN] ✓ Sauvegarde terminée: {filename}")
        except Exception as e:
            print(f"[SHUTDOWN] ✗ Échec de la sauvegarde automatique: {e}")

# Instance globale
_auto_backup = AutoBackupOnShutdown()

def trigger_manual_shutdown_backup() -> Optional[str]:
    """Force une sauvegarde manuelle"""
    if not is_backup_available or get_backup_manager is None:
        print("[ERROR] Module de sauvegarde non disponible")
        return None
    
    try:
        manager = get_backup_manager()
        filename = manager.create_backup(
            is_auto=False, 
            notes="Sauvegarde manuelle déclenchée par l'utilisateur"
        )
        print(f"[BACKUP] ✓ Sauvegarde manuelle créée: {filename}")
        return filename
    except Exception as e:
        print(f"[BACKUP] ✗ Échec: {e}")
        # On relance l'exception pour que l'appelant sache qu'il y a eu erreur
        raise e
