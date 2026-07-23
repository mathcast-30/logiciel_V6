import React, { useState, useEffect } from 'react';
import { useCurrentUser } from '../../hooks/useCurrentUser';

export interface TabConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  content: React.ReactNode;
}

interface SettingsTabsProps {
  tabs: TabConfig[];
}

export const SettingsTabs: React.FC<SettingsTabsProps> = ({ tabs }) => {
  const { role } = useCurrentUser();
  const isAdmin = role === 'admin';

  // Filter out admin-only tabs if not admin
  const visibleTabs = tabs.filter(tab => !tab.adminOnly || isAdmin);

  const getInitialTab = () => {
    // Check URL params first
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab');
    if (urlTab && visibleTabs.some(t => t.id === urlTab)) {
      return urlTab;
    }
    
    // Fallback to session storage
    const saved = sessionStorage.getItem('opticut_settings_tab');
    if (saved && visibleTabs.some(t => t.id === saved)) {
      return saved;
    }

    return visibleTabs[0]?.id || 'theme';
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab());
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Clear session storage on unload to default to 'theme' next time app starts fresh
    const handleBeforeUnload = () => {
      sessionStorage.removeItem('opticut_settings_tab');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;
    
    setIsAnimating(true);
    
    // Small timeout to allow fade out before switching content
    setTimeout(() => {
      setActiveTab(tabId);
      sessionStorage.setItem('opticut_settings_tab', tabId);
      
      // Update URL if supported
      if (window.history.pushState) {
        const newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?tab=' + tabId;
        window.history.pushState({path:newurl}, '', newurl);
      }
      
      setIsAnimating(false);
    }, 150);
  };

  const activeContent = visibleTabs.find(t => t.id === activeTab)?.content;

  return (
    <div className="w-full flex flex-col">
      {/* Container des onglets */}
      <div className="bg-theme-bg-card border-b border-theme-border px-6 pt-2">
        <div className="flex flex-row gap-1 overflow-x-auto no-scrollbar">
          {visibleTabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  relative flex items-center gap-2 px-4 py-3 cursor-pointer transition-all duration-150 rounded-t-lg
                  ${isActive 
                    ? 'text-theme-primary bg-theme-primary/5' 
                    : 'text-theme-text-muted hover:text-theme-text-main hover:bg-theme-bg-main/50 bg-transparent'
                  }
                `}
                style={{
                  borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent'
                }}
              >
                {tab.icon}
                <span className="text-[14px] font-medium whitespace-nowrap">{tab.label}</span>
                
                {tab.adminOnly && (
                  <span className="absolute top-1 right-1 bg-theme-danger/80 text-white text-[10px] px-1 rounded">
                    Admin
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Zone de contenu */}
      <div 
        className={`transition-opacity duration-150 py-6 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
      >
        {activeContent}
      </div>
    </div>
  );
};
