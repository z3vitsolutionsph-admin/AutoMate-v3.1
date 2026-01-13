
import React, { useState, useMemo, useCallback } from 'react';
import { Search, ShoppingBasket, Plus, Minus, ArrowRight, X, Receipt, Check, Loader2 } from 'lucide-react';
import { Product, CartItem, Transaction } from '../types';
import { formatCurrency } from '../constants';

interface POSProps {
  products: Product[];
  operatorName?: string;
  onTransactionComplete: (txs: Transaction[]) => void;
  businessDetails?: {
    name: string;
    address: string;
    contact: string;
    footerMessage: string;
  };
}

export const POS: React.FC<POSProps> = ({ products, operatorName, onTransactionComplete, businessDetails }) => {
  const [basket, setBasket] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  const groups = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category)))], [products]);
  
  const filtered = products.filter(p => 
    (selectedGroup === 'All' || p.category === selectedGroup) && 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const total = basket.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const addToBasket = (p: Product) => {
    if (p.stock <= 0) {
      alert("Oops! This item is currently out of stock.");
      return;
    }
    setBasket(prev => {
      const exists = prev.find(i => i.id === p.id);
      if (exists) {
        if (exists.quantity >= p.stock) {
          alert(`You only have ${p.stock} of these in stock.`);
          return prev;
        }
        return prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...p, quantity: 1 }];
    });
  };

  const removeFromBasket = (id: string) => {
    setBasket(prev => prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
  };

  const handlePayment = async () => {
    if (basket.length === 0) return;
    
    setCheckingOut(true);
    // Simulate saving to the cloud/records
    await new Promise(r => setTimeout(r, 1200));
    
    const transactionId = `ORDER-${Date.now()}`;
    const newTransactions: Transaction[] = basket.map(item => ({
      id: transactionId,
      date: new Date().toISOString(),
      product: item.name,
      productId: item.id,
      category: item.category,
      location: businessDetails?.name || 'Main Shop',
      amount: item.price * item.quantity,
      status: 'Completed',
      quantity: item.quantity,
      paymentMethod: 'Cash'
    }));

    onTransactionComplete(newTransactions);
    setCheckingOut(false);
    setPaymentDone(true);
  };

  const startFresh = () => {
    setBasket([]);
    setPaymentDone(false);
    setSearch('');
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-4 animate-in fade-in duration-500 overflow-hidden">
      {/* Items Grid Section */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        <div className="bg-white border border-slate-200 p-4 rounded-[2rem] shadow-sm space-y-4">
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
              <input 
                placeholder="Find an item to sell..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all" 
              />
           </div>
           <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {groups.map(g => (
                <button 
                  key={g} 
                  onClick={() => setSelectedGroup(g)} 
                  className={`px-5 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all ${selectedGroup === g ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-300'}`}
                >
                  {g}
                </button>
              ))}
           </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {filtered.map(p => (
            <div 
              key={p.id} 
              onClick={() => addToBasket(p)} 
              className="bg-white border border-slate-200 rounded-[1.5rem] p-3 cursor-pointer hover:border-indigo-500 hover:shadow-xl transition-all active:scale-95 flex flex-col shadow-sm group"
            >
               <div className="aspect-square bg-slate-50 rounded-xl mb-3 overflow-hidden flex items-center justify-center relative">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt={p.name} />
                  ) : (
                    <ShoppingBasket size={32} className="text-slate-200" />
                  )}
                  <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase text-white ${p.stock < 10 ? 'bg-rose-500' : 'bg-slate-900/80'}`}>
                    Stock: {p.stock}
                  </div>
               </div>
               <h4 className="text-slate-900 font-black text-[10px] uppercase truncate px-1">{p.name}</h4>
               <div className="mt-auto pt-2 flex items-center justify-between border-t border-slate-50">
                 <span className="text-indigo-600 font-black text-[11px]">{formatCurrency(p.price)}</span>
                 <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                   <Plus size={12}/>
                 </div>
               </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4 opacity-40">
               <Search size={48} className="mx-auto" />
               <p className="text-xs font-black uppercase tracking-widest">No items found matching "{search}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Basket Sidebar */}
      <div className="bg-white border border-slate-200 shadow-2xl md:w-[360px] rounded-[2.5rem] flex flex-col overflow-hidden shrink-0">
         <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg"><ShoppingBasket size={20}/></div>
              <h3 className="font-black text-slate-900 uppercase text-xs">Customer Basket</h3>
            </div>
            {basket.length > 0 && (
              <button onClick={() => setBasket([])} className="text-[9px] font-black text-rose-500 uppercase hover:underline">Clear</button>
            )}
         </div>
         
         <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {basket.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-center p-10">
                 <ShoppingBasket size={48} className="mb-4 text-slate-400"/>
                 <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Your basket is empty.<br/>Click on items to add them here.</p>
              </div>
            ) : (
              basket.map(item => (
                <div key={item.id} className="bg-slate-50 p-3 rounded-2xl flex items-center gap-3 group animate-in slide-in-from-right-2">
                   <div className="flex-1 min-w-0">
                      <h5 className="text-[10px] font-black uppercase truncate text-slate-900">{item.name}</h5>
                      <p className="text-indigo-600 text-[10px] font-black">{formatCurrency(item.price)}</p>
                   </div>
                   <div className="flex items-center gap-2 bg-white rounded-full p-1 shadow-sm border border-slate-100">
                      <button onClick={() => removeFromBasket(item.id)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors">
                        <Minus size={12}/>
                      </button>
                      <span className="text-xs font-black min-w-[1.5rem] text-center">{item.quantity}</span>
                      <button onClick={() => addToBasket(item)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors">
                        <Plus size={12}/>
                      </button>
                   </div>
                </div>
              ))
            )}
         </div>

         <div className="p-8 border-t border-slate-100 bg-slate-50/50 space-y-6">
            <div className="flex justify-between items-end">
               <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase text-slate-400">Total Items: {basket.reduce((s, i) => s + i.quantity, 0)}</span>
                  <span className="text-[10px] font-black uppercase text-slate-500">Subtotal</span>
               </div>
               <span className="text-4xl font-black text-indigo-600 tracking-tighter">{formatCurrency(total)}</span>
            </div>
            <button 
              disabled={basket.length === 0 || checkingOut} 
              onClick={handlePayment} 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale uppercase tracking-widest text-[11px] flex items-center justify-center gap-3"
            >
              {checkingOut ? <Loader2 size={18} className="animate-spin" /> : <><Receipt size={18}/> Complete Sale</>}
            </button>
         </div>
      </div>

      {/* Success Modal */}
      {paymentDone && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 text-center space-y-8 shadow-3xl animate-in zoom-in-95 border border-slate-100">
              <div className="space-y-6">
                 <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl border border-emerald-100 animate-bounce">
                    <Check size={48} strokeWidth={4}/>
                 </div>
                 <div className="space-y-2">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Sale Complete!</h2>
                    <p className="text-slate-500 font-medium italic">The customer's order records have been saved securely in your shop's vault.</p>
                 </div>
                 <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center text-left">
                    <div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount Received</p>
                       <p className="text-xl font-black text-slate-900">{formatCurrency(total)}</p>
                    </div>
                    <Receipt size={32} className="text-slate-200" />
                 </div>
              </div>
              <div className="grid grid-cols-1 gap-3 pt-4">
                 <button onClick={startFresh} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95">Next Customer</button>
                 <button onClick={startFresh} className="w-full py-4 text-slate-400 font-bold text-[10px] uppercase hover:text-slate-600 transition-colors">Close & Clear</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
