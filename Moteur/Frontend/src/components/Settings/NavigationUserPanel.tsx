import React, { useState, useEffect } from 'react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { NAV_ITEMS, Role } from '../../config/navConfig';
import { Star, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
    id: string;
    item: any;
}

const SortableItem = ({ id, item }: SortableItemProps) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const Icon = item.icon;

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-theme-bg-main border border-theme-border rounded-lg mb-2 relative bg-white dark:bg-[#1E293B]">
            <div {...attributes} {...listeners} className="cursor-grab hover:text-theme-primary text-theme-text-muted">
                <GripVertical size={18} />
            </div>
            <Icon size={18} className="text-theme-text-main" />
            <span className="font-medium text-theme-text-main">{item.label}</span>
        </div>
    );
};

export const NavigationUserPanel: React.FC = () => {
    const { user, role } = useCurrentUser();
    const userId = user?.id || 'default';
    
    const getAuthorizedItems = () => {
        const savedAdmin = localStorage.getItem('opticut_nav_admin_config');
        let adminConfig = null;
        if (savedAdmin) {
            try { adminConfig = JSON.parse(savedAdmin); } catch(e) {}
        }

        return NAV_ITEMS.filter(item => {
            const isVisible = adminConfig ? adminConfig[role as Role]?.[item.id] : item.defaultVisible[role as Role];
            return isVisible ?? item.defaultVisible[role as Role];
        });
    };

    const authorizedItems = getAuthorizedItems();
    const [pinnedIds, setPinnedIds] = useState<string[]>([]);
    const [orderedItems, setOrderedItems] = useState(authorizedItems);
    const [themeShortcuts, setThemeShortcuts] = useState(true);

    useEffect(() => {
        const savedPinned = localStorage.getItem(`opticut_nav_user_pinned_${userId}`);
        if (savedPinned) {
            try { setPinnedIds(JSON.parse(savedPinned)); } catch(e) {}
        }

        const savedOrder = localStorage.getItem(`opticut_nav_user_order_${userId}`);
        if (savedOrder) {
            try {
                const orderIds = JSON.parse(savedOrder);
                const sorted = [...authorizedItems].sort((a, b) => {
                    const idxA = orderIds.indexOf(a.id);
                    const idxB = orderIds.indexOf(b.id);
                    if (idxA === -1 && idxB === -1) return 0;
                    if (idxA === -1) return 1;
                    if (idxB === -1) return -1;
                    return idxA - idxB;
                });
                setOrderedItems(sorted);
            } catch(e) {
                setOrderedItems(authorizedItems);
            }
        } else {
            setOrderedItems(authorizedItems);
        }

        const savedTheme = localStorage.getItem(`opticut_nav_user_theme_shortcuts_${userId}`);
        if (savedTheme !== null) setThemeShortcuts(savedTheme === 'true');
    }, [userId, role]);

    const handlePinToggle = (id: string) => {
        setPinnedIds(prev => {
            let newPinned;
            if (prev.includes(id)) {
                newPinned = prev.filter(p => p !== id);
            } else {
                if (prev.length >= 4) return prev;
                newPinned = [...prev, id];
            }
            localStorage.setItem(`opticut_nav_user_pinned_${userId}`, JSON.stringify(newPinned));
            return newPinned;
        });
    };

    const handleThemeToggle = () => {
        const newVal = !themeShortcuts;
        setThemeShortcuts(newVal);
        localStorage.setItem(`opticut_nav_user_theme_shortcuts_${userId}`, newVal.toString());
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setOrderedItems((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                const newArray = arrayMove(items, oldIndex, newIndex);
                localStorage.setItem(`opticut_nav_user_order_${userId}`, JSON.stringify(newArray.map(i => i.id)));
                return newArray;
            });
        }
    };

    const handleResetOrder = () => {
        setOrderedItems(authorizedItems);
        localStorage.removeItem(`opticut_nav_user_order_${userId}`);
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    return (
        <div className="bg-theme-bg-card rounded-xl border border-theme-border p-6 mt-6">
            <h3 className="text-lg font-bold text-theme-text-main mb-6">Mes préférences de navigation</h3>

            {/* Section A - Pinned */}
            <div className="mb-8">
                <h4 className="font-bold text-[14px] text-theme-text-main">Onglets épinglés</h4>
                <p className="text-[12px] text-theme-text-muted mb-4">Apparaissent toujours en haut de la sidebar</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {authorizedItems.map(item => {
                        const isPinned = pinnedIds.includes(item.id);
                        const isDisabled = !isPinned && pinnedIds.length >= 4;
                        const Icon = item.icon;

                        return (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-theme-bg-main border border-theme-border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Icon size={18} className="text-theme-text-main" />
                                    <span className="font-medium text-theme-text-main">{item.label}</span>
                                </div>
                                <button 
                                    onClick={() => handlePinToggle(item.id)}
                                    disabled={isDisabled}
                                    className={`p-1.5 rounded transition-colors group relative ${isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-theme-bg-card'}`}
                                >
                                    {isPinned ? (
                                        <Star size={18} className="text-theme-accent fill-theme-accent" />
                                    ) : (
                                        <Star size={18} className="text-theme-text-muted hover:text-theme-accent" />
                                    )}
                                    {isDisabled && (
                                        <div className="absolute hidden group-hover:block bottom-full right-0 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded z-10 whitespace-nowrap">
                                            Maximum 4 onglets épinglés
                                        </div>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Section B - Sortable */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h4 className="font-bold text-[14px] text-theme-text-main">Mon ordre d'affichage</h4>
                        <p className="text-[12px] text-theme-text-muted">Glissez pour réorganiser vos onglets</p>
                    </div>
                    <button onClick={handleResetOrder} className="text-xs text-theme-text-muted hover:text-theme-text-main px-3 py-1.5 rounded transition-colors border border-transparent hover:border-theme-border">
                        Remettre l'ordre par défaut
                    </button>
                </div>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={orderedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-1">
                            {orderedItems.map(item => (
                                <SortableItem key={item.id} id={item.id} item={item} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {/* Section C - Theme shortcuts */}
            <div className="border-t border-theme-border pt-6">
                <div className="flex items-center justify-between p-4 bg-theme-bg-main border border-theme-border rounded-lg">
                    <div>
                        <h4 className="font-bold text-[14px] text-theme-text-main">Raccourcis thème</h4>
                        <p className="text-[12px] text-theme-text-muted">Afficher les raccourcis de thème en bas de la sidebar</p>
                    </div>
                    <button
                        onClick={handleThemeToggle}
                        className={`w-10 h-5 rounded-full transition-colors relative flex items-center ${themeShortcuts ? 'bg-theme-primary' : 'bg-gray-400 dark:bg-gray-600'}`}
                    >
                        <div className={`absolute left-1 bg-white w-3.5 h-3.5 rounded-full transition-transform ${themeShortcuts ? 'translate-x-4.5' : 'translate-x-0'}`} style={{ transform: themeShortcuts ? 'translateX(18px)' : 'translateX(0)' }} />
                    </button>
                </div>
            </div>
        </div>
    );
};
