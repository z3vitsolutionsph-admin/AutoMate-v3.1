
import React, { useState, useEffect, useRef } from 'react';
import { Check, ArrowRight, User, Loader2, Sparkles, Zap, BrainCircuit, Box, ChevronRight, AlertCircle, RefreshCcw } from 'lucide-react';
import { OnboardingState, PlanType, SubscriptionPlan, Product } from '../types';
import { getBusinessDNA, BusinessDNA } from '../services/geminiService';
import { Logo } from './Logo';
import { formatCurrency } from '../constants';

const PLANS: SubscriptionPlan[] = [
  { id: 'STARTER', name: 'Starter Shop', price: 0, employeeLimit: 1, features: ['5-Day Free Trial', 'Basic Sales', 'Save to Browser'], color: 'border-slate-200 hover:border-indigo-300' },
  { id: 'PROFESSIONAL', name: 'Professional', price: 4999, employeeLimit: 5, features: ['Assistant Help', '5 Staff Seats', 'Saved Online', 'Shop Health Check'], recommended: true, color: 'border-indigo-600 shadow-indigo-100 shadow-2xl bg-indigo-50/10' },
  { id: 'ENTERPRISE', name: 'Big Brand', price: 9999, employeeLimit: 'Unlimited', features: ['Custom Setup', 'Multiple Shops', 'Priority Help', 'Expert Advice'], color: 'border-slate-900 shadow-slate-200' }
];

export const Onboarding: React.FC<{ onComplete: (data: OnboardingState) => void; onSwitchToLogin: () => void }> = ({ onComplete, onSwitchToLogin }) => {
  const [step, setStep] = useState(0);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [isError, setIsError] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [dna, setDna] = useState<BusinessDNA | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('PROFESSIONAL');
  const [admin, setAdmin] = useState({ name: '', email: '', password: '' });
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const handleStart = async () => {
    if (!businessName.trim() || !businessType.trim()) {
      alert("Please tell us your shop's name and what you plan to sell.");
      return;
    }

    setIsError(false);
    setLoadingStage('Analyzing Market...');
    
    try {
      // Stage 1: Market Analysis
      await new Promise(r => setTimeout(r, 600));
      setLoadingStage('Defining Business DNA...');
      
      // Stage 2: Gemini API Call
      const result = await getBusinessDNA(businessName, businessType);
      
      setLoadingStage('Crafting Catalog...');
      await new Promise(r => setTimeout(r, 400));
      
      setDna(result);
      setProducts(result.starterProducts.map((p, i) => ({ 
        ...p, 
        id: `NEW-${Date.now()}-${i}`, 
        stock: 20 
      } as Product)));
      
      setStep(1);
    } catch (e) { 
      console.error("Onboarding logic failure:", e);
      setIsError(true);
      setLoadingStage('');
    }
  };

  const finishSetup = async () => {
    if (!admin.name.trim() || !admin.email.trim()) {
      alert("Please fill in your name and email.");
      return;
    }
    if (admin.password.length < 4) {
      alert("Please use a password with at least 4 characters.");
      return;
    }
    
    setStep(4);
    addLog("Setting up your shop's digital shelf...");
    await new Promise(r => setTimeout(r, 600));
    addLog(`Registering ${businessName} in our secure vault...`);
    await new Promise(r => setTimeout(r, 800));
    addLog(`Creating manager access for ${admin.name}...`);
    await new Promise(r => setTimeout(r, 1000));
    addLog("Almost ready! Just polishing the counter...");
    
    setTimeout(() => onComplete({ 
      businessName, 
      businessType, 
      generatedCategories: dna?.categories || [], 
      generatedProducts: products, 
      selectedPlan, 
      paymentMethod: 'GCASH', 
      adminName: admin.name, 
      adminEmail: admin.email, 
      adminPassword: admin.password, 
      isComplete: true 
    }), 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 md:p-10 font-sans selection:bg-indigo-100 overflow-x-hidden">
      <div className="w-full max-w-6xl flex flex-col items-center flex-1">
        <Logo className="h-12 mb-10" showText />
        
        <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col min-h-[560px] transition-all duration-500">
          
          {step === 0 && (
            <div className="p-8 md:p-16 flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="max-w-2xl mx-auto text-center md:text-left space-y-8">
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">
                    Start Your <span className="text-indigo-600">Dream Shop.</span>
                  </h1>
                  <p className="text-slate-500 text-lg md:text-xl font-medium leading-relaxed max-w-xl">
                    AutoMate uses intelligence to build your inventory catalog and business strategy in seconds.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="text-left space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">Shop Name</label>
                    <input 
                      value={businessName} 
                      onChange={e => setBusinessName(e.target.value)} 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-300 shadow-sm" 
                      placeholder="e.g. Maria's Corner Shop" 
                    />
                  </div>
                  <div className="text-left space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">What do you sell?</label>
                    <input 
                      value={businessType} 
                      onChange={e => setBusinessType(e.target.value)} 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-300 shadow-sm" 
                      placeholder="e.g. Snacks & Drinks" 
                    />
                  </div>
                </div>

                {isError && (
                  <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 animate-in slide-in-from-top-2">
                    <AlertCircle size={20} />
                    <p className="text-xs font-bold">Something went wrong. Please check your internet node and try again.</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
                  <button 
                    onClick={handleStart} 
                    disabled={!!loadingStage} 
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 px-12 rounded-2xl shadow-2xl shadow-indigo-200 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-80"
                  >
                    {loadingStage ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        <span className="uppercase tracking-widest text-xs font-black">{loadingStage}</span>
                      </>
                    ) : (
                      <>
                        <span className="uppercase tracking-widest text-xs font-black">Start My Shop</span>
                        <Sparkles size={18}/>
                      </>
                    )}
                  </button>
                  <button onClick={onSwitchToLogin} className="text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-indigo-600 transition-colors p-2 flex items-center gap-2">
                    Already have an account? <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="p-8 md:p-12 flex-1 flex flex-col animate-in slide-in-from-right-8 duration-500 overflow-y-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-indigo-600 rounded-2xl text-white shadow-xl"><BrainCircuit size={28} /></div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Your AI Blueprint</h2>
                    <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">Tailored market strategy</p>
                  </div>
                </div>
                <button onClick={() => setStep(2)} className="w-full md:w-auto bg-slate-900 hover:bg-indigo-600 text-white font-black py-4 px-10 rounded-xl shadow-xl transition-all flex items-center justify-center gap-3 text-[10px] uppercase active:scale-95 tracking-widest">
                  Configure My Plan <ChevronRight size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-4 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner space-y-6">
                  <div>
                    <p className="text-[9px] font-black uppercase text-indigo-600 mb-2 tracking-widest flex items-center gap-2"><Zap size={10} fill="currentColor"/> Strategic Insight</p>
                    <p className="text-base font-bold text-slate-800 italic leading-relaxed">"{dna?.nicheAnalysis}"</p>
                  </div>
                  <div className="pt-6 border-t border-slate-200/60">
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-3 tracking-widest">Growth Recommendation</p>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed">{dna?.growthStrategy}</p>
                  </div>
                </div>

                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden flex flex-col shadow-sm">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Generated Starter Catalog</h3>
                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">{products.length} Items</span>
                  </div>
                  <div className="flex-1 p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((p, i) => (
                      <div key={i} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-3 group transition-all hover:border-indigo-300 hover:bg-white hover:shadow-lg">
                        <div className="aspect-square bg-white rounded-xl flex items-center justify-center text-slate-200 border border-slate-100 shadow-inner group-hover:text-indigo-400 transition-colors">
                          <Box size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-900 truncate uppercase tracking-tight">{p.name}</p>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-[9px] font-bold text-indigo-600">{formatCurrency(p.price)}</p>
                            <span className="text-[8px] font-black text-slate-400 uppercase">{p.category}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-8 md:p-14 flex-1 flex flex-col animate-in slide-in-from-right-8 duration-500 overflow-y-auto">
              <div className="text-center mb-12 space-y-2">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Choose Your Tier</h2>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Scalable architecture for any business size</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {PLANS.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedPlan(p.id)} 
                    className={`p-10 border-2 rounded-[3rem] cursor-pointer transition-all duration-500 flex flex-col relative group ${selectedPlan === p.id ? 'border-indigo-600 scale-[1.02] z-10 bg-white ring-[12px] ring-indigo-50 shadow-2xl shadow-indigo-100' : 'border-slate-100 bg-slate-50 opacity-60 hover:opacity-100'}`}
                  >
                    {p.recommended && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-xl">Most Popular</div>
                    )}
                    <div className="text-center border-b border-slate-100 pb-8 mb-8">
                      <h4 className="font-black text-slate-900 uppercase text-xs mb-4 tracking-widest">{p.name}</h4>
                      <p className="text-4xl font-black text-slate-900 tracking-tighter">₱{p.price.toLocaleString()}<span className="text-xs text-slate-400 font-bold ml-1 tracking-normal">/mo</span></p>
                    </div>
                    <ul className="space-y-4 flex-1 mb-10">
                      {p.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-3 text-[11px] font-bold text-slate-600 leading-tight">
                          <div className="mt-0.5 p-0.5 bg-indigo-500 rounded text-white shadow-sm"><Check size={10} strokeWidth={4}/></div>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className={`text-center py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all ${selectedPlan === p.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-400'}`}>
                      {selectedPlan === p.id ? 'Active Selection' : 'Select Tier'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center gap-4">
                <button onClick={() => setStep(3)} className="w-full sm:w-80 bg-slate-900 hover:bg-indigo-600 text-white font-black py-6 rounded-2xl shadow-2xl shadow-slate-200 transition-all active:scale-95 text-xs uppercase tracking-[0.3em]">
                  Finalize Access
                </button>
                <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-indigo-600">Back to Blueprint</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-8 md:p-20 flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full animate-in zoom-in-95 duration-500">
               <div className="text-center space-y-6 mb-12">
                  <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto text-white shadow-2xl ring-[10px] ring-indigo-50"><User size={40}/></div>
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Manager Node</h2>
                    <p className="text-slate-500 text-lg font-medium px-10">Provision your administrative credentials to control {businessName}.</p>
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Full Name</label>
                    <input 
                      value={admin.name} 
                      onChange={e => setAdmin({...admin, name: e.target.value})} 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-sm" 
                      placeholder="Maria Dela Cruz" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Email Address</label>
                    <input 
                      value={admin.email} 
                      onChange={e => setAdmin({...admin, email: e.target.value})} 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-sm" 
                      placeholder="maria@email.com" 
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Secure Access Key</label>
                    <input 
                      type="password" 
                      value={admin.password} 
                      onChange={e => setAdmin({...admin, password: e.target.value})} 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-sm tracking-widest" 
                      placeholder="••••••••" 
                    />
                  </div>
               </div>
               <button onClick={finishSetup} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-2xl shadow-2xl shadow-indigo-100 transition-all uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-4 active:scale-95">
                 Initialize Terminal <Zap size={20} fill="currentColor" className="text-amber-300"/>
               </button>
            </div>
          )}

          {step === 4 && (
            <div className="p-8 md:p-14 flex-1 flex flex-col justify-center items-center animate-in zoom-in-95 w-full max-w-3xl mx-auto">
              <div className="bg-slate-900 rounded-[3rem] p-10 shadow-3xl border border-slate-800 font-mono text-[11px] h-[360px] w-full flex flex-col overflow-hidden relative">
                <div className="flex-1 overflow-y-auto space-y-2.5 text-indigo-300/90 custom-scrollbar pr-4">
                  {logs.map((log, i) => (
                    <div key={i} className={`flex items-start gap-4 ${log.includes("ready") ? "text-emerald-400 font-black" : ""}`}>
                      <span className="opacity-40 text-[8px] mt-0.5">[{i}]</span>
                      <span className="flex-1 leading-relaxed">{log}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 animate-pulse text-indigo-500 font-black">
                    <Loader2 size={12} className="animate-spin" />
                    <span>> SYNC_STATE: FINALIZING_NODE_ASSETS...</span>
                  </div>
                </div>
                <div className="absolute bottom-6 right-10 flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.5em]">Neural Ledger v3.5 Bootloader</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="mt-12 text-center opacity-30">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.8em]">End-to-End Intelligence</p>
      </div>
    </div>
  );
};
