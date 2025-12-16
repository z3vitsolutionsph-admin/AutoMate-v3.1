
import React from 'react';
import { LayoutDashboard, Package, ShoppingCart, Users, LifeBuoy, LogOut, Settings } from 'lucide-react';
import { ViewState } from '../types';
import { Logo } from './Logo';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isMobileOpen, setIsMobileOpen, onLogout }) => {
  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: ViewState.INVENTORY, label: 'Inventory', icon: Package },
    { id: ViewState.POS, label: 'POS System', icon: ShoppingCart },
    { id: ViewState.PROMOTER, label: 'Promoters', icon: Users },
    { id: ViewState.SUPPORT, label: 'Support & AI', icon: LifeBuoy },
    { id: ViewState.SETTINGS, label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed top-0 left-0 z-50 h-full w-72 bg-[#09090b] border-r border-[#27272a] transition-transform duration-300 ease-in-out md:static md:translate-x-0
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} 
          flex flex-col
        `}
      >
        <div className="p-8 flex items-center gap-4">
          <div className="relative group shrink-0">
            <div className="absolute -inset-2 bg-amber-500/20 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <Logo className="w-10 h-10 relative z-10" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white tracking-tight">AutoMate</h1>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">POS System</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id);
                  setIsMobileOpen(false);
                }}
                className={`
                  group w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300
                  ${isActive 
                    ? 'bg-[#27272a] text-white border border-[#3f3f46]' 
                    : 'bg-transparent text-zinc-500 hover:text-zinc-200 hover:bg-[#18181b]'
                  }
                `}
              >
                <Icon 
                  size={20} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`transition-colors duration-300 ${isActive ? 'text-amber-500' : 'text-zinc-500 group-hover:text-zinc-300'}`} 
                />
                <span className="font-bold text-sm tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-6 mt-auto border-t border-[#27272a] bg-[#09090b]">
          <button 
            onClick={onLogout}
            className="group w-full flex items-center gap-3 px-4 py-3 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={20} strokeWidth={2} />
            <span className="text-sm font-bold">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
