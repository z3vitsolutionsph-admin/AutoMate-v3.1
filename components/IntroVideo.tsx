
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { SkipForward, Zap } from 'lucide-react';
import { Logo } from './Logo';

const STAGES = [
  { label: 'Opening the shop...', range: [0, 25], msg: 'Loading your store tools' },
  { label: 'Checking stock...', range: [25, 50], msg: 'Updating your item records' },
  { label: 'Saving online...', range: [50, 75], msg: 'Connecting to our secure vault' },
  { label: 'Almost ready!', range: [75, 100], msg: 'Welcoming your shop assistant' }
];

export const IntroVideo: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>(["Assistant is waking up..."]);
  const [done, setDone] = useState(false);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 5));
  }, []);

  const current = useMemo(() => STAGES.find(s => progress >= s.range[0] && progress < s.range[1]) || STAGES[STAGES.length - 1], [progress]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); setDone(true); setTimeout(onComplete, 800); return 100; }
        if (Math.random() < 0.1) addLog("Verified store connection.");
        return p + 0.5 + Math.random();
      });
    }, 50);
    return () => clearInterval(interval);
  }, [onComplete, addLog]);

  return (
    <div className={`fixed inset-0 z-[5000] bg-white flex flex-col items-center justify-center p-8 transition-all duration-1000 ${done ? 'opacity-0 scale-105' : 'opacity-100'}`}>
       <div className="absolute inset-0 bg-grid-pattern opacity-[0.05] pointer-events-none" />
       <div className="relative mb-12 bg-white/60 backdrop-blur-xl p-10 rounded-[3rem] border border-white shadow-2xl transition-all hover:scale-105"><Logo className="h-24 w-24" /></div>
       <div className="max-w-xl w-full text-center space-y-10">
          <div className="space-y-4">
             <h1 className="text-5xl font-black text-slate-900 tracking-tighter">AutoMate<span className="text-indigo-600">System</span></h1>
             <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Your Business Buddy is starting</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
             <div className="bg-white border border-slate-200 rounded-3xl p-6 text-left space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-600"><Zap size={16} fill="currentColor"/><span className="text-[10px] font-black uppercase">Current Task</span></div>
                <h3 className="text-xl font-black text-slate-800">{current.label}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{current.msg}</p>
             </div>
             <div className="bg-slate-900 rounded-3xl p-6 text-left font-mono text-[9px] text-slate-400 space-y-1 border border-slate-800 flex flex-col justify-end h-32">
                {logs.map((l, i) => <div key={i} className={i === 0 ? 'text-indigo-300' : ''}>{`> ${l}`}</div>)}
             </div>
          </div>
          <div className="space-y-6">
             <div className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">{Math.round(progress)}<span className="text-xl text-indigo-600 ml-1">%</span></div>
             <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner"><div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} /></div>
          </div>
       </div>
       <button onClick={onComplete} className="mt-12 group flex items-center gap-6 bg-slate-900 text-white px-8 py-5 rounded-2xl font-black hover:bg-indigo-600 transition-all shadow-2xl active:scale-95">
          <div className="text-left"><span className="text-[7px] uppercase tracking-[0.4em] opacity-40 block">Skip intro</span><span className="text-xs uppercase tracking-widest">Enter Store</span></div>
          <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center group-hover:translate-x-1 transition-all"><SkipForward size={18}/></div>
       </button>
    </div>
  );
};
