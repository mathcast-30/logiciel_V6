import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import {
  FolderOpen,
  QrCode,
  Package,
  Scissors,
  Users,
  WifiOff,
  RefreshCw,
  X
} from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Pages
import { ProjectsPage } from './pages/ProjectsPage.tsx';
import { ScannerPage } from './pages/ScannerPage.tsx';
import { StockPage } from './pages/StockPage.tsx';
import { OptimizationsPage } from './pages/OptimizationsPage.tsx';
import { ClientsPage } from './pages/ClientsPage.tsx';

import './App.css';

function BottomNav() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: FolderOpen, label: 'Projets' },
    { path: '/scanner', icon: QrCode, label: 'Scanner' },
    { path: '/stock', icon: Package, label: 'Stock' },
    { path: '/optimizations', icon: Scissors, label: 'Découpes' },
    { path: '/clients', icon: Users, label: 'Clients' },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map(({ path, icon: Icon, label }) => (
        <NavLink
          key={path}
          to={path}
          className={`nav-item ${location.pathname === path ? 'active' : ''}`}
        >
          <Icon className="nav-icon" />
          <span className="nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function App() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error: Error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const closeUpdatePrompt = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <BrowserRouter>
      <div className="app-container">
        {isOffline && (
          <div className="offline-banner">
            <WifiOff size={16} />
            Mode Hors-Ligne Actif
          </div>
        )}

        {(offlineReady || needRefresh) && (
          <div className="pwa-update-prompt">
            <div className="flex-between">
              <p>
                {offlineReady
                  ? "L'app est prête pour une utilisation hors-ligne."
                  : "Une nouvelle version est disponible !"}
              </p>
              <button onClick={closeUpdatePrompt} className="btn-ghost" title="Fermer la notification">
                <X size={20} />
              </button>
            </div>
            {needRefresh && (
              <div className="pwa-update-actions">
                <button
                  onClick={() => updateServiceWorker(true)}
                  className="btn btn-primary btn-large"
                >
                  <RefreshCw size={20} className="mr-2" />
                  Mettre à jour
                </button>
              </div>
            )}
          </div>
        )}

        <main className="main-content">
          <Routes>
            <Route path="/" element={<ProjectsPage />} />
            <Route path="/scanner" element={<ScannerPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/optimizations" element={<OptimizationsPage />} />
            <Route path="/optimizations/:projectId" element={<OptimizationsPage />} />
            <Route path="/clients" element={<ClientsPage />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          style: {
            fontSize: '16px',
            padding: '16px',
          }
        }}
      />
    </BrowserRouter>
  );
}

export default App;
