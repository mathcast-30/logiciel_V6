from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from app.db.database import get_db

router = APIRouter()


class TarificationUpdate(BaseModel):
    taux_horaire: Optional[float] = None
    marge_defaut_pct: Optional[float] = None
    frais_generaux_pct: Optional[float] = None


@router.get("/tarification")
def get_tarification(db: Session = Depends(get_db)):
    """Retourne la configuration tarifaire globale (singleton)."""
    result = db.execute(
        text("SELECT taux_horaire, marge_defaut_pct, frais_generaux_pct FROM tarification_globale WHERE id = 1")
    ).fetchone()

    if result is None:
        # Initialisation de secours si la table est vide
        db.execute(text("INSERT OR IGNORE INTO tarification_globale (id) VALUES (1)"))
        db.commit()
        return {"taux_horaire": 35.0, "marge_defaut_pct": 30.0, "frais_generaux_pct": 10.0}

    return {
        "taux_horaire": result[0] if result[0] is not None else 35.0,
        "marge_defaut_pct": result[1] if result[1] is not None else 30.0,
        "frais_generaux_pct": result[2] if result[2] is not None else 10.0,
    }


@router.patch("/tarification")
def update_tarification(data: TarificationUpdate, db: Session = Depends(get_db)):
    """Met à jour les paramètres tarifaires globaux."""
    fields = []
    params: dict = {"id": 1}

    if data.taux_horaire is not None:
        fields.append("taux_horaire = :taux_horaire")
        params["taux_horaire"] = data.taux_horaire
    if data.marge_defaut_pct is not None:
        fields.append("marge_defaut_pct = :marge_defaut_pct")
        params["marge_defaut_pct"] = data.marge_defaut_pct
    if data.frais_generaux_pct is not None:
        fields.append("frais_generaux_pct = :frais_generaux_pct")
        params["frais_generaux_pct"] = data.frais_generaux_pct

    if not fields:
        return {"message": "Aucun champ à mettre à jour"}

    db.execute(
        text(f"UPDATE tarification_globale SET {', '.join(fields)} WHERE id = :id"),
        params
    )
    db.commit()
    return {"message": "Tarification mise à jour", **{k: v for k, v in params.items() if k != "id"}}
