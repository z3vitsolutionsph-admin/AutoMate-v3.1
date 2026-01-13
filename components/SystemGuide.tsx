
import React, { useState, useRef, useEffect } from 'react';
import { X, Play, ChevronRight, Check, Package, ShoppingCart, UserPlus, ShieldCheck, Loader2, RefreshCw, Box, Layers, Zap } from 'lucide-react';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  icon: React.ReactNode;
  color: string;
  accent: string;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'register',
    title: 'Organizational Node',
    description: 'Establish your central authority. Define market segments and provision multi-store synchronization protocols.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-his-computer-34503-large.mp4',
    icon: <UserPlus size={24} />,
    color: 'from-indigo-50 to-blue-50',
    accent: 'text-indigo-600 bg-indigo-100'
  },
  {
    id: 'inventory',
    title: 'Asset Intelligence',
    description: 'Track stock depth across distributed networks. Leverage AI to optimize reorder triggers and metadata health.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-man-working-in-a-warehouse-with-a-tablet-40432-large.mp4',
    icon: <Package size={24} />,
    color: 'from-emerald-50 to-teal-50',
    accent: 'text-emerald-600 bg-emerald-100'
  },
  {
    id: 'pos',
    title: 'Terminal Mastery',
    description: 'Execute high-velocity transactions. Real-time ledger updates ensure global stock integrity with every checkout.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-checking-the-inventory-of-a-store-with-a-tablet-40431-large.mp4',
    icon: <ShoppingCart size={24} />,
    color: 'from-rose-50 to-orange-50',
    accent: 'text-rose-600 bg-rose-100'
  }
];

export const SystemGuide: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem('automate_guide_step');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const step = GUIDE_STEPS[currentStep];
  const isLast = currentStep === GUIDE_STEPS.length - 1;

  useEffect(() => {
    localStorage.setItem('automate_guide_step', currentStep.toString());
    setIsBuffering(true);
    setIsVideoReady(false);
    setHasError(false);
  }, [currentStep]);

  const handleNext = () => {
    if (isLast) {
      localStorage.removeItem('automate_guide_step');
      onComplete();
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-slate-50/90 backdrop-blur-3xl flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-500">
      <div className="bg-white w-full max-w-7xl h-full max-h-[800px] rounded-[3.5rem] shadow-[0_48px_120px_-20px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col lg:flex-row border border-slate-200 animate-in zoom-in-95 duration-500">
        
        {/* Render Column (Video/Synthetic) */}
        <div className={`relative w-full lg:w-[60%] bg-gradient-to-br ${step.color} overflow-hidden group`}>
          {isBuffering && !hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-white/40 backdrop-blur-sm">
              <Loader2 size={48} className="animate-spin text-indigo-600 mb-4 opacity-40" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Optimizing Visual Cache...</p>
            </div>
          )}

          {hasError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-30 p-12 text-center space-y-6">
               <div className={`p-8 rounded-[2.5rem] ${step.accent} bg-opacity-20`}>
                 <Box size={64} className={step.accent.split(' ')[0]} />
               </div>
               <div className="space-y-2">
                 <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">System Visualization Active</h3>
                 <p className="text-sm font-medium text-slate-500 max-w-xs mx-auto">Neural metadata rendering is active. High-fidelity stream is currently bypassing to save bandwidth.</p>
               </div>
               <button onClick={() => setHasError(false)} className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Retry Stream</button>
            </div>
          ) : (
            <video
              ref={videoRef}
              key={step.videoUrl}
              autoPlay
              muted
              loop
              playsInline
              onCanPlay={() => { setIsBuffering(false); setIsVideoReady(true); }}
              onError={() => setHasError(true)}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 mix-blend-multiply opacity-0 ${isVideoReady ? 'opacity-70' : 'opacity-0'}`}
              src={step.videoUrl}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-white/20 pointer-events-none" />

          {/* Floating UI HUD */}
          <div className="absolute top-10 left-10 z-20">
            <div className="px-6 py-4 bg-white/90 backdrop-blur-xl border border-white rounded-3xl shadow-2xl flex items-center gap-5">
              <div className={`w-12 h-12 ${step.accent} rounded-2xl flex items-center justify-center shadow-inner`}>{step.icon}</div>
              <div className="pr-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Instruction v1.0</p>
                <h3 className="font-black text-lg text-slate-900 leading-none">{step.title}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Content Column */}
        <div className="flex-1 flex flex-col p-10 lg:p-16 bg-white relative border-l border-slate-100">
          <button 
            onClick={onComplete}
            className="absolute top-8 right-8 p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all active:scale-90"
          >
            <X size={24} />
          </button>

          <div className="flex-1 flex flex-col justify-center">
            <div className="flex gap-2.5 mb-14">
              {GUIDE_STEPS.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-700 ${i === currentStep ? 'w-16 bg-indigo-600 shadow-lg shadow-indigo-100' : 'w-2.5 bg-slate-100'}`} 
                />
              ))}
            </div>

            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-tight mb-8">
              {step.title}
            </h2>
            <p className="text-slate-500 text-lg lg:text-xl font-medium leading-relaxed max-w-md opacity-80">
              {step.description}
            </p>

            <div className="mt-12 space-y-6">
              <div className="flex items-center gap-3 py-3 px-5 bg-slate-50 rounded-2xl border border-slate-100 w-fit">
                 <ShieldCheck size={16} className="text-indigo-600" /> 
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precision Verified Module</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-16 pt-10 border-t border-slate-100">
            <button 
              onClick={() => setCurrentStep(s => Math.max(0, s-1))}
              disabled={currentStep === 0}
              className="text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-indigo-600 transition-all disabled:opacity-0"
            >
              Previous Module
            </button>

            <button 
              onClick={handleNext}
              className="bg-slate-900 hover:bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black shadow-2xl shadow-indigo-100 transition-all active:scale-95 flex items-center gap-3"
            >
              <span className="uppercase tracking-widest text-xs">{isLast ? 'Access Terminal' : 'Next Module'}</span>
              {isLast ? <Zap size={18} fill="currentColor" className="text-emerald-400" /> : <ChevronRight size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
