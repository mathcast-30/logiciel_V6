/**
 * H Menuiserie - Application Principale
 * PWA Atelier avec navigation SPA et gestion offline
 */

// ============================================
// CONFIGURATION
// ============================================

const APP_CONFIG = {
    version: '1.0.0',
    apiBaseUrl: '', // Sera défini dynamiquement
    reconnectInterval: 10000, // 10 secondes
    toastDuration: 4000
};

// ============================================
// ÉTAT GLOBAL
// ============================================

const AppState = {
    isOnline: navigator.onLine,
    isConnectedToPC: false,
    currentView: 'projects',
    scanResult: null,
    scanner: null,

    // Données cachées
    projects: [],
    clients: [],
    stock: [],
    suppliers: [],
    optimizations: [],
    orders: []
};

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[App] Démarrage H Menuiserie v' + APP_CONFIG.version);

    // Détecter l'URL de l'API (même IP que la page)
    detectApiUrl();

    // Enregistrer le Service Worker
    await registerServiceWorker();

    // Configurer les événements réseau
    setupNetworkListeners();

    // Configurer la navigation
    setupNavigation();

    // Configurer les filtres
    setupFilters();
    setupStockTabs();
    setupOrderFilters();

    // Configurer la modal
    setupModal();

    // Charger les données initiales
    await loadInitialData();

    // Vérifier la connexion PC
    checkPCConnection();

    // Démarrer la vérification périodique
    startReconnectionLoop();

    // Traiter les paramètres URL
    handleUrlParams();

    console.log('[App] Initialisation terminée');
});

/**
 * Détecter l'URL de l'API basée sur l'hôte actuel
 */
function detectApiUrl() {
    const host = window.location.hostname;
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';

    // Si on est sur localhost, utiliser localhost pour l'API aussi
    // Sinon utiliser la même IP (le serveur HTTPS sert aussi de proxy ou l'API est sur le même hôte)
    APP_CONFIG.apiBaseUrl = isLocalhost
        ? 'http://localhost:8000/api'
        : `https://${host}:8000/api`;

    console.log('[App] API URL:', APP_CONFIG.apiBaseUrl);
}

/**
 * Enregistrer le Service Worker
 */
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('[App] Service Worker enregistré:', registration.scope);

            // Écouter les mises à jour
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdatePrompt();
                    }
                });
            });

            // Écouter les messages du SW
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'SYNC_REQUIRED') {
                    SyncQueue.processQueue();
                }
            });

        } catch (error) {
            console.error('[App] Erreur Service Worker:', error);
        }
    }
}

/**
 * Afficher le prompt de mise à jour
 */
function showUpdatePrompt() {
    const prompt = document.getElementById('update-prompt');
    prompt.classList.remove('hidden');

    document.getElementById('update-btn').addEventListener('click', () => {
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }
        window.location.reload();
    });

    document.getElementById('update-close').addEventListener('click', () => {
        prompt.classList.add('hidden');
    });
}

// ============================================
// RÉSEAU & CONNECTIVITÉ
// ============================================

function setupNetworkListeners() {
    window.addEventListener('online', () => {
        console.log('[App] Connexion réseau rétablie');
        AppState.isOnline = true;
        updateOfflineBanner();

        // Synchroniser les actions en attente
        SyncQueue.processQueue();

        // Recharger les données
        loadInitialData();

        showToast('Connexion rétablie', 'success');
    });

    window.addEventListener('offline', () => {
        console.log('[App] Connexion réseau perdue');
        AppState.isOnline = false;
        AppState.isConnectedToPC = false;
        updateOfflineBanner();

        showToast('Mode hors-ligne activé', 'warning');
    });
}

function updateOfflineBanner() {
    const banner = document.getElementById('offline-banner');
    banner.classList.toggle('hidden', AppState.isOnline);
}

function updateSyncBanner() {
    const banner = document.getElementById('sync-banner');
    const count = SyncQueue.getCount();

    if (count > 0) {
        document.getElementById('sync-count').textContent =
            count === 1 ? '1 action en attente' : `${count} actions en attente`;
        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
    }
}

/**
 * Vérifier la connexion au PC
 */
async function checkPCConnection() {
    try {
        const response = await Api.healthCheck();
        AppState.isConnectedToPC = response.ok;

        if (AppState.isConnectedToPC) {
            console.log('[App] Connecté au PC');
        }
    } catch (error) {
        AppState.isConnectedToPC = false;
    }
}

/**
 * Boucle de reconnexion automatique
 */
function startReconnectionLoop() {
    setInterval(async () => {
        if (!AppState.isOnline) return;

        const wasConnected = AppState.isConnectedToPC;
        await checkPCConnection();

        // Si on vient de se reconnecter
        if (!wasConnected && AppState.isConnectedToPC) {
            console.log('[App] Reconnexion au PC détectée');
            showToast('Connecté au PC', 'success');

            // Synchroniser et recharger
            await SyncQueue.processQueue();
            await loadInitialData();
        }

        updateSyncBanner();
    }, APP_CONFIG.reconnectInterval);
}

// ============================================
// NAVIGATION SPA
// ============================================

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewName = item.dataset.view;
            navigateTo(viewName);
        });
    });
}

function navigateTo(viewName) {
    // Masquer toutes les vues
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    // Afficher la vue demandée
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
        targetView.classList.add('active');
    }

    // Mettre à jour la navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Mettre à jour l'état
    AppState.currentView = viewName;

    // Actions spécifiques à la vue
    if (viewName === 'scanner') {
        QRScanner.start();
    } else {
        QRScanner.stop();
    }

    // Mettre à jour l'URL sans recharger
    const url = new URL(window.location);
    url.searchParams.set('view', viewName);
    history.replaceState({}, '', url);
}

function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');

    if (view && ['projects', 'scanner', 'stock', 'optimizations', 'clients'].includes(view)) {
        navigateTo(view);
    }
}

// ============================================
// FILTRES
// ============================================

function setupFilters() {
    // Filtres de stock
    const stockFilters = document.querySelectorAll('#view-stock .pill-btn');
    stockFilters.forEach(btn => {
        btn.addEventListener('click', () => {
            stockFilters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterStock(btn.dataset.filter);
        });
    });

    // Recherche de stock
    const stockSearch = document.getElementById('stock-search');
    stockSearch.addEventListener('input', (e) => {
        filterStock(document.querySelector('#view-stock .pill-btn.active').dataset.filter, e.target.value);
    });
}

function filterStock(filter, search = '') {
    let filtered = [...AppState.stock];

    // Appliquer le filtre
    if (filter === 'low') {
        filtered = filtered.filter(s => s.quantity <= 2);
    } else if (filter === 'offcuts') {
        filtered = filtered.filter(s => s.is_offcut);
    }

    // Appliquer la recherche
    if (search.trim()) {
        const term = search.toLowerCase();
        filtered = filtered.filter(s =>
            (s.material?.name || '').toLowerCase().includes(term) ||
            (s.label || '').toLowerCase().includes(term)
        );
    }

    renderStockList(filtered);
}

// ============================================
// MODAL SCAN
// ============================================

function setupModal() {
    const modal = document.getElementById('scan-modal');
    const backdrop = modal.querySelector('.modal-backdrop');
    const closeBtn = document.getElementById('modal-close');
    const cancelBtn = document.getElementById('btn-cancel-scan');

    const closeModal = () => {
        modal.classList.add('hidden');
        AppState.scanResult = null;
        QRScanner.start();
    };

    backdrop.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Actions
    document.getElementById('btn-mark-used').addEventListener('click', handleMarkUsed);
    document.getElementById('btn-consume').addEventListener('click', handleConsumeBoard);
}

async function handleMarkUsed() {
    if (!AppState.scanResult) return;

    const btn = document.getElementById('btn-mark-used');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm"></div>';

    try {
        await Api.markStockUsed(AppState.scanResult.stock_item.id);
        showToast('Planche marquée comme utilisée', 'success');
        closeScanModal();
        await loadStock();
    } catch (error) {
        // Ajouter à la file d'attente si hors-ligne
        if (!AppState.isOnline) {
            SyncQueue.add('markUsed', { stockId: AppState.scanResult.stock_item.id });
            showToast('Action enregistrée (synchronisation en attente)', 'info');
            closeScanModal();
        } else {
            showToast('Erreur lors de la mise à jour', 'error');
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Marquer utilisée
        `;
    }
}

async function handleConsumeBoard() {
    if (!AppState.scanResult) return;

    const btn = document.getElementById('btn-consume');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm"></div>';

    try {
        await Api.consumeBoard(
            AppState.scanResult.stock_item.id,
            AppState.scanResult.optimization?.id
        );
        showToast('Découpe validée et chutes créées !', 'success');
        closeScanModal();
        await loadStock();
    } catch (error) {
        if (!AppState.isOnline) {
            SyncQueue.add('consumeBoard', {
                stockId: AppState.scanResult.stock_item.id,
                optimizationId: AppState.scanResult.optimization?.id
            });
            showToast('Action enregistrée (synchronisation en attente)', 'info');
            closeScanModal();
        } else {
            showToast('Erreur lors de la validation', 'error');
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="6" cy="6" r="3"></circle>
                <circle cx="6" cy="18" r="3"></circle>
                <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
                <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
                <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
            </svg>
            Découper & Stocker Chutes
        `;
    }
}

function closeScanModal() {
    document.getElementById('scan-modal').classList.add('hidden');
    AppState.scanResult = null;
    QRScanner.start();
    updateSyncBanner();
}

function showScanResult(result) {
    AppState.scanResult = result;

    const modal = document.getElementById('scan-modal');
    const item = result.stock_item;

    // Remplir les données
    document.getElementById('result-material').textContent = item.material?.name || 'Matériau inconnu';
    document.getElementById('result-id').textContent = `Stock #${item.id}`;
    document.getElementById('result-dimensions').textContent = `${item.width} x ${item.height} mm`;
    document.getElementById('result-thickness').textContent = `${item.material?.thickness || '?'} mm`;
    document.getElementById('result-quantity').textContent = `${item.quantity} ${item.quantity > 1 ? 'unités' : 'unité'}`;
    document.getElementById('result-type').textContent = item.is_offcut ? 'Chute (Offcut)' : 'Panneau Standard';

    // Section projet
    const projectSection = document.getElementById('result-project-section');
    if (result.linked_project) {
        projectSection.classList.remove('hidden');
        document.getElementById('result-project-name').textContent = result.linked_project.name;

        document.getElementById('result-project-link').onclick = () => {
            closeScanModal();
            navigateTo('optimizations');
            // TODO: filtrer par projet
        };
    } else {
        projectSection.classList.add('hidden');
    }

    // Section chutes
    const offcutsSection = document.getElementById('result-offcuts-section');
    const offcutsList = document.getElementById('result-offcuts-list');
    if (result.optimization?.offcuts?.length > 0) {
        offcutsSection.classList.remove('hidden');
        offcutsSection.querySelector('.result-section-title').textContent =
            `Chutes à récupérer (${result.optimization.offcuts.length})`;

        offcutsList.innerHTML = result.optimization.offcuts.map((offcut, idx) => `
            <div class="offcut-row">
                <div style="display:flex;align-items:center;gap:8px">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px">
                        <circle cx="6" cy="6" r="3"></circle>
                        <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
                    </svg>
                    <span>Chute #${idx + 1}</span>
                </div>
                <span class="result-info-value">${Math.round(offcut.width)} x ${Math.round(offcut.height)} mm</span>
            </div>
        `).join('');
    } else {
        offcutsSection.classList.add('hidden');
    }

    // Boutons d'action
    const consumeBtn = document.getElementById('btn-consume');
    const markUsedBtn = document.getElementById('btn-mark-used');

    if (result.optimization) {
        consumeBtn.classList.remove('hidden');
        markUsedBtn.classList.add('hidden');
    } else {
        consumeBtn.classList.add('hidden');
        markUsedBtn.classList.remove('hidden');
    }

    // Afficher la modal
    modal.classList.remove('hidden');
}

// ============================================
// CHARGEMENT DES DONNÉES
// ============================================

async function loadInitialData() {
    console.log('[App] Chargement des données...');

    await Promise.all([
        loadProjects(),
        loadClients(),
        loadStock(),
        loadSuppliers(),
        loadOptimizations(),
        loadOrders()
    ]);

    console.log('[App] Données chargées');
}

async function loadProjects() {
    try {
        const data = await Api.getProjects();
        AppState.projects = data;
        renderProjectsList(data);
    } catch (error) {
        console.error('[App] Erreur chargement projets:', error);
        renderEmptyState('projects-list', 'Impossible de charger les projets');
    }
}

async function loadClients() {
    try {
        const data = await Api.getClients();
        AppState.clients = data;
        renderClientsList(data);
    } catch (error) {
        console.error('[App] Erreur chargement clients:', error);
        renderEmptyState('clients-list', 'Impossible de charger les clients');
    }
}

async function loadStock() {
    try {
        const data = await Api.getStock();
        AppState.stock = data;
        renderStockList(data);
    } catch (error) {
        console.error('[App] Erreur chargement stock:', error);
        renderEmptyState('stock-list', 'Impossible de charger le stock');
    }
}

async function loadOptimizations() {
    try {
        // Charger les optimisations pour tous les projets
        const allOptimizations = [];
        for (const project of AppState.projects) {
            try {
                const opts = await Api.getOptimizationsByProject(project.id);
                opts.forEach(o => o.project = project);
                allOptimizations.push(...opts);
            } catch (e) {
                // Ignorer les erreurs par projet
            }
        }
        AppState.optimizations = allOptimizations;
        renderOptimizationsList(allOptimizations);
    } catch (error) {
        console.error('[App] Erreur chargement optimisations:', error);
        renderEmptyState('optimizations-list', 'Impossible de charger les découpes');
    }
}

// ============================================
// CALCUL BESOINS (Needs)
// ============================================

window.openNeedsModal = async function (projectId, projectName) {
    // Check if modal exists, if not create it (lazy load for cleaner HTML)
    let modal = document.getElementById('needs-modal');
    if (!modal) {
        // Create modal URL
        const modalHtml = `
        <div id="needs-modal" class="modal hidden">
            <div class="modal-backdrop"></div>
            <div class="modal-content" style="max-width: 600px;">
                <button id="needs-modal-close" class="modal-close">
                   <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <header class="page-header"><h2 class="page-title">Besoins : <span id="needs-project-title"></span></h2></header>
                <div id="needs-loading" class="loading"><div class="spinner"></div></div>
                <div id="needs-list" class="card-list"></div>
                <div class="result-actions" style="margin-top:20px">
                    <button class="btn btn-primary" onclick="navigateTo('optimizations')">Aller aux Découpes</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modal = document.getElementById('needs-modal');

        // Setup close
        const closeBtn = document.getElementById('needs-modal-close');
        modal.querySelector('.modal-backdrop').addEventListener('click', () => modal.classList.add('hidden'));
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    // Open
    modal.classList.remove('hidden');
    document.getElementById('needs-project-title').textContent = projectName;
    document.getElementById('needs-loading').classList.remove('hidden');
    document.getElementById('needs-list').innerHTML = '';

    try {
        const needs = await Api.request(`/optimize/needs/${projectId}`);
        document.getElementById('needs-loading').classList.add('hidden');

        if (!needs || needs.length === 0) {
            document.getElementById('needs-list').innerHTML = '<div class="empty-state">Aucun matériau requis (ou vide)</div>';
            return;
        }

        document.getElementById('needs-list').innerHTML = needs.map(item => `
            <div class="card" style="border-left: 4px solid ${item.status === 'ok' ? 'var(--success)' : 'var(--danger)'}">
                <div class="flex-between mb-md">
                    <div style="font-weight:700">${escapeHtml(item.material_name)}</div>
                    <div class="status-badge ${item.status === 'ok' ? 'active' : 'pending'}">
                        ${item.status === 'ok' ? 'Stock OK' : 'Manquant'}
                    </div>
                </div>
                <div class="grid-2-col" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:var(--font-size-sm)">
                    <div>
                        <div class="text-muted">Besoin Total</div>
                        <div style="font-weight:600">${item.required_area_m2} m²</div>
                        <div class="text-muted">(${item.parts_count} pièces)</div>
                    </div>
                    <div>
                        <div class="text-muted">En Stock</div>
                        <div style="font-weight:600">${item.stock_area_m2} m²</div>
                        <div class="text-muted">(${item.stock_count_panels} panneaux)</div>
                    </div>
                </div>
                ${item.status !== 'ok' ? `
                    <div class="mt-md pt-md" style="border-top:1px solid var(--bg-tertiary)">
                        <div class="text-danger flex-center" style="justify-content:flex-start;gap:8px">
                            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            Manque env. ${item.estimated_missing_m2} m² + perte
                        </div>
                        <button class="btn btn-secondary small mt-sm" style="width:100%" 
                                onclick="document.getElementById('needs-modal').classList.add('hidden'); openSimulationModal(${item.material_id}, '${escapeHtml(item.material_name)}')">
                            Simuler Achat
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');

    } catch (e) {
        console.error(e);
        document.getElementById('needs-loading').classList.add('hidden');
        showToast("Erreur calcul besoins", "error");
    }
};

function renderProjectsList(projects) {
    const container = document.getElementById('projects-list');

    if (!projects || projects.length === 0) {
        renderEmptyState('projects-list', 'Aucun projet');
        return;
    }

    container.innerHTML = projects.map(project => `
        <div class="card project-card" data-id="${project.id}">
            <div class="project-card-header">
                <div class="project-card-title">${escapeHtml(project.name)}</div>
                <span class="status-badge ${project.status || 'pending'}">${getStatusLabel(project.status)}</span>
            </div>
            ${project.client?.name ? `<div class="project-card-client">${escapeHtml(project.client.name)}</div>` : ''}
            
            <div class="flex-between mt-md">
                <button class="btn btn-secondary small" onclick="event.stopPropagation(); openNeedsModal(${project.id}, '${escapeHtml(project.name.replace(/'/g, "\\'"))}')">
                    Calculer Besoins
                </button>
            </div>

            ${project.description ? `<div class="text-muted mt-sm">${escapeHtml(project.description)}</div>` : ''}
            <div class="project-card-meta">
                <span>
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    ${formatDate(project.created_at)}
                </span>
            </div>
        </div>
    `).join('');

    // Ajouter les événements click
    container.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Prevent if button clicked
            if (e.target.closest('button')) return;
            navigateTo('optimizations');
        });
    });
}

function renderClientsList(clients) {
    const container = document.getElementById('clients-list');

    if (!clients || clients.length === 0) {
        renderEmptyState('clients-list', 'Aucun client');
        return;
    }

    container.innerHTML = clients.map(client => `
        <div class="list-item" data-id="${client.id}">
            <div class="list-item-icon">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            </div>
            <div class="list-item-content">
                <div class="list-item-title">${escapeHtml(client.name)}</div>
                <div class="list-item-subtitle">
                    ${client.contact_email || client.contact_phone || 'Aucun contact'}
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// GESTION DU STOCK (Groupé)
// ============================================

function renderStockList(stock) {
    const container = document.getElementById('stock-list');

    if (!stock || stock.length === 0) {
        renderEmptyState('stock-list', 'Aucun stock trouvé');
        return;
    }

    // Grouper par matériau
    const grouped = {};
    stock.forEach(item => {
        const matName = item.material?.name || 'Inconnu';
        if (!grouped[matName]) grouped[matName] = { material: item.material, items: [] };
        grouped[matName].items.push(item);
    });

    // Générer HTML
    container.innerHTML = Object.keys(grouped).map(matName => {
        const group = grouped[matName];
        const totalQty = group.items.reduce((acc, item) => acc + item.quantity, 0);

        return `
            <div class="stock-group">
                <div class="stock-group-header flex-between">
                    <div>
                        <div class="stock-group-title">${escapeHtml(matName)}</div>
                        <div class="text-muted" style="font-size:var(--font-size-sm)">
                            ${totalQty} pannea${totalQty > 1 ? 'ux' : 'u'} en stock
                        </div>
                    </div>
                    <button class="btn btn-secondary small" onclick="openSimulationModal(${group.material?.id}, '${escapeHtml(matName)}')">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="16"></line>
                            <line x1="8" y1="12" x2="16" y2="12"></line>
                        </svg>
                        Acheter
                    </button>
                </div>
                
                <div class="stock-group-items">
                    ${group.items.map(item => `
                        <div class="list-item stock-item-row" data-id="${item.id}">
                             <div class="list-item-content">
                                <div class="list-item-subtitle">
                                    ${item.width} x ${item.height} mm
                                    ${item.is_offcut ? '<span class="status-badge pending">Chute</span>' : ''}
                                </div>
                            </div>
                            <div class="list-item-badge ${item.quantity <= 2 ? 'low' : ''}">
                                 x ${item.quantity}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// SIMULATION ACHAT
// ============================================

window.openSimulationModal = function (materialId, materialName) {
    const modal = document.getElementById('simulation-modal');
    modal.classList.remove('hidden');

    document.getElementById('sim-material-name').textContent = materialName;
    document.getElementById('sim-results').classList.add('hidden');
    document.getElementById('btn-validate-purchase').classList.add('hidden');

    // Store current context
    AppState.simulationContext = { materialId, materialName };

    // Reset inputs
    document.getElementById('sim-quantity').value = 1;
};

// Listeners Simulation
document.addEventListener('DOMContentLoaded', () => {
    // Close Modal
    const closeBtn = document.getElementById('sim-modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('simulation-modal').classList.add('hidden');
        });
    }

    // Run Simulation
    const runBtn = document.getElementById('btn-run-simulation');
    if (runBtn) {
        runBtn.addEventListener('click', async () => {
            if (!AppState.simulationContext) return;

            runBtn.disabled = true;
            runBtn.innerHTML = '<div class="spinner spinner-sm"></div> Calcul...';

            try {
                // Get best price
                const prices = await Api.request(`/materials/${AppState.simulationContext.materialId}/best-prices`);

                if (!prices || prices.length === 0) {
                    showToast("Aucun fournisseur trouvé pour ce matériau", "warning");
                    document.getElementById('sim-results').classList.add('hidden');
                    return;
                }

                const bestOffer = prices[0]; // Already sorted by API
                const qty = parseInt(document.getElementById('sim-quantity').value) || 1;

                // Display results
                document.getElementById('sim-results').classList.remove('hidden');
                document.getElementById('sim-supplier-name').textContent = bestOffer.supplier_name;
                document.getElementById('sim-unit-price').textContent = formatCurrency(bestOffer.price);
                document.getElementById('sim-total-cost').textContent = formatCurrency(bestOffer.price * qty);

                // Show Validate button (NOW "Create Order" logic?)
                // For now, let's change behavior to Create Order
                const validateBtn = document.getElementById('btn-validate-purchase');
                validateBtn.innerHTML = `
                    <svg class="icon"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                    Créer Commande
                `;
                validateBtn.classList.remove('hidden');

                // Attach Order creation logic
                validateBtn.onclick = async () => {
                    try {
                        const supplierId = bestOffer.supplier_id;
                        const materialId = bestOffer.material_id; // Need to ensure bestOffer has this

                        const order = await Api.request('/orders/', {
                            method: 'POST',
                            body: JSON.stringify({
                                supplier_id: supplierId,
                                items: [{
                                    material_id: materialId,
                                    quantity: qty,
                                    unit_price: bestOffer.price,
                                    reference: bestOffer.reference
                                }]
                            })
                        });

                        showToast(`Commande #${order.id} créée !`, "success");
                        document.getElementById('simulation-modal').classList.add('hidden');
                        AppState.currentView = 'orders';
                        updateView();
                        loadOrders();
                    } catch (e) {
                        console.error(e);
                        showToast("Erreur création commande", "error");
                    }
                };

                // Store offer for validation
                AppState.simulationContext.offer = bestOffer;
                AppState.simulationContext.quantity = qty;

            } catch (e) {
                console.error(e);
                showToast("Erreur simulation", "error");
            } finally {
                runBtn.disabled = false;
                runBtn.textContent = 'Calculer Simulation';
            }
        });
    }

    // Validate Purchase
    const validateBtn = document.getElementById('btn-validate-purchase');
    if (validateBtn) {
        validateBtn.addEventListener('click', async () => {
            if (!AppState.simulationContext || !AppState.simulationContext.offer) return;

            validateBtn.disabled = true;

            try {
                // Add stock (Generic standard size for now, user might want to specify size later)
                // Assumption: Panels are standard 2800x2070? Or we ask user?
                // For now let's assume standard size defined in previous conversions or default
                // TODO: Ask user for dimension if not defined?

                // Let's create a standard panel stock item
                await Api.request(`/materials/${AppState.simulationContext.materialId}/stock`, {
                    method: 'POST',
                    body: JSON.stringify({
                        width: 2500, // Default standard?
                        height: 1250,
                        quantity: AppState.simulationContext.quantity,
                        is_offcut: false,
                        label: `Achat ${AppState.simulationContext.offer.supplier_name}`
                    })
                });

                showToast("Stock mis à jour !", "success");
                document.getElementById('simulation-modal').classList.add('hidden');
                loadStock(); // Refresh

            } catch (e) {
                console.error(e);
                showToast("Erreur validation", "error");
            } finally {
                validateBtn.disabled = false;
            }
        });
    }
});

function renderOptimizationsList(optimizations) {
    const container = document.getElementById('optimizations-list');

    if (!optimizations || optimizations.length === 0) {
        renderEmptyState('optimizations-list', 'Aucune découpe');
        return;
    }

    container.innerHTML = optimizations.map(opt => `
        <div class="card" data-id="${opt.id}">
            <div class="flex-between mb-md">
                <div class="list-item-title">${opt.project?.name || 'Projet inconnu'}</div>
                <span class="status-badge success">${opt.waste_percentage?.toFixed(1) || 0}% perte</span>
            </div>
            <div class="list-item-subtitle">
                ${opt.total_panels_used || 0} panneau(x) • ${formatCurrency(opt.total_cost || 0)}
            </div>
            <div class="project-card-meta">
                <span>
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    ${formatDate(opt.created_at)}
                </span>
            </div>
        </div>
    `).join('');
}

function renderEmptyState(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="empty-state">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>${message}</p>
        </div>
    `;
}

// ============================================
// UTILITAIRES
// ============================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

function getStatusLabel(status) {
    const labels = {
        'active': 'Actif',
        'pending': 'En attente',
        'completed': 'Terminé',
        'cancelled': 'Annulé'
    };
    return labels[status] || status || 'En cours';
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');

    const icons = {
        success: '<polyline points="20 6 9 17 4 12"></polyline>',
        error: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>',
        warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
        info: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${icons[type]}
        </svg>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    // Vibration pour feedback haptique
    if (navigator.vibrate && (type === 'success' || type === 'error')) {
        navigator.vibrate(type === 'error' ? [100, 50, 100] : 50);
    }

    // Supprimer après délai
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 200);
    }, APP_CONFIG.toastDuration);
}

// ============================================
// LOGIQUE FOURNISSEURS
// ============================================

function setupStockTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Hide all contents
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

            // Show target
            const targetId = `tab-${tab.dataset.tab}`;
            const target = document.getElementById(targetId);
            if (target) {
                target.classList.remove('active'); // reset for animation
                void target.offsetWidth; // trigger reflow
                target.classList.remove('hidden');
                target.classList.add('active');
            }
        });
    });

    // Add Supplier Handler
    const addBtn = document.getElementById('btn-add-supplier');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            openSupplierModal();
        });
    }

    // Export Suppliers Handler
    const exportBtn = document.getElementById('btn-export-suppliers');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (!AppState.suppliers || AppState.suppliers.length === 0) return;
            const dataStr = JSON.stringify(AppState.suppliers, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fournisseurs_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("Export téléchargé", "success");
        });
    }
}

function openSupplierModal(supplier = null) {
    const modal = document.getElementById('supplier-modal');
    modal.classList.remove('hidden');

    if (supplier) {
        document.getElementById('supplier-modal-title').textContent = "Modifier Fournisseur";
        document.getElementById('supp-id').value = supplier.id;
        document.getElementById('supp-name').value = supplier.name;
        document.getElementById('supp-contact').value = supplier.contact_name || '';
        document.getElementById('supp-phone').value = supplier.contact_phone || '';
        document.getElementById('supp-email').value = supplier.contact_email || '';
        document.getElementById('supp-delay').value = supplier.delivery_delay_days || 7;
        document.getElementById('supp-website').value = supplier.website || '';
        document.getElementById('supp-notes').value = supplier.comments || '';
    } else {
        document.getElementById('supplier-modal-title').textContent = "Nouveau Fournisseur";
        document.getElementById('supp-id').value = '';
        document.getElementById('supp-name').value = '';
        document.getElementById('supp-contact').value = '';
        document.getElementById('supp-phone').value = '';
        document.getElementById('supp-email').value = '';
        document.getElementById('supp-delay').value = 7;
        document.getElementById('supp-website').value = '';
        document.getElementById('supp-notes').value = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Supplier Modal Close
    const closeBtn = document.getElementById('supplier-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', () => document.getElementById('supplier-modal').classList.add('hidden'));

    // Save Supplier
    const saveBtn = document.getElementById('btn-save-supplier');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const id = document.getElementById('supp-id').value;
            const data = {
                name: document.getElementById('supp-name').value,
                contact_name: document.getElementById('supp-contact').value,
                contact_phone: document.getElementById('supp-phone').value,
                contact_email: document.getElementById('supp-email').value,
                delivery_delay_days: parseInt(document.getElementById('supp-delay').value) || 7,
                website: document.getElementById('supp-website').value,
                comments: document.getElementById('supp-notes').value
            };

            if (!data.name) { showToast("Nom requis", "warning"); return; }

            try {
                if (id) {
                    await Api.request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
                    showToast("Fournisseur modifié", "success");
                } else {
                    await Api.request('/suppliers/', { method: 'POST', body: JSON.stringify(data) });
                    showToast("Fournisseur créé", "success");
                }
                document.getElementById('supplier-modal').classList.add('hidden');
                loadSuppliers();
            } catch (e) {
                console.error(e);
                showToast("Erreur sauvegarde", "error");
            }
        });
    }
});

async function loadSuppliers() {
    try {
        const data = await Api.getSuppliers();
        AppState.suppliers = data;
        renderSuppliersList(data);
    } catch (error) {
        console.error('[App] Erreur chargement fournisseurs:', error);
        renderEmptyState('suppliers-list', 'Impossible de charger les fournisseurs');
    }
}

function renderSuppliersList(suppliers) {
    const container = document.getElementById('suppliers-list');
    container.innerHTML = '';

    if (!suppliers || suppliers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.5;margin-bottom:16px;width:48px;height:48px">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <p>Aucun fournisseur. Ajoutez-en un !</p>
            </div>`;
        return;
    }

    suppliers.forEach(s => {
        const card = document.createElement('div');
        card.className = 'card mb-md';
        const safeName = escapeHtml(s.name).replace(/'/g, "\\'");

        card.innerHTML = `
            <div class="flex-between mb-sm">
                <h3 class="font-bold text-lg">${escapeHtml(s.name)}</h3>
                <span class="text-muted small">${s.delivery_delay_days}j délai</span>
            </div>
            
            <div class="grid-2-col mb-md">
                <div class="text-sm">
                    ${s.contact_name ? `<div>👤 ${escapeHtml(s.contact_name)}</div>` : ''}
                    ${s.contact_phone ? `<div>📞 ${escapeHtml(s.contact_phone)}</div>` : ''}
                </div>
                <div class="text-sm text-right">
                    ${s.website ? `<a href="${s.website}" target="_blank" class="text-primary">Visiter site</a>` : ''}
                </div>
            </div>
            
            ${s.comments ? `<div class="text-muted text-sm mb-md p-sm bg-tertiary rounded">📝 ${escapeHtml(s.comments)}</div>` : ''}

            <div class="grid-2-col">
                <button class="btn btn-secondary small" onclick="openSupplierPricesModal(${s.id}, '${safeName}')">
                    <svg class="icon"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                    Gérer Tarifs
                </button>
                <button class="btn btn-secondary small" onclick='editSupplier(${JSON.stringify(s).replace(/'/g, "&#39;")})'>
                    Modifier
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Helper for edit button
window.editSupplier = (supplier) => {
    openSupplierModal(supplier);
};

// ============================================
// COMMANDE / GESTION PRIX FOURNISSEURS
// ============================================

window.openSupplierPricesModal = async function (supplierId, supplierName) {
    const modal = document.getElementById('supplier-prices-modal');
    modal.classList.remove('hidden');
    document.getElementById('supp-price-name').textContent = supplierName;
    document.getElementById('supp-prices-list').innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    // Store context
    AppState.priceModalContext = { supplierId, supplierName };

    // Load Materials for select
    try {
        const materials = await Api.request('/materials/');
        const select = document.getElementById('supp-new-material');
        select.innerHTML = materials.map(m => `< option value = "${m.id}" > ${escapeHtml(m.name)} (${m.thickness}mm)</option > `).join('');
        loadSupplierPrices(supplierId);
    } catch (e) {
        console.error(e);
        document.getElementById('supp-prices-list').innerHTML = '<div class="empty-state">Erreur chargement</div>';
    }
};

async function loadSupplierPrices(supplierId) {
    try {
        const supplier = await Api.request(`/ suppliers / ${supplierId} `);
        const list = document.getElementById('supp-prices-list');

        if (!supplier.materials || supplier.materials.length === 0) {
            list.innerHTML = '<div class="empty-state">Aucun tarif enregistré</div>';
            return;
        }

        const allMaterials = await Api.request('/materials/');
        const matMap = {};
        allMaterials.forEach(m => matMap[m.id] = m);

        list.innerHTML = supplier.materials.map(sm => `
        < div class="list-item" >
                <div class="list-item-content">
                    <div class="list-item-title">${escapeHtml(matMap[sm.material_id]?.name || 'Inconnu')}</div>
                    <div class="list-item-subtitle">Réf: ${escapeHtml(sm.reference || '-')}</div>
                </div>
                 <div class="list-item-badge">
                    ${formatCurrency(sm.price)} / ${sm.price_type}
                 </div>
                 <button class="btn-icon text-danger" onclick="deleteSupplierPrice(${supplierId}, ${sm.material_id})">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                 </button>
            </div >
        `).join('');

    } catch (e) {
        console.error(e);
    }
}

window.deleteSupplierPrice = async function (supplierId, materialId) {
    if (!confirm("Supprimer ce tarif ?")) return;
    try {
        await Api.request(`/ suppliers / ${supplierId} /material/${materialId} `, { method: 'DELETE' });
        loadSupplierPrices(supplierId);
    } catch (e) {
        showToast("Erreur suppression", "error");
    }
};

// Event Listeners for Price Modal
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('supp-price-modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('supplier-prices-modal').classList.add('hidden');
        });
    }

    const addPriceBtn = document.getElementById('btn-add-price');
    if (addPriceBtn) {
        addPriceBtn.addEventListener('click', async () => {
            const context = AppState.priceModalContext;
            if (!context) return;

            const materialId = document.getElementById('supp-new-material').value;
            const price = document.getElementById('supp-new-price').value;
            const type = document.getElementById('supp-new-type').value;

            if (!price) { showToast("Prix requis", "warning"); return; }

            try {
                await Api.request(`/ suppliers / ${context.supplierId}/material`, {
                    method: 'POST',
                    body: JSON.stringify({
                        material_id: parseInt(materialId),
                        price: parseFloat(price),
                        price_type: type,
                        reference: ''
                    })
                });
                showToast("Tarif ajouté", "success");
                loadSupplierPrices(context.supplierId);
            } catch (e) {
                console.error(e);
                showToast("Erreur ajout prix", "error");
            }
        });
    }
});

// ============================================
// IA LOCALE (SCRAPING)
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Open Modal
    const openBtn = document.getElementById('btn-open-scraping');
    if (openBtn) {
        openBtn.addEventListener('click', async () => {
            document.getElementById('scraping-modal').classList.remove('hidden');
            // Load suppliers into select
            try {
                const suppliers = await Api.request('/suppliers/');
                const select = document.getElementById('scraping-target-supplier');
                select.innerHTML = suppliers.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
            } catch (e) {
                console.error(e);
            }
        });
    }

    // Close Modal
    const closeBtn = document.getElementById('scraping-modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('scraping-modal').classList.add('hidden');
        });
    }

    // Run Analysis
    const runBtn = document.getElementById('btn-run-scraping');
    if (runBtn) {
        runBtn.addEventListener('click', async () => {
            const url = document.getElementById('scraping-url').value;
            if (!url) { showToast("URL requise", "warning"); return; }

            // Show progress
            document.getElementById('scraping-progress').classList.remove('hidden');
            document.getElementById('scraping-results').classList.add('hidden');
            runBtn.disabled = true;

            try {
                const result = await Api.request('/scraping/analyze', {
                    method: 'POST',
                    body: JSON.stringify({ url })
                });

                if (result.status === 'error') {
                    showToast("Analyse échouée (site non compatible ?)", "error");
                } else {
                    // Fill results
                    document.getElementById('scraping-res-name').value = result.product_name || '';
                    document.getElementById('scraping-res-price').value = result.price || '';
                    document.getElementById('scraping-res-dims').value = result.dimensions || '';

                    document.getElementById('scraping-results').classList.remove('hidden');
                    showToast("Analyse terminée !", "success");
                }
            } catch (e) {
                console.error(e);
                showToast("Erreur serveur", "error");
            } finally {
                document.getElementById('scraping-progress').classList.add('hidden');
                runBtn.disabled = false;
            }
        });
    }

    // Save Result
    const saveBtn = document.getElementById('btn-save-scraping');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const supplierId = document.getElementById('scraping-target-supplier').value;
            const name = document.getElementById('scraping-res-name').value;
            const price = parseFloat(document.getElementById('scraping-res-price').value);
            const dims = document.getElementById('scraping-res-dims').value;

            if (!name || !supplierId) { showToast("Nom et fournisseur requis", "warning"); return; }

            saveBtn.disabled = true;

            try {
                // 1. Create/Find Material (Simplified: Just create new for now)
                // Need to parse dims? For now, we just create a material with generic size or default
                // The backend 'create material' expects width/height/thickness. 
                // If we couldn't parse them perfectly, we might default or ask user.
                // For this demo, let's create a "Scraped Material"

                // Try to parse basic "2500 x 1220" from dims string if possible, or use default
                let width = 2500, height = 1220, thickness = 18;

                // Heuristic parsing from the text field
                const dimMatch = dims.match(/(\d+)\s*[xX]\s*(\d+)/);
                if (dimMatch) {
                    width = parseInt(dimMatch[1]);
                    height = parseInt(dimMatch[2]);
                }

                const material = await Api.request('/materials/', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: name,
                        type: 'panel', // Assume panel for now
                        thickness: thickness, // Default
                        width: width,
                        height: height,
                        grain: true,
                        category: 'Importé'
                    })
                });

                // 2. Link to Supplier
                if (price > 0) {
                    await Api.request(`/suppliers/${supplierId}/material`, {
                        method: 'POST',
                        body: JSON.stringify({
                            material_id: material.id,
                            price: price,
                            price_type: 'unit', // Assume price per panel
                            reference: 'Scraping IA'
                        })
                    });
                }

                showToast("Produit ajouté au catalogue !", "success");
                document.getElementById('scraping-modal').classList.add('hidden');

                // Refresh if needed
                if (typeof loadStock === 'function') loadStock();

            } catch (e) {
                console.error(e);
                showToast("Erreur sauvegarde", "error");
            } finally {
                saveBtn.disabled = false;
            }
        });
    }
});

// ============================================
// GESTION DES COMMANDES (ORDERS)
// ============================================

async function loadOrders() {
    try {
        const orders = await Api.request('/orders/');
        AppState.orders = orders;
        renderOrdersList(orders);
    } catch (e) {
        console.error("Error loading orders:", e);
        showToast("Erreur chargement commandes", "error");
    }
}

function renderOrdersList(orders) {
    const list = document.getElementById('orders-list');
    list.innerHTML = '';

    if (orders.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <p>Aucune commande.</p>
            </div>
        `;
        return;
    }

    orders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'card mb-md';

        // Status Badge Style
        let statusClass = 'pending';
        let statusText = order.status;
        if (order.status === 'received') { statusClass = 'active'; statusText = 'RECEVED'; }
        if (order.status === 'ordered') { statusClass = 'pending'; statusText = 'EN COURS'; }
        if (order.status === 'draft') { statusClass = 'default'; statusText = 'BROUILLON'; }

        card.innerHTML = `
            <div class="flex-between mb-sm">
                <span class="font-bold text-lg">Commande #${order.id}</span>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <div class="text-muted mb-sm">
                Fournisseur: <span class="text-primary font-bold">${escapeHtml(order.supplier_name || 'Inconnu')}</span>
            </div>
            <div class="mb-md">
                ${order.items.map(item => `
                    <div class="flex-between" style="border-bottom:1px solid var(--bg-tertiary);padding:4px 0">
                        <span>${escapeHtml(item.material_name || item.material_id)}</span>
                        <span>x${item.quantity} (${formatCurrency(item.unit_price)})</span>
                    </div>
                `).join('')}
            </div>
            <div class="flex-between mb-md">
                <span class="text-muted">Total</span>
                <span class="font-bold text-lg">${formatCurrency(order.total_cost)}</span>
            </div>
            
            <div class="grid-2-col">
                ${order.status === 'draft' ? `
                    <button class="btn btn-primary small" onclick="updateOrderStatus(${order.id}, 'ordered')">Commander</button>
                    <button class="btn btn-secondary small" onclick="deleteOrder(${order.id})">Supprimer</button>
                ` : ''}
                ${order.status === 'ordered' ? `
                    <button class="btn btn-success small w-full" onclick="receiveOrder(${order.id})">Marquer Reçue (Ajout Stock)</button>
                ` : ''}
            </div>
        `;
        list.appendChild(card);
    });
}

function setupOrderFilters() {
    const pills = document.querySelectorAll('.filter-pills [data-order-status]');
    pills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            // Update active state
            pills.forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');

            const status = e.target.dataset.orderStatus;
            filterOrders(status);
        });
    });
}

function filterOrders(status) {
    if (status === 'all') {
        renderOrdersList(AppState.orders);
    } else {
        const filtered = AppState.orders.filter(o => o.status === status);
        renderOrdersList(filtered);
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        await Api.request(`/orders/${orderId}/status?status=${status}`, { method: 'PUT' });
        showToast("Statut mis à jour", "success");
        loadOrders();
    } catch (e) {
        showToast("Erreur mise à jour", "error");
    }
}

async function receiveOrder(orderId) {
    if (!confirm("Confirmer la réception ? Cela ajoutera les articles au stock.")) return;
    try {
        await Api.request(`/orders/${orderId}/receive`, { method: 'POST' });
        showToast("Commande reçue et stock mis à jour !", "success");
        loadOrders();
        loadStock(); // Refresh stock view as well
    } catch (e) {
        showToast("Erreur réception", "error");
    }
}

async function deleteOrder(orderId) {
    if (!confirm("Supprimer cette commande ?")) return;
    try {
        await Api.request(`/orders/${orderId}`, { method: 'DELETE' });
        showToast("Commande supprimée", "success");
        loadOrders();
    } catch (e) {
        showToast("Erreur suppression", "error");
    }
}

// Make functions global
window.updateOrderStatus = updateOrderStatus;
window.receiveOrder = receiveOrder;
window.deleteOrder = deleteOrder;
window.showToast = showToast;
window.showScanResult = showScanResult;
window.AppState = AppState;
window.APP_CONFIG = APP_CONFIG;
