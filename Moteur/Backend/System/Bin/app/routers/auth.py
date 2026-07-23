from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import uuid
import datetime
from sqlalchemy import text
from passlib.context import CryptContext

from ..db.database import engine
from ..session_store import sessions
from ..dependencies import get_current_user

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class LoginRequest(BaseModel):
    identifiant: str
    password: str

class SetupRequest(BaseModel):
    nom: str
    prenom: str
    identifiant: str
    password: str
    entreprise: str

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
            # Table users not created yet?
            return {"required": True}

@router.post("/auth/setup")
def setup_admin(data: SetupRequest):
    with engine.begin() as conn:
        res = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
        if res > 0:
            raise HTTPException(status_code=403, detail="Un administrateur existe déjà")
            
        hashed_pwd = pwd_context.hash(data.password)
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
        result = conn.execute(text("SELECT id, nom, prenom, identifiant, role, actif, must_change_pwd, avatar_color, password_hash FROM users WHERE identifiant = :identifiant"), {"identifiant": data.identifiant}).fetchone()
        
        if not result:
            raise HTTPException(status_code=401, detail="identifiants_incorrects")
            
        user_dict = dict(result._mapping)
        
        if not user_dict["actif"]:
            raise HTTPException(status_code=403, detail="compte_desactive")
            
        if not pwd_context.verify(data.password, user_dict["password_hash"]):
            raise HTTPException(status_code=401, detail="identifiants_incorrects")
            
        # Update last connection
        conn.execute(text("UPDATE users SET derniere_connexion = CURRENT_TIMESTAMP WHERE id = :id"), {"id": user_dict["id"]})
        
        token = str(uuid.uuid4())
        
        # Build user object to return and store in session
        user_info = {
            "id": user_dict["id"],
            "nom": user_dict["nom"],
            "prenom": user_dict["prenom"],
            "identifiant": user_dict["identifiant"],
            "role": user_dict["role"],
            "must_change_pwd": bool(user_dict["must_change_pwd"]),
            "avatar_color": user_dict["avatar_color"]
        }
        
        sessions[token] = user_info
        
        return {
            "token": token,
            "user": user_info
        }

@router.post("/auth/logout")
def logout(user=Depends(get_current_user), token_header: str = Depends(lambda req: req.headers.get("Authorization"))):
    if token_header and token_header.startswith("Bearer "):
        token = token_header.split(" ")[1]
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
        if not result or not pwd_context.verify(data.current_password, result[0]):
            raise HTTPException(status_code=400, detail="Ancien mot de passe incorrect")
            
        hashed_pwd = pwd_context.hash(data.new_password)
        conn.execute(text("""
            UPDATE users 
            SET password_hash = :password_hash, must_change_pwd = 0
            WHERE id = :id
        """), {"password_hash": hashed_pwd, "id": user["id"]})
        
        # Update session if needed
        for t, session_user in sessions.items():
            if session_user["id"] == user["id"]:
                session_user["must_change_pwd"] = False
                
    return {"success": True}
