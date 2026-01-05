
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Package, ShoppingCart, Users, LifeBuoy, LogOut, Settings, BarChart3, ArrowRightLeft, ShieldCheck, Clock } from 'lucide-react';
import { ViewState, UserRole, PlanType } from '../types';
import { Logo } from './Logo';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onLogout: () => void;
  role: UserRole;
  subscriptionPlan: PlanType;
}

const ROLE_PERMISSIONS: Record<UserRole, ViewState[]> = {
  [UserRole.SUPERUSER]: [ViewState.DASHBOARD, ViewState.INVENTORY, ViewState.POS, ViewState.REPORTING, ViewState.PROMOTER, ViewState.SUPPORT, ViewState.SETTINGS],
  [UserRole.ADMIN_PRO]: [ViewState.DASHBOARD, ViewState.INVENTORY, ViewState.POS, ViewState.REPORTING, ViewState.PROMOTER, ViewState.SUPPORT, ViewState.SETTINGS],
  [UserRole.ADMIN]: [ViewState.DASHBOARD, ViewState.INVENTORY, ViewState.POS, ViewState.REPORTING, ViewState.SUPPORT, ViewState.SETTINGS],
  [UserRole.PROMOTER]: [ViewState.PROMOTER, ViewState.SUPPORT],
  [UserRole.EMPLOYEE]: [ViewState.POS, ViewState.INVENTORY]
};

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isMobileOpen, setIsMobileOpen, onLogout, role, subscriptionPlan }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const allNavItems = [
    { id: ViewState.DASHBOARD, label: 'Overview', icon: LayoutDashboard },
    { id: ViewState.INVENTORY, label: 'Inventory', icon: Package },
    { id: ViewState.POS, label: 'Terminal', icon: ShoppingCart },
    { id: ViewState.REPORTING, label: 'Analytics', icon: BarChart3 },
    { id: ViewState.PROMOTER, label: 'Affiliates', icon: Users },
    { id: ViewState.SUPPORT, label: 'Intelligence', icon: LifeBuoy },
    { id: ViewState.SETTINGS, label: 'Settings', icon: Settings },
  ];

  const navItems = allNavItems.filter(item => {
    // Feature Gating: Remove Promoter/Affiliates for Starter Plan
    if (item.id === ViewState.PROMOTER && subscriptionPlan === 'STARTER') {
      return false;
    }
    
    // Role Permission Check
    return (ROLE_PERMISSIONS[role] || []).includes(item.id);
  });

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="p-8 pb-10">
          <Logo className="h-10" showText />
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setView(item.id); setIsMobileOpen(false); }}
                className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'}`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span className="font-semibold text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-6 mt-auto border-t border-slate-100 bg-slate-50/50 space-y-4">
          <div className="px-4 py-3 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-indigo-500" />
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">System Time</span>
            </div>
            <div className="text-xl font-black text-slate-900 leading-none tracking-tight">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[10px] font-bold text-slate-500 mt-1">
              {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
          
          <div className="px-4 py-3 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Legal Notice</span>
            </div>
            <p className="text-[8px] text-slate-400 leading-tight font-medium">
              © 2024 AutoMate Systems Global Inc. AutoMate™ and Neural Ledger™ are registered trademarks. All Rights Reserved.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
