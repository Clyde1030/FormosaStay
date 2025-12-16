import React, { useState } from 'react';
import { getBuildings, getRooms, getTenantInRoom, getTransactionsByRoom } from '../services/propertyService';
import { Room, Building, TenantWithContract } from '../types';
import { User, Zap, DollarSign, X, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart, Area, Legend } from 'recharts';

const RoomManager: React.FC = () => {
    const buildings = getBuildings();
    const rooms = getRooms();
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

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
                            {rooms.filter(r => r.buildingId === b.id).map(r => (
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

const RoomCard = ({ room, onClick }: { room: Room, onClick: () => void }) => {
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
    const tenant = getTenantInRoom(roomId);
    const room = getRooms().find(r => r.id === roomId);
    const txs = getTransactionsByRoom(roomId);

    // Chart Data Preparation
    const rentData = txs.filter(t => t.type === 'Rent').map(t => ({
        date: t.dueDate,
        amount: t.amount,
        status: t.status
    })).reverse();

    const elecData = txs.filter(t => t.type === 'Electricity').map(t => ({
        date: t.dueDate,
        usage: (t.readingEnd || 0) - (t.readingStart || 0),
        cost: t.amount
    })).reverse();

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end">
            <div className="w-full max-w-4xl bg-white h-full shadow-2xl animate-slide-in-right overflow-y-auto">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Room {room?.roomNumber} Dashboard</h2>
                        <p className="text-slate-500">{tenant ? `Tenant: ${tenant.name}` : 'Currently Vacant'}</p>
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
                    {tenant && (
                        <div className="bg-brand-50 border border-brand-100 rounded-xl p-6 flex items-start gap-4">
                            <div className="bg-brand-100 p-3 rounded-full text-brand-600">
                                <User size={24} />
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-brand-600 font-bold uppercase">Phone</label>
                                    <p className="font-medium text-slate-800">{tenant.phoneNumber}</p>
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
                                    <Tooltip />
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
                                    <Tooltip />
                                    <Legend />
                                    <Area yAxisId="left" type="monotone" dataKey="cost" fill="#8884d8" stroke="#8884d8" name="Bill ($)" />
                                    <Bar yAxisId="right" dataKey="usage" barSize={20} fill="#82ca9d" name="Usage (deg)" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default RoomManager;
