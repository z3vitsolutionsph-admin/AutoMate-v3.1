
import React, { useMemo } from 'react';
import { DollarSign, Clock, Users, Flame, AlertCircle, ArrowUpRight, Search, Bell, Receipt, History, UserCheck, Calendar, Check, ScrollText, FileText, Download } from 'lucide-react';
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

  // 3. Group Transactions into Receipts (for Logs)
  const receiptLogs = useMemo(() => {
    const grouped: Record<string, GroupedTransaction> = {};
    
    // Sort transactions by date desc first
    const sortedTx = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    sortedTx.forEach(t => {
       // Extract Order ID (e.g., "TRX-123456" from "TRX-123456-0")
       const parts = t.id.split('-');
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

  // 4. Popular Items
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

  // 5. Activity Feed (New Log Panel)
  const activityFeed = useMemo(() => {
      const feed = transactions.map(t => ({
          id: t.id,
          type: 'SALE',
          title: 'Receipt Issued',
          time: new Date(t.date),
          details: `Sold ${t.quantity || 1}x ${t.product}`,
          amount: t.amount
      }));

      // Add dummy shift start
      const shiftStart = new Date();
      shiftStart.setHours(8, 0, 0, 0);
      feed.push({
          id: 'SHIFT-START',
          type: 'SYSTEM',
          title: 'Shift Started',
          time: shiftStart,
          details: 'User: Admin Pro',
          amount: 0
      });
      
      return feed.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 10);
  }, [transactions]);

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
        {/* Today's Sales */}
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

        {/* Shift Info / Cashier */}
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

        {/* Alerts / Stock */}
        <div className="bg-[#18181b] border border-[#27272a] p-6 rounded-2xl relative overflow-hidden group hover:border-rose-500/50 transition-colors shadow-lg">
           <div className="absolute right-4 top-4 p-2 bg-rose-500/10 rounded-lg text-rose-500">
             <AlertCircle size={24} />
           </div>
           <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">System Alerts</p>
           <h3 className="text-3xl font-bold text-white mt-2">{outOfStock.length + lowStock.length}</h3>
           <p className="text-rose-400 text-xs font-bold mt-2">
             {outOfStock.length} Out of Stock • {lowStock.length} Low
           </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Logs & Popular */}
        <div className="lg:col-span-2 space-y-8">
           
           {/* Receipt Logs (Renamed from Transaction Logs) */}
           <div className="bg-[#18181b] border border-[#27272a] rounded-3xl p-6 shadow-xl">
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
                       <FileText size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Receipt Logs</h3>
                        <p className="text-xs text-zinc-500">Monitor issued receipts and details</p>
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
                                    No receipts issued yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>
           </div>

           {/* Popular Items */}
           <div>
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-bold text-white">Popular Items</h3>
               <button className="text-amber-500 text-sm font-bold hover:underline">View All</button>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {popularItems.map(item => (
                  <div key={item.id} className="bg-[#18181b] border border-[#27272a] p-4 rounded-2xl flex items-center gap-4 hover:border-amber-500/30 transition-colors cursor-pointer group shadow-lg">
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

        {/* Right Column: Alerts & Activity Feed */}
        <div className="space-y-8">
            
            {/* Out of Stock Alert List */}
           <div className="bg-[#18181b] border border-[#27272a] rounded-3xl p-6 shadow-xl">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-white">Low Stock Alerts</h3>
             </div>
             <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
               {outOfStock.length > 0 || lowStock.length > 0 ? (
                 <>
                  {outOfStock.map(item => (
                    <div key={item.id} className="bg-[#18181b] border border-red-900/30 p-3 rounded-2xl flex items-center justify-between group hover:border-red-500/50 transition-colors">
                        <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                            <AlertCircle size={18} />
                        </div>
                        <div>
                            <h4 className="text-zinc-200 font-bold text-sm line-clamp-1 group-hover:text-white transition-colors">{item.name}</h4>
                            <p className="text-red-400 text-xs font-bold">5 items left</p>
                        </div>
                        </div>
                        <button className="text-[10px] font-bold bg-[#27272a] text-white px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors border border-white/5">Restock</button>
                    </div>
                  ))}
                  {lowStock.map(item => (
                    <div key={item.id} className="bg-[#18181b] border border-amber-900/30 p-3 rounded-2xl flex items-center justify-between group hover:border-amber-500/50 transition-colors">
                        <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                            <AlertCircle size={18} />
                        </div>
                        <div>
                            <h4 className="text-zinc-200 font-bold text-sm line-clamp-1 group-hover:text-white transition-colors">{item.name}</h4>
                            <p className="text-amber-400 text-xs font-bold">{item.stock} items left</p>
                        </div>
                        </div>
                        <button className="text-[10px] font-bold bg-[#27272a] text-white px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors border border-white/5">Restock</button>
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

           {/* System Activity Log (New) */}
           <div className="bg-[#18181b] border border-[#27272a] rounded-3xl p-6 h-fit shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">System Logs</h3>
                <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                   <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                   Live
                </div>
              </div>

              <div className="space-y-6 relative pl-2">
                {/* Timeline Line */}
                <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-[#27272a]"></div>

                {activityFeed.length > 0 ? activityFeed.map((item, idx) => (
                  <div key={idx} className="flex gap-4 relative">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 border-4 border-[#18181b] shadow-sm ${
                        item.type === 'SALE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                          {item.type === 'SALE' ? <Receipt size={16} /> : <ScrollText size={16} />}
                      </div>
                      <div className="pt-0.5 flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                             <h4 className="text-white text-sm font-bold">{item.title}</h4>
                             <span className="text-[10px] text-zinc-500 font-mono bg-[#27272a] px-1.5 py-0.5 rounded">
                               {item.time.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                             </span>
                          </div>
                          <p className="text-zinc-400 text-xs truncate">{item.details}</p>
                          {item.type === 'SALE' && (
                             <p className="text-emerald-500 text-[10px] font-bold mt-1 bg-emerald-500/5 inline-block px-1.5 py-0.5 rounded border border-emerald-500/10">
                                +{formatCurrency(item.amount)}
                             </p>
                          )}
                      </div>
                  </div>
                )) : (
                   <div className="text-center py-8 text-zinc-500 text-sm">
                      No recent activity.
                   </div>
                )}
              </div>
              
              <button className="w-full mt-8 py-3 bg-[#27272a] hover:bg-[#3f3f46] text-white font-bold text-sm rounded-xl transition-colors border border-white/5 flex items-center justify-center gap-2">
                <Download size={16} /> Export Log File
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};
