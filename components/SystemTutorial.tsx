import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, LayoutDashboard, Package, ShoppingCart, BarChart3, Bot, Zap, ArrowRight, Check } from 'lucide-react';

export const SystemTutorial: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: "Welcome to AutoMate", description: "Your intelligent Point of Sale & Inventory partner. Experience a seamless workflow designed to empower your business operations.", icon: <Zap size={56} className="text-white" />, color: "from-indigo-600 to-indigo-700" },
    { title: "Real-Time Dashboard", description: "Monitor active revenue streams, inventory alerts, and live pulse metrics from a unified command center.", icon: <LayoutDashboard size={56} className="text-white" />, color: "from-blue-600 to-blue-700" },
    { title: "Smart Inventory", description: "Leverage AI logic to heal metadata, track movement, and optimize reorder points through neural forecasting.", icon: <Package size={56} className="text-white" />, color: "from-emerald-600 to-emerald-700" }
  ];

  const handleNext = () => currentStep < steps.length - 1 ? setCurrentStep(s => s + 1) : onClose();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row min-h-[500px] animate-in zoom-in-95">
        <div className={`w-full md:w-1/2 bg-gradient-to-br ${steps[currentStep].color} flex items-center justify-center p-12 text-white relative`}>
           <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
           <div key={currentStep} className="relative z-10 w-40 h-40 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 flex items-center justify-center shadow-2xl animate-in zoom-in-50">{steps[currentStep].icon}</div>
           <div className="absolute bottom-6 left-8 text-6xl font-black opacity-10">0{currentStep + 1}</div>
        </div>
        <div className="flex-1 p-12 flex flex-col justify-between">
          <button onClick={onClose} className="absolute top-6 right-6 text-slate-300 hover:text-slate-900 transition-colors"><X size={24} /></button>
          <div className="flex-1 flex flex-col justify-center space-y-6">
             <div className="flex gap-1.5 mb-8">{steps.map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentStep ? 'w-8 bg-indigo-600' : 'w-1.5 bg-slate-200'}`}></div>)}</div>
             <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">{steps[currentStep].title}</h2>
             <p className="text-slate-500 text-lg leading-relaxed font-medium">{steps[currentStep].description}</p>
          </div>
          <div className="flex justify-between items-center mt-12">
             <button onClick={() => setCurrentStep(s => Math.max(0, s-1))} className="text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-900 transition-colors disabled:opacity-0" disabled={currentStep === 0}>Back</button>
             <button onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center gap-2">{currentStep === steps.length - 1 ? 'Get Started' : 'Continue'} <ArrowRight size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};