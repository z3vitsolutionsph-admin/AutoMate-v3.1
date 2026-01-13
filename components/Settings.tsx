
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Link2, RefreshCw, CheckCircle2, Activity, Shield, Github, UserPlus, Mail, User, Trash2, Edit3, X, DollarSign, Percent, Monitor, Facebook, Instagram, Music, Smartphone, Globe, Share2, AlertCircle, Lock, Building2, MapPin, Phone, Plus, Briefcase, FileText, MessageSquare, Check, Database, Cloud, HardDrive, Wifi, WifiOff, ExternalLink, GitBranch, Zap, CloudUpload, History } from 'lucide-react';
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
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>;
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
  
  // Diagnostics & Sync
  const [diagnostics, setDiagnostics] = useState<SyncDiagnostic[]>([]);
  const [isRunningDiag, setIsRunningDiag] = useState(false);
  const [isSyncingGitHub, setIsSyncingGitHub] = useState(false);
  const [lastAudit, setLastAudit] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ message: string; type: 'success' | 'info' | 'error' | null }>({ message: '', type: null });

  useEffect(() => {
    if (activeTab === 'integrations') handleRunDiagnostics();
  }, [activeTab]);

  const handleRunDiagnostics = async () => {
    if (!activeBusinessId) return;
    setIsRunningDiag(true);
    try {
      await dataService.syncPending();
      const report = await dataService.getSyncDiagnostics(activeBusinessId);
      setDiagnostics(report);
      setLastAudit(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningDiag(false);
    }
  };

  const handleGitHubSync = async () => {
    if (!activeBusinessId) return;
    setIsSyncingGitHub(true);
    setSyncStatus({ message: 'Initializing GitHub Secure Handshake...', type: 'info' });
    
    try {
      const response = await dataService.syncWithGitHub(activeBusinessId);
      if (response.success) {
        setSyncStatus({ message: `System state pushed to master. Commit: ${response.data?.commitHash}`, type: 'success' });
        setIntegrations(prev => prev.map(int => int.provider === 'GITHUB' ? { ...int, status: 'CONNECTED', lastSync: new Date() } : int));
      } else {
        setSyncStatus({ message: response.error || 'GitHub sync interrupted.', type: 'error' });
      }
    } catch (e) {
      setSyncStatus({ message: 'Critical Handshake Error.', type: 'error' });
    } finally {
      setTimeout(() => setIsSyncingGitHub(false), 800);
      setTimeout(() => setSyncStatus({ message: '', type: null }), 5000);
    }
  };

  const handleForceSync = async (table: string) => {
    if (!activeBusinessId) return;
    if (!window.confirm(`Initiate Deep Reconcile for "${table}"? This will synchronize Local Node with Cloud Registry.`)) return;

    setIsRunningDiag(true);
    try {
      const cloudData: any[] = await dataService.fetch(table, table, activeBusinessId);
      if (table === 'products' && setProducts) setProducts(cloudData);
      if (table === 'transactions' && setTransactions) setTransactions(cloudData);
      if (table === 'users' && setUsers) setUsers(cloudData);
      await handleRunDiagnostics();
      setSyncStatus({ message: `${table} registry reconciled with Cloud.`, type: 'success' });
    } catch (e) {
      setSyncStatus({ message: "Cloud bridge interrupted.", type: 'error' });
    } finally {
      setIsRunningDiag(false);
      setTimeout(() => setSyncStatus({ message: '', type: null }), 3000);
    }
  };

  const handleSaveBusinessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveBusiness) {
      const businessToSave = {
        name: '',
        address: '',
        type: 'General',
        ...businessData,
        id: businessData.id || `BIZ-${Date.now()}`
      } as Business;
      onSaveBusiness(businessToSave);
      setIsBusinessModalOpen(false);
      setBusinessData({});
    }
  };

  const toggleConnection = (id: string) => {
    const int = integrations.find(i => i.id === id);
    if (int?.provider === 'GITHUB') {
      handleGitHubSync();
    } else {
      setIntegrations(prev => prev.map(int => int.id === id ? { ...int, status: int.status === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED', lastSync: new Date() } : int));
    }
  };

  const handleAddUserClick = () => {
    if (users.filter(u => u.role === UserRole.EMPLOYEE).length >= PLAN_USER_LIMITS[subscriptionPlan]) {
      alert(`Staff capacity reached for ${subscriptionPlan} plan.`); return;
    }
    setUserData({ name: '', email: '', password: '' });
    setEditingUserId(null); setIsUserModalOpen(true);
  };

  const handleEditUserClick = (user: SystemUser) => {
    setUserData({ name: user.name, email: user.email, password: user.password || '' });
    setEditingUserId(user.id); setIsUserModalOpen(true);
  };

  const handleSaveUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const userToSave: SystemUser = editingUserId 
      ? { ...users.find(u => u.id === editingUserId)!, name: userData.name, email: userData.email, password: userData.password }
      : { id: `USR-${Date.now()}`, name: userData.name, email: userData.email, password: userData.password, role: UserRole.EMPLOYEE, status: 'Active', createdAt: new Date(), businessId: activeBusinessId };
    
    if (onSaveUser) onSaveUser(userToSave);
    else setUsers(prev => editingUserId ? prev.map(u => u.id === editingUserId ? userToSave : u) : [...prev, userToSave]);
    setIsUserModalOpen(false);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">System Node Control</h2>
            <p className="text-slate-500 text-sm mt-1 font-medium">Manage neural pathways, cloud linkage, and operational authority.</p>
          </div>
          <div className="flex bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm">
            {['general', 'users', 'integrations'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}>{tab}</button>
            ))}
          </div>
      </div>

      {syncStatus.message && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${
          syncStatus.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
          syncStatus.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-700' :
          'bg-indigo-50 border-indigo-100 text-indigo-700'
        }`}>
          <Zap size={18} className={syncStatus.type === 'info' ? 'animate-pulse' : ''} />
          <span className="text-xs font-black uppercase tracking-widest">{syncStatus.message}</span>
        </div>
      )}

      <div className="pt-2">
        {activeTab === 'general' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2">
              <section className="lg:col-span-2 bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm space-y-10">
                 <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-slate-900">Organization Grid</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                           Multi-Node Management: {businesses.length} / {PLAN_BUSINESS_LIMITS[subscriptionPlan] === Infinity ? '∞' : PLAN_BUSINESS_LIMITS[subscriptionPlan]}
                        </p>
                    </div>
                    <button onClick={() => setIsBusinessModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-xs transition-all shadow-xl shadow-indigo-100 flex items-center gap-2 active:scale-95"><Plus size={18} /> New Entity</button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {businesses.map(biz => (
                         <div key={biz.id} onClick={() => onSwitchBusiness && onSwitchBusiness(biz.id)} className={`group relative border-2 rounded-[2.5rem] p-8 transition-all cursor-pointer ${activeBusinessId === biz.id ? 'border-indigo-600 bg-indigo-50/20 shadow-2xl shadow-indigo-100 ring-8 ring-indigo-50/50' : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}`}>
                            {activeBusinessId === biz.id && (
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg">Primary Node</div>
                            )}
                            <div className="flex items-center justify-between mb-8">
                               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${activeBusinessId === biz.id ? 'bg-indigo-600 text-white scale-110' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-indigo-500'}`}><Building2 size={28} /></div>
                               {activeBusinessId !== biz.id && <button onClick={(e) => { e.stopPropagation(); setBusinessData(biz); setIsBusinessModalOpen(true); }} className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm transition-all"><Edit3 size={18} /></button>}
                            </div>
                            <h4 className="text-xl font-black text-slate-900 leading-tight">{biz.name}</h4>
                            <div className="mt-4 flex items-center gap-2">
                               <span className="px-3 py-1 bg-white border border-slate-100 rounded-lg text-[9px] font-bold text-slate-500 uppercase tracking-widest">{biz.type || 'Retail'}</span>
                               <div className="w-1 h-1 rounded-full bg-slate-300" />
                               <span className="text-[10px] font-medium text-slate-400 truncate">{biz.address}</span>
                            </div>
                         </div>
                    ))}
                 </div>
              </section>

              <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl space-y-8 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-10"><Shield size={120} /></div>
                 <div className="relative z-10">
                    <h3 className="text-xl font-black mb-2">Subscription Architecture</h3>
                    <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-8">{subscriptionPlan} TIER ACTIVE</p>
                    
                    <div className="space-y-6">
                       <div className="p-6 bg-white/10 rounded-3xl border border-white/10">
                          <div className="flex justify-between items-center mb-4">
                             <span className="text-[10px] font-black uppercase text-indigo-200">Personnel Seats</span>
                             <span className="text-xs font-bold">{users.length} / {PLAN_USER_LIMITS[subscriptionPlan] === Infinity ? '∞' : PLAN_USER_LIMITS[subscriptionPlan]}</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full bg-indigo-400 transition-all duration-1000" style={{ width: `${Math.min(100, (users.length / PLAN_USER_LIMITS[subscriptionPlan]) * 100)}%` }} />
                          </div>
                       </div>
                       <ul className="space-y-4">
                          {['Neural AI Audit', 'Global Node Sync', 'Executive Analytics'].map(f => (
                             <li key={f} className="flex items-center gap-3 text-xs font-medium text-indigo-100/80"><div className="w-5 h-5 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400"><Check size={12} strokeWidth={3} /></div>{f}</li>
                          ))}
                       </ul>
                    </div>
                    <button className="w-full mt-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-900/40 transition-all active:scale-95 text-xs uppercase tracking-widest">Upgrade Architecture</button>
                 </div>
              </section>
           </div>
        )}

        {activeTab === 'users' && (
           <div className="bg-white border border-slate-200 rounded-[3rem] shadow-sm overflow-hidden animate-in fade-in">
             <div className="p-10 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Personnel Registry</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Staff Access Protocols</p>
                </div>
                <button onClick={handleAddUserClick} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-100 flex items-center gap-2 active:scale-95"><UserPlus size={20} /> Provision User</button>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                   <tr><th className="p-8">Operator Identity</th><th className="p-8">Role Mapping</th><th className="p-8">State</th><th className="p-8 text-right pr-12">Registry Actions</th></tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {users.map(u => (
                     <tr key={u.id} className="hover:bg-indigo-50/30 transition-colors group">
                       <td className="p-8">
                         <div className="flex items-center gap-5">
                           <div className="w-14 h-14 rounded-[1.25rem] bg-white border border-slate-200 flex items-center justify-center text-slate-300 shadow-inner group-hover:border-indigo-200 transition-all"><User size={24} /></div>
                           <div><p className="font-black text-slate-900 text-base">{u.name}</p><p className="text-xs text-slate-400 font-medium">{u.email}</p></div>
                         </div>
                       </td>
                       <td className="p-8"><span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${u.role.includes('ADMIN') ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{u.role.replace('_', ' ')}</span></td>
                       <td className="p-8"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${u.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} /><span className={`text-[10px] font-black uppercase tracking-widest ${u.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}`}>{u.status}</span></div></td>
                       <td className="p-8 text-right pr-12"><button onClick={() => handleEditUserClick(u)} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100"><Edit3 size={20} /></button></td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        )}

        {activeTab === 'integrations' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
            <div className="lg:col-span-8 space-y-8">
              {/* Unified Sync Command Center */}
              <section className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none"><Database size={200} /></div>
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 relative z-10">
                    <div className="flex items-center gap-5">
                       <div className="p-4 bg-indigo-600 rounded-[1.25rem] text-white shadow-2xl shadow-indigo-200"><Activity size={28}/></div>
                       <div>
                          <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Unified Sync Hub</h3>
                          <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-2">Supabase Cloud & GitHub Master Repository</p>
                       </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                       <button onClick={handleRunDiagnostics} disabled={isRunningDiag} className="bg-white border border-slate-200 text-slate-900 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm transition-all flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50">
                         <History size={14} className={isRunningDiag ? 'animate-spin' : ''} />
                         Audit Registry
                       </button>
                       <button onClick={handleGitHubSync} disabled={isSyncingGitHub} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50">
                         <CloudUpload size={14} className={isSyncingGitHub ? 'animate-bounce' : ''} />
                         Global Synchronize
                       </button>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 relative z-10">
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl">
                       <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                             <Cloud size={16} className="text-indigo-500" />
                             <span className="text-[9px] font-black uppercase text-slate-400">Cloud Node Status</span>
                          </div>
                          <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-lg">Operational</span>
                       </div>
                       <p className="text-xl font-black text-slate-900 tracking-tight">Supabase Bridge</p>
                       <p className="text-[10px] text-slate-400 font-medium mt-1 leading-relaxed">Real-time database synchronization via encrypted PostgreSQL channels.</p>
                    </div>
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl">
                       <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                             <Github size={16} className="text-slate-900" />
                             <span className="text-[9px] font-black uppercase text-slate-400">Repository Status</span>
                          </div>
                          <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-lg">Version Control Active</span>
                       </div>
                       <p className="text-xl font-black text-slate-900 tracking-tight">GitHub Master</p>
                       <p className="text-[10px] text-slate-400 font-medium mt-1 leading-relaxed">System state ledger backups and transactional branch management.</p>
                    </div>
                 </div>

                 <div className="space-y-4 relative z-10">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Registry Reconciliation Table</h4>
                    {diagnostics.length > 0 ? (
                       <div className="grid gap-3">
                          {diagnostics.map(d => (
                             <div key={d.table} className="group bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex items-center justify-between hover:bg-white hover:border-indigo-100 hover:shadow-lg transition-all duration-500">
                                <div className="flex items-center gap-5">
                                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${d.status === 'Synced' ? 'bg-emerald-50 text-emerald-600' : d.status === 'Discrepancy' ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                                      {d.status === 'Synced' ? <CheckCircle2 size={20}/> : d.status === 'Discrepancy' ? <AlertCircle size={20}/> : <WifiOff size={20}/>}
                                   </div>
                                   <div>
                                      <h4 className="font-black text-slate-900 text-xs uppercase tracking-tight">{d.table}</h4>
                                      <div className="flex items-center gap-3 mt-1">
                                         <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Local: {d.localCount}</span>
                                         <span className="text-[9px] font-bold text-slate-400">|</span>
                                         <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">Cloud: {d.cloudCount === -1 ? '?' : d.cloudCount}</span>
                                      </div>
                                   </div>
                                </div>
                                <div className="flex items-center gap-3">
                                   {d.pendingActions > 0 && <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-100">Queue: {d.pendingActions}</span>}
                                   <button onClick={() => handleForceSync(d.table)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${d.status === 'Synced' ? 'text-slate-300 hover:text-indigo-600 hover:bg-white' : 'bg-rose-600 text-white shadow-lg shadow-rose-100'}`}>Sync Node</button>
                                </div>
                             </div>
                          ))}
                       </div>
                    ) : (
                       <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/30">
                          <Activity size={32} className="mx-auto text-slate-200 mb-3"/>
                          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Initialize Audit to scan nodes</p>
                       </div>
                    )}
                 </div>
              </section>

              <section className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm">
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-10 flex items-center gap-3">
                   <Link2 size={16} className="text-indigo-500" /> 
                   External Platform Linkage
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {integrations.map(int => (
                      <div key={int.id} className="group bg-white border border-slate-100 rounded-[2rem] p-6 flex flex-col hover:border-indigo-200 hover:shadow-xl transition-all duration-500">
                        <div className="flex items-center justify-between mb-6">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${int.status === 'CONNECTED' ? 'bg-indigo-600 text-white scale-110 shadow-lg' : 'bg-slate-50 text-slate-400 border border-slate-100 group-hover:bg-white group-hover:text-indigo-500 group-hover:border-indigo-100'}`}>
                             {int.provider === 'GITHUB' ? <Github size={24}/> : <Globe size={24} />}
                          </div>
                          <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${int.status === 'CONNECTED' ? 'text-emerald-500' : 'text-slate-300'}`}>
                             <div className={`w-1.5 h-1.5 rounded-full ${int.status === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-200'}`} />
                             {int.status}
                          </span>
                        </div>
                        <div className="mb-6">
                           <h4 className="text-lg font-black text-slate-900 leading-none">{int.name}</h4>
                           {int.lastSync && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Sync: {int.lastSync.toLocaleTimeString()}</p>}
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => toggleConnection(int.id)} className={`flex-1 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${int.status === 'CONNECTED' ? 'bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700'}`}>
                             {int.status === 'CONNECTED' ? 'Update' : 'Initialize'}
                           </button>
                           {int.status === 'CONNECTED' && <button className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm transition-all"><ExternalLink size={16}/></button>}
                        </div>
                      </div>
                    ))}
                 </div>
              </section>
            </div>

            <div className="lg:col-span-4 space-y-8">
               <div className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:scale-110 transition-transform duration-1000"><Database size={180}/></div>
                  <h4 className="text-xl font-black mb-6 flex items-center gap-3"><Shield size={24} className="text-indigo-300"/> Security Protocol</h4>
                  <div className="space-y-6">
                     <p className="text-sm font-medium text-indigo-100 leading-relaxed opacity-90">All data synchronized with external nodes is encrypted via 256-bit Neural-TLS. Audit logs are persisted for 90 days.</p>
                     <div className="pt-6 border-t border-white/10 space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-indigo-300"><span>Registry Encryption</span><span className="text-emerald-400">AES-256 [OK]</span></div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-indigo-300"><span>Handshake Timeout</span><span>3000ms</span></div>
                     </div>
                  </div>
               </div>

               <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm">
                  <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3"><RefreshCw size={20} className="text-indigo-600"/> Auto-Sync Logic</h4>
                  <div className="space-y-6">
                     <label className="flex items-center justify-between cursor-pointer group">
                        <div>
                           <p className="text-sm font-bold text-slate-900">Background Sync</p>
                           <p className="text-[10px] text-slate-400 font-medium">Reconcile while idle</p>
                        </div>
                        <div className="w-12 h-6 bg-emerald-500 rounded-full relative shadow-inner"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" /></div>
                     </label>
                     <label className="flex items-center justify-between cursor-pointer group opacity-50">
                        <div>
                           <p className="text-sm font-bold text-slate-900">Push Notifications</p>
                           <p className="text-[10px] text-slate-400 font-medium">Cloud event triggers</p>
                        </div>
                        <div className="w-12 h-6 bg-slate-200 rounded-full relative shadow-inner"><div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" /></div>
                     </label>
                  </div>
               </div>
               
               <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                  <GitBranch size={80} className="absolute -top-4 -left-4 opacity-5 text-indigo-400" />
                  <h4 className="text-lg font-black mb-4">Neural Ledger v3.5</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium mb-8">Synchronizing local data nodes with master cloud repositories ensures data sovereignty and high-availability across global entities.</p>
                  <div className="flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Master Node: Synchronized</span>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {isBusinessModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsBusinessModalOpen(false)} />
          <div className="relative w-full sm:max-w-xl bg-white rounded-[3rem] shadow-3xl p-12 animate-in zoom-in-95 border border-slate-200 overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
             <form onSubmit={handleSaveBusinessSubmit} className="space-y-8">
                <div className="flex justify-between items-center">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Entity Profile</h3>
                  <button type="button" onClick={() => setIsBusinessModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors"><X size={24}/></button>
                </div>
                <div className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Business Identity</label>
                      <input value={businessData.name || ''} onChange={e => setBusinessData({...businessData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 transition-all" placeholder="Apex Retail Global" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Deployment Hub</label>
                      <input value={businessData.address || ''} onChange={e => setBusinessData({...businessData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 transition-all" placeholder="Global Logistics Center" />
                   </div>
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-2xl shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-widest">Update Registry</button>
             </form>
          </div>
        </div>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsUserModalOpen(false)} />
          <div className="relative w-full sm:max-w-lg bg-white rounded-[3rem] shadow-3xl p-12 animate-in zoom-in-95 border border-slate-200">
             <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
             <form onSubmit={handleSaveUserSubmit} className="space-y-8">
                <div className="flex justify-between items-center">
                   <h3 className="text-3xl font-black text-slate-900 tracking-tight">Provision Personnel</h3>
                   <button type="button" onClick={() => setIsUserModalOpen(false)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors"><X size={24}/></button>
                </div>
                <div className="space-y-4">
                   <input value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50" placeholder="Full Operator Name" />
                   <input value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50" placeholder="operator@automate.ph" />
                   <input type="password" value={userData.password} onChange={e => setUserData({...userData, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50" placeholder="Secure Access Key" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-2xl shadow-indigo-100 transition-all active:scale-95 text-xs uppercase tracking-widest">Provision Access</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
