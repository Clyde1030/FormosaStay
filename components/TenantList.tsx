import React, { useState, useMemo } from 'react';
import { Search, Filter, MoreVertical, FileText, UserPlus } from 'lucide-react';
import { getTenantsWithDetails } from '../services/propertyService';
import { TenantWithContract, ContractStatus } from '../types';
import TenantDetailModal from './TenantDetailModal';
import NewTenantModal from './NewTenantModal';

const TenantList: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const [selectedTenant, setSelectedTenant] = useState<TenantWithContract | null>(null);
    const [isNewTenantModalOpen, setIsNewTenantModalOpen] = useState(false);
    
    // In a real app, this would be a useEffect fetching data.
    // For this prototype, we just call the getter, but we need to trigger re-renders if data changes.
    // We'll use a refresh key trick for now or just trust React's fast refresh for the demo content.
    const [tenants, setTenants] = useState<TenantWithContract[]>(getTenantsWithDetails());

    const refreshData = () => {
        setTenants(getTenantsWithDetails());
    };

    const filteredTenants = useMemo(() => {
        return tenants.filter(t => {
            const matchesSearch = 
                t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                t.room?.roomNumber.includes(searchTerm) ||
                t.phoneNumber.includes(searchTerm);
            
            const status = t.currentContract?.status || 'No Contract';
            const matchesFilter = filterStatus === 'All' || status === filterStatus;

            return matchesSearch && matchesFilter;
        });
    }, [tenants, searchTerm, filterStatus]);

    const getStatusColor = (status: string | undefined) => {
        switch (status) {
            case ContractStatus.ACTIVE: return 'bg-emerald-100 text-emerald-700';
            case ContractStatus.UPCOMING: return 'bg-blue-100 text-blue-700';
            case ContractStatus.TERMINATED: return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Tenants</h2>
                    <p className="text-slate-500">Manage your residents and their contracts.</p>
                </div>
                <button 
                    onClick={() => setIsNewTenantModalOpen(true)}
                    className="flex items-center justify-center bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                >
                    <UserPlus size={18} className="mr-2" />
                    Add Tenant
                </button>
            </header>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search by name, room, or phone..." 
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3">
                    <div className="flex items-center gap-1 text-slate-500 font-medium">
                        <Filter size={16} />
                        <span>Filter:</span>
                    </div>
                    <select 
                        className="bg-transparent py-2 focus:outline-none text-slate-700"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        <option value={ContractStatus.ACTIVE}>Active</option>
                        <option value={ContractStatus.UPCOMING}>Upcoming</option>
                        <option value={ContractStatus.TERMINATED}>Terminated</option>
                        <option value="No Contract">No Contract</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 font-semibold text-slate-600 text-sm">Tenant</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm">Contact</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm">Location</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm">Contract</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm">Status</th>
                                <th className="p-4 font-semibold text-slate-600 text-sm w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTenants.map((t) => (
                                <tr 
                                    key={t.id} 
                                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                    onClick={() => setSelectedTenant(t)}
                                >
                                    <td className="p-4">
                                        <div className="font-medium text-slate-900">{t.name}</div>
                                        <div className="text-xs text-slate-400">ID: {t.idNumber}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm text-slate-600">{t.phoneNumber}</div>
                                        {t.lineId && <div className="text-xs text-green-600">Line: {t.lineId}</div>}
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm text-slate-900">{t.room ? `Room ${t.room.roomNumber}` : 'Unassigned'}</div>
                                        <div className="text-xs text-slate-500">{t.building?.name || '-'}</div>
                                    </td>
                                    <td className="p-4">
                                        {t.currentContract ? (
                                            <div>
                                                <div className="text-sm font-medium">NT$ {t.currentContract.rentAmount.toLocaleString()}</div>
                                                <div className="text-xs text-slate-500">
                                                    {t.currentContract.startDate} ~ {t.currentContract.endDate}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-slate-400 italic">None</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(t.currentContract?.status)}`}>
                                            {t.currentContract?.status || 'No Contract'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button className="text-slate-400 hover:text-brand-600 p-2 rounded-full hover:bg-slate-200">
                                            <FileText size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTenants.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        No tenants found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedTenant && (
                <TenantDetailModal 
                    tenant={selectedTenant} 
                    onClose={() => {
                        setSelectedTenant(null);
                        refreshData();
                    }} 
                />
            )}
            
            {isNewTenantModalOpen && (
                <NewTenantModal 
                    onClose={() => {
                        setIsNewTenantModalOpen(false);
                        refreshData();
                    }} 
                />
            )}
        </div>
    );
};

export default TenantList;
