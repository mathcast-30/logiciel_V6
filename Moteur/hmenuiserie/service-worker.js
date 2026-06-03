/**
 * H Menuiserie - Service Worker
 * Stratégie Offline-First pour atelier
 * Version: 1.0.0
 */

const CACHE_VERSION = 'hmenuiserie-v1';
const API_CACHE = 'hmenuiserie-api-v1';

// Fichiers à pré-cacher (shell de l'application)
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/js/api.js',
    '/js/syncQueue.js',
    '/js/qrScanner.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

// Installation - Pré-cache des assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installation en cours...');

    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => {
                console.log('[SW] Pré-cache des fichiers statiques');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                console.log('[SW] Installation terminée');
                return self.skipWaiting();
            })
            .catch((err) => {
                console.error('[SW] Erreur pré-cache:', err);
            })
    );
});

// Activation - Nettoyage anciens caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activation en cours...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_VERSION && name !== API_CACHE)
                        .map((name) => {
                            console.log('[SW] Suppression ancien cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activation terminée');
                return self.clients.claim();
            })
    );
});

// Fetch - Stratégies de cache
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Ignorer les requêtes non-GET
    if (event.request.method !== 'GET') {
        return;
    }

    // Stratégie pour les appels API
    if (url.pathname.startsWith('/api/') || url.hostname !== location.hostname) {
        // API: Network-first avec fallback cache (30 jours)
        if (url.pathname.startsWith('/api/')) {
            event.respondWith(networkFirstWithCache(event.request));
            return;
        }
    }

    // Assets statiques: Cache-first
    event.respondWith(cacheFirstWithNetwork(event.request));
});

/**
 * Stratégie Cache-First avec fallback réseau
 * Pour les fichiers statiques (HTML, CSS, JS, images)
 */
async function cacheFirstWithNetwork(request) {
    const cache = await caches.open(CACHE_VERSION);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        // Mise à jour en arrière-plan (stale-while-revalidate)
        fetchAndCache(request, cache);
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Si hors-ligne et pas en cache, retourner la page d'accueil
        if (request.mode === 'navigate') {
            return cache.match('/');
        }
        throw error;
    }
}

/**
 * Stratégie Network-First avec fallback cache
 * Pour les appels API (données fraîches prioritaires)
 */
async function networkFirstWithCache(request) {
    const cache = await caches.open(API_CACHE);

    try {
        // Timeout de 5 secondes pour le réseau
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const networkResponse = await fetch(request, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (networkResponse.ok) {
            // Sauvegarder dans le cache API
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW] Réseau indisponible, utilisation du cache pour:', request.url);

        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Retourner une réponse vide JSON si pas de cache
        return new Response(JSON.stringify({
            error: 'offline',
            message: 'Données non disponibles hors-ligne'
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Mise à jour du cache en arrière-plan
 */
async function fetchAndCache(request, cache) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response);
        }
    } catch (error) {
        // Ignorer les erreurs de mise à jour en arrière-plan
    }
}

// Message depuis l'application principale
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_API_CACHE') {
        caches.delete(API_CACHE).then(() => {
            console.log('[SW] Cache API vidé');
        });
    }
});

// Sync en arrière-plan (Background Sync API)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-queue') {
        console.log('[SW] Background sync déclenché');
        event.waitUntil(syncPendingActions());
    }
});

/**
 * Synchroniser les actions en attente
 */
async function syncPendingActions() {
    // Notifier tous les clients de synchroniser
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({ type: 'SYNC_REQUIRED' });
    });
}

console.log('[SW] Service Worker chargé - Version:', CACHE_VERSION);
