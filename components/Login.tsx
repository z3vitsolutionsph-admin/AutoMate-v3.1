import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck, Loader2, KeyRound, Box, Store, Bot, BarChart3 } from 'lucide-react';
import { Logo } from './Logo';

interface LoginProps {
  onLoginSuccess: (email: string, pass: string) => boolean;
  businessName?: string;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, businessName }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setTimeout(() => {
      const success = onLoginSuccess(email, password);
      if (!success) {
        setError("Invalid credentials. Please verify your access protocol.");
        setIsLoading(false);
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans">
       <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 relative items-center justify-center p-16 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-indigo-600 to-indigo-700"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-[0.1]"></div>
          
          <div className="relative z-10 max-w-lg space-y-12 animate-in fade-in slide-in-from-left-8 duration-700 text-white">
             <div className="space-y-6">
                <div className="flex items-center gap-3 bg-white/10 border border-white/20 w-fit px-4 py-2 rounded-full backdrop-blur-md">
                   <ShieldCheck size={16} className="text-indigo-200" />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified Terminal Node</span>
                </div>
                <h1 className="text-6xl font-black leading-tight tracking-tight">AutoMate™ <br/>Business <span className="text-indigo-200 underline decoration-indigo-400/50 decoration-4">Intelligence</span></h1>
                <p className="text-indigo-100 text-lg font-medium leading-relaxed opacity-90">Experience the world-class engine for modern retail. Scalable architecture powered by predictive AI.</p>
             </div>
             <div className="grid grid-cols-2 gap-8">
                {[
                  { icon: Box, label: "Asset Flow" },
                  { icon: Store, label: "Omni-Store" },
                  { icon: Bot, label: "AI Oracle" },
                  { icon: BarChart3, label: "Live Ledger" }
                ].map((item, i) => (
                   <div key={i} className="flex gap-4 items-center group cursor-default">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-indigo-600 transition-all">
                         <item.icon size={24} />
                      </div>
                      <h3 className="font-bold text-sm tracking-wide">{item.label}</h3>
                   </div>
                ))}
             </div>
          </div>
       </div>

       <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative bg-slate-50">
          <div className="w-full max-w-md relative z-10">
            <div className="bg-white border border-slate-200 p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
              <div className="text-center mb-12 flex flex-col items-center">
                <Logo className="h-16 mb-4" />
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
                  AutoMate<span className="text-xs font-bold self-start text-indigo-500">™</span>
                </h1>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-3">Node: <span className="text-indigo-600 font-black">{businessName}</span></p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-600 px-5 py-4 rounded-2xl flex items-center gap-3 text-xs font-bold animate-in shake duration-300">
                    <AlertCircle size={18} className="shrink-0" /> {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Operator ID</label>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                    <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-base rounded-2xl pl-14 p-5 outline-none focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-300" placeholder="admin@automate.ph" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Secure Key</label>
                  <div className="relative group">
                    <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                    <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-base rounded-2xl pl-14 p-5 outline-none focus:ring-4 focus:ring-indigo-50 transition-all font-mono" placeholder="••••••••" required />
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                  {isLoading ? <><Loader2 className="animate-spin" size={20} /> Validating...</> : <>Unlock Terminal <ArrowRight size={20} /></>}
                </button>
              </form>
            </div>
            <p className="text-center mt-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              Precision Core v3.2.0 © 2024 AutoMate Global
            </p>
          </div>
       </div>
    </div>
  );
};