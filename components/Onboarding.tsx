import React, { useState } from 'react';
import { Store, Wand2, Check, ArrowRight, User, Briefcase, Loader2, Sparkles } from 'lucide-react';
import { OnboardingState } from '../types';
import { generateBusinessCategories } from '../services/geminiService';

interface OnboardingProps {
  onComplete: (data: OnboardingState) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1: Business Info
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');

  // Step 2: Categories
  const [categories, setCategories] = useState<string[]>([]);
  const [generatedCats, setGeneratedCats] = useState<string[]>([]);

  // Step 3: Admin Info
  const [adminName, setAdminName] = useState('');

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleStart = async () => {
    if (!businessName.trim()) {
      setErrors({ businessName: 'Business name is required' });
      return;
    }
    if (!businessType.trim()) {
      setErrors({ businessType: 'Business type is required' });
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      const cats = await generateBusinessCategories(businessName, businessType);
      setGeneratedCats(cats);
      setCategories(cats); // Default select all
      setStep(1);
    } catch (error) {
      setErrors({ general: 'Failed to generate categories. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategorySelection = () => {
    if (categories.length === 0) {
      setErrors({ categories: 'Select at least one category' });
      return;
    }
    setStep(2);
  };

  const handleFinalize = () => {
    if (!adminName.trim()) {
      setErrors({ adminName: 'Admin name is required' });
      return;
    }

    const finalState: OnboardingState = {
      currentStep: 3,
      isComplete: true,
      selectedPlan: 'PROFESSIONAL',
      businessName,
      businessType,
      generatedCategories: categories,
      gates: {
        employeeSet: true,
        categorySet: true,
        inventorySet: true
      }
    };
    onComplete(finalState);
  };

  const toggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      setCategories(prev => prev.filter(c => c !== cat));
    } else {
      setCategories(prev => [...prev, cat]);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-600/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-2xl relative z-10">
        
        {/* Progress Bar */}
        <div className="mb-8 flex justify-between items-center px-2">
           {[0, 1, 2].map(i => (
             <div key={i} className={`flex items-center ${i < 2 ? 'flex-1' : ''}`}>
               <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 ${step >= i ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-[#18181b] border border-[#27272a] text-zinc-500'}`}>
                 {step > i ? <Check size={20} /> : i + 1}
               </div>
               {i < 2 && (
                 <div className={`flex-1 h-1 mx-4 rounded-full transition-all duration-500 ${step > i ? 'bg-amber-500' : 'bg-[#27272a]'}`}></div>
               )}
             </div>
           ))}
        </div>

        {/* Step 1: Business Identity */}
        {step === 0 && (
          <div className="bg-[#18181b] border border-[#27272a] p-8 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                <Store size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white">Let's set up your store</h2>
              <p className="text-zinc-400 mt-2">Tell us about your business to personalize your experience.</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">Business Name</label>
                <div className="relative group">
                   <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-500 transition-colors" size={18} />
                   <input 
                    type="text" 
                    value={businessName}
                    onChange={(e) => { setBusinessName(e.target.value); setErrors(prev => ({...prev, businessName: ''})); }}
                    className={`w-full bg-[#09090b] border ${errors.businessName ? 'border-rose-500' : 'border-[#27272a]'} rounded-xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all`}
                    placeholder="e.g. Urban Cafe & Co."
                   />
                </div>
                {errors.businessName && <p className="text-rose-500 text-xs mt-1 ml-1">{errors.businessName}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">Business Type</label>
                <div className="relative group">
                   <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-500 transition-colors" size={18} />
                   <input 
                    type="text" 
                    value={businessType}
                    onChange={(e) => { setBusinessType(e.target.value); setErrors(prev => ({...prev, businessType: ''})); }}
                    className={`w-full bg-[#09090b] border ${errors.businessType ? 'border-rose-500' : 'border-[#27272a]'} rounded-xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all`}
                    placeholder="e.g. Coffee Shop, Retail, Salon"
                   />
                </div>
                {errors.businessType && <p className="text-rose-500 text-xs mt-1 ml-1">{errors.businessType}</p>}
              </div>
              
              <button 
                onClick={handleStart}
                disabled={isLoading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl shadow-lg shadow-amber-900/20 transition-all flex items-center justify-center gap-2 mt-4 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <>Continue <ArrowRight size={20} /></>}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: AI Categories */}
        {step === 1 && (
          <div className="bg-[#18181b] border border-[#27272a] p-8 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
                <Wand2 size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white">AI Generated Categories</h2>
              <p className="text-zinc-400 mt-2">We used Gemini AI to suggest categories for <b>{businessName}</b>.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8 max-h-[300px] overflow-y-auto pr-2">
              {generatedCats.map((cat, idx) => (
                <div 
                  key={idx}
                  onClick={() => toggleCategory(cat)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${categories.includes(cat) ? 'bg-amber-500/10 border-amber-500 text-white' : 'bg-[#09090b] border-[#27272a] text-zinc-400 hover:border-zinc-500'}`}
                >
                  <span className="font-medium text-sm">{cat}</span>
                  {categories.includes(cat) && <Check size={16} className="text-amber-500" />}
                </div>
              ))}
            </div>
            {errors.categories && <p className="text-rose-500 text-center mb-4 text-sm">{errors.categories}</p>}

            <div className="flex gap-4">
              <button onClick={prevStep} className="flex-1 py-4 rounded-xl font-bold text-zinc-400 hover:bg-[#27272a] transition-colors">Back</button>
              <button 
                onClick={handleCategorySelection}
                className="flex-[2] bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl shadow-lg shadow-amber-900/20 transition-all"
              >
                Confirm Selection ({categories.length})
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Admin Setup */}
        {step === 2 && (
          <div className="bg-[#18181b] border border-[#27272a] p-8 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-right-8 duration-500">
             <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                <User size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white">Administrator Access</h2>
              <p className="text-zinc-400 mt-2">Create the primary account to manage your store.</p>
            </div>

            <div className="space-y-6">
               <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">Admin Name</label>
                <div className="relative group">
                   <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                   <input 
                    type="text" 
                    value={adminName}
                    onChange={(e) => { setAdminName(e.target.value); setErrors(prev => ({...prev, adminName: ''})); }}
                    className={`w-full bg-[#09090b] border ${errors.adminName ? 'border-rose-500' : 'border-[#27272a]'} rounded-xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all`}
                    placeholder="Full Name"
                   />
                </div>
                {errors.adminName && <p className="text-rose-500 text-xs mt-1 ml-1">{errors.adminName}</p>}
              </div>

               <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 flex gap-3">
                  <Sparkles className="text-blue-500 shrink-0" size={20} />
                  <p className="text-xs text-blue-200/80 leading-relaxed">
                    By clicking "Finish Setup", you agree to initialize the system with the selected AI-generated configurations.
                  </p>
               </div>

               <div className="flex gap-4">
                  <button onClick={prevStep} className="flex-1 py-4 rounded-xl font-bold text-zinc-400 hover:bg-[#27272a] transition-colors">Back</button>
                  <button 
                    onClick={handleFinalize}
                    className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all"
                  >
                    Finish Setup
                  </button>
               </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};