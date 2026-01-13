
import React, { useState, useEffect } from 'react';
import { Mail, ArrowRight, AlertCircle, ShieldCheck, Loader2, KeyRound, Box, Store, Bot, BarChart3, ArrowLeft, WifiOff, X, CheckCircle2, Square, CheckSquare, RefreshCw, Undo2, Key } from 'lucide-react';
import { Logo } from './Logo';
import { dataService } from '../services/dataService';

interface LoginProps {
  onLoginSuccess: (email: string, pass: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  onBack: () => void;
  businessName?: string;
}

type LoginMode = 'LOGIN' | 'FORGOT_KEY' | 'RESET_SENT';

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onBack, businessName }) => {
  const [mode, setMode] = useState<LoginMode>('LOGIN');
  const [email, setEmail] = useState(() => localStorage.getItem('automate_remember_email') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('automate_remember_email'));
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<{ message: string; type: 'auth' | 'network' | 'system' } | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Clear errors when user types or changes mode
  useEffect(() => {
    if (errorState) setErrorState(null);
  }, [email, password, mode]);

  const triggerShake = () => {
    setIsShaking(false);
    setTimeout(() => setIsShaking(true), 10);
    setTimeout(() => setIsShaking(false), 410);
  };

  const validateInputs = (): boolean => {
    if (!email.includes('@') || !email.includes('.')) {
      setErrorState({ message: "Invalid email format.", type: 'auth' });
      triggerShake();
      return false;
    }
    if (mode === 'LOGIN' && password.length < 4) {
      setErrorState({ message: "Secure Key must be at least 4 characters.", type: 'auth' });
      triggerShake();
      return false;
    }
    return true;
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!validateInputs()) return;

    setIsLoading(true);
    const result = await dataService.requestAccessKeyReset(email);
    setIsLoading(false);

    if (result.success) {
      setMode('RESET_SENT');
    } else {
      triggerShake();
      setErrorState({ 
        message: result.error || "Recovery protocol failed.", 
        type: result.code === 'NETWORK_ERROR' ? 'network' : 'auth' 
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    if (!validateInputs()) return;
    
    setIsLoading(true);
    setErrorState(null);
    
    try {
      const minDelay = new Promise(resolve => setTimeout(resolve, 600));
      const [result] = await Promise.all([onLoginSuccess(email, password), minDelay]);
      
      if (!result.success) {
        setIsLoading(false);
        triggerShake();
        
        const code = result.code || 'UNKNOWN';
        
        if (code === 'AUTH_FAILED') {
           setErrorState({ message: "Invalid Operator ID or Secure Key.", type: 'auth' });
           setPassword('');
        } else if (code === 'NETWORK_ERROR' || code === 'OFFLINE') {
           setErrorState({ message: "Connection Failed. Check your network.", type: 'network' });
        } else if (code === 'SERVER_ERROR') {
           setErrorState({ message: "System Maintenance. Try again later.", type: 'system' });
        } else {
           setErrorState({ message: result.error || "Access Denied.", type: 'auth' });
           setPassword('');
        }
      } else {
        if (rememberMe) {
          localStorage.setItem('automate_remember_email', email);
        } else {
          localStorage.removeItem('automate_remember_email');
        }
      }
    } catch (err) {
      console.error(err);
      setErrorState({ message: "Critical Terminal Failure.", type: 'system' });
      setIsLoading(false);
      triggerShake();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans">
       {/* Left Panel */}
       <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 relative items-center justify-center p-16 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-indigo-600 to-indigo-700"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-[0.1]"></div>
          
          <div className="relative z-10 max-w-lg space-y-12 animate-in fade-in slide-in-from-left-8 duration-700 text-white">
             <div className="space-y-6">
                <div className="flex items-center gap-3 bg-white/10 border border-white/20 w-fit px-4 py-2 rounded-full backdrop-blur-md shadow-lg">
                   <ShieldCheck size={16} className="text-emerald-300" />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-50">Secure Terminal Node</span>
                </div>
                <h1 className="text-6xl font-black leading-tight tracking-tight drop-shadow-sm">AutoMate™ <br/>Business <span className="text-indigo-200 underline decoration-indigo-400/50 decoration-4 underline-offset-4">Intelligence</span></h1>
                <p className="text-indigo-100 text-lg font-medium leading-relaxed opacity-90 max-w-md">The unified operating system for modern retail. Scalable architecture powered by predictive neural logic.</p>
             </div>
             
             <div className="grid grid-cols-2 gap-6">
                {[
                  { icon: Box, label: "Asset Flow", desc: "Real-time Inventory" },
                  { icon: Store, label: "Omni-Store", desc: "Multi-Location Sync" },
                  { icon: Bot, label: "AI Oracle", desc: "Predictive Analytics" },
                  { icon: BarChart3, label: "Live Ledger", desc: "Financial Audits" }
                ].map((item, i) => (
                   <div key={i} className="flex gap-4 items-start group cursor-default p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
                      <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-indigo-600 transition-all shadow-sm shrink-0">
                         <item.icon size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm tracking-wide text-white">{item.label}</h3>
                        <p className="text-[10px] text-indigo-200 font-medium uppercase tracking-wider mt-0.5">{item.desc}</p>
                      </div>
                   </div>
                ))}
             </div>
          </div>
       </div>

       {/* Right Panel */}
       <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative bg-slate-50">
          <div className={`w-full max-w-[440px] relative z-10 transition-transform duration-100 ${isShaking ? 'translate-x-[-10px]' : ''} ${isShaking ? 'animate-shake' : ''}`}>
            
            <style>{`
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-8px); }
                75% { transform: translateX(8px); }
              }
              .animate-shake { animation: shake 0.4s ease-in-out; }
            `}</style>

            <div className="bg-white border border-slate-200/60 p-8 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] relative overflow-hidden">
              
              <button 
                onClick={mode === 'LOGIN' ? onBack : () => setMode('LOGIN')}
                className="absolute top-8 left-8 p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95"
                title={mode === 'LOGIN' ? "Back to Setup" : "Back to Login"}
                disabled={isLoading}
              >
                {mode === 'LOGIN' ? <ArrowLeft size={22} strokeWidth={2.5} /> : <Undo2 size={22} strokeWidth={2.5} />}
              </button>

              <div className="text-center mb-10 flex flex-col items-center pt-4">
                <div className="mb-6 p-4 bg-indigo-50 rounded-[1.5rem] text-indigo-600 shadow-sm">
                   <Logo className="h-12 w-12" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center mb-2">
                  {mode === 'LOGIN' ? 'System Login' : mode === 'RESET_SENT' ? 'Link Dispatched' : 'Key Recovery'}
                </h1>
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                   <div className={`w-1.5 h-1.5 rounded-full ${mode === 'RESET_SENT' ? 'bg-indigo-500' : 'bg-emerald-500'} animate-pulse`}></div>
                   <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                     Node: <span className="text-indigo-600">{businessName || 'Localhost'}</span>
                   </p>
                </div>
              </div>

              {errorState && (
                <div className={`mb-6 px-5 py-4 rounded-2xl flex items-start gap-3 text-xs font-bold animate-in slide-in-from-top-2 duration-300 border ${
                  errorState.type === 'network' ? 'bg-amber-50 border-amber-100 text-amber-700' : 
                  errorState.type === 'system' ? 'bg-slate-100 border-slate-200 text-slate-700' :
                  'bg-rose-50 border-rose-100 text-rose-600'
                }`}>
                  <div className="mt-0.5 shrink-0">
                    {errorState.type === 'network' ? <WifiOff size={16} /> : 
                     errorState.type === 'system' ? <AlertCircle size={16} /> : 
                     <ShieldCheck size={16} />}
                  </div>
                  <div className="flex-1 leading-relaxed">
                    {errorState.message}
                  </div>
                </div>
              )}

              {mode === 'RESET_SENT' ? (
                <div className="space-y-8 py-4 animate-in zoom-in-95">
                  <div className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-2xl text-center space-y-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-indigo-600 shadow-sm border border-indigo-50">
                       <CheckCircle2 size={24} />
                    </div>
                    <p className="text-sm font-medium text-slate-600 leading-relaxed">
                      Instructions to restore access for <span className="font-bold text-indigo-600">{email}</span> have been initialized. Please check your secure inbox.
                    </p>
                  </div>
                  <button 
                    onClick={() => setMode('LOGIN')}
                    className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    Return to Terminal
                  </button>
                </div>
              ) : (
                <form onSubmit={mode === 'LOGIN' ? handleSubmit : handleResetRequest} className="space-y-6">
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-3 group-focus-within:text-indigo-600 transition-colors">Operator ID</label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none" size={20} />
                      <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className={`w-full bg-slate-50 border ${errorState?.type === 'auth' ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-indigo-50 focus:border-indigo-300'} text-slate-900 text-sm font-bold rounded-2xl pl-14 pr-10 py-5 outline-none focus:ring-4 transition-all placeholder:text-slate-300 disabled:opacity-50 disabled:bg-slate-100`} 
                        placeholder="operator@automate.ph" 
                        required 
                        disabled={isLoading}
                        autoFocus
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {mode === 'LOGIN' && (
                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-3 group-focus-within:text-indigo-600 transition-colors">Secure Key</label>
                      <div className="relative">
                        <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none" size={20} />
                        <input 
                          type={showPassword ? "text" : "password"} 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          className={`w-full bg-slate-50 border ${errorState?.type === 'auth' ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-indigo-50 focus:border-indigo-300'} text-slate-900 text-sm font-bold rounded-2xl pl-14 pr-14 py-5 outline-none focus:ring-4 transition-all font-mono placeholder:text-slate-300 disabled:opacity-50 disabled:bg-slate-100 tracking-widest`} 
                          placeholder={showPassword ? "KEY-CODE" : "••••••••"} 
                          required 
                          disabled={isLoading}
                          autoComplete="current-password"
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-xl hover:bg-indigo-50/50"
                          tabIndex={-1}
                        >
                          {showPassword ? <Bot size={18} /> : <ShieldCheck size={18} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center px-1">
                     {mode === 'LOGIN' ? (
                       <>
                        <button 
                          type="button"
                          onClick={() => setRememberMe(!rememberMe)}
                          className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-slate-700 transition-colors group"
                        >
                          {rememberMe ? <CheckSquare size={14} className="text-indigo-600"/> : <Square size={14} className="text-slate-300 group-hover:text-slate-400"/>}
                          Remember ID
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setMode('FORGOT_KEY')} 
                          className="text-[10px] text-indigo-500 font-bold hover:text-indigo-700 hover:underline transition-all"
                        >
                          Lost Access Key?
                        </button>
                       </>
                     ) : (
                       <p className="text-[10px] text-slate-400 font-medium">Verify your ID to initiate recovery sequence.</p>
                     )}
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit" 
                      disabled={isLoading || !email || (mode === 'LOGIN' && !password)} 
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-indigo-200 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:active:scale-100 disabled:shadow-none h-[64px]"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-3 animate-in fade-in">
                          <Loader2 className="animate-spin" size={20} /> 
                          <span className="uppercase tracking-widest text-xs">Processing...</span>
                        </div>
                      ) : (
                        <>
                          <span className="uppercase tracking-widest text-xs">{mode === 'LOGIN' ? 'Unlock Terminal' : 'Initialize Recovery'}</span> 
                          {mode === 'LOGIN' ? <ArrowRight size={18} /> : <Key size={18} />}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-10 pt-6 border-t border-slate-100 text-center flex flex-col gap-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                  <ShieldCheck size={10} /> Precision Core v3.4.1
                </p>
              </div>
            </div>
          </div>
       </div>
    </div>
  );
};
