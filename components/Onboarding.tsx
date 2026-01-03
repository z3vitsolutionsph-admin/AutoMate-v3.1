import React, { useState } from 'react';
import { Store, Wand2, Check, ArrowRight, User, Briefcase, Loader2, Sparkles, CreditCard, ShieldCheck, Smartphone, Landmark, Zap, Gift, Building2, ChevronRight, ChevronLeft, ShieldAlert, Users, Rocket, Mail, Lock, Eye, EyeOff, Shield, Verified, Globe, Info, Landmark as Bank, AlertCircle } from 'lucide-react';
import { OnboardingState, PlanType, SubscriptionPlan } from '../types';
import { generateBusinessCategories } from '../services/geminiService';
import { Logo } from './Logo';

const PLANS: SubscriptionPlan[] = [
  { 
    id: 'STARTER', 
    name: 'Starter', 
    price: 0, 
    employeeLimit: 1, 
    features: ['5-Day Free Trial', 'Core POS Terminal', 'Basic Inventory Audit', '1 User Seat', 'Standard Reports'], 
    color: 'border-slate-200 hover:border-indigo-300' 
  },
  { 
    id: 'PROFESSIONAL', 
    name: 'Professional', 
    price: 4999, 
    employeeLimit: 5, 
    features: ['Advanced AI Insights', '5 User Seats', 'Affiliate & Promoter Hub', 'Multi-Store Support (3)', 'Priority Email Support'], 
    recommended: true, 
    color: 'border-indigo-600 shadow-indigo-100 shadow-xl bg-indigo-50/20' 
  },
  { 
    id: 'ENTERPRISE', 
    name: 'Enterprise', 
    price: 9999, 
    employeeLimit: 'Unlimited', 
    features: ['Unlimited Nodes Sync', 'Neural Demand Forecasting', 'Dedicated Success Manager', 'Custom API Access', '24/7 Priority Support'], 
    color: 'border-blue-600 hover:bg-blue-50/20 shadow-blue-100' 
  }
];

export const Onboarding: React.FC<{ onComplete: (data: OnboardingState) => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('PROFESSIONAL');
  
  // Admin details
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Validation State
  const [errors, setErrors] = useState<{name?: string, email?: string, password?: string}>({});

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleStep0 = async () => {
    setIsLoading(true);
    try {
      const cats = await generateBusinessCategories(businessName, businessType);
      setCategories(cats);
      nextStep();
    } finally { setIsLoading(false); }
  };

  const validateStep3 = () => {
    const newErrors: {name?: string, email?: string, password?: string} = {};
    let isValid = true;

    // Name Validation: No numbers allowed
    if (!adminName.trim()) {
      newErrors.name = "Admin Name is required.";
      isValid = false;
    } else if (/\d/.test(adminName)) {
      newErrors.name = "Proper name required. Numbers are not permitted.";
      isValid = false;
    }

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!adminEmail.trim()) {
      newErrors.email = "Email Address is required.";
      isValid = false;
    } else if (!emailRegex.test(adminEmail)) {
      newErrors.email = "Please enter a valid email address.";
      isValid = false;
    }

    // Master Key Validation: 5 to 8 digits
    const keyRegex = /^\d{5,8}$/;
    if (!adminPassword.trim()) {
      newErrors.password = "Master Key is required.";
      isValid = false;
    } else if (!keyRegex.test(adminPassword)) {
      newErrors.password = "Master Key must be 5 to 8 digits (numeric only).";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleVerifyDeployment = () => {
    if (validateStep3()) {
      setIsCreatingProfile(true);
      // Simulate secure profile creation latency
      setTimeout(() => {
        setIsCreatingProfile(false);
        nextStep();
      }, 2500);
    }
  };

  const handleFinalize = () => {
    onComplete({ businessName, businessType, generatedCategories: categories, selectedPlan, paymentMethod: 'GCASH', adminName, adminEmail, adminPassword, isComplete: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 font-sans selection:bg-indigo-100">
      <div className="w-full max-w-4xl mb-12">
        <div className="flex justify-between items-center px-4 max-w-2xl mx-auto">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className={`flex items-center ${i < 4 ? 'flex-1' : ''}`}>
               <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-all duration-500 ${step >= i ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border border-slate-200 text-slate-300'}`}>
                 {step > i ? <Check size={18} strokeWidth={3} /> : i + 1}
               </div>
               {i < 4 && <div className={`flex-1 h-1 mx-3 rounded-full ${step > i ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-4xl bg-white border border-slate-200 p-12 md:p-16 rounded-[3rem] shadow-2xl relative overflow-hidden transition-all">
        {step === 0 && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="text-center space-y-4">
              <Logo className="h-16 mb-6 mx-auto" />
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">AutoMate™ Setup</h2>
              <p className="text-slate-500 max-w-md mx-auto">Initialize your AutoMate™ instance for intelligent market operations.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Store Designation</label><input value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50" placeholder="e.g. Apex Retail" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Market Segment</label><input value={businessType} onChange={e => setBusinessType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50" placeholder="e.g. Fashion" /></div>
            </div>
            <div className="space-y-6">
              <button onClick={handleStep0} disabled={isLoading || !businessName} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-3xl transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3">
                {isLoading ? <Loader2 className="animate-spin" /> : <>Initialize Intelligence <ArrowRight size={20} /></>}
              </button>
              <p className="text-center text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                © 2024 AutoMate Systems Global. Neural Ledger Technology™
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100 text-indigo-600"><Wand2 size={32} /></div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Neural Mapping</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((cat, i) => <div key={i} className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-slate-900 font-bold text-sm shadow-sm">{cat}</div>)}
            </div>
            <button onClick={nextStep} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-3xl shadow-xl transition-all">Select Tier</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight text-center">System Scalability</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PLANS.map(p => (
                <div key={p.id} onClick={() => setSelectedPlan(p.id)} className={`p-8 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col h-full relative ${selectedPlan === p.id ? p.color : 'border-slate-100 hover:border-indigo-200 bg-slate-50 opacity-60'}`}>
                  {p.id === 'STARTER' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap shadow-lg">
                      5-Day Free Trial
                    </div>
                  )}
                  <h4 className="font-black text-slate-900 uppercase text-xs mb-2">{p.name}</h4>
                  <p className="text-2xl font-black text-slate-900">₱{p.price.toLocaleString()}</p>
                  <ul className="mt-6 space-y-3 flex-1">
                    {p.features.map((f, i) => <li key={i} className="text-[10px] text-slate-500 font-bold flex items-center gap-2"><Check size={12} className="text-emerald-500 shrink-0" /> {f}</li>)}
                  </ul>
                  {p.recommended && (
                    <div className="mt-4 pt-4 border-t border-indigo-100 w-full text-center">
                      <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Recommended</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={nextStep} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-3xl shadow-xl transition-all">Set Access Protocol</button>
          </div>
        )}

        {step === 3 && (
           <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500 max-w-lg mx-auto">
             {isCreatingProfile ? (
               <div className="flex flex-col items-center justify-center py-12 text-center space-y-8 animate-in zoom-in-95 duration-500">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <User size={32} className="text-indigo-600" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Creating Profile</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest animate-pulse">Encrypting Master Key & Provisioning Access...</p>
                  </div>
               </div>
             ) : (
               <>
                 <h2 className="text-3xl font-black text-slate-900 tracking-tight text-center">Master Authority</h2>
                 <div className="space-y-5">
                    <div className="space-y-1">
                      <input 
                        value={adminName} 
                        onChange={e => { setAdminName(e.target.value); setErrors({...errors, name: undefined}); }} 
                        className={`w-full bg-slate-50 border rounded-2xl p-5 text-slate-900 outline-none focus:ring-4 transition-all ${errors.name ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:ring-indigo-50'}`} 
                        placeholder="Admin Name" 
                      />
                      {errors.name && <div className="flex items-center gap-2 text-[10px] font-bold text-rose-500 px-2 animate-in slide-in-from-top-1"><AlertCircle size={10} /> {errors.name}</div>}
                    </div>

                    <div className="space-y-1">
                      <input 
                        type="email" 
                        value={adminEmail} 
                        onChange={e => { setAdminEmail(e.target.value); setErrors({...errors, email: undefined}); }} 
                        className={`w-full bg-slate-50 border rounded-2xl p-5 text-slate-900 outline-none focus:ring-4 transition-all ${errors.email ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:ring-indigo-50'}`} 
                        placeholder="Email Address" 
                      />
                      {errors.email && <div className="flex items-center gap-2 text-[10px] font-bold text-rose-500 px-2 animate-in slide-in-from-top-1"><AlertCircle size={10} /> {errors.email}</div>}
                    </div>
                    
                    <div className="space-y-1">
                      <input 
                        type="password" 
                        value={adminPassword} 
                        onChange={e => { setAdminPassword(e.target.value); setErrors({...errors, password: undefined}); }} 
                        className={`w-full bg-slate-50 border rounded-2xl p-5 text-slate-900 outline-none font-mono focus:ring-4 transition-all ${errors.password ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:ring-indigo-50'}`} 
                        placeholder="Master Key" 
                        maxLength={8}
                      />
                      {errors.password && <div className="flex items-center gap-2 text-[10px] font-bold text-rose-500 px-2 animate-in slide-in-from-top-1"><AlertCircle size={10} /> {errors.password}</div>}
                      {!errors.password && <div className="px-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Requirement: 5 to 8 numeric digits</div>}
                    </div>
                 </div>
                 <button onClick={handleVerifyDeployment} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-3xl shadow-xl transition-all">Verify Deployment</button>
               </>
             )}
           </div>
        )}

        {step === 4 && (
          <div className="text-center space-y-10 py-8 animate-in zoom-in-95 duration-700">
            <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto text-emerald-500 shadow-xl border border-emerald-100"><Check size={56} strokeWidth={4} /></div>
            <div>
              <h2 className="text-4xl font-black text-slate-900 mb-4">Core Systems Ready</h2>
              <p className="text-slate-500 max-w-sm mx-auto">AutoMate™ has provisioned your instance at <span className="text-indigo-600 font-black">{businessName}</span>.</p>
            </div>
            <button onClick={handleFinalize} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-6 rounded-[2.5rem] shadow-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm">Deploy AutoMate™ <Rocket size={20} /></button>
          </div>
        )}
      </div>
    </div>
  );
};