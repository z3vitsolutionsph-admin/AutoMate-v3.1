import React from 'react';
import { UserRole } from '../types';

interface RoleShellProps {
  role: UserRole;
  children: React.ReactNode;
}

export const RoleShell: React.FC<RoleShellProps> = ({ role, children }) => {
  // Determine background based on role - Light Theme variants
  const renderBackground = () => {
    switch (role) {
      case UserRole.SUPERUSER:
        return (
          <div className="fixed inset-0 z-[-1] bg-slate-50 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-100/30 via-slate-50 to-slate-50"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-[0.4]"></div>
          </div>
        );
      case UserRole.ADMIN:
      case UserRole.ADMIN_PRO:
        return (
          <div className="fixed inset-0 z-[-1] bg-slate-50 overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-200/20 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50"></div>
          </div>
        );
      case UserRole.PROMOTER:
        return (
          <div className="fixed inset-0 z-[-1] bg-slate-50 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-amber-100/20 via-slate-50 to-slate-50"></div>
            <div className="absolute top-20 right-20 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px]"></div>
          </div>
        );
      case UserRole.EMPLOYEE:
      default:
        return (
          <div className="fixed inset-0 z-[-1] bg-slate-50 overflow-hidden">
            <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-emerald-100/20 to-transparent"></div>
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