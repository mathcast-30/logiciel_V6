import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export const ThemePreview: React.FC = () => {
  const { colors } = useTheme();

  return (
    <div className="flex flex-col gap-3 mt-8">
      <div className="flex items-center gap-3">
        <h3 className="text-[14px] font-bold text-theme-text-main uppercase tracking-wider">Aperçu en temps réel</h3>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-green-500 tracking-wider">LIVE</span>
        </div>
      </div>

      {/* Preview Container */}
      <div 
        className="h-[200px] flex rounded-xl overflow-hidden border border-theme-border shadow-sm transition-all duration-75"
        style={{ borderColor: colors['border'] }}
      >
        {/* Sidebar */}
        <div 
          className="w-[60px] h-full flex flex-col items-center py-4 gap-4 transition-colors duration-75"
          style={{ backgroundColor: colors['bg-sidebar'] }}
        >
          {/* Logo mock */}
          <div 
            className="w-8 h-8 rounded-lg mb-2 transition-colors duration-75"
            style={{ backgroundColor: colors['primary'] }}
          />
          {/* Nav items */}
          <div className="flex flex-col gap-3 w-full px-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div 
                key={i}
                className="h-2 w-full rounded-full transition-colors duration-75"
                style={{ 
                  backgroundColor: i === 1 ? colors['primary'] : colors['border'],
                  opacity: i === 1 ? 1 : 0.4
                }}
              />
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div 
          className="flex-1 h-full flex flex-col transition-colors duration-75"
          style={{ backgroundColor: colors['bg-main'] }}
        >
          {/* Topbar */}
          <div 
            className="h-[32px] flex items-center justify-end px-4 gap-2 border-b transition-colors duration-75"
            style={{ backgroundColor: colors['bg-card'], borderColor: colors['border'] }}
          >
            <div className="w-5 h-5 rounded-full transition-colors duration-75" style={{ backgroundColor: colors['border'], opacity: 0.5 }} />
            <div className="w-5 h-5 rounded-full transition-colors duration-75" style={{ backgroundColor: colors['primary'] }} />
          </div>

          {/* Content Body */}
          <div className="p-4 flex-1 flex flex-col gap-4">
            
            {/* Header / Title */}
            <div className="flex items-center justify-between">
               <div className="h-4 w-32 rounded transition-colors duration-75" style={{ backgroundColor: colors['text-main'], opacity: 0.8 }} />
            </div>

            {/* Cards row */}
            <div className="flex gap-4">
              {[1, 2].map((i) => (
                <div 
                  key={i}
                  className="flex-1 rounded-md p-2 border flex flex-col gap-2 transition-colors duration-75"
                  style={{ backgroundColor: colors['bg-card'], borderColor: colors['border'] }}
                >
                  <div className="h-3 w-3/4 rounded transition-colors duration-75" style={{ backgroundColor: colors['text-main'], opacity: 0.8 }} />
                  <div className="h-2 w-full rounded transition-colors duration-75" style={{ backgroundColor: colors['text-muted'], opacity: 0.6 }} />
                  <div className="h-2 w-5/6 rounded transition-colors duration-75" style={{ backgroundColor: colors['text-muted'], opacity: 0.6 }} />
                  <div className="mt-auto h-4 w-12 rounded transition-colors duration-75" style={{ backgroundColor: colors['primary'] }} />
                </div>
              ))}
            </div>

            {/* Bottom Actions Row */}
            <div className="mt-auto flex gap-2">
               <div className="px-4 py-1.5 rounded text-[11px] font-bold text-white flex items-center justify-center transition-colors duration-75" style={{ backgroundColor: colors['primary'] }}>
                 Optimiser
               </div>
               <div className="px-4 py-1.5 rounded border text-[11px] font-bold flex items-center justify-center transition-colors duration-75" style={{ borderColor: colors['secondary'], color: colors['secondary'] }}>
                 Aperçu
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
