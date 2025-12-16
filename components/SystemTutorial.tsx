
import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, LayoutDashboard, Package, ShoppingCart, BarChart3, Bot, Zap, ArrowRight, Check } from 'lucide-react';

interface SystemTutorialProps {
  onClose: () => void;
}

export const SystemTutorial: React.FC<SystemTutorialProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to AutoMate",
      description: "Your intelligent Point of Sale & Inventory partner. Experience a seamless workflow designed to empower your business operations from day one.",
      icon: <div className="text-5xl font-black tracking-tighter text-white drop-shadow-lg">AM</div>,
      color: "from-blue-600 to-indigo-600",
      accent: "bg-blue-500",
      shadow: "shadow-blue-500/50"
    },
    {
      title: "Real-Time Dashboard",
      description: "Your command center. Instantly track revenue, monitor active orders, and spot low stock alerts. Get a pulse on your business performance the moment you log in.",
      icon: <LayoutDashboard size={56} className="text-white drop-shadow-md" />,
      color: "from-cyan-500 to-blue-600",
      accent: "bg-cyan-500",
      shadow: "shadow-cyan-500/50"
    },
    {
      title: "Smart Inventory",
      description: "Catalog management reimagined. Track suppliers, batch update stocks, and leverage AI analysis for intelligent restocking suggestions based on sales velocity.",
      icon: <Package size={56} className="text-white drop-shadow-md" />,
      color: "from-amber-500 to-orange-600",
      accent: "bg-amber-500",
      shadow: "shadow-amber-500/50"
    },
    {
      title: "Seamless POS",
      description: "Process sales at lightning speed. Integrated barcode scanning, flexible payment methods (Cash, Card, QR), and instant receipt generation keep queues moving.",
      icon: <ShoppingCart size={56} className="text-white drop-shadow-md" />,
      color: "from-emerald-500 to-teal-600",
      accent: "bg-emerald-500",
      shadow: "shadow-emerald-500/50"
    },
    {
      title: "Deep Analytics",
      description: "Data-driven growth. Visual reporting tools break down sales trends, top-performing categories, and peak hours to help you make smarter decisions.",
      icon: <BarChart3 size={56} className="text-white drop-shadow-md" />,
      color: "from-violet-600 to-purple-600",
      accent: "bg-violet-500",
      shadow: "shadow-violet-500/50"
    },
    {
      title: "AI Assistant",
      description: "Your 24/7 business consultant. Ask questions about system features, get inventory insights, or draft support emails instantly with our built-in AI.",
      icon: <Bot size={56} className="text-white drop-shadow-md" />,
      color: "from-pink-500 to-rose-600",
      accent: "bg-pink-500",
      shadow: "shadow-pink-500/50"
    },
    {
      title: "Ready to Launch",
      description: "You're all set! Configure your store settings, invite your team, and start selling. AutoMate is here to support your growth journey.",
      icon: <Zap size={56} className="text-white drop-shadow-md" />,
      color: "from-yellow-400 to-amber-500",
      accent: "bg-yellow-500",
      shadow: "shadow-yellow-500/50"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const stepData = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
      
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-500" onClick={onClose} />

      <div className="w-full max-w-5xl bg-[#09090b] border border-[#27272a] rounded-3xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row min-h-[550px] animate-in zoom-in-95 duration-300 z-10 group">
        
        {/* Left: Graphic Side */}
        <div className={`relative w-full md:w-[45%] overflow-hidden transition-all duration-700 bg-gradient-to-br ${stepData.color}`}>
           {/* Abstract Shapes/Background Pattern */}
           <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent"></div>
           <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-[80px] animate-pulse"></div>
           <div className="absolute bottom-0 right-0 w-80 h-80 bg-black/20 rounded-full blur-[80px]"></div>
           
           <div className="absolute inset-0 flex items-center justify-center p-12">
             {/* Icon Container with Glass Effect */}
             <div key={currentStep} className={`relative w-40 h-40 rounded-[2rem] bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl animate-in zoom-in-50 duration-500 ring-1 ring-white/20 ${stepData.shadow}`}>
               <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-[2rem]"></div>
               <div className="relative z-10 transform transition-transform duration-500 hover:scale-110">
                 {stepData.icon}
               </div>
               
               {/* Decorative Particles */}
               <div className="absolute -top-4 -right-4 w-8 h-8 bg-white/20 rounded-full blur-md"></div>
               <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-white/10 rounded-full blur-sm"></div>
             </div>
           </div>

           {/* Step Number Big Watermark */}
           <div className="absolute bottom-6 left-8 text-[10rem] font-black text-white/10 select-none leading-none tracking-tighter mix-blend-overlay">
             0{currentStep + 1}
           </div>
        </div>

        {/* Right: Content Side */}
        <div className="flex-1 p-8 md:p-14 flex flex-col relative bg-[#18181b]">
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full text-zinc-500 hover:text-white hover:bg-[#27272a] transition-all"
          >
            <X size={24} />
          </button>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mb-10">
             {steps.map((_, idx) => (
               <button 
                 key={idx}
                 onClick={() => setCurrentStep(idx)}
                 className={`h-1.5 rounded-full transition-all duration-500 ${
                   idx === currentStep 
                     ? `w-12 ${stepData.accent}` 
                     : idx < currentStep 
                       ? 'w-2 bg-zinc-600 hover:bg-zinc-500'
                       : 'w-2 bg-zinc-800 hover:bg-zinc-700'
                 }`}
               />
             ))}
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <div key={currentStep} className="animate-in slide-in-from-right-8 fade-in duration-500">
               <h2 className="text-4xl font-bold text-white mb-6 tracking-tight">
                 {stepData.title}
               </h2>
               <p className="text-zinc-400 text-lg leading-relaxed font-light">
                 {stepData.description}
               </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-12 flex items-center justify-between">
            <button 
               onClick={handlePrev}
               disabled={currentStep === 0}
               className={`text-sm font-bold flex items-center gap-2 transition-colors px-4 py-2 rounded-lg ${
                 currentStep === 0 ? 'text-zinc-800 cursor-not-allowed' : 'text-zinc-400 hover:text-white hover:bg-[#27272a]'
               }`}
            >
               <ChevronLeft size={18} /> Back
            </button>

            <button 
               onClick={handleNext}
               className={`group relative px-8 py-4 rounded-2xl font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-3 overflow-hidden ${
                 currentStep === steps.length - 1 
                   ? 'bg-white text-black hover:bg-zinc-100' 
                   : 'bg-[#27272a] text-white border border-[#3f3f46] hover:bg-[#3f3f46] hover:border-zinc-500'
               }`}
            >
               {/* Button Text */}
               <span className="relative z-10 flex items-center gap-2">
                 {currentStep === steps.length - 1 ? 'Get Started' : 'Next Step'}
                 {currentStep !== steps.length - 1 ? <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /> : <Check size={18} />}
               </span>
               
               {/* Shine Effect */}
               {currentStep === steps.length - 1 && (
                  <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-black/5 to-transparent z-0"></div>
               )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
