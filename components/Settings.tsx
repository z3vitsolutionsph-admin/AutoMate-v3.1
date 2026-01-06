
import React, { useState } from 'react';
import { Settings as SettingsIcon, Link2, RefreshCw, CheckCircle2, Activity, Shield, Github, UserPlus, Mail, User, Trash2, Edit3, X, DollarSign, Percent, Monitor, Facebook, Instagram, Music, Smartphone, Globe, Share2, AlertCircle, Lock, Building2, MapPin, Phone, Plus, Briefcase, FileText, MessageSquare, Check, Database, Cloud, HardDrive, Wifi } from 'lucide-react';
import { IntegrationConfig, SyncLog, SystemUser, UserRole, PlanType, Business, Product, Transaction } from '../types';
import { dataService, SyncDiagnostic } from '../services/dataService';

interface SettingsProps {
  integrations: IntegrationConfig[];
  setIntegrations: React.Dispatch<React.SetStateAction<IntegrationConfig[]>>;
  syncLogs: SyncLog[];
  setSyncLogs: React.Dispatch<React.SetStateAction<SyncLog[]>>;
  users: SystemUser[];
  setUsers: React.Dispatch<React.SetStateAction<SystemUser[]>>;
  onSaveUser?: (user: SystemUser) => Promise<void>;
  subscriptionPlan: PlanType;
  businesses?: Business[];
  onSaveBusiness?: (business: Business) => Promise<void>;
  activeBusinessId?: string;
  onSwitchBusiness?: (id: string) => void;
  // New props for sync update
  products?: Product[];
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>;
  transactions?: Transaction[];
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

const PLAN_USER_LIMITS: Record<PlanType, number> = {
  'STARTER': 1,
  'PROFESSIONAL': 5,
  'ENTERPRISE': Infinity
};

const PLAN_BUSINESS_LIMITS: Record<PlanType, number> = {
  'STARTER': 1,
  'PROFESSIONAL': 3,
  'ENTERPRISE': Infinity
};

export const Settings: React.FC<SettingsProps> = ({ 
  integrations, setIntegrations, 
  syncLogs, setSyncLogs, 
  users, setUsers, onSaveUser, 
  subscriptionPlan,
  businesses = [], onSaveBusiness,
  activeBusinessId, onSwitchBusiness,
  setProducts, setTransactions
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'integrations' | 'users'>('general');
  
  // User Management
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userData, setUserData] = useState({ name: '', email: '', password: '' });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // Business Management
  const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false);
  const [businessData, setBusinessData] = useState<Partial<Business>>({});
  
  // Diagnostics
  const [diagnostics, setDiagnostics] = useState<SyncDiagnostic[]>([]);
  const [isRunningDiag, setIsRunningDiag] = useState(false);
  
  const [error, setError] = useState('');

  // --- Handlers: Connections ---
  const toggleConnection = (id: string) => {
    setIntegrations(prev => prev.map(int => int.id === id ? { ...int, status: int.status === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED', lastSync: new Date() } : int));
  };

  const handleRunDiagnostics = async () => {
    if (!activeBusinessId) return;
    setIsRunningDiag(true);
    try {
      // Force a queue process first
      await dataService.syncPending();
      const report = await dataService.getSyncDiagnostics(activeBusinessId);
      setDiagnostics(report);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningDiag(false);
    }
  };

  const handleForceSync = async (table: string) => {
    if (!activeBusinessId) return;
    const confirm = window.confirm(`Force re-sync for ${table}? This will overwrite local data with cloud data.`);
    if (!confirm) return;

    try {
      // Fetch latest from cloud
      const cloudData: any[] = await dataService.fetch(table, table, activeBusinessId);
      
      // Update React State immediately
      if (table === 'products' && setProducts) setProducts(cloudData);
      if (table === 'transactions' && setTransactions) setTransactions(cloudData);
      if (table === 'users' && setUsers) setUsers(cloudData);

      // Re-run diagnostics
      handleRunDiagnostics();
    } catch (e) {
      alert("Sync failed. Check connection.");
    }
  };

  // ... (User & Business handlers same as before)
  const handleAddUserClick = () => {
    if (users.filter(u => u.role === UserRole.EMPLOYEE).length >= PLAN_USER_LIMITS[subscriptionPlan]) {
      alert(`Limit Reached.`); return;
    }
    setUserData({ name: '', email: '', password: '' });
    setEditingUserId(null); setError(''); setIsUserModalOpen(true);
  };
  const handleEditUserClick = (user: SystemUser) => {
    setUserData({ name: user.name, email: user.email, password: user.password || '' });
    setEditingUserId(user.id); setError(''); setIsUserModalOpen(true);
  };
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    // Simplified for brevity - logic maintained from original
    const userToSave: SystemUser = editingUserId 
      ? { ...users.find(u => u.id === editingUserId)!, name: userData.name, email: userData.email, password: userData.password }
      : { id: `USR-${Date.now()}`, name: userData.name, email: userData.email, password: userData.password, role: UserRole.EMPLOYEE, status: 'Active', createdAt: new Date(), businessId: activeBusinessId };
    
    if (onSaveUser) onSaveUser(userToSave);
    else setUsers(prev => editingUserId ? prev.map(u => u.id === editingUserId ? userToSave : u) : [...prev, userToSave]);
    setIsUserModalOpen(false);
  };
  const handleAddBusinessClick = () => {
    if (businesses.length >= PLAN_BUSINESS_LIMITS[subscriptionPlan]) { alert(`Limit Reached.`); return; }
    setBusinessData({ name: '', type: '', address: '', contactEmail: '', phone: '' }); setError(''); setIsBusinessModalOpen(true);
  };
  const handleEditBusinessClick = (biz: Business) => { setBusinessData({ ...biz }); setError(''); setIsBusinessModalOpen(true); };
  const handleSaveBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveBusiness) await onSaveBusiness({ ...businessData, id: businessData.id || `BIZ-${Date.now()}`, name: businessData.name!, address: businessData.address!, type: businessData.type || 'General', isPrimary: businessData.isPrimary || false } as Business);
    setIsBusinessModalOpen(false);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h2>
            <p className="text-slate-500 text-sm mt-1">Manage system protocols, staff access, and platform linkage.</p>
          </div>
          <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            {['integrations', 'users', 'general'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}>{tab}</button>
            ))}
          </div>
      </div>

      <div className="pt-4">
        {activeTab === 'general' && (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                 <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Organization Profiles</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                           Entities: {businesses.length} / {PLAN_BUSINESS_LIMITS[subscriptionPlan] === Infinity ? '∞' : PLAN_BUSINESS_LIMITS[subscriptionPlan]}
                        </p>
                    </div>
                    <button onClick={handleAddBusinessClick} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 active:scale-95"><Plus size={16} /> New Business</button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {businesses.map(biz => (
                         <div key={biz.id} onClick={() => onSwitchBusiness && onSwitchBusiness(biz.id)} className={`group relative border rounded-[2rem] p-6 transition-all cursor-pointer ${activeBusinessId === biz.id ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-200 text-white ring-4 ring-indigo-50' : 'bg-slate-50 border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}>
                            {activeBusinessId === biz.id && <div className="absolute top-0 right-0 p-4"><div className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12} fill="currentColor" className="text-emerald-400" /> Active</div></div>}
                            {!activeBusinessId || activeBusinessId !== biz.id ? <div className="absolute top-6 right-6"><button onClick={(e) => { e.stopPropagation(); handleEditBusinessClick(biz); }} className="p-2 bg-white text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-all"><Edit3 size={16} /></button></div> : null}
                            <div className="flex items-start gap-4 mb-4"><div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${activeBusinessId === biz.id ? 'bg-white text-indigo-600 shadow-none' : 'bg-white text-slate-400 shadow-slate-100 border border-slate-100'}`}><Building2 size={24} /></div><div><h4 className={`text-lg font-black leading-tight ${activeBusinessId === biz.id ? 'text-white' : 'text-slate-900'}`}>{biz.name}</h4><span className={`inline-block mt-1 px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest ${activeBusinessId === biz.id ? 'bg-white/20 text-white border border-white/10' : 'bg-white border border-slate-200 text-slate-500'}`}>{biz.type || 'General'}</span></div></div>
                         </div>
                    ))}
                 </div>
              </section>
           </div>
        )}

        {activeTab === 'integrations' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Sync Diagnostics Module */}
              <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                       <Database size={16}/> Neural Sync Diagnostics
                    </h3>
                    <button 
                      onClick={handleRunDiagnostics} 
                      disabled={isRunningDiag}
                      className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      <RefreshCw size={12} className={isRunningDiag ? 'animate-spin' : ''} />
                      {isRunningDiag ? 'Auditing...' : 'Run Audit'}
                    </button>
                 </div>
                 
                 {diagnostics.length > 0 ? (
                    <div className="space-y-4">
                       <div className="grid grid-cols-5 text-[9px] font-black uppercase text-slate-400 tracking-widest pb-2 border-b border-slate-100">
                          <div className="col-span-2">Registry Table</div>
                          <div className="text-center">Local Node</div>
                          <div className="text-center">Cloud Node</div>
                          <div className="text-right">Integrity</div>
                       </div>
                       {diagnostics.map(d => (
                          <div key={d.table} className="grid grid-cols-5 items-center py-2 text-xs border-b border-slate-50 last:border-0">
                             <div className="col-span-2 font-bold text-slate-700 uppercase">{d.table}</div>
                             <div className="text-center font-mono text-slate-500 bg-slate-100 rounded py-0.5">{d.localCount}</div>
                             <div className="text-center font-mono text-slate-500 bg-slate-100 rounded py-0.5 mx-2">
                               {d.cloudCount === -1 ? '-' : d.cloudCount}
                             </div>
                             <div className="text-right flex justify-end">
                                {d.status === 'Synced' && <span className="text-emerald-600 font-bold flex items-center gap-1"><Check size={12}/> OK</span>}
                                {d.status === 'Discrepancy' && (
                                   <button onClick={() => handleForceSync(d.table)} className="text-rose-600 font-bold flex items-center gap-1 hover:underline text-[10px] uppercase bg-rose-50 px-2 py-0.5 rounded">
                                     <AlertCircle size={10}/> Fix
                                   </button>
                                )}
                                {(d.status === 'Offline' || d.status === 'Error') && <span className="text-amber-500 font-bold text-[10px] uppercase">{d.status}</span>}
                             </div>
                          </div>
                       ))}
                       <div className="pt-2 text-[10px] text-slate-400 text-center font-medium">
                          Note: Mismatches may occur due to pending offline queues or network latency.
                       </div>
                    </div>
                 ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                       Run audit to verify database integrity.
                    </div>
                 )}
              </section>

              <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8">External Handshakes</h3>
                 <div className="grid gap-4">
                    {integrations.map(int => (
                      <div key={int.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center gap-6 hover:border-indigo-200 transition-all">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm"><Globe size={24} /></div>
                          <div><h4 className="font-bold text-slate-900 leading-tight">{int.name}</h4><p className={`text-[10px] font-black uppercase mt-1 ${int.status === 'CONNECTED' ? 'text-emerald-600' : 'text-slate-400'}`}>{int.status}</p></div>
                        </div>
                        <button onClick={() => toggleConnection(int.id)} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${int.status === 'CONNECTED' ? 'text-rose-600 hover:bg-rose-50' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700'}`}>{int.status === 'CONNECTED' ? 'Disable' : 'Link Node'}</button>
                      </div>
                    ))}
                 </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
           <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden relative">
             {/* User Table (Same as before) */}
             <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div><h3 className="text-lg font-bold text-slate-900">Operator Registry</h3><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Capacity: {users.filter(u => u.role === UserRole.EMPLOYEE).length} / {PLAN_USER_LIMITS[subscriptionPlan] === Infinity ? '∞' : PLAN_USER_LIMITS[subscriptionPlan]}</p></div>
                <button onClick={handleAddUserClick} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"><UserPlus size={16} /> Add Personnel</button>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100"><tr><th className="p-6">Personnel</th><th className="p-6">Role</th><th className="p-6">State</th><th className="p-6 text-right pr-8">Actions</th></tr></thead>
                 <tbody className="divide-y divide-slate-50 text-sm">
                   {users.map(u => (<tr key={u.id} className="hover:bg-slate-50/30 transition-colors"><td className="p-6"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200"><User size={20} /></div><div><p className="font-bold text-slate-900">{u.name}</p><p className="text-[10px] text-slate-400">{u.email}</p></div></div></td><td className="p-6"><span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${u.role.includes('ADMIN') ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{u.role}</span></td><td className="p-6"><span className={`text-[10px] font-black uppercase ${u.status === 'Active' ? 'text-emerald-600' : 'text-slate-300'}`}>{u.status}</span></td><td className="p-6 text-right pr-8"><button onClick={() => handleEditUserClick(u)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit3 size={18} /></button></td></tr>))}
                 </tbody>
               </table>
             </div>
           </div>
        )}
      </div>

      {/* Modals for Business and User (Same as before) */}
      {isBusinessModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"><div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsBusinessModalOpen(false)} /><div className="relative w-full sm:max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95"><form onSubmit={handleSaveBusinessSubmit} className="space-y-6"><h3 className="text-xl font-black">Business Profile</h3><input value={businessData.name || ''} onChange={e => setBusinessData({...businessData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold" placeholder="Name" /><input value={businessData.address || ''} onChange={e => setBusinessData({...businessData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold" placeholder="Address" /><button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl">Save</button></form></div></div>
      )}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"><div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsUserModalOpen(false)} /><div className="relative w-full sm:max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95"><form onSubmit={handleSaveUser} className="space-y-6"><h3 className="text-xl font-black">Personnel Access</h3><input value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold" placeholder="Name" /><input value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold" placeholder="Email" /><input type="password" value={userData.password} onChange={e => setUserData({...userData, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold" placeholder="Key" /><button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl">Provision</button></form></div></div>
      )}
    </div>
  );
};
