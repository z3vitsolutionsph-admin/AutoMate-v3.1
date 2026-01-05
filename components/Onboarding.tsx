import React, { useState } from 'react';
import { Check, ArrowRight, User, Loader2, Sparkles, Lock, AlertCircle, Rocket, Image as ImageIcon } from 'lucide-react';
import { OnboardingState, PlanType, SubscriptionPlan, Product } from '../types';
import { generateBusinessCategories, generateProductImage } from '../services/geminiService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { Logo } from './Logo';
import { dbService } from '../services/dbService';

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

const SafeImage: React.FC<{ src?: string, alt: string }> = ({ src, alt }) => {
  const [error, setError] = useState(false);
  if (!src || error) return <div className="flex items-center justify-center w-full h-full text-slate-300 bg-slate-50"><ImageIcon size={32} /></div>;
  return <img src={src} alt={alt} className="w-full h-full object-cover" onError={() => setError(true)} />;
};

export const Onboarding: React.FC<{ onComplete: (data: OnboardingState) => void; onSwitchToLogin: () => void }> = ({ onComplete, onSwitchToLogin }) => {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Initializing Intelligence...');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState('');
  
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [generatedProducts, setGeneratedProducts] = useState<Product[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('PROFESSIONAL');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [errors, setErrors] = useState<{name?: string, email?: string, password?: string}>({});

  const nextStep = () => setStep(prev => prev + 1);

  const handleStep0 = async () => {
    setIsLoading(true);
    setLoadingText('Analyzing Market Vertical...');
    try {
      const cats = await generateBusinessCategories(businessName, businessType);
      setCategories(cats);
      setLoadingText('Synthesizing Visual Assets & Inventory...');
      
      const productPromises = cats.map(async (cat, index) => {
        let imageUrl = '';
        try {
          if (index < 3) imageUrl = await generateProductImage(`High quality commercial product photography of a representative ${cat} item for ${businessType}`);
        } catch (e) { console.warn('Auto-image generation failed', e); }

        return {
          id: `GEN-${Date.now()}-${index}`,
          name: `${cat} Starter Unit`,
          sku: `AUTO-${1000 + index}`,
          category: cat,
          price: 1000,
          stock: 1,
          imageUrl: imageUrl,
          description: `Automatically initialized inventory item for ${cat} category.`
        } as Product;
      });

      const products = await Promise.all(productPromises);
      setGeneratedProducts(products);
      nextStep();
    } catch (error) {
      console.error("AI Initialization failed", error);
      setCategories(['General', 'Services']);
      nextStep();
    } finally { setIsLoading(false); }
  };

  const validateStep3 = () => {
    const newErrors: {name?: string, email?: string, password?: string} = {};
    let isValid = true;
    if (!adminName.trim() || /\d/.test(adminName)) { newErrors.name = "Proper name required."; isValid = false; }
    if (!adminEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) { newErrors.email = "Valid email required."; isValid = false; }
    if (!adminPassword.trim() || !/^\d{5,8}$/.test(adminPassword)) { newErrors.password = "Key must be 5-8 digits."; isValid = false; }
    setErrors(newErrors);
    return isValid;
  };

  const handleVerifyDeployment = () => {
    if (validateStep3()) {
      setIsCreatingProfile(true);
      setTimeout(() => { setIsCreatingProfile(false); nextStep(); }, 2000);
    }
  };

  const handleFinalize = async () => {
    setIsDeploying(true);
    setDeploymentStatus('Connecting to Cloud Database...');
    const resultState = { 
      businessName, businessType, generatedCategories: categories, generatedProducts, selectedPlan, 
      paymentMethod: 'GCASH', adminName, adminEmail, adminPassword, isComplete: true 
    };

    try {
      // 1. Check Supabase Config BEFORE attempting connection
      if (!isSupabaseConfigured()) {
        throw new Error("Cloud credentials not configured. Switching to Offline Mode.");
      }

      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .insert([{ name: businessName, type: businessType, subscription_plan: selectedPlan }])
        .select().single();

      if (businessError) throw new Error(businessError.message);

      setDeploymentStatus('Provisioning User Access...');
      const { error: userError } = await supabase.from('users').insert([{ 
          business_id: businessData.id, name: adminName, email: adminEmail, password: adminPassword, role: 'ADMIN_PRO', status: 'Active' 
      }]);
      if (userError) throw new Error(userError.message);

      setDeploymentStatus('Migrating Inventory Assets...');
      if (generatedProducts.length > 0) {
        const { error: productsError } = await supabase.from('products').insert(generatedProducts.map(p => ({
          business_id: businessData.id, name: p.name, sku: p.sku, category: p.category, price: p.price, 
          stock: p.stock, image_url: p.imageUrl, description: p.description
        })));
        if (productsError) throw new Error(productsError.message);
      }
      setDeploymentStatus('Success');
      onComplete(resultState);

    } catch (error: any) {
      console.warn("Cloud Deployment Warning:", error.message);
      setDeploymentStatus('Switching to Local Neural Node...');
      
      // FALLBACK: Save to Local IndexedDB immediately
      await dbService.saveItems('products', generatedProducts);
      // Wait a moment for UX
      setTimeout(() => onComplete(resultState), 1500);
    }
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
              <Logo className="h-16 mb-6 mx-auto justify-center" />
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">AutoMate™ Setup</h2>
              <p className="text-slate-500 max-w-md mx-auto">Initialize your AutoMate™ instance for intelligent market operations.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Store Designation</label><input value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50" placeholder="e.g. Apex Retail" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Market Segment</label><input value={businessType} onChange={e => setBusinessType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50" placeholder="e.g. Fashion" /></div>
            </div>
            <div className="space-y-6">
              <button onClick={handleStep0} disabled={isLoading || !businessName} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-3xl transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3">
                {isLoading ? <><Loader2 className="animate-spin" size={20} /> <span className="text-xs uppercase tracking-widest">{loadingText}</span></> : <>Initialize Intelligence <ArrowRight size={20} /></>}
              </button>
              <button onClick={onSwitchToLogin} className="w-full bg-white border-2 border-slate-100 hover:border-indigo-200 hover:text-indigo-600 text-slate-400 font-black py-4 rounded-3xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] group">
                <Lock size={14} className="group-hover:text-indigo-600 transition-colors" /> Access Existing Node
              </button>
            </div>
          </div>
        )}

        {/* Steps 1, 2, 3 remain similar but omitted for brevity in XML diff if unchanged logic */}
        {step === 1 && (
           <div className="space-y-10 animate-in fade-in text-center">
             <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-600"><Sparkles size={32} /></div>
             <h2 className="text-3xl font-black text-slate-900">Assets Synthesized</h2>
             <div className="grid grid-cols-3 gap-4">
                {generatedProducts.slice(0, 3).map((p, i) => (
                  <div key={i} className="aspect-square bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden"><SafeImage src={p.imageUrl} alt={p.name} /></div>
                ))}
             </div>
             <button onClick={nextStep} className="w-full bg-indigo-600 text-white font-black py-6 rounded-3xl shadow-xl flex items-center justify-center gap-2">Confirm <Check size={18} /></button>
           </div>
        )}

        {step === 2 && (
           <div className="space-y-10 animate-in fade-in">
             <h2 className="text-3xl font-black text-center text-slate-900">Scalability</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{PLANS.map(p => <div key={p.id} onClick={() => setSelectedPlan(p.id)} className={`p-6 border-2 rounded-[2rem] cursor-pointer ${selectedPlan === p.id ? p.color : 'border-slate-100 opacity-60'}`}><h4 className="font-black text-sm">{p.name}</h4><p className="text-xl font-black mt-2">₱{p.price}</p></div>)}</div>
             <button onClick={nextStep} className="w-full bg-indigo-600 text-white font-black py-6 rounded-3xl">Next Step</button>
           </div>
        )}

        {step === 3 && (
            <div className="space-y-10 animate-in fade-in max-w-lg mx-auto">
               {isCreatingProfile ? (
                 <div className="flex flex-col items-center justify-center py-12"><Loader2 className="animate-spin text-indigo-600 mb-4" size={48} /><p className="font-black text-xs uppercase text-slate-400">Encrypting...</p></div>
               ) : (
                 <>
                   <h2 className="text-3xl font-black text-center">Master Authority</h2>
                   <div className="space-y-4">
                      <input value={adminName} onChange={e => setAdminName(e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-2xl p-5 outline-none font-bold" placeholder="Name" />
                      <input value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-2xl p-5 outline-none font-bold" placeholder="Email" />
                      <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full bg-slate-50 border-slate-200 rounded-2xl p-5 outline-none font-bold" placeholder="Key (5-8 digits)" maxLength={8} />
                      {errors.password && <p className="text-rose-500 text-xs font-bold">{errors.password}</p>}
                   </div>
                   <button onClick={handleVerifyDeployment} className="w-full bg-indigo-600 text-white font-black py-6 rounded-3xl">Verify</button>
                 </>
               )}
            </div>
        )}

        {step === 4 && (
          <div className="text-center space-y-10 py-8 animate-in zoom-in-95">
            {isDeploying ? (
               <div className="flex flex-col items-center gap-6"><Loader2 size={64} className="text-indigo-600 animate-spin" /><p className="font-bold uppercase text-xs text-slate-500 animate-pulse">{deploymentStatus}</p></div>
            ) : (
              <>
                <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto text-emerald-500"><Check size={56} /></div>
                <h2 className="text-4xl font-black text-slate-900">Systems Ready</h2>
                <button onClick={handleFinalize} className="w-full bg-slate-900 text-white font-black py-6 rounded-[2.5rem] flex items-center justify-center gap-3 uppercase text-sm">Deploy <Rocket size={20} /></button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
