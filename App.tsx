import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TenantList from './components/TenantList';
import AIAssistant from './components/AIAssistant';

// Simple mockup for the Room view as it wasn't prioritized in the prompt
const RoomViewMock = () => (
    <div className="text-center p-12 text-slate-500">
        <h3 className="text-xl font-bold mb-2">Building & Room Management</h3>
        <p>This module will allow visual grid management of your 4 buildings and 60 rooms.</p>
        <p className="mt-4 text-sm bg-yellow-100 inline-block px-3 py-1 rounded text-yellow-800">Coming Soon</p>
    </div>
);

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState('dashboard');

    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                return <Dashboard />;
            case 'tenants':
                return <TenantList />;
            case 'rooms':
                return <RoomViewMock />;
            case 'ai-assistant':
                return <AIAssistant />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <Layout currentView={currentView} onChangeView={setCurrentView}>
            {renderView()}
        </Layout>
    );
};

export default App;
