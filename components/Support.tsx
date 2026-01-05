
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Bot, User, HelpCircle, Mail, Phone, Info } from 'lucide-react';
import { ChatMessage, Product, Transaction } from '../types';
import { getSupportResponse } from '../services/geminiService';
import { formatCurrency } from '../constants';

// Safely access window for AI Studio helpers
const aistudio = (window as any).aistudio;

interface SupportProps {
  products: Product[];
  transactions: Transaction[];
}

export const Support: React.FC<SupportProps> = ({ products, transactions }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Hello! I am AutoMateSystem AI, your business buddy. How can I help you today?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const storeContext = useMemo(() => {
    const totalStockValue = products.reduce((s, p) => s + (p.price * p.stock), 0);
    const lowStock = products.filter(p => p.stock < 10).map(p => `${p.name} (${p.stock})`).join(', ');
    const topSales = transactions.slice(0, 5).map(t => `${t.product} [${formatCurrency(t.amount)}]`).join(', ');
    return `Inventory Value: ${formatCurrency(totalStockValue)}. Low Stock: ${lowStock || 'None'}. Sales: ${topSales || 'None'}.`.trim();
  }, [products, transactions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    try {
      // Key Check
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) await aistudio.openSelectKey();
      }

      const replyText = await getSupportResponse(userMsg.text, storeContext);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: replyText, timestamp: new Date() }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Service temporarily delayed. Please verify API Key.", timestamp: new Date() }]);
    } finally { setIsTyping(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-8rem)]">
      <div className="lg:col-span-1 space-y-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Support Node</h2>
          <p className="text-slate-500 text-sm mt-1 uppercase font-bold tracking-widest">Operational Assistance</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-sm">
          <h3 className="font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><HelpCircle size={20} /></div>
            Corporate Bridge
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <Mail size={18} className="text-slate-400" />
              <span className="text-sm font-bold text-slate-700">support@automate.ph</span>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <Phone size={18} className="text-slate-400" />
              <span className="text-sm font-bold text-slate-700">+63 917 123 4567</span>
            </div>
            <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-lg shadow-indigo-100">
              <h4 className="font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">Knowledge Base</h4>
              <ul className="space-y-3 text-xs font-medium opacity-90">
                {['Registry Restoration', 'Commission Periods', 'POS Hardware Sync'].map(item => (
                   <li key={item} className="flex items-center gap-2 hover:translate-x-1 transition-transform cursor-pointer opacity-80 hover:opacity-100">• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl flex flex-col overflow-hidden">
        <div className="p-6 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200"><Bot size={24} /></div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-widest">Business Buddy</h3>
              <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest mt-0.5">Neural Layer Active</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-slate-50/20">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[85%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>
                  {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none font-medium' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                  {msg.text}
                  <div className={`text-[8px] mt-2 font-bold uppercase tracking-widest opacity-40 ${msg.role === 'user' ? 'text-white' : 'text-slate-400'}`}>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            </div>
          ))}
          {isTyping && <div className="flex gap-1.5 p-4 bg-slate-100 rounded-2xl w-fit ml-14"><div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div><div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div></div>}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSend} className="p-6 bg-white border-t border-slate-100 flex gap-4">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Query intelligence node..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/10 font-medium" />
          <button type="submit" disabled={!input.trim() || isTyping} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 text-white p-4 rounded-xl transition-all shadow-lg active:scale-95"><Send size={22} /></button>
        </form>
      </div>
    </div>
  );
};
