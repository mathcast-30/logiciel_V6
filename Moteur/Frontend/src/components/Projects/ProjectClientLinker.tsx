import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { type Client, ClientService } from '../../services/clientService';
import { type Project, ProjectService } from '../../services/projectService';
import { User, Link } from 'lucide-react';

interface ProjectClientLinkerProps {
    project: Project;
    onClientChanged: () => void;
}

export function ProjectClientLinker({ project, onClientChanged }: ProjectClientLinkerProps) {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Charge les clients au montage du composant
    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        setIsLoading(true);
        try {
            const data = await ClientService.getAll();
            setClients(data);
        } catch {
            toast.error('Erreur lors du chargement des clients');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssignClient = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        const clientId = value === "" ? null : parseInt(value, 10);

        setIsUpdating(true);
        try {
            await ProjectService.assignClient(project.id, clientId);
            toast.success('Client assigné avec succès');
            onClientChanged(); // Force le rafraîchissement au niveau parent
        } catch {
            toast.error('Erreur lors de l\'assignation du client');
        } finally {
            setIsUpdating(false);
        }
    };

    const hasClient = !!project.client_id;

    if (isLoading) {
        return <span className="text-xs text-slate-400">Chargement...</span>;
    }

    if (clients.length === 0) {
        return (
            <span className="text-xs text-orange-500 italic flex items-center gap-1">
                <Link className="h-3 w-3" />
                Aucun client trouvé. Créez-en un dans l'onglet Clients
            </span>
        );
    }

    return (
        <div
            className="flex items-center gap-1.5 relative"
            onClick={(e) => e.stopPropagation()} // Empêche l'accordéon de s'ouvrir quand on clique
        >
            {hasClient ? (
                <User className="h-3.5 w-3.5 text-blue-500" />
            ) : (
                <Link className="h-3.5 w-3.5 text-slate-400" />
            )}

            <select
                title="Assigner à un client"
                value={project.client_id || ""}
                onChange={handleAssignClient}
                disabled={isUpdating}
                className={`text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded border transition-colors cursor-pointer ${hasClient
                        ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}
            >
                <option value="">Sélectionner un client...</option>
                {clients.map(client => (
                    <option key={client.id} value={client.id}>
                        {client.name}
                    </option>
                ))}
            </select>

            {isUpdating && (
                <span className="absolute -right-5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
            )}
        </div>
    );
}
