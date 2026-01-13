
import React, { useMemo, useState } from 'react';
import { DollarSign, Activity, Target, ShieldAlert, Sparkles, Loader2, BrainCircuit, X, Receipt, FileText, Search } from 'lucide-react';
import { formatCurrency } from '../constants';
import { Transaction, Product, UserRole } from '../types';
import { performDeepAnalysis } from '../services/geminiService';
import { StatCard } from './StatCard';

const aistudio = (window as any).aistudio;

export const Dashboard: React.FC<{ transactions: Transaction[], products: Product[], businessName: string, role: UserRole }> = ({ transactions, products, businessName, role }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const todaySales = useMemo(() => {
    const today = new Date().toDateString();
    return transactions.reduce((acc, curr) => 
      curr.status !== 'Refunded' && new Date(curr.date).toDateString() === today ? acc + curr.amount : acc, 0);
  }, [transactions]);

  const handleHealthCheck = async () => {
    setIsAnalyzing(true);
    try {
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) await aistudio.openSelectKey();
      }
      const result = await performDeepAnalysis(products, transactions, businessName);
      setAnalysisResult(result);
      setShowModal(true);
    } catch (err) {
      alert("We're having trouble checking your shop's health. Please try again in a moment.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span className="text-[10px] font-black text-slate-400 uppercase">Shop Online: {new Date().toLocaleDateString()}</span></div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">{role === UserRole.EMPLOYEE ? 'Staff Panel' : 'Manager Dashboard'}</h1>
        </div>
        {role !== UserRole.EMPLOYEE && (
          <button onClick={handleHealthCheck} disabled={isAnalyzing} className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95">
            {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            <span>Shop Health Check</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Today's Earnings" value={formatCurrency(todaySales)} icon={<DollarSign size={20}/>} trend="up" trendValue="12%" colorTheme="indigo" />
        <StatCard title="All Orders" value={transactions.length.toString()} icon={<Activity size={20}/>} colorTheme="blue" />
        <StatCard title="Efficiency Score" value="98.2%" icon={<Target size={20}/>} trend="up" trendValue="2%" colorTheme="emerald" />
        <StatCard title="Restock Alerts" value={products.filter(p => p.stock < 10).length.toString()} icon={<ShieldAlert size={20}/>} trend="down" trendValue="4" colorTheme="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
           <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"><h3 className="text-lg font-bold text-slate-900">Recent Sales</h3></div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100"><tr><th className="p-4 pl-6">Order No.</th><th className="p-4">Time</th><th className="p-4">Item</th><th className="p-4 text-right pr-6">Price</th></tr></thead>
                  <tbody className="text-sm divide-y divide-slate-50">
                      {transactions.slice(0, 8).map(item => (
                         <tr key={item.id} className="hover:bg-slate-50/50"><td className="p-4 pl-6 font-mono text-xs font-bold text-slate-500">{item.id.slice(0, 8)}</td><td className="p-4 text-slate-600">{new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}</td><td className="p-4 text-slate-900 font-medium">{item.product}</td><td className="p-4 text-right pr-6 font-bold text-slate-900">{formatCurrency(item.amount)}</td></tr>
                      ))}
                  </tbody>
              </table>
           </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
           <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>Live Activity</h3>
           <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar">
             {transactions.slice(0, 8).map((item, idx) => (
               <div key={idx} className="flex gap-4 group">
                   <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Receipt size={14} className="text-slate-400" /></div>
                   <div className="flex-1 min-w-0 border-b border-slate-50 pb-4 last:border-0">
                      <div className="flex justify-between items-start mb-0.5"><h4 className="text-slate-900 text-xs font-bold truncate">Item Sold</h4><span className="text-[10px] text-slate-400 font-bold">{new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}</span></div>
                      <p className="text-slate-500 text-[10px] truncate italic">"{item.product}"</p>
                   </div>
               </div>
             ))}
           </div>
        </div>
      </div>

      {showModal && analysisResult && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 relative">
              <div className="absolute top-0 right-0 p-6"><button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-full transition-all"><X size={24} /></button></div>
              <div className="p-10 md:p-14 overflow-y-auto space-y-8">
                 <div className="flex items-center gap-4"><div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 border border-indigo-100"><BrainCircuit size={32} /></div><div><h2 className="text-2xl font-black text-slate-900 tracking-tight">Shop Health Check</h2><p className="text-indigo-600 text-[10px] font-black uppercase">Simple advice for your business</p></div></div>
                 <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 italic text-slate-600 text-lg leading-relaxed">"{analysisResult.summary}"</div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4"><h3 className="text-[10px] font-black uppercase text-slate-400">What to do next</h3><div className="space-y-2">{analysisResult.recommendations.map((rec: string, i: number) => (<div key={i} className="flex gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm"><span className="text-indigo-600 font-bold">{i+1}</span><p className="text-slate-600 text-xs font-medium">{rec}</p></div>))}</div></div>
                    <div className="space-y-6"><div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl"><h3 className="text-rose-600 text-[10px] font-black uppercase mb-3 flex items-center gap-2">Points of Caution</h3><p className="text-rose-900 text-xs font-bold leading-relaxed">{analysisResult.riskFactor}</p></div><div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg"><h3 className="text-white/70 text-[10px] font-black uppercase mb-3">Growth Tips</h3><div className="space-y-3">{analysisResult.opportunities.map((opp: string, i: number) => (<div key={i} className="flex items-center gap-3 text-xs font-bold"><div className="w-1 h-1 rounded-full bg-indigo-300"></div>{opp}</div>))}</div></div></div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
