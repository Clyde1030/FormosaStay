
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TenantList from './components/TenantList';
import FinanceManager from './components/FinanceManager';
import RoomManager from './components/RoomManager';
import SystemSettings from './components/SystemSettings';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState('dashboard');

    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                return <Dashboard />;
            case 'finance':
                return <FinanceManager />;
            case 'tenants':
                return <TenantList />;
            case 'rooms':
                return <RoomManager />;
            case 'settings':
                return <SystemSettings />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <Layout currentView={currentView} onChangeView={setCurrentView}>
            {/* If we had real auth, we'd render a Login component here if !session */}
            {renderView()}
        </Layout>
    );
};

export default App;
