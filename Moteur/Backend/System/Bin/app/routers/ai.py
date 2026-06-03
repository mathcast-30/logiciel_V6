from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any
from pydantic import BaseModel
from IA_Engine.vision_engine import vision_engine
from IA_Engine.local_llm import llm_service

router = APIRouter()

class VisionRequest(BaseModel):
    image: str # Base64 encoded image
    model: str = "llama3.2-vision"

class ChatRequest(BaseModel):
    message: str
    history: list = []

@router.post("/vision/analyze-sketch")
async def analyze_sketch(request: VisionRequest):
    """
    Analyze a sketch photo and extract project data.
    """
    try:
        result = vision_engine.analyze_sketch(request.image, request.model)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat")
async def ai_chat(request: ChatRequest):
    """
    Standard AI assistant chat.
    """
    try:
        messages = request.history + [{"role": "user", "content": request.message}]
        response = llm_service.chat(messages)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_ai_status():
    """Check if the local AI service is available."""
    is_available = llm_service.check_connection()
    models = llm_service.list_models()
    return {
        "is_available": is_available,
        "active_model": llm_service.model,
        "available_models": models
    }
