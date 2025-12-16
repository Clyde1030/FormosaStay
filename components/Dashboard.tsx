import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getDashboardStats, getBuildings } from '../services/propertyService';
import { Users, AlertCircle, DollarSign, Home, Wallet, TrendingUp, Settings } from 'lucide-react';

const Dashboard: React.FC = () => {
    const [expiryDays, setExpiryDays] = useState(60);
    const stats = getDashboardStats(expiryDays);
    const buildings = getBuildings();

    // Mock data for occupancy chart
    const data = buildings.map(b => ({
        name: b.name.split(' ')[0],
        total: b.totalRooms,
        occupied: Math.floor(b.totalRooms * (stats.occupancyRate === '100.0' ? 1 : Math.random() * 0.5 + 0.4))
    }));

    return (
        <div className="space-y-6">
            <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Overview</h2>
                    <p className="text-slate-500">Welcome back. Here's what's happening in your properties.</p>
                </div>
                <div className="flex flex-col items-end">
                    <p className="text-sm text-slate-500 font-medium uppercase">Annual Net Operating Income</p>
                    <p className="text-3xl font-bold text-brand-600">NT$ {stats.annualNetProfit.toLocaleString()}</p>
                </div>
            </header>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Monthly Revenue" 
                    value={`NT$ ${stats.monthlyRevenue.toLocaleString()}`} 
                    subtext="Collected this month"
                    icon={<DollarSign className="text-emerald-500" />}
                    bgColor="bg-emerald-50"
                />
                <StatCard 
                    title="Unpaid / Overdue" 
                    value={stats.overdueCount.toString()} 
                    subtext="Pending Actions"
                    icon={<AlertCircle className="text-red-500" />}
                    bgColor="bg-red-50"
                />
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow relative">
                    <div className="flex items-start justify-between">
                         <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Expiring Soon</p>
                            <h3 className="text-2xl font-bold text-slate-900">{stats.expiringSoon}</h3>
                            <p className="text-xs text-slate-400 mt-1">Contracts ending</p>
                        </div>
                        <div className="p-3 rounded-lg bg-amber-50">
                            <TrendingUp className="text-amber-500" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm border-t border-slate-100 pt-2">
                        <span className="text-slate-400">Within</span>
                        <select 
                            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 outline-none text-xs"
                            value={expiryDays}
                            onChange={(e) => setExpiryDays(Number(e.target.value))}
                        >
                            <option value="30">30 Days</option>
                            <option value="60">60 Days</option>
                            <option value="90">90 Days</option>
                        </select>
                    </div>
                </div>
                <StatCard 
                    title="Occupancy" 
                    value={`${stats.occupancyRate}%`} 
                    subtext={`${stats.occupied} / ${stats.totalRooms} Rooms`}
                    icon={<Users className="text-blue-500" />}
                    bgColor="bg-blue-50"
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
                    <h3 className="text-lg font-semibold mb-4">Quick Insights</h3>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded text-green-600">
                                    <DollarSign size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase">YTD Revenue</p>
                                    <p className="font-bold text-slate-800">NT$ {stats.monthlyRevenue.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                         <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 rounded text-red-600">
                                    <Wallet size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase">YTD Expenses</p>
                                    <p className="font-bold text-slate-800">NT$ {(stats.monthlyRevenue - stats.annualNetProfit).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-100">
                             <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-500">Available Rooms</span>
                                <span className="font-bold text-slate-800">{stats.totalRooms - stats.occupied}</span>
                            </div>
                        </div>
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

export default Dashboard;
