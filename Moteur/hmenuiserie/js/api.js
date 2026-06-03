/**
 * H Menuiserie - API Service
 * Communication avec le backend + cache local
 */

const Api = {
    /**
     * Configuration
     */
    get baseUrl() {
        return window.APP_CONFIG?.apiBaseUrl || 'http://localhost:8000/api';
    },

    timeout: 5000, // 5 secondes

    /**
     * Requête HTTP avec timeout et cache fallback
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const cacheKey = `hmenuiserie_cache_${endpoint.replace(/\//g, '_')}`;

        // AbortController pour timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            // Sauvegarder en cache pour utilisation hors-ligne
            if (options.method === undefined || options.method === 'GET') {
                this.saveToCache(cacheKey, data);
            }

            return data;

        } catch (error) {
            clearTimeout(timeoutId);

            // Si erreur réseau, essayer le cache
            if (error.name === 'AbortError' || error.message.includes('fetch')) {
                console.log('[API] Réseau indisponible, utilisation du cache pour:', endpoint);
                const cached = this.getFromCache(cacheKey);
                if (cached !== null) {
                    return cached;
                }
            }

            throw error;
        }
    },

    /**
     * Sauvegarder dans le cache local
     */
    saveToCache(key, data) {
        try {
            const cacheEntry = {
                timestamp: Date.now(),
                data: data
            };
            localStorage.setItem(key, JSON.stringify(cacheEntry));
        } catch (e) {
            console.error('[API] Erreur sauvegarde cache:', e);
        }
    },

    /**
     * Récupérer du cache local
     */
    getFromCache(key) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;

            const parsed = JSON.parse(item);

            // Vérifier l'âge du cache (30 jours max)
            const maxAge = 30 * 24 * 60 * 60 * 1000;
            if (Date.now() - parsed.timestamp > maxAge) {
                localStorage.removeItem(key);
                return null;
            }

            return parsed.data;
        } catch (e) {
            return null;
        }
    },

    /**
     * Vérifier la santé du serveur
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            return { ok: response.ok };
        } catch {
            return { ok: false };
        }
    },

    // =====================
    // ENDPOINTS PROJETS
    // =====================

    getProjects() {
        return this.request('/projects/');
    },

    getProject(id) {
        return this.request(`/projects/${id}`);
    },

    // =====================
    // ENDPOINTS CLIENTS
    // =====================

    getClients() {
        return this.request('/clients/');
    },

    getClient(id) {
        return this.request(`/clients/${id}`);
    },

    // =====================
    // ENDPOINTS STOCK
    // =====================

    getStock() {
        return this.request('/stock/');
    },

    getStockItem(id) {
        return this.request(`/stock/${id}`);
    },

    updateStockQuantity(id, quantity) {
        return this.request(`/stock/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity })
        });
    },

    markStockUsed(id) {
        return this.request(`/stock/${id}/use`, {
            method: 'POST'
        });
    },

    // =====================
    // ENDPOINTS QR CODE
    // =====================

    scanQRCode(qrCode) {
        return this.request(`/qr/scan/${encodeURIComponent(qrCode)}`);
    },

    consumeBoard(stockId, optimizationId = null) {
        const params = new URLSearchParams({ stock_id: stockId });
        if (optimizationId) {
            params.append('optimization_id', optimizationId);
        }
        return this.request(`/qr/consume?${params.toString()}`, {
            method: 'POST'
        });
    },

    // =====================
    // ENDPOINTS SUPPLIERS
    // =====================

    getSuppliers() {
        return this.request('/suppliers/');
    },

    createSupplier(supplierData) {
        return this.request('/suppliers/', {
            method: 'POST',
            body: JSON.stringify(supplierData)
        });
    },

    // =====================
    // ENDPOINTS OPTIMISATIONS
    // =====================

    getOptimizationsByProject(projectId) {
        return this.request(`/optimize/history/${projectId}`);
    },

    getOptimization(id) {
        return this.request(`/optimize/result/${id}`);
    },

    // =====================
    // UTILITAIRES CACHE
    // =====================

    /**
     * Obtenir l'âge du cache pour une clé
     */
    getCacheAge(endpoint) {
        const key = `hmenuiserie_cache_${endpoint.replace(/\//g, '_')}`;
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;
            const parsed = JSON.parse(item);
            return Date.now() - parsed.timestamp;
        } catch {
            return null;
        }
    },

    /**
     * Vider tout le cache
     */
    clearCache() {
        Object.keys(localStorage)
            .filter(key => key.startsWith('hmenuiserie_cache_'))
            .forEach(key => localStorage.removeItem(key));
        console.log('[API] Cache vidé');
    }
};

// Export global
window.Api = Api;
