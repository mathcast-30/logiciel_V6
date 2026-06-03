
import os
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    APP_NAME: str = "OptiCut Pro"
    DEBUG: bool = False
    VERSION: str = "4.0.0"
    
    # Database
    DATABASE_URL: str = "sqlite:///./opticut.db"
    
    # Export Settings
    EXPORT_PADDING_MM: float = 40.0
    EXPORT_PNG_TARGET_WIDTH: int = 2480
    EXPORT_PDF_TARGET_WIDTH: int = 3508
    EXPORT_DPI: int = 150
    EXPORT_SMART_VIEWPORT: bool = True
    EXPORT_SMART_VIEWPORT_THRESHOLD: float = 0.40
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
