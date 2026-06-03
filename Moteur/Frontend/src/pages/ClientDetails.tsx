import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    FileText,
    FolderKanban,
    Plus,
    ClipboardCheck,
    Pencil
} from 'lucide-react';
import { ClientService, type ClientDetail } from '../services/clientService';
import { toast } from 'sonner';

export function ClientDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [client, setClient] = useState<ClientDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'info' | 'projects' | 'quotes'>('projects');

    const loadClient = useCallback(async () => {
        if (!id) return;
        try {
            const data = await ClientService.getById(parseInt(id));
            setClient(data);
        } catch (error) {
            console.error('Error loading client:', error);
            toast.error("Impossible de charger le client");
            navigate('/clients');
        } finally {
            setIsLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        loadClient();
    }, [loadClient]);

    if (isLoading) return <div className="p-8 text-center">Chargement...</div>;
    if (!client) return <div className="p-8 text-center text-red-500">Client introuvable</div>;

    return (
        <div className="space-y-6">
            {/* Header / Banner */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/clients')}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Retour aux clients"
                            aria-label="Retour aux clients"
                        >
                            <ArrowLeft className="h-5 w-5 text-slate-500" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                {client.name}
                                <button
                                    className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                                    title="Modifier le nom du client"
                                    aria-label="Modifier le nom du client"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                            </h1>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                                {client.contact_email && (
                                    <div className="flex items-center gap-1.5">
                                        <Mail className="h-4 w-4" /> {client.contact_email}
                                    </div>
                                )}
                                {client.contact_phone && (
                                    <div className="flex items-center gap-1.5">
                                        <Phone className="h-4 w-4" /> {client.contact_phone}
                                    </div>
                                )}
                                {client.address && (
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="h-4 w-4" /> {client.address}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mt-8 border-b border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => setActiveTab('projects')}
                        className={`px-4 py-2 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'projects'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <FolderKanban className="h-4 w-4" />
                        Projets ({client.projects.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('quotes')}
                        className={`px-4 py-2 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'quotes'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <FileText className="h-4 w-4" />
                        Devis ({client.quotes.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`px-4 py-2 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'info'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <ClipboardCheck className="h-4 w-4" />
                        Informations
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div>
                {activeTab === 'projects' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold">Projets en cours</h2>
                            <Link
                                to="/projects"
                                state={{ action: 'new', clientId: client.id }}
                                className="btn-primary flex items-center gap-2 text-sm"
                            >
                                <Plus className="h-4 w-4" />
                                Nouveau Projet
                            </Link>
                        </div>

                        {client.projects.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                <FolderKanban className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">Aucun projet pour ce client.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {client.projects.map(project => (
                                    <div key={project.id} className="card p-4 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-semibold text-lg">{project.name}</h3>
                                            <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
                                                {new Date(project.created_at || '').toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                                            {project.description || "Aucune description"}
                                        </p>
                                        <div className="flex justify-between items-center mt-auto">
                                            <Link
                                                to={`/optimize?project_id=${project.id}`}
                                                className="text-sm text-blue-500 hover:underline font-medium"
                                            >
                                                Ouvrir l'optimisation
                                            </Link>
                                            <span className="text-xs text-slate-400">
                                                {project.parts.length} pièces
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'quotes' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-semibold">Historique des devis</h2>
                            <Link
                                to="/quotes"
                                state={{ clientId: client.id }}
                                className="btn-primary flex items-center gap-2 text-sm"
                            >
                                <Plus className="h-4 w-4" />
                                Nouveau Devis
                            </Link>
                        </div>

                        {client.quotes.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">Aucun devis créé.</p>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium">
                                        <tr>
                                            <th className="p-4">Numéro</th>
                                            <th className="p-4">Date</th>
                                            <th className="p-4">Montant TTC</th>
                                            <th className="p-4">Statut</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {client.quotes.map(quote => (
                                            <tr key={quote.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="p-4 font-medium">{quote.number}</td>
                                                <td className="p-4">{new Date(quote.date).toLocaleDateString()}</td>
                                                <td className="p-4 font-bold">{quote.total_ttc.toFixed(2)} €</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${quote.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                                                        quote.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-slate-100 text-slate-700'
                                                        }`}>
                                                        {quote.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <Link to={`/quotes/${quote.id}`} className="text-blue-500 hover:underline">
                                                        Voir
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'info' && (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-slate-400" />
                                    Adresse
                                </h3>
                                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                                    {client.address || "Non renseignée"}
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <ClipboardCheck className="h-4 w-4 text-slate-400" />
                                    Notes
                                </h3>
                                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                                    {client.notes || "Aucune note"}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
