"""Authentication and authorization dependencies."""
from fastapi import Header, HTTPException, Depends
from sqlalchemy import text
import jwt

from .core.security import decode_access_token
from .db.database import engine
from .session_store import sessions


def get_current_user(authorization: str = Header(None)):
    """
    Validate incoming Bearer JWT token and fetch active user.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Token manquant ou invalide",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = authorization.split(" ", 1)[1].strip()
    
    # 1. First try decoding as JWT token
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub") or payload.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token invalide (identifiant manquant)")
            
        with engine.begin() as conn:
            row = conn.execute(
                text("SELECT id, nom, prenom, identifiant, role, actif, must_change_pwd, avatar_color FROM users WHERE id = :id"),
                {"id": int(user_id)}
            ).fetchone()
            
            if not row:
                raise HTTPException(status_code=401, detail="Utilisateur inexistant")
                
            user = dict(row._mapping)
            if not user.get("actif", True):
                raise HTTPException(status_code=403, detail="Compte utilisateur désactivé")
                
            user["must_change_pwd"] = bool(user.get("must_change_pwd", False))
            return user
            
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expirée, veuillez vous reconnecter")
    except jwt.InvalidTokenError:
        # Fallback to in-memory session store (backward compatibility with legacy sessions)
        user = sessions.get(token)
        if user:
            return user
        raise HTTPException(status_code=401, detail="Token invalide ou session inexistante")


def require_admin(user=Depends(get_current_user)):
    """Ensure current user has admin role."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Droits administrateur requis")
    return user


def require_chef_or_admin(user=Depends(get_current_user)):
    """Ensure current user has chef or admin role."""
    if user.get("role") not in ["chef", "admin"]:
        raise HTTPException(status_code=403, detail="Droits chef d'atelier ou administrateur requis")
    return user
