
import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, AlertCircle, User, KeyRound, Box, Store, Bot, BarChart3 } from 'lucide-react';
import { Logo } from './Logo';

interface LoginProps {
  onLogin: () => void;
  businessName?: string;
}

export const Login: React.FC<LoginProps> = ({ onLogin, businessName }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    setTimeout(() => {
      if (!email || !password) {
         setIsLoading(false);
         setError("Please enter valid credentials.");
         return;
      }
      setIsLoading(false);
      onLogin();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex overflow-hidden font-sans">
       
       {/* Left Panel - Marketing (Hidden on mobile) */}
       <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative items-center justify-center p-12 overflow-hidden border-r border-[#27272a]">
          {/* Background effects */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-950"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 max-w-xl space-y-10 animate-in fade-in slide-in-from-left-8 duration-700">
             <div>
                <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
                  Modern System Designed for <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Retail Success</span>
                </h1>
                <div className="h-1.5 w-24 bg-blue-500 rounded-full mb-8"></div>
                
                <p className="text-slate-400 text-lg leading-relaxed mb-4">
                   AutoMateSystem is a comprehensive inventory management and point-of-sale solution built specifically for retail businesses in the Philippines.
                </p>
                <p className="text-slate-400 text-lg leading-relaxed">
                   The system combines real-time operations with intelligent automation, providing businesses with the tools they need to streamline operations, reduce manual work, and make data-driven decisions.
                </p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                <div className="flex gap-4 items-start">
                   <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                      <Box size={24} />
                   </div>
                   <div>
                      <h3 className="text-white font-bold text-sm mb-1">Real-Time Inventory</h3>
                      <p className="text-slate-500 text-xs leading-relaxed">Live stock synchronization across all locations</p>
                   </div>
                </div>

                <div className="flex gap-4 items-start">
                   <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                      <Store size={24} />
                   </div>
                   <div>
                      <h3 className="text-white font-bold text-sm mb-1">Multi-Store Management</h3>
                      <p className="text-slate-500 text-xs leading-relaxed">Centralized control with location-specific inventory</p>
                   </div>
                </div>

                <div className="flex gap-4 items-start">
                   <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                      <Bot size={24} />
                   </div>
                   <div>
                      <h3 className="text-white font-bold text-sm mb-1">AI-Driven Insights</h3>
                      <p className="text-slate-500 text-xs leading-relaxed">Smart product categorization and reorder suggestions</p>
                   </div>
                </div>

                <div className="flex gap-4 items-start">
                   <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <BarChart3 size={24} />
                   </div>
                   <div>
                      <h3 className="text-white font-bold text-sm mb-1">Robust Reporting</h3>
                      <p className="text-slate-500 text-xs leading-relaxed">Comprehensive analytics with PDF/CSV export</p>
                   </div>
                </div>
             </div>
          </div>
       </div>

       {/* Right Panel - Login Form */}
       <div className="w-full lg:w-1/2 flex items-center justify-center p-4 relative bg-[#09090b]">
          {/* Mobile Background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/50 via-[#09090b] to-[#09090b] lg:hidden"></div>

          <div className="w-full max-w-md relative z-10">
            <div className="bg-[#18181b] border border-[#27272a] p-8 rounded-3xl shadow-2xl">
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto mb-6 bg-[#27272a] rounded-full flex items-center justify-center border border-[#3f3f46] shadow-inner">
                  <Logo className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Employee Login</h1>
                <p className="text-zinc-500 text-sm">
                  Enter your credentials to access <br/>
                  <span className="text-amber-500 font-semibold">{businessName || 'AutoMate System'}</span>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Email / ID</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
                    </div>
                    <input 
                      type="text" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#09090b] border border-[#27272a] text-white text-sm rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 block w-full pl-12 p-4 outline-none transition-all placeholder-zinc-600"
                      placeholder="Enter your ID"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <KeyRound className="h-5 w-5 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
                    </div>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#09090b] border border-[#27272a] text-white text-sm rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 block w-full pl-12 p-4 outline-none transition-all placeholder-zinc-600 font-mono tracking-widest"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl shadow-lg shadow-amber-900/20 transition-all flex items-center justify-center gap-2 mt-4 hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      Start Shift <ArrowRight size={18} strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </form>
            </div>
            
            <div className="text-center mt-6">
               <p className="text-zinc-600 text-xs mb-2">Need help? Contact Administrator</p>
               <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest">Powered by Z3VITPH</p>
            </div>
         </div>
       </div>
    </div>
  );
};
