/**
 * PolygonViewer Component
 * 
 * SVG-based visualization for raw wood cutting plans
 * Shows piece placements, grain direction, and defects
 */

import { AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
import { useState, useId } from 'react';

interface Point {
    x: number;
    y: number;
}

interface Defect {
    type: 'knot' | 'crack' | 'split' | 'other';
    polygon: Point[];
}

interface PlacedPiece {
    id: number;
    name: string;
    polygon: Point[];
    rotation: number;
    grain_direction: number;
    color?: string;
}

interface PolygonViewerProps {
    boardWidth: number;
    boardHeight: number;
    pieces: PlacedPiece[];
    defects?: Defect[];
    title?: string;
    showGrid?: boolean;
}

export function PolygonViewer({
    boardWidth,
    boardHeight,
    pieces,
    defects = [],
    title = 'Plan de Découpe',
    showGrid = true
}: PolygonViewerProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [hoveredPiece, setHoveredPiece] = useState<number | null>(null);
    const reactId = useId();

    // Calculate viewBox with padding
    const padding = Math.max(boardWidth, boardHeight) * 0.05;
    const viewBox = `${-padding} ${-padding} ${boardWidth + 2 * padding} ${boardHeight + 2 * padding}`;

    // Convert polygon points to SVG path with robustness checks
    const polygonToPath = (item: any): string => {
        // 1. Check for 'polygon' (array of Point objects)
        if (item.polygon && Array.isArray(item.polygon) && item.polygon.length >= 3) {
            const commands = item.polygon
                .filter((p: any) => !isNaN(p.x) && !isNaN(p.y) && isFinite(p.x) && isFinite(p.y))
                .map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`);
            if (commands.length >= 3) return commands.join(' ') + ' Z';
        }

        // 2. Check for 'polygon_coords' (array of [number, number] tuples)
        const coords = item.polygon_coords;
        if (coords && Array.isArray(coords) && coords.length >= 3) {
            const commands = coords
                .map((pt: any, i: number) => {
                    const x = Array.isArray(pt) ? pt[0] : pt.x;
                    const y = Array.isArray(pt) ? pt[1] : pt.y;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                });
            return commands.join(' ') + ' Z';
        }

        // 3. Fallback to rectangular representation if x, y, width, height are available
        if (item.width > 0 && item.height > 0) {
            const x = item.x ?? 0;
            const y = item.y ?? 0;
            const w = item.width;
            const h = item.height;
            return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
        }

        return '';
    };

    // Get defect color based on type
    const getDefectColor = (type: string): string => {
        switch (type) {
            case 'knot': return '#DC2626'; // red-600
            case 'crack': return '#EA580C'; // orange-600
            case 'split': return '#D97706'; // amber-600
            default: return '#7C2D12'; // orange-900
        }
    };

    // Grid lines
    const gridStep = 100; // 100mm grid
    const gridLines = [];
    if (showGrid) {
        for (let x = 0; x <= boardWidth; x += gridStep) {
            gridLines.push(
                <line
                    key={`${reactId}-vgrid-${x}`}
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={boardHeight}
                    stroke="#e5e7eb"
                    strokeWidth="0.5"
                    strokeDasharray="5,5"
                />
            );
        }
        for (let y = 0; y <= boardHeight; y += gridStep) {
            gridLines.push(
                <line
                    key={`${reactId}-hgrid-${y}`}
                    x1={0}
                    y1={y}
                    x2={boardWidth}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="0.5"
                    strokeDasharray="5,5"
                />
            );
        }
    }

    return (
        <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 p-8' : 'relative'}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                        {title}
                        {defects.length > 0 && (
                            <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                <AlertTriangle className="w-4 h-4" />
                                {defects.length} défaut{defects.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {boardWidth} × {boardHeight} mm • {pieces.length} pièce{pieces.length > 1 ? 's' : ''}
                    </p>
                </div>
                <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title={isFullscreen ? 'Réduire' : 'Plein écran'}
                >
                    {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
            </div>

            {/* SVG Canvas */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
                <svg
                    viewBox={viewBox}
                    className="w-full h-auto"
                >
                    {/* Grid */}
                    {gridLines}

                    {/* Board outline */}
                    <rect
                        key={`${reactId}-outline`}
                        x={0}
                        y={0}
                        width={boardWidth}
                        height={boardHeight}
                        fill="rgba(55, 65, 81, 0.05)"
                        stroke="#374151"
                        strokeWidth="3"
                    />

                    {/* Defects layer (drawn first, underneath pieces) */}
                    {defects.map((defect, index) => (
                        <g key={`${reactId}-defect-${index}`}>
                            <path
                                d={polygonToPath(defect)}
                                fill={getDefectColor(defect.type)}
                                fillOpacity="0.3"
                                stroke={getDefectColor(defect.type)}
                                strokeWidth="2"
                            />
                            <title>{`Défaut: ${defect.type}`}</title>
                        </g>
                    ))}

                    {/* Placed pieces */}
                    {pieces.map((piece) => {
                        const isHovered = hoveredPiece === piece.id;
                        const color = piece.color || '#3B82F6'; // blue-500 by default

                        return (
                            <g
                                key={`${reactId}-piece-${piece.id}`}
                                onMouseEnter={() => setHoveredPiece(piece.id)}
                                onMouseLeave={() => setHoveredPiece(null)}
                                className="cursor-pointer"
                            >
                                {/* Piece polygon */}
                                <path
                                    key={`${reactId}-piece-path-${piece.id}`}
                                    d={polygonToPath(piece)}
                                    fill={color}
                                    fillOpacity={isHovered ? 0.8 : 0.6}
                                    stroke={isHovered ? '#1E40AF' : '#1F2937'}
                                    strokeWidth={isHovered ? 3 : 2}
                                />
                                {polygonToPath(piece) === '' && (
                                    <rect
                                        x={0} y={0} width={20} height={20}
                                        fill="red"
                                    >
                                        <title>Erreur de géométrie</title>
                                    </rect>
                                )}

                                {/* Grain direction indicator */}
                                {piece.grain_direction > 0 && (
                                    <>
                                        {/* Calculate center of polygon */}
                                        {(() => {
                                            const centerX = piece.polygon.reduce((sum, p) => sum + p.x, 0) / piece.polygon.length;
                                            const centerY = piece.polygon.reduce((sum, p) => sum + p.y, 0) / piece.polygon.length;
                                            const arrowLength = 30;

                                            return (
                                                <g>
                                                    {/* Grain line */}
                                                    <line
                                                        x1={piece.grain_direction === 1 ? centerX - arrowLength : centerX}
                                                        y1={piece.grain_direction === 1 ? centerY : centerY - arrowLength}
                                                        x2={piece.grain_direction === 1 ? centerX + arrowLength : centerX}
                                                        y2={piece.grain_direction === 1 ? centerY : centerY + arrowLength}
                                                        stroke="#059669"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                    />
                                                    {/* Arrow head */}
                                                    <polygon
                                                        points={
                                                            piece.grain_direction === 1
                                                                ? `${centerX + arrowLength},${centerY} ${centerX + arrowLength - 8},${centerY - 4} ${centerX + arrowLength - 8},${centerY + 4}`
                                                                : `${centerX},${centerY + arrowLength} ${centerX - 4},${centerY + arrowLength - 8} ${centerX + 4},${centerY + arrowLength - 8}`
                                                        }
                                                        fill="#059669"
                                                    />
                                                </g>
                                            );
                                        })()}
                                    </>
                                )}

                                {/* Piece label */}
                                {(() => {
                                    const centerX = piece.polygon.reduce((sum, p) => sum + p.x, 0) / piece.polygon.length;
                                    const centerY = piece.polygon.reduce((sum, p) => sum + p.y, 0) / piece.polygon.length;

                                    return (
                                        <text
                                            x={centerX}
                                            y={centerY}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fill="#FFFFFF"
                                            fontSize={Math.min(boardWidth, boardHeight) * 0.05}
                                            fontWeight="bold"
                                            className="pointer-events-none select-none"
                                            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                                        >
                                            {piece.name}
                                        </text>
                                    );
                                })()}

                                {/* Tooltip */}
                                <title>
                                    {`${piece.name}\nRotation: ${piece.rotation}°\nFil: ${piece.grain_direction === 1 ? 'Horizontal' : piece.grain_direction === 2 ? 'Vertical' : 'Aucun'}`}
                                </title>
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 opacity-60 rounded"></div>
                    <span>Pièces placées</span>
                </div>
                {defects.length > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-600 opacity-30 rounded"></div>
                        <span>Défauts détectés</span>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <div className="w-6 h-1 bg-green-600 rounded"></div>
                    <span>→ Direction du fil</span>
                </div>
            </div>
        </div>
    );
}
