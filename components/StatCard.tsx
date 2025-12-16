import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  subtext?: string;
  colorTheme?: 'cyan' | 'purple' | 'emerald' | 'amber' | 'rose' | 'blue';
}

const THEME_STYLES = {
  cyan: {
    bg: 'from-cyan-500/10 to-blue-500/5',
    icon: 'text-cyan-400 bg-cyan-400/10',
    border: 'border-cyan-500/20 hover:border-cyan-500/40',
    text: 'text-cyan-400',
    glow: 'shadow-cyan-500/10'
  },
  purple: {
    bg: 'from-purple-500/10 to-pink-500/5',
    icon: 'text-purple-400 bg-purple-400/10',
    border: 'border-purple-500/20 hover:border-purple-500/40',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/10'
  },
  emerald: {
    bg: 'from-emerald-500/10 to-teal-500/5',
    icon: 'text-emerald-400 bg-emerald-400/10',
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/10'
  },
  amber: {
    bg: 'from-amber-500/10 to-orange-500/5',
    icon: 'text-amber-400 bg-amber-400/10',
    border: 'border-amber-500/20 hover:border-amber-500/40',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/10'
  },
  rose: {
    bg: 'from-rose-500/10 to-red-500/5',
    icon: 'text-rose-400 bg-rose-400/10',
    border: 'border-rose-500/20 hover:border-rose-500/40',
    text: 'text-rose-400',
    glow: 'shadow-rose-500/10'
  },
  blue: {
    bg: 'from-blue-500/10 to-indigo-500/5',
    icon: 'text-blue-400 bg-blue-400/10',
    border: 'border-blue-500/20 hover:border-blue-500/40',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/10'
  }
};

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  trend, 
  trendValue, 
  subtext,
  colorTheme = 'blue' 
}) => {
  const styles = THEME_STYLES[colorTheme];

  return (
    <div className={`relative overflow-hidden bg-slate-900/40 backdrop-blur-md border ${styles.border} p-5 rounded-2xl shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${styles.glow} group`}>
      {/* Background Gradient Blob */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${styles.bg} blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
      
      <div className="relative z-10 flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl ${styles.icon}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-slate-950/50 border border-slate-800 ${
            trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-slate-400'
          }`}>
            {trend === 'up' && <TrendingUp size={12} />}
            {trend === 'down' && <TrendingDown size={12} />}
            {trend === 'neutral' && <Minus size={12} />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>

      <div className="relative z-10">
        <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mt-1">{title}</p>
        {subtext && <p className="text-slate-500 text-xs mt-2">{subtext}</p>}
      </div>
      
      {/* Decorative Bottom Bar */}
      <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${styles.bg} opacity-20`}></div>
    </div>
  );
};