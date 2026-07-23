# Stockage des sessions en mémoire
# Dictionnaire qui associe un token (str) à un dictionnaire utilisateur (dict)
# Exemple : {"uuid4-token": {"id": 1, "nom": "Dupont", "prenom": "Marc", "identifiant": "marc", "role": "admin", "must_change_pwd": False, "avatar_color": "#6C63FF"}}

sessions = {}
