
import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ViewState, UserRole } from '../types';
import { Menu, Bell, UserCircle, Search, Command, LogOut, Settings, User, CreditCard } from 'lucide-react';

interface LayoutProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  children: React.ReactNode;
  role: UserRole;
  businessName?: string;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, setView, children, role, businessName, onLogout }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Dropdown States
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // Refs for click outside
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Mock Notifications
  const notifications = [
    { id: 1, title: 'Low Stock: Espresso Beans', time: '10 mins ago', type: 'alert', read: false },
    { id: 2, title: 'New Order #1042 Received', time: '1 hour ago', type: 'info', read: false },
    { id: 3, title: 'Daily Sales Report Ready', time: '5 hours ago', type: 'success', read: true },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090b] text-white">
      <Sidebar 
        currentView={currentView} 
        setView={setView}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onLogout={onLogout}
        role={role}
      />

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative">
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-4 md:px-8 py-4 sticky top-0 z-30 bg-[#09090b]/80 backdrop-blur-md border-b border-[#27272a]">
          <div className="flex items-center gap-4">
             <button 
              className="md:hidden p-2.5 text-zinc-400 hover:bg-[#27272a] rounded-xl transition-colors active:scale-95 border border-transparent hover:border-[#3f3f46]"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={22} strokeWidth={1.5} />
            </button>
            
            {/* Context Title - Mobile/Tablet */}
            <div className="md:hidden flex flex-col">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{businessName}</span>
              <span className="text-sm font-bold text-white">{currentView.replace('_', ' ')}</span>
            </div>

            {/* Desktop Search Bar */}
            <div className="hidden md:flex items-center gap-3 bg-[#18181b] border border-[#27272a] rounded-xl px-3 py-2.5 w-64 lg:w-96 hover:border-[#3f3f46] transition-colors group">
               <Search size={18} className="text-zinc-500 group-hover:text-amber-500 transition-colors" />
               <input 
                 type="text" 
                 placeholder="Global Search..." 
                 className="bg-transparent border-none outline-none text-sm text-white placeholder-zinc-600 w-full"
               />
               <div className="hidden lg:flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#27272a] border border-[#3f3f46]">
                 <Command size={10} className="text-zinc-500" />
                 <span className="text-[10px] font-bold text-zinc-500">K</span>
               </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
             {/* Store Info - Desktop */}
             <div className="hidden md:block text-right">
               <div className="text-sm font-bold text-white">{businessName || 'AutoMateSystem'}</div>
               <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider bg-[#27272a] px-2 py-0.5 rounded-full inline-block mt-1 border border-[#3f3f46]">
                 {role.replace('_', ' ')}
               </div>
             </div>

             <div className="h-8 w-px bg-[#27272a] hidden md:block"></div>
             
             {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
                className={`relative p-2.5 text-zinc-400 hover:text-white transition-all bg-[#18181b] hover:bg-[#27272a] rounded-xl border ${showNotifications ? 'border-amber-500/50 bg-[#27272a] text-white' : 'border-transparent hover:border-[#3f3f46]'} group`}
              >
                <Bell size={20} strokeWidth={1.5} />
                <span className="absolute top-2.5 right-3 w-2 h-2 bg-amber-500 rounded-full border-2 border-[#18181b] group-hover:animate-pulse"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-3 w-80 bg-[#18181b] border border-[#27272a] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-[#27272a] flex justify-between items-center bg-[#09090b]">
                        <h3 className="font-bold text-white text-sm">Notifications</h3>
                        <button className="text-[10px] font-bold text-amber-500 hover:text-amber-400 uppercase tracking-wide">Mark all read</button>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto">
                        {notifications.map(n => (
                            <div key={n.id} className={`p-4 border-b border-[#27272a]/50 hover:bg-[#27272a] transition-colors cursor-pointer group ${!n.read ? 'bg-[#27272a]/30' : ''}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-sm font-semibold ${!n.read ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-300'}`}>{n.title}</span>
                                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>}
                                </div>
                                <p className="text-xs text-zinc-500">{n.time}</p>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 bg-[#09090b] text-center border-t border-[#27272a]">
                        <button className="text-xs font-bold text-zinc-400 hover:text-white transition-colors w-full py-1">View All Activity</button>
                    </div>
                </div>
              )}
            </div>
            
            {/* User Profile */}
            <div className="relative" ref={profileRef}>
                <button 
                  onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
                  className={`flex items-center gap-3 pl-1 pr-3 py-1 bg-[#18181b] hover:bg-[#27272a] rounded-full border ${showProfileMenu ? 'border-amber-500/50' : 'border-[#27272a] hover:border-[#3f3f46]'} transition-all group`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-500 p-[1px]">
                      <div className="w-full h-full bg-[#09090b] rounded-full flex items-center justify-center">
                        <UserCircle size={20} className="text-amber-500 group-hover:text-white transition-colors" />
                      </div>
                  </div>
                  <span className="hidden sm:block text-xs font-bold text-zinc-300 group-hover:text-white">Admin</span>
                </button>

                {showProfileMenu && (
                    <div className="absolute right-0 top-full mt-3 w-64 bg-[#18181b] border border-[#27272a] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-5 border-b border-[#27272a] bg-[#09090b]">
                            <p className="text-white font-bold text-base truncate">{businessName || 'AutoMate Store'}</p>
                            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-1">{role.replace('_', ' ')}</p>
                        </div>
                        <div className="p-2 space-y-1">
                            <button onClick={() => { setView(ViewState.SETTINGS); setShowProfileMenu(false); }} className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-[#27272a] flex items-center gap-3 transition-colors font-medium">
                                <User size={16} className="text-zinc-500" /> My Profile
                            </button>
                            <button onClick={() => { setView(ViewState.SETTINGS); setShowProfileMenu(false); }} className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-[#27272a] flex items-center gap-3 transition-colors font-medium">
                                <Settings size={16} className="text-zinc-500" /> Settings
                            </button>
                            <button className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-[#27272a] flex items-center gap-3 transition-colors font-medium">
                                <CreditCard size={16} className="text-zinc-500" /> Billing
                            </button>
                        </div>
                        <div className="p-2 border-t border-[#27272a]">
                            <button 
                                onClick={onLogout}
                                className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-3 transition-colors font-bold"
                            >
                                <LogOut size={16} /> Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
