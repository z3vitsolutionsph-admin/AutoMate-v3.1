import React from 'react';

export const Logo: React.FC<{ className?: string, showText?: boolean }> = ({ className = "w-10 h-10", showText = false }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-auto drop-shadow-sm">
      <defs>
        <linearGradient id="logo_grad_indigo" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="1" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="logo_grad_emerald" x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <filter id="node_glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Main Structural 'A' - Left Pillar (Core Ledger) */}
      <path d="M35 85V35L50 15" stroke="url(#logo_grad_indigo)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Right Pillar - Barcode Pattern (Inventory/POS) */}
      <path d="M65 85V45" stroke="#0F172A" strokeWidth="8" strokeLinecap="round" />
      <path d="M78 85V55" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
      <path d="M54 85V30" stroke="#0F172A" strokeWidth="6" strokeLinecap="round" />

      {/* Neural Link - The Spark (Intelligence) */}
      <circle cx="50" cy="15" r="6" fill="url(#logo_grad_emerald)" filter="url(#node_glow)">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
      </circle>
      
      {/* Connector Line */}
      <path d="M50 15L65 45" stroke="url(#logo_grad_indigo)" strokeWidth="2" strokeDasharray="4 4" />
    </svg>
    {showText && (
      <div className="flex flex-col leading-none">
        <span className="text-xl font-black text-slate-900 tracking-tighter flex items-center">
          AutoMate<span className="text-[10px] font-bold self-start ml-0.5 text-indigo-500">™</span>
        </span>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Intelligence</span>
      </div>
    )}
  </div>
);