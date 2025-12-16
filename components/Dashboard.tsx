
import React, { useMemo } from 'react';
import { DollarSign, Clock, Users, Flame, AlertCircle, ChefHat, ArrowUpRight, Search, Bell } from 'lucide-react';
import { formatCurrency } from '../constants';
import { Transaction, Product } from '../types';

interface DashboardProps {
  transactions: Transaction[];
  products: Product[];
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, products }) => {
  
  // Calculate Metrics
  const totalRevenue = transactions.reduce((acc, curr) => curr.status !== 'Refunded' ? acc + curr.amount : acc, 0);
  const activeOrders = transactions.filter(t => t.status !== 'Completed' && t.status !== 'Refunded');
  
  const popularItems = useMemo(() => {
    // Determine top 6 products by quantity sold
    const sales: Record<string, number> = {};
    transactions.forEach(t => {
      sales[t.product] = (sales[t.product] || 0) + (t.quantity || 1);
    });
    return products
      .map(p => ({ ...p, sales: sales[p.name] || 0 }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 6);
  }, [transactions, products]);

  const outOfStock = products.filter(p => p.stock === 0);
  const lowStock = products.filter(p => p.stock > 0 && p.stock < 10);

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Good Morning, Admin 👋</h1>
          <p className="text-zinc-400 mt-1">Here is your daily store overview.</p>
        </div>
        <div className="flex items-center gap-4 bg-[#18181b] p-1.5 rounded-full border border-[#27272a]">
           <div className="relative px-4">
             <Search size={18} className="text-zinc-500" />
           </div>
           <div className="h-6 w-px bg-[#27272a]"></div>
           <div className="relative p-2 rounded-full hover:bg-[#27272a] cursor-pointer transition-colors group">
             <Bell size={18} className="text-zinc-400 group-hover:text-white" />
             <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full border-2 border-[#18181b]"></span>
           </div>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Earning */}
        <div className="bg-[#18181b] border border-[#27272a] p-6 rounded-2xl relative overflow-hidden group">
           <div className="absolute right-4 top-4 p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
             <DollarSign size={24} />
           </div>
           <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Total Earning</p>
           <h3 className="text-3xl font-bold text-white mt-2">{formatCurrency(totalRevenue)}</h3>
           <p className="text-emerald-500 text-xs font-bold mt-2 flex items-center gap-1">
             <ArrowUpRight size={14} /> +12.5% <span className="text-zinc-500 font-normal">than yesterday</span>
           </p>
        </div>

        {/* In Progress */}
        <div className="bg-[#18181b] border border-[#27272a] p-6 rounded-2xl relative overflow-hidden group">
           <div className="absolute right-4 top-4 p-2 bg-amber-500/10 rounded-lg text-amber-500">
             <ChefHat size={24} />
           </div>
           <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">In Progress</p>
           <h3 className="text-3xl font-bold text-white mt-2">{activeOrders.length}</h3>
           <p className="text-zinc-500 text-xs mt-2">Active orders in kitchen</p>
        </div>

        {/* Waiting List / Out of Stock */}
        <div className="bg-[#18181b] border border-[#27272a] p-6 rounded-2xl relative overflow-hidden group">
           <div className="absolute right-4 top-4 p-2 bg-red-500/10 rounded-lg text-red-500">
             <AlertCircle size={24} />
           </div>
           <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Out of Stock</p>
           <h3 className="text-3xl font-bold text-white mt-2">{outOfStock.length}</h3>
           <p className="text-red-400 text-xs font-bold mt-2">{lowStock.length} items low</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Popular Dishes & Out of Stock */}
        <div className="lg:col-span-2 space-y-8">
           {/* Popular Dishes */}
           <div>
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-bold text-white">Popular Items</h3>
               <button className="text-amber-500 text-sm font-bold hover:underline">View All</button>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {popularItems.map(item => (
                  <div key={item.id} className="bg-[#18181b] border border-[#27272a] p-4 rounded-2xl flex items-center gap-4 hover:border-amber-500/30 transition-colors cursor-pointer group">
                     <div className="w-16 h-16 rounded-xl bg-[#27272a] flex items-center justify-center text-zinc-500 group-hover:bg-amber-500/10 group-hover:text-amber-500 transition-colors">
                        <Flame size={24} />
                     </div>
                     <div>
                        <h4 className="text-white font-bold text-sm truncate max-w-[120px]">{item.name}</h4>
                        <p className="text-zinc-500 text-xs mb-1">{item.sales} orders</p>
                        <p className="text-white font-bold text-sm">{formatCurrency(item.price)}</p>
                     </div>
                  </div>
                ))}
                {popularItems.length === 0 && (
                  <div className="col-span-full py-8 text-center text-zinc-500 text-sm bg-[#18181b] rounded-2xl border border-[#27272a] border-dashed">
                    No sales data yet.
                  </div>
                )}
             </div>
           </div>

           {/* Out of Stock Alert List */}
           <div>
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-bold text-white">Out of Stock</h3>
               <button className="text-zinc-500 text-sm font-bold hover:text-white">View All</button>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {outOfStock.length > 0 ? outOfStock.map(item => (
                 <div key={item.id} className="bg-[#18181b] border border-red-900/30 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                          <AlertCircle size={20} />
                       </div>
                       <div>
                          <h4 className="text-zinc-200 font-bold text-sm">{item.name}</h4>
                          <p className="text-red-400 text-xs">0 items left</p>
                       </div>
                    </div>
                    <button className="text-xs font-bold bg-zinc-800 text-white px-3 py-1.5 rounded-lg hover:bg-zinc-700">Restock</button>
                 </div>
               )) : (
                 <div className="col-span-full py-6 text-center text-emerald-500 text-sm bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                    All items are in stock. Good job!
                 </div>
               )}
             </div>
           </div>
        </div>

        {/* Right Column: Order Status */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-3xl p-6 h-fit">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-xl font-bold text-white">Order Status</h3>
             <div className="text-xs text-zinc-500">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
           </div>

           <div className="space-y-4">
             {/* Order List Header */}
             <div className="flex gap-2 mb-4 bg-[#27272a] p-1 rounded-xl">
               <button className="flex-1 py-2 text-xs font-bold bg-[#18181b] text-white rounded-lg shadow-sm">In Progress</button>
               <button className="flex-1 py-2 text-xs font-bold text-zinc-500 hover:text-white">Completed</button>
             </div>

             {activeOrders.length > 0 ? activeOrders.slice(0, 6).map(order => (
               <div key={order.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#27272a] transition-colors group cursor-pointer">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs group-hover:bg-amber-500 group-hover:text-black transition-colors">
                        {order.quantity}x
                     </div>
                     <div>
                        <h4 className="text-white font-bold text-sm">{order.product}</h4>
                        <p className="text-zinc-500 text-xs">Table 4 • {order.id.slice(-4)}</p>
                     </div>
                  </div>
                  <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                     Cooking
                  </span>
               </div>
             )) : (
               <div className="text-center py-12 text-zinc-500 text-sm">
                 <Clock size={32} className="mx-auto mb-2 opacity-20" />
                 No active orders.
               </div>
             )}
           </div>

           <button className="w-full mt-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors">
             View All Orders
           </button>
        </div>

      </div>
    </div>
  );
};
