
import React, { useState } from 'react';
import { Settings as SettingsIcon, Link2, RefreshCw, CheckCircle2, Activity, Shield, Github, UserPlus, Mail, User, Trash2, Edit3, X, DollarSign, Percent, Monitor, Facebook, Instagram, Music, Smartphone, Globe, Share2, AlertCircle, Lock, Building2, MapPin, Phone, Plus, Briefcase, FileText, MessageSquare, Check } from 'lucide-react';
import { IntegrationConfig, SyncLog, SystemUser, UserRole, PlanType, Business } from '../types';

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
  activeBusinessId, onSwitchBusiness
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'integrations' | 'users'>('general');
  
  // User Management State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userData, setUserData] = useState({ name: '', email: '', password: '' });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // Business Management State
  const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false);
  const [businessData, setBusinessData] = useState<Partial<Business>>({});
  const [error, setError] = useState('');

  // --- Handlers: Connections ---
  const toggleConnection = (id: string) => {
    setIntegrations(prev => prev.map(int => int.id === id ? { ...int, status: int.status === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED', lastSync: new Date() } : int));
  };

  // --- Handlers: Users ---
  const handleAddUserClick = () => {
    const currentEmployees = users.filter(u => u.role === UserRole.EMPLOYEE).length;
    const limit = PLAN_USER_LIMITS[subscriptionPlan];
    
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

    if(!userData.name || !userData.email || !userData.password) { setError("All fields required"); return; }
    if (/\d/.test(userData.name)) { setError("Name must not contain numbers."); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) { setError("Please enter a valid Email Address."); return; }
    const keyRegex = /^\d{5,8}$/;
    if (!keyRegex.test(userData.password)) { setError("Master Key must be 5 to 8 digits."); return; }
    
    let userToSave: SystemUser;
    if (editingUserId) {
      const existing = users.find(u => u.id === editingUserId);
      userToSave = { ...existing!, name: userData.name, email: userData.email, password: userData.password };
    } else {
      userToSave = {
        id: `USR-${Date.now()}`,
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: UserRole.EMPLOYEE,
        status: 'Active',
        lastLogin: undefined,
        createdAt: new Date()
      };
    }

    if (onSaveUser) onSaveUser(userToSave);
    else {
       if (editingUserId) setUsers(prev => prev.map(u => u.id === editingUserId ? userToSave : u));
       else setUsers(prev => [...prev, userToSave]);
    }
    
    setIsUserModalOpen(false);
  };

  // --- Handlers: Business ---
  const handleAddBusinessClick = () => {
    const limit = PLAN_BUSINESS_LIMITS[subscriptionPlan];
    if (businesses.length >= limit) {
      alert(`Plan Limit Reached: Your ${subscriptionPlan.toLowerCase()} plan allows a maximum of ${limit} business profiles. Upgrade to expand.`);
      return;
    }
    setBusinessData({ name: '', type: '', address: '', contactEmail: '', phone: '' });
    setError('');
    setIsBusinessModalOpen(true);
  };

  const handleEditBusinessClick = (biz: Business) => {
    setBusinessData({ ...biz });
    setError('');
    setIsBusinessModalOpen(true);
  };

  const handleSaveBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!businessData.name?.trim()) { setError("Business Name required"); return; }
    if (!businessData.address?.trim()) { setError("Location Address required"); return; }

    const bizToSave: Business = {
        id: businessData.id || `BIZ-${Date.now()}`,
        name: businessData.name!,
        type: businessData.type || 'General',
        address: businessData.address!,
        contactEmail: businessData.contactEmail,
        phone: businessData.phone,
        isPrimary: businessData.isPrimary || false,
        tin: businessData.tin,
        receiptFooter: businessData.receiptFooter
    };

    if (onSaveBusiness) {
        await onSaveBusiness(bizToSave);
    }
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
        {/* --- GENERAL TAB --- */}
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
                    <button onClick={handleAddBusinessClick} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 active:scale-95">
                       <Plus size={16} /> New Business
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {businesses.map(biz => {
                       const isActive = activeBusinessId === biz.id;
                       return (
                         <div 
                           key={biz.id} 
                           onClick={() => onSwitchBusiness && onSwitchBusiness(biz.id)}
                           className={`group relative border rounded-[2rem] p-6 transition-all cursor-pointer ${
                             isActive 
                               ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-200 text-white ring-4 ring-indigo-50' 
                               : 'bg-slate-50 border-slate-200 hover:border-indigo-300 hover:shadow-md'
                           }`}
                         >
                            {isActive && (
                              <div className="absolute top-0 right-0 p-4">
                                 <div className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                   <CheckCircle2 size={12} fill="currentColor" className="text-emerald-400" /> Active
                                 </div>
                              </div>
                            )}
                            
                            {!isActive && (
                              <div className="absolute top-6 right-6">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleEditBusinessClick(biz); }} 
                                   className="p-2 bg-white text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-all"
                                 >
                                    <Edit3 size={16} />
                                 </button>
                              </div>
                            )}
                            
                            {isActive && (
                              <div className="absolute bottom-6 right-6">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleEditBusinessClick(biz); }} 
                                   className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                                 >
                                    <Edit3 size={16} />
                                 </button>
                              </div>
                            )}
                            
                            <div className="flex items-start gap-4 mb-4">
                               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                                 isActive 
                                   ? 'bg-white text-indigo-600 shadow-none' 
                                   : 'bg-white text-slate-400 shadow-slate-100 border border-slate-100'
                               }`}>
                                  <Building2 size={24} />
                               </div>
                               <div>
                                  <h4 className={`text-lg font-black leading-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>{biz.name}</h4>
                                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest ${
                                    isActive 
                                      ? 'bg-white/20 text-white border border-white/10' 
                                      : 'bg-white border border-slate-200 text-slate-500'
                                  }`}>
                                     {biz.type || 'General'}
                                  </span>
                               </div>
                            </div>
                            
                            <div className={`space-y-2.5 pt-4 border-t ${isActive ? 'border-white/20' : 'border-slate-200/60'}`}>
                               <div className={`flex items-center gap-3 text-xs font-medium ${isActive ? 'text-indigo-100' : 'text-slate-600'}`}>
                                  <MapPin size={14} className={`shrink-0 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`} />
                                  <span className="truncate">{biz.address}</span>
                               </div>
                               {(biz.contactEmail || biz.phone) && (
                                 <div className={`flex items-center gap-3 text-xs font-medium ${isActive ? 'text-indigo-100' : 'text-slate-600'}`}>
                                    {biz.phone && <Phone size={14} className={`shrink-0 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`} />}
                                    {biz.contactEmail && <Mail size={14} className={`shrink-0 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`} />}
                                    <span className="truncate">{[biz.phone, biz.contactEmail].filter(Boolean).join(' • ')}</span>
                                 </div>
                               )}
                            </div>
                         </div>
                       );
                    })}
                    
                    {businesses.length < PLAN_BUSINESS_LIMITS[subscriptionPlan] && (
                        <button onClick={handleAddBusinessClick} className="border-2 border-dashed border-slate-200 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all min-h-[200px] group">
                           <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-white border border-slate-200 flex items-center justify-center transition-colors">
                              <Plus size={24} />
                           </div>
                           <span className="text-xs font-black uppercase tracking-widest">Create Line of Business</span>
                        </button>
                    )}
                 </div>
              </section>
           </div>
        )}

        {/* --- INTEGRATIONS TAB --- */}
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

        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
           <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden relative">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                   <h3 className="text-lg font-bold text-slate-900">Operator Registry</h3>
                   <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                     Capacity: {users.filter(u => u.role === UserRole.EMPLOYEE).length} / {PLAN_USER_LIMITS[subscriptionPlan] === Infinity ? '∞' : PLAN_USER_LIMITS[subscriptionPlan]} Slots Used
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

      {/* --- BUSINESS MODAL --- */}
      {isBusinessModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsBusinessModalOpen(false)} />
           
           {/* Modal Content */}
           <div className="relative w-full sm:max-w-lg h-[90vh] sm:h-auto sm:max-h-[90vh] bg-white border-t sm:border border-slate-200 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 flex flex-col">
              
              {/* Header */}
              <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                 <div>
                    <h3 className="font-black text-slate-900 text-lg sm:text-xl">{businessData.id ? 'Edit Business Profile' : 'New Line of Business'}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Entity Configuration</p>
                 </div>
                 <button onClick={() => setIsBusinessModalOpen(false)} className="p-2.5 bg-white hover:bg-slate-100 rounded-xl transition-colors border border-slate-100 shadow-sm"><X size={20} className="text-slate-400" /></button>
              </div>

              {/* Scrollable Form Area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
                  <form id="business-form" onSubmit={handleSaveBusinessSubmit} className="space-y-6">
                     {error && <div className="p-4 bg-rose-50 text-rose-600 text-xs font-bold rounded-2xl flex items-center gap-3 border border-rose-100"><AlertCircle size={16} className="shrink-0"/> {error}</div>}
                     
                     {/* Business Name */}
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Name</label>
                        <div className="relative group">
                           <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                           <input autoFocus value={businessData.name || ''} onChange={e => setBusinessData({...businessData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all" placeholder="Enterprise Name" />
                        </div>
                     </div>

                     {/* Type & Phone Grid */}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Market Sector</label>
                           <div className="relative group">
                              <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                              <input value={businessData.type || ''} onChange={e => setBusinessData({...businessData, type: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all" placeholder="Retail, Food, etc." />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Phone</label>
                           <div className="relative group">
                              <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                              <input type="tel" value={businessData.phone || ''} onChange={e => setBusinessData({...businessData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all" placeholder="+63 900..." />
                           </div>
                        </div>
                     </div>

                     {/* Email */}
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                        <div className="relative group">
                           <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                           <input type="email" value={businessData.contactEmail || ''} onChange={e => setBusinessData({...businessData, contactEmail: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all" placeholder="business@domain.com" />
                        </div>
                     </div>

                     {/* Address */}
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Address</label>
                        <div className="relative group">
                           <MapPin size={18} className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                           <textarea value={businessData.address || ''} onChange={e => setBusinessData({...businessData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all resize-none h-24 sm:h-28" placeholder="Full location address..." />
                        </div>
                     </div>

                     {/* Divider */}
                     <div className="py-2 border-t border-slate-100 relative">
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">Receipt Config</span>
                     </div>

                     {/* Receipt Config: TIN & Footer */}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax ID (TIN)</label>
                           <div className="relative group">
                              <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                              <input value={businessData.tin || ''} onChange={e => setBusinessData({...businessData, tin: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all" placeholder="000-000-000" />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Footer Message</label>
                           <div className="relative group">
                              <MessageSquare size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                              <input value={businessData.receiptFooter || ''} onChange={e => setBusinessData({...businessData, receiptFooter: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all" placeholder="Thank you!" />
                           </div>
                        </div>
                     </div>
                  </form>
              </div>

              {/* Footer Actions */}
              <div className="p-6 sm:p-8 border-t border-slate-100 bg-slate-50/80 backdrop-blur-xl shrink-0">
                 <button type="submit" form="business-form" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 sm:py-5 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm uppercase tracking-widest">
                    <CheckCircle2 size={20} /> Save Profile
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* --- USER MODAL --- */}
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
