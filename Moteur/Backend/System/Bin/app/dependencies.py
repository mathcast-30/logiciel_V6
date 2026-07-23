from fastapi import Header, HTTPException, Depends
from .session_store import sessions

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant ou invalide")
    
    token = authorization.split(" ")[1]
    user = sessions.get(token)
    if not user:
        raise HTTPException(status_code=401, detail="Session expirée ou invalide")
    
    return user

def require_admin(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Droits insuffisants")
    return user

def require_chef_or_admin(user=Depends(get_current_user)):
    if user["role"] not in ["chef", "admin"]:
        raise HTTPException(status_code=403, detail="Droits insuffisants")
    return user
