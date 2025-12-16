import React, { useState } from 'react';
import { Users, DollarSign, Award, Target, Calculator, Calendar, CheckCircle2, Clock, XCircle, User, ArrowRight } from 'lucide-react';
import { StatCard } from './StatCard';
import { formatCurrency, PROMOTER_TIERS } from '../constants';

// Mock Data for Referrals
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
  
  // Calculate earnings dynamically
  const currentTier = PROMOTER_TIERS.slice().reverse().find(t => salesVolume >= t.minSales) || PROMOTER_TIERS[0];
  const baseCommission = salesVolume * currentTier.commissionRate;
  const recurringIncome = activeReferrals * 500; // Mock calculation: 500 PHP per active referral
  const bonus = salesVolume > 100000 ? 5000 : 0;
  const totalEarnings = baseCommission + recurringIncome + bonus;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Promoter Dashboard</h2>
          <p className="text-slate-400">Track referrals, commissions, and calculate potential earnings.</p>
        </div>
        <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-2">
          <span className="text-slate-400 text-sm">Current Tier:</span>
          <span className={`font-bold uppercase ${currentTier.color}`}>{currentTier.name}</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Referrals" value="124" icon={<Users size={20} />} trend="up" trendValue="12%" />
        <StatCard title="Total Earnings" value={formatCurrency(452500)} icon={<DollarSign size={20} />} trend="up" trendValue="8%" />
        <StatCard title="Conversion Rate" value="24.5%" icon={<Target size={20} />} trend="down" trendValue="2%" />
        <StatCard title="Active Links" value="8" icon={<Award size={20} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Calculator */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
              <Calculator size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Earnings Calculator</h3>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-slate-400">Monthly Sales Volume</label>
                <span className="text-white font-mono">{formatCurrency(salesVolume)}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1000000" 
                step="5000" 
                value={salesVolume}
                onChange={(e) => setSalesVolume(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>₱0</span>
                <span>₱1,000,000</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-slate-400">Active Referrals</label>
                <span className="text-white font-mono">{activeReferrals} clients</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="1" 
                value={activeReferrals}
                onChange={(e) => setActiveReferrals(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div className="bg-slate-900 rounded-xl p-4 space-y-3 border border-slate-700/50">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Commission Rate ({Math.round(currentTier.commissionRate * 100)}%)</span>
                <span className="text-white">{formatCurrency(baseCommission)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Recurring Income</span>
                <span className="text-white">{formatCurrency(recurringIncome)}</span>
              </div>
               <div className="flex justify-between text-sm">
                <span className="text-slate-400">Bonuses</span>
                <span className="text-emerald-400">{formatCurrency(bonus)}</span>
              </div>
              <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                <span className="font-bold text-white">Estimated Monthly</span>
                <span className="text-2xl font-bold text-cyan-400">{formatCurrency(totalEarnings)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Incentive Structure */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl">
           <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
              <Award size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Commission Tiers</h3>
          </div>
          
          <div className="space-y-4">
            {PROMOTER_TIERS.map((tier) => (
              <div 
                key={tier.name} 
                className={`p-4 rounded-lg border transition-all ${
                  currentTier.name === tier.name 
                    ? 'bg-slate-700/50 border-cyan-500/50 ring-1 ring-cyan-500/50' 
                    : 'bg-slate-900/30 border-slate-700/50 opacity-75'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className={`font-bold ${tier.color}`}>{tier.name} Tier</h4>
                    <p className="text-xs text-slate-400">Min Sales: {formatCurrency(tier.minSales)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-white">{tier.commissionRate * 100}%</span>
                    <p className="text-xs text-slate-400">Commission</p>
                  </div>
                </div>
                {/* Progress bar to next tier */}
                {currentTier.name === tier.name && tier.name !== 'Platinum' && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Progress to next tier</span>
                      <span>{Math.min(100, Math.round((salesVolume / PROMOTER_TIERS[PROMOTER_TIERS.indexOf(tier) + 1].minSales) * 100))}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-500 rounded-full" 
                        style={{ width: `${Math.min(100, (salesVolume / PROMOTER_TIERS[PROMOTER_TIERS.indexOf(tier) + 1].minSales) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Referrals Table */}
      <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Recent Referrals</h3>
              <p className="text-xs text-slate-400">Latest client signups via your link</p>
            </div>
          </div>
          <button className="flex items-center gap-2 text-sm text-cyan-400 hover:text-white font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800">
             View All <ArrowRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800/80">
                <th className="py-4 px-4 pl-0">Client Name</th>
                <th className="py-4 px-4">Date Joined</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-4 text-right pr-0">Commission</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-800/50">
              {RECENT_REFERRALS.map((ref) => (
                <tr key={ref.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="py-4 px-4 pl-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-all">
                        <User size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-cyan-400 transition-colors">{ref.clientName}</div>
                        <div className="text-[10px] text-slate-500">ID: REF-{202300 + ref.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-500" />
                      {new Date(ref.dateJoined).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${
                      ref.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      ref.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {ref.status === 'Active' && <CheckCircle2 size={12} />}
                      {ref.status === 'Pending' && <Clock size={12} />}
                      {ref.status === 'Cancelled' && <XCircle size={12} />}
                      {ref.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 pr-0 text-right">
                    <span className={`font-bold text-base ${ref.commission > 0 ? 'text-white' : 'text-slate-600'}`}>
                      {ref.commission > 0 ? formatCurrency(ref.commission) : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
