// src/services/apiClient.ts
// Configuration de base pour fetch avec le token de session

const API_BASE_URL = 'http://localhost:8000/api';

export async function apiClient(endpoint: string, options: RequestInit = {}) {
  const token = sessionStorage.getItem('opticut_session_token');
  
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // On peut ajouter une logique globale ici (ex: déconnexion si 401)
  if (response.status === 401) {
    // Si la session expire, on supprime le token et on recharge la page pour déclencher le flow normal
    // sauf si on est déjà en train de faire un login ou une vérification me
    if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/me')) {
      sessionStorage.removeItem('opticut_session_token');
      window.location.href = '/login';
    }
  }

  return response;
}
