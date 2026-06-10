import { useState, useEffect, useCallback, useRef } from 'react';
import { type MaterialWithStock, type EdgeBand, MaterialService } from '../services/materialService';
import { type Supplier, SupplierService } from '../services/supplierService';

export interface StockData {
    // Data
    materials: MaterialWithStock[];
    edgeBands: EdgeBand[];
    suppliers: Supplier[];
    supplierStats: { suppliers: number; products: number; orders: number };

    // Loading states
    isLoadingMaterials: boolean;
    isLoadingEdgeBands: boolean;
    isLoadingSuppliers: boolean;

    // Errors
    errors: Record<string, string | null>;

    // Refresh functions
    refreshMaterials: () => Promise<void>;
    refreshEdgeBands: () => Promise<void>;
    refreshSuppliers: () => Promise<void>;
    refreshAll: () => Promise<void>;
    loadMaterialDetails: (id: number) => Promise<void>;
}

export const useStockData = (): StockData => {
    const [materials, setMaterials] = useState<MaterialWithStock[]>([]);
    const [edgeBands, setEdgeBands] = useState<EdgeBand[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [supplierStats, setSupplierStats] = useState({ suppliers: 0, products: 0, orders: 0 });

    const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
    const [isLoadingEdgeBands, setIsLoadingEdgeBands] = useState(true);
    const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);

    const [errors, setErrors] = useState<Record<string, string | null>>({});

    const abortControllers = useRef({
        materials: null as AbortController | null,
        edgeBands: null as AbortController | null,
        suppliers: null as AbortController | null,
    });

    const refreshMaterials = useCallback(async () => {
        if (abortControllers.current.materials) {
            abortControllers.current.materials.abort();
        }
        const controller = new AbortController();
        abortControllers.current.materials = controller;

        setIsLoadingMaterials(true);
        setErrors(prev => ({ ...prev, materials: null }));
        try {
            const data = await MaterialService.getAll(controller.signal);
            setMaterials(data);
        } catch (err: any) {
            if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
                const message = err instanceof Error ? err.message : 'Erreur chargement matériaux';
                setErrors(prev => ({ ...prev, materials: message }));
                console.error('Error loading materials:', err);
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsLoadingMaterials(false);
            }
        }
    }, []);

    const refreshEdgeBands = useCallback(async () => {
        if (abortControllers.current.edgeBands) {
            abortControllers.current.edgeBands.abort();
        }
        const controller = new AbortController();
        abortControllers.current.edgeBands = controller;

        setIsLoadingEdgeBands(true);
        setErrors(prev => ({ ...prev, edgeBands: null }));
        try {
            const data = await MaterialService.getEdgeBands(controller.signal);
            setEdgeBands(data);
        } catch (err: any) {
            if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
                const message = err instanceof Error ? err.message : 'Erreur chargement chants';
                setErrors(prev => ({ ...prev, edgeBands: message }));
                console.error('Error loading edge bands:', err);
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsLoadingEdgeBands(false);
            }
        }
    }, []);

    const refreshSuppliers = useCallback(async () => {
        if (abortControllers.current.suppliers) {
            abortControllers.current.suppliers.abort();
        }
        const controller = new AbortController();
        abortControllers.current.suppliers = controller;

        setIsLoadingSuppliers(true);
        setErrors(prev => ({ ...prev, suppliers: null }));
        try {
            const [data, stats] = await Promise.all([
                SupplierService.getAll(controller.signal),
                SupplierService.getStats(controller.signal)
            ]);
            setSuppliers(data);
            setSupplierStats(stats);
        } catch (err: any) {
            if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
                const message = err instanceof Error ? err.message : 'Erreur chargement fournisseurs';
                setErrors(prev => ({ ...prev, suppliers: message }));
                console.error('Error loading suppliers:', err);
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsLoadingSuppliers(false);
            }
        }
    }, []);

    const loadMaterialDetails = useCallback(async (id: number) => {
        try {
            const data = await MaterialService.getById(id);
            setMaterials(prev => prev.map(m => m.id === id ? data : m));
        } catch {
            console.error('Error loading material details');
        }
    }, []);

    const refreshAll = useCallback(async () => {
        await Promise.all([refreshMaterials(), refreshEdgeBands(), refreshSuppliers()]);
    }, [refreshMaterials, refreshEdgeBands, refreshSuppliers]);

    useEffect(() => {
        refreshAll();
        return () => {
            if (abortControllers.current.materials) abortControllers.current.materials.abort();
            if (abortControllers.current.edgeBands) abortControllers.current.edgeBands.abort();
            if (abortControllers.current.suppliers) abortControllers.current.suppliers.abort();
        };
    }, [refreshAll]);

    return {
        materials,
        edgeBands,
        suppliers,
        supplierStats,
        isLoadingMaterials,
        isLoadingEdgeBands,
        isLoadingSuppliers,
        errors,
        refreshMaterials,
        refreshEdgeBands,
        refreshSuppliers,
        refreshAll,
        loadMaterialDetails,
    };
};
