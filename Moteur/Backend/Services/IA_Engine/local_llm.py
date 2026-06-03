import requests
import json
import logging

logger = logging.getLogger(__name__)

class LocalLLM:
    """
    Interface for the local Ollama instance.
    Defaults to localhost:11434.
    """
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.model = "llama3.2" # Default model, can be changed
        self.is_available = False
        self.check_connection()

    def check_connection(self) -> bool:
        """Check if Ollama is running and accessible."""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=2)
            if response.status_code == 200:
                self.is_available = True
                return True
        except requests.RequestException:
            pass
        
        self.is_available = False
        return False

    def list_models(self):
        """List available models in Ollama."""
        if not self.check_connection():
            return []
        try:
            response = requests.get(f"{self.base_url}/api/tags")
            data = response.json()
            return [m['name'] for m in data.get('models', [])]
        except Exception as e:
            logger.error(f"Error listing models: {e}")
            return []

    def chat(self, messages: list, model: str = None, images: list = None) -> str:
        """
        Send a chat request to Ollama.
        messages = [{"role": "user", "content": "..."}]
        images = ["base64_data_1", "base64_data_2"]
        """
        if not self.is_available:
            return "Erreur: L'IA locale n'est pas connectée. Vérifiez que Ollama tourne sur votre PC."

        target_model = model or self.model
        
        # Fallback if model not found, try to pick one
        models = self.list_models()
        if target_model not in models:
            # Prefer llama3.2-vision if images are provided
            vision_models = [m for m in models if "vision" in m.lower()]
            if images and vision_models:
                target_model = vision_models[0]
            elif models:
                target_model = models[0]
            else:
                return "Erreur: Aucun modèle IA trouvé dans Ollama. Installez-en un avec 'ollama run llama3.2'."

        try:
            # For Ollama 'chat' API, images go inside the message object
            current_messages = []
            for m in messages:
                msg = m.copy()
                if msg.get("role") == "user" and images:
                    msg["images"] = images
                current_messages.append(msg)

            payload = {
                "model": target_model,
                "messages": current_messages,
                "stream": False
            }
            response = requests.post(f"{self.base_url}/api/chat", json=payload, timeout=120)
            response.raise_for_status()
            result = response.json()
            return result.get("message", {}).get("content", "")
        except Exception as e:
            logger.error(f"Ollama chat error: {e}")
            return f"Erreur lors de la communication avec l'IA: {str(e)}"

    def generate(self, prompt: str) -> str:
        """Simple generation for completion."""
        return self.chat([{"role": "user", "content": prompt}])

# Singleton instance
llm_service = LocalLLM()
