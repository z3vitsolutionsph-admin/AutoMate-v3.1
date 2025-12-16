import React from 'react';
import { UserRole } from '../types';

interface RoleShellProps {
  role: UserRole;
  children: React.ReactNode;
}

export const RoleShell: React.FC<RoleShellProps> = ({ role, children }) => {
  // Determine background based on role
  const renderBackground = () => {
    switch (role) {
      case UserRole.SUPERUSER:
        return (
          <div className="fixed inset-0 z-[-1] bg-slate-950 overflow-hidden">
             {/* Network / Futuristic Theme */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-[0.03]"></div>
            {/* Animated Particles (CSS Dots) */}
            {[...Array(20)].map((_, i) => (
              <div 
                key={i}
                className="absolute bg-cyan-500/30 rounded-full blur-sm animate-float"
                style={{
                  width: Math.random() * 6 + 2 + 'px',
                  height: Math.random() * 6 + 2 + 'px',
                  top: Math.random() * 100 + '%',
                  left: Math.random() * 100 + '%',
                  animationDuration: Math.random() * 10 + 10 + 's',
                  animationDelay: Math.random() * 5 + 's'
                }}
              />
            ))}
          </div>
        );
      case UserRole.ADMIN:
      case UserRole.ADMIN_PRO:
        return (
          <div className="fixed inset-0 z-[-1] bg-slate-950 overflow-hidden">
            {/* Wave / Gradient Theme */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 opacity-90"></div>
          </div>
        );
      case UserRole.PROMOTER:
        return (
          <div className="fixed inset-0 z-[-1] bg-slate-950 overflow-hidden">
             {/* Amber / Marketing Theme */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-900/10 via-slate-950 to-slate-950"></div>
            <div className="absolute top-20 right-20 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px]"></div>
          </div>
        );
      case UserRole.EMPLOYEE:
      default:
        return (
          <div className="fixed inset-0 z-[-1] bg-slate-950 overflow-hidden">
             {/* Emerald / Teal Variant */}
            <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-emerald-900/10 to-transparent"></div>
             {/* Floating Cubes (Squares) */}
             {[...Array(6)].map((_, i) => (
              <div 
                key={i}
                className="absolute border border-emerald-500/10 bg-emerald-500/5 rounded-lg animate-float-delayed"
                style={{
                  width: Math.random() * 40 + 20 + 'px',
                  height: Math.random() * 40 + 20 + 'px',
                  top: Math.random() * 80 + 10 + '%',
                  left: Math.random() * 80 + 10 + '%',
                  transform: `rotate(${Math.random() * 45}deg)`,
                  animationDuration: Math.random() * 15 + 10 + 's'
                }}
              />
            ))}
          </div>
        );
    }
  };

  return (
    <>
      {renderBackground()}
      <div className="relative z-10 min-h-screen">
        {children}
      </div>
    </>
  );
};
