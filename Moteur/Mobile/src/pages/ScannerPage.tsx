import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, Package, FolderOpen, Scissors, X, Check, AlertTriangle } from 'lucide-react';
import { stockApi } from '../services/api.ts';
import type { QRScanResult } from '../services/api.ts';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function ScannerPage() {
    const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isConsuming, setIsConsuming] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const navigate = useNavigate();

    const onScanSuccess = useCallback(async (decodedText: string) => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
            } catch (err) {
                console.error('Stop error:', err);
            }
        }
        toast.success('QR Code détecté !');

        // Haptic feedback for a pro feel
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }

        try {
            const response = await stockApi.getByQR(decodedText);
            setScanResult(response.data);
        } catch {
            toast.error('Planche non trouvée dans le système');
            setScanResult(null);
        }
    }, []);

    const startScanning = useCallback(async () => {
        try {
            setError(null);
            const scanner = new Html5Qrcode('qr-reader');
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 280, height: 280 },
                    aspectRatio: 1
                },
                onScanSuccess,
                () => { } // Ignore failures
            );
        } catch (err) {
            console.error('Camera error:', err);
            setError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
        }
    }, [onScanSuccess]);

    useEffect(() => {
        startScanning();
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, [startScanning]);

    const handleMarkUsed = async () => {
        if (!scanResult?.stock_item) return;

        try {
            await stockApi.markUsed(scanResult.stock_item.id);
            toast.success('Planche marquée comme utilisée !');
            closeScanResult();
        } catch {
            toast.error('Erreur lors de la mise à jour');
        }
    };

    const handleConsumeBoard = async () => {
        if (!scanResult?.stock_item) return;

        setIsConsuming(true);
        try {
            const resp = await stockApi.consumeBoard(
                scanResult.stock_item.id,
                scanResult.optimization?.id
            );
            toast.success(resp.data.message || 'Découpe validée et chutes créées !');
            closeScanResult();
        } catch {
            toast.error('Erreur lors de la validation de la découpe');
        } finally {
            setIsConsuming(false);
        }
    };

    const handleViewOptimization = () => {
        if (scanResult?.linked_project) {
            navigate(`/optimizations/${scanResult.linked_project.id}`);
        }
        closeScanResult();
    };

    const closeScanResult = () => {
        setScanResult(null);
        startScanning();
    };

    return (
        <div className="scanner-container">
            <div id="qr-reader" className="wh-full" />

            {error ? (
                <div className="scanner-overlay">
                    <div className="scanner-error-box">
                        <AlertTriangle size={48} color="var(--warning)" />
                        <p className="mt-4">{error}</p>
                        <button
                            className="btn btn-primary mt-4"
                            onClick={startScanning}
                        >
                            Réessayer
                        </button>
                    </div>
                </div>
            ) : (
                <div className="scanner-overlay">
                    <div className="scanner-frame" />
                    <div className="scanner-line" />
                    <p className="scanner-hint">
                        <QrCode size={20} className="mr-2 align-middle" />
                        Scannez le QR code sur la planche
                    </p>
                </div>
            )}

            {/* Scan Result Modal */}
            {scanResult && (
                <div className="scan-result-modal" onClick={closeScanResult}>
                    <div
                        className="scan-result-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={closeScanResult}
                            className="modal-close-btn"
                            title="Fermer"
                        >
                            <X size={24} />
                        </button>

                        <div className="result-header">
                            <div className="result-icon">
                                <Package size={32} />
                            </div>
                            <div>
                                <div className="result-title">
                                    {scanResult.stock_item.material?.name || 'Matériau'}
                                </div>
                                <div className="result-subtitle">
                                    Stock #{scanResult.stock_item.id}
                                </div>
                            </div>
                        </div>

                        <div className="result-section">
                            <div className="result-section-title">Détails Techniques</div>
                            <div className="result-info-row">
                                <span className="result-info-label">Dimensions</span>
                                <span className="result-info-value">
                                    {scanResult.stock_item.width} x {scanResult.stock_item.height} mm
                                </span>
                            </div>
                            <div className="result-info-row">
                                <span className="result-info-label">Épaisseur</span>
                                <span className="result-info-value">
                                    {scanResult.stock_item.material?.thickness || '?'} mm
                                </span>
                            </div>
                            <div className="result-info-row">
                                <span className="result-info-label">Quantité disponible</span>
                                <span className="result-info-value">
                                    {scanResult.stock_item.quantity} {scanResult.stock_item.quantity > 1 ? 'unités' : 'unité'}
                                </span>
                            </div>
                            <div className="result-info-row">
                                <span className="result-info-label">Type de pièce</span>
                                <span className="result-info-value">
                                    {scanResult.stock_item.is_offcut ? 'Chute (Offcut)' : 'Panneau Standard'}
                                </span>
                            </div>
                        </div>

                        {scanResult.linked_project && (
                            <div className="result-section">
                                <div className="result-section-title">Projet assigné</div>
                                <div
                                    className="result-project-link"
                                    onClick={handleViewOptimization}
                                >
                                    <FolderOpen size={24} color="var(--primary)" />
                                    <div>
                                        <div className="result-project-name">
                                            {scanResult.linked_project.name}
                                        </div>
                                        <div className="result-project-hint">
                                            Tap pour voir le plan de découpe
                                        </div>
                                    </div>
                                    <Scissors size={20} className="result-project-arrow" />
                                </div>
                            </div>
                        )}

                        {scanResult.optimization && scanResult.optimization.offcuts && scanResult.optimization.offcuts.length > 0 && (
                            <div className="result-section">
                                <div className="result-section-title">Chutes à récupérer ({scanResult.optimization.offcuts.length})</div>
                                {scanResult.optimization.offcuts.map((offcut, idx) => (
                                    <div key={idx} className="offcut-row">
                                        <div className="flex-center-gap-sm">
                                            <Scissors size={14} />
                                            <span>Chute #{idx + 1}</span>
                                        </div>
                                        <span className="result-info-value ml-auto">
                                            {Math.round(offcut.width)} x {Math.round(offcut.height)} mm
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="result-actions">
                            {scanResult.optimization ? (
                                <button
                                    className="btn btn-primary btn-large"
                                    onClick={handleConsumeBoard}
                                    disabled={isConsuming}
                                >
                                    {isConsuming ? (
                                        <div className="spinner spinner-sm" />
                                    ) : (
                                        <>
                                            <Scissors size={20} />
                                            Découper & Stocker Chutes
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    className="btn btn-primary"
                                    onClick={handleMarkUsed}
                                >
                                    <Check size={20} />
                                    Marquer utilisée
                                </button>
                            )}
                            <button
                                className="btn btn-secondary"
                                onClick={closeScanResult}
                                disabled={isConsuming}
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
