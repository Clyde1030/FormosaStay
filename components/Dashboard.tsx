import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getDashboardStats, getBuildings } from '../services/propertyService';
import { Users, AlertCircle, DollarSign, Home } from 'lucide-react';

const Dashboard: React.FC = () => {
    const stats = getDashboardStats();
    const buildings = getBuildings();

    // Mock data for occupancy chart
    const data = buildings.map(b => ({
        name: b.name.split(' ')[0],
        total: b.totalRooms,
        occupied: Math.floor(b.totalRooms * (stats.occupancyRate === '100.0' ? 1 : Math.random() * 0.5 + 0.4))
    }));

    return (
        <div className="space-y-6">
            <header className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Overview</h2>
                <p className="text-slate-500">Welcome back. Here's what's happening in your properties.</p>
            </header>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Revenue (Est.)" 
                    value={`NT$ ${stats.monthlyRevenue.toLocaleString()}`} 
                    subtext="Monthly"
                    icon={<DollarSign className="text-emerald-500" />}
                    bgColor="bg-emerald-50"
                />
                <StatCard 
                    title="Occupancy Rate" 
                    value={`${stats.occupancyRate}%`} 
                    subtext={`${stats.occupied} / ${stats.totalRooms} Rooms`}
                    icon={<Users className="text-blue-500" />}
                    bgColor="bg-blue-50"
                />
                <StatCard 
                    title="Expiring Contracts" 
                    value={stats.expiringSoon.toString()} 
                    subtext="Next 60 Days"
                    icon={<AlertCircle className="text-amber-500" />}
                    bgColor="bg-amber-50"
                />
                 <StatCard 
                    title="Properties" 
                    value={buildings.length.toString()} 
                    subtext="Total Buildings"
                    icon={<Home className="text-purple-500" />}
                    bgColor="bg-purple-50"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold mb-6">Occupancy by Building</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{fill: '#64748b'}} />
                                <YAxis tick={{fill: '#64748b'}} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                                    cursor={{fill: '#f1f5f9'}}
                                />
                                <Bar dataKey="occupied" name="Occupied" radius={[4, 4, 0, 0]}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill="#0ea5e9" />
                                    ))}
                                </Bar>
                                <Bar dataKey="total" name="Total Capacity" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <button className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition-colors flex items-center justify-between group">
                            <span className="font-medium text-slate-700 group-hover:text-brand-700">Add New Tenant</span>
                            <PlusCircle size={18} className="text-slate-400 group-hover:text-brand-500" />
                        </button>
                        <button className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition-colors flex items-center justify-between group">
                            <span className="font-medium text-slate-700 group-hover:text-brand-700">Record Payment</span>
                            <DollarSign size={18} className="text-slate-400 group-hover:text-brand-500" />
                        </button>
                        <button className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition-colors flex items-center justify-between group">
                            <span className="font-medium text-slate-700 group-hover:text-brand-700">Maintenance Req</span>
                            <AlertCircle size={18} className="text-slate-400 group-hover:text-brand-500" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, subtext, icon, bgColor }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between hover:shadow-md transition-shadow">
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

import { PlusCircle } from 'lucide-react';

export default Dashboard;
