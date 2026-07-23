import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { THEME_PRESETS } from '../../config/themePresets';
import { THEME_COLORS } from '../../config/themeConfig';
import { PaletteCard } from './PaletteCard';
import { ColorSwatch } from './ColorSwatch';
import { ThemePreview } from './ThemePreview';

// Icons
const Sliders: React.FC<{size?: number; className?: string}> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

const RefreshCcw: React.FC<{size?: number; className?: string}> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const Download: React.FC<{size?: number; className?: string}> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const Upload: React.FC<{size?: number; className?: string}> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const ChevronDown: React.FC<{size?: number; className?: string}> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);


export const ThemeCustomizationPanel: React.FC = () => {
  const { colors, setColors, setColor, resetColors, exportTheme, importTheme } = useTheme();
  
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if a preset is selected
  const isPresetSelected = (preset: Record<string, string>) => {
    // We check if all keys in the preset match the current colors
    return Object.entries(preset).every(([key, value]) => {
      // Handle case-insensitivity or minor format differences
      return colors[key]?.toLowerCase() === value.toLowerCase();
    });
  };

  const getPresetDescription = (name: string) => {
    switch (name) {
      case 'Professionnel': return 'Sombre et élégant';
      case 'Vibrant': return 'Coloré et dynamique';
      case 'Nature': return 'Vert et naturel';
      case 'Minéral': return 'Bleu océan';
      case 'Clair': return 'Lumineux et aéré';
      default: return 'Thème personnalisé';
    }
  };

  const handleResetClick = () => {
    if (resetConfirm) {
      resetColors();
      setResetConfirm(false);
    } else {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 3000);
    }
  };

  const handleExport = () => {
    const json = exportTheme();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opticut-theme-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const success = importTheme(content);
        if (!success) {
          alert('Le fichier importé n\'est pas un thème valide.');
        }
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Grouping theme colors
  const interactiveKeys = ['primary', 'secondary', 'accent', 'danger'];
  const bgKeys = ['bg-main', 'bg-card', 'bg-sidebar'];
  const textKeys = ['text-main', 'text-muted', 'border'];

  const getThemeColorConfig = (key: string) => THEME_COLORS.find(c => c.key === key);
  
  // Extract all current colors for the quick palette in ColorSwatch
  const currentThemeColorsArray = Object.values(colors);

  const renderColorGroup = (title: string, keys: string[]) => (
    <div className="mb-6 last:mb-0">
      <div className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider mb-2 pb-1 border-b border-theme-border/50">
        {title}
      </div>
      <div className="flex flex-col">
        {keys.map(key => {
          const config = getThemeColorConfig(key);
          if (!config) return null;
          return (
            <ColorSwatch
              key={key}
              label={config.label}
              currentHex={colors[key] || config.default}
              onChange={(hex) => setColor(key, hex)}
              themeColors={currentThemeColorsArray}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col space-y-8">
      
      {/* BLOC 1: Sélecteur de Palettes */}
      <div>
        <h2 className="text-[16px] font-bold text-theme-text-main mb-1">Choisissez un thème</h2>
        <p className="text-[13px] text-theme-text-muted mb-4">Un clic pour transformer l'apparence complète du logiciel</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(THEME_PRESETS).map(([name, preset]) => (
            <PaletteCard
              key={name}
              label={name}
              description={getPresetDescription(name)}
              preset={preset}
              selected={isPresetSelected(preset)}
              onClick={() => setColors(preset)}
            />
          ))}
        </div>
      </div>

      {/* BLOC 2: Personnalisation Avancée */}
      <div className="bg-theme-bg-card border border-theme-border rounded-xl overflow-hidden">
        <button 
          className="w-full flex items-center justify-between p-4 bg-theme-bg-card hover:bg-theme-bg-main/50 transition-colors"
          onClick={() => setIsAccordionOpen(!isAccordionOpen)}
        >
          <div className="flex items-center gap-3">
            <Sliders size={20} className="text-theme-text-muted" />
            <div className="text-left">
              <div className="text-[14px] font-bold text-theme-text-main">Personnalisation avancée</div>
              <div className="text-[12px] text-theme-text-muted mt-0.5">Modifiez chaque couleur individuellement</div>
            </div>
          </div>
          <ChevronDown 
            size={20} 
            className={`text-theme-text-muted transition-transform duration-200 ${isAccordionOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        <div 
          className={`transition-all duration-300 ease-in-out overflow-hidden`}
          style={{ maxHeight: isAccordionOpen ? '2000px' : '0px', opacity: isAccordionOpen ? 1 : 0 }}
        >
          <div className="p-6 border-t border-theme-border bg-theme-bg-main/30">
            {renderColorGroup('Couleurs Interactives', interactiveKeys)}
            {renderColorGroup('Fonds', bgKeys)}
            {renderColorGroup('Textes et Bordures', textKeys)}
          </div>
        </div>
      </div>

      {/* BLOC 3: Aperçu Temps Réel */}
      <ThemePreview />

      {/* BLOC 4: Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-theme-border mt-4">
        <button
          onClick={handleResetClick}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${
            resetConfirm 
              ? 'border-red-500/50 text-red-500 bg-red-500/10' 
              : 'border-transparent text-theme-text-muted hover:bg-theme-bg-card hover:text-theme-text-main'
          }`}
        >
          <RefreshCcw size={16} />
          <span className="text-sm font-medium">{resetConfirm ? 'Confirmer ?' : 'Réinitialiser'}</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-theme-primary text-theme-primary hover:bg-theme-primary/10 transition-colors"
          >
            <Download size={16} />
            <span className="text-sm font-medium">Exporter JSON</span>
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-primary text-white hover:bg-theme-primary/90 transition-colors shadow-sm"
          >
            <Upload size={16} />
            <span className="text-sm font-medium">Importer</span>
          </button>
          <input 
            type="file" 
            accept=".json" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImport} 
          />
        </div>
      </div>

    </div>
  );
};
