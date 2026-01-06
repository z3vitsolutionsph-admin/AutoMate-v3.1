
import React, { useMemo, useState } from 'react';
import { DollarSign, Clock, Users, Flame, AlertCircle, ArrowUpRight, Search, Bell, Receipt, History, UserCheck, Calendar, Check, ScrollText, FileText, Download, Sparkles, Loader2, BrainCircuit, X, TrendingUp, ShieldAlert, Target, Zap, Activity } from 'lucide-react';
import { formatCurrency } from '../constants';
import { Transaction, Product, UserRole } from '../types';
import { performDeepAnalysis } from '../services/geminiService';
import { StatCard } from './StatCard';

// Safely access window for AI Studio helpers
const aistudio = (window as any).aistudio;

interface DashboardProps {
  transactions: Transaction[];
  products: Product[];
  businessName: string;
  role: UserRole;
}

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
}

const JournalModal: React.FC<JournalModalProps> = ({ isOpen, onClose, transactions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen) return null;

  const filteredTransactions = transactions.filter(t => 
    t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.category && t.category.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
       <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-sm"><FileText size={24} /></div>
                <div>
                   <h3 className="text-xl font-black text-slate-900 tracking-tight">Transaction Journal</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Ledger History</p>
                </div>
             </div>
             <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"><X size={20}/></button>
          </div>
          
          <div className="p-6 border-b border-slate-100 bg-white">
             <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                <input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-400"
                  placeholder="Search by ID, Product, or Category..."
                  autoFocus
                />
             </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar p-0 bg-slate-50/30">
             <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10 shadow-sm">
                   <tr>
                      <th className="p-5 pl-8 border-b border-slate-100">Reference</th>
                      <th className="p-5 border-b border-slate-100">Timestamp</th>
                      <th className="p-5 border-b border-slate-100">Details</th>
                      <th className="p-5 border-b border-slate-100">Method</th>
                      <th className="p-5 pr-8 text-right border-b border-slate-100">Amount</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm bg-white">
                   {filteredTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-indigo-50/30 transition-colors group">
                         <td className="p-5 pl-8 font-mono text-xs font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">{t.id}</td>
                         <td className="p-5 text-slate-600 font-medium">
                            <div className="flex flex-col">
                               <span>{new Date(t.date).toLocaleDateString()}</span>
                               <span className="text-[10px] text-slate-400 font-bold">{new Date(t.date).toLocaleTimeString()}</span>
                            </div>
                         </td>
                         <td className="p-5">
                            <div className="flex items-center">
                               <span className="font-bold text-slate-900">{t.product}</span>
                               {t.quantity && t.quantity > 1 && <span className="ml-2 text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">x{t.quantity}</span>}
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{t.category}</span>
                         </td>
                         <td className="p-5 text-slate-500 font-medium">
                            <span className="px-3 py-1 rounded-full bg-slate-50 text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 group-hover:border-indigo-100 group-hover:text-indigo-500 transition-colors">
                               {t.paymentMethod || 'Cash'}
                            </span>
                         </td>
                         <td className="p-5 pr-8 text-right font-black text-slate-900">{formatCurrency(t.amount)}</td>
                      </tr>
                   ))}
                   {filteredTransactions.length === 0 && (
                      <tr><td colSpan={5} className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No entries found matching query</td></tr>
                   )}
                </tbody>
             </table>
          </div>
          
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-center flex justify-between items-center px-8">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showing {filteredTransactions.length} Records</p>
             <button onClick={onClose} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest">Close Journal</button>
          </div>
       </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ transactions, products, businessName, role }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showJournal, setShowJournal] = useState(false);

  const isEmployee = role === UserRole.EMPLOYEE;

  const todaySales = useMemo(() => {
    const today = new Date().toDateString();
    return transactions.reduce((acc, curr) => 
      curr.status !== 'Refunded' && new Date(curr.date).toDateString() === today ? acc + curr.amount : acc, 0);
  }, [transactions]);

  const activityFeed = useMemo(() => 
    transactions.map(t => ({
      id: t.id,
      title: 'Sale Voucher',
      time: new Date(t.date),
      details: `${t.quantity || 1}x ${t.product}`,
      amount: t.amount
    })).sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 8), [transactions]);

  const handleDeepScan = async () => {
    setIsAnalyzing(true);
    try {
      // Key Check
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) await aistudio.openSelectKey();
      }

      const result = await performDeepAnalysis(products, transactions, businessName);
      setAnalysisResult(result);
      setShowAnalysisModal(true);
    } catch (err) {
      console.error(err);
      alert("Intelligence Audit failed. Please ensure API Key is active.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Active: {new Date().toLocaleDateString()}</span>
           </div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">{isEmployee ? 'POS Dashboard' : 'Executive Dashboard'}</h1>
        </div>
        
        {!isEmployee && (
          <button 
            onClick={handleDeepScan}
            disabled={isAnalyzing}
            className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95"
          >
            {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            <span>Intelligence Audit</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Daily Revenue" value={formatCurrency(todaySales)} icon={<DollarSign size={20}/>} trend="up" trendValue="12%" colorTheme="indigo" />
        <StatCard title="Total Transactions" value={transactions.length.toString()} icon={<Activity size={20}/>} trend="neutral" trendValue="0%" colorTheme="blue" />
        <StatCard title="Efficiency" value="98.2%" icon={<Target size={20}/>} trend="up" trendValue="2%" colorTheme="emerald" />
        <StatCard title="Low Stock Items" value={products.filter(p => p.stock < 10).length.toString()} icon={<ShieldAlert size={20}/>} trend="down" trendValue="4" colorTheme="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">Recent Transactions</h3>
                <button 
                  onClick={() => setShowJournal(true)} 
                  className="text-xs font-bold text-indigo-600 hover:underline hover:text-indigo-700 transition-colors"
                >
                  View Journal
                </button>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <tr><th className="p-4 pl-6">Ref ID</th><th className="p-4">Time</th><th className="p-4">Details</th><th className="p-4 text-right pr-6">Value</th></tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-50">
                        {activityFeed.length > 0 ? activityFeed.map(item => (
                           <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                               <td className="p-4 pl-6 font-mono text-xs text-slate-500 font-bold">{item.id.slice(0, 10)}</td>
                               <td className="p-4 text-slate-600">{item.time.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}</td>
                               <td className="p-4 text-slate-900 font-medium">{item.details}</td>
                               <td className="p-4 text-right pr-6 font-bold text-slate-900">{formatCurrency(item.amount)}</td>
                           </tr>
                        )) : (<tr><td colSpan={4} className="p-12 text-center text-slate-400 text-xs font-bold">No sessions found</td></tr>)}
                    </tbody>
                </table>
             </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                Activity Pulse
              </h3>
              <div className="space-y-6">
                {activityFeed.map((item, idx) => (
                  <div key={idx} className="flex gap-4 group">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        <Receipt size={14} className="text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0 border-b border-slate-50 pb-4 last:border-0">
                         <div className="flex justify-between items-start mb-0.5">
                           <h4 className="text-slate-900 text-xs font-bold truncate">{item.title}</h4>
                           <span className="text-[10px] text-slate-400 font-bold">{item.time.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}</span>
                         </div>
                         <p className="text-slate-500 text-[10px] truncate italic">"{item.details}"</p>
                      </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>

      {showJournal && (
        <JournalModal 
          isOpen={showJournal} 
          onClose={() => setShowJournal(false)} 
          transactions={transactions} 
        />
      )}

      {showAnalysisModal && analysisResult && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 relative">
              <div className="absolute top-0 right-0 p-6"><button onClick={() => setShowAnalysisModal(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-all bg-slate-50 rounded-full"><X size={24} /></button></div>
              <div className="p-10 md:p-14 overflow-y-auto space-y-8">
                 <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 border border-indigo-100"><BrainCircuit size={32} /></div>
                    <div><h2 className="text-2xl font-black text-slate-900 tracking-tight">Intelligence Audit</h2><p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest">Neural Layer v4.2 Synchronized</p></div>
                 </div>

                 <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 italic text-slate-600 text-lg leading-relaxed">
                   "{analysisResult.summary}"
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Directives</h3>
                       <div className="space-y-2">
                          {analysisResult.recommendations.map((rec: string, i: number) => (
                             <div key={i} className="flex gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                <span className="text-indigo-600 font-bold">0{i+1}</span>
                                <p className="text-slate-600 text-xs font-medium">{rec}</p>
                             </div>
                          ))}
                       </div>
                    </div>
                    
                    <div className="space-y-6">
                       <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl">
                          <h3 className="text-rose-600 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2"><ShieldAlert size={14} /> Critical Risks</h3>
                          <p className="text-rose-900 text-xs font-bold leading-relaxed">{analysisResult.riskFactor}</p>
                       </div>
                       <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg shadow-indigo-200">
                          <h3 className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-3">Scale Vectors</h3>
                          <div className="space-y-3">
                             {analysisResult.opportunities.map((opp: string, i: number) => (
                                <div key={i} className="flex items-center gap-3 text-xs font-bold">
                                   <div className="w-1 h-1 rounded-full bg-indigo-300"></div>
                                   {opp}
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
