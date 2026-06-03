import json
import math
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Project, Part, Hardware, HardwareAssembly

logger = logging.getLogger(__name__)

class HardwareEngine:
    """
    Logic for automatically calculating hardware needs based on project parts and assembly rules.
    """
    
    @staticmethod
    def evaluate_condition(part: Part, conditions: Dict[str, Any]) -> bool:
        """
        Evaluate if a part matches the rule conditions.
        Supported conditions:
        - keywords: list of strings (matches if any keyword is in part.name)
        - min_width, max_width: float
        - min_height, max_height: float
        """
        if not conditions:
            return True
            
        # Match keywords in name
        keywords = conditions.get("keywords", [])
        if keywords:
            part_name_lower = part.name.lower()
            found = False
            for kw in keywords:
                if kw.lower() in part_name_lower:
                    found = True
                    break
            if not found:
                return False
                
        # Match dimensions (width)
        min_width = conditions.get("min_width", 0)
        max_width = conditions.get("max_width", float('inf'))
        if not (min_width <= part.width <= max_width):
            return False
            
        # Match dimensions (height)
        min_height = conditions.get("min_height", 0)
        max_height = conditions.get("max_height", float('inf'))
        if not (min_height <= part.height <= max_height):
            return False
            
        return True

    @staticmethod
    def calculate_quantity(part: Part, formula: str, base_qty: float) -> int:
        """
        Calculate hardware quantity based on a formula string.
        Simple formulas supported: "width", "height", "area".
        Example formula: "ceil(height / 500)"
        """
        if not formula:
            return int(base_qty)
            
        # Basic variable replacement
        # Convert values to strings to prevent injection or weirdness
        f = str(formula)
        f = f.replace("width", str(part.width))
        f = f.replace("height", str(part.height))
        f = f.replace("depth", str(part.width)) # Alias depth to width (standard cabinet side)
        f = f.replace("area", str((part.width * part.height) / 1000000))
        
        try:
            # Safe eval for simple math
            # Only allow specific math functions
            safe_context = {
                "math": math,
                "ceil": math.ceil,
                "floor": math.floor,
                "round": round,
                "min": min,
                "max": max
            }
            # Remove all builtins for safety
            result = eval(f, {"__builtins__": {}}, safe_context)
            return int(result)
        except Exception as e:
            logger.error(f"Error evaluating formula '{formula}': {e}")
            return int(base_qty)

    def get_drills_for_part(self, db: Session, part: Part) -> List[Dict[str, Any]]:
        """
        Calculate precise drilling coordinates for a given part based on hardware rules.
        """
        rules = db.query(HardwareAssembly).all()
        drills = []
        
        for rule in rules:
            try:
                conditions = json.loads(rule.conditions) if rule.conditions else {}
                if self.evaluate_condition(part, conditions):
                    items = json.loads(rule.items) if rule.items else []
                    for item in items:
                        hw_id = item.get("hardware_id")
                        hw = db.query(Hardware).filter(Hardware.id == hw_id).first()
                        
                        if hw and hw.specs:
                            specs = json.loads(hw.specs)
                            template_drills = specs.get("drills", [])
                            
                            # Base quantity (e.g. 2 hinges)
                            qty = self.calculate_quantity(part, item.get("formula"), item.get("quantity", 1))
                            
                            # For each instance of the hardware, apply the drilling template
                            # This is a simplified version: we assume the template handles multiple drills
                            # or we offset based on quantity if needed.
                            for d in template_drills:
                                # Evaluate dynamic coordinates (e.g. "width - 37")
                                x_expr = str(d.get("x", 0)).replace("width", str(part.width)).replace("height", str(part.height))
                                y_expr = str(d.get("y", 0)).replace("width", str(part.width)).replace("height", str(part.height))
                                
                                try:
                                    x = eval(x_expr, {"__builtins__": {}}, {"math": math, "ceil": math.ceil})
                                    y = eval(y_expr, {"__builtins__": {}}, {"math": math, "ceil": math.ceil})
                                    
                                    drills.append({
                                        "x": float(x),
                                        "y": float(y),
                                        "diameter": float(d.get("diameter", 5)),
                                        "depth": float(d.get("depth", 12)),
                                        "label": hw.name
                                    })
                                except Exception as e:
                                    logger.error(f"Error evaluating drill coord: {e}")
                                    
            except Exception as e:
                logger.error(f"Error processing drills for rule {rule.name}: {e}")
                
        return drills

    def calculate_for_project(self, project_id: int, db: Session) -> List[Dict[str, Any]]:
        """
        Run the rule engine for all parts in a project.
        Returns a list of needed hardware with quantities.
        """
        parts = db.query(Part).filter(Part.project_id == project_id).all()
        rules = db.query(HardwareAssembly).all()
        
        hardware_needs = {} # hardware_id -> { "id": int, "reference": str, "name": str, ... }
        
        for part in parts:
            for rule in rules:
                try:
                    conditions = json.loads(rule.conditions) if rule.conditions else {}
                    if self.evaluate_condition(part, conditions):
                        items = json.loads(rule.items) if rule.items else []
                        for item in items:
                            hw_id = item.get("hardware_id")
                            ref = item.get("reference")
                            
                            # Find hardware item
                            hw = None
                            if hw_id:
                                hw = db.query(Hardware).filter(Hardware.id == hw_id).first()
                            elif ref:
                                hw = db.query(Hardware).filter(Hardware.reference == ref).first()
                                
                            if hw:
                                qty_per_part = self.calculate_quantity(part, item.get("formula"), item.get("quantity", 1))
                                # Final quantity is qty * part.quantity
                                total_qty = qty_per_part * part.quantity
                                
                                if hw.id not in hardware_needs:
                                    hardware_needs[hw.id] = {
                                        "id": hw.id,
                                        "reference": hw.reference,
                                        "name": hw.name,
                                        "category": hw.category,
                                        "cost_unit": hw.cost_unit,
                                        "quantity": 0,
                                        "total_cost": 0.0
                                    }
                                hardware_needs[hw.id]["quantity"] += total_qty
                                hardware_needs[hw.id]["total_cost"] = hardware_needs[hw.id]["quantity"] * hardware_needs[hw.id]["cost_unit"]
                except Exception as e:
                    logger.error(f"Error processing rule {rule.name}: {e}")
                    
        return list(hardware_needs.values())

# Singleton instance
hardware_engine = HardwareEngine()
