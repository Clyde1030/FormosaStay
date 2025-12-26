import React, { useState, useEffect } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { createContract, getTenants } from '../services/propertyService';
import { Tenant, PaymentFrequency } from '../types';

interface LeaseAsset {
    type: '鑰匙' | '磁扣' | '遙控器';
    quantity: number;
}

interface Props {
    roomId: number | string; // Can be number or string (from Room.id which is 'any')
    tenantId?: number; // Optional: if tenant is already selected
    onClose: () => void;
    onSuccess?: () => void;
}

const NewContractModal: React.FC<Props> = ({ roomId, tenantId, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        tenant_id: tenantId || 0,
        start_date: '',
        end_date: '',
        monthly_rent: '',
        deposit: '',
        pay_rent_on: '1',
        payment_term: PaymentFrequency.MONTHLY,
        vehicle_plate: '',
    });
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [assets, setAssets] = useState<LeaseAsset[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingTenants, setLoadingTenants] = useState(true);

    useEffect(() => {
        const loadTenants = async () => {
            try {
                const data = await getTenants();
                setTenants(data);
            } catch (err) {
                console.error('Error loading tenants:', err);
            } finally {
                setLoadingTenants(false);
            }
        };
        loadTenants();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            if (!formData.tenant_id) {
                throw new Error('Please select a tenant');
            }

            const contractData = {
                tenant_id: formData.tenant_id,
                room_id: typeof roomId === 'string' ? parseInt(roomId) : roomId,
                start_date: formData.start_date,
                end_date: formData.end_date,
                monthly_rent: parseFloat(formData.monthly_rent),
                deposit: parseFloat(formData.deposit),
                pay_rent_on: parseInt(formData.pay_rent_on),
                payment_term: formData.payment_term,
                vehicle_plate: formData.vehicle_plate.trim() || undefined,
                assets: assets.length > 0 ? assets : undefined,
            };

            await createContract(contractData);
            
            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create contract. Please try again.');
            console.error('Error creating contract:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                {/* Fixed Header */}
                <div className="flex justify-between items-center p-6 pb-4 border-b border-slate-200 flex-shrink-0">
                    <h3 className="text-xl font-bold text-slate-800">Create New Contract</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 px-6 py-4">
                    <form onSubmit={handleSubmit} id="contract-form" className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tenant *</label>
                        {loadingTenants ? (
                            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-500">Loading tenants...</div>
                        ) : (
                            <select
                                required
                                disabled={!!tenantId}
                                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none disabled:bg-slate-100"
                                value={formData.tenant_id}
                                onChange={e => setFormData({...formData, tenant_id: parseInt(e.target.value)})}
                            >
                                <option value="0">Select a tenant...</option>
                                {tenants.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.last_name}{t.first_name} ({t.personal_id})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                            <input
                                required
                                type="date"
                                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none"
                                value={formData.start_date}
                                onChange={e => setFormData({...formData, start_date: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
                            <input
                                required
                                type="date"
                                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none"
                                value={formData.end_date}
                                onChange={e => setFormData({...formData, end_date: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Rent (NT$) *</label>
                            <input
                                required
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none"
                                value={formData.monthly_rent}
                                onChange={e => setFormData({...formData, monthly_rent: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Deposit (NT$) *</label>
                            <input
                                required
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none"
                                value={formData.deposit}
                                onChange={e => setFormData({...formData, deposit: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Rent Due Day (1-31) *</label>
                            <input
                                required
                                type="number"
                                min="1"
                                max="31"
                                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none"
                                value={formData.pay_rent_on}
                                onChange={e => setFormData({...formData, pay_rent_on: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Frequency *</label>
                            <select
                                required
                                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none"
                                value={formData.payment_term}
                                onChange={e => setFormData({...formData, payment_term: e.target.value as PaymentFrequency})}
                            >
                                {Object.values(PaymentFrequency).map(f => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Plate</label>
                        <input
                            type="text"
                            placeholder="e.g., ABC-1234"
                            className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none"
                            value={formData.vehicle_plate}
                            onChange={e => setFormData({...formData, vehicle_plate: e.target.value})}
                        />
                    </div>

                    {/* Assets Section */}
                    <div className="border-t border-slate-200 pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-slate-700">Lease Assets (租賃物品)</label>
                            <button
                                type="button"
                                onClick={() => setAssets([...assets, { type: '鑰匙', quantity: 1 }])}
                                className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
                            >
                                <Plus size={16} />
                                Add Asset
                            </button>
                        </div>
                        
                        {assets.map((asset, index) => (
                            <div key={index} className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-slate-600">Asset {index + 1}</span>
                                    <button
                                        type="button"
                                        onClick={() => setAssets(assets.filter((_, i) => i !== index))}
                                        className="text-red-500 hover:text-red-700 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Type *</label>
                                        <select
                                            required
                                            className="w-full border border-slate-300 rounded-lg p-1.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                            value={asset.type}
                                            onChange={e => {
                                                const updated = [...assets];
                                                updated[index].type = e.target.value as '鑰匙' | '磁扣' | '遙控器';
                                                setAssets(updated);
                                            }}
                                        >
                                            <option value="鑰匙">鑰匙 (Key)</option>
                                            <option value="磁扣">磁扣 (Fob)</option>
                                            <option value="遙控器">遙控器 (Remote)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Quantity *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            className="w-full border border-slate-300 rounded-lg p-1.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                            value={asset.quantity}
                                            onChange={e => {
                                                const updated = [...assets];
                                                updated[index].quantity = parseInt(e.target.value) || 1;
                                                setAssets(updated);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {assets.length === 0 && (
                            <p className="text-xs text-slate-500 italic">No assets added. Click "Add Asset" to add items like keys, fobs, or remotes.</p>
                        )}
                    </div>
                    </form>
                </div>

                {/* Fixed Footer */}
                <div className="p-6 pt-4 border-t border-slate-200 flex gap-3 flex-shrink-0 bg-white rounded-b-xl">
                    <button
                        type="submit"
                        form="contract-form"
                        disabled={isSubmitting}
                        className="flex-1 bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                Creating...
                            </>
                        ) : (
                            'Create Contract'
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewContractModal;

