import React, { useState } from 'react';
import { X, Phone, MessageCircle, Home, Calendar, CreditCard, Key, AlertTriangle, CheckCircle, FilePlus, LogOut, Printer, Edit, Save } from 'lucide-react';
import { TenantWithContract, ContractStatus, PaymentFrequency, DepositStatus, Contract } from '../types';
import { calculateProration, terminateContract, createContract, updateTenant, updateContract } from '../services/propertyService';

interface Props {
    tenant: TenantWithContract;
    onClose: () => void;
}

const TenantDetailModal: React.FC<Props> = ({ tenant, onClose }) => {
    const [view, setView] = useState<'details' | 'terminate' | 'renew'>('details');
    const [isEditing, setIsEditing] = useState(false);
    
    // Edit Form State
    const [editTenant, setEditTenant] = useState({ ...tenant });
    const [editContract, setEditContract] = useState(tenant.currentContract ? { ...tenant.currentContract } : null);

    // Termination State
    const [terminationDate, setTerminationDate] = useState('');
    const [terminationReason, setTerminationReason] = useState('');
    const [prorationAmount, setProrationAmount] = useState<number | null>(null);

    // Renewal State
    const [renewStartDate, setRenewStartDate] = useState('');
    const [renewEndDate, setRenewEndDate] = useState('');
    const [renewRent, setRenewRent] = useState(tenant.currentContract?.rentAmount || 0);

    const handleCalculateProration = () => {
        if (!terminationDate || !tenant.currentContract) return;
        const amount = calculateProration(tenant.currentContract.rentAmount, terminationDate, tenant.currentContract.endDate);
        setProrationAmount(amount);
    };

    const handleTerminate = () => {
        if (!tenant.currentContract) return;
        terminateContract(tenant.currentContract.id, terminationDate, terminationReason);
        onClose(); // In a real app, maybe show a success toast first
    };

    const handleRenew = () => {
        if (!tenant.currentContract || !tenant.room) return;
        const oldContract = tenant.currentContract;
        
        createContract({
            tenantId: tenant.id,
            roomId: tenant.room.id,
            startDate: renewStartDate,
            endDate: renewEndDate,
            rentAmount: renewRent,
            paymentFrequency: oldContract.paymentFrequency,
            depositAmount: oldContract.depositAmount,
            depositStatus: DepositStatus.PAID,
            itemsIssued: oldContract.itemsIssued
        });
        onClose();
    };

    const handleSaveEdits = () => {
        updateTenant(tenant.id, editTenant);
        if (tenant.currentContract && editContract) {
            updateContract(tenant.currentContract.id, editContract);
        }
        setIsEditing(false);
        // We'd ideally refresh the parent data here, but closing will force refresh on re-open in this prototype architecture
        onClose(); 
    };

    const handlePrint = () => {
        alert("Generating PDF Contract... (Feature stub)");
        // window.print(); // In real app, this would open a formatted print window
    };

    if (!tenant) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end transition-opacity">
            <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex justify-between items-start bg-slate-50">
                    <div>
                        {isEditing ? (
                             <input 
                                className="text-2xl font-bold text-slate-800 border-b border-slate-300 bg-transparent mb-2" 
                                value={editTenant.name}
                                onChange={e => setEditTenant({...editTenant, name: e.target.value})}
                            />
                        ) : (
                            <h2 className="text-2xl font-bold text-slate-800">{tenant.name}</h2>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-sm text-slate-600">
                            {isEditing ? (
                                <>
                                    <input className="border rounded px-2 py-1" value={editTenant.phoneNumber} onChange={e => setEditTenant({...editTenant, phoneNumber: e.target.value})} />
                                    <input className="border rounded px-2 py-1" value={editTenant.lineId || ''} placeholder="Line ID" onChange={e => setEditTenant({...editTenant, lineId: e.target.value})} />
                                </>
                            ) : (
                                <>
                                    <span className="flex items-center gap-1"><Phone size={14}/> {tenant.phoneNumber}</span>
                                    {tenant.lineId && <span className="flex items-center gap-1 text-green-600 font-medium"><MessageCircle size={14}/> {tenant.lineId}</span>}
                                </>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={24} className="text-slate-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* View: Details */}
                    {view === 'details' && (
                        <>
                            <div className="flex justify-end gap-2 mb-2">
                                {isEditing ? (
                                     <button onClick={handleSaveEdits} className="flex items-center gap-2 bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-brand-700">
                                        <Save size={16} /> Save Changes
                                     </button>
                                ) : (
                                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 border border-slate-300 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50 text-slate-600">
                                        <Edit size={16} /> Edit Profile
                                    </button>
                                )}
                            </div>

                            {/* Personal Info */}
                            <section>
                                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Home size={20} className="text-brand-500"/> Personal & Room Info
                                </h3>
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-bold">ID Number</label>
                                        {isEditing ? (
                                            <input className="w-full border rounded px-2 py-1" value={editTenant.idNumber} onChange={e => setEditTenant({...editTenant, idNumber: e.target.value})} />
                                        ) : (
                                            <p className="text-slate-800">{tenant.idNumber}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-bold">Birthday</label>
                                        {isEditing ? (
                                            <input type="date" className="w-full border rounded px-2 py-1" value={editTenant.birthday} onChange={e => setEditTenant({...editTenant, birthday: e.target.value})} />
                                        ) : (
                                            <p className="text-slate-800">{tenant.birthday}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-bold">Address</label>
                                        {isEditing ? (
                                            <input className="w-full border rounded px-2 py-1" value={editTenant.homeAddress} onChange={e => setEditTenant({...editTenant, homeAddress: e.target.value})} />
                                        ) : (
                                            <p className="text-slate-800 text-sm">{tenant.homeAddress}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-bold">Motorcycle</label>
                                        {isEditing ? (
                                            <input className="w-full border rounded px-2 py-1" value={editTenant.motorcyclePlate || ''} onChange={e => setEditTenant({...editTenant, motorcyclePlate: e.target.value})} />
                                        ) : (
                                            <p className="text-slate-800">{tenant.motorcyclePlate || 'N/A'}</p>
                                        )}
                                    </div>
                                    <div className="col-span-2 mt-2 pt-2 border-t border-slate-200">
                                        <label className="text-xs text-slate-500 uppercase font-bold">Current Residence</label>
                                        <p className="text-lg font-medium text-brand-700">
                                            {tenant.building?.name} — Room {tenant.room?.roomNumber}
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Contract Info */}
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                        <CreditCard size={20} className="text-brand-500"/> Current Contract
                                    </h3>
                                    {tenant.currentContract?.status === ContractStatus.ACTIVE && (
                                        <div className="flex gap-2">
                                            <button onClick={handlePrint} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg" title="Print Contract">
                                                <Printer size={18} />
                                            </button>
                                            <button 
                                                onClick={() => setView('renew')}
                                                className="px-3 py-1.5 text-sm bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100 font-medium flex items-center gap-1"
                                            >
                                                <FilePlus size={14}/> Renew
                                            </button>
                                            <button 
                                                onClick={() => setView('terminate')}
                                                className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium flex items-center gap-1"
                                            >
                                                <LogOut size={14}/> Terminate
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                {tenant.currentContract ? (
                                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                        <div className="p-4 grid grid-cols-2 gap-y-4">
                                            <div>
                                                <label className="text-xs text-slate-400">Status</label>
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${tenant.currentContract.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                    <span className="font-medium">{tenant.currentContract.status}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400">Rent Amount</label>
                                                {isEditing && editContract ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm">NT$</span>
                                                        <input className="w-24 border rounded px-1" type="number" value={editContract.rentAmount} onChange={e => setEditContract({...editContract, rentAmount: Number(e.target.value)})} />
                                                    </div>
                                                ) : (
                                                    <div className="font-medium">NT$ {tenant.currentContract.rentAmount.toLocaleString()} / {tenant.currentContract.paymentFrequency}</div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400">Duration</label>
                                                {isEditing && editContract ? (
                                                    <div className="flex flex-col gap-1">
                                                        <input type="date" className="border rounded px-1 text-sm" value={editContract.startDate} onChange={e => setEditContract({...editContract, startDate: e.target.value})} />
                                                        <input type="date" className="border rounded px-1 text-sm" value={editContract.endDate} onChange={e => setEditContract({...editContract, endDate: e.target.value})} />
                                                    </div>
                                                ) : (
                                                    <div className="font-medium text-sm">
                                                        {tenant.currentContract.startDate} <span className="text-slate-400">to</span> {tenant.currentContract.endDate}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400">Deposit</label>
                                                {isEditing && editContract ? (
                                                     <div className="flex items-center gap-1">
                                                        <span className="text-sm">NT$</span>
                                                        <input className="w-24 border rounded px-1" type="number" value={editContract.depositAmount} onChange={e => setEditContract({...editContract, depositAmount: Number(e.target.value)})} />
                                                    </div>
                                                ) : (
                                                    <div className="font-medium text-sm flex items-center gap-2">
                                                        NT$ {tenant.currentContract.depositAmount.toLocaleString()}
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${tenant.currentContract.depositStatus === 'Paid' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-red-200 text-red-700'}`}>
                                                            {tenant.currentContract.depositStatus}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-xs text-slate-400">Items Issued</label>
                                                <div className="flex gap-2 mt-1">
                                                    {tenant.currentContract.itemsIssued.map((item, i) => (
                                                        <span key={i} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs border border-slate-200 flex items-center gap-1">
                                                            <Key size={10}/> {item}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
                                        No active contract found.
                                        <button className="block mx-auto mt-2 text-brand-600 font-medium hover:underline">Create Contract</button>
                                    </div>
                                )}
                            </section>
                        </>
                    )}

                    {/* View: Terminate */}
                    {view === 'terminate' && tenant.currentContract && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-6 space-y-6">
                            <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                                <AlertTriangle className="text-red-600"/> Early Termination
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-red-900 mb-1">Termination Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full border border-red-200 rounded-lg p-2 focus:ring-red-500 focus:border-red-500"
                                        value={terminationDate}
                                        onChange={(e) => setTerminationDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-red-900 mb-1">Reason</label>
                                    <textarea 
                                        className="w-full border border-red-200 rounded-lg p-2 h-20" 
                                        placeholder="e.g., Job relocation"
                                        value={terminationReason}
                                        onChange={(e) => setTerminationReason(e.target.value)}
                                    ></textarea>
                                </div>
                                <button 
                                    onClick={handleCalculateProration}
                                    className="text-sm text-red-700 underline font-medium"
                                >
                                    Calculate Proration
                                </button>
                                
                                {prorationAmount !== null && (
                                    <div className="bg-white p-4 rounded-lg border border-red-100">
                                        <p className="text-sm text-slate-500">Based on rent NT${tenant.currentContract.rentAmount}/mo</p>
                                        <p className="text-lg font-bold text-slate-900 mt-1">
                                            Estimated Usage Fee: NT$ {prorationAmount.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            (Check specific contract terms regarding deposit penalty)
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <button 
                                        className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-medium"
                                        onClick={handleTerminate}
                                    >
                                        Confirm Termination
                                    </button>
                                    <button 
                                        className="px-4 py-2 border border-slate-300 bg-white rounded-lg hover:bg-slate-50"
                                        onClick={() => setView('details')}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* View: Renew */}
                    {view === 'renew' && tenant.currentContract && (
                         <div className="bg-brand-50 border border-brand-100 rounded-xl p-6 space-y-6">
                         <h3 className="text-lg font-bold text-brand-800 flex items-center gap-2">
                             <FilePlus className="text-brand-600"/> Renew Contract
                         </h3>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-sm font-medium text-brand-900 mb-1">New Start Date</label>
                                 <input 
                                     type="date" 
                                     className="w-full border border-brand-200 rounded-lg p-2"
                                     value={renewStartDate}
                                     onChange={(e) => setRenewStartDate(e.target.value)}
                                 />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-brand-900 mb-1">New End Date</label>
                                 <input 
                                     type="date" 
                                     className="w-full border border-brand-200 rounded-lg p-2"
                                     value={renewEndDate}
                                     onChange={(e) => setRenewEndDate(e.target.value)}
                                 />
                             </div>
                             <div className="col-span-2">
                                 <label className="block text-sm font-medium text-brand-900 mb-1">New Rent Amount (NTD)</label>
                                 <input 
                                     type="number" 
                                     className="w-full border border-brand-200 rounded-lg p-2"
                                     value={renewRent}
                                     onChange={(e) => setRenewRent(Number(e.target.value))}
                                 />
                             </div>

                             <div className="col-span-2 flex gap-3 pt-4">
                                 <button 
                                     className="flex-1 bg-brand-600 text-white py-2 rounded-lg hover:bg-brand-700 font-medium"
                                     onClick={handleRenew}
                                 >
                                     Create Renewal Contract
                                 </button>
                                 <button 
                                     className="px-4 py-2 border border-slate-300 bg-white rounded-lg hover:bg-slate-50"
                                     onClick={() => setView('details')}
                                 >
                                     Cancel
                                 </button>
                             </div>
                         </div>
                     </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default TenantDetailModal;
