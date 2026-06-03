/**
 * Simple persistent cache service for workshop use.
 * Complements the Service Worker by providing explicit access to the latest data.
 */
export const CacheService = {
    save: (key: string, data: unknown) => {
        try {
            const cacheData = {
                timestamp: Date.now(),
                data: data
            };
            localStorage.setItem(`opticut_cache_${key}`, JSON.stringify(cacheData));
        } catch (e) {
            console.error('Error saving to cache', e);
        }
    },

    get: <T>(key: string): T | null => {
        try {
            const item = localStorage.getItem(`opticut_cache_${key}`);
            if (!item) return null;
            const parsed = JSON.parse(item);
            return parsed.data as T;
        } catch (e) {
            console.error('Error reading from cache', e);
            return null;
        }
    },

    getTimestamp: (key: string): number | null => {
        const item = localStorage.getItem(`opticut_cache_${key}`);
        if (!item) return null;
        try {
            return JSON.parse(item).timestamp;
        } catch {
            return null;
        }
    },

    remove: (key: string) => {
        localStorage.removeItem(`opticut_cache_${key}`);
    },

    clearAll: () => {
        Object.keys(localStorage)
            .filter(key => key.startsWith('opticut_cache_'))
            .forEach(key => localStorage.removeItem(key));
    }
};
