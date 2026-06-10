import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Layout/Sidebar';
import { Projects } from './pages/Projects';
import { Optimize } from './pages/Optimize';
import { StockPage as Stock } from './pages/Stock';
import { Clients } from './pages/Clients';
import { ClientDetails } from './pages/ClientDetails';
import { SettingsPage } from './pages/Settings';
import Quotes from './pages/Quotes';
import { Management } from './pages/Management/Management';
import { LibraryPage as Library } from './pages/Library';
import { HardwarePage } from './pages/Hardware';
import { StepImport } from './pages/StepImport';
import { FileExplorer } from './pages/FileExplorer';
import { UnitConverter } from './components/Tools/UnitConverter';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="opticut-ui-theme">
        <Router>
          <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
            <Sidebar />
            <div className="flex-1 overflow-auto">
              <Routes>
                <Route path="/" element={<Management />} />
                <Route path="/management" element={<Management />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/import-step" element={<StepImport />} />
                <Route path="/optimize" element={<Optimize />} />
                <Route path="/stock" element={<Stock />} />
                <Route path="/hardware" element={<HardwarePage />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/clients/:id" element={<ClientDetails />} />
                <Route path="/quotes" element={<Quotes />} />
                <Route path="/library" element={<Library />} />
                <Route path="/file-explorer" element={<FileExplorer />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </div>
            <Toaster position="top-right" richColors closeButton />
            <UnitConverter />
          </div>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
