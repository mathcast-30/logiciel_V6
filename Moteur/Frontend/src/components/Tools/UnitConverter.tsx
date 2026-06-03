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
        const num = parseFloat(val);
        if (!isNaN(num)) {
            setCm((num / 10).toString());
            setM((num / 1000).toString());
        } else {
            setCm('');
            setM('');
        }
    };

    const handleCmChange = (val: string) => {
        setCm(val);
        const num = parseFloat(val);
        if (!isNaN(num)) {
            setMm((num * 10).toString());
            setM((num / 100).toString());
        } else {
            setMm('');
            setM('');
        }
    };

    const handleMChange = (val: string) => {
        setM(val);
        const num = parseFloat(val);
        if (!isNaN(num)) {
            setMm((num * 1000).toString());
            setCm((num * 100).toString());
        } else {
            setMm('');
            setCm('');
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
        <div className="fixed bottom-6 right-6 z-50" ref={containerRef}>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform hover:scale-110 ${isOpen
                        ? 'bg-slate-800 text-white rotate-90 dark:bg-slate-200 dark:text-slate-900'
                        : 'bg-indigo-600 text-white dark:bg-indigo-500'
                    }`}
                title="Convertisseur de mesures"
            >
                {isOpen ? <X size={24} /> : <Calculator size={24} />}
            </button>

            {/* Converter Panel */}
            {isOpen && (
                <div className="absolute bottom-16 right-0 w-72 card p-6 shadow-2xl animate-fade-in origin-bottom-right border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Calculator size={18} className="text-indigo-500" />
                            Convertisseur
                        </h3>
                        <button
                            onClick={clear}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                        >
                            Effacer
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* MM */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Millimètres (mm)</label>
                            <div className="relative group">
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="input-field pr-10"
                                    value={mm}
                                    onChange={(e) => handleMmChange(e.target.value)}
                                />
                                <button
                                    onClick={() => copyToClipboard(mm, 'mm')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                                >
                                    {copiedField === 'mm' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* CM */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Centimètres (cm)</label>
                            <div className="relative group">
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="input-field pr-10"
                                    value={cm}
                                    onChange={(e) => handleCmChange(e.target.value)}
                                />
                                <button
                                    onClick={() => copyToClipboard(cm, 'cm')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                                >
                                    {copiedField === 'cm' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* M */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Mètres (m)</label>
                            <div className="relative group">
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="input-field pr-10"
                                    value={m}
                                    onChange={(e) => handleMChange(e.target.value)}
                                />
                                <button
                                    onClick={() => copyToClipboard(m, 'm')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                                >
                                    {copiedField === 'm' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center italic">
                        Valeurs synchronisées automatiquement
                    </div>
                </div>
            )}
        </div>
    );
};
