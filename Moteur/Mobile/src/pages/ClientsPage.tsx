import { useState, useEffect } from 'react';
import { Users, Search, AlertCircle, Phone, Mail, MapPin } from 'lucide-react';
import { clientsApi } from '../services/api.ts';
import type { Client } from '../services/api.ts';
import { toast } from 'sonner';

export function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    useEffect(() => {
        loadClients();
    }, []);

    useEffect(() => {
        if (search.trim()) {
            const filtered = clients.filter(c =>
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.contact_email?.toLowerCase().includes(search.toLowerCase())
            );
            setFilteredClients(filtered);
        } else {
            setFilteredClients(clients);
        }
    }, [search, clients]);

    const loadClients = async () => {
        try {
            const response = await clientsApi.getAll();
            setClients(response.data);
            setFilteredClients(response.data);
        } catch {
            toast.error('Erreur de chargement des clients');
        } finally {
            setLoading(false);
        }
    };

    const callClient = (phone: string) => {
        window.location.href = `tel:${phone}`;
    };

    const emailClient = (email: string) => {
        window.location.href = `mailto:${email}`;
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner" />
            </div>
        );
    }

    // Client detail modal
    if (selectedClient) {
        return (
            <div>
                <header className="page-header">
                    <h1 className="page-title">
                        <Users />
                        {selectedClient.name}
                    </h1>
                </header>

                <div className="card">
                    {selectedClient.contact_phone && (
                        <div
                            className="list-item m-0"
                            onClick={() => callClient(selectedClient.contact_phone!)}
                        >
                            <div className="list-item-icon icon-success">
                                <Phone size={24} color="var(--success)" />
                            </div>
                            <div className="list-item-content">
                                <div className="list-item-title">Appeler</div>
                                <div className="list-item-subtitle">
                                    {selectedClient.contact_phone}
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedClient.contact_email && (
                        <div
                            className="list-item mt-3"
                            onClick={() => emailClient(selectedClient.contact_email!)}
                        >
                            <div className="list-item-icon icon-blue">
                                <Mail size={24} color="#3b82f6" />
                            </div>
                            <div className="list-item-content">
                                <div className="list-item-title">Email</div>
                                <div className="list-item-subtitle">
                                    {selectedClient.contact_email}
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedClient.address && (
                        <div
                            className="list-item mt-3"
                        >
                            <div className="list-item-icon icon-warning">
                                <MapPin size={24} color="var(--warning)" />
                            </div>
                            <div className="list-item-content">
                                <div className="list-item-title">Adresse</div>
                                <div className="list-item-subtitle">
                                    {selectedClient.address}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-3">
                    <button
                        className="btn btn-large btn-secondary"
                        onClick={() => setSelectedClient(null)}
                    >
                        Retour à la liste
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <header className="page-header">
                <h1 className="page-title">
                    <Users />
                    Clients
                </h1>
                <div className="search-bar">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Rechercher un client..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </header>

            <div className="card-list">
                {filteredClients.length === 0 ? (
                    <div className="empty-state">
                        <AlertCircle />
                        <p>Aucun client trouvé</p>
                    </div>
                ) : (
                    filteredClients.map((client) => (
                        <div
                            key={client.id}
                            className="list-item"
                            onClick={() => setSelectedClient(client)}
                        >
                            <div className="list-item-icon">
                                <Users size={24} />
                            </div>
                            <div className="list-item-content">
                                <div className="list-item-title">{client.name}</div>
                                <div className="list-item-subtitle">
                                    {client.contact_phone || client.contact_email || 'Pas de contact'}
                                </div>
                            </div>
                            {client.contact_phone && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        callClient(client.contact_phone!);
                                    }}
                                    className="btn-icon-circle"
                                    aria-label="Appeler client"
                                    title="Appeler client"
                                >
                                    <Phone size={20} color="var(--success)" />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
