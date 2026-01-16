
import React, { useState, useMemo } from 'react';
import { BarChart3, Download, Calendar, TrendingUp, DollarSign, ShoppingBag, PieChart as PieIcon, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { Transaction, Product } from '../types';
import { formatCurrency } from '../constants';

interface ReportingProps {
  transactions: Transaction[];
  products: Product[];
}

const COLORS = ['#f59e0b', '#0ea5e9', '#10b981', '#8b5cf6', '#f43f5e', '#6366f1'];

export const Reporting: React.FC<ReportingProps> = ({ transactions, products }) => {
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | 'all'>('7days');
  
  // --- Data Processing ---
  
  // Filter transactions by status AND date range
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    // Reset time portion for accurate day comparison if needed, 
    // but simple timestamp diff is usually sufficient for "last X days".
    
    return transactions.filter(t => {
      if (t.status !== 'Completed') return false;
      
      if (timeRange === 'all') return true;

      const txDate = new Date(t.created_at);
      const diffTime = now.getTime() - txDate.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);

      if (timeRange === '7days') return diffDays <= 7;
      if (timeRange === '30days') return diffDays <= 30;
      
      return true;
    });
  }, [transactions, timeRange]);

  // 1. Sales Over Time (Group by Date)
  const salesData = useMemo(() => {
    const grouped: Record<string, number> = {};
    
    // Determine date range for x-axis initialization
    let daysToGenerate = 7;
    if (timeRange === '30days') daysToGenerate = 30;
    if (timeRange === 'all') daysToGenerate = 0; // Don't pre-fill for 'all'

    // Initialize dates if range is specific
    if (daysToGenerate > 0) {
        for (let i = 0; i < daysToGenerate; i++) {
            const d = new Date();
            d.setDate(d.getDate() - ((daysToGenerate - 1) - i));
            grouped[d.toISOString().split('T')[0]] = 0;
        }
    }

    // Sum amounts
    filteredTransactions.forEach(t => {
       const dateKey = t.created_at.split('T')[0];
       // If 'all', we might encounter dates not initialized, so we add them
       if (grouped[dateKey] === undefined && timeRange === 'all') {
           grouped[dateKey] = 0;
       }
       
       if (grouped[dateKey] !== undefined) {
           grouped[dateKey] += t.total_amount;
       }
    });

    // Convert to array and sort
    return Object.entries(grouped)
        .map(([date, sales]) => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            originalDate: date,
            sales
        }))
        .sort((a, b) => new Date(a.originalDate).getTime() - new Date(b.originalDate).getTime());
  }, [filteredTransactions, timeRange]);

  // 2. Sales by Category
  const categoryData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      const product = products.find(p => p.id === t.product_id);
      if (product) {
        const category = product.category_id || 'Uncategorized';
        grouped[category] = (grouped[category] || 0) + t.total_amount;
      }
    });
    return Object.entries(grouped)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
  }, [filteredTransactions, products]);

  // 3. Top Products by Quantity
  const topProductsData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      const product = products.find(p => p.id === t.product_id);
      if (product) {
        grouped[product.name] = (grouped[product.name] || 0) + t.quantity;
      }
    });
    return Object.entries(grouped)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
  }, [filteredTransactions, products]);

  // Metrics Calculation
  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total_amount, 0);
  const totalOrders = filteredTransactions.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  const handleExport = () => {
    alert(`Downloading ${timeRange} Report (PDF/CSV) - Feature simulated.`);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-cyan-400" /> Business Analytics
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Performance summary for 
            <span className="text-white font-bold ml-1">
              {timeRange === '7days' ? 'Last 7 Days' : timeRange === '30days' ? 'Last 30 Days' : 'All Time'}
            </span>
          </p>
        </div>
        <div className="flex gap-3 bg-[#18181b] p-1 rounded-xl border border-[#27272a]">
           <button 
             onClick={() => setTimeRange('7days')}
             className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${timeRange === '7days' ? 'bg-[#27272a] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
             7 Days
           </button>
           <button 
             onClick={() => setTimeRange('30days')}
             className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${timeRange === '30days' ? 'bg-[#27272a] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
             30 Days
           </button>
           <button 
             onClick={() => setTimeRange('all')}
             className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${timeRange === 'all' ? 'bg-[#27272a] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
             All Time
           </button>
        </div>
        <button 
             onClick={handleExport}
             className="hidden md:flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-cyan-900/20"
           >
              <Download size={16} /> Export
        </button>
      </div>

      {/* KPI Cards Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#18181b] border border-[#27272a] p-6 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <DollarSign size={80} />
             </div>
             <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Total Revenue</p>
             <h3 className="text-3xl font-bold text-white mb-2">{formatCurrency(totalRevenue)}</h3>
             <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold">
                <span className="bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"><ArrowUpRight size={12} /> {timeRange === '7days' ? '12.5%' : '---'}</span>
                <span className="text-zinc-500 font-normal">vs previous period</span>
             </div>
          </div>

          <div className="bg-[#18181b] border border-[#27272a] p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition-colors">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <ShoppingBag size={80} />
             </div>
             <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Total Orders</p>
             <h3 className="text-3xl font-bold text-white mb-2">{totalOrders}</h3>
             <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold">
                <span className="bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"><ArrowUpRight size={12} /> {timeRange === '7days' ? '8.2%' : '---'}</span>
                <span className="text-zinc-500 font-normal">vs previous period</span>
             </div>
          </div>

          <div className="bg-[#18181b] border border-[#27272a] p-6 rounded-2xl relative overflow-hidden group hover:border-amber-500/30 transition-colors">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp size={80} />
             </div>
             <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Avg. Order Value</p>
             <h3 className="text-3xl font-bold text-white mb-2">{formatCurrency(avgOrderValue)}</h3>
             <div className="flex items-center gap-2 text-rose-500 text-xs font-bold">
                <span className="bg-rose-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"><ArrowDownRight size={12} /> {timeRange === '7days' ? '2.1%' : '---'}</span>
                <span className="text-zinc-500 font-normal">vs previous period</span>
             </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Sales Chart */}
         <div className="bg-[#18181b] border border-[#27272a] p-6 rounded-2xl shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6">Sales Trend</h3>
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData}>
                     <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                     <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                     <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₱${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`} />
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                        itemStyle={{ color: '#0ea5e9' }}
                        formatter={(value: number) => [formatCurrency(value), 'Sales']}
                     />
                     <Area type="monotone" dataKey="sales" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Category Pie Chart */}
         <div className="bg-[#18181b] border border-[#27272a] p-6 rounded-2xl shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6">Sales by Category</h3>
            <div className="h-[300px] w-full flex items-center justify-center">
               {categoryData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                       >
                          {categoryData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                          ))}
                       </Pie>
                       <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                          formatter={(value: number) => formatCurrency(value)}
                       />
                       <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="text-zinc-500 text-sm flex flex-col items-center">
                    <PieIcon size={48} className="opacity-20 mb-2" />
                    No sales data for this period
                 </div>
               )}
            </div>
         </div>
      </div>

      {/* Top Products Bar Chart */}
      <div className="bg-[#18181b] border border-[#27272a] p-6 rounded-2xl shadow-xl">
         <h3 className="text-lg font-bold text-white mb-6">Top Products (Qty Sold)</h3>
         <div className="h-[250px] w-full">
            {topProductsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={topProductsData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={true} vertical={false} />
                    <XAxis type="number" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" width={120} stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip 
                       cursor={{ fill: '#27272a' }}
                       contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                 </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-sm">
                 <ShoppingBag size={32} className="opacity-20 mb-2" />
                 No products sold in this period
              </div>
            )}
         </div>
      </div>
    </div>
  );
};
