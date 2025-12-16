
import React, { useMemo } from 'react';
import { DollarSign, Clock, Users, Flame, AlertCircle, ChefHat, ArrowUpRight, Search, Bell, Receipt, History, UserCheck, Calendar, Check } from 'lucide-react';
import { formatCurrency } from '../constants';
import { Transaction, Product } from '../types';

interface DashboardProps {
  transactions: Transaction[];
  products: Product[];
}

interface GroupedTransaction {
  id: string;
  date: string;
  total: number;
  items: number;
  method: string;
  status: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, products }) => {
  
  // --- Data Calculations ---

  // 1. Total Revenue (All Time)
  const totalRevenue = transactions.reduce((acc, curr) => curr.status !== 'Refunded' ? acc + curr.amount : acc, 0);
  
  // 2. Today's Sales Calculation
  const todaySales = useMemo(() => {
    const today = new Date().toDateString();
    return transactions.reduce((acc, curr) => {
        if (curr.status !== 'Refunded' && new Date(curr.date).toDateString() === today) {
            return acc + curr.amount;
        }
        return acc;
    }, 0);
  }, [transactions]);

  // 3. Active Orders (Kitchen)
  const activeOrders = transactions.filter(t => t.status !== 'Completed' && t.status !== 'Refunded');
  
  // 4. Group Transactions into Receipts (for Logs)
  const receiptLogs = useMemo(() => {
    const grouped: Record<string, GroupedTransaction> = {};
    
    // Sort transactions by date desc first
    const sortedTx = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    sortedTx.forEach(t => {
       // Extract Order ID (e.g., "TRX-123456" from "TRX-123456-0")
       // Assumes format: TRX-TIMESTAMP-INDEX. We split by '-' and take first two parts.
       const parts = t.id.split('-');
       // Handle standard format TRX-123456-0 or simple TRX-123456
       const orderId = parts.length >= 3 ? `${parts[0]}-${parts[1]}` : t.id;

       if (!grouped[orderId]) {
           grouped[orderId] = {
               id: orderId,
               date: t.date,
               total: 0,
               items: 0,
               method: t.paymentMethod || 'Cash',
               status: t.status
           };
       }
       grouped[orderId].total += t.amount;
       grouped[orderId].items += (t.quantity || 1);
    });

    return Object.values(grouped);
  }, [transactions]);

  // 5. Popular Items
  const popularItems = useMemo(() => {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Sales - NEW */}
        <div className="bg-[#18181b] border border-[#27272a] p-6 rounded-2xl relative overflow-hidden group hover:border-emerald-500/50 transition-colors shadow-lg">
           <div className="absolute right-4 top-4 p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
             <DollarSign size={24} />
           </div>
           <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Sales Today</p>
           <h3 className="text-3xl font-bold text-white mt-2">{formatCurrency(todaySales)}</h3>
           <p className="text-emerald-500 text-xs font-bold mt-2 flex items-center gap-1">
             <Calendar size={14} /> {new Date().toLocaleDateString()}
           </p>
        </div>

        {/* Shift Info / Cashier - NEW */}
        <div className="bg-[#18181b] border border-[#27272a] p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/50 transition-colors shadow-lg">
           <div className="absolute right-4 top-4 p-2 bg-blue-500/10 rounded-lg text-blue-500">
             <UserCheck size={24} />
           </div>
           <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Cashier Assigned</p>
           <h3 className="text-2xl font-bold text-white mt-2 truncate">Admin Pro</h3>
           <div className="flex items-center gap-2 mt-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-zinc-400 text-xs">Shift Started: 08:00 AM</span>
           </div>
        </div>

        {/* In Progress */}
        <div className="bg-[#18181b] border border-[#27272a] p-6 rounded-2xl relative overflow-hidden group">
           <div className="absolute right-4 top-4 p-2 bg-amber-500/10 rounded-lg text-amber-500">
             <ChefHat size={24} />
           </div>
           <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Kitchen Queue</p>
           <h3 className="text-3xl font-bold text-white mt-2">{activeOrders.length}</h3>
           <p className="text-zinc-500 text-xs mt-2">Active orders in progress</p>
        </div>

        {/* Out of Stock */}
        <div className="bg-[#18181b] border border-[#27272a] p-6 rounded-2xl relative overflow-hidden group">
           <div className="absolute right-4 top-4 p-2 bg-red-500/10 rounded-lg text-red-500">
             <AlertCircle size={24} />
           </div>
           <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Alerts</p>
           <h3 className="text-3xl font-bold text-white mt-2">{outOfStock.length}</h3>
           <p className="text-red-400 text-xs font-bold mt-2">{lowStock.length} items low stock</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Transaction Logs & Popular */}
        <div className="lg:col-span-2 space-y-8">
           
           {/* Transaction Logs (Receipts) - IMPROVED */}
           <div className="bg-[#18181b] border border-[#27272a] rounded-3xl p-6 shadow-xl">
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
                       <History size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Recent Transactions</h3>
                        <p className="text-xs text-zinc-500">Live feed of completed receipts</p>
                    </div>
                </div>
                <button className="text-xs font-bold bg-[#27272a] text-white px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors">
                    View All
                </button>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-[#27272a]">
                            <th className="pb-3 pl-2">Receipt ID</th>
                            <th className="pb-3">Date & Time</th>
                            <th className="pb-3 text-center">Items</th>
                            <th className="pb-3">Payment</th>
                            <th className="pb-3 text-right pr-2">Total</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-[#27272a]/50">
                        {receiptLogs.length > 0 ? (
                           receiptLogs.slice(0, 5).map(log => (
                               <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                                   <td className="py-4 pl-2 font-mono text-zinc-400 group-hover:text-amber-500 transition-colors">
                                       {log.id}
                                   </td>
                                   <td className="py-4 text-white">
                                       <div className="flex flex-col">
                                           <span className="font-bold">{new Date(log.date).toLocaleDateString()}</span>
                                           <span className="text-xs text-zinc-500">{new Date(log.date).toLocaleTimeString()}</span>
                                       </div>
                                   </td>
                                   <td className="py-4 text-center">
                                       <span className="bg-[#27272a] text-zinc-300 px-2 py-1 rounded-md text-xs font-bold">
                                           {log.items}
                                       </span>
                                   </td>
                                   <td className="py-4">
                                       <div className="flex items-center gap-2">
                                           <span className={`w-2 h-2 rounded-full ${
                                               log.method === 'Cash' ? 'bg-emerald-500' :
                                               log.method === 'Card' ? 'bg-blue-500' :
                                               'bg-purple-500'
                                           }`}></span>
                                           <span className="text-zinc-300">{log.method}</span>
                                       </div>
                                   </td>
                                   <td className="py-4 text-right pr-2 font-bold text-white">
                                       {formatCurrency(log.total)}
                                   </td>
                               </tr>
                           ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-zinc-500">
                                    <Receipt size={32} className="mx-auto mb-2 opacity-20" />
                                    No transactions recorded yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>
           </div>

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
                        <p className="text-zinc-500 text-xs mb-1">{item.sales} sold</p>
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
        </div>

        {/* Right Column: Out of Stock & Queue */}
        <div className="space-y-8">
            
            {/* Out of Stock Alert List */}
           <div className="bg-[#18181b] border border-[#27272a] rounded-3xl p-6">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-white">Low Stock Alerts</h3>
             </div>
             <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
               {outOfStock.length > 0 || lowStock.length > 0 ? (
                 <>
                  {outOfStock.map(item => (
                    <div key={item.id} className="bg-[#18181b] border border-red-900/30 p-3 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                            <AlertCircle size={18} />
                        </div>
                        <div>
                            <h4 className="text-zinc-200 font-bold text-sm line-clamp-1">{item.name}</h4>
                            <p className="text-red-400 text-xs">0 items left</p>
                        </div>
                        </div>
                        <button className="text-[10px] font-bold bg-zinc-800 text-white px-3 py-1.5 rounded-lg hover:bg-zinc-700">Restock</button>
                    </div>
                  ))}
                  {lowStock.map(item => (
                    <div key={item.id} className="bg-[#18181b] border border-amber-900/30 p-3 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                            <AlertCircle size={18} />
                        </div>
                        <div>
                            <h4 className="text-zinc-200 font-bold text-sm line-clamp-1">{item.name}</h4>
                            <p className="text-amber-400 text-xs">{item.stock} items left</p>
                        </div>
                        </div>
                        <button className="text-[10px] font-bold bg-zinc-800 text-white px-3 py-1.5 rounded-lg hover:bg-zinc-700">Restock</button>
                    </div>
                  ))}
                 </>
               ) : (
                 <div className="py-6 text-center text-emerald-500 text-sm bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                    <Check size={24} className="mx-auto mb-2" />
                    All items are in stock. Good job!
                 </div>
               )}
             </div>
           </div>

           {/* Order Queue */}
           <div className="bg-[#18181b] border border-[#27272a] rounded-3xl p-6 h-fit">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Order Queue</h3>
                <div className="text-xs text-zinc-500"><Clock size={14} className="inline mr-1" />{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              </div>

              <div className="space-y-4">
                {activeOrders.length > 0 ? activeOrders.slice(0, 6).map(order => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#27272a] transition-colors group cursor-pointer border border-transparent hover:border-[#3f3f46]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs group-hover:bg-amber-500 group-hover:text-black transition-colors">
                            {order.quantity}x
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-sm truncate max-w-[120px]">{order.product}</h4>
                            <p className="text-zinc-500 text-xs">...{order.id.slice(-4)}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
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
    </div>
  );
};
