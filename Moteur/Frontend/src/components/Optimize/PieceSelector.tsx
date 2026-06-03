/**
 * PieceSelector Component
 * 
 * Filterable list of pieces from selected projects
 * Allows granular selection for multi-project optimization
 */

import { useState, useEffect } from 'react';
import { CheckSquare, Square, Filter, Search, Package } from 'lucide-react';
import api from '../../services/api';

interface Piece {
    id: number;
    project_id: number;
    name: string;
    width: number;
    height: number;
    quantity: number;
    material_id: number | null;
    material_name: string | null;
    material_thickness: number | null;
    material_species: string | null;
    is_panel: boolean;
    grain_direction: number;
    allow_rotation: boolean;
}

interface PieceSelectorProps {
    projectIds: number[];
    selectedPieceIds: number[];
    onSelectionChange: (pieceIds: number[]) => void;
    materialTypeFilter?: 'panel' | 'raw_wood' | null;
}

export function PieceSelector({
    projectIds,
    selectedPieceIds,
    onSelectionChange,
    materialTypeFilter = null
}: PieceSelectorProps) {
    const [pieces, setPieces] = useState<Piece[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        species: '',
        thickness: null as number | null,
        hasGrain: null as boolean | null
    });

    useEffect(() => {
        if (projectIds.length > 0) {
            loadPieces();
        } else {
            setPieces([]);
        }
    }, [projectIds, materialTypeFilter]);

    const loadPieces = async () => {
        setIsLoading(true);
        try {
            const response = await api.post('/projects/parts/filter', {
                project_ids: projectIds,
                material_type: materialTypeFilter
            });
            setPieces(response.data);
            // Auto-select all pieces initially
            onSelectionChange(response.data.map((p: Piece) => p.id));
        } catch (error) {
            console.error('Error loading pieces:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const togglePiece = (pieceId: number) => {
        if (selectedPieceIds.includes(pieceId)) {
            onSelectionChange(selectedPieceIds.filter(id => id !== pieceId));
        } else {
            onSelectionChange([...selectedPieceIds, pieceId]);
        }
    };

    const toggleAll = () => {
        if (selectedPieceIds.length === filteredPieces.length) {
            onSelectionChange([]);
        } else {
            onSelectionChange(filteredPieces.map(p => p.id));
        }
    };

    // Apply filters
    const filteredPieces = pieces.filter(piece => {
        const matchesSearch = piece.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSpecies = !filters.species || piece.material_species === filters.species;
        const matchesThickness = !filters.thickness || piece.material_thickness === filters.thickness;
        const matchesGrain = filters.hasGrain === null || (piece.grain_direction > 0) === filters.hasGrain;

        return matchesSearch && matchesSpecies && matchesThickness && matchesGrain;
    });

    // Group by project for better organization
    const piecesByProject = filteredPieces.reduce((acc, piece) => {
        if (!acc[piece.project_id]) {
            acc[piece.project_id] = [];
        }
        acc[piece.project_id].push(piece);
        return acc;
    }, {} as Record<number, Piece[]>);

    if (projectIds.length === 0) {
        return (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Sélectionnez un ou plusieurs projets pour voir les pièces
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sélection des Pièces ({selectedPieceIds.length}/{filteredPieces.length})
                </h3>
                <button
                    onClick={toggleAll}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                    {selectedPieceIds.length === filteredPieces.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Rechercher une pièce..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
            </div>

            {/* Filters */}
            {materialTypeFilter === 'raw_wood' && (
                <div className="flex gap-2 items-center text-xs">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select aria-label="Filtrer par essence"
                        value={filters.species || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, species: e.target.value }))}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    >
                        <option value="">Toutes essences</option>
                        {[...new Set(pieces.map(p => p.material_species).filter(Boolean))].map(species => (
                            <option key={species} value={species!}>{species}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Piece List */}
            <div className="max-h-96 overflow-y-auto space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                {isLoading ? (
                    <div className="text-center py-8 text-gray-500">Chargement...</div>
                ) : filteredPieces.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Aucune pièce trouvée</div>
                ) : (
                    Object.entries(piecesByProject).map(([projectId, projectPieces]) => (
                        <div key={projectId} className="space-y-2">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                Projet #{projectId}
                            </div>
                            {projectPieces.map(piece => {
                                const isSelected = selectedPieceIds.includes(piece.id);
                                const Icon = isSelected ? CheckSquare : Square;

                                return (
                                    <button
                                        key={piece.id}
                                        onClick={() => togglePiece(piece.id)}
                                        className={`
                      w-full flex items-center gap-3 p-3 rounded-lg border transition-all
                      ${isSelected
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                            }
                    `}
                                    >
                                        <Icon className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />

                                        <div className="flex-1 text-left">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm text-gray-900 dark:text-white">
                                                    {piece.name}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    ×{piece.quantity}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                {piece.height} × {piece.width} × {piece.material_thickness || '—'} mm
                                                {piece.material_name && (
                                                    <span className="ml-2">• {piece.material_name}</span>
                                                )}
                                                {piece.material_species && (
                                                    <span className="ml-1 px-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
                                                        {piece.material_species}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {piece.grain_direction > 0 && (
                                            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                                                {piece.grain_direction === 1 ? '↔' : '↕'}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
