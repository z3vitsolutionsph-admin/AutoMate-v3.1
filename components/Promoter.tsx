
import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Award, Target, Calculator, Copy, Check, User, ArrowRight, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { StatCard } from './StatCard';
import { formatCurrency, PROMOTER_TIERS } from '../constants';
import { Referral } from '../types';

export const Promoter: React.FC = () => {
  // State for dynamic data (fetching simulation)
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState(`https://automate.ph/ref/${Math.random().toString(36).substring(7)}`);
  const [isCopied, setIsCopied] = useState(false);

  // Estimator State
  const [salesVolume, setSalesVolume] = useState(50000);
  const [activeReferralsCount, setActiveReferralsCount] = useState(10);
  
  // Stats Calculation based on Estimator
  const currentTier = PROMOTER_TIERS.slice().reverse().find(t => salesVolume >= t.minSales) || PROMOTER_TIERS[0];
  const baseCommission = salesVolume * currentTier.commissionRate;
  const recurringIncome = activeReferralsCount * 500; 
  const bonus = salesVolume > 100000 ? 5000 : 0;
  const totalEarnings = baseCommission + recurringIncome + bonus;

  // Real Stats from Data
  const realActiveReferrals = referrals.filter(r => r.status === 'Active').length;
  const realTotalCommission = referrals.reduce((acc, curr) => acc + curr.commission, 0);
  const realConversionRate = referrals.length > 0 ? ((realActiveReferrals / referrals.length) * 100).toFixed(1) : '0.0';

  useEffect(() => {
    // Simulate Fetching Data from Backend
    const fetchReferrals = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Simulate API network delay
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // Return empty array initially to respect "Remove mock data" request
        // In a real scenario, this would be: const { data } = await supabase.from('referrals').select('*');
        setReferrals([]); 
      } catch (err) {
        console.error("Failed to load referral nodes:", err);
        setError("Unable to synchronize referral ledger. Network node unreachable.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReferrals();
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const retryFetch = () => {
    window.location.reload(); // Simple retry strategy for now
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-in fade-in">
        <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center text-rose-500 shadow-xl border border-rose-100">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sync Failure</h2>
          <p className="text-slate-500 max-w-sm mx-auto font-medium">{error}</p>
        </div>
        <button onClick={retryFetch} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
          <RefreshCw size={16} /> Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Affiliate Hub</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Manage referrals, track earnings, and optimize your network.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="bg-white px-5 py-2.5 rounded-xl border border-slate-200 flex items-center gap-3 shadow-sm">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Active Rank:</span>
            <span className="font-black text-indigo-600 uppercase text-xs tracking-widest">{currentTier.name}</span>
          </div>
          <button 
             onClick={handleCopyLink}
             className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            {isCopied ? <Check size={16} /> : <Copy size={16} />}
            {isCopied ? 'Link Copied' : 'Copy Link'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Referrals" 
          value={isLoading ? '-' : referrals.length.toString()} 
          icon={<Users size={20} />} 
          loading={isLoading}
          colorTheme="blue" 
        />
        <StatCard 
          title="Accrued Earnings" 
          value={isLoading ? '-' : formatCurrency(realTotalCommission)} 
          icon={<DollarSign size={20} />} 
          loading={isLoading}
          colorTheme="indigo" 
        />
        <StatCard 
          title="Conversion Rate" 
          value={isLoading ? '-' : `${realConversionRate}%`} 
          icon={<Target size={20} />} 
          loading={isLoading}
          colorTheme="emerald" 
        />
        <StatCard 
          title="Global Rank" 
          value="Top 5%" 
          icon={<Award size={20} />} 
          colorTheme="amber" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-8 hover:border-indigo-200 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 border border-indigo-100"><Calculator size={24} /></div>
            <h3 className="text-xl font-bold text-slate-900">Earnings Estimator</h3>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Sales Volume</label><span className="text-slate-900 font-black">{formatCurrency(salesVolume)}</span></div>
              <input type="range" min="0" max="1000000" step="5000" value={salesVolume} onChange={(e) => setSalesVolume(Number(e.target.value))} className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Client Nodes</label><span className="text-slate-900 font-black">{activeReferralsCount} Active</span></div>
              <input type="range" min="0" max="100" step="1" value={activeReferralsCount} onChange={(e) => setActiveReferralsCount(Number(e.target.value))} className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600" />
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
              <div className="flex justify-between text-xs font-bold text-slate-500"><span>Rate ({Math.round(currentTier.commissionRate * 100)}%)</span><span className="text-slate-900">{formatCurrency(baseCommission)}</span></div>
              <div className="flex justify-between text-xs font-bold text-slate-500"><span>Recurring Base</span><span className="text-slate-900">{formatCurrency(recurringIncome)}</span></div>
              <div className="pt-4 border-t border-slate-200 flex justify-between items-center"><span className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Est. Monthly Payload</span><span className="text-3xl font-black text-indigo-600 tracking-tighter">{formatCurrency(totalEarnings)}</span></div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6 hover:border-amber-200 transition-colors">
           <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 border border-amber-100"><Award size={24} /></div>
            <h3 className="text-xl font-bold text-slate-900">Rank Structure</h3>
          </div>
          
          <div className="space-y-4">
            {PROMOTER_TIERS.map((tier) => (
              <div key={tier.name} className={`p-5 rounded-2xl border transition-all ${currentTier.name === tier.name ? 'border-indigo-200 bg-indigo-50/50 shadow-sm' : 'border-slate-100 opacity-60 hover:opacity-100'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest flex items-center gap-2">
                       {tier.name} Tier
                       {currentTier.name === tier.name && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"/>}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">Min. Target: {formatCurrency(tier.minSales)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">{tier.commissionRate * 100}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden min-h-[300px] flex flex-col">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-900">Recent Referrals</h3>
          <button className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors">History Log</button>
        </div>
        
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <Loader2 size={32} className="text-indigo-600 animate-spin mb-4" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Synchronizing Ledger...</p>
          </div>
        ) : referrals.length > 0 ? (
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
                {referrals.map((ref) => (
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
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-6">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200 text-slate-300">
               <Users size={32} />
            </div>
            <div className="space-y-2">
               <h3 className="text-xl font-black text-slate-900">No Referrals Active</h3>
               <p className="text-slate-400 text-sm max-w-xs mx-auto">Share your unique affiliate link to start building your network node and earning commissions.</p>
            </div>
            <button onClick={handleCopyLink} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all">
               Start Campaign
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
