
import React, { useState, useEffect } from 'react';
import { getDashboardStats, getBuildings } from '../services/propertyService';
import { Users, AlertCircle, DollarSign, Home, TrendingUp, X, ChevronRight, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [buildings, setBuildings] = useState<any[]>([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [s, b] = await Promise.all([getDashboardStats(), getBuildings()]);
                setStats(s);
                setBuildings(b);
            } catch (e) {
                console.error("Dashboard load error:", e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-brand-600" size={48} />
        </div>
    );

    return (
        <div className="space-y-6">
            <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Overview</h2>
                    <p className="text-slate-500">Real-time data from your Supabase backend.</p>
                </div>
                <div className="flex flex-col items-end">
                    <p className="text-sm text-slate-500 font-medium uppercase">Pending Collections</p>
                    <p className="text-3xl font-bold text-red-600">NT$ {stats.overdueTotal.toLocaleString()}</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard 
                    title="Total Occupancy" 
                    value={`${stats.occupancyRate}%`} 
                    subtext={`${stats.occupied} / ${stats.totalRooms} Rooms`}
                    icon={<Home className="text-blue-500" />}
                    bgColor="bg-blue-50"
                />
                <StatCard 
                    title="Overdue Accounts" 
                    value={stats.overdueCount.toString()} 
                    subtext="Unpaid lease cycles"
                    icon={<AlertCircle className="text-red-500" />}
                    bgColor="bg-red-50"
                />
                <StatCard 
                    title="Buildings" 
                    value={buildings.length.toString()} 
                    subtext="Managed properties"
                    icon={<TrendingUp className="text-emerald-500" />}
                    bgColor="bg-emerald-50"
                />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-8">
                <h3 className="text-lg font-semibold mb-6">Managed Portfolio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {buildings.map(b => (
                        <div key={b.id} className="p-4 border border-slate-100 rounded-lg hover:border-brand-300 transition-colors">
                            <p className="text-xs font-bold text-brand-600 uppercase">Building {b.building_no}</p>
                            <p className="text-sm font-medium text-slate-800 mt-1">{b.address}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, subtext, icon, bgColor }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between">
        <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
            <p className="text-xs text-slate-400 mt-1">{subtext}</p>
        </div>
        <div className={`p-3 rounded-lg ${bgColor}`}>
            {icon}
        </div>
    </div>
);

export default Dashboard;
