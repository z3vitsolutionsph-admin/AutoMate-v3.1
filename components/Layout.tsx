
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { ViewState, UserRole, Product, Transaction, SystemUser, PlanType } from '../types';
import { Menu, Bell, UserCircle, Search, LogOut, ChevronDown, Cloud, CloudOff, Database, Receipt } from 'lucide-react';
import { formatCurrency } from '../constants';
import { dataService } from '../services/dataService';

interface LayoutProps {
  currentView: ViewState;
  setView: (v: ViewState) => void;
  children: React.ReactNode;
  role: UserRole;
  businessName?: string;
  onLogout: () => void;
  products: Product[];
  transactions: Transaction[];
  currentUser: SystemUser;
  subscriptionPlan: PlanType;
}

export const Layout: React.FC<LayoutProps> = ({ 
  currentView, setView, children, role, businessName, onLogout, products, transactions, currentUser, subscriptionPlan
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkSync = async () => {
      setIsSyncing(true);
      try { 
        await dataService.syncPending(); 
        setIsOnline(navigator.onLine); 
      } 
      catch (e) { setIsOnline(false); } 
      finally { setTimeout(() => setIsSyncing(false), 800); }
    };
    checkSync();
    const interval = setInterval(checkSync, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearchResults(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const results = useMemo(() => {
    if (!searchQuery.trim()) return { products: [], transactions: [] };
    const q = searchQuery.toLowerCase();
    return {
      products: products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 4),
      transactions: transactions.filter(t => t.id.toLowerCase().includes(q) || t.product.toLowerCase().includes(q)).slice(0, 4)
    };
  }, [searchQuery, products, transactions]);

  const handleResultClick = (view: ViewState) => {
    setView(view);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <Sidebar currentView={currentView} setView={setView} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} onLogout={onLogout} role={role} subscriptionPlan={subscriptionPlan} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-24 flex items-center justify-between px-6 md:px-10 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center gap-6">
             <button className="md:hidden p-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors" onClick={() => setIsMobileOpen(true)}><Menu size={24} /></button>
             
             {/* Dynamic Search */}
             <div className="hidden md:block relative" ref={searchRef}>
                <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-3 w-64 lg:w-96 shadow-inner focus-within:ring-4 focus-within:ring-indigo-50 focus-within:bg-white focus-within:border-indigo-100 transition-all group">
                   <Search size={20} className="text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                   <input 
                    placeholder="Quick search records..." 
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                    className="bg-transparent outline-none text-sm w-full font-bold text-slate-700" 
                   />
                </div>
                {showSearchResults && (searchQuery.trim() !== '') && (
                  <div className="absolute top-full left-0 mt-3 w-full bg-white rounded-[2rem] shadow-3xl border border-slate-100 p-6 z-[100] animate-in slide-in-from-top-2">
                    {results.products.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2 px-2 tracking-widest">Items Found</p>
                        {results.products.map(p => (
                          <div key={p.id} onClick={() => handleResultClick(ViewState.INVENTORY)} className="p-3 hover:bg-indigo-50 rounded-xl cursor-pointer text-xs font-black flex items-center justify-between group transition-all">
                             <span>{p.name}</span>
                             <Database size={12} className="opacity-0 group-hover:opacity-100 text-indigo-400" />
                          </div>
                        ))}
                      </div>
                    )}
                    {results.transactions.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2 px-2 tracking-widest">Recent Sales</p>
                        {results.transactions.map(t => (
                          <div key={t.id} onClick={() => handleResultClick(ViewState.DASHBOARD)} className="p-3 hover:bg-indigo-50 rounded-xl cursor-pointer text-xs font-black flex items-center justify-between group transition-all">
                             <span className="truncate max-w-[140px]">{t.product}</span>
                             <span className="text-emerald-600 font-bold">{formatCurrency(t.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {results.products.length === 0 && results.transactions.length === 0 && (
                      <p className="text-center py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">No records matching "{searchQuery}"</p>
                    )}
                  </div>
                )}
             </div>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6">
             {/* Sync Status */}
             <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl">
                {isOnline ? <Cloud size={16} className="text-emerald-500" /> : <CloudOff size={16} className="text-amber-500" />}
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase text-slate-400 leading-none">Saving Online</span>
                  <span className={`text-[10px] font-black leading-tight ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isSyncing ? 'Updating...' : isOnline ? 'All Saved' : 'Waiting...'}
                  </span>
                </div>
             </div>

             <div className="hidden lg:block text-right">
                <div className="text-sm font-black text-slate-900 tracking-tight">{businessName}</div>
                <div className="text-[9px] text-indigo-600 font-black uppercase bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 mt-1 shadow-sm">
                   {role.replace('_', ' ')}
                </div>
             </div>

             <div className="flex items-center gap-2 md:gap-3" ref={menuRef}>
                <button className="relative p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95">
                   <Bell size={22} className="text-slate-400" />
                   <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></div>
                </button>
                <div className="relative">
                   <button 
                    onClick={() => setShowUserMenu(!showUserMenu)} 
                    className="flex items-center gap-2 md:gap-3 p-1 bg-white border border-slate-200 rounded-[1.25rem] shadow-sm hover:shadow-md transition-all active:scale-95 group"
                   >
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                        <UserCircle size={24} />
                      </div>
                      <ChevronDown size={16} className={`text-slate-300 mr-1 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} />
                   </button>
                   
                   {showUserMenu && (
                    <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-[2.5rem] shadow-3xl border border-slate-100 p-3 z-50 animate-in fade-in slide-in-from-top-2">
                       <div className="p-5 border-b border-slate-50 mb-2">
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{currentUser.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{currentUser.email}</p>
                       </div>
                       <div className="space-y-1">
                          <button onClick={() => { setView(ViewState.SETTINGS); setShowUserMenu(false); }} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all font-black text-[10px] uppercase text-slate-600">
                             <span>Profile Details</span>
                             <ChevronDown size={14} className="-rotate-90 text-slate-300"/>
                          </button>
                          <button onClick={onLogout} className="w-full flex items-center justify-between p-4 hover:bg-rose-50 text-rose-600 rounded-2xl transition-all font-black text-[10px] uppercase group">
                             <span>Sign Out</span>
                             <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
                          </button>
                       </div>
                    </div>
                   )}
                </div>
             </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6 md:p-12 bg-grid-pattern bg-fixed">
          <div className="max-w-[1400px] mx-auto animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
