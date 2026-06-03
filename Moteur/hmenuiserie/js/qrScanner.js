/**
 * H Menuiserie - QR Scanner
 * Lecture de QR codes avec caméra
 */

const QRScanner = {
    scanner: null,
    isScanning: false,

    /**
     * Démarrer le scanner
     */
    async start() {
        if (this.isScanning) {
            console.log('[QRScanner] Déjà en cours');
            return;
        }

        const readerElement = document.getElementById('qr-reader');
        if (!readerElement) {
            console.error('[QRScanner] Element #qr-reader non trouvé');
            return;
        }

        try {
            // Vérifier si Html5Qrcode est disponible
            if (typeof Html5Qrcode === 'undefined') {
                throw new Error('Librairie Html5Qrcode non chargée');
            }

            this.scanner = new Html5Qrcode('qr-reader');

            await this.scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 280, height: 280 },
                    aspectRatio: 1
                },
                this.onScanSuccess.bind(this),
                this.onScanFailure.bind(this)
            );

            this.isScanning = true;
            console.log('[QRScanner] Démarré');

        } catch (error) {
            console.error('[QRScanner] Erreur démarrage:', error);
            this.showCameraError(error.message);
        }
    },

    /**
     * Arrêter le scanner
     */
    async stop() {
        if (!this.scanner || !this.isScanning) {
            return;
        }

        try {
            await this.scanner.stop();
            this.isScanning = false;
            console.log('[QRScanner] Arrêté');
        } catch (error) {
            console.error('[QRScanner] Erreur arrêt:', error);
        }
    },

    /**
     * Callback quand un QR code est détecté
     */
    async onScanSuccess(decodedText) {
        console.log('[QRScanner] QR détecté:', decodedText);

        // Arrêter le scanner
        await this.stop();

        // Feedback haptique
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }

        // Feedback sonore (optionnel)
        this.playBeep();

        // Toast de confirmation
        window.showToast?.('QR Code détecté !', 'success');

        // Rechercher les infos de la planche
        await this.lookupQRCode(decodedText);
    },

    /**
     * Callback pour les échecs de scan (normal, on ignore)
     */
    onScanFailure(error) {
        // Ignorer les erreurs de scan normales
        // Elles sont fréquentes quand rien n'est en vue
    },

    /**
     * Rechercher les informations d'un QR code
     */
    async lookupQRCode(qrCode) {
        try {
            const result = await Api.scanQRCode(qrCode);

            if (result && result.stock_item) {
                window.showScanResult?.(result);
            } else {
                window.showToast?.('Planche non trouvée dans le système', 'error');
                this.start(); // Redémarrer le scanner
            }
        } catch (error) {
            console.error('[QRScanner] Erreur lookup:', error);

            // Essayer le cache local
            const cachedResult = this.lookupFromCache(qrCode);
            if (cachedResult) {
                window.showToast?.('Données hors-ligne', 'info');
                window.showScanResult?.(cachedResult);
            } else {
                window.showToast?.('Planche non trouvée', 'error');
                this.start(); // Redémarrer le scanner
            }
        }
    },

    /**
     * Rechercher dans le cache local (stock)
     */
    lookupFromCache(qrCode) {
        const stock = window.AppState?.stock || [];
        const item = stock.find(s => s.qr_code === qrCode);

        if (item) {
            return { stock_item: item };
        }

        return null;
    },

    /**
     * Afficher une erreur de caméra
     */
    showCameraError(message) {
        const readerElement = document.getElementById('qr-reader');

        // Masquer l'overlay de scan
        const overlay = document.querySelector('.scanner-overlay');
        if (overlay) {
            overlay.innerHTML = `
                <div style="text-align: center; padding: 32px; color: var(--text-secondary);">
                    <svg style="width: 48px; height: 48px; margin-bottom: 16px; color: var(--warning);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <p style="margin-bottom: 16px;">Impossible d'accéder à la caméra</p>
                    <p style="font-size: 14px; margin-bottom: 24px;">${message || 'Vérifiez les permissions'}</p>
                    <button class="btn btn-primary" onclick="QRScanner.start()">
                        Réessayer
                    </button>
                </div>
            `;
        }
    },

    /**
     * Jouer un son de confirmation
     */
    playBeep() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 1000;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            // Ignorer les erreurs audio
        }
    },

    /**
     * Vérifier si l'appareil a une caméra
     */
    async hasCamera() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(device => device.kind === 'videoinput');
        } catch {
            return false;
        }
    }
};

// Export global
window.QRScanner = QRScanner;
