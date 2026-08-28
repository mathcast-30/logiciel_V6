"""Authentication router for login, logout, setup, and password management."""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
import datetime
from sqlalchemy import text
from typing import Optional

from ..db.database import engine
from ..session_store import sessions
from ..dependencies import get_current_user
from ..core.security import create_access_token, verify_password, get_password_hash, decode_access_token

router = APIRouter()


class LoginRequest(BaseModel):
    identifiant: str
    password: str


class SetupRequest(BaseModel):
    nom: str
    prenom: str
    identifiant: str
    password: str
    entreprise: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.get("/auth/setup-required")
def setup_required():
    with engine.begin() as conn:
        try:
            res = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
            return {"required": res == 0}
        except Exception:
            return {"required": True}


@router.post("/auth/setup")
def setup_admin(data: SetupRequest):
    with engine.begin() as conn:
        res = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
        if res and res > 0:
            raise HTTPException(status_code=403, detail="Un administrateur existe déjà")
            
        hashed_pwd = get_password_hash(data.password)
        conn.execute(text("""
            INSERT INTO users (nom, prenom, identifiant, password_hash, role, actif, must_change_pwd)
            VALUES (:nom, :prenom, :identifiant, :password_hash, 'admin', 1, 0)
        """), {
            "nom": data.nom,
            "prenom": data.prenom,
            "identifiant": data.identifiant,
            "password_hash": hashed_pwd
        })
        return {"success": True}


@router.post("/auth/login")
def login(data: LoginRequest):
    with engine.begin() as conn:
        result = conn.execute(
            text("SELECT id, nom, prenom, identifiant, role, actif, must_change_pwd, avatar_color, password_hash FROM users WHERE identifiant = :identifiant"),
            {"identifiant": data.identifiant}
        ).fetchone()
        
        if not result:
            raise HTTPException(status_code=401, detail="identifiants_incorrects")
            
        user_dict = dict(result._mapping)
        
        if not user_dict.get("actif", True):
            raise HTTPException(status_code=403, detail="compte_desactive")
            
        if not verify_password(data.password, user_dict["password_hash"]):
            raise HTTPException(status_code=401, detail="identifiants_incorrects")
            
        # Update last connection timestamp
        conn.execute(text("UPDATE users SET derniere_connexion = CURRENT_TIMESTAMP WHERE id = :id"), {"id": user_dict["id"]})
        
        user_info = {
            "id": user_dict["id"],
            "nom": user_dict["nom"],
            "prenom": user_dict["prenom"],
            "identifiant": user_dict["identifiant"],
            "role": user_dict["role"],
            "must_change_pwd": bool(user_dict["must_change_pwd"]),
            "avatar_color": user_dict.get("avatar_color", "#6C63FF")
        }
        
        # Generate JWT Token (8h expiration)
        token = create_access_token({
            "sub": str(user_dict["id"]),
            "identifiant": user_dict["identifiant"],
            "role": user_dict["role"]
        })
        
        # Store in session store for legacy fallback
        sessions[token] = user_info
        
        return {
            "token": token,
            "access_token": token,
            "token_type": "bearer",
            "user": user_info
        }


@router.post("/auth/refresh")
def refresh_token(user=Depends(get_current_user)):
    """Generate a fresh JWT token for authenticated user."""
    new_token = create_access_token({
        "sub": str(user["id"]),
        "identifiant": user["identifiant"],
        "role": user["role"]
    })
    sessions[new_token] = user
    return {
        "token": new_token,
        "access_token": new_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/auth/logout")
def logout(user=Depends(get_current_user), authorization: str = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if token in sessions:
            del sessions[token]
    return {"success": True}


@router.get("/auth/me")
def get_me(user=Depends(get_current_user)):
    return user


@router.post("/auth/change-password")
def change_password(data: ChangePasswordRequest, user=Depends(get_current_user)):
    with engine.begin() as conn:
        result = conn.execute(text("SELECT password_hash FROM users WHERE id = :id"), {"id": user["id"]}).fetchone()
        if not result or not verify_password(data.current_password, result[0]):
            raise HTTPException(status_code=400, detail="Ancien mot de passe incorrect")
            
        hashed_pwd = get_password_hash(data.new_password)
        conn.execute(text("""
            UPDATE users 
            SET password_hash = :password_hash, must_change_pwd = 0
            WHERE id = :id
        """), {"password_hash": hashed_pwd, "id": user["id"]})
        
        # Update in-memory session if present
        for t, session_user in sessions.items():
            if session_user.get("id") == user["id"]:
                session_user["must_change_pwd"] = False
                
    return {"success": True}
