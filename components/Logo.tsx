import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="grad_a" x1="20" y1="85" x2="80" y2="15" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2563eb" /> {/* blue-600 */}
        <stop offset="1" stopColor="#0ea5e9" /> {/* cyan-500 */}
      </linearGradient>
      <linearGradient id="grad_swoosh" x1="15" y1="50" x2="95" y2="35" gradientUnits="userSpaceOnUse">
        <stop stopColor="#06b6d4" />
        <stop offset="1" stopColor="#60a5fa" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    {/* A Shape with hole */}
    <path 
      fillRule="evenodd" 
      clipRule="evenodd" 
      d="M50 15L20 85H35L42.5 65H57.5L65 85H80L50 15ZM50 38L45 53H55L50 38Z" 
      fill="url(#grad_a)" 
    />
    
    {/* Orbit Swoosh */}
    <path 
      d="M15 65 C 5 65, 5 45, 25 35 C 50 22, 85 22, 95 45" 
      stroke="url(#grad_swoosh)" 
      strokeWidth="5" 
      strokeLinecap="round" 
    />
    
    {/* Star */}
    <path 
      d="M85 15 L88 22 L95 25 L88 28 L85 35 L82 28 L75 25 L82 22 Z" 
      fill="#fbbf24" 
      filter="url(#glow)"
    />
  </svg>
);
