import React, { useState, useEffect, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';

interface ColorSwatchProps {
  label: string;
  currentHex: string;
  onChange: (hex: string) => void;
  themeColors: string[]; // 8 current colors for quick selection
}

export const ColorSwatch: React.FC<ColorSwatchProps> = ({
  label,
  currentHex,
  onChange,
  themeColors,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(currentHex);
  const [isCopied, setIsCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync input value when currentHex changes externally
  useEffect(() => {
    setInputValue(currentHex);
  }, [currentHex]);

  // Click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    // Listen to escape key
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (/^#[0-9A-Fa-f]{6}$/i.test(val)) {
      onChange(val);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentHex);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div
            className="w-8 h-8 rounded-full cursor-pointer ring-2 ring-offset-2 ring-theme-border ring-offset-theme-bg-main"
            style={{ backgroundColor: currentHex }}
            onClick={() => setIsOpen(!isOpen)}
          />

          {isOpen && (
            <div
              ref={popoverRef}
              className="absolute z-50 mt-3 p-4 bg-theme-bg-card border border-theme-border rounded-xl shadow-2xl w-[240px]"
              style={{
                // Auto-position logic simple: if near right edge, align right
                // Normally we'd use a portal or popper, but inline absolute is okay if parent has relative
                left: 0,
                top: '100%',
              }}
            >
              <HexColorPicker
                color={currentHex}
                onChange={(color) => {
                  setInputValue(color);
                  onChange(color);
                }}
                style={{ width: '100%' }}
              />
              
              <div className="mt-4">
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  className="w-full bg-theme-bg-main border border-theme-border rounded px-3 py-1.5 text-theme-text-main font-mono text-sm focus:outline-none focus:border-theme-primary transition-colors"
                />
              </div>

              {themeColors && themeColors.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {themeColors.slice(0, 8).map((color, idx) => (
                    <div
                      key={idx}
                      className="w-5 h-5 rounded-full cursor-pointer border border-theme-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        setInputValue(color);
                        onChange(color);
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-theme-text-muted hover:text-theme-text-main transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
        <span className="text-[14px] text-theme-text-main font-medium">{label}</span>
      </div>

      <div className="flex items-center gap-3 relative border-b border-theme-border/50 border-dotted flex-1 mx-4">
      </div>

      <div className="flex items-center gap-2">
        <div className="relative group">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={() => setInputValue(currentHex)}
            className="w-20 bg-transparent text-right text-[11px] font-mono text-theme-text-muted hover:text-theme-text-main focus:text-theme-text-main focus:outline-none focus:border-b focus:border-theme-primary transition-colors"
          />
        </div>
        <button
          onClick={handleCopy}
          className="p-1.5 text-theme-text-muted hover:text-theme-text-main hover:bg-theme-bg-card rounded transition-colors relative"
          title="Copier la valeur hexadécimale"
        >
          {isCopied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
          {isCopied && (
            <span className="absolute -top-8 -right-2 bg-theme-bg-card text-theme-text-main text-xs px-2 py-1 rounded shadow border border-theme-border whitespace-nowrap">
              ✓ Copié
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
