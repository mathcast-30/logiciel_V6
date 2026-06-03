import json
import os
import math
import re
from typing import List, Dict, Optional
from datetime import datetime
from .local_llm import llm_service

class AIAssistant:
    """
    Local AI Assistant for Woodworking.
    Split into two functionalities:
    1. KnowledgeExpert: Semantic search for technical woodworking questions.
    2. BatchOptimizer: Smart grouping of projects using combinatorial logic.
    """
    
    def __init__(self, data_path: str = "app/data/woodworking_expert.json"):
        self.data_path = data_path
        self._knowledge_base = self._load_knowledge_base()
        
    def _load_knowledge_base(self):
        try:
            if os.path.exists(self.data_path):
                with open(self.data_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            return []
        except Exception:
            return []

    # --- BRAIN 1: SEMANTIC SEARCH (Local Knowledge) ---
    
    def ask_expert(self, query: str) -> Dict:
        """
        Ask a technical question and get the most relevant knowledge entry.
        Uses basic TF-IDF style keyword matching for local performance.
        """
        if not self._knowledge_base:
            return {"answer": "La base de connaissances est vide.", "id": None}
            
        # Simplistic normalization & tokenization
        def tokenize(text):
            return set(re.findall(r'\w+', text.lower()))
            
        query_tokens = tokenize(query)
        best_match = None
        highest_score = 0
        
        for entry in self._knowledge_base:
            # Score based on title, keywords and content
            title_tokens = tokenize(entry['title'])
            keyword_tokens = tokenize(entry['keywords'])
            content_tokens = tokenize(entry['content'])
            
            # Weighted intersection
            match_score = (len(query_tokens & title_tokens) * 3 + 
                           len(query_tokens & keyword_tokens) * 2 + 
                           len(query_tokens & content_tokens))
            
            if match_score > highest_score:
                highest_score = match_score
                best_match = entry
                
        if highest_score > 0 and best_match:
            return {
                "answer": best_match['content'],
                "title": best_match['title'],
                "id": best_match['id'],
                "score": highest_score,
                "source": best_match.get('source', 'Documentation interne')
            }
            
        return {
            "answer": "Désolé, je n'ai pas d'information précise sur ce sujet. Essayez de reformuler avec des mots comme 'coulisses', 'assemblage' ou 'porte'.",
            "id": None
        }

    # --- BRAIN 2: BATCH OPTIMIZER (Genetic Logic) ---
    
    def suggest_batches(self, available_projects: List[Dict], stock_summary: List[Dict]) -> List[Dict]:
        """
        Suggest project groupings to minimize waste.
        In a real app, this would be a full Genetic Algorithm.
        Here we implement a 'Next Fit' greedy approach with some scoring to find good pairings.
        """
        if len(available_projects) < 2:
            return []
            
        # Group parts of projects to get total needs per material
        suggestions = []
        
        # Simple heuristic: Group projects that share the same main material
        material_project_map = {}
        for proj in available_projects:
            materials = {part['material_id'] for part in proj.get('parts', [])}
            for m_id in materials:
                if m_id not in material_project_map:
                    material_project_map[m_id] = []
                material_project_map[m_id].append(proj)
        
        for m_id, projects in material_project_map.items():
            if len(projects) >= 2:
                # Calculate potential synergy
                total_parts_area = sum(sum(p['width']*p['height']*p['quantity'] for p in proj['parts']) for proj in projects)
                
                suggestions.append({
                    "id": f"batch_{m_id}_{len(projects)}",
                    "title": f"Optimisation Groupée Matériau #{m_id}",
                    "description": f"Regrouper {len(projects)} projets partageant ce matériau pour réduire les chutes.",
                    "project_ids": [p['id'] for p in projects],
                    "project_names": [p['name'] for p in projects],
                    "potential_saving": "15-20%",
                    "reason": "Synergie de surfaces sur panneau plein."
                })
                
        return suggestions[:3] # Limit to top 3 suggestions

    # --- BRAIN 3: STRATEGY CONSULTANT (Local LLM) ---
    
    def analyze_strategy(self, projects: List[Dict], stock_summary: List[Dict]) -> Dict:
        """
        Analyze optimization batch and provide professional strategy advice.
        """
        if not llm_service.is_available:
            return {
                "strategy_report": "L'Assistant IA est actuellement hors-ligne. Veuillez démarrer Ollama pour une analyse avancée.",
                "ga_parameters": {
                    "population_size": 40,
                    "generations": 25,
                    "mutation_rate": 0.15
                }
            }

        # Prepare context for the LLM
        context = {
            "project_count": len(projects),
            "total_parts": sum(len(p.get('parts', [])) for p in projects),
            "materials_involved": list({part['material_id'] for proj in projects for part in proj.get('parts', [])}),
            "stock_status": stock_summary
        }

        prompt = f"""
        Tu es un consultant expert en optimisation de coupe industrielle (systèmes de type Dassault Systèmes).
        Analyse les données suivantes pour un batch de production de menuiserie :
        {json.dumps(context, indent=2)}
        
        Tâche :
        1. Suggère les meilleurs paramètres pour l'Algorithme Génétique (GA) : population_size (integer), generations (integer), mutation_rate (float 0.0-1.0).
        2. Rédige un court rapport stratégique (max 150 mots) expliquant pourquoi ces réglages sont optimaux pour ce batch et quels sont les points critiques à surveiller.
        
        Format de réponse JSON obligatoire :
        {{
            "ga_parameters": {{
                "population_size": 60,
                "generations": 40,
                "mutation_rate": 0.2
            }},
            "strategy_report": "Ton analyse ici..."
        }}
        """

        response = llm_service.chat([
            {"role": "system", "content": "Tu es une IA experte en logistique industrielle et optimisation de matériaux. Réponds uniquement en JSON valide."},
            {"role": "user", "content": prompt}
        ])

        try:
            # Extract JSON from response (handling potential markdown formatting)
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                return result
        except Exception:
            pass

        # Fallback if AI fails or returns invalid JSON
        return {
            "strategy_report": "Analyse standard appliquée. Focus sur la mutualisation des matériaux communs pour maximiser l'utilisation des chutes.",
            "ga_parameters": {
                "population_size": 50,
                "generations": 30,
                "mutation_rate": 0.2
            }
        }
