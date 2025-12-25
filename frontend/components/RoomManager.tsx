
import React, { useState, useEffect } from 'react';
import { getBuildings, getRooms, getTenantInRoom, getTransactionsByRoom } from '../services/propertyService';
import { Room, Building, TenantWithContract, Transaction } from '../types';
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
    const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            const [t, rs, txs, bs] = await Promise.all([
                getTenantInRoom(roomId),
                getRooms(),
                getTransactionsByRoom(roomId),
                getBuildings()
            ]);
            const r = rs.find(item => item.id === roomId) || null;
            setTenant(t);
            setRoom(r);
            setTransactions(txs);
            if (r) {
                setBuilding(bs.find(b => b.id === r.building_id) || null);
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

    const elecData = transactions.filter(t => t.type === 'Electricity').map(t => ({
        date: t.dueDate,
        usage: (t.readingEnd || 0) - (t.readingStart || 0),
        cost: t.amount,
        periodStart: t.periodStart,
        periodEnd: t.periodEnd
    })).reverse();

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-xs z-50">
                    <p className="font-bold text-slate-800 mb-1">{data.date}</p>
                    <p className="text-slate-600">Amount: <span className="font-medium">NT$ {data.amount.toLocaleString()}</span></p>
                    {data.periodStart && (
                        <p className="text-slate-500 mt-1">Period: {data.periodStart} ~ {data.periodEnd}</p>
                    )}
                    <p className={`mt-1 font-medium ${data.status === 'Paid' ? 'text-emerald-600' : 'text-red-600'}`}>{data.status}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end">
            <div className="w-full max-w-4xl bg-white h-full shadow-2xl animate-slide-in-right overflow-y-auto">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Room {room?.roomNumber} Dashboard</h2>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                            <span className="flex items-center gap-1"><MapPin size={14}/> {building?.address}</span>
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
                    {/* Tenant Info Card */}
                    {tenant ? (
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
                    </div>

                    {/* Electric Chart */}
                     <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Zap className="text-yellow-500" /> Electricity Usage & Cost
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={elecData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" />
                                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Area yAxisId="left" type="monotone" dataKey="cost" fill="#8884d8" stroke="#8884d8" name="Bill ($)" />
                                    <Bar yAxisId="right" dataKey="usage" barSize={20} fill="#82ca9d" name="Usage (deg)" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
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
