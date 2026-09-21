"""
OptiCut Pro — Module de gestion du cycle de vie du serveur (Heartbeat & Watchdog).

Ce module garantit l'extinction propre et automatique du serveur backend FastAPI :
1. Watchdog d'inactivité : extinction après 10s sans heartbeat.
2. Extinction accélérée : extinction en ~1.5s via shutdown-intent (pagehide).
3. Tolérance au rechargement (F5) : un heartbeat reçu annule immédiatement l'intention d'arrêt.
4. Sauvegarde automatique garantie avant l'extinction.
"""
from __future__ import annotations

import os
import signal
import sys
import threading
import time
from pathlib import Path

# Configuration des délais (en secondes)
HEARTBEAT_TIMEOUT: float = 10.0       # Délai sans ping entraînant l'extinction
SHUTDOWN_INTENT_TIMEOUT: float = 1.5  # Délai d'attente après pagehide pour confirmer la fermeture (vs F5)
CHECK_INTERVAL: float = 1.0           # Intervalle de vérification de la boucle watchdog

# État interne
last_heartbeat: float = time.time()
shutdown_requested_at: float | None = None
_is_shutting_down: bool = False
_watchdog_started: bool = False
_backup_done: bool = False
_lock = threading.Lock()


def is_backup_done() -> bool:
    """Indique si la sauvegarde pré-extinction a déjà été réalisée."""
    return _backup_done


def record_heartbeat() -> dict[str, str]:
    """Enregistre un ping heartbeat émis par le frontend."""
    global last_heartbeat, shutdown_requested_at
    with _lock:
        last_heartbeat = time.time()
        if shutdown_requested_at is not None:
            # Un heartbeat après un shutdown-intent indique un rechargement de page (F5)
            shutdown_requested_at = None
            print("[LIFECYCLE] Heartbeat reçu : intention d'arrêt annulée (rechargement de page détecté).")
    return {"status": "alive"}


def record_shutdown_intent() -> dict[str, str]:
    """Enregistre une intention d'extinction émise lors de l'événement pagehide."""
    global shutdown_requested_at
    with _lock:
        shutdown_requested_at = time.time()
        print(f"[LIFECYCLE] Intention d'arrêt reçue (pagehide). En attente de confirmation ({SHUTDOWN_INTENT_TIMEOUT}s)...")
    return {"status": "ok"}


def trigger_server_shutdown(reason: str) -> None:
    """Déclenche la sauvegarde automatique puis la terminaison propre du serveur."""
    global _is_shutting_down
    with _lock:
        if _is_shutting_down:
            return
        _is_shutting_down = True

    print(f"\n[LIFECYCLE] >>> Extinction automatique du backend : {reason} <<<")

    # 1. Déclenchement impératif de la sauvegarde automatique avant fermeture
    global _backup_done
    try:
        # Sécurité sys.path si appelé hors du flux principal
        services_dir = Path(__file__).resolve().parents[2] / "Services"
        if str(services_dir) not in sys.path:
            sys.path.append(str(services_dir))

        from IA_Engine.backup import get_backup_manager  # type: ignore
        manager = get_backup_manager()
        backup_file = manager.create_backup(
            is_auto=True,
            notes=f"Sauvegarde automatique avant extinction ({reason})"
        )
        _backup_done = True
        print(f"[LIFECYCLE] [OK] Sauvegarde pre-extinction reussie : {backup_file}")
    except Exception as e:
        print(f"[LIFECYCLE] [ERREUR] Erreur lors de la sauvegarde pre-extinction : {e}")

    # 2. Envoi du signal d'extinction à Uvicorn (SIGINT propre)
    try:
        signal.raise_signal(signal.SIGINT)
    except Exception:
        try:
            import _thread
            _thread.interrupt_main()
        except Exception:
            os.kill(os.getpid(), signal.SIGINT)

    # 3. Filet de sécurité : si le serveur ne s'est pas arrêté sous 4 secondes, forcer la sortie
    def _force_exit():
        time.sleep(4.0)
        print("[LIFECYCLE] Forçage de l'extinction du processus (timeout atteint).")
        os._exit(0)

    threading.Thread(target=_force_exit, daemon=True, name="OptiCut-ForceExit").start()


def watchdog() -> None:
    """Boucle de surveillance exécutée en arrière-plan."""
    print(f"[WATCHDOG] Surveillance active (Inactivité max : {HEARTBEAT_TIMEOUT}s, Confirmation fermeture : {SHUTDOWN_INTENT_TIMEOUT}s)")
    while not _is_shutting_down:
        time.sleep(CHECK_INTERVAL)
        now = time.time()

        with _lock:
            current_shutdown_req = shutdown_requested_at
            current_last_heartbeat = last_heartbeat

        # Cas 1 : Fermeture accélérée via shutdown-intent
        if current_shutdown_req is not None:
            elapsed_since_intent = now - current_shutdown_req
            if elapsed_since_intent >= SHUTDOWN_INTENT_TIMEOUT:
                trigger_server_shutdown(f"fermeture de fenêtre confirmée ({elapsed_since_intent:.1f}s après pagehide)")
                break

        # Cas 2 : Inactivité prolongée sans heartbeat
        elapsed_since_heartbeat = now - current_last_heartbeat
        if elapsed_since_heartbeat > HEARTBEAT_TIMEOUT:
            trigger_server_shutdown(f"inactivité prolongée ({elapsed_since_heartbeat:.1f}s sans heartbeat)")
            break


def start_watchdog() -> None:
    """Démarre le thread de surveillance watchdog."""
    global _watchdog_started, last_heartbeat
    if _watchdog_started:
        return

    if os.getenv("DISABLE_WATCHDOG") == "1":
        print("[WATCHDOG] Surveillance désactivée (variable DISABLE_WATCHDOG=1).")
        return

    last_heartbeat = time.time()
    _watchdog_started = True
    thread = threading.Thread(target=watchdog, daemon=True, name="OptiCut-Watchdog")
    thread.start()
