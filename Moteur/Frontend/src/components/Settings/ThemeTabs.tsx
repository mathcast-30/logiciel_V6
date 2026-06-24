import * as React from 'react';
const { useState } = React;

interface TabItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    content: React.ReactNode;
}

interface ThemeTabsProps {
    tabs: TabItem[];
}

export function ThemeTabs({ tabs }: ThemeTabsProps) {
    const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');

    return (
        <div className="space-y-4">
            {/* Onglets */}
            <div className="flex flex-wrap gap-2 border-b border-theme-primary/20 pb-0">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors text-sm font-medium ${
                            activeTab === tab.id
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-theme-text-muted hover:text-theme-text-main'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Contenu du tab */}
            <div className="mt-6">
                {tabs.find((t) => t.id === activeTab)?.content}
            </div>
        </div>
    );
}
