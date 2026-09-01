import React, { useState, useEffect, useRef } from 'react';
import { Calculator, X, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export const UnitConverter: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [mm, setMm] = useState<string>('');
    const [cm, setCm] = useState<string>('');
    const [m, setM] = useState<string>('');
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleMmChange = (val: string) => {
        setMm(val);
        const num = Number.parseFloat(val);
        if (!Number.isNaN(num)) {
            setCm((num / 10).toString());
            setM((num / 1000).toString());
        } else {
            setCm('');
            setM('');
        }
    };

    const handleCmChange = (val: string) => {
        setCm(val);
        const num = Number.parseFloat(val);
        if (!Number.isNaN(num)) {
            setMm((num * 10).toString());
            setM((num / 100).toString());
        } else {
            setMm('');
            setM('');
        }
    };

    const handleMChange = (val: string) => {
        setM(val);
        const num = Number.parseFloat(val);
        if (!Number.isNaN(num)) {
            setMm((num * 1000).toString());
            setCm((num * 100).toString());
        } else {
            setMm('');
            setM('');
        }
    };

    const copyToClipboard = (text: string, field: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        toast.success(`${text} copié !`);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const clear = () => {
        setMm('');
        setCm('');
        setM('');
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Sidebar Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${
                    isOpen
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-white/5'
                }`}
                title="Convertisseur d'unités (mm / cm / m)"
            >
                <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${isOpen ? 'bg-white/20' : 'bg-indigo-500/20 text-indigo-400'}`}>
                        <Calculator className="h-4 w-4" />
                    </div>
                    <span className="font-medium">Convertisseur</span>
                </div>
                {isOpen ? (
                    <X className="h-4 w-4 opacity-75" />
                ) : (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-slate-400">mm / cm / m</span>
                )}
            </button>

            {/* Popover Converter Panel */}
            {isOpen && (
                <div className="absolute left-full bottom-0 ml-3 w-80 bg-slate-900/95 backdrop-blur-xl rounded-2xl p-5 shadow-2xl border border-slate-700/80 z-50 animate-fade-in origin-bottom-left text-slate-200">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/60">
                        <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
                            <Calculator size={16} className="text-indigo-400" />
                            Convertisseur de mesures
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={clear}
                                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1 rounded hover:bg-white/5"
                            >
                                Effacer
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3.5">
                        {/* MM */}
                        <div>
                            <label htmlFor="unit-conv-mm" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
                                Millimètres (mm)
                            </label>
                            <div className="relative group">
                                <input
                                    id="unit-conv-mm"
                                    type="number"
                                    placeholder="0"
                                    className="w-full bg-slate-800/80 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none pr-10 transition-all"
                                    value={mm}
                                    onChange={(e) => handleMmChange(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    onClick={() => copyToClipboard(mm, 'mm')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-400 transition-colors rounded-md hover:bg-white/5"
                                    title="Copier"
                                >
                                    {copiedField === 'mm' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* CM */}
                        <div>
                            <label htmlFor="unit-conv-cm" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
                                Centimètres (cm)
                            </label>
                            <div className="relative group">
                                <input
                                    id="unit-conv-cm"
                                    type="number"
                                    placeholder="0"
                                    className="w-full bg-slate-800/80 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none pr-10 transition-all"
                                    value={cm}
                                    onChange={(e) => handleCmChange(e.target.value)}
                                />
                                <button
                                    onClick={() => copyToClipboard(cm, 'cm')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-400 transition-colors rounded-md hover:bg-white/5"
                                    title="Copier"
                                >
                                    {copiedField === 'cm' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* M */}
                        <div>
                            <label htmlFor="unit-conv-m" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
                                Mètres (m)
                            </label>
                            <div className="relative group">
                                <input
                                    id="unit-conv-m"
                                    type="number"
                                    placeholder="0"
                                    className="w-full bg-slate-800/80 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none pr-10 transition-all"
                                    value={m}
                                    onChange={(e) => handleMChange(e.target.value)}
                                />
                                <button
                                    onClick={() => copyToClipboard(m, 'm')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-400 transition-colors rounded-md hover:bg-white/5"
                                    title="Copier"
                                >
                                    {copiedField === 'm' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-400 text-center italic">
                        Conversion automatique & synchronisée
                    </div>
                </div>
            )}
        </div>
    );
};

