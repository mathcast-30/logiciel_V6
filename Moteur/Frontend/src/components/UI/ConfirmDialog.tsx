import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose?: () => void;
    onCancel?: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({ isOpen, onClose, onCancel, onConfirm, title, message, type = 'warning' }: ConfirmDialogProps) {
    const handleClose = onClose || onCancel || (() => {});
    if (!isOpen) return null;

    const colors = {
        danger: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', icon: AlertCircle, btn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500' },
        warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', icon: AlertTriangle, btn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500' },
        info: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', icon: Info, btn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' },
    };

    const style = colors[type];
    const Icon = style.icon;

    return createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={handleClose}></div>

                <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

                <div className="inline-block transform overflow-hidden rounded-lg bg-white dark:bg-slate-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
                    <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${style.bg} sm:mx-0 sm:h-10 sm:w-10`}>
                                <Icon className={`h-6 w-6 ${style.text}`} aria-hidden="true" />
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className="text-lg font-medium leading-6 text-slate-900 dark:text-white" id="modal-title">{title}</h3>
                                <div className="mt-2">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-slate-100 dark:border-slate-700">
                        <button
                            type="button"
                            className={`inline-flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${style.btn}`}
                            onClick={() => { onConfirm(); handleClose(); }}
                        >
                            Confirmer
                        </button>
                        <button
                            type="button"
                            className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-base font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            onClick={handleClose}
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
