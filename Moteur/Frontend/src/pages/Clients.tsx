import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Users2, Search, Phone, Mail, MapPin, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '../components/UI/ConfirmDialog';
import { type Client, ClientService } from '../services/clientService';

export function Clients() {
    const navigate = useNavigate();
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        notes: ''
    });

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'warning' as 'warning' | 'danger' | 'info'
    });

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        try {
            const data = await ClientService.getAll();
            setClients(data);
        } catch {
            console.error('Error loading clients');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingClient) {
                await ClientService.update(editingClient.id, formData);
            } else {
                await ClientService.create(formData);
            }
            setIsModalOpen(false);
            resetForm();
            loadClients();
            toast.success(editingClient ? 'Client modifié avec succès' : 'Client créé avec succès');
        } catch {
            toast.error('Erreur lors de l\'opération');
        }
    };

    const handleDelete = (id: number) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Supprimer le client',
            message: 'Voulez-vous vraiment supprimer ce client ? Cette action est irréversible.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await ClientService.delete(id);
                    loadClients();
                    toast.success('Client supprimé');
                } catch {
                    toast.error('Erreur lors de la suppression');
                }
            }
        });
    };

    const openEditModal = (client: Client) => {
        setEditingClient(client);
        setFormData({
            name: client.name,
            contact_email: client.contact_email || '',
            contact_phone: client.contact_phone || '',
            address: client.address || '',
            notes: client.notes || ''
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingClient(null);
        setFormData({ name: '', contact_email: '', contact_phone: '', address: '', notes: '' });
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contact_phone?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    };

    const getGradient = (index: number) => {
        const gradients = [
            'from-blue-500 to-blue-600',
            'from-emerald-500 to-emerald-600',
            'from-purple-500 to-purple-600',
            'from-amber-500 to-amber-600',
            'from-rose-500 to-rose-600',
            'from-cyan-500 to-cyan-600'
        ];
        return gradients[index % gradients.length];
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title flex items-center gap-3">
                        <Users2 className="h-8 w-8 text-blue-500" />
                        Clients
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {clients.length} clients enregistrés
                    </p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="h-5 w-5" />
                    Nouveau Client
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Rechercher un client..."
                    className="input-field pl-12"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Clients Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="card p-6 animate-pulse">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 bg-slate-200 rounded-xl" />
                                <div className="flex-1">
                                    <div className="h-5 bg-slate-200 rounded w-2/3 mb-2" />
                                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredClients.length === 0 ? (
                <div className="card">
                    <div className="empty-state py-16">
                        <Users2 className="empty-state-icon" />
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">
                            {searchTerm ? 'Aucun résultat' : 'Aucun client'}
                        </h3>
                        <p className="text-slate-500 mb-4">
                            {searchTerm ? 'Essayez avec d\'autres termes' : 'Commencez par ajouter un client'}
                        </p>
                        {!searchTerm && (
                            <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                                <Plus className="h-4 w-4 mr-2" />
                                Ajouter un client
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map((client, index) => (
                        <div
                            key={client.id}
                            className="card p-6 group hover:shadow-lg transition-all cursor-pointer animate-fade-in-up stagger-item"
                            onClick={() => navigate(`/clients/${client.id}`)}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`
                                        w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg
                                        bg-gradient-to-br ${getGradient(index)}
                                    `}>
                                        <span className="font-bold text-lg">{getInitials(client.name)}</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">{client.name}</h3>
                                        {client.contact_email && (
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                <Mail className="h-4 w-4 text-slate-400" />
                                                {client.contact_email}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openEditModal(client); }}
                                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                        title="Modifier le client"
                                        aria-label="Modifier le client"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        title="Supprimer le client"
                                        aria-label="Supprimer le client"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm">
                                {client.contact_phone && (
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Phone className="h-4 w-4 text-slate-400" />
                                        {client.contact_phone}
                                    </div>
                                )}
                                {client.contact_email && (
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Mail className="h-4 w-4 text-slate-400" />
                                        {client.contact_email}
                                    </div>
                                )}
                                {client.address && (
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        <MapPin className="h-4 w-4 text-slate-400" />
                                        {client.address}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                {editingClient ? 'Modifier le client' : 'Nouveau Client'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Nom *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Nom du client"
                                        className="input-field"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Téléphone
                                        </label>
                                        <input
                                            type="tel"
                                            placeholder="06 12 34 56 78"
                                            className="input-field"
                                            value={formData.contact_phone}
                                            onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="client@email.com"
                                            className="input-field"
                                            value={formData.contact_email}
                                            onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Adresse
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Adresse complète"
                                        className="input-field"
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Notes
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="Notes additionnelles..."
                                        className="input-field resize-none"
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn-secondary"
                                >
                                    Annuler
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingClient ? 'Enregistrer' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
            />
        </div>
    );
}
