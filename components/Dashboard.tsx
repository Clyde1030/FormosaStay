import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getDashboardStats, getBuildings, getTransactions, getRooms } from '../services/propertyService';
import { Users, AlertCircle, DollarSign, Home, Wallet, TrendingUp, Settings, X, ChevronRight } from 'lucide-react';
import { Transaction } from '../types';

const Dashboard: React.FC = () => {
    const [expiryDays, setExpiryDays] = useState(60);
    const [isUnpaidModalOpen, setIsUnpaidModalOpen] = useState(false);
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
                    onClick={() => setIsUnpaidModalOpen(true)}
                    isClickable
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

            {isUnpaidModalOpen && <UnpaidDetailsModal onClose={() => setIsUnpaidModalOpen(false)} />}
        </div>
    );
};

const StatCard = ({ title, value, subtext, icon, bgColor, onClick, isClickable }: any) => (
    <div 
        className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between transition-all ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-brand-200 group' : ''}`}
        onClick={onClick}
    >
        <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
            <p className="text-xs text-slate-400 mt-1">{subtext}</p>
            {isClickable && (
                <div className="mt-3 text-xs font-bold text-brand-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    View Details <ChevronRight size={12} />
                </div>
            )}
        </div>
        <div className={`p-3 rounded-lg ${bgColor}`}>
            {icon}
        </div>
    </div>
);

const UnpaidDetailsModal = ({ onClose }: { onClose: () => void }) => {
    const transactions = getTransactions().filter(t => t.status === 'Overdue' || t.status === 'Pending');
    const rooms = getRooms();

    return (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col animate-fade-in">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Unpaid & Overdue Payments</h3>
                        <p className="text-sm text-slate-500">List of all pending rent, electricity, and fee collections.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-0">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                            <tr>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Room & Tenant</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Category</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Payment Period</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                             {transactions.length > 0 ? transactions.map(t => {
                                 const roomNumber = rooms.find(r => r.id === t.roomId)?.roomNumber || 'N/A';
                                 return (
                                     <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                         <td className="p-4">
                                             <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                                 t.status === 'Overdue' 
                                                 ? 'bg-red-50 text-red-700 border-red-200' 
                                                 : 'bg-orange-50 text-orange-700 border-orange-200'
                                             }`}>
                                                 {t.status}
                                             </span>
                                         </td>
                                         <td className="p-4">
                                             <div className="font-bold text-slate-800 flex items-center gap-2">
                                                 Room {roomNumber}
                                             </div>
                                             <div className="text-xs text-slate-500 mt-0.5">{t.tenantName || 'Unknown Tenant'}</div>
                                         </td>
                                         <td className="p-4">
                                             <span className={`text-sm font-medium ${
                                                 t.type === 'Rent' ? 'text-indigo-600' : 
                                                 t.type === 'Electricity' ? 'text-yellow-600' : 'text-slate-600'
                                             }`}>
                                                 {t.type}
                                             </span>
                                         </td>
                                         <td className="p-4 text-sm text-slate-600">
                                             <div className="font-medium">Due: {t.dueDate}</div>
                                             {t.periodStart && (
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    {t.periodStart} ~ {t.periodEnd}
                                                </div>
                                             )}
                                         </td>
                                         <td className="p-4 text-right font-bold text-slate-700">
                                             NT$ {t.amount.toLocaleString()}
                                         </td>
                                     </tr>
                                 )
                             }) : (
                                 <tr>
                                     <td colSpan={5} className="p-8 text-center text-slate-400">
                                         No unpaid items found. Great job!
                                     </td>
                                 </tr>
                             )}
                        </tbody>
                    </table>
                </div>
                
                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-between items-center text-sm text-slate-500">
                    <span>Total Unpaid Items: {transactions.length}</span>
                    <span className="font-bold text-slate-800">
                        Total Amount: NT$ {transactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
