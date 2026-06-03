import json
import logging
from typing import List, Dict, Any, Optional
from IA_Engine.local_llm import llm_service

logger = logging.getLogger(__name__)

class VisionEngine:
    """
    Industrial Vision Engine for OptiCut Pro.
    Processes hand-drawn sketches to extract cutting lists using multimodal LLMs.
    """

    SYSTEM_PROMPT = """
    Tu es un expert en menuiserie et en lecture de plans techniques. 
    Ton rôle est d'analyser une photo d'un croquis dessiné à la main (un meuble, une étagère, etc.) et d'en extraire la liste de débit (pièces).

    RETOURNE EXCLUSIVEMENT UN OBJET JSON VALIDE.
    Le format doit être :
    {
      "project_name": "Nom suggéré du projet",
      "parts": [
        {
          "name": "Nom de la pièce (ex: Côté Gauche)",
          "width": 720,
          "height": 560,
          "quantity": 2,
          "material_hint": "Optionnel: mélamine, chêne, etc."
        }
      ]
    }

    CONSIGNES :
    - Toutes les dimensions doivent être en MILLIMÈTRES (mm). Si le dessin est en cm, multiplie par 10.
    - Sois précis sur les quantités.
    - Si tu ne vois pas de dimensions claires, fais une estimation réaliste basée sur le type de meuble.
    - Réponds uniquement en JSON, sans texte avant ou après.
    """

    def analyze_sketch(self, base64_image: str, model: str = "llama3.2-vision") -> Dict[str, Any]:
        """
        Analyze a sketch image and return a structured project.
        """
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": "Analyse ce croquis de menuiserie et extrais la liste de débit complète en format JSON."}
        ]

        try:
            response_text = llm_service.chat(
                messages=messages,
                model=model,
                images=[base64_image]
            )

            # Extract JSON from response (handling potential markdown formatting)
            json_str = response_text.strip()
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0].strip()
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0].strip()

            data = json.loads(json_str)
            
            # Validation basic
            if "parts" not in data:
                data["parts"] = []
            
            return data

        except Exception as e:
            logger.error(f"Vision analysis error: {e}")
            return {
                "error": str(e),
                "project_name": "Plan non reconnu",
                "parts": []
            }

vision_engine = VisionEngine()
