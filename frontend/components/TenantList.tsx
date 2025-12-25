
import React, { useState, useEffect } from 'react';
import { Search, Filter, FileText, UserPlus, Loader2 } from 'lucide-react';
import { fetchTenantsWithDetails, getTenantInRoom, getTenantById } from '../services/propertyService';
import { TenantWithLease, TenantWithContract } from '../types';
import NewTenantModal from './NewTenantModal';
import TenantDetailModal from './TenantDetailModal';

const TenantList: React.FC = () => {
    const [tenants, setTenants] = useState<TenantWithLease[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<TenantWithContract | null>(null);

    const loadTenants = async () => {
        setLoading(true);
        try {
            const data = await fetchTenantsWithDetails();
            setTenants(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTenants();
    }, []);

    const filteredTenants = tenants.filter(t => 
        `${t.last_name}${t.first_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${t.last_name} ${t.first_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.room?.room_no?.includes(searchTerm)
    );

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Tenants</h2>
                    <p className="text-slate-500">Live data from PostgreSQL tenant & lease tables.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
                >
                    <UserPlus size={18} className="mr-2" />
                    Add Tenant
                </button>
            </header>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search by name or room..." 
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1">
                {loading ? (
                    <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-brand-600" /></div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500">
                            <tr>
                                <th className="p-4">Name</th>
                                <th className="p-4">Location</th>
                                <th className="p-4">Lease Details</th>
                                <th className="p-4">Contact</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTenants.map(t => (
                                <tr 
                                    key={t.id} 
                                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={async () => {
                                        // Load full tenant details with contract info
                                        try {
                                            if (t.room?.id) {
                                                // Tenant has a room, fetch via room
                                                const tenantDetails = await getTenantInRoom(t.room.id);
                                                if (tenantDetails) {
                                                    setSelectedTenant(tenantDetails);
                                                } else {
                                                    // Fallback: fetch by tenant ID
                                                    const tenantDetailsById = await getTenantById(t.id);
                                                    if (tenantDetailsById) {
                                                        setSelectedTenant(tenantDetailsById);
                                                    }
                                                }
                                            } else {
                                                // Tenant has no room, fetch by tenant ID directly
                                                const tenantDetails = await getTenantById(t.id);
                                                if (tenantDetails) {
                                                    setSelectedTenant(tenantDetails);
                                                } else {
                                                    // Fallback: use basic tenant info
                                                    setSelectedTenant({
                                                        ...t,
                                                        currentContract: undefined,
                                                        room: undefined,
                                                        emergency_contacts: []
                                                    } as TenantWithContract);
                                                }
                                            }
                                        } catch (err) {
                                            console.error('Error loading tenant details:', err);
                                            // Fallback: use basic tenant info
                                            setSelectedTenant({
                                                ...t,
                                                currentContract: undefined,
                                                room: t.room,
                                                emergency_contacts: []
                                            } as TenantWithContract);
                                        }
                                    }}
                                >
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900">{t.last_name}{t.first_name}</div>
                                        <div className="text-xs text-slate-400">{t.personal_id}</div>
                                    </td>
                                    <td className="p-4">
                                        {t.room ? (
                                            <>
                                                <div className="text-sm font-medium">Room {t.room.room_no}</div>
                                                <div className="text-xs text-slate-500">Building {t.building?.building_no}</div>
                                            </>
                                        ) : <span className="text-slate-400 italic text-sm">Vacant</span>}
                                    </td>
                                    <td className="p-4">
                                        {t.active_lease ? (
                                            <>
                                                <div className="text-sm font-bold text-slate-700">NT$ {t.active_lease.monthly_rent.toLocaleString()}</div>
                                                <div className="text-xs text-slate-500">{t.active_lease.start_date} ~ {t.active_lease.end_date}</div>
                                            </>
                                        ) : '-'}
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm">{t.phone}</div>
                                        {t.line_id && <div className="text-xs text-green-600">Line: {t.line_id}</div>}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.active_lease ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {t.active_lease ? 'Active' : 'No Lease'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {isModalOpen && (
                <NewTenantModal 
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        loadTenants();
                    }}
                />
            )}

            {selectedTenant && (
                <TenantDetailModal
                    tenant={selectedTenant}
                    onClose={() => {
                        setSelectedTenant(null);
                        loadTenants(); // Refresh list after any changes
                    }}
                />
            )}
        </div>
    );
};

export default TenantList;
