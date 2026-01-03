import React, { useState } from 'react';
import { Settings as SettingsIcon, Link2, RefreshCw, CheckCircle2, Activity, Shield, Github, UserPlus, Mail, User, Trash2, Edit3, X, DollarSign, Percent, Monitor, Facebook, Instagram, Music, Smartphone, Globe, Share2, AlertCircle, Lock } from 'lucide-react';
import { IntegrationConfig, SyncLog, SystemUser, UserRole, PlanType } from '../types';

interface SettingsProps {
  integrations: IntegrationConfig[];
  setIntegrations: React.Dispatch<React.SetStateAction<IntegrationConfig[]>>;
  syncLogs: SyncLog[];
  setSyncLogs: React.Dispatch<React.SetStateAction<SyncLog[]>>;
  users: SystemUser[];
  setUsers: React.Dispatch<React.SetStateAction<SystemUser[]>>;
  subscriptionPlan: PlanType;
}

const PLAN_LIMITS: Record<PlanType, number> = {
  'STARTER': 1,
  'PROFESSIONAL': 5,
  'ENTERPRISE': Infinity
};

export const Settings: React.FC<SettingsProps> = ({ integrations, setIntegrations, syncLogs, setSyncLogs, users, setUsers, subscriptionPlan }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'integrations' | 'users'>('integrations');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userData, setUserData] = useState({ name: '', email: '', password: '' });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const toggleConnection = (id: string) => {
    setIntegrations(prev => prev.map(int => int.id === id ? { ...int, status: int.status === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED', lastSync: new Date() } : int));
  };

  const handleAddUserClick = () => {
    // Count only employees (excluding admins) or count all additional users
    const currentEmployees = users.filter(u => u.role === UserRole.EMPLOYEE).length;
    const limit = PLAN_LIMITS[subscriptionPlan];
    
    if (currentEmployees >= limit) {
      alert(`Plan Limit Reached: Your ${subscriptionPlan.toLowerCase()} plan allows a maximum of ${limit} personnel. Please upgrade to Enterprise for unlimited access.`);
      return;
    }
    setUserData({ name: '', email: '', password: '' });
    setEditingUserId(null);
    setError('');
    setIsUserModalOpen(true);
  };

  const handleEditUserClick = (user: SystemUser) => {
    setUserData({ name: user.name, email: user.email, password: user.password || '' });
    setEditingUserId(user.id);
    setError('');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 1. Basic Requirement Check
    if(!userData.name || !userData.email || !userData.password) {
       setError("All fields required");
       return;
    }

    // 2. Name Validation: No numbers allowed
    if (/\d/.test(userData.name)) {
        setError("Name must not contain numbers.");
        return;
    }

    // 3. Email Validation: proper format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
        setError("Please enter a valid Email Address.");
        return;
    }

    // 4. Master Key Validation: 5 to 8 digits numeric
    const keyRegex = /^\d{5,8}$/;
    if (!keyRegex.test(userData.password)) {
        setError("Master Key must be 5 to 8 digits.");
        return;
    }
    
    if (editingUserId) {
      setUsers(prev => prev.map(u => u.id === editingUserId ? {
        ...u,
        name: userData.name,
        email: userData.email,
        password: userData.password
      } : u));
    } else {
      const user: SystemUser = {
        id: `USR-${Date.now()}`,
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: UserRole.EMPLOYEE, // Restricted to POS & Inventory
        status: 'Active',
        lastLogin: undefined,
        createdAt: new Date()
      };
      setUsers(prev => [...prev, user]);
    }
    
    setIsUserModalOpen(false);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Configuration</h2>
            <p className="text-slate-500 text-sm mt-1">Manage system protocols, staff access, and platform linkage.</p>
          </div>
          <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            {['integrations', 'users', 'general'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}>{tab}</button>
            ))}
          </div>
      </div>

      <div className="pt-4">
        {activeTab === 'integrations' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8">External Handshakes</h3>
                 <div className="grid gap-4">
                    {integrations.map(int => (
                      <div key={int.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center gap-6 hover:border-indigo-200 transition-all">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm"><Globe size={24} /></div>
                          <div>
                             <h4 className="font-bold text-slate-900 leading-tight">{int.name}</h4>
                             <p className={`text-[10px] font-black uppercase mt-1 ${int.status === 'CONNECTED' ? 'text-emerald-600' : 'text-slate-400'}`}>{int.status}</p>
                          </div>
                        </div>
                        <button onClick={() => toggleConnection(int.id)} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${int.status === 'CONNECTED' ? 'text-rose-600 hover:bg-rose-50' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700'}`}>{int.status === 'CONNECTED' ? 'Disable' : 'Link Node'}</button>
                      </div>
                    ))}
                 </div>
              </section>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm h-fit">
               <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><Activity size={14}/> Event Journal</h3>
               <div className="space-y-6">
                  {syncLogs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex gap-4">
                       <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.4)]"></div>
                       <div><p className="text-xs font-bold text-slate-900 leading-tight">{log.action}</p><p className="text-[10px] text-slate-400 font-medium mt-1">{log.provider} • {new Date(log.timestamp).toLocaleTimeString()}</p></div>
                    </div>
                  ))}
                  {syncLogs.length === 0 && <div className="py-12 text-center text-slate-300 italic text-sm">No activity recorded.</div>}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
           <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden relative">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                   <h3 className="text-lg font-bold text-slate-900">Operator Registry</h3>
                   <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                     Capacity: {users.filter(u => u.role === UserRole.EMPLOYEE).length} / {PLAN_LIMITS[subscriptionPlan] === Infinity ? '∞' : PLAN_LIMITS[subscriptionPlan]} Slots Used
                   </p>
                </div>
                <button onClick={handleAddUserClick} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-100 flex items-center gap-2">
                  <UserPlus size={16} /> Add Personnel
                </button>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                   <tr><th className="p-6">Personnel</th><th className="p-6">Role</th><th className="p-6">State</th><th className="p-6 text-right pr-8">Actions</th></tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 text-sm">
                   {users.map(u => (
                     <tr key={u.id} className="hover:bg-slate-50/30 transition-colors">
                       <td className="p-6"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200"><User size={20} /></div><div><p className="font-bold text-slate-900">{u.name}</p><p className="text-[10px] text-slate-400">{u.email}</p></div></div></td>
                       <td className="p-6"><span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${u.role.includes('ADMIN') ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{u.role}</span></td>
                       <td className="p-6"><span className={`text-[10px] font-black uppercase ${u.status === 'Active' ? 'text-emerald-600' : 'text-slate-300'}`}>{u.status}</span></td>
                       <td className="p-6 text-right pr-8"><button onClick={() => handleEditUserClick(u)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit3 size={18} /></button></td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        )}
      </div>

      {isUserModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsUserModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-black text-slate-900 text-lg">{editingUserId ? 'Edit Personnel' : 'New Personnel'}</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-8 space-y-6">
               {error && <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl flex items-center gap-2"><AlertCircle size={14}/> {error}</div>}
               
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{editingUserId ? 'Name' : 'Admin Name'}</label>
                 <div className="relative">
                   <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input autoFocus value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="Name" />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                 <div className="relative">
                   <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input type="email" value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="user@automate.ph" />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Master Key</label>
                 <div className="relative">
                   <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input type="password" value={userData.password} onChange={e => setUserData({...userData, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="5-8 Digits" maxLength={8} />
                 </div>
               </div>

               <div className="pt-4">
                 <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2">
                   <UserPlus size={18} /> {editingUserId ? 'Save Changes' : 'Provision Access'}
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};