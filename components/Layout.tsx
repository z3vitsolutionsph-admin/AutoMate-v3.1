
import React from 'react';
import { Sidebar } from './Sidebar';
import { ViewState, UserRole } from '../types';
import { Menu, Bell, UserCircle, Search, Command } from 'lucide-react';

interface LayoutProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  children: React.ReactNode;
  role: UserRole;
  businessName?: string;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, setView, children, role, businessName, onLogout }) => {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

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
             
            <button className="relative p-2.5 text-zinc-400 hover:text-white transition-all bg-[#18181b] hover:bg-[#27272a] rounded-xl border border-transparent hover:border-[#3f3f46] group">
              <Bell size={20} strokeWidth={1.5} />
              <span className="absolute top-2.5 right-3 w-2 h-2 bg-amber-500 rounded-full border-2 border-[#18181b] group-hover:animate-pulse"></span>
            </button>
            
            <button className="flex items-center gap-3 pl-1 pr-3 py-1 bg-[#18181b] hover:bg-[#27272a] rounded-full border border-[#27272a] hover:border-[#3f3f46] transition-all group">
               <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-500 p-[1px]">
                  <div className="w-full h-full bg-[#09090b] rounded-full flex items-center justify-center">
                     <UserCircle size={20} className="text-amber-500 group-hover:text-white transition-colors" />
                  </div>
               </div>
               <span className="hidden sm:block text-xs font-bold text-zinc-300 group-hover:text-white">Admin</span>
            </button>
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
