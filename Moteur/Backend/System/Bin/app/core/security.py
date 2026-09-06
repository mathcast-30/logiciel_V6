"""Security and JWT token management."""
from __future__ import annotations
import os
import datetime
from typing import Optional, Any, Dict
import jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

from .config import ensure_env_file

# Charger le fichier .env si non déjà chargé dans l'environnement
_env_path = ensure_env_file()
load_dotenv(dotenv_path=_env_path)
load_dotenv()  # Charge aussi le .env à la racine s'il existe

_secret_key = os.getenv("JWT_SECRET_KEY")
if not _secret_key:
    raise ValueError(
        "❌ ERREUR CRITIQUE : La variable JWT_SECRET_KEY n'est pas définie. "
        "Veuillez configurer un .env avec une clé sécurisée (ex: python -c \"import secrets; print(secrets.token_hex(32))\")."
    )

SECRET_KEY: str = _secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "8"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password."""
    return bool(pwd_context.verify(plain_password, hashed_password))


def get_password_hash(password: str) -> str:
    """Generate bcrypt password hash."""
    return str(pwd_context.hash(password))


def create_access_token(data: dict[str, Any], expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    now = datetime.datetime.now(datetime.timezone.utc)
    
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + datetime.timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
        
    to_encode.update({
        "exp": expire,
        "iat": now
    })
    
    encoded_jwt: str = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token."""
    return dict(jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM]))
