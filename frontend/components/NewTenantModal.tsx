import React, { useState } from 'react';
import { X } from 'lucide-react';
import { createTenant } from '../services/propertyService';

interface Props {
    onClose: () => void;
}

const NewTenantModal: React.FC<Props> = ({ onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        phoneNumber: '',
        idNumber: '',
        lineId: '',
        homeAddress: '',
        birthday: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createTenant(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">Add New Tenant</h3>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input required type="text" className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                            <input required type="text" className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                                value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Line ID</label>
                            <input type="text" className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                                value={formData.lineId} onChange={e => setFormData({...formData, lineId: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ID / ARC Number</label>
                        <input required type="text" className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                            value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Birthday</label>
                            <input required type="date" className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                                value={formData.birthday} onChange={e => setFormData({...formData, birthday: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Permanent Home Address</label>
                        <input required type="text" className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                            value={formData.homeAddress} onChange={e => setFormData({...formData, homeAddress: e.target.value})} />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="submit" className="flex-1 bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700">Save Tenant</button>
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewTenantModal;
