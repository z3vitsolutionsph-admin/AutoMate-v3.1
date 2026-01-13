
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowRight, AlertCircle, ShieldCheck, Loader2, Box, Store, Bot, BarChart3, 
  ArrowLeft, WifiOff, CheckCircle2, Square, CheckSquare, Shield, Activity, 
  RefreshCw, Info, Terminal
} from 'lucide-react';
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
  const [retryCount, setRetryCount] = useState(0);
  const [errorState, setErrorState] = useState<{ message: string; type: 'auth' | 'network' | 'system' | 'resilience'; code?: string } | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pulseState, setPulseState] = useState<'healthy' | 'latency' | 'offline'>('healthy');
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Connectivity Monitor (Neural Pulse)
  useEffect(() => {
    const checkConnection = () => {
      if (!navigator.onLine) setPulseState('offline');
      else {
        // Simple latency check simulation
        const start = performance.now();
        fetch('https://depnuqrnqgdvogfsysmn.supabase.co/rest/v1/', { method: 'HEAD', mode: 'no-cors' })
          .then(() => {
            const end = performance.now();
            setPulseState(end - start > 1500 ? 'latency' : 'healthy');
          })
          .catch(() => setPulseState('offline'));
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

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
      setErrorState({ message: "Invalid Operator ID format.", type: 'auth' });
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

  const handleSubmit = useCallback(async (e?: React.FormEvent, isRetry = false) => {
    if (e) e.preventDefault();
    if (isLoading) return;
    
    if (!validateInputs()) return;
    
    setIsLoading(true);
    setErrorState(null);
    
    try {
      // Logic Guard: Exponential backoff delay on retries
      if (isRetry) {
        const delay = Math.min(2000, 500 * Math.pow(1.5, retryCount));
        await new Promise(r => setTimeout(r, delay));
      }

      const result = await onLoginSuccess(email, password);
      
      if (!result.success) {
        setIsLoading(false);
        triggerShake();
        setRetryCount(prev => prev + 1);
        
        const code = result.code || 'UNKNOWN';
        
        if (code === 'AUTH_FAILED') {
           setErrorState({ message: "Invalid Operator ID or Secure Key.", type: 'auth', code });
        } else if (code === 'NETWORK_ERROR' || code === 'OFFLINE' || code === 'HANDSHAKE_TIMEOUT') {
           setErrorState({ 
             message: code === 'HANDSHAKE_TIMEOUT' ? "Registry handshake timed out. High latency detected." : "Connection Failed. Check your node's network uplink.", 
             type: 'network',
             code 
           });
        } else {
           setErrorState({ message: result.error || "Access Denied by Central Registry.", type: 'system', code });
        }
      } else {
        if (rememberMe) localStorage.setItem('automate_remember_email', email);
        else localStorage.removeItem('automate_remember_email');
      }
    } catch (err) {
      console.error("[Login] Critical Logic Exception:", err);
      setErrorState({ message: "Critical Terminal Failure. Protocol corrupted.", type: 'system' });
      setIsLoading(false);
      triggerShake();
    }
  }, [email, password, onLoginSuccess, isLoading, retryCount, rememberMe]);

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans">
       {/* Left Panel - Information & Brand */}
       <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 relative items-center justify-center p-16 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-indigo-600 to-indigo-700"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-[0.1]"></div>
          
          <div className="relative z-10 max-w-lg space-y-12 animate-in fade-in slide-in-from-left-8 duration-700 text-white">
             <div className="space-y-6">
                <div className="flex items-center gap-3 bg-white/10 border border-white/20 w-fit px-4 py-2 rounded-full backdrop-blur-md shadow-lg">
                   <ShieldCheck size={16} className="text-emerald-300" />
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-50">Secure Terminal Node</span>
                </div>
                <h1 className="text-6xl font-black leading-tight tracking-tight drop-shadow-sm italic">
                  AutoMate™ <br/>
                  <span className="text-indigo-200 underline decoration-indigo-400/50 decoration-4 underline-offset-4 not-italic">Intelligence</span>
                </h1>
                <p className="text-indigo-100 text-lg font-medium leading-relaxed opacity-90 max-w-md">
                  Unified operating system for distributed retail nodes. Scalable architecture with redundant cloud persistence.
                </p>
             </div>
             
             <div className="grid grid-cols-2 gap-6">
                {[
                  { icon: Box, label: "Asset Flow", desc: "Real-time Sync" },
                  { icon: Store, label: "Omni-Store", desc: "Multi-Node" },
                  { icon: Bot, label: "AI Oracle", desc: "Predictive" },
                  { icon: BarChart3, label: "Live Ledger", desc: "Continuous Audit" }
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

       {/* Right Panel - Login Card */}
       <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative bg-[#F9F9F9]">
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.2] pointer-events-none" />
          
          <div className={`w-full max-w-[440px] relative z-10 transition-transform duration-100 ${isShaking ? 'animate-shake' : ''}`}>
            
            <style>{`
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-8px); }
                75% { transform: translateX(8px); }
              }
              .animate-shake { animation: shake 0.4s ease-in-out; }
            `}</style>

            <div className="bg-white border border-slate-100 p-8 md:p-12 rounded-[3rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.06)] relative overflow-hidden flex flex-col items-center">
              
              <button 
                onClick={mode === 'LOGIN' ? onBack : () => setMode('LOGIN')}
                className="absolute top-10 left-10 p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all active:scale-95"
                title={mode === 'LOGIN' ? "Back" : "Back to Login"}
                disabled={isLoading}
              >
                <ArrowLeft size={22} />
              </button>

              <div className="text-center mb-10 flex flex-col items-center">
                <div className="mb-8 w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-indigo-600 shadow-2xl shadow-indigo-100 border border-slate-50 p-2 ring-8 ring-indigo-50/50">
                   <Logo className="h-full w-full" />
                </div>
                <h1 className="text-3xl font-black text-[#1E293B] tracking-tight mb-3">
                  {mode === 'LOGIN' ? 'System Login' : mode === 'RESET_SENT' ? 'Link Dispatched' : 'Key Recovery'}
                </h1>
                
                <div className="flex items-center gap-3 px-5 py-2 bg-[#F1F5F9] rounded-full border border-[#E2E8F0] shadow-sm">
                   <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${pulseState === 'healthy' ? 'bg-emerald-500' : pulseState === 'latency' ? 'bg-amber-500' : 'bg-rose-500'} animate-pulse`}></div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{pulseState === 'healthy' ? 'PULSE: OK' : pulseState === 'latency' ? 'PULSE: LAG' : 'PULSE: LOST'}</span>
                   </div>
                   <div className="w-px h-3 bg-slate-200"></div>
                   <p className="text-[#64748B] text-[9px] font-black uppercase tracking-[0.2em]">
                     NODE: <span className="text-[#3B82F6]">{businessName?.toUpperCase() || 'LOCAL'}</span>
                   </p>
                </div>
              </div>

              {errorState && (
                <div className={`w-full mb-8 px-6 py-5 rounded-[1.5rem] flex flex-col gap-3 text-xs font-bold animate-in slide-in-from-top-4 duration-500 border-2 shadow-sm ${
                  errorState.type === 'network' ? 'bg-amber-50 border-amber-200 text-amber-700' : 
                  errorState.type === 'system' ? 'bg-slate-100 border-slate-300 text-slate-700' :
                  'bg-rose-50 border-rose-200 text-rose-600'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 shrink-0 p-1.5 bg-white/50 rounded-lg">
                      {errorState.type === 'network' ? <WifiOff size={18} /> : 
                      errorState.type === 'system' ? <Terminal size={18} /> : 
                      <Shield size={18} />}
                    </div>
                    <div className="flex-1 leading-relaxed">
                      {errorState.message}
                      {errorState.type === 'network' && (
                        <div className="mt-3 flex gap-3">
                          <button 
                            type="button" 
                            onClick={(e) => handleSubmit(e, true)}
                            className="bg-amber-600 text-white px-4 py-1.5 rounded-lg uppercase text-[9px] tracking-widest shadow-md hover:bg-amber-700 transition-colors"
                          >
                            Resilience Retry
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setShowDiagnostics(!showDiagnostics)}
                            className="text-amber-800 underline uppercase text-[9px] tracking-widest"
                          >
                            Diagnostics
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {showDiagnostics && (
                    <div className="mt-2 p-3 bg-black/5 rounded-xl font-mono text-[9px] text-slate-500 opacity-80 border border-black/5 animate-in fade-in">
                       > ERROR_CODE: {errorState.code || 'UNKNOWN'}<br/>
                       > RETRY_COUNT: {retryCount}<br/>
                       > PULSE_STATE: {pulseState.toUpperCase()}<br/>
                       > NAV_ONLINE: {navigator.onLine ? 'TRUE' : 'FALSE'}
                    </div>
                  )}
                </div>
              )}

              {mode === 'RESET_SENT' ? (
                <div className="w-full space-y-8 py-4 animate-in zoom-in-95">
                  <div className="bg-indigo-50/50 border border-indigo-100 p-8 rounded-[2rem] text-center space-y-6">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto text-indigo-600 shadow-xl border border-indigo-50 animate-bounce">
                       <CheckCircle2 size={32} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-slate-800">Recovery Initialized</p>
                      <p className="text-xs font-medium text-slate-500 leading-relaxed">
                        Instructions dispatched to <span className="font-bold text-indigo-600">{email}</span>. Re-establish terminal link via secure email channel.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setMode('LOGIN')}
                    className="w-full bg-[#1E293B] hover:bg-black text-white font-black py-6 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-xs"
                  >
                    Return to Terminal
                  </button>
                </div>
              ) : (
                <form onSubmit={(e) => handleSubmit(e, retryCount > 0)} className="w-full space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-2">Operator ID</label>
                    <div className="relative group">
                      <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className={`w-full bg-[#F8FAFC] border-2 ${errorState?.type === 'auth' ? 'border-rose-300' : 'border-[#E2E8F0]'} text-[#334155] text-sm font-black rounded-2xl px-7 py-5 outline-none focus:border-[#3B82F6] focus:bg-white transition-all placeholder:text-[#CBD5E1] disabled:opacity-50 shadow-sm`} 
                        placeholder="operator@automate.ph" 
                        required 
                        disabled={isLoading}
                        autoFocus
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {mode === 'LOGIN' && (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-2">Secure Key</label>
                      <div className="relative group">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          className={`w-full bg-[#F8FAFC] border-2 ${errorState?.type === 'auth' ? 'border-rose-300' : 'border-[#E2E8F0]'} text-[#334155] text-sm font-black rounded-2xl px-7 pr-16 py-5 outline-none focus:border-[#3B82F6] focus:bg-white transition-all font-mono placeholder:text-[#CBD5E1] disabled:opacity-50 tracking-[0.4em] shadow-sm`} 
                          placeholder="••••••••" 
                          required 
                          disabled={isLoading}
                          autoComplete="current-password"
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-6 top-1/2 -translate-y-1/2 text-[#CBD5E1] hover:text-[#3B82F6] transition-colors p-1"
                          tabIndex={-1}
                        >
                          <Shield size={22} className={showPassword ? 'text-indigo-600' : ''}/>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center px-2">
                     {mode === 'LOGIN' ? (
                       <>
                        <button 
                          type="button"
                          onClick={() => setRememberMe(!rememberMe)}
                          className="flex items-center gap-3 text-[11px] font-black text-[#64748B] hover:text-indigo-600 transition-colors group"
                        >
                          <div className={`transition-all ${rememberMe ? 'text-indigo-600 scale-110' : 'text-slate-300 group-hover:text-indigo-300'}`}>
                            {rememberMe ? <CheckSquare size={18}/> : <Square size={18}/>}
                          </div>
                          <span>Remember ID</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setMode('FORGOT_KEY')} 
                          className="text-[11px] text-[#3B82F6] font-black hover:text-indigo-800 transition-all border-b border-transparent hover:border-indigo-200"
                        >
                          Lost Access Key?
                        </button>
                       </>
                     ) : (
                       <div className="flex items-center gap-2 text-slate-400">
                         <Info size={14}/>
                         <p className="text-[10px] font-bold uppercase tracking-widest">Verify Registry Identity</p>
                       </div>
                     )}
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit" 
                      disabled={isLoading || !email || (mode === 'LOGIN' && !password)} 
                      className={`w-full py-6 rounded-2xl transition-all flex items-center justify-center gap-4 active:scale-95 shadow-xl group uppercase tracking-[0.3em] text-xs font-black ${
                        isLoading ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white border-b-4 border-indigo-800 shadow-indigo-200'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin" size={18} /> 
                          <span>Synchronizing</span>
                        </>
                      ) : (
                        <>
                          <span>{mode === 'LOGIN' ? 'Unlock Terminal' : 'Start Recovery'}</span> 
                          <Activity size={18} className="group-hover:animate-pulse transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-14 text-center">
                <div className="flex items-center justify-center gap-4 text-slate-200 mb-4">
                   <div className="h-px w-8 bg-slate-100"></div>
                   <p className="text-[10px] font-black text-[#CBD5E1] uppercase tracking-[0.6em] flex items-center gap-3">
                      PRECISION CORE V3.4.1
                   </p>
                   <div className="h-px w-8 bg-slate-100"></div>
                </div>
                <div className="flex items-center justify-center gap-6 opacity-40">
                   <div className="flex items-center gap-1.5"><Shield size={10} /><span className="text-[8px] font-black uppercase">AES-256</span></div>
                   <div className="flex items-center gap-1.5"><RefreshCw size={10} /><span className="text-[8px] font-black uppercase">Auto-Reconcile</span></div>
                </div>
              </div>
            </div>
          </div>
       </div>
    </div>
  );
};
