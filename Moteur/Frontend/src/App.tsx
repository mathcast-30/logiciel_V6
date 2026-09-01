import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Layout/Sidebar';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { Projects } from './pages/Projects';
import { Optimize } from './pages/Optimize';
import Stock from './pages/Stock';
import { Clients } from './pages/Clients';
import { ClientDetails } from './pages/ClientDetails';
import { SettingsPage } from './pages/Settings';
import Quotes from './pages/Quotes';
import { Management } from './pages/Management/Management';
import { LibraryPage as Library } from './pages/Library';
import { HardwarePage } from './pages/Hardware';
import { StepImport } from './pages/StepImport';
import { FileExplorer } from './pages/FileExplorer';

// Auth Pages
import { Login } from './pages/Login';
import { FirstSetup } from './pages/FirstSetup';
import { ChangePassword } from './pages/ChangePassword';
import { Forbidden } from './pages/Forbidden';
import { apiClient } from './services/apiClient';

function AppContent() {
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);

  useEffect(() => {
    apiClient('/auth/setup-required')
      .then(res => res.json())
      .then(data => setSetupRequired(data.required))
      .catch(() => setSetupRequired(false));
  }, []);

  if (setupRequired === null) {
    return (
      <div className="min-h-screen bg-theme-bg-main flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (setupRequired) {
    return (
      <Routes>
        <Route path="/setup" element={<FirstSetup />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/403" element={<Forbidden />} />
      
      {/* Protected Layout */}
      <Route path="/*" element={
        <ProtectedRoute>
          <div className="flex h-screen bg-theme-bg-main text-theme-text-main transition-colors duration-300">
            <Sidebar />
            <div className="flex-1 overflow-auto">
              <Routes>
                <Route path="/" element={<Management />} />
                <Route path="/management" element={<ProtectedRoute requiredRoles={['chef', 'admin']}><Management /></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute requiredRoles={['operateur', 'chef', 'admin']}><Projects /></ProtectedRoute>} />
                <Route path="/import-step" element={<ProtectedRoute requiredRoles={['operateur', 'chef', 'admin']}><StepImport /></ProtectedRoute>} />
                <Route path="/optimize" element={<ProtectedRoute requiredRoles={['operateur', 'chef', 'admin']}><Optimize /></ProtectedRoute>} />
                <Route path="/stock" element={<ProtectedRoute requiredRoles={['chef', 'admin']}><Stock /></ProtectedRoute>} />
                <Route path="/hardware" element={<ProtectedRoute requiredRoles={['chef', 'admin']}><HardwarePage /></ProtectedRoute>} />
                <Route path="/clients" element={<ProtectedRoute requiredRoles={['chef', 'admin']}><Clients /></ProtectedRoute>} />
                <Route path="/clients/:id" element={<ProtectedRoute requiredRoles={['chef', 'admin']}><ClientDetails /></ProtectedRoute>} />
                <Route path="/quotes" element={<ProtectedRoute requiredRoles={['admin']}><Quotes /></ProtectedRoute>} />
                <Route path="/library" element={<ProtectedRoute requiredRoles={['operateur', 'chef', 'admin']}><Library /></ProtectedRoute>} />
                <Route path="/file-explorer" element={<ProtectedRoute requiredRoles={['operateur', 'chef', 'admin']}><FileExplorer /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute requiredRoles={['operateur', 'chef', 'admin']}><SettingsPage /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <Toaster position="top-right" richColors closeButton />
          </div>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <AppContent />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
