
import React, { useState, useEffect } from 'react';
import { X, Phone, MessageCircle, Home, Calendar, CreditCard, Key, AlertTriangle, CheckCircle, FilePlus, LogOut, Printer, Edit, Save, Zap, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { TenantWithContract, ContractStatus, PaymentFrequency, DepositStatus, Contract, EmergencyContact } from '../types';
import { calculateProration, terminateContract, renewContract, createContract, updateTenant, updateContract, recordMeterReading, getCurrentElectricityRate } from '../services/propertyService';
import NewContractModal from './NewContractModal';

interface Props {
    tenant: TenantWithContract;
    onClose: () => void;
}

const TenantDetailModal: React.FC<Props> = ({ tenant, onClose }) => {
    const [view, setView] = useState<'details' | 'terminate' | 'renew' | 'create'>('details');
    const [isEditing, setIsEditing] = useState(false);
    
    // Edit Form State
    const [editTenant, setEditTenant] = useState({ 
        ...tenant,
        emergency_contacts: tenant.emergency_contacts ? [...tenant.emergency_contacts] : []
    });
    const [editContract, setEditContract] = useState(tenant.currentContract ? { ...tenant.currentContract } : null);

    // Termination State
    const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split('T')[0]);
    const [terminationReason, setTerminationReason] = useState('');
    const [prorationAmount, setProrationAmount] = useState<number | null>(null);
    
    // Final Electricity State
    const [finalReading, setFinalReading] = useState<string>('');
    const [elecCost, setElecCost] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Fixed currentRate derivation to match synchronous getCurrentElectricityRate from propertyService
    const currentRate = tenant.room ? getCurrentElectricityRate(terminationDate, tenant.room.id) : 5.0;

    useEffect(() => {
        if (finalReading && tenant.room) {
            const usage = parseFloat(finalReading) - tenant.room.currentMeterReading;
            if (usage >= 0) {
                setElecCost(usage * currentRate);
            } else {
                setElecCost(0);
            }
        }
    }, [finalReading, tenant.room, currentRate]);

    const handleCalculateProration = () => {
        if (!terminationDate || !tenant.currentContract) return;
        const amount = calculateProration(tenant.currentContract.rentAmount, terminationDate, tenant.currentContract.endDate);
        setProrationAmount(amount);
    };

    const handleTerminate = async () => {
        if (!tenant.currentContract || !tenant.room) return;
        
        setIsSubmitting(true);
        setError(null);
        
        try {
            const meterReading = finalReading ? parseFloat(finalReading) : undefined;
            
            await terminateContract(
                tenant.currentContract.id,
                terminationDate,
                terminationReason,
                terminationDate, // meter_reading_date
                meterReading
            );
            
            onClose();
            // Trigger refresh in parent component if callback exists
            if ((onClose as any).onSuccess) {
                (onClose as any).onSuccess();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to terminate contract. Please try again.');
            console.error('Error terminating contract:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRenew = async () => {
        if (!tenant.currentContract || !tenant.room) return;
        
        setIsSubmitting(true);
        setError(null);
        
        try {
            const oldContract = tenant.currentContract;
            
            // Payment term is already in Chinese format, pass through directly
            await renewContract(tenant.currentContract.id, {
                new_end_date: renewEndDate,
                new_monthly_rent: renewRent,
                new_deposit: oldContract.depositAmount,
                new_pay_rent_on: oldContract.pay_rent_on || 1,
                new_payment_term: renewFrequency, // Already in Chinese: '月繳', '季繳', '半年繳', '年繳'
                new_vehicle_plate: renewVehiclePlate.trim() || undefined
            });
            
            onClose();
            // Trigger refresh in parent component if callback exists
            if ((onClose as any).onSuccess) {
                (onClose as any).onSuccess();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to renew contract. Please try again.');
            console.error('Error renewing contract:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveEdits = async () => {
        await updateTenant(tenant.id, editTenant);
        if (tenant.currentContract && editContract) {
            // Fix: Map UI properties back to backend schema fields for updateContract
            await updateContract(tenant.currentContract.id, {
                ...editContract,
                monthly_rent: editContract.rentAmount,
                payment_term: editContract.paymentFrequency,
                start_date: editContract.startDate,
                end_date: editContract.endDate,
                deposit: editContract.depositAmount
            });
        }
        setIsEditing(false);
        onClose(); 
    };

    const handlePrint = () => {
        alert("Generating PDF Contract... (Feature stub)");
    };

    // Renewal Form State
    const [renewStartDate, setRenewStartDate] = useState('');
    const [renewEndDate, setRenewEndDate] = useState('');
    const [renewRent, setRenewRent] = useState(tenant.currentContract?.rentAmount || 0);
    const [renewFrequency, setRenewFrequency] = useState<PaymentFrequency>(tenant.currentContract?.paymentFrequency || PaymentFrequency.MONTHLY);
    const [renewVehiclePlate, setRenewVehiclePlate] = useState(tenant.currentContract?.vehicle_plate || '');

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

                            {/* Emergency Contacts */}
                            <section>
                                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Users size={20} className="text-brand-500"/> Emergency Contacts
                                </h3>
                                {isEditing ? (
                                    <div className="space-y-3">
                                        {editTenant.emergency_contacts?.map((contact, index) => (
                                            <div key={index} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-medium text-slate-600">Contact {index + 1}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = [...(editTenant.emergency_contacts || [])];
                                                            updated.splice(index, 1);
                                                            setEditTenant({ ...editTenant, emergency_contacts: updated });
                                                        }}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 mb-2">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Last Name (姓氏)</label>
                                                        <input
                                                            type="text"
                                                            className="w-full border border-slate-300 rounded-lg p-1.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                                            value={contact.last_name}
                                                            onChange={e => {
                                                                const updated = [...(editTenant.emergency_contacts || [])];
                                                                updated[index].last_name = e.target.value;
                                                                setEditTenant({ ...editTenant, emergency_contacts: updated });
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">First Name (名字)</label>
                                                        <input
                                                            type="text"
                                                            className="w-full border border-slate-300 rounded-lg p-1.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                                            value={contact.first_name}
                                                            onChange={e => {
                                                                const updated = [...(editTenant.emergency_contacts || [])];
                                                                updated[index].first_name = e.target.value;
                                                                setEditTenant({ ...editTenant, emergency_contacts: updated });
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Relationship</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g., 父親, 母親, 朋友"
                                                            className="w-full border border-slate-300 rounded-lg p-1.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                                            value={contact.relationship}
                                                            onChange={e => {
                                                                const updated = [...(editTenant.emergency_contacts || [])];
                                                                updated[index].relationship = e.target.value;
                                                                setEditTenant({ ...editTenant, emergency_contacts: updated });
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                                                        <input
                                                            type="text"
                                                            className="w-full border border-slate-300 rounded-lg p-1.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                                            value={contact.phone}
                                                            onChange={e => {
                                                                const updated = [...(editTenant.emergency_contacts || [])];
                                                                updated[index].phone = e.target.value;
                                                                setEditTenant({ ...editTenant, emergency_contacts: updated });
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditTenant({
                                                    ...editTenant,
                                                    emergency_contacts: [...(editTenant.emergency_contacts || []), { first_name: '', last_name: '', relationship: '', phone: '' }]
                                                });
                                            }}
                                            className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
                                        >
                                            <Plus size={16} />
                                            Add Contact
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        {tenant.emergency_contacts && tenant.emergency_contacts.length > 0 ? (
                                            <div className="space-y-3">
                                                {tenant.emergency_contacts.map((contact, index) => (
                                                    <div key={contact.id || index} className="bg-white p-3 rounded-lg border border-slate-200">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="font-medium text-slate-800">{contact.last_name}{contact.first_name}</p>
                                                                <p className="text-xs text-slate-500 mt-1">{contact.relationship}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-slate-600">
                                                                <Phone size={14} />
                                                                <span className="text-sm">{contact.phone}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-slate-400 italic text-sm">No emergency contacts on file</p>
                                        )}
                                    </div>
                                )}
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
                                                    <span className={`w-2 h-2 rounded-full ${tenant.currentContract.status === '有效' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                    <span className="font-medium">{tenant.currentContract.status}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400">Rent Amount (Monthly Base)</label>
                                                {isEditing && editContract ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm">NT$</span>
                                                        <input className="w-24 border rounded px-1" type="number" value={editContract.rentAmount} onChange={e => setEditContract({...editContract, rentAmount: Number(e.target.value)})} />
                                                    </div>
                                                ) : (
                                                    <div className="font-medium">NT$ {tenant.currentContract.rentAmount.toLocaleString()}</div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400">Payment Frequency</label>
                                                {isEditing && editContract ? (
                                                    <select 
                                                        className="w-full border rounded px-1 text-sm py-1" 
                                                        value={editContract.paymentFrequency} 
                                                        onChange={e => setEditContract({...editContract, paymentFrequency: e.target.value as PaymentFrequency})}
                                                    >
                                                        {Object.values(PaymentFrequency).map(f => (
                                                            <option key={f} value={f}>{f}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="font-medium">{tenant.currentContract.paymentFrequency}</div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400">Vehicle Plate</label>
                                                {isEditing && editContract ? (
                                                    <input 
                                                        className="w-full border rounded px-1 text-sm py-1" 
                                                        value={editContract.vehicle_plate || ''} 
                                                        onChange={e => setEditContract({...editContract, vehicle_plate: e.target.value})}
                                                        placeholder="e.g., ABC-1234"
                                                    />
                                                ) : (
                                                    <div className="font-medium">{tenant.currentContract.vehicle_plate || 'N/A'}</div>
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
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${tenant.currentContract.depositStatus === DepositStatus.PAID ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-red-200 text-red-700'}`}>
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
                                        <button 
                                            onClick={() => setView('create')}
                                            className="block mx-auto mt-2 text-brand-600 font-medium hover:underline"
                                        >
                                            Create Contract
                                        </button>
                                    </div>
                                )}
                            </section>
                        </>
                    )}

                    {/* View: Terminate */}
                    {view === 'terminate' && tenant.currentContract && (
                        <div className="space-y-6">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                    {error}
                                </div>
                            )}
                            <div className="bg-red-50 border border-red-100 rounded-xl p-6 space-y-6">
                                <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                                    <AlertTriangle className="text-red-600"/> Early Termination Settlement
                                </h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-red-900 mb-1">Termination Date</label>
                                            <input 
                                                type="date" 
                                                className="w-full border border-red-200 rounded-lg p-2 focus:ring-red-500 focus:border-red-500"
                                                value={terminationDate}
                                                onChange={(e) => setTerminationDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button 
                                                onClick={handleCalculateProration}
                                                className="w-full py-2 bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-100 text-sm font-bold"
                                            >
                                                Calc Rent Proration
                                            </button>
                                        </div>
                                    </div>

                                    {prorationAmount !== null && (
                                        <div className="bg-white p-4 rounded-lg border border-red-100">
                                            <p className="text-xs text-slate-500">Base Rent: NT${tenant.currentContract.rentAmount.toLocaleString()}/mo</p>
                                            <p className="text-lg font-bold text-slate-900 mt-1">
                                                Prorated Rent: NT$ {prorationAmount.toLocaleString()}
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-red-900 mb-1">Reason for Move-out</label>
                                        <textarea 
                                            className="w-full border border-red-200 rounded-lg p-2 h-20" 
                                            placeholder="e.g., Job relocation"
                                            value={terminationReason}
                                            onChange={(e) => setTerminationReason(e.target.value)}
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            {/* Final Electricity Billing */}
                            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-6 space-y-4">
                                <h3 className="text-lg font-bold text-yellow-800 flex items-center gap-2">
                                    <Zap className="text-yellow-600"/> Final Electricity Meter
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-yellow-700 uppercase mb-1">Last Recorded Reading</label>
                                        <div className="bg-white border border-yellow-200 p-2 rounded-lg font-mono text-slate-500">
                                            {tenant.room?.currentMeterReading}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-yellow-700 uppercase mb-1">Final Reading</label>
                                        <input 
                                            type="number" 
                                            className="w-full border border-yellow-200 rounded-lg p-2 font-mono"
                                            placeholder="Current Meter"
                                            value={finalReading}
                                            onChange={(e) => setFinalReading(e.target.value)}
                                        />
                                    </div>
                                </div>
                                {elecCost > 0 && (
                                    <div className="p-3 bg-white border border-yellow-200 rounded-lg flex justify-between items-center">
                                        <div>
                                            <p className="text-xs text-slate-500">Usage Cost @ NT${currentRate}/deg</p>
                                            <p className="text-sm font-bold text-slate-800">
                                                Final Utility Bill: NT$ {elecCost.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="text-xs font-bold text-yellow-600">
                                            {parseFloat(finalReading) - (tenant.room?.currentMeterReading || 0)} deg
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4 sticky bottom-0 bg-white p-4 border-t border-slate-100">
                                <button 
                                    disabled={isSubmitting}
                                    className="flex-1 bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    onClick={handleTerminate}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="animate-spin" size={16} />
                                            Processing...
                                        </>
                                    ) : (
                                        'Confirm Final Settlement'
                                    )}
                                </button>
                                <button 
                                    className="px-6 py-3 border border-slate-300 bg-white rounded-xl hover:bg-slate-50 text-slate-600 font-medium"
                                    onClick={() => setView('details')}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* View: Renew */}
                    {view === 'renew' && tenant.currentContract && (
                         <div className="bg-brand-50 border border-brand-100 rounded-xl p-6 space-y-6">
                         <h3 className="text-lg font-bold text-brand-800 flex items-center gap-2">
                             <FilePlus className="text-brand-600"/> Renew Contract
                         </h3>
                         {error && (
                             <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                 {error}
                             </div>
                         )}
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
                             <div>
                                 <label className="block text-sm font-medium text-brand-900 mb-1">New Rent Amount (Monthly)</label>
                                 <input 
                                     type="number" 
                                     className="w-full border border-brand-200 rounded-lg p-2"
                                     value={renewRent}
                                     onChange={(e) => setRenewRent(Number(e.target.value))}
                                 />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-brand-900 mb-1">Payment Frequency</label>
                                 <select 
                                    className="w-full border border-brand-200 rounded-lg p-2 bg-white" 
                                    value={renewFrequency} 
                                    onChange={(e) => setRenewFrequency(e.target.value as PaymentFrequency)}
                                 >
                                    {Object.values(PaymentFrequency).map(f => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                 </select>
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-brand-900 mb-1">Vehicle Plate</label>
                                 <input 
                                    type="text"
                                    placeholder="e.g., ABC-1234"
                                    className="w-full border border-brand-200 rounded-lg p-2"
                                    value={renewVehiclePlate}
                                    onChange={e => setRenewVehiclePlate(e.target.value)}
                                 />
                             </div>

                             <div className="col-span-2 flex gap-3 pt-4">
                                 <button 
                                     disabled={isSubmitting}
                                     className="flex-1 bg-brand-600 text-white py-2 rounded-lg hover:bg-brand-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                     onClick={handleRenew}
                                 >
                                     {isSubmitting ? (
                                         <>
                                             <Loader2 className="animate-spin" size={16} />
                                             Processing...
                                         </>
                                     ) : (
                                         'Renew Contract'
                                     )}
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

                    {/* View: Create Contract */}
                    {view === 'create' && tenant.room && (
                        <NewContractModal
                            roomId={tenant.room.id}
                            tenantId={tenant.id}
                            onClose={() => setView('details')}
                            onSuccess={() => {
                                onClose();
                                if ((onClose as any).onSuccess) {
                                    (onClose as any).onSuccess();
                                }
                            }}
                        />
                    )}

                </div>
            </div>
        </div>
    );
};

export default TenantDetailModal;
