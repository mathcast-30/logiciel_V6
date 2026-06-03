import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles, X, Info } from 'lucide-react';
import { AIService, type AIExpertResponse } from '../../services/aiService';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    data?: AIExpertResponse;
}

export function AIExpertChat() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: "Bonjour ! Je suis votre expert en menuiserie. Posez-moi vos questions sur le matériel (coulisses, charnières), les assemblages ou les normes.",
            sender: 'ai',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: input,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await AIService.askExpert(input);
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: response.answer,
                sender: 'ai',
                timestamp: new Date(),
                data: response
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: "Désolé, j'ai rencontré une erreur en consultant ma base de connaissances.",
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-16 h-16 bg-indigo-600 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-40 group"
                title="Ouvrir l'expert technique"
            >
                <Sparkles className="h-8 w-8 group-hover:rotate-12 transition-transform" />
                <div className="absolute -top-2 -right-2 bg-emerald-500 w-4 h-4 rounded-full border-2 border-white animate-pulse" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden border border-slate-200 dark:border-slate-800 animate-scale-up">
            {/* Header */}
            <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Expert Technique</h3>
                        <div className="flex items-center gap-1.5 opacity-80">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                            <span className="text-[10px] font-medium uppercase tracking-wider">IA Locale Active</span>
                        </div>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Fermer le chat">
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-2 max-w-[85%] ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${m.sender === 'user' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                                {m.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                            </div>
                            <div className={`p-3 rounded-2xl text-sm leading-relaxed ${m.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'}`}>
                                {m.text}
                                {m.data?.source && (
                                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-500 uppercase">
                                            <Info className="h-3 w-3" /> Source: {m.data.source}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none flex gap-2">
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            {messages.length === 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-2">
                    {["Joint de tiroir", "Coulisses Blum", "Types de charnières"].map(s => (
                        <button
                            key={s}
                            onClick={() => setInput(s)}
                            className="text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-full text-slate-500 hover:border-indigo-500 transition-all"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        placeholder="Posez votre question technique..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md"
                        title="Envoyer le message"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
                <div className="mt-2 text-[9px] text-center text-slate-400 font-medium">
                    Base de connaissances locale • Pas de connexion cloud
                </div>
            </div>
        </div>
    );
}
