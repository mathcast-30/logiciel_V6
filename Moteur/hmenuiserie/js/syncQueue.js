/**
 * H Menuiserie - Sync Queue
 * File d'attente pour actions hors-ligne
 */

const SyncQueue = {
    STORAGE_KEY: 'hmenuiserie_sync_queue',

    /**
     * Récupérer la file d'attente
     */
    getQueue() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },

    /**
     * Sauvegarder la file d'attente
     */
    saveQueue(queue) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
        } catch (e) {
            console.error('[SyncQueue] Erreur sauvegarde:', e);
        }
    },

    /**
     * Ajouter une action à la file
     */
    add(action, params) {
        const queue = this.getQueue();

        const entry = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            action: action,
            params: params,
            timestamp: new Date().toISOString(),
            retries: 0
        };

        queue.push(entry);
        this.saveQueue(queue);

        console.log('[SyncQueue] Action ajoutée:', action, params);

        // Mettre à jour le bandeau
        if (typeof updateSyncBanner === 'function') {
            updateSyncBanner();
        }

        // Enregistrer pour Background Sync si disponible
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            navigator.serviceWorker.ready.then(registration => {
                registration.sync.register('sync-queue');
            }).catch(err => {
                console.log('[SyncQueue] Background Sync non disponible:', err);
            });
        }

        return entry.id;
    },

    /**
     * Supprimer une action de la file
     */
    remove(id) {
        const queue = this.getQueue();
        const filtered = queue.filter(item => item.id !== id);
        this.saveQueue(filtered);
    },

    /**
     * Obtenir le nombre d'actions en attente
     */
    getCount() {
        return this.getQueue().length;
    },

    /**
     * Traiter toutes les actions en attente
     */
    async processQueue() {
        const queue = this.getQueue();

        if (queue.length === 0) {
            console.log('[SyncQueue] File vide');
            return;
        }

        console.log('[SyncQueue] Traitement de', queue.length, 'action(s)...');

        const results = {
            success: 0,
            failed: 0
        };

        for (const item of queue) {
            try {
                await this.executeAction(item);
                this.remove(item.id);
                results.success++;
                console.log('[SyncQueue] Action réussie:', item.action);
            } catch (error) {
                console.error('[SyncQueue] Échec action:', item.action, error);

                // Incrémenter les retries
                item.retries = (item.retries || 0) + 1;

                // Supprimer après 5 tentatives
                if (item.retries >= 5) {
                    console.log('[SyncQueue] Action abandonnée après 5 tentatives:', item.action);
                    this.remove(item.id);
                }

                results.failed++;
            }
        }

        // Notification utilisateur
        if (results.success > 0) {
            window.showToast?.(
                `${results.success} action(s) synchronisée(s)`,
                'success'
            );
        }

        if (results.failed > 0) {
            window.showToast?.(
                `${results.failed} action(s) en attente`,
                'warning'
            );
        }

        // Mettre à jour le bandeau
        if (typeof updateSyncBanner === 'function') {
            updateSyncBanner();
        }

        // Sauvegarder les modifications (retries)
        this.saveQueue(this.getQueue());
    },

    /**
     * Exécuter une action spécifique
     */
    async executeAction(item) {
        switch (item.action) {
            case 'markUsed':
                return Api.markStockUsed(item.params.stockId);

            case 'consumeBoard':
                return Api.consumeBoard(
                    item.params.stockId,
                    item.params.optimizationId
                );

            case 'updateQuantity':
                return Api.updateStockQuantity(
                    item.params.stockId,
                    item.params.quantity
                );

            default:
                throw new Error(`Action inconnue: ${item.action}`);
        }
    },

    /**
     * Vider la file d'attente
     */
    clear() {
        this.saveQueue([]);
        console.log('[SyncQueue] File vidée');

        if (typeof updateSyncBanner === 'function') {
            updateSyncBanner();
        }
    },

    /**
     * Afficher le contenu de la file (debug)
     */
    debug() {
        const queue = this.getQueue();
        console.table(queue);
        return queue;
    }
};

// Export global
window.SyncQueue = SyncQueue;
