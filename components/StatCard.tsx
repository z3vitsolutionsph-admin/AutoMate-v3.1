import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  loading?: boolean;
  colorTheme?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'blue';
}

const THEME_STYLES = {
  indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
  emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  rose: 'text-rose-600 bg-rose-50 border-rose-100',
  amber: 'text-amber-600 bg-amber-50 border-amber-100',
  blue: 'text-blue-600 bg-blue-50 border-blue-100',
};

export const StatCard: React.FC<StatCardProps> = ({ 
  title, value, icon, trend, trendValue, loading = false, colorTheme = 'indigo' 
}) => {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 p-6 rounded-2xl animate-pulse">
        <div className="flex justify-between mb-4">
          <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
          <div className="w-16 h-6 bg-slate-100 rounded-full"></div>
        </div>
        <div className="space-y-2">
          <div className="w-24 h-8 bg-slate-100 rounded-lg"></div>
          <div className="w-32 h-4 bg-slate-100 rounded-md"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl border ${THEME_STYLES[colorTheme]} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-md border ${
            trend === 'up' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 
            trend === 'down' ? 'text-rose-600 bg-rose-50 border-rose-100' : 
            'text-slate-500 bg-slate-50 border-slate-200'
          }`}>
            {trend === 'up' && <TrendingUp size={10} />}
            {trend === 'down' && <TrendingDown size={10} />}
            {trend === 'neutral' && <Minus size={10} />}
            {trendValue}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</h3>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">{title}</p>
      </div>
    </div>
  );
};