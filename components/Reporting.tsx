import React, { useState, useMemo } from 'react';
import { BarChart3, Download, Calendar, TrendingUp, DollarSign, ShoppingBag, PieChart as PieIcon, ArrowUpRight, ArrowDownRight, Filter, Github, Loader2, Package, AlertTriangle, History, ArrowRight, PackageOpen, Layers, X, FileText, FileSpreadsheet, FileJson, Check } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { Transaction, Product } from '../types';
import { formatCurrency } from '../constants';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#ef4444'];

export const Reporting: React.FC<{ transactions: Transaction[], products: Product[] }> = ({ transactions, products }) => {
  const [timeRange, setTimeRange] = useState('7days');
  const [activeTab, setActiveTab] = useState('sales');

  const stats = useMemo(() => {
    const totalRevenue = transactions.reduce((s, t) => t.status === 'Completed' ? s + t.amount : s, 0);
    const lowStock = products.filter(p => p.stock < 10).length;
    const inventoryVal = products.reduce((s, p) => s + (p.price * p.stock), 0);
    return { totalRevenue, lowStock, inventoryVal };
  }, [transactions, products]);

  const salesData = useMemo(() => {
    const days = 7;
    const data = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().split('T')[0];
      const daySales = transactions.filter(t => t.date.startsWith(dateStr) && t.status === 'Completed').reduce((s, t) => s + t.amount, 0);
      data.push({ name: d.toLocaleDateString(undefined, { weekday: 'short' }), sales: daySales });
    }
    return data;
  }, [transactions]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Business Intelligence</h2>
          <p className="text-slate-500 text-sm mt-1">Granular insights into sales velocity and inventory performance.</p>
        </div>
        <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
          <button onClick={() => setActiveTab('sales')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'sales' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}>Sales</button>
          <button onClick={() => setActiveTab('inventory')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}>Inventory</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-2">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Revenue</p>
           <h3 className="text-3xl font-black text-slate-900">{formatCurrency(stats.totalRevenue)}</h3>
           <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold"><TrendingUp size={14}/> +14.2% Growth</div>
        </div>
        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-2">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory Assets</p>
           <h3 className="text-3xl font-black text-slate-900">{formatCurrency(stats.inventoryVal)}</h3>
           <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold"><Package size={14}/> {products.length} SKUs Enrolled</div>
        </div>
        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-2">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Critical Alert Index</p>
           <h3 className="text-3xl font-black text-rose-600">{stats.lowStock} <span className="text-sm font-bold text-slate-400 uppercase">Anomalies</span></h3>
           <div className="flex items-center gap-2 text-rose-600 text-xs font-bold"><AlertTriangle size={14}/> Immediate restock suggested</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-8">Sales Velocity Trend</h3>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={salesData}>
                  <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₱${v/1000}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
               </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
           <div className="flex justify-between items-center mb-8"><h3 className="text-lg font-bold text-slate-900">Recent Transactions</h3><button className="text-xs font-black text-indigo-600 uppercase tracking-widest">Export Journal</button></div>
           <div className="space-y-4">
              {transactions.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400"><History size={18} /></div>
                    <div><p className="font-bold text-slate-900 text-sm">{t.product}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(t.date).toLocaleTimeString()}</p></div>
                  </div>
                  <span className="font-black text-slate-900">{formatCurrency(t.amount)}</span>
                </div>
              ))}
              {transactions.length === 0 && <div className="text-center py-12 text-slate-300 italic">No recent transactions.</div>}
           </div>
        </div>
      </div>
    </div>
  );
};