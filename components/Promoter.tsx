import React, { useState } from 'react';
import { Users, DollarSign, Award, Target, Calculator, Calendar, CheckCircle2, Clock, XCircle, User, ArrowRight } from 'lucide-react';
import { StatCard } from './StatCard';
import { formatCurrency, PROMOTER_TIERS } from '../constants';

interface Referral {
  id: number;
  clientName: string;
  dateJoined: string;
  status: 'Active' | 'Pending' | 'Cancelled';
  commission: number;
}

const RECENT_REFERRALS: Referral[] = [
  { id: 1, clientName: "Nexus Industries", dateJoined: "2023-11-15", status: "Active", commission: 2500 },
  { id: 2, clientName: "Solaris Tech", dateJoined: "2023-11-12", status: "Pending", commission: 0 },
  { id: 3, clientName: "Apex Logistics", dateJoined: "2023-11-10", status: "Active", commission: 4200 },
  { id: 4, clientName: "Quantum Soft", dateJoined: "2023-11-05", status: "Active", commission: 1800 },
  { id: 5, clientName: "Blue Horizon", dateJoined: "2023-10-28", status: "Cancelled", commission: 0 },
];

export const Promoter: React.FC = () => {
  const [salesVolume, setSalesVolume] = useState(50000);
  const [activeReferrals, setActiveReferrals] = useState(10);
  
  const currentTier = PROMOTER_TIERS.slice().reverse().find(t => salesVolume >= t.minSales) || PROMOTER_TIERS[0];
  const baseCommission = salesVolume * currentTier.commissionRate;
  const recurringIncome = activeReferrals * 500; 
  const bonus = salesVolume > 100000 ? 5000 : 0;
  const totalEarnings = baseCommission + recurringIncome + bonus;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Affiliate Hub</h2>
          <p className="text-slate-500 text-sm mt-1">Manage referrals, track earnings, and optimize your network.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-3 shadow-sm">
          <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Active Rank:</span>
          <span className="font-black text-indigo-600 uppercase text-xs tracking-widest">{currentTier.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Referrals" value="124" icon={<Users size={20} />} trend="up" trendValue="12%" colorTheme="blue" />
        <StatCard title="Accrued Earnings" value={formatCurrency(452500)} icon={<DollarSign size={20} />} trend="up" trendValue="8%" colorTheme="indigo" />
        <StatCard title="Conversion" value="24.5%" icon={<Target size={20} />} trend="neutral" trendValue="0%" colorTheme="emerald" />
        <StatCard title="Global Rank" value="Top 5%" icon={<Award size={20} />} colorTheme="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 border border-indigo-100"><Calculator size={24} /></div>
            <h3 className="text-xl font-bold text-slate-900">Earnings Estimator</h3>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Target</label><span className="text-slate-900 font-black">{formatCurrency(salesVolume)}</span></div>
              <input type="range" min="0" max="1000000" step="5000" value={salesVolume} onChange={(e) => setSalesVolume(Number(e.target.value))} className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Base</label><span className="text-slate-900 font-black">{activeReferrals} Active</span></div>
              <input type="range" min="0" max="100" step="1" value={activeReferrals} onChange={(e) => setActiveReferrals(Number(e.target.value))} className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600" />
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
              <div className="flex justify-between text-xs font-bold text-slate-500"><span>Rate ({Math.round(currentTier.commissionRate * 100)}%)</span><span className="text-slate-900">{formatCurrency(baseCommission)}</span></div>
              <div className="flex justify-between text-xs font-bold text-slate-500"><span>Recurring</span><span className="text-slate-900">{formatCurrency(recurringIncome)}</span></div>
              <div className="pt-4 border-t border-slate-200 flex justify-between items-center"><span className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Est. Monthly Payload</span><span className="text-3xl font-black text-indigo-600">{formatCurrency(totalEarnings)}</span></div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
           <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 border border-amber-100"><Award size={24} /></div>
            <h3 className="text-xl font-bold text-slate-900">Rank Structure</h3>
          </div>
          
          <div className="space-y-4">
            {PROMOTER_TIERS.map((tier) => (
              <div key={tier.name} className={`p-5 rounded-2xl border transition-all ${currentTier.name === tier.name ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-100 opacity-60'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">{tier.name} Tier</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">Target: {formatCurrency(tier.minSales)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900">{tier.commissionRate * 100}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-900">Recent Referrals</h3>
          <button className="text-xs font-black text-indigo-600 uppercase tracking-widest">History Log</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50/30">
                <th className="p-6">Client Identity</th>
                <th className="p-6">Registry Date</th>
                <th className="p-6 text-center">Protocol State</th>
                <th className="p-6 text-right">Commission</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-50">
              {RECENT_REFERRALS.map((ref) => (
                <tr key={ref.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-6"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400"><User size={20} /></div><span className="font-bold text-slate-900">{ref.clientName}</span></div></td>
                  <td className="p-6 text-slate-500 font-medium">{new Date(ref.dateJoined).toLocaleDateString()}</td>
                  <td className="p-6 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${ref.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : ref.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>{ref.status}</span></td>
                  <td className="p-6 text-right font-bold text-slate-900">{ref.commission > 0 ? formatCurrency(ref.commission) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};