import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout({ children }: { children?: React.ReactNode }) {
    return (
        <div className="flex h-screen bg-theme-bg-main text-theme-text-main overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-auto">
                <div className="p-8 animate-fade-in w-full max-w-7xl mx-auto">
                    {children || <Outlet />}
                </div>
            </main>
        </div>
    );
}
