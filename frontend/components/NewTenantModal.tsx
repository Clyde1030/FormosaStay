import React, { useState } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { createTenant } from '../services/propertyService';
import { EmergencyContact, Gender, GenderFromChinese, GenderLabels } from '../types';

interface Props {
    onClose: () => void;
    onSuccess?: () => void;
}

const NewTenantModal: React.FC<Props> = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        gender: Gender.MALE,
        birthday: '',
        personal_id: '',
        phone: '',
        email: '',
        line_id: '',
        address: ''
    });
    const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
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
                gender: formData.gender, // Already in English enum format
                birthday: formData.birthday,
                personal_id: formData.personal_id.trim(),
                phone: formData.phone.trim(),
                email: formData.email.trim() || undefined,
                line_id: formData.line_id.trim() || undefined,
                address: formData.address.trim(),
                emergency_contacts: emergencyContacts.map(ec => ({
                    first_name: ec.first_name.trim(),
                    last_name: ec.last_name.trim(),
                    relationship: ec.relationship.trim(),
                    phone: ec.phone.trim()
                }))
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                {/* Fixed Header */}
                <div className="flex justify-between items-center p-6 pb-4 border-b border-slate-200 flex-shrink-0">
                    <h3 className="text-xl font-bold text-slate-800">Add New Tenant</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 px-6 py-4">
                    <form onSubmit={handleSubmit} id="tenant-form" className="space-y-4">
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
                                onChange={e => setFormData({...formData, gender: e.target.value as Gender})}
                            >
                                <option value={Gender.MALE}>{GenderLabels[Gender.MALE]}</option>
                                <option value={Gender.FEMALE}>{GenderLabels[Gender.FEMALE]}</option>
                                <option value={Gender.OTHER}>{GenderLabels[Gender.OTHER]}</option>
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

                    {/* Emergency Contacts Section */}
                    <div className="border-t border-slate-200 pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-slate-700">Emergency Contacts</label>
                            <button
                                type="button"
                                onClick={() => setEmergencyContacts([...emergencyContacts, { first_name: '', last_name: '', relationship: '', phone: '' }])}
                                className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
                            >
                                <Plus size={16} />
                                Add Contact
                            </button>
                        </div>
                        
                        {emergencyContacts.map((contact, index) => (
                            <div key={index} className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-slate-600">Contact {index + 1}</span>
                                    <button
                                        type="button"
                                        onClick={() => setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index))}
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
                                                const updated = [...emergencyContacts];
                                                updated[index].last_name = e.target.value;
                                                setEmergencyContacts(updated);
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
                                                const updated = [...emergencyContacts];
                                                updated[index].first_name = e.target.value;
                                                setEmergencyContacts(updated);
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
                                                const updated = [...emergencyContacts];
                                                updated[index].relationship = e.target.value;
                                                setEmergencyContacts(updated);
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
                                                const updated = [...emergencyContacts];
                                                updated[index].phone = e.target.value;
                                                setEmergencyContacts(updated);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    </form>
                </div>

                {/* Fixed Footer */}
                <div className="p-6 pt-4 border-t border-slate-200 flex gap-3 flex-shrink-0 bg-white rounded-b-xl">
                    <button 
                        type="submit" 
                        form="tenant-form"
                        disabled={isSubmitting}
                        className="flex-1 bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
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
                        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewTenantModal;
