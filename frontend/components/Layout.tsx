import React, { useState } from 'react';
import { LayoutDashboard, Users, Home, Settings, Menu, X, DollarSign } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    currentView: string;
    onChangeView: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'tenants', label: 'Tenants & Contracts', icon: Users },
        { id: 'rooms', label: 'Buildings & Rooms', icon: Home },
        { id: 'finance', label: 'Finance & Payments', icon: DollarSign },
        { id: 'settings', label: 'System Settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shadow-xl">
                <div className="p-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        FormosaStay
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">Property Manager</p>
                </div>
                
                <nav className="flex-1 px-4 space-y-2">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onChangeView(item.id)}
                            className={`flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 ${
                                currentView === item.id 
                                ? 'bg-brand-600 text-white shadow-md shadow-brand-900/20' 
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                            <item.icon size={20} className="mr-3" />
                            <span className="font-medium">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center font-bold">
                            M
                        </div>
                        <div>
                            <p className="text-sm font-medium">Manager</p>
                            <p className="text-xs text-slate-500">View Profile</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-50 flex items-center justify-between p-4 shadow-md">
                <span className="font-bold text-lg">FormosaStay</span>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-slate-900 z-40 pt-20 px-4 md:hidden">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                onChangeView(item.id);
                                setIsMobileMenuOpen(false);
                            }}
                            className="flex items-center w-full px-4 py-4 mb-2 rounded-lg text-slate-300 hover:bg-slate-800"
                        >
                            <item.icon size={24} className="mr-4" />
                            <span className="text-lg">{item.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto h-full pt-16 md:pt-0">
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
