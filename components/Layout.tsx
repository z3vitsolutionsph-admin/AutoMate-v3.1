
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Sidebar } from './Sidebar';
import { ViewState, UserRole, Product, Transaction, SystemUser, PlanType } from '../types';
import { Menu, Bell, UserCircle, Search, Command, LogOut, Settings, User, CreditCard, ChevronDown, AlertTriangle, CheckCircle2, Info, ShoppingBag, X, Zap, Sparkles, BellRing, BarChart, UserPlus, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../constants';

interface LayoutProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  children: React.ReactNode;
  role: UserRole;
  businessName?: string;
  onLogout: () => void;
  products: Product[];
  transactions: Transaction[];
  currentUser: SystemUser;
  users?: SystemUser[];
  subscriptionPlan: PlanType;
}

interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: Date;
  type: 'alert' | 'success' | 'info';
  category: 'STOCK' | 'SALE' | 'SYSTEM';
}

export const Layout: React.FC<LayoutProps> = ({ 
  currentView, setView, children, role, businessName, onLogout, products, transactions, currentUser, users = [], subscriptionPlan
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('automate_read_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setShowProfileMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Save read state to persistence
  useEffect(() => {
    localStorage.setItem('automate_read_notifications', JSON.stringify(readNotifIds));
  }, [readNotifIds]);

  // Dynamic Notification Engine
  const notifications = useMemo(() => {
    const list: AppNotification[] = [];

    // 1. Critical Stock Logic
    products.filter(p => p.stock < 10).forEach(p => {
      list.push({
        id: `stock-${p.id}-${p.stock}`,
        title: 'Critical Stock Level',
        message: `${p.name} is down to ${p.stock} units. Restock protocol recommended.`,
        time: new Date(), // Simulating recent discovery
        type: 'alert',
        category: 'STOCK'
      });
    });

    // 2. Transaction Velocity Logic
    transactions.slice(0, 5).forEach(t => {
      list.push({
        id: `sale-${t.id}`,
        title: 'Successful Terminal Sale',
        message: `Order #${t.id.slice(-6)} completed: ${formatCurrency(t.amount)}`,
        time: new Date(t.date),
        type: 'success',
        category: 'SALE'
      });
    });

    // 3. System Health Logic
    if (products.length > 0 && products.every(p => p.imageUrl)) {
      list.push({
        id: 'sys-catalog-optimized',
        title: 'Catalog Fully Optimized',
        message: 'All enrolled assets have verified visual metadata.',
        time: new Date(),
        type: 'info',
        category: 'SYSTEM'
      });
    }

    // 4. Login Notification
    if (currentUser && currentUser.lastLogin) {
      // Use lastLogin time to ensure uniqueness if lastLogin is persisted
      const loginTime = new Date(currentUser.lastLogin);
      list.push({
        id: `login-${currentUser.id}-${loginTime.getTime()}`,
        title: 'Operator Session Active',
        message: `${currentUser.role.replace('_', ' ')}: ${currentUser.name} logged in at ${loginTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on ${loginTime.toLocaleDateString()}`,
        time: loginTime,
        type: 'info',
        category: 'SYSTEM'
      });
    }

    // 5. New Personnel Onboarded Notification
    // Filter users created within the last 24 hours, excluding the current user to prevent self-notification spam on signup/setup
    const recentUsers = users.filter(u => 
      u.createdAt && 
      (new Date().getTime() - new Date(u.createdAt).getTime()) < 24 * 60 * 60 * 1000 && 
      u.id !== currentUser.id
    );
    
    recentUsers.forEach(u => {
       list.push({
         id: `new-user-${u.id}`,
         title: 'New Personnel Onboarded',
         message: `Access granted to ${u.name} as ${u.role}. Master key provisioned successfully.`,
         time: new Date(u.createdAt!),
         type: 'info',
         category: 'SYSTEM'
       });
    });

    return list.sort((a, b) => b.time.getTime() - a.time.getTime());
  }, [products, transactions, currentUser, users]);

  const unreadCount = notifications.filter(n => !readNotifIds.includes(n.id)).length;

  const markAsRead = (id: string) => {
    if (!readNotifIds.includes(id)) {
      setReadNotifIds(prev => [...prev, id]);
    }
  };

  const markAllAsRead = () => {
    setReadNotifIds(notifications.map(n => n.id));
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <Sidebar 
        currentView={currentView} 
        setView={setView}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onLogout={onLogout}
        role={role}
        subscriptionPlan={subscriptionPlan}
      />

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative">
        <header className="h-20 flex items-center justify-between px-4 md:px-8 py-4 sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center gap-4">
             <button 
              className="md:hidden p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
            
            <div className="hidden md:flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-2.5 w-64 lg:w-96 hover:border-indigo-300 transition-all group shadow-sm">
               <Search size={18} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
               <input 
                 type="text" 
                 placeholder="Search registry..." 
                 className="bg-transparent border-none outline-none text-sm text-slate-900 placeholder-slate-400 w-full font-medium"
               />
               <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-slate-200 shadow-xs">
                 <Command size={10} className="text-slate-400" />
                 <span className="text-[9px] font-black text-slate-400">K</span>
               </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
             <div className="hidden lg:block text-right">
               <div className="text-sm font-black text-slate-900 tracking-tight">{businessName}</div>
               <div className="text-[9px] text-indigo-600 font-black uppercase tracking-[0.2em] bg-indigo-50 px-2 py-0.5 rounded-md inline-block mt-1 border border-indigo-100">
                 {role.replace('_', ' ')} Hub
               </div>
             </div>

             <div className="h-8 w-px bg-slate-200 hidden lg:block"></div>
             
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-3 text-slate-500 hover:text-indigo-600 transition-all bg-white hover:bg-slate-50 rounded-2xl border ${showNotifications ? 'border-indigo-600 bg-indigo-50 text-indigo-600 ring-4 ring-indigo-50/50' : 'border-slate-200'} shadow-sm group active:scale-95`}
              >
                {unreadCount > 0 ? <BellRing size={20} className="animate-wiggle" /> : <Bell size={20} />}
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white border-2 border-white shadow-lg animate-pulse-subtle">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="fixed inset-x-4 top-24 md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-4 w-auto md:w-[400px] bg-white/95 backdrop-blur-3xl border border-white/60 rounded-[2rem] shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300 ring-1 ring-black/5 flex flex-col origin-top-right">
                    
                    {/* Header */}
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200 flex items-center justify-center">
                            <Zap size={20} fill="currentColor" />
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-[0.15em] leading-none">Activity Feed</h3>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-none">{unreadCount} Pending Tasks</p>
                          </div>
                        </div>
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllAsRead}
                            className="px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-900 text-[9px] font-black text-white uppercase tracking-widest hover:shadow-lg transition-all rounded-full active:scale-95 border border-slate-700 shadow-md"
                          >
                            Flush All
                          </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-[60vh] sm:max-h-[480px] overflow-y-auto custom-scrollbar bg-white/40">
                        {notifications.length > 0 ? notifications.map(n => {
                            const isRead = readNotifIds.includes(n.id);
                            return (
                              <div 
                                key={n.id} 
                                onClick={() => markAsRead(n.id)}
                                className={`p-5 border-b border-slate-100/50 hover:bg-white/80 transition-all cursor-pointer relative group ${!isRead ? 'bg-indigo-50/30' : ''}`}
                              >
                                  <div className="flex gap-4">
                                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 shadow-sm ${
                                        n.type === 'alert' ? 'bg-rose-50 border-rose-100 text-rose-500' : 
                                        n.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-500' : 
                                        'bg-indigo-50 border-indigo-100 text-indigo-500'
                                      }`}>
                                          {n.title === 'New Personnel Onboarded' && <UserPlus size={18} />}
                                          {n.type === 'alert' && <AlertTriangle size={18} />}
                                          {n.type === 'success' && <ShoppingBag size={18} />}
                                          {n.type === 'info' && n.title !== 'New Personnel Onboarded' && <Sparkles size={18} />}
                                      </div>
                                      <div className="flex-1 min-w-0 pt-0.5">
                                          <div className="flex justify-between items-start mb-1.5">
                                              <span className={`text-[11px] font-black uppercase tracking-tight truncate pr-2 ${!isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                                                {n.title}
                                              </span>
                                              <span className="text-[9px] text-slate-400 font-bold whitespace-nowrap bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                                {getRelativeTime(n.time)}
                                              </span>
                                          </div>
                                          <p className={`text-[10px] leading-relaxed line-clamp-2 ${!isRead ? 'text-slate-800 font-bold' : 'text-slate-400 font-medium'}`}>
                                            {n.message}
                                          </p>
                                      </div>
                                  </div>
                                  {!isRead && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-600 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.6)] animate-pulse" />
                                  )}
                              </div>
                            );
                        }) : (
                          <div className="py-20 text-center flex flex-col items-center gap-4 opacity-60">
                              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200 text-slate-300">
                                <Bell size={24} />
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">All Nodes Silent</p>
                                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">No recent alerts</p>
                              </div>
                          </div>
                        )}
                    </div>
                    
                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="p-4 bg-slate-50/80 border-t border-slate-100 text-center backdrop-blur-sm sticky bottom-0">
                         <button className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.25em] hover:text-indigo-800 transition-colors flex items-center justify-center gap-2 mx-auto py-1 group">
                           View Journal <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform"/>
                         </button>
                      </div>
                    )}
                </div>
              )}
            </div>
            
            <div className="relative" ref={profileRef}>
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className={`flex items-center gap-3 pl-1 pr-4 py-1.5 bg-white hover:bg-slate-50 rounded-full border ${showProfileMenu ? 'border-indigo-300 ring-4 ring-indigo-50' : 'border-slate-200'} transition-all shadow-sm group`}
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden shadow-inner">
                    <UserCircle size={24} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <div className="hidden sm:block text-left">
                     <p className="text-xs font-black text-slate-900 leading-none">Profile</p>
                  </div>
                  <ChevronDown size={14} className="text-slate-400 transition-transform group-hover:translate-y-0.5" />
                </button>

                {showProfileMenu && (
                    <div className="absolute right-0 top-full mt-4 w-64 bg-white border border-slate-200 rounded-[2rem] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <p className="text-slate-900 font-black text-sm truncate uppercase tracking-tight">
                                {role === UserRole.EMPLOYEE ? 'Employee Operator' : 'Executive Operator'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{role.replace('_', ' ')} Mode</p>
                        </div>
                        <div className="p-3">
                            {role !== UserRole.EMPLOYEE && (
                              <>
                                <button 
                                  onClick={() => { setView(ViewState.SETTINGS); setShowProfileMenu(false); }} 
                                  className="w-full text-left px-4 py-3 rounded-2xl text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 flex items-center gap-4 transition-all font-black uppercase tracking-widest"
                                >
                                    <Settings size={18} /> Settings
                                </button>
                                <div className="h-px bg-slate-100 my-2 mx-2"></div>
                              </>
                            )}
                            <button 
                              onClick={onLogout} 
                              className="w-full text-left px-4 py-3 rounded-2xl text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-4 transition-all font-black uppercase tracking-widest"
                            >
                                <LogOut size={18} /> Logout
                            </button>
                        </div>
                    </div>
                )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-10 scroll-smooth">
          <div className="max-w-[1600px] mx-auto page-transition">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
