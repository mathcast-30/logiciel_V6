import React from 'react';

interface PaletteCardProps {
  label: string;
  description: string;
  preset: Record<string, string>;
  selected: boolean;
  onClick: () => void;
}

export const PaletteCard: React.FC<PaletteCardProps> = ({
  label,
  description,
  preset,
  selected,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col cursor-pointer transition-all duration-200 rounded-xl overflow-hidden border bg-theme-bg-card
        ${selected ? 'border-[2px]' : 'border-theme-border hover:shadow-lg'}
      `}
      style={{
        borderColor: selected ? preset['primary'] || '#6C63FF' : undefined,
      }}
    >
      {/* Miniature de l'interface */}
      <div className="h-[120px] w-full flex">
        {/* Sidebar */}
        <div
          className="w-[20%] h-full"
          style={{ backgroundColor: preset['bg-sidebar'] }}
        />
        {/* Main Content Area */}
        <div className="w-[80%] h-full flex flex-col">
          {/* Topbar */}
          <div
            className="h-[25%]"
            style={{ backgroundColor: preset['bg-card'] }}
          />
          {/* Content */}
          <div
            className="h-[75%] p-3 flex flex-col gap-2"
            style={{ backgroundColor: preset['bg-main'] }}
          >
            <div
              className="h-3 w-1/2 rounded-full"
              style={{ backgroundColor: preset['primary'] }}
            />
            <div
              className="h-8 w-full rounded-md"
              style={{ backgroundColor: preset['secondary'] }}
            />
          </div>
        </div>
      </div>

      {/* Label and Description */}
      <div className="p-3 text-center border-t border-theme-border bg-theme-bg-main relative z-10 transition-colors group-hover:border-transparent" style={{ borderColor: selected ? preset['primary'] : undefined, borderTopWidth: selected ? '2px' : '1px' }}>
        <h3 className="text-[13px] font-bold text-theme-text-main">{label}</h3>
        <p className="text-[11px] text-theme-text-muted mt-0.5">{description}</p>
      </div>

      {/* Selected Indicator */}
      {selected && (
        <div
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white"
          style={{ backgroundColor: preset['primary'] || '#6C63FF' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {/* Hover border effect overlay (simulates border color change on hover without jumping) */}
      {!selected && (
        <div
          className="absolute inset-0 border-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ borderColor: preset['primary'] || '#6C63FF' }}
        />
      )}
    </div>
  );
};
