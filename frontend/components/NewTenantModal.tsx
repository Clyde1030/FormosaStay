import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createTenant } from '../services/propertyService';

interface Props {
    onClose: () => void;
    onSuccess?: () => void;
}

const NewTenantModal: React.FC<Props> = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        gender: 'M',
        birthday: '',
        personal_id: '',
        phone: '',
        email: '',
        line_id: '',
        address: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            // Map form data to backend schema
            const tenantData = {
                first_name: formData.first_name.trim(),
                last_name: formData.last_name.trim(),
                gender: formData.gender,
                birthday: formData.birthday,
                personal_id: formData.personal_id.trim(),
                phone: formData.phone.trim(),
                email: formData.email.trim() || undefined,
                line_id: formData.line_id.trim() || undefined,
                address: formData.address.trim()
            };

            await createTenant(tenantData);
            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create tenant. Please try again.');
            console.error('Error creating tenant:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">Add New Tenant</h3>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Last Name (姓氏) *</label>
                            <input 
                                required 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                                value={formData.last_name} 
                                onChange={e => setFormData({...formData, last_name: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">First Name (名字) *</label>
                            <input 
                                required 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                                value={formData.first_name} 
                                onChange={e => setFormData({...formData, first_name: e.target.value})} 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Gender *</label>
                            <select 
                                required 
                                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                                value={formData.gender} 
                                onChange={e => setFormData({...formData, gender: e.target.value})}
                            >
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                                <option value="O">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Birthday *</label>
                            <input 
                                required 
                                type="date" 
                                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                                value={formData.birthday} 
                                onChange={e => setFormData({...formData, birthday: e.target.value})} 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Personal ID / ARC Number *</label>
                        <input 
                            required 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                            value={formData.personal_id} 
                            onChange={e => setFormData({...formData, personal_id: e.target.value})} 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                            <input 
                                required 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                                value={formData.phone} 
                                onChange={e => setFormData({...formData, phone: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input 
                                type="email" 
                                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                                value={formData.email} 
                                onChange={e => setFormData({...formData, email: e.target.value})} 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">LINE ID</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                            value={formData.line_id} 
                            onChange={e => setFormData({...formData, line_id: e.target.value})} 
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Permanent Home Address *</label>
                        <input 
                            required 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                            value={formData.address} 
                            onChange={e => setFormData({...formData, address: e.target.value})} 
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="flex-1 bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={16} />
                                    Creating...
                                </>
                            ) : (
                                'Save Tenant'
                            )}
                        </button>
                        <button 
                            type="button" 
                            onClick={onClose} 
                            disabled={isSubmitting}
                            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewTenantModal;
