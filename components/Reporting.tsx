
import React, { useMemo } from 'react';
import { BarChart3, Download, Calendar, TrendingUp, DollarSign, ShoppingBag, PieChart as PieIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { Transaction, Product } from '../types';
import { formatCurrency } from '../constants';

interface ReportingProps {
  transactions: Transaction[];
  products: Product[];
}

const COLORS = ['#f59e0b', '#0ea5e9', '#10b981', '#8b5cf6', '#f43f5e', '#6366f1'];

export const Reporting: React.FC<ReportingProps> = ({ transactions, products }) => {
  
  // --- Data Processing ---
  const filteredTransactions = transactions.filter(t => t.status === 'Completed');

  // 1. Sales Over Time (Group by Date)
  const salesData = useMemo(() => {
    const grouped: Record<string, number> = {};
    const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
    });

    // Initialize with 0
    last7Days.forEach(date => grouped[date] = 0);

    // Sum amounts
    filteredTransactions.forEach(t => {
       if (grouped[t.date] !== undefined) {
           grouped[t.date] += t.amount;
       }
    });

    return Object.entries(grouped).map(([date, sales]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales
    }));
  }, [filteredTransactions]);

  // 2. Sales by Category
  const categoryData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredTransactions.forEach(t => {
       grouped[t.category] = (grouped[t.category] || 0) + t.amount;
    });
    return Object.entries(grouped)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // 3. Top Products by Quantity
  const topProductsData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredTransactions.forEach(t => {
       grouped[t.product] = (grouped[t.product] || 0) + (t.quantity || 1);
    });
    return Object.entries(grouped)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
  }, [filteredTransactions]);

  // Metrics
  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalOrders = filteredTransactions.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  const handleExport = () => {
    alert("Downloading Report (PDF/CSV) - Feature simulated.");
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-cyan-400" /> Business Analytics
          </h2>
          <p className="text-slate-400 text-sm mt-1">Deep dive into your store performance and trends.</p>
        </div>
        <div className="flex gap-3">
           <button className="flex items-center gap-2 px-4 py-2 bg-[#18181b] border border-[#27272a] hover:bg-[#27272a] text-zinc-300 rounded-xl text-sm font-bold transition-colors">
              <Calendar size={16} /> Last 7 Days
           </button>
           <button 
             onClick={handleExport}
             className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-cyan-900/20"
           >
              <Download size={16} /> Export Report
           </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#18181b] border border-[#27272a] p-6 rounded-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <DollarSign size={80} />
             </div>
             <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Total Revenue</p>
             <h3 className="text-3xl font-bold text-white mb-2">{formatCurrency(totalRevenue)}</h3>
             <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold">
                <span className="bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"><ArrowUpRight size={12} /> 12.5%</span>
                <span className="text-zinc-500 font-normal">vs last period</span>
             </div>
          </div>

          <div className="bg-[#18181b] border border-[#27272a] p-6 rounded-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <ShoppingBag size={80} />
             </div>
             <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Total Orders</p>
             <h3 className="text-3xl font-bold text-white mb-2">{totalOrders}</h3>
             <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold">
                <span className="bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"><ArrowUpRight size={12} /> 8.2%</span>
                <span className="text-zinc-500 font-normal">vs last period</span>
             </div>
          </div>

          <div className="bg-[#18181b] border border-[#27272a] p-6 rounded-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp size={80} />
             </div>
             <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Avg. Order Value</p>
             <h3 className="text-3xl font-bold text-white mb-2">{formatCurrency(avgOrderValue)}</h3>
             <div className="flex items-center gap-2 text-rose-500 text-xs font-bold">
                <span className="bg-rose-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"><ArrowDownRight size={12} /> 2.1%</span>
                <span className="text-zinc-500 font-normal">vs last period</span>
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
                     <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₱${value/1000}k`} />
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
            </div>
         </div>
      </div>

      {/* Top Products Bar Chart */}
      <div className="bg-[#18181b] border border-[#27272a] p-6 rounded-2xl shadow-xl">
         <h3 className="text-lg font-bold text-white mb-6">Top 5 Products (Qty Sold)</h3>
         <div className="h-[250px] w-full">
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
         </div>
      </div>
    </div>
  );
};
