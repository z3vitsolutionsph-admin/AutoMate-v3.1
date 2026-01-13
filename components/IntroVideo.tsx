import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { SkipForward, Zap, ShieldCheck, RefreshCw, Loader2, Cpu, Database, Network } from 'lucide-react';
import { Logo } from './Logo';

const STAGES = [
  { label: 'Initializing Neural Core', range: [0, 20], msg: 'Allocating system memory...' },
  { label: 'Synchronizing Local Node', range: [20, 45], msg: 'Verifying data integrity...' },
  { label: 'Self-Healing Metadata', range: [45, 70], msg: 'Optimizing database indices...' },
  { label: 'Establishing Cloud Bridge', range: [70, 90], msg: 'Checking Supabase handshake...' },
  { label: 'Finalizing Interface', range: [90, 100], msg: 'Waking up shop assistant...' }
];

export const IntroVideo: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>(["[0.00ms] Bootloader v3.7.1 initialized."]);
  const [done, setDone] = useState(false);
  const [showRescue, setShowRescue] = useState(false);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 6));
  }, []);

  const current = useMemo(() => 
    STAGES.find(s => progress >= s.range[0] && progress < s.range[1]) || STAGES[STAGES.length - 1], 
  [progress]);

  useEffect(() => {
    const timer = setTimeout(() => setShowRescue(true), 8000); // Show rescue if takes too long
    
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { 
          clearInterval(interval); 
          clearTimeout(timer);
          setDone(true); 
          setTimeout(onComplete, 1200); 
          return 100; 
        }
        
        // Random log injection for "Resilience" feel
        if (Math.random() < 0.08) {
          const systemLogs = [
            "Integrity check passed.",
            "Memory buffer optimized.",
            "Local cache validated.",
            "Encrypted channel secured."
          ];
          addLog(systemLogs[Math.floor(Math.random() * systemLogs.length)]);
        }
        
        return p + 0.3 + (Math.random() * 0.8);
      });
    }, 40);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [onComplete, addLog]);

  const handleSelfHeal = () => {
    localStorage.removeItem('automate_v3_setup');
    sessionStorage.clear();
    window.location.reload();
  };

  return (
    <div className={`fixed inset-0 z-[5000] bg-slate-50 flex flex-col items-center justify-center p-6 md:p-12 transition-all duration-1000 ${done ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100'}`}>
       <div className="absolute inset-0 bg-grid-pattern opacity-[0.4] pointer-events-none" />
       
       <div className="w-full max-w-4xl relative z-10 flex flex-col items-center gap-12">
          {/* Logo Brand Section */}
          <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-700">
             <div className="p-10 bg-white rounded-[3rem] shadow-2xl border border-white relative group">
                <Logo className="h-20 w-20" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white animate-pulse" />
             </div>
             <div className="text-center space-y-1">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
                  AutoMate<span className="text-indigo-600">System</span>
                </h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] ml-1">Universal Business Node</p>
             </div>
          </div>

          {/* Main Progress Hub */}
          <div className="w-full bg-white border border-slate-200 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
             <div className="space-y-8 relative z-10">
                <div className="space-y-2">
                   <div className="flex items-center gap-2 text-indigo-600 mb-1">
                      <Zap size={14} fill="currentColor" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Active Sequence</span>
                   </div>
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight">{current.label}</h2>
                   <p className="text-slate-400 font-medium">{current.msg}</p>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-end">
                      <span className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums">
                        {Math.round(progress)}<span className="text-xl text-indigo-600 ml-1">%</span>
                      </span>
                      <div className="flex gap-1.5 mb-2">
                         {[...Array(5)].map((_, i) => (
                           <div key={i} className={`h-1.5 w-1.5 rounded-full ${progress > (i * 20) ? 'bg-indigo-600' : 'bg-slate-100'}`} />
                         ))}
                      </div>
                   </div>
                   <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                      <div className="h-full bg-indigo-600 transition-all duration-300 shadow-[0_0_15px_rgba(79,70,229,0.4)]" style={{ width: `${progress}%` }} />
                   </div>
                </div>
             </div>

             {/* System Console */}
             <div className="bg-slate-900 rounded-[2rem] p-6 font-mono text-[9px] text-indigo-300/70 border border-slate-800 shadow-inner h-48 flex flex-col justify-end overflow-hidden group">
                <div className="flex items-center gap-2 mb-4 text-slate-500 border-b border-white/5 pb-2">
                   <Cpu size={12} />
                   <span className="uppercase tracking-[0.2em] font-black">Kernel Runtime Log</span>
                </div>
                <div className="space-y-1.5">
                   {logs.map((l, i) => (
                     <div key={i} className={`flex items-start gap-3 ${i === 0 ? 'text-indigo-200 font-bold' : 'opacity-40'}`}>
                        <span className="shrink-0 text-[7px] mt-0.5 opacity-30">HEX_B{i}</span>
                        <span className="flex-1">{l}</span>
                     </div>
                   ))}
                </div>
             </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col md:flex-row items-center gap-6 w-full max-w-2xl">
             <button 
                onClick={onComplete} 
                className="group flex-1 w-full bg-indigo-600 text-white px-8 py-5 rounded-[2rem] font-black transition-all shadow-2xl hover:bg-indigo-700 active:scale-95 flex items-center justify-center gap-4 border-b-4 border-indigo-800"
             >
                <div className="text-center">
                   <span className="text-xs uppercase tracking-[0.2em]">Open Terminal</span>
                </div>
                <SkipForward size={18} className="group-hover:translate-x-1 transition-transform" />
             </button>

             {showRescue && (
                <button 
                   onClick={handleSelfHeal}
                   className="flex-1 w-full bg-white border border-rose-100 text-rose-500 px-8 py-5 rounded-[2rem] font-black hover:bg-rose-50 transition-all flex items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-2"
                >
                   <RefreshCw size={18} className="animate-spin-slow" />
                   <div className="text-left leading-none">
                      <span className="text-[7px] uppercase tracking-widest block opacity-60 mb-1">Stuck?</span>
                      <span className="text-xs uppercase tracking-widest">Self-Heal Node</span>
                   </div>
                </button>
             )}
          </div>
       </div>

       {/* Security Indicators */}
       <div className="absolute bottom-10 flex items-center gap-8 opacity-20 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2 text-slate-400">
             <ShieldCheck size={14} />
             <span className="text-[8px] font-black uppercase tracking-[0.4em]">Resilience Active</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
             <Network size={14} />
             <span className="text-[8px] font-black uppercase tracking-[0.4em]">Global Node Sync</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
             <Database size={14} />
             <span className="text-[8px] font-black uppercase tracking-[0.4em]">Neural Encryption</span>
          </div>
       </div>
    </div>
  );
};