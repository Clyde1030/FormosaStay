
import React, { useState, useEffect } from 'react';
import { getBuildings, getRooms, getTenantInRoom, getTransactionsByRoom, getRoomElectricityHistory, getRoomTenants } from '../services/propertyService';
import { Room, Building, TenantWithContract, Transaction, PaymentFrequencyLabels, PaymentFrequency, LeaseAssetTypeLabels, LeaseAssetType } from '../types';
import { User, Zap, DollarSign, X, ArrowRight, MapPin, Maximize, FilePlus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart, Area, Legend } from 'recharts';
import TenantDetailModal from './TenantDetailModal';
import NewContractModal from './NewContractModal';

const RoomManager: React.FC = () => {
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            const [bs, rs] = await Promise.all([getBuildings(), getRooms()]);
            setBuildings(bs);
            setRooms(rs);
        };
        loadData();
    }, []);

    return (
        <div className="space-y-8">
             <header>
                <h2 className="text-2xl font-bold text-slate-800">Buildings & Rooms</h2>
                <p className="text-slate-500">Visual overview of your portfolio.</p>
            </header>

            <div className="space-y-8">
                {buildings.map(b => (
                    <div key={b.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{b.name}</h3>
                                <p className="text-sm text-slate-500">{b.address}</p>
                            </div>
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{b.totalRooms} Rooms</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {rooms.filter(r => r.building_id === b.id).map(r => (
                                <RoomCard key={r.id} room={r} onClick={() => setSelectedRoomId(r.id)} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {selectedRoomId && <RoomDetailDashboard roomId={selectedRoomId} onClose={() => setSelectedRoomId(null)} />}
        </div>
    );
};

const RoomCard: React.FC<{ room: Room, onClick: () => void }> = ({ room, onClick }) => {
    const isOccupied = room.status === 'Occupied';
    return (
        <div 
            onClick={onClick}
            className={`cursor-pointer rounded-lg p-3 border transition-all hover:shadow-md ${
                isOccupied ? 'bg-blue-50 border-blue-200 hover:border-blue-400' : 'bg-slate-50 border-slate-200 hover:border-slate-400'
            }`}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-slate-700">{room.roomNumber}</span>
                <span className={`w-2 h-2 rounded-full ${isOccupied ? 'bg-blue-500' : 'bg-slate-300'}`}></span>
            </div>
            <div className="text-xs text-slate-500">
                {isOccupied ? 'Occupied' : 'Vacant'}
            </div>
        </div>
    );
};

const RoomDetailDashboard = ({ roomId, onClose }: { roomId: string, onClose: () => void }) => {
    const [tenant, setTenant] = useState<TenantWithContract | null>(null);
    const [room, setRoom] = useState<Room | null>(null);
    const [building, setBuilding] = useState<Building | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [electricityData, setElectricityData] = useState<any[]>([]);
    const [roomTenants, setRoomTenants] = useState<any[]>([]);
    const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [t, rs, txs, elec, bs, tenants] = await Promise.all([
                    getTenantInRoom(roomId),
                    getRooms(),
                    getTransactionsByRoom(roomId),
                    getRoomElectricityHistory(roomId),
                    getBuildings(),
                    getRoomTenants(roomId)
                ]);
                const r = rs.find(item => item.id === roomId) || null;
                setTenant(t);
                setRoom(r);
                setTransactions(txs);
                setElectricityData(elec);
                setRoomTenants(tenants);
                if (r) {
                    setBuilding(bs.find(b => b.id === r.building_id) || null);
                }
            } catch (error) {
                console.error('Error loading room data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [roomId]);

    const rentData = transactions.filter(t => t.type === 'Rent').map(t => ({
        date: t.dueDate,
        amount: t.amount,
        status: t.status,
        periodStart: t.periodStart,
        periodEnd: t.periodEnd
    })).reverse();

    // Use electricity history from the new endpoint
    const elecData = electricityData.map(item => ({
        date: item.date,
        usage: item.usage,
        cost: item.cost,
        periodStart: item.periodStart,
        periodEnd: item.periodEnd,
        readingStart: item.readingStart,
        readingEnd: item.readingEnd
    }));

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-xs z-50">
                    <p className="font-bold text-slate-800 mb-1">{data.date}</p>
                    {data.amount !== undefined && (
                        <p className="text-slate-600">Amount: <span className="font-medium">NT$ {data.amount.toLocaleString()}</span></p>
                    )}
                    {data.cost !== undefined && (
                        <p className="text-slate-600">Cost: <span className="font-medium">NT$ {data.cost.toLocaleString()}</span></p>
                    )}
                    {data.usage !== undefined && (
                        <p className="text-slate-600">Usage: <span className="font-medium">{data.usage.toLocaleString()} kWh</span></p>
                    )}
                    {data.periodStart && (
                        <p className="text-slate-500 mt-1">Period: {data.periodStart} ~ {data.periodEnd}</p>
                    )}
                    {data.status && (
                        <p className={`mt-1 font-medium ${data.status === 'Paid' ? 'text-emerald-600' : 'text-red-600'}`}>{data.status}</p>
                    )}
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end">
                <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
                        <p className="text-slate-600">Loading room data...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end">
            <div className="w-full max-w-4xl bg-white h-full shadow-2xl animate-slide-in-right overflow-y-auto">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">
                            {building?.building_no}號{room?.roomNumber} Dashboard
                        </h2>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                            <span className="flex items-center gap-1"><MapPin size={14}/> {building?.address}{room?.roomNumber}</span>
                            <span className="flex items-center gap-1"><Maximize size={14}/> {room?.sizePing} Ping</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={onClose} 
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                        >
                            <X size={18} /> Close Dashboard
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    {/* Tenant Basic Information Card */}
                    {roomTenants.length > 0 ? (
                        <div className="bg-brand-50 border border-brand-100 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-brand-100 p-3 rounded-full text-brand-600">
                                    <User size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">Tenant Basic Information</h3>
                            </div>
                            
                            {(() => {
                                const primaryTenant = roomTenants.find(tt => tt.tenant_role === '主要');
                                const coTenants = roomTenants.filter(tt => tt.tenant_role !== '主要');
                                const leaseInfo = primaryTenant || roomTenants[0]; // Use primary tenant's lease info
                                
                                return (
                                    <div className="space-y-6">
                                        {/* Lease Information (shared by all tenants) */}
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-700 mb-3">Lease Information</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="text-xs text-brand-600 font-bold uppercase">Lease Start Date</label>
                                                    <p className="font-medium text-slate-800">{leaseInfo?.lease_start_date || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-brand-600 font-bold uppercase">Lease End Date</label>
                                                    <p className="font-medium text-slate-800">{leaseInfo?.lease_end_date || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-brand-600 font-bold uppercase">Rent (Monthly)</label>
                                                    <p className="font-medium text-slate-800">NT$ {Number(leaseInfo?.monthly_rent || 0).toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-brand-600 font-bold uppercase">Pay Rent On</label>
                                                    <p className="font-medium text-slate-800">Day {leaseInfo?.pay_rent_on || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-brand-600 font-bold uppercase">Payment Term</label>
                                                    <p className="font-medium text-slate-800">
                                                        {leaseInfo?.payment_term 
                                                            ? (PaymentFrequencyLabels[leaseInfo.payment_term as PaymentFrequency] || leaseInfo.payment_term)
                                                            : 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-brand-600 font-bold uppercase">Lease Status</label>
                                                    <p className="font-medium text-slate-800">{leaseInfo?.lease_status || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-brand-600 font-bold uppercase">Vehicle Plate</label>
                                                    <p className="font-medium text-slate-800">{leaseInfo?.vehicle_plate || 'N/A'}</p>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="text-xs text-brand-600 font-bold uppercase">Assets</label>
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {Array.isArray(leaseInfo?.assets) && leaseInfo.assets.length > 0 ? (
                                                            leaseInfo.assets.map((asset: any, idx: number) => {
                                                                let assetText: string;
                                                                if (typeof asset === 'object' && asset !== null && 'type' in asset) {
                                                                    // Display Chinese label for English enum value
                                                                    const assetType = asset.type as LeaseAssetType;
                                                                    const label = LeaseAssetTypeLabels[assetType] || assetType;
                                                                    assetText = `${label} x${asset.quantity || 1}`;
                                                                } else {
                                                                    assetText = String(asset);
                                                                }
                                                                return (
                                                                    <span key={idx} className="bg-white px-2 py-1 rounded text-xs border border-brand-200">
                                                                        {assetText}
                                                                    </span>
                                                                );
                                                            })
                                                        ) : (
                                                            <span className="text-slate-500 text-sm">N/A</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Primary Tenant */}
                                        {primaryTenant && (
                                            <div className="pt-4 border-t border-brand-200">
                                                <h4 className="text-sm font-bold text-slate-700 mb-3">
                                                    Primary Tenant
                                                    <span 
                                                        className="ml-2 text-brand-600 cursor-pointer hover:underline text-xs font-normal"
                                                        onClick={() => setIsTenantModalOpen(true)}
                                                    >
                                                        (View Details)
                                                    </span>
                                                </h4>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="text-xs text-brand-600 font-bold uppercase">Name</label>
                                                        <p className="font-medium text-slate-800">{primaryTenant.last_name || ''}{primaryTenant.first_name || ''}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-brand-600 font-bold uppercase">Gender</label>
                                                        <p className="font-medium text-slate-800">{primaryTenant.gender || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-brand-600 font-bold uppercase">Personal ID</label>
                                                        <p className="font-medium text-slate-800">{primaryTenant.personal_id || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-brand-600 font-bold uppercase">Phone</label>
                                                        <p className="font-medium text-slate-800">{primaryTenant.phone || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-brand-600 font-bold uppercase">Email</label>
                                                        <p className="font-medium text-slate-800">{primaryTenant.email || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-brand-600 font-bold uppercase">Line ID</label>
                                                        <p className="font-medium text-slate-800">{primaryTenant.line_id || 'N/A'}</p>
                                                    </div>
                                                    <div className="md:col-span-3">
                                                        <label className="text-xs text-brand-600 font-bold uppercase">Home Address</label>
                                                        <p className="font-medium text-slate-800 text-sm">{primaryTenant.tenant_address || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Co-Tenants */}
                                        {coTenants.length > 0 && (
                                            <div className="pt-4 border-t border-brand-200">
                                                <h4 className="text-sm font-bold text-slate-700 mb-3">Co-Tenants</h4>
                                                <div className="space-y-4">
                                                    {coTenants.map((coTenant, idx) => (
                                                        <div key={idx} className="bg-white p-4 rounded-lg border border-brand-200">
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                                <div>
                                                                    <label className="text-xs text-brand-600 font-bold uppercase">Name</label>
                                                                    <p className="font-medium text-slate-800">{coTenant.last_name || ''}{coTenant.first_name || ''}</p>
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-brand-600 font-bold uppercase">Gender</label>
                                                                    <p className="font-medium text-slate-800">{coTenant.gender || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-brand-600 font-bold uppercase">Personal ID</label>
                                                                    <p className="font-medium text-slate-800">{coTenant.personal_id || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-brand-600 font-bold uppercase">Phone</label>
                                                                    <p className="font-medium text-slate-800">{coTenant.phone || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-brand-600 font-bold uppercase">Email</label>
                                                                    <p className="font-medium text-slate-800">{coTenant.email || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-brand-600 font-bold uppercase">Line ID</label>
                                                                    <p className="font-medium text-slate-800">{coTenant.line_id || 'N/A'}</p>
                                                                </div>
                                                                <div className="md:col-span-3">
                                                                    <label className="text-xs text-brand-600 font-bold uppercase">Home Address</label>
                                                                    <p className="font-medium text-slate-800 text-sm">{coTenant.tenant_address || 'N/A'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    ) : tenant ? (
                        <div className="bg-brand-50 border border-brand-100 rounded-xl p-6 flex items-start gap-4">
                            <div className="bg-brand-100 p-3 rounded-full text-brand-600">
                                <User size={24} />
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-brand-600 font-bold uppercase">Tenant</label>
                                    <p 
                                        className="font-medium text-slate-800 text-lg cursor-pointer hover:text-brand-600 hover:underline decoration-brand-600 underline-offset-4"
                                        onClick={() => setIsTenantModalOpen(true)}
                                    >
                                        {tenant.name}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs text-brand-600 font-bold uppercase">Contract End</label>
                                    <p className="font-medium text-slate-800">{tenant.currentContract?.endDate}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-brand-600 font-bold uppercase">Rent</label>
                                    <p className="font-medium text-slate-800">NT$ {tenant.currentContract?.rentAmount.toLocaleString()}</p>
                                </div>
                                 <div>
                                    <label className="text-xs text-brand-600 font-bold uppercase">Line</label>
                                    <p className="font-medium text-slate-800">{tenant.lineId || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center">
                            <p className="text-slate-500 mb-4">Currently Vacant</p>
                            <button
                                onClick={() => setIsContractModalOpen(true)}
                                className="flex items-center gap-2 mx-auto px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                            >
                                <FilePlus size={18} />
                                Create New Contract
                            </button>
                        </div>
                    )}

                    {/* Rent Chart */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <DollarSign className="text-indigo-500" /> Rent Payment History
                        </h3>
                        {rentData.length > 0 ? (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={rentData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="amount" fill="#6366f1">
                                            {rentData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.status === 'Paid' ? '#10b981' : '#ef4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-slate-500">
                                <p>No payment history available</p>
                            </div>
                        )}
                    </div>

                    {/* Electric Chart */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Zap className="text-yellow-500" /> Electricity Usage & Cost
                        </h3>
                        {elecData.length > 0 ? (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={elecData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" />
                                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" label={{ value: 'Cost (NT$)', angle: -90, position: 'insideLeft' }} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" label={{ value: 'Usage (kWh)', angle: 90, position: 'insideRight' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Area yAxisId="left" type="monotone" dataKey="cost" fill="#8884d8" stroke="#8884d8" name="Cost (NT$)" />
                                        <Bar yAxisId="right" dataKey="usage" barSize={20} fill="#82ca9d" name="Usage (kWh)" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-slate-500">
                                <p>No electricity data available</p>
                            </div>
                        )}
                    </div>
                </div>

                {isTenantModalOpen && tenant && (
                    <TenantDetailModal 
                        tenant={tenant} 
                        onClose={() => setIsTenantModalOpen(false)} 
                    />
                )}

                {isContractModalOpen && room && (
                    <NewContractModal
                        roomId={room.id}
                        onClose={() => setIsContractModalOpen(false)}
                        onSuccess={async () => {
                            // Reload tenant data after contract creation
                            const t = await getTenantInRoom(roomId);
                            setTenant(t);
                            setIsContractModalOpen(false);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default RoomManager;
