import axios, { AxiosError } from 'axios';

// Configuration Robuste (Aviation Mode)
const api = axios.create({
    baseURL: 'http://localhost:8000/api/',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 5000, // 5 Secondes max avant d'abandonner
});

// Intercepteur pour injecter automatiquement le token d'authentification
api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('opticut_session_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Intercepteur pour gérer les pannes
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        let message = "Une erreur inconnue est survenue.";

        if (error.code === 'ECONNABORTED') {
            message = "⚠️ Le service IA ne répond pas (Délai 5s dépassé).";
            console.error(message);
        } else if (!error.response) {
            message = "🔌 Impossible de contacter le serveur. (Base de données hors ligne ?)";
            console.error(message);
        } else if (error.response.status >= 500) {
            message = `❌ Erreur Serveur (${error.response.status}).`;
        }

        // On peut attacher le message à l'erreur pour que l'UI l'affiche
        error.message = message;
        return Promise.reject(error);
    }
);

export default api;
