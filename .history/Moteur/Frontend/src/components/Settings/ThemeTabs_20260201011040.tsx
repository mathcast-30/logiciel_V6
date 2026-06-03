import * as React from 'react';
const { useState } = React;

// Icon stubs
const IconStub = (name: string) => (props: any) => <span {...props} aria-hidden title={name} />;
const Palette = IconStub('Palette');
const Eye = IconStub('Eye');
const Settings = IconStub('Settings');
const Sparkles = IconStub('Sparkles');

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
            <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-0">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors text-sm font-medium ${
                            activeTab === tab.id
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
