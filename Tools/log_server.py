import socket
import json
import datetime
import os
import sys
import threading

# Configuration
HOST = '0.0.0.0'  # Listen on all interfaces
PORT = 9999       # Port for the log server

# ANSI Color Codes for "Pretty Print"
class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    GRAY = "\033[90m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"
    WHITE = "\033[97m"

# Icons for log levels
ICONS = {
    "DEBUG": "🐞",
    "INFO": "ℹ️ ",
    "WARNING": "⚠️ ",
    "ERROR": "❌",
    "CRITICAL": "🔥"
}

# Color mapping for log levels
LEVEL_COLORS = {
    "DEBUG": Colors.GRAY,
    "INFO": Colors.BLUE,
    "WARNING": Colors.YELLOW,
    "ERROR": Colors.RED,
    "CRITICAL": Colors.MAGENTA + Colors.BOLD
}

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    print(f"{Colors.BOLD}{Colors.CYAN}============================================================")
    print(f"      📡  OPTICUT PRO - LOG SERVER (SIDECAR)  📡")
    print(f"============================================================{Colors.RESET}")
    print(f"{Colors.GRAY}Listening on {HOST}:{PORT}...{Colors.RESET}\n")

def handle_client(conn, addr):
    """Handles a single client connection."""
    with conn:
        buffer = ""
        while True:
            try:
                data = conn.recv(4096)
                if not data:
                    break
                
                buffer += data.decode('utf-8')
                
                # Split by newline in case multiple logs come in one packet
                while "\n" in buffer:
                    message, buffer = buffer.split("\n", 1)
                    process_log_message(message)

            except ConnectionResetError:
                break
            except Exception as e:
                print(f"{Colors.RED}[SYSTEM ERROR] Connection processing failed: {e}{Colors.RESET}")
                break

def process_log_message(json_str):
    """Parses and prints the log message."""
    try:
        if not json_str.strip():
            return
            
        data = json.loads(json_str)
        
        # Extract fields with defaults
        timestamp = data.get("timestamp", datetime.datetime.now().strftime("%H:%M:%S"))
        level = data.get("level", "INFO").upper()
        module = data.get("module", "UNKNOWN")
        function = data.get("function", "?")
        payload = data.get("payload", "")

        # Formatting
        icon = ICONS.get(level, "•")
        color = LEVEL_COLORS.get(level, Colors.WHITE)
        
        # Module width fixing for alignment (e.g., 20 chars)
        module_str = f"[{module}]".ljust(20)
        
        # Construct the final line
        # [HH:MM:SS] [LEVEL] [Module] : Message
        time_part = f"{Colors.GRAY}[{timestamp}]{Colors.RESET}"
        level_part = f"{color}[{level}]{Colors.RESET}"
        module_part = f"{Colors.CYAN}{module_str}{Colors.RESET}"
        
        print(f"{time_part} {icon} {level_part} {module_part} : {payload}")
        
        # If there's extra data or stack trace, print it indented
        if "stack" in data and data["stack"]:
             print(f"{color}      └── {data['stack']}{Colors.RESET}")

    except json.JSONDecodeError:
        print(f"{Colors.RED}[RAW] {json_str}{Colors.RESET}")
    except Exception as e:
        print(f"{Colors.RED}[PARSING ERROR] {e} | Data: {json_str}{Colors.RESET}")

def start_server():
    """Starts the TCP server."""
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    try:
        server_socket.bind((HOST, PORT))
        server_socket.listen(5)
        
        clear_screen()
        print_header()
        
        while True:
            conn, addr = server_socket.accept()
            # Handle each client in a separate thread to not block
            client_thread = threading.Thread(target=handle_client, args=(conn, addr), daemon=True)
            client_thread.start()
            
    except OSError as e:
         print(f"{Colors.RED}[CRITICAL] Could not bind to port {PORT}. Is the server already running?{Colors.RESET}")
         print(f"Error: {e}")
         input("Press Enter to exit...")
         sys.exit(1)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}[STOPPING] Server shutting down...{Colors.RESET}")
        sys.exit(0)

if __name__ == "__main__":
    # Enable ANSI escape codes in Windows CMD
    os.system("") 
    start_server()
