"""
Template resolving engine for OptiCut Pro.
Handles parametric calculation of parts based on user inputs.
"""
import re
import json
from typing import List, Dict, Any

class TemplateSolver:
    """
    Solves parametric part lists by evaluating formulas with given parameters.
    """
    
    @staticmethod
    def solve(definition: str, user_parameters: Dict[str, float]) -> List[Dict[str, Any]]:
        """
        Takes a template definition (JSON) and user inputs, returns a list of resolved parts.
        
        Definition Format:
        {
            "parameters": [
                {"name": "L", "label": "Largeur", "default": 600},
                {"name": "H", "label": "Hauteur", "default": 720},
                {"name": "T", "label": "Epaisseur", "default": 18}
            ],
            "parts": [
                {
                    "name": "Côté",
                    "width": "H",
                    "height": "P",
                    "quantity": 2,
                    "material_id": 1,
                    "edges": {"top": 1, "bottom": 1}
                },
                {
                    "name": "Dessous",
                    "width": "L - 2*T",
                    "height": "P",
                    "quantity": 1
                }
            ]
        }
        """
        try:
            data = json.loads(definition)
        except json.JSONDecodeError:
            return []
            
        parts_list = data.get("parts", [])
        resolved_parts = []
        
        # Context for evaluation (parameters)
        context = {p["name"]: p.get("default", 0) for p in data.get("parameters", [])}
        context.update(user_parameters)
        
        for part_def in parts_list:
            resolved_part = part_def.copy()
            
            # Resolve width and height
            resolved_part["width"] = TemplateSolver._eval_formula(str(part_def["width"]), context)
            resolved_part["height"] = TemplateSolver._eval_formula(str(part_def["height"]), context)
            
            # Quantity must be int
            if isinstance(part_def.get("quantity"), str):
                resolved_part["quantity"] = int(TemplateSolver._eval_formula(part_def["quantity"], context))
            
            resolved_parts.append(resolved_part)
            
        return resolved_parts

    @staticmethod
    def _eval_formula(formula: str, context: Dict[str, float]) -> float:
        """
        Safely evaluate a mathematical formula string.
        Supports: +, -, *, /, (), and variables from context.
        """
        # 1. Replace variables with values
        # Sort keys by length descending to avoid partial replacement (e.g., L and LARGEUR)
        sorted_keys = sorted(context.keys(), key=len, reverse=True)
        
        # Clean formula: remove anything that isn't a number, operator, or variable name
        safe_formula = formula
        
        for key in sorted_keys:
            # Use regex to replace only whole words
            pattern = r'\b' + re.escape(key) + r'\b'
            safe_formula = re.sub(pattern, str(context[key]), safe_formula)
            
        # 2. Final check for safety before eval
        # Only allow numbers, math operators, dots, and spaces
        if not re.match(r'^[0-9.+\-*/() ]+$', safe_formula):
            print(f"Unsafe formula after resolution: {safe_formula}")
            return 0.0
            
        try:
            # Use eval with no globals or builtins for safety
            return float(eval(safe_formula, {"__builtins__": {}}, {}))
        except Exception as e:
            print(f"Error evaluating formula '{formula}' (resolved as '{safe_formula}'): {e}")
            return 0.0

# Initial default templates
DEFAULT_TEMPLATES = [
    {
        "name": "Caisson Bas",
        "category": "Meuble",
        "description": "Caisson standard avec deux côtés, un dessus et un dessous.",
        "definition": json.dumps({
            "parameters": [
                {"name": "L", "label": "Largeur Totale (mm)", "default": 600},
                {"name": "H", "label": "Hauteur Totale (mm)", "default": 720},
                {"name": "P", "label": "Profondeur (mm)", "default": 560},
                {"name": "E", "label": "Épaisseur Panneau (mm)", "default": 18},
                {"name": "R", "label": "Retrait Fond (mm)", "default": 20}
            ],
            "parts": [
                {"name": "Côté x2", "width": "H", "height": "P", "quantity": 2},
                {"name": "Dessus", "width": "L - 2*E", "height": "P", "quantity": 1},
                {"name": "Dessous", "width": "L - 2*E", "height": "P", "quantity": 1},
                {"name": "Fond (en applique)", "width": "H", "height": "L", "quantity": 1}
            ]
        }, ensure_ascii=False)
    },
    {
        "name": "Tiroir Classique",
        "category": "Accessoire",
        "description": "Tiroir simple avec côtés coiffant la face et l'arrière.",
        "definition": json.dumps({
            "parameters": [
                {"name": "L", "label": "Largeur Caisson (mm)", "default": 600},
                {"name": "P", "label": "Profondeur Coulisse (mm)", "default": 500},
                {"name": "H", "label": "Hauteur Côtés (mm)", "default": 150},
                {"name": "J", "label": "Jeu Total Coulisses (mm)", "default": 26},
                {"name": "E", "label": "Épaisseur Bois (mm)", "default": 16},
                {"name": "PR", "label": "Pénétration Rainure (mm)", "default": 5}
            ],
            "parts": [
                {"name": "Côté de tiroir", "width": "P", "height": "H", "quantity": 2},
                {"name": "Face/Arrière de tiroir", "width": "L - J - 2*E", "height": "H", "quantity": 2},
                {"name": "Fond de tiroir", "width": "L - J - 2*E + 2*PR", "height": "P - E + PR", "quantity": 1}
            ]
        }, ensure_ascii=False)
    }
]
