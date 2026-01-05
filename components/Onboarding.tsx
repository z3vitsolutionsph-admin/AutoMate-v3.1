
import React, { useState, useEffect, useRef } from 'react';
import { Check, ArrowRight, User, Loader2, Sparkles, Lock, AlertCircle, Rocket, Image as ImageIcon, Briefcase, Building2, ShieldCheck, Terminal, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { OnboardingState, PlanType, SubscriptionPlan, Product } from '../types';
import { generateBusinessCategories, generateProductImage } from '../services/geminiService';
import { Logo } from './Logo';
import { dbService } from '../services/dbService';

const PLANS: SubscriptionPlan[] = [
  { 
    id: 'STARTER', 
    name: 'Starter', 
    price: 0, 
    employeeLimit: 1, 
    features: [
      '5-Day Free Trial', 
      'Single Store Node',
      'Core POS Terminal', 
      'Basic Inventory Audit', 
      '1 User Seat', 
      'Standard Reports'
    ], 
    color: 'border-slate-200 hover:border-indigo-300' 
  },
  { 
    id: 'PROFESSIONAL', 
    name: 'Professional', 
    price: 4999, 
    employeeLimit: 5, 
    features: [
      'Advanced AI Insights', 
      '5 User Seats', 
      'Affiliate & Promoter Hub', 
      'Multi-Store Support (3)', 
      'Priority Email Support',
      'Loyalty Program'
    ], 
    recommended: true, 
    color: 'border-indigo-600 shadow-indigo-100 shadow-xl bg-indigo-50/20' 
  },
  { 
    id: 'ENTERPRISE', 
    name: 'Enterprise', 
    price: 9999, 
    employeeLimit: 'Unlimited', 
    features: [
      'Unlimited Nodes Sync', 
      'Neural Demand Forecasting', 
      'Dedicated Success Manager', 
      'Custom API Access', 
      '24/7 Priority Support',
      'White-Label Options'
    ], 
    color: 'border-blue-600 hover:bg-blue-50/20 shadow-blue-100' 
  }
];

const SafeImage: React.FC<{ src?: string, alt: string }> = ({ src, alt }) => {
  const [error, setError] = useState(false);
  if (!src || error) return <div className="flex items-center justify-center w-full h-full text-slate-300 bg-slate-50"><ImageIcon size={32} /></div>;
  return <img src={src} alt={alt} className="w-full h-full object-cover" onError={() => setError(true)} />;
};

export const Onboarding: React.FC<{ onComplete: (data: OnboardingState) => void; onSwitchToLogin: () => void }> = ({ onComplete, onSwitchToLogin }) => {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Initializing Intelligence...');
  const [showPassword, setShowPassword] = useState(false);
  
  // Data State
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [generatedProducts, setGeneratedProducts] = useState<Product[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('PROFESSIONAL');
  
  // Admin State
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  // Validation & Error Handling
  const [errors, setErrors] = useState<{name?: string, email?: string, password?: string, business?: string}>({});
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step === 4 && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [deploymentLogs, step]);

  const addLog = (msg: string) => setDeploymentLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const nextStep = () => {
    setErrors({});
    setStep(prev => prev + 1);
  };

  const handleStep0 = async () => {
    if (!businessName.trim() || !businessType.trim()) {
      setErrors({ business: "Please provide both Business Name and Market Segment." });
      return;
    }

    setIsLoading(true);
    setLoadingText('Analyzing Market Vertical...');
    
    try {
      const cats = await generateBusinessCategories(businessName, businessType);
      setCategories(cats);
      
      setLoadingText('Synthesizing Visual Assets & Inventory...');
      // Generate initial inventory based on categories
      const productPromises = cats.slice(0, 3).map(async (cat, index) => {
        let imageUrl = '';
        try {
          imageUrl = await generateProductImage(`High quality commercial product photography of a representative ${cat} item for ${businessType}. Minimalist studio background.`);
        } catch (e) { 
          console.warn('Auto-image generation failed, falling back to placeholder.', e); 
        }

        return {
          id: `GEN-${Date.now()}-${index}`,
          name: `${cat} Starter Unit`,
          sku: `AUTO-${1000 + index}`,
          category: cat,
          price: 1000,
          stock: 10, // Give some initial stock
          imageUrl: imageUrl,
          description: `Automatically initialized inventory item for ${cat} category. Ready for sales.`
        } as Product;
      });

      const products = await Promise.all(productPromises);
      setGeneratedProducts(products);
      nextStep();
    } catch (error) {
      console.error("AI Initialization failed", error);
      // Fallback if AI fails completely
      setCategories(['General', 'Services', 'Retail']);
      nextStep();
    } finally { 
      setIsLoading(false); 
    }
  };

  const validateStep3 = () => {
    const newErrors: {name?: string, email?: string, password?: string} = {};
    let isValid = true;
    
    if (!adminName.trim() || adminName.length < 3) { 
      newErrors.name = "Full name required (min 3 chars)."; 
      isValid = false; 
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!adminEmail.trim() || !emailRegex.test(adminEmail)) { 
      newErrors.email = "Valid email address required."; 
      isValid = false; 
    }
    
    if (!adminPassword.trim() || !/^\d{5,8}$/.test(adminPassword)) { 
      newErrors.password = "Secure Key must be 5-8 numeric digits."; 
      isValid = false; 
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleVerifyDeployment = () => {
    if (validateStep3()) {
      nextStep(); // Move to Step 4 (Deployment Terminal)
      handleFinalize(); // Auto-start deployment
    }
  };

  const handleFinalize = async () => {
    setDeploymentLogs([]);
    addLog("Initializing deployment sequence...");
    
    const resultState = { 
      businessName, businessType, generatedCategories: categories, generatedProducts, selectedPlan, 
      paymentMethod: 'GCASH', adminName, adminEmail, adminPassword, isComplete: true 
    };

    try {
      // Simulation of system setup (Local Mode)
      addLog("Initializing Local Neural Node...");
      await new Promise(r => setTimeout(r, 600));
      addLog("Local storage structure allocated.");

      addLog(`Provisioning organization: ${businessName}...`);
      await new Promise(r => setTimeout(r, 500));
      addLog(`Organization ID: BIZ-${Date.now()} [OK]`);

      addLog(`Creating Master Authority profile for ${adminName}...`);
      await new Promise(r => setTimeout(r, 600));
      addLog("Master Authority profile created [OK]");

      addLog(`Migrating ${generatedProducts.length} synthetic assets to ledger...`);
      // We don't save here, App.tsx handles the actual IndexedDB save to ensure flow control
      await new Promise(r => setTimeout(r, 800));
      addLog("Inventory ledger synchronized [OK]");

      addLog("System registry finalized.");
      addLog("Redirecting to Command Center...");
      
      setTimeout(() => onComplete(resultState), 1500);

    } catch (error: any) {
      console.error("Deployment Error:", error);
      addLog(`ERROR: ${error.message}`);
    }
  };

  // --- Render Steps ---

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans selection:bg-indigo-100">
      
      {/* Step Indicator */}
      <div className="w-full max-w-4xl mb-12">
        <div className="flex justify-between items-center px-4 max-w-2xl mx-auto">
          {['Identity', 'Assets', 'Scale', 'Authority', 'Deploy'].map((label, i) => (
            <div key={i} className={`flex items-center ${i < 4 ? 'flex-1' : ''}`}>
               <div className="relative flex flex-col items-center">
                 <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-all duration-500 z-10 ${step >= i ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110' : 'bg-white border border-slate-200 text-slate-300'}`}>
                   {step > i ? <Check size={18} strokeWidth={3} /> : i + 1}
                 </div>
                 <span className={`absolute -bottom-6 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors duration-300 ${step >= i ? 'text-indigo-600' : 'text-slate-300'}`}>{label}</span>
               </div>
               {i < 4 && <div className={`flex-1 h-1 mx-3 rounded-full transition-all duration-700 ${step > i ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-4xl bg-white border border-slate-200 p-8 md:p-16 rounded-[3rem] shadow-2xl relative overflow-hidden transition-all min-h-[600px] flex flex-col">
        
        {/* STEP 0: Business Identity */}
        {step === 0 && (
          <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="text-center space-y-6 mb-12">
              <Logo className="h-20 mb-4 mx-auto justify-center" />
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">AutoMate™ Setup</h2>
                <p className="text-slate-500 font-medium max-w-md mx-auto">Initialize your intelligent commerce node. Define your market parameters to begin.</p>
              </div>
            </div>
            
            <div className="space-y-6 max-w-lg mx-auto w-full">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Organization Name</label>
                <div className="relative group">
                   <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                   <input 
                     value={businessName} 
                     onChange={e => { setBusinessName(e.target.value); setErrors({}); }}
                     className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-5 py-5 text-slate-900 font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all placeholder:font-medium placeholder:text-slate-300" 
                     placeholder="e.g. Apex Retail Global" 
                   />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Market Segment</label>
                <div className="relative group">
                   <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                   <input 
                     value={businessType} 
                     onChange={e => { setBusinessType(e.target.value); setErrors({}); }}
                     className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-5 py-5 text-slate-900 font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all placeholder:font-medium placeholder:text-slate-300" 
                     placeholder="e.g. Fashion & Apparel" 
                   />
                </div>
              </div>

              {errors.business && (
                <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                  <AlertCircle size={16} /> {errors.business}
                </div>
              )}

              <button onClick={handleStep0} disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-3xl transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70 disabled:active:scale-100 mt-4">
                {isLoading ? <><Loader2 className="animate-spin" size={20} /> <span className="text-xs uppercase tracking-widest">{loadingText}</span></> : <>Initialize Intelligence <ArrowRight size={20} /></>}
              </button>

              <div className="text-center pt-4">
                 <button onClick={onSwitchToLogin} className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 mx-auto">
                    <Lock size={12} /> Access Existing Node
                 </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Assets Synthesized */}
        {step === 1 && (
           <div className="flex-1 flex flex-col justify-center items-center space-y-12 animate-in fade-in">
             <div className="text-center space-y-4">
               <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto text-indigo-600 shadow-inner"><Sparkles size={40} /></div>
               <h2 className="text-3xl font-black text-slate-900">Assets Synthesized</h2>
               <p className="text-slate-500 max-w-md mx-auto">AI has generated preliminary inventory based on your market segment.</p>
             </div>
             
             <div className="grid grid-cols-3 gap-6 w-full max-w-2xl">
                {generatedProducts.slice(0, 3).map((p, i) => (
                  <div key={i} className="group relative">
                    <div className="aspect-square bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden shadow-sm group-hover:shadow-md transition-all">
                      <SafeImage src={p.imageUrl} alt={p.name} />
                    </div>
                    <p className="text-center mt-3 text-xs font-black uppercase text-slate-700 tracking-wider truncate px-2">{p.category}</p>
                  </div>
                ))}
             </div>

             <button onClick={nextStep} className="w-full max-w-md bg-indigo-600 text-white font-black py-6 rounded-3xl shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95">
               Confirm & Continue <Check size={20} />
             </button>
           </div>
        )}

        {/* STEP 2: Subscription Plan */}
        {step === 2 && (
           <div className="flex-1 flex flex-col animate-in fade-in">
             <div className="text-center space-y-2 mb-10">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Subscription Plan</h2>
                <p className="text-slate-500 text-sm font-medium">Choose the architecture that fits your business scale.</p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {PLANS.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedPlan(p.id)} 
                    className={`relative p-6 border-2 rounded-[2.5rem] cursor-pointer transition-all duration-300 flex flex-col gap-4 group ${selectedPlan === p.id ? p.color + ' scale-105 z-10 bg-white ring-4 ring-indigo-50' : 'border-slate-100 hover:border-slate-200 bg-white hover:shadow-lg opacity-80 hover:opacity-100 scale-95'}`}
                  >
                    {p.recommended && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                        Recommended
                      </div>
                    )}
                    <div className="text-center pb-4 border-b border-slate-100">
                      <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-2">{p.name}</h4>
                      <p className="text-3xl font-black text-slate-900 tracking-tighter">₱{p.price.toLocaleString()}<span className="text-sm text-slate-400 font-bold ml-1">/mo</span></p>
                    </div>
                    <ul className="space-y-3 flex-1">
                      {p.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-3 text-[10px] font-bold text-slate-600">
                          <Check size={14} className={`shrink-0 mt-0.5 ${selectedPlan === p.id ? 'text-indigo-600' : 'text-slate-300'}`} />
                          <span className="leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                    <div className={`mt-auto pt-4 text-center text-[10px] font-black uppercase tracking-widest ${selectedPlan === p.id ? 'text-indigo-600' : 'text-slate-300'}`}>
                      {selectedPlan === p.id ? 'Selected' : 'Select Plan'}
                    </div>
                  </div>
                ))}
             </div>
             <button onClick={nextStep} className="w-full max-w-md mx-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-3xl transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center justify-center gap-2">
               Continue <ArrowRight size={20} />
             </button>
           </div>
        )}

        {/* STEP 3: Admin Setup */}
        {step === 3 && (
            <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full animate-in fade-in space-y-8">
               <div className="text-center space-y-2">
                 <div className="w-16 h-16 bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto text-white shadow-xl mb-4"><ShieldCheck size={32} /></div>
                 <h2 className="text-3xl font-black text-slate-900">Master Authority</h2>
                 <p className="text-slate-500 text-sm">Create the root administrator credentials for your organization.</p>
               </div>

               <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Administrator Name</label>
                    <div className="relative">
                      <User size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"/>
                      <input 
                        value={adminName} 
                        onChange={e => { setAdminName(e.target.value); setErrors({...errors, name: undefined}); }} 
                        className={`w-full bg-slate-50 border ${errors.name ? 'border-rose-300 bg-rose-50' : 'border-slate-200'} rounded-2xl pl-14 pr-5 py-5 text-slate-900 font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all`} 
                        placeholder="John Doe" 
                      />
                    </div>
                    {errors.name && <p className="text-rose-500 text-[10px] font-bold ml-2">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Secure Email</label>
                    <div className="relative">
                      <Briefcase size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"/>
                      <input 
                        value={adminEmail} 
                        onChange={e => { setAdminEmail(e.target.value); setErrors({...errors, email: undefined}); }} 
                        className={`w-full bg-slate-50 border ${errors.email ? 'border-rose-300 bg-rose-50' : 'border-slate-200'} rounded-2xl pl-14 pr-5 py-5 text-slate-900 font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all`} 
                        placeholder="admin@company.com" 
                      />
                    </div>
                    {errors.email && <p className="text-rose-500 text-[10px] font-bold ml-2">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Access Key</label>
                    <div className="relative">
                      <Lock size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"/>
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={adminPassword} 
                        onChange={e => { setAdminPassword(e.target.value); setErrors({...errors, password: undefined}); }} 
                        className={`w-full bg-slate-50 border ${errors.password ? 'border-rose-300 bg-rose-50' : 'border-slate-200'} rounded-2xl pl-14 pr-12 py-5 text-slate-900 font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all`} 
                        placeholder="5-8 Digits" 
                        maxLength={8} 
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-rose-500 text-[10px] font-bold ml-2">{errors.password}</p>}
                  </div>
               </div>
               
               <button onClick={handleVerifyDeployment} className="w-full bg-indigo-600 text-white font-black py-6 rounded-3xl shadow-xl hover:bg-indigo-700 transition-all active:scale-95">Verify & Deploy</button>
            </div>
        )}

        {/* STEP 4: System Provisioning (Terminal) */}
        {step === 4 && (
          <div className="flex-1 flex flex-col justify-center animate-in zoom-in-95 duration-500 w-full max-w-2xl mx-auto">
            {deploymentLogs.length > 0 && deploymentLogs[deploymentLogs.length - 1].includes("Redirecting") ? (
              <div className="text-center space-y-8">
                <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto text-emerald-500 border-4 border-emerald-100 animate-bounce"><Check size={56} strokeWidth={4} /></div>
                <div>
                   <h2 className="text-4xl font-black text-slate-900 mb-2">Systems Ready</h2>
                   <p className="text-slate-500 font-medium">Redirecting you to the command center...</p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-[2rem] p-6 shadow-2xl border border-slate-800 font-mono text-sm relative overflow-hidden h-[400px] flex flex-col">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4">
                   <div className="flex gap-2">
                     <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                     <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                     <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                   </div>
                   <div className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Terminal size={14}/> AutoMate System CL</div>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 text-xs custom-scrollbar pr-2">
                   {deploymentLogs.map((log, i) => (
                     <div key={i} className={`font-mono ${log.includes("ERROR") ? "text-rose-400" : log.includes("WARNING") ? "text-amber-400" : log.includes("[OK]") ? "text-emerald-400" : "text-slate-300"}`}>
                       <span className="opacity-50 mr-2">{'>'}</span>{log}
                     </div>
                   ))}
                   <div ref={logsEndRef} />
                </div>
              </div>
            )}
            
            {!deploymentLogs[deploymentLogs.length - 1]?.includes("Redirecting") && (
               <p className="text-center mt-6 text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse">
                 Provisioning Local Node Infrastructure...
               </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
