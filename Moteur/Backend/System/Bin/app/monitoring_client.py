import socket
import json
import threading
import queue
import time
from datetime import datetime
import traceback

# Configuration
LOG_SERVER_HOST = '127.0.0.1'
LOG_SERVER_PORT = 9999

class LogClient:
    _instance = None
    _queue = queue.Queue()
    _stop_event = threading.Event()
    _worker_thread = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LogClient, cls).__new__(cls)
            cls._start_worker()
        return cls._instance

    @classmethod
    def _start_worker(cls):
        if cls._worker_thread is None or not cls._worker_thread.is_alive():
            cls._worker_thread = threading.Thread(target=cls._worker_loop, daemon=True)
            cls._worker_thread.start()

    @classmethod
    def _worker_loop(cls):
        while not cls._stop_event.is_set():
            try:
                # Get log from queue
                log_entry = cls._queue.get(timeout=1) # timeout to allow checking stop_event
                
                # Send to server
                cls._send_to_server(log_entry)
                
                cls._queue.task_done()
            except queue.Empty:
                continue
            except Exception:
                # Silent fail to avoid crashing the worker
                pass

    @classmethod
    def _send_to_server(cls, data):
        """Sends data to the log server via TCP."""
        s = None
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.5) # Fast timeout
            s.connect((LOG_SERVER_HOST, LOG_SERVER_PORT))
            
            # Serialize
            message = json.dumps(data) + "\n" # Newline delimiter
            s.sendall(message.encode('utf-8'))
            
        except (ConnectionRefusedError, socket.timeout, OSError):
            # Log server is down or unreachable. 
            # We silently drop the log to not block the app.
            pass 
        finally:
            if s:
                s.close()

    @staticmethod
    def log(level: str, module: str, function: str, payload: str, error: Exception = None):
        """
        Enqueues a log message to be sent to the external log server.
        Non-blocking.
        """
        # Ensure worker is running (lazy start)
        LogClient._start_worker()

        # Build payload
        log_data = {
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "level": level,
            "module": module,
            "function": function,
            "payload": str(payload)
        }

        if error:
             log_data["stack"] = "".join(traceback.format_exception(type(error), error, error.__traceback__))

        try:
            LogClient._queue.put(log_data, block=False)
        except queue.Full:
            pass # Drop logs if queue is full to prevent memory leak

# Helper functions for easy import
def log_info(module, function, message):
    LogClient.log("INFO", module, function, message)

def log_error(module, function, message, error=None):
    LogClient.log("ERROR", module, function, message, error)

def log_debug(module, function, message):
    LogClient.log("DEBUG", module, function, message)

def log_warning(module, function, message):
    LogClient.log("WARNING", module, function, message)
