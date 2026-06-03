/**
 * H Menuiserie - Serveur HTTPS Local
 * Pour développement et accès depuis téléphone
 * 
 * PRÉREQUIS:
 * 1. Installer Node.js
 * 2. Générer les certificats avec mkcert:
 *    mkcert -key-file key.pem -cert-file cert.pem localhost 192.168.1.46
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const HTTPS_PORT = 4443;
const HTTP_PORT = 4080;
const HOST = '0.0.0.0'; // Accessible sur tout le réseau

// Types MIME
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.webp': 'image/webp',
    '.webm': 'video/webm',
    '.mp4': 'video/mp4'
};

// Chemin de base
const BASE_DIR = __dirname;

/**
 * Gérer une requête
 */
function handleRequest(req, res) {
    let filePath = path.join(BASE_DIR, req.url === '/' ? 'index.html' : req.url);

    // Sécurité: empêcher accès en dehors du dossier
    if (!filePath.startsWith(BASE_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    // Servir le fichier
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Pour SPA: retourner index.html pour les routes non trouvées
                if (!ext || ext === '.html') {
                    fs.readFile(path.join(BASE_DIR, 'index.html'), (err2, data2) => {
                        if (err2) {
                            res.writeHead(404);
                            res.end('Not Found');
                        } else {
                            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                            res.end(data2);
                        }
                    });
                } else {
                    res.writeHead(404);
                    res.end('Not Found');
                }
            } else {
                res.writeHead(500);
                res.end('Internal Server Error');
            }
            return;
        }

        // En-têtes pour PWA
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Service Worker nécessite des en-têtes spécifiques
        if (filePath.endsWith('service-worker.js')) {
            res.setHeader('Service-Worker-Allowed', '/');
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

/**
 * Démarrer le serveur
 */
function startServer() {
    const certPath = path.join(BASE_DIR, 'cert.pem');
    const keyPath = path.join(BASE_DIR, 'key.pem');

    // Vérifier si les certificats existent
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        // Serveur HTTPS
        const options = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };

        const httpsServer = https.createServer(options, handleRequest);

        httpsServer.listen(HTTPS_PORT, HOST, () => {
            console.log('');
            console.log('╔══════════════════════════════════════════════════════════╗');
            console.log('║         H MENUISERIE - SERVEUR HTTPS DÉMARRÉ             ║');
            console.log('╠══════════════════════════════════════════════════════════╣');
            console.log('║                                                          ║');
            console.log(`║  📱 Depuis le téléphone:                                  ║`);
            console.log(`║     https://192.168.1.46:${HTTPS_PORT}                         ║`);
            console.log('║                                                          ║');
            console.log(`║  💻 Depuis le PC:                                         ║`);
            console.log(`║     https://localhost:${HTTPS_PORT}                            ║`);
            console.log('║                                                          ║');
            console.log('║  ⚠️  Accepter le certificat auto-signé sur le téléphone   ║');
            console.log('║                                                          ║');
            console.log('╚══════════════════════════════════════════════════════════╝');
            console.log('');
        });

    } else {
        // Pas de certificats - Serveur HTTP simple (dev only)
        console.log('');
        console.log('⚠️  ATTENTION: Certificats non trouvés!');
        console.log('');
        console.log('Pour générer les certificats HTTPS:');
        console.log('');
        console.log('  1. Installer mkcert: winget install FiloSottile.mkcert');
        console.log('  2. Installer le CA: mkcert -install');
        console.log('  3. Générer les certs: mkcert -key-file key.pem -cert-file cert.pem localhost 192.168.1.46');
        console.log('');
        console.log('Démarrage en mode HTTP (PWA limitée)...');
        console.log('');

        const httpServer = http.createServer(handleRequest);

        httpServer.listen(HTTP_PORT, HOST, () => {
            console.log(`🌐 Serveur HTTP démarré sur http://localhost:${HTTP_PORT}`);
            console.log(`📱 Depuis le téléphone: http://192.168.1.46:${HTTP_PORT}`);
            console.log('');
            console.log('⚠️  Mode HTTP: Installation PWA et caméra NON disponibles!');
            console.log('');
        });
    }
}

// Démarrer
startServer();
