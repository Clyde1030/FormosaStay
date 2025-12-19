
import React, { useState, useEffect } from 'react';
import { DollarSign, Zap, PenTool, WashingMachine, Plus, Check, Search, CreditCard, Edit, Trash2, Calendar, FileText, Settings, X, BarChart2, Calculator } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Area, Cell } from 'recharts';
import { 
    getTransactions, getExpenses, getRooms, getBuildings, getTenants, getTenantInRoom,
    addTransaction, updateTransaction, deleteTransaction, 
    addExpense, updateExpense, deleteExpense,
    recordMeterReading, getElectricityRates, addElectricityRate, deleteElectricityRate, getCurrentElectricityRate,
    getTransactionsByRoom 
} from '../services/propertyService';
import { Transaction, Expense, Room, Building, Tenant, ElectricityRate } from '../types';

const FinanceManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'payments' | 'electricity' | 'expenses' | 'machines'>('payments');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refresh = () => setRefreshTrigger(prev => prev + 1);

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-800">Finance Manager</h2>
                <p className="text-slate-500">Track payments, bills, electricity, and operating costs.</p>
            </header>

            {/* Tabs */}
            <div className="flex space-x-2 border-b border-slate-200 overflow-x-auto">
                <TabButton id="payments" label="Rent & Payments" icon={DollarSign} active={activeTab} onClick={setActiveTab} />
                <TabButton id="electricity" label="Electricity Billing" icon={Zap} active={activeTab} onClick={setActiveTab} />
                <TabButton id="expenses" label="Expenses & P&L" icon={PenTool} active={activeTab} onClick={setActiveTab} />
                <TabButton id="machines" label="Machines Income" icon={WashingMachine} active={activeTab} onClick={setActiveTab} />
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'payments' && <PaymentsTab key={refreshTrigger} onRefresh={refresh} />}
                {activeTab === 'electricity' && <ElectricityTab key={refreshTrigger} onRefresh={refresh} />}
                {activeTab === 'expenses' && <ExpensesTab key={refreshTrigger} onRefresh={refresh} />}
                {activeTab === 'machines' && <MachinesTab key={refreshTrigger} onRefresh={refresh} />}
            </div>
        </div>
    );
};

const TabButton = ({ id, label, icon: Icon, active, onClick }: any) => (
    <button
        onClick={() => onClick(id)}
        className={`flex items-center space-x-2 px-6 py-3 border-b-2 transition-colors whitespace-nowrap ${
            active === id 
            ? 'border-brand-500 text-brand-600 font-medium bg-brand-50' 
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
        }`}
    >
        <Icon size={18} />
        <span>{label}</span>
    </button>
);

// --- 1. PAYMENTS TAB ---

const PaymentsTab: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [historyRoomId, setHistoryRoomId] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            const [txs, rs] = await Promise.all([getTransactions(), getRooms()]);
            setTransactions(txs);
            setRooms(rs);
        };
        loadData();
    }, []);

    const handleDelete = async (id: string) => {
        if(confirm("Are you sure you want to delete this transaction?")) {
            await deleteTransaction(id);
            const txs = await getTransactions();
            setTransactions(txs);
            onRefresh();
        }
    };

    const handlePay = async (txId: string, method: 'LinePay' | 'Cash') => {
        await updateTransaction(txId, { status: 'Paid', paidDate: new Date().toISOString().split('T')[0], method });
        const txs = await getTransactions();
        setTransactions(txs);
        onRefresh();
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-lg px-3 py-2 w-64">
                    <Search size={16} className="text-slate-400" />
                    <input placeholder="Search tenant or room..." className="outline-none text-sm w-full" />
                </div>
                <button onClick={() => setIsManualModalOpen(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-brand-700">
                    <Plus size={18} className="mr-2" /> Record Manual Payment
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                        <tr>
                            <th className="p-4">Tenant / Room</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">Period / Due Date</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {transactions.filter(t => t.type !== 'MachineIncome').map(tx => (
                            <tr key={tx.id} className="hover:bg-slate-50 group">
                                <td className="p-4 cursor-pointer" onClick={() => tx.roomId && setHistoryRoomId(tx.roomId)}>
                                    <div className="font-medium text-slate-900 flex items-center gap-2">
                                        {tx.tenantName}
                                        <BarChart2 size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="text-xs text-slate-500">Room {tx.roomId ? rooms.find(r=>r.id===tx.roomId)?.roomNumber : 'N/A'}</div>
                                    {tx.note && <div className="text-xs text-amber-600 mt-1 italic">Note: {tx.note}</div>}
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${tx.type === 'Rent' ? 'bg-indigo-50 text-indigo-700' : 'bg-orange-50 text-orange-700'}`}>
                                        {tx.type}
                                    </span>
                                </td>
                                <td className="p-4 font-medium">NT$ {tx.amount.toLocaleString()}</td>
                                <td className="p-4 text-sm text-slate-600">
                                    <div className="text-xs text-slate-400">{tx.periodStart ? `${tx.periodStart} ~ ${tx.periodEnd}` : 'One-time'}</div>
                                    <div>Due: {tx.dueDate}</div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        tx.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 
                                        tx.status === 'Overdue' ? 'bg-red-100 text-red-700' : 
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                        {tx.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end items-center gap-2">
                                    {tx.status !== 'Paid' ? (
                                        <>
                                            <button onClick={() => handlePay(tx.id, 'LinePay')} className="bg-[#06C755] text-white px-2 py-1 rounded text-xs hover:bg-green-600">Line Pay</button>
                                            <button onClick={() => handlePay(tx.id, 'Cash')} className="bg-slate-800 text-white px-2 py-1 rounded text-xs hover:bg-slate-900">Cash</button>
                                        </>
                                    ) : (
                                        <span className="text-xs text-slate-400 mr-2">Paid {tx.method}</span>
                                    )}
                                    <button onClick={() => handleDelete(tx.id)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isManualModalOpen && <ManualPaymentModal onClose={async () => { setIsManualModalOpen(false); const txs = await getTransactions(); setTransactions(txs); onRefresh(); }} />}
            {historyRoomId && <PaymentHistoryModal roomId={historyRoomId} onClose={() => setHistoryRoomId(null)} />}
        </div>
    );
};

// --- 2. ELECTRICITY TAB ---

const ElectricityTab: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [readings, setReadings] = useState<{[key: string]: string}>({});
    const [rateModalOpen, setRateModalOpen] = useState(false);
    const [historyRoomId, setHistoryRoomId] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            const [rs, bs] = await Promise.all([getRooms(), getBuildings()]);
            setRooms(rs);
            setBuildings(bs);
        };
        loadData();
    }, []);

    const occupiedRooms = rooms.filter(r => r.status === 'Occupied');

    const handleReadingChange = (roomId: string, val: string) => {
        setReadings(prev => ({...prev, [roomId]: val}));
    };

    const handleSubmit = async (roomId: string) => {
        const val = parseFloat(readings[roomId]);
        if (!isNaN(val)) {
            try {
                await recordMeterReading(roomId, val, new Date().toISOString().split('T')[0]);
                onRefresh();
                setReadings(prev => ({...prev, [roomId]: ''}));
                alert('Bill Generated!');
            } catch (e: any) {
                alert(e.message);
            }
        }
    };

    const currentRate = getCurrentElectricityRate(new Date().toISOString().split('T')[0]);

    return (
        <div className="pt-4 space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 flex items-center justify-between">
                <div className="flex items-start gap-3">
                    <Zap className="text-yellow-600 mt-1" size={20} />
                    <div>
                        <h4 className="font-bold text-yellow-800">Electricity Billing</h4>
                        <p className="text-sm text-yellow-700">Current Global Rate: <span className="font-bold">NT$ {currentRate}</span> / degree.</p>
                    </div>
                </div>
                <button onClick={() => setRateModalOpen(true)} className="flex items-center gap-2 text-sm text-yellow-800 hover:text-yellow-900 font-medium">
                    <Settings size={16} /> Manage Rates
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {occupiedRooms.map(room => {
                    const buildingName = buildings.find(b => b.id === room.building_id)?.name;
                    return (
                        <div key={room.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 group relative">
                             <button onClick={() => setHistoryRoomId(room.id)} className="absolute top-4 right-4 text-slate-400 hover:text-brand-600">
                                <BarChart2 size={20} />
                            </button>
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-lg text-slate-800">Room {room.roomNumber}</span>
                            </div>
                            <div className="text-xs text-slate-500 mb-4">{buildingName}</div>
                            
                            <div className="mb-4">
                                <label className="text-xs text-slate-400 uppercase font-bold">Previous Reading</label>
                                <div className="text-2xl font-mono text-slate-700">{room.currentMeterReading}</div>
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    type="number" 
                                    placeholder="New Reading" 
                                    className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
                                    value={readings[room.id] || ''}
                                    onChange={(e) => handleReadingChange(room.id, e.target.value)}
                                />
                                <button 
                                    onClick={() => handleSubmit(room.id)}
                                    className="bg-brand-600 text-white px-3 py-2 rounded text-sm hover:bg-brand-700 disabled:opacity-50"
                                    disabled={!readings[room.id]}
                                >
                                    Bill
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            {rateModalOpen && <RateSettingsModal onClose={() => { setRateModalOpen(false); onRefresh(); }} />}
            {historyRoomId && <ElectricityHistoryModal roomId={historyRoomId} onClose={() => setHistoryRoomId(null)} onRefresh={onRefresh} />}
        </div>
    );
};

// --- 3. EXPENSES TAB ---

const ExpensesTab: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expenseForm, setExpenseForm] = useState({ category: 'Maintenance', amount: '', description: '', attachmentName: '', date: '' });

    useEffect(() => {
        const loadData = async () => {
            const exs = await getExpenses();
            setExpenses(exs);
        };
        loadData();
    }, []);

    const resetForm = () => setExpenseForm({ category: 'Maintenance', amount: '', description: '', attachmentName: '', date: new Date().toISOString().split('T')[0] });

    const handleSave = async () => {
        if (editingId) {
            await updateExpense(editingId, {
                category: expenseForm.category as any,
                amount: Number(expenseForm.amount),
                description: expenseForm.description,
                attachmentName: expenseForm.attachmentName,
                date: expenseForm.date
            });
        } else {
            await addExpense({
                category: expenseForm.category as any,
                amount: Number(expenseForm.amount),
                description: expenseForm.description,
                attachmentName: expenseForm.attachmentName,
                date: expenseForm.date
            });
        }
        setIsAdding(false);
        setEditingId(null);
        resetForm();
        const exs = await getExpenses();
        setExpenses(exs);
        onRefresh();
    };

    const startEdit = (ex: Expense) => {
        setEditingId(ex.id);
        setExpenseForm({
            category: ex.category,
            amount: String(ex.amount),
            description: ex.description,
            attachmentName: ex.attachmentName || '',
            date: ex.date
        });
        setIsAdding(true);
    };

    const handleDelete = async (id: string) => {
        if(confirm("Delete this expense?")) {
            await deleteExpense(id);
            const exs = await getExpenses();
            setExpenses(exs);
            onRefresh();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setExpenseForm({ ...expenseForm, attachmentName: e.target.files[0].name });
        }
    };

    return (
        <div className="pt-4 space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-700">Operational Expenses</h3>
                <button onClick={() => { setIsAdding(true); setEditingId(null); resetForm(); }} className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center hover:bg-slate-900">
                    <Plus size={18} className="mr-2" /> Add Expense
                </button>
            </div>

            {isAdding && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-2xl">
                        <div className="flex justify-between mb-4">
                            <h3 className="font-bold text-lg">{editingId ? 'Edit Expense' : 'New Expense'}</h3>
                            <button onClick={() => setIsAdding(false)}><X size={20} className="text-slate-400" /></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="text-xs font-bold text-slate-500">Date</label>
                                <input 
                                    type="date" 
                                    className="w-full border border-slate-300 rounded p-2"
                                    value={expenseForm.date}
                                    onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Category</label>
                                <select 
                                    className="w-full border border-slate-300 rounded p-2"
                                    value={expenseForm.category}
                                    onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                                >
                                    <option>Maintenance</option>
                                    <option>Cleaning</option>
                                    <option>Utilities</option>
                                    <option>Payroll</option>
                                    <option>Tax</option>
                                    <option>Misc</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Amount</label>
                                <input 
                                    type="number" 
                                    className="w-full border border-slate-300 rounded p-2" 
                                    placeholder="0"
                                    value={expenseForm.amount}
                                    onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Attachment</label>
                                <input type="file" className="w-full text-sm text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-100" onChange={handleFileChange} />
                                {expenseForm.attachmentName && <span className="text-xs text-green-600 block mt-1">Attached: {expenseForm.attachmentName}</span>}
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-slate-500">Description</label>
                                <textarea 
                                    className="w-full border border-slate-300 rounded p-2 h-20" 
                                    placeholder="Details..."
                                    value={expenseForm.description}
                                    onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end mt-6">
                            <button onClick={() => setIsAdding(false)} className="px-4 py-2 border rounded hover:bg-slate-50">Cancel</button>
                            <button onClick={handleSave} className="bg-brand-600 text-white px-6 py-2 rounded hover:bg-brand-700">Save</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Category</th>
                            <th className="p-4">Description</th>
                            <th className="p-4">Attachment</th>
                            <th className="p-4 text-right">Amount</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {expenses.map(ex => (
                            <tr key={ex.id} className="hover:bg-slate-50">
                                <td className="p-4 text-sm text-slate-600">{ex.date}</td>
                                <td className="p-4"><span className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold border border-slate-300">{ex.category}</span></td>
                                <td className="p-4 text-slate-800">{ex.description}</td>
                                <td className="p-4 text-sm text-brand-600 underline cursor-pointer">{ex.attachmentName}</td>
                                <td className="p-4 text-right font-medium text-red-600">- NT$ {ex.amount.toLocaleString()}</td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => startEdit(ex)} className="text-slate-400 hover:text-brand-600 p-1"><Edit size={16} /></button>
                                        <button onClick={() => handleDelete(ex.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- 4. MACHINES TAB ---

const MachinesTab: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
    const [amount, setAmount] = useState('');
    const [desc, setDesc] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const handleAdd = async () => {
        await addTransaction({
            type: 'MachineIncome',
            amount: Number(amount),
            description: desc || 'Coin Laundry Collection',
            dueDate: date,
            status: 'Paid',
            paidDate: date
        });
        setAmount('');
        setDesc('');
        onRefresh();
        alert("Income recorded!");
    };

    return (
        <div className="pt-4 max-w-xl">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <WashingMachine size={20} className="text-brand-500"/> Record Machine Income
                </h3>
                <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Date Collected</label>
                     <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount (NTD)</label>
                    <input 
                        type="number" 
                        className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Machine / Building</label>
                    <input 
                        type="text" 
                        className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500"
                        placeholder="e.g. Xinyi Heights 2F Dryer"
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                    />
                </div>
                <button onClick={handleAdd} className="w-full bg-brand-600 text-white py-2 rounded-lg hover:bg-brand-700 font-medium">
                    Record Income
                </button>
             </div>
        </div>
    );
};

// --- MODALS ---

const ManualPaymentModal = ({ onClose }: { onClose: () => void }) => {
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedBuilding, setSelectedBuilding] = useState<number | string>('');
    
    // Form State
    const [roomId, setRoomId] = useState('');
    const [type, setType] = useState('Rent');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState('');
    const [method, setMethod] = useState('Transfer');
    
    // Enhanced Rent Logic
    const [paymentTermMonths, setPaymentTermMonths] = useState(1);
    const [discount, setDiscount] = useState(0);
    const [periodStart, setPeriodStart] = useState(new Date().toISOString().split('T')[0]);
    
    useEffect(() => {
        const loadBuildings = async () => {
            const bs = await getBuildings();
            setBuildings(bs);
            if (bs.length > 0) setSelectedBuilding(bs[0].id);
        };
        loadBuildings();
    }, []);

    useEffect(() => {
        const loadRooms = async () => {
            if (selectedBuilding !== '') {
                const rs = await getRooms(Number(selectedBuilding));
                setRooms(rs);
                if (rs.length > 0) setRoomId(rs[0].id);
            }
        };
        loadRooms();
    }, [selectedBuilding]);

    useEffect(() => {
        const fetchBaseRent = async () => {
            if(roomId && type === 'Rent') {
                const tenant = await getTenantInRoom(roomId);
                if(tenant && tenant.currentContract) {
                     const monthlyRent = tenant.currentContract.rentAmount;
                     const calculated = (monthlyRent * paymentTermMonths) - discount;
                     setAmount(calculated.toString());
                }
            }
        };
        fetchBaseRent();
    }, [roomId, paymentTermMonths, discount, type]);

    const getPeriodEnd = (start: string, months: number) => {
        const d = new Date(start);
        d.setMonth(d.getMonth() + months);
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
    };

    const handleSubmit = async () => {
        const tenant = await getTenantInRoom(roomId);
        const tenantName = tenant?.name || 'Unknown';
        const contractId = tenant?.currentContract?.id;

        const periodEnd = type === 'Rent' ? getPeriodEnd(periodStart, paymentTermMonths) : undefined;
        const finalNote = type === 'Rent' && discount > 0 ? `${note} (Includes NT$${discount} discount)`.trim() : note;

        await addTransaction({
            roomId: roomId,
            tenantName: tenantName, 
            contractId: contractId,
            type: type as any,
            amount: Number(amount),
            dueDate: date,
            status: 'Paid',
            paidDate: date,
            method: method as any,
            note: finalNote,
            periodStart: type === 'Rent' ? periodStart : undefined,
            periodEnd: periodEnd
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between mb-4">
                    <h3 className="font-bold text-lg">Record Manual Payment</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
                </div>
                
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Building</label>
                            <select className="w-full border p-2 rounded text-sm" value={selectedBuilding} onChange={e => setSelectedBuilding(e.target.value)}>
                                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Room</label>
                            <select className="w-full border p-2 rounded text-sm" value={roomId} onChange={e => setRoomId(e.target.value)}>
                                {rooms.map(r => <option key={r.id} value={r.id}>{r.roomNumber}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Type</label>
                            <select className="w-full border p-2 rounded text-sm" value={type} onChange={e => setType(e.target.value)}>
                                <option value="Rent">Rent</option>
                                <option value="Deposit">Deposit</option>
                                <option value="Electricity">Electricity</option>
                                <option value="Fee">Other Fee</option>
                            </select>
                        </div>
                        <div>
                             <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Method</label>
                            <select className="w-full border p-2 rounded text-sm" value={method} onChange={e => setMethod(e.target.value)}>
                                <option value="Transfer">Bank Transfer</option>
                                <option value="Cash">Cash</option>
                                <option value="LinePay">Line Pay</option>
                            </select>
                        </div>
                    </div>

                    {type === 'Rent' && (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                             <div>
                                <label className="text-xs text-brand-600 font-bold uppercase mb-1 block">Payment Term</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[1, 3, 6, 12].map(m => (
                                        <button 
                                            key={m}
                                            onClick={() => setPaymentTermMonths(m)}
                                            className={`py-1 text-xs border rounded ${paymentTermMonths === m ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-300'}`}
                                        >
                                            {m === 1 ? 'Monthly' : m === 12 ? 'Yearly' : `${m} Months`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Period Start</label>
                                    <input type="date" className="w-full border p-2 rounded text-sm" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Period End</label>
                                    <div className="w-full bg-slate-100 p-2 rounded text-sm text-slate-600 border border-slate-200">
                                        {getPeriodEnd(periodStart, paymentTermMonths)}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Discount (NT$)</label>
                                <div className="flex items-center">
                                    <input 
                                        type="number" 
                                        className="w-full border p-2 rounded text-sm" 
                                        value={discount} 
                                        onChange={e => setDiscount(Number(e.target.value))} 
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Total Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-400 text-sm">NT$</span>
                                <input 
                                    type="number" 
                                    className="w-full border border-slate-300 p-2 pl-10 rounded text-sm font-bold text-slate-800" 
                                    value={amount} 
                                    onChange={e => setAmount(e.target.value)} 
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Paid Date</label>
                            <input type="date" className="w-full border p-2 rounded text-sm" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Note</label>
                        <textarea 
                            className="w-full border p-2 rounded text-sm h-16" 
                            placeholder="Optional details..." 
                            value={note} 
                            onChange={e => setNote(e.target.value)}
                        ></textarea>
                    </div>
                </div>

                <div className="mt-6">
                    <button onClick={handleSubmit} className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 transition-colors flex items-center justify-center gap-2">
                        <Check size={18} /> Record Payment
                    </button>
                </div>
            </div>
        </div>
    );
};

export const PaymentHistoryModal = ({ roomId, onClose }: { roomId: string, onClose: () => void }) => {
    const [txs, setTxs] = useState<Transaction[]>([]);

    useEffect(() => {
        const loadHistory = async () => {
            const history = await getTransactionsByRoom(roomId);
            setTxs(history.filter(t => t.type === 'Rent'));
        };
        loadHistory();
    }, [roomId]);

    const data = txs.map(t => ({
        date: t.dueDate,
        amount: t.amount,
        status: t.status
    })).reverse();

    return (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col">
                <div className="flex justify-between mb-4">
                    <h3 className="font-bold text-lg">Rent Payment History</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
                </div>
                
                <div className="h-64 bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="amount" name="Rent Amount" fill="#6366f1">
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.status === 'Paid' ? '#10b981' : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 sticky top-0">
                            <tr>
                                <th className="p-3">Due Date</th>
                                <th className="p-3">Period</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {txs.map(t => (
                                <tr key={t.id}>
                                    <td className="p-3 text-sm">{t.dueDate}</td>
                                    <td className="p-3 text-xs text-slate-500">{t.periodStart} ~ {t.periodEnd}</td>
                                    <td className="p-3 font-medium">NT$ {t.amount.toLocaleString()}</td>
                                    <td className="p-3">
                                        <span className={`text-xs px-2 py-1 rounded-full ${t.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{t.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export const ElectricityHistoryModal = ({ roomId, onClose, onRefresh }: { roomId: string, onClose: () => void, onRefresh: () => void }) => {
    const [txs, setTxs] = useState<Transaction[]>([]);
    const [editingTxId, setEditingTxId] = useState<string | null>(null);
    const [editReading, setEditReading] = useState('');

    useEffect(() => {
        const loadHistory = async () => {
            const history = await getTransactionsByRoom(roomId);
            setTxs(history.filter(t => t.type === 'Electricity'));
        };
        loadHistory();
    }, [roomId]);

    const handleSaveReading = async (txId: string) => {
        const val = Number(editReading);
        if(!isNaN(val)) {
            await updateTransaction(txId, { readingEnd: val, description: `Reading Adjusted to ${val}` });
            setEditingTxId(null);
            const history = await getTransactionsByRoom(roomId);
            setTxs(history.filter(t => t.type === 'Electricity'));
            onRefresh();
        }
    };
    
    const data = txs.map(t => ({
        date: t.dueDate,
        usage: (t.readingEnd || 0) - (t.readingStart || 0),
        cost: t.amount
    })).reverse();

    return (
         <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col">
                <div className="flex justify-between mb-4">
                    <h3 className="font-bold text-lg">Electricity Usage Trends</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
                </div>
                 <div className="h-64 bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                            <Tooltip />
                            <Legend />
                            <Area yAxisId="left" type="monotone" dataKey="cost" fill="#8884d8" stroke="#8884d8" name="Bill Amount ($)" />
                            <Bar yAxisId="right" dataKey="usage" barSize={20} fill="#82ca9d" name="Usage (Deg)" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left">
                         <thead className="bg-slate-50 text-xs font-bold text-slate-500 sticky top-0">
                            <tr>
                                <th className="p-3">Billing Date</th>
                                <th className="p-3">Period</th>
                                <th className="p-3">Readings (Start-End)</th>
                                <th className="p-3">Bill</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y">
                            {txs.map(t => (
                                <tr key={t.id}>
                                    <td className="p-3 text-sm">{t.dueDate}</td>
                                    <td className="p-3 text-xs text-slate-500">{t.periodStart} ~ {t.periodEnd}</td>
                                    <td className="p-3 text-sm">
                                        {editingTxId === t.id ? (
                                            <div className="flex items-center gap-1">
                                                {t.readingStart} - 
                                                <input className="w-20 border rounded px-1" value={editReading} onChange={e => setEditReading(e.target.value)} />
                                            </div>
                                        ) : (
                                            `${t.readingStart} - ${t.readingEnd}`
                                        )}
                                    </td>
                                    <td className="p-3 font-medium">NT$ {t.amount}</td>
                                    <td className="p-3">
                                        {editingTxId === t.id ? (
                                            <button onClick={() => handleSaveReading(t.id)} className="text-green-600"><Check size={16} /></button>
                                        ) : (
                                            <button onClick={() => { setEditingTxId(t.id); setEditReading(String(t.readingEnd)); }} className="text-slate-400 hover:text-brand-600"><Edit size={14} /></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
         </div>
    );
};

const RateSettingsModal = ({ onClose }: { onClose: () => void }) => {
    const [rates, setRates] = useState<ElectricityRate[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [newRate, setNewRate] = useState<{ date: string; rate: string; roomId: string | undefined }>({ date: '', rate: '', roomId: undefined });

    useEffect(() => {
        const loadData = async () => {
            const [rt, rs] = await Promise.all([getElectricityRates(), getRooms()]);
            setRates(rt);
            setRooms(rs);
        };
        loadData();
    }, []);

    const handleAdd = async () => {
        await addElectricityRate({ effectiveDate: newRate.date, ratePerDegree: Number(newRate.rate), roomId: newRate.roomId });
        const rt = await getElectricityRates();
        setRates(rt);
        setNewRate({ date: '', rate: '', roomId: undefined });
    };

    const handleDelete = async (id: string | number) => {
        if(confirm("Delete this rate setting?")) {
            await deleteElectricityRate(id);
            const rt = await getElectricityRates();
            setRates(rt);
        }
    };

    const getTargetLabel = (roomId?: string) => {
        if (!roomId) return "All Rooms (Global)";
        const room = rooms.find(r => r.id === roomId);
        return room ? `Room ${room.roomNumber}` : 'Unknown Room';
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-2xl">
                <div className="flex justify-between mb-4">
                    <h3 className="font-bold text-lg">Manage Electricity Rates</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
                </div>
                
                <div className="border rounded-lg overflow-hidden mb-6 max-h-64 overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs text-slate-500 font-bold uppercase sticky top-0">
                            <tr>
                                <th className="p-3 border-b">Target</th>
                                <th className="p-3 border-b">Effective Date</th>
                                <th className="p-3 border-b">Rate (NT$/deg)</th>
                                <th className="p-3 border-b text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {rates.map((r, i) => (
                                <tr key={r.id} className="hover:bg-slate-50">
                                    <td className="p-3 text-sm font-medium text-slate-700">
                                        {getTargetLabel(r.roomId)}
                                        {r.roomId && <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded uppercase">Override</span>}
                                    </td>
                                    <td className="p-3 text-sm">{r.effectiveDate}</td>
                                    <td className="p-3 font-bold text-brand-600">{r.ratePerDegree}</td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => handleDelete(r.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 mb-2">Add New Rate Setting</h4>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                        <div>
                            <label className="text-xs text-slate-500 font-bold">Apply To</label>
                            <select 
                                className="border rounded px-2 py-2 w-full text-sm"
                                value={newRate.roomId || ''}
                                onChange={(e) => setNewRate({...newRate, roomId: e.target.value || undefined})}
                            >
                                <option value="">All Rooms (Global)</option>
                                {rooms.map(r => (
                                    <option key={r.id} value={r.id}>Room {r.roomNumber}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 font-bold">Effective Date</label>
                            <input type="date" className="border rounded px-2 py-2 w-full text-sm" value={newRate.date} onChange={e => setNewRate({...newRate, date: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 font-bold">Rate</label>
                            <input type="number" placeholder="5.0" className="border rounded px-2 py-2 w-full text-sm" value={newRate.rate} onChange={e => setNewRate({...newRate, rate: e.target.value})} />
                        </div>
                    </div>
                    <button onClick={handleAdd} className="w-full bg-brand-600 text-white py-2 rounded text-sm hover:bg-brand-700 font-medium">Add Rate</button>
                </div>
            </div>
        </div>
    );
};

export default FinanceManager;
