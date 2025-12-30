
import React, { useState, useEffect } from 'react';
import { Database, Shield, Check, RefreshCw } from 'lucide-react';
import { apiClient } from '../services/apiClient';

const SystemSettings: React.FC = () => {
    const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);
    const [dbInfo, setDbInfo] = useState<any>(null);

    const checkDatabaseConnection = async () => {
        try {
            const info = await apiClient.get('/health/db');
            setIsDbConnected(true);
            setDbInfo(info);
        } catch (error) {
            setIsDbConnected(false);
            setDbInfo(null);
        }
    };

    useEffect(() => {
        checkDatabaseConnection();
    }, []);

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-800">System Settings</h2>
                <p className="text-slate-500">Infrastructure configuration and database design.</p>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px]">
                <div className="p-8">
                        <div className="max-w-3xl mx-auto space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
                                        <Database size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">PostgreSQL Database Connection</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            {isDbConnected === null ? (
                                                <RefreshCw size={14} className="animate-spin text-slate-400" />
                                            ) : (
                                                <div className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                            )}
                                            <span className="text-sm text-slate-500">
                                                {isDbConnected === null ? 'Checking connection...' : (isDbConnected ? 'Connected to Database' : 'Connection failed')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={checkDatabaseConnection}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                                >
                                    <RefreshCw size={14} /> Refresh
                                </button>
                            </div>

                            {isDbConnected && dbInfo && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Database Info</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[10px] text-slate-400 block mb-0.5">PostgreSQL Version</label>
                                                <code className="text-sm font-mono text-slate-700">{dbInfo.postgresql_version || 'Unknown'}</code>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 block mb-0.5">Tables Count</label>
                                                <code className="text-sm font-mono text-slate-700">{dbInfo.tables_count || 0}</code>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 block mb-0.5">Status</label>
                                                <span className="text-sm font-medium text-emerald-600">{dbInfo.status || 'ok'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-brand-50 border border-brand-100 rounded-xl space-y-4">
                                        <h4 className="text-xs font-bold text-brand-600 uppercase tracking-wider">Connection Details</h4>
                                        <ul className="text-sm text-brand-800 space-y-2">
                                            <li className="flex items-start gap-2">
                                                <Check size={16} className="shrink-0 mt-0.5" />
                                                <span>Backend API is connected to local PostgreSQL.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <Check size={16} className="shrink-0 mt-0.5" />
                                                <span>Database connection is active and healthy.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <Check size={16} className="shrink-0 mt-0.5" />
                                                <span>All API endpoints are available for data operations.</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {!isDbConnected && isDbConnected !== null && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex gap-3 items-start">
                                    <Shield className="text-red-500 shrink-0" size={20} />
                                    <div>
                                        <p className="text-sm font-bold text-red-800">Database Connection Failed</p>
                                        <p className="text-xs text-red-700 mt-1">
                                            Unable to connect to the PostgreSQL database. Please check:
                                        </p>
                                        <ul className="text-xs text-red-700 mt-2 list-disc list-inside space-y-1">
                                            <li>Ensure PostgreSQL is running</li>
                                            <li>Verify database connection settings in backend .env file</li>
                                            <li>Check that the database exists and schema is initialized</li>
                                            <li>Ensure the backend server is running</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
            </div>
        </div>
    );
};

export default SystemSettings;
