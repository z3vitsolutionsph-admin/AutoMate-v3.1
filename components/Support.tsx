
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, Bot, User, BrainCircuit, Activity, Database, RefreshCw, Zap, Target, ShieldCheck 
} from 'lucide-react';
import { ChatMessage, Product, Transaction } from '../types';
import { getSupportResponse } from '../services/geminiService';
import { formatCurrency } from '../constants';

const aistudio = (window as any).aistudio;

interface ExtendedChatMessage extends ChatMessage {
  status?: 'sending' | 'success' | 'error';
}

export const Support: React.FC<{ products: Product[], transactions: Transaction[] }> = ({ products, transactions }) => {
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([
    { 
      id: '1', 
      role: 'model', 
      text: 'Hello! I am your Shop Assistant. I have reviewed your store records. How can I help you improve your business today?', 
      timestamp: new Date(),
      status: 'success'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const shopSnapshot = useMemo(() => {
    const totalValue = products.reduce((s, p) => s + (p.price * p.stock), 0);
    const lowStockCount = products.filter(p => p.stock < 10).length;
    const salesTotal = transactions.slice(0, 10).reduce((s, t) => s + t.amount, 0);
    return {
      totalValue, lowStockCount, salesTotal,
      text: `Shop has ${products.length} items. Total value: ${formatCurrency(totalValue)}. Low stock: ${lowStockCount} items. Recent sales: ${formatCurrency(salesTotal)}.`
    };
  }, [products, transactions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const text = customText || input;
    if (!text.trim()) return;

    if (!customText) {
      const userMsg: ExtendedChatMessage = { 
        id: Date.now().toString(), 
        role: 'user', 
        text, 
        timestamp: new Date(), 
        status: 'success' 
      };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
    }

    setIsTyping(true);
    try {
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await aistudio.openSelectKey();
          // After selection, proceed if they didn't cancel
        }
      }

      const reply = await getSupportResponse(text, shopSnapshot.text);
      setMessages(prev => [...prev, { 
        id: (Date.now()+1).toString(), 
        role: 'model', 
        text: reply, 
        timestamp: new Date(), 
        status: 'success' 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        id: (Date.now()+1).toString(), 
        role: 'model', 
        text: "Sorry, I'm having trouble connecting to your shop data. This usually happens if the internet is weak. Would you like to try again?", 
        timestamp: new Date(), 
        status: 'error' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRetry = () => {
    // Find the last user message to retry
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      handleSend(undefined, lastUserMsg.text);
    }
  };

  const Suggestion = ({ label, prompt, icon: Icon }: any) => (
    <button onClick={() => handleSend(undefined, prompt)} className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 hover:shadow-md transition-all text-left group">
      <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Icon size={18} /></div>
      <span className="text-xs font-bold text-slate-700">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 h-[calc(100vh-8rem)] animate-in fade-in duration-500">
      <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto no-scrollbar">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Shop Assistant</h2>
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-8 shadow-sm">
           <div className="flex items-center gap-3"><Activity size={24} className="text-indigo-600"/><h3 className="font-black text-sm uppercase tracking-widest">Shop Snapshot</h3></div>
           <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Stock Value</p><p className="text-sm font-black text-slate-900">{formatCurrency(shopSnapshot.totalValue)}</p></div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Low Stock</p><p className="text-sm font-black text-rose-600">{shopSnapshot.lowStockCount} Items</p></div>
           </div>
           <div className="space-y-3">
              <p className="text-[9px] font-black text-slate-400 uppercase ml-1">Common Questions:</p>
              <div className="grid gap-2.5">
                 <Suggestion label="Check Inventory" prompt="Check my current stock. What should I reorder soon?" icon={Database} />
                 <Suggestion label="Sales Strategy" prompt="Look at my recent sales. How can I sell more items?" icon={Zap} />
                 <Suggestion label="Risk Review" prompt="Are there any issues I should be aware of in my shop right now?" icon={Target} />
              </div>
           </div>
        </div>
      </div>

      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-[3rem] shadow-xl flex flex-col overflow-hidden relative border-b-8 border-b-indigo-600">
        <div className="p-6 md:p-8 bg-slate-50/80 backdrop-blur-md border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-3.5 bg-indigo-600 rounded-2xl text-white shadow-lg"><Bot size={28} /></div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div><h3 className="text-lg font-black text-slate-900 leading-none">Your Assistant</h3><p className="text-[9px] text-indigo-500 font-black uppercase mt-1.5">Online & Ready</p></div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar bg-slate-50/20">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
              <div className={`flex max-w-[85%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-indigo-600'}`}>
                  {msg.role === 'user' ? <User size={20} /> : <BrainCircuit size={20} />}
                </div>
                <div className={`p-5 rounded-2xl text-sm leading-relaxed shadow-sm transition-all ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : msg.status === 'error' ? 'bg-rose-50 text-rose-700 rounded-tl-none border border-rose-100' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                  {msg.text}
                  {msg.status === 'error' && (
                    <button onClick={handleRetry} className="mt-4 flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase transition-all active:scale-95">
                      <RefreshCw size={12}/> Try Again
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-indigo-400">
                <BrainCircuit size={20} />
              </div>
              <div className="bg-slate-100 p-5 rounded-2xl text-slate-400 text-xs font-bold uppercase tracking-widest">Assistant is thinking...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 md:p-8 bg-white border-t border-slate-100">
          <form onSubmit={handleSend} className="relative group">
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              disabled={isTyping} 
              className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] pl-8 pr-20 py-6 text-sm font-bold text-slate-900 outline-none focus:ring-8 focus:ring-indigo-50 transition-all placeholder:text-slate-300 disabled:opacity-50" 
              placeholder="Ask your assistant anything..." 
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isTyping} 
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 text-white p-4 rounded-full transition-all shadow-xl active:scale-90"
            >
              <Send size={24} />
            </button>
          </form>
          <div className="mt-4 flex justify-center"><p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] flex items-center gap-2"><ShieldCheck size={10}/> Private Assistance Enabled</p></div>
        </div>
      </div>
    </div>
  );
};
