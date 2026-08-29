import api from './api';

export interface Supplier {
    id: number;
    name: string;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    phone?: string;
    email?: string;
    website?: string;
    delivery_delay_days?: number;
    comments?: string;
    created_at?: string;
    materials?: SupplierMaterial[];
}

export interface PriceHistory {
    id: number;
    price: number;
    timestamp: string;
}

export interface SupplierMaterial {
    id: number;
    supplier_id: number;
    material_id?: number | null;
    name?: string;
    essence?: string;
    product_type?: string;
    treatment?: string;
    certification?: string;
    devis_necessaire: boolean;
    group_name?: string;
    price: number;
    price_type: 'unit' | 'm2' | 'm3';
    reference?: string;
    width?: number;
    height?: number;
    thickness?: number;
    stock_quantity: number;
    is_archived: boolean;
    created_at?: string;
    updated_at?: string;
    price_history?: PriceHistory[];
}

export interface ScrapedProduct {
    name: string;
    price: number;
    url: string;
    image_url?: string;
    dimensions?: string;
    category?: string;
    group_name?: string;
    essence?: string;
    product_type?: string;
    treatment?: string;
    certification?: string;
    devis_necessaire: boolean;
    is_new?: boolean;
    price_changed?: boolean;
    old_price?: number;
    anomaly?: boolean;
    anomaly_reason?: string;
}

export interface ScrapingResult {
    total_pages?: number;
    total_products?: number;
    scanned_pages?: number;
    type?: string;
    analyzed_products?: ScrapedProduct[];
    products: ScrapedProduct[];
}

export interface ScrapeStats {
    total_pages: number;
    total_products: number;
    type?: string;
    analyzed_products?: ScrapedProduct[];
}

export interface SupplierWithProducts extends Supplier {
    materials: SupplierMaterial[];
}

export const SupplierService = {
    // Get all suppliers
    getAll: async (signal?: AbortSignal): Promise<Supplier[]> => {
        const response = await api.get<Supplier[]>('/suppliers/', { signal });
        return response.data;
    },

    // Get supplier by ID with materials
    getById: async (id: number): Promise<SupplierWithProducts> => {
        const response = await api.get<SupplierWithProducts>(`/suppliers/${id}`);
        return response.data;
    },

    // Create a new supplier
    create: async (data: Omit<Supplier, 'id' | 'created_at' | 'materials'>): Promise<Supplier> => {
        const response = await api.post<Supplier>('/suppliers/', data);
        return response.data;
    },

    // Update a supplier
    update: async (id: number, data: Partial<Omit<Supplier, 'id' | 'created_at' | 'materials'>>): Promise<Supplier> => {
        const response = await api.put<Supplier>(`/suppliers/${id}`, data);
        return response.data;
    },

    // Delete a supplier
    delete: async (id: number): Promise<void> => {
        await api.delete(`/suppliers/${id}`);
    },

    // Batch import materials
    batchImport: async (supplierId: number, products: Partial<SupplierMaterial>[]): Promise<{ created: number; updated: number }> => {
        const response = await api.post<{ created: number; updated: number }>(`/suppliers/${supplierId}/batch-import`, products);
        return response.data;
    },

    // Get full catalog for a supplier
    getCatalog: async (supplierId: number): Promise<SupplierMaterial[]> => {
        const response = await api.get<SupplierMaterial[]>(`/suppliers/${supplierId}/catalog`);
        return response.data;
    },

    // Refresh entire catalog
    refreshCatalog: async (supplierId: number): Promise<{ updated_count: number; total: number }> => {
        const response = await api.post<{ updated_count: number; total: number }>(`/suppliers/${supplierId}/refresh`);
        return response.data;
    },

    // Add a material price to supplier catalog
    addMaterial: async (supplierId: number, data: Partial<SupplierMaterial>): Promise<SupplierMaterial> => {
        const response = await api.post<SupplierMaterial>(`/suppliers/${supplierId}/materials`, data);
        return response.data;
    },

    // Update a material in catalog
    updateMaterial: async (offerId: number, data: Partial<SupplierMaterial>): Promise<SupplierMaterial> => {
        const response = await api.put<SupplierMaterial>(`/suppliers/offers/${offerId}`, data);
        return response.data;
    },

    // Remove a material from supplier catalog (delete)
    removeMaterial: async (offerId: number): Promise<void> => {
        await api.delete(`/suppliers/offers/${offerId}`);
    },

    // Refresh price via scraping
    refreshPrice: async (offerId: number): Promise<{ price: number }> => {
        const response = await api.post<{ price: number }>(`/suppliers/offers/${offerId}/refresh`);
        return response.data;
    },

    // Alias for refreshPrice
    refreshMaterialPrice: async (offerId: number): Promise<{ price: number }> => {
        const response = await api.post<{ price: number }>(`/suppliers/offers/${offerId}/refresh`);
        return response.data;
    },

    // Link a supplier offer to an internal material
    associateProduct: async (offerId: number, materialId: number): Promise<void> => {
        await api.post(`/suppliers/offers/${offerId}/associate/${materialId}`);
    },

    // Export entire catalog as CSV
    exportCatalog: async (): Promise<void> => {
        const baseURL = api.defaults.baseURL;
        window.open(`${baseURL}/exports/catalog/export`, '_blank');
    },

    // Export catalog CSV as Blob
    exportCatalogCSV: async (supplierId?: number): Promise<Blob> => {
        const url = supplierId ? `/exports/catalog/export?supplier_id=${supplierId}` : '/exports/catalog/export';
        const response = await api.get(url, { responseType: 'blob' });
        return response.data;
    },

    // Import catalog CSV file
    importCatalogCSV: async (supplierId: number, file: File): Promise<{ imported: number }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post<{ imported: number }>(`/suppliers/${supplierId}/import`, formData);
        return response.data;
    },

    // Get stats
    getStats: async (signal?: AbortSignal): Promise<{ suppliers: number; products: number; orders: number }> => {
        try {
            const suppliers = await api.get<Supplier[]>('/suppliers/', { signal });
            let totalProducts = 0;
            for (const s of suppliers.data) {
                if (s.materials) totalProducts += s.materials.length;
            }
            return {
                suppliers: suppliers.data.length,
                products: totalProducts,
                orders: 0
            };
        } catch {
            return { suppliers: 0, products: 0, orders: 0 };
        }
    },

    // Stream Analyze URL for scraping
    analyzeUrlStream: async (
        url: string,
        maxPages: number,
        onProgress: (msg: string, progress?: number) => void,
        onCompleteOrProducts: ((products: ScrapedProduct[]) => void) | ((stats: ScrapingResult) => void),
        onComplete?: (stats: ScrapingResult) => void,
        onError?: (err: string) => void
    ): Promise<void> => {
        try {
            const response = await fetch(`${api.defaults.baseURL}scraping/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url, max_pages: maxPages })
            });

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep incomplete line in buffer

                    for (const line of lines) {
                        if (!line.trim()) continue;
                        try {
                            const data = JSON.parse(line);

                            if (data.type === 'start' || data.type === 'progress') {
                                onProgress(data.msg, data.progress);
                            } else if (data.type === 'products') {
                                if (onComplete) {
                                    (onCompleteOrProducts as (products: ScrapedProduct[]) => void)(data.products);
                                }
                            } else if (data.type === 'error') {
                                console.warn("Scraping warning:", data.msg);
                            } else if (data.type === 'complete') {
                                if (onComplete) {
                                    onComplete(data);
                                } else {
                                    (onCompleteOrProducts as (stats: ScrapingResult) => void)(data);
                                }
                            }
                        } catch (e) {
                            console.error("Error parsing stream line:", line, e);
                        }
                    }
                }
            } catch (err) {
                console.error("Stream reading error:", err);
                throw err;
            }

        } catch (error) {
            const msg = error instanceof Error ? error.message : "Erreur de connexion";
            if (onError) {
                onError(msg);
            } else {
                throw error;
            }
        }
    }
};
