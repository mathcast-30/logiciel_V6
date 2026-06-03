
import logging
import sys
from IA_Engine.config import get_settings

def setup_logging():
    """Configure the logging system for 'Black Box' observability."""
    settings = get_settings()
    
    # Determine log level based on DEBUG setting
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    
    # Create formatter
    # detailed format: Time - Level - LoggerName - Message
    formatter = logging.Formatter(
        fmt="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Console Handler (Standard Output)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    
    # Root Logger Configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers to avoid duplicates if re-initialized
    if root_logger.hasHandlers():
        root_logger.handlers.clear()
        
    root_logger.addHandler(console_handler)
    
    # Silence some noisy libraries unless in specific debug scenarios if needed
    # logging.getLogger("multipart").setLevel(logging.WARNING) 
    
    logging.info(f"Logging initialized. Level: {logging.getLevelName(log_level)}")
    if settings.DEBUG:
        logging.warning("CAUTION: DEBUG MODE IS ENABLED. SENSITIVE DATA MAY BE LOGGED.")
