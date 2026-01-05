import React, { useState, useMemo, useRef, useEffect, useDeferredValue, useCallback } from 'react';
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, QrCode, 
  Printer, ScanBarcode, X, Camera, Check, ShoppingBag, ArrowRight, RotateCcw, 
  Smartphone, AlertTriangle, ChefHat, Loader2, Zap, Sparkles, ShieldCheck, 
  Lock, Shield, Info, Verified, ExternalLink, Globe, Landmark, Eye, EyeOff, 
  PauseCircle, PlayCircle, Calculator, ChevronRight, Hash, Coins, ArrowLeft, 
  Receipt, ClipboardList, PackageCheck, Wallet, Command, SearchX, Settings, 
  MapPin, PhoneCall, MessageSquare, Save, RefreshCw, AlertCircle, Building2,
  Filter, ChevronDown, Boxes, User, Archive, Bookmark, Sparkle, ShoppingBasket,
  FileText, ListChecks, ChevronUp, GripHorizontal, Delete, Wifi, Percent, Tag,
  Settings2, Volume2, VolumeX, CreditCard as CardIcon
} from 'lucide-react';
import { Product, CartItem, Transaction, HeldOrder } from '../types';
import { formatCurrency } from '../constants';

interface POSProps {
  products: Product[];
  onTransactionComplete: (transactions: Transaction[]) => void;
  businessDetails?: {
    name: string;
    address: string;
    contact: string;
    footerMessage: string;
  };
}

interface TerminalConfig {
  defaultDiscount: number;
  taxRate: number;
  soundEnabled: boolean;
  autoPrint: boolean;
}

// Global Audio Context for Haptics
let globalAudioCtx: AudioContext | null = null;

const playBeep = (type: 'success' | 'error' | 'neutral' | 'drawer' = 'neutral', enabled: boolean = true) => {
  if (!enabled) return;
  try {
    if (!globalAudioCtx) {
      globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
    const oscillator = globalAudioCtx.createOscillator();
    const gainNode = globalAudioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(globalAudioCtx.destination);
    
    if (type === 'success') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, globalAudioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, globalAudioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, globalAudioCtx.currentTime + 0.2);
    } else if (type === 'error') {
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(220, globalAudioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.05, globalAudioCtx.currentTime);
    } else if (type === 'drawer') {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(150, globalAudioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.2, globalAudioCtx.currentTime);
    } else {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, globalAudioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.05, globalAudioCtx.currentTime);
    }
    oscillator.start();
    oscillator.stop(globalAudioCtx.currentTime + 0.2);
  } catch (e) { console.warn("Audio disabled", e); }
};

type PaymentPhase = 'METHOD_SELECT' | 'CONFIRM_PAYMENT' | 'FINAL_REVIEW' | 'PROCESSING' | 'SUCCESS';

export const POS: React.FC<POSProps> = ({ products, onTransactionComplete, businessDetails }) => {
  // --- Config ---
  const [terminalConfig] = useState<TerminalConfig>(() => {
    const saved = localStorage.getItem('automate_terminal_config');
    return saved ? JSON.parse(saved) : {
      defaultDiscount: 0,
      taxRate: 12,
      soundEnabled: true,
      autoPrint: false
    };
  });

  // --- Core State ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [itemToRemove, setItemToRemove] = useState<CartItem | null>(null);
  
  // --- Payment Workflow State ---
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>('METHOD_SELECT');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [discountPercentage, setDiscountPercentage] = useState<number>(terminalConfig.defaultDiscount);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  
  // Mobile UI
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // --- Fiscal Intelligence ---
  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cart]);
  const discountAmount = useMemo(() => (subtotal * discountPercentage) / 100, [subtotal, discountPercentage]);
  const taxableSubtotal = subtotal - discountAmount;
  const tax = taxableSubtotal * (terminalConfig.taxRate / 100);
  const finalTotal = taxableSubtotal + tax;
  const changeDue = Math.max(0, (parseFloat(cashTendered) || 0) - finalTotal);

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category)))], [products]);

  // --- Actions ---
  const addToCart = useCallback((product: Product) => {
    if (product.stock <= 0) {
      playBeep('error', terminalConfig.soundEnabled);
      return;
    }
    playBeep('success', terminalConfig.soundEnabled);
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
  }, [terminalConfig.soundEnabled]);

  const confirmRemoval = (id: string) => {
    const item = cart.find(i => i.id === id);
    if (item) setItemToRemove(item);
  };

  const handleRemove = () => {
    if (itemToRemove) {
      setCart(prev => prev.filter(i => i.id !== itemToRemove.id));
      setItemToRemove(null);
      playBeep('neutral', terminalConfig.soundEnabled);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (item && item.quantity === 1 && delta === -1) {
      confirmRemoval(id);
      return;
    }
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(item => item.quantity > 0));
    playBeep('neutral', terminalConfig.soundEnabled);
  };

  const handleNumpadInput = (value: string | number) => {
    if (value === 'backspace') setCashTendered(prev => prev.slice(0, -1));
    else if (value === '.') { if (!cashTendered.includes('.')) setCashTendered(prev => prev + '.'); }
    else setCashTendered(prev => (prev === '0' ? String(value) : prev + String(value)).slice(0, 9));
  };

  const proceedToCheckout = async () => {
    setPaymentPhase('PROCESSING');
    setProcessingStatus('Verifying Node Sync...');
    try {
      await new Promise(r => setTimeout(r, 1000));
      setProcessingStatus('Securing Ledger...');
      await new Promise(r => setTimeout(r, 600));
      
      const tid = `TX-${Date.now()}`;
      const receipt = {
        id: tid, items: [...cart], subtotal, discountAmount, tax, total: finalTotal,
        paymentMethod, cashTendered, changeDue, date: new Date()
      };
      setLastReceipt(receipt);

      onTransactionComplete(cart.map(i => ({
        id: tid, productId: i.id, date: new Date().toISOString(), product: i.name, category: i.category,
        location: 'Master Node 01', amount: i.price * i.quantity, status: 'Completed', quantity: i.quantity, paymentMethod: paymentMethod as any
      })));
      
      playBeep('drawer', terminalConfig.soundEnabled);
      setPaymentPhase('SUCCESS');
    } catch (e) {
      alert("Terminal authentication failed.");
      setPaymentPhase('FINAL_REVIEW');
    }
  };

  const resetTerminal = () => {
    setCart([]); setCashTendered(''); setShowPaymentModal(false); setPaymentPhase('METHOD_SELECT');
    setDiscountPercentage(terminalConfig.defaultDiscount);
  };

  const filteredProducts = products.filter(p => 
    (selectedCategory === 'All' || p.category === selectedCategory) &&
    (p.name.toLowerCase().includes(deferredSearchTerm.toLowerCase()) || p.sku.toLowerCase().includes(deferredSearchTerm.toLowerCase()))
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-4 relative font-sans animate-in fade-in duration-500 overflow-hidden bg-slate-50/30">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; height: auto; background: white; z-index: 9999; }
        }
      `}</style>

      {/* STEP 1: Choose Item (Grid) */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        <div className="bg-white border border-slate-200 p-3 rounded-[1.75rem] shadow-sm flex flex-col gap-3">
          <div className="relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              placeholder="Query product registry..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-xs font-semibold outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
             {categories.map(cat => (
               <button 
                 key={cat} 
                 onClick={() => setSelectedCategory(cat)} 
                 className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all shrink-0 ${selectedCategory === cat ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
               >
                 {cat}
               </button>
             ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 md:pb-0 pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {filteredProducts.map(p => (
              <div key={p.id} onClick={() => addToCart(p)} className="bg-white border border-slate-200 rounded-[1.5rem] p-2.5 cursor-pointer hover:border-indigo-500 hover:shadow-xl transition-all active:scale-95 flex flex-col group h-full shadow-sm">
                <div className="aspect-square rounded-[1rem] bg-slate-50 mb-2 overflow-hidden relative border border-slate-100 flex items-center justify-center">
                  {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <ChefHat size={28} className="text-slate-200" />}
                  <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase bg-slate-900/80 text-white backdrop-blur-md">S: {p.stock}</div>
                </div>
                <div className="px-1 flex-1 flex flex-col">
                  <h4 className="text-slate-900 font-extrabold text-[10px] uppercase tracking-tight truncate">{p.name}</h4>
                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">{p.category}</p>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                    <span className="text-indigo-600 font-black text-[11px] tabular-nums">{formatCurrency(p.price)}</span>
                    <div className="w-7 h-7 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all"><Plus size={14} /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STEP 2: Check quantity and price (Sidebar) */}
      <div className={`flex flex-col bg-white border border-slate-200 shadow-2xl md:w-[320px] lg:w-[360px] md:rounded-[2.25rem] shrink-0 h-full relative overflow-hidden transition-all duration-300 ${isMobileCartOpen ? 'fixed inset-0 z-[100] rounded-none' : 'hidden md:flex'}`}>
         <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-md">
            <div className="flex items-center gap-3">
               <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-xl shadow-indigo-100">
                 <ShoppingBasket size={20} />
               </div>
               <div className="text-left">
                 <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-[0.2em] leading-none">Active Basket</h3>
                 <p className="text-[8px] text-emerald-500 font-black uppercase tracking-widest mt-1.5">Verify Qty & Price</p>
               </div>
            </div>
            {isMobileCartOpen && (
              <button onClick={() => setIsMobileCartOpen(false)} className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors">
                <X size={20}/>
              </button>
            )}
         </div>

         <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
            {cart.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-200 opacity-40 py-20">
                  <ShoppingBag size={48} className="mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Basket Empty</p>
               </div>
            ) : (
               cart.map(item => (
                  <div key={item.id} className="bg-white border border-slate-100 p-3 rounded-2xl flex items-center gap-3 group hover:border-indigo-200 transition-all shadow-sm">
                     <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <ChefHat size={16} className="text-slate-200" />}
                     </div>
                     <div className="flex-1 min-w-0">
                        <h5 className="text-slate-900 font-black text-[9px] uppercase truncate">{item.name}</h5>
                        <p className="text-indigo-600 text-[10px] font-black mt-1 tabular-nums">{formatCurrency(item.price)}</p>
                     </div>
                     <div className="flex items-center gap-1.5">
                        <div className="flex items-center bg-slate-50 rounded-full border border-slate-100 p-0.5">
                           <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 active:scale-90 transition-all"><Minus size={10}/></button>
                           <span className="w-7 text-center text-[10px] font-black text-slate-800 tabular-nums">{item.quantity}</span>
                           <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 active:scale-90 transition-all"><Plus size={10}/></button>
                        </div>
                        <button onClick={() => confirmRemoval(item.id)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                     </div>
                  </div>
               ))
            )}
         </div>

         <div className="p-6 border-t bg-slate-50/80 backdrop-blur-xl space-y-4 pb-10 md:pb-8">
            <div className="space-y-2.5">
              <div className="flex justify-between text-slate-400 text-[9px] font-black uppercase tracking-widest">
                <span>Fiscal Subtotal</span>
                <span className="tabular-nums font-bold text-slate-600">{formatCurrency(subtotal)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                 <button onClick={() => setShowDiscountInput(!showDiscountInput)} className="flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 rounded-full text-[8px] font-black uppercase text-slate-400 hover:border-indigo-300 transition-all">
                   <Tag size={10} /> {discountPercentage > 0 ? `${discountPercentage}% OFF` : 'Add Rebate'}
                 </button>
                 {discountPercentage > 0 && <span className="text-emerald-500 font-black text-[10px] tabular-nums">-{formatCurrency(discountAmount)}</span>}
              </div>

              {showDiscountInput && (
                <div className="flex items-center gap-2 animate-in slide-in-from-top-2">
                  <input 
                    type="number" 
                    value={discountPercentage || ''} 
                    onChange={e => setDiscountPercentage(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} 
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black outline-none focus:ring-2 focus:ring-indigo-100" 
                    placeholder="0%" 
                  />
                  <button onClick={() => setShowDiscountInput(false)} className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg active:scale-95"><Check size={14}/></button>
                </div>
              )}

              <div className="flex justify-between text-slate-400 text-[9px] font-black uppercase tracking-widest">
                <span>Tax ({terminalConfig.taxRate}%)</span>
                <span className="tabular-nums font-bold text-slate-600">{formatCurrency(tax)}</span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-between items-end">
                <span className="text-slate-900 font-black uppercase text-[10px] tracking-widest mb-1">Total Due</span>
                <span className="text-3xl font-black text-indigo-600 tabular-nums tracking-tighter">{formatCurrency(finalTotal)}</span>
              </div>
            </div>
            <button 
              disabled={cart.length === 0} 
              onClick={() => { setShowPaymentModal(true); setPaymentPhase('METHOD_SELECT'); }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-30 uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2"
            >
              Initialize Payment <ArrowRight size={18} />
            </button>
         </div>
      </div>

      {/* --- PAYMENT MODAL WORKFLOW --- */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-2xl flex items-center justify-center p-0 md:p-6 print:hidden">
           <div className="bg-white/95 backdrop-blur-3xl border border-white/40 rounded-none md:rounded-[3rem] w-full max-w-5xl h-full md:h-auto md:max-h-[85vh] shadow-[0_40px_100px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-500">
              
              {/* Left Panel: Stepper UI */}
              <div className="flex-1 flex flex-col p-6 md:p-10 lg:p-12 overflow-hidden relative">
                 <div className="flex justify-between items-center mb-8 shrink-0">
                    <div className="flex items-center gap-4">
                       <div className={`w-11 h-11 rounded-[1rem] flex items-center justify-center font-black transition-all ${paymentPhase === 'SUCCESS' ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-indigo-600 text-white shadow-indigo-100'} shadow-xl`}>
                          {['PROCESSING', 'SUCCESS'].includes(paymentPhase) ? <ShieldCheck size={22}/> : <Coins size={22}/>}
                       </div>
                       <div>
                          <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase text-[13px]">
                             {paymentPhase === 'METHOD_SELECT' ? 'Payment Method' : 
                              paymentPhase === 'CONFIRM_PAYMENT' ? 'Confirm Payment' :
                              paymentPhase === 'FINAL_REVIEW' ? 'Review Manifest' : 'Checkout'}
                          </h2>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1.5">Secure Transaction</p>
                       </div>
                    </div>
                    {paymentPhase !== 'PROCESSING' && paymentPhase !== 'SUCCESS' && (
                       <button onClick={() => setShowPaymentModal(false)} className="p-2.5 bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all active:scale-90"><X size={20}/></button>
                    )}
                 </div>

                 {/* Compact Header for Small Screens */}
                 <div className="md:hidden bg-slate-900 text-white p-6 rounded-2xl mb-6 shadow-2xl flex justify-between items-end border border-white/10">
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-indigo-300 mb-1">Total Payable</p>
                        <div className="text-3xl font-black tabular-nums tracking-tighter">{formatCurrency(finalTotal)}</div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black uppercase text-white/40 opacity-60">Step {['METHOD_SELECT', 'CONFIRM_PAYMENT', 'FINAL_REVIEW', 'PROCESSING', 'SUCCESS'].indexOf(paymentPhase) + 1}/5</p>
                    </div>
                 </div>

                 <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                    {/* STEP 3: Payment Method Selection */}
                    {paymentPhase === 'METHOD_SELECT' && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-in slide-in-from-bottom-4 duration-500">
                        {[
                          { id: 'Cash', icon: Banknote, color: 'emerald', label: 'Cash' },
                          { id: 'GCash', icon: Smartphone, color: 'blue', label: 'GCash Node' },
                          { id: 'Card', icon: CardIcon, color: 'indigo', label: 'Bank Card' },
                          { id: 'PayMaya', icon: Wallet, color: 'emerald', label: 'Maya Wallet' },
                          { id: 'QRPH', icon: QrCode, color: 'slate', label: 'QRPH Sync' },
                          { id: 'Bank', icon: Landmark, color: 'slate', label: 'Wire Link' },
                        ].map(m => (
                          <button 
                            key={m.id} 
                            onClick={() => { setPaymentMethod(m.id); setPaymentPhase('CONFIRM_PAYMENT'); playBeep('neutral', terminalConfig.soundEnabled); }}
                            className="bg-white border-2 border-slate-50 p-6 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:border-indigo-600 hover:bg-indigo-50/20 transition-all group shadow-sm active:scale-95"
                          >
                             <div className={`p-4 rounded-xl bg-${m.color}-50 text-${m.color}-600 group-hover:scale-110 transition-transform`}><m.icon size={26}/></div>
                             <span className="font-black text-[9px] uppercase tracking-widest text-slate-600 text-center leading-tight">{m.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* STEP 4: Confirm Payment (Tender Input) */}
                    {paymentPhase === 'CONFIRM_PAYMENT' && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full max-w-sm mx-auto flex flex-col gap-4">
                        {paymentMethod === 'Cash' ? (
                          <>
                             <div className="bg-slate-50 border-2 border-slate-200 p-6 rounded-[2.5rem] text-right shadow-inner relative group">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Capital Received</p>
                                <div className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter">₱{cashTendered || '0.00'}</div>
                                {cashTendered && <button onClick={() => setCashTendered('')} className="absolute left-5 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full text-slate-400 hover:text-rose-500 shadow-sm transition-all"><X size={14}/></button>}
                             </div>
                             
                             <div className="grid grid-cols-4 gap-2">
                                <button onClick={() => setCashTendered(finalTotal.toFixed(2))} className="py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[8px] uppercase tracking-widest border border-indigo-100 active:scale-95">Exact</button>
                                {[100, 500, 1000].map(amt => (
                                   <button key={amt} onClick={() => setCashTendered(amt.toString())} className="py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] hover:border-indigo-300 active:scale-95 shadow-sm">₱{amt}</button>
                                ))}
                             </div>

                             <div className="grid grid-cols-3 gap-2 flex-1 max-h-[340px]">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'backspace'].map(k => (
                                  <button 
                                    key={k} 
                                    onClick={() => handleNumpadInput(k)}
                                    className={`h-14 lg:h-18 rounded-2xl font-black text-xl transition-all shadow-sm flex items-center justify-center border-b-2 active:translate-y-0.5 active:border-b-0 ${k === 'backspace' ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-white border-slate-100 text-slate-800 hover:border-indigo-200'}`}
                                  >
                                    {k === 'backspace' ? <Delete size={22}/> : k}
                                  </button>
                                ))}
                             </div>
                          </>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center py-12 text-center space-y-10 animate-in zoom-in-95">
                             <div className="w-40 h-40 bg-indigo-50 rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl relative">
                                <div className="absolute inset-0 bg-indigo-500/10 blur-[60px] rounded-full animate-pulse"/>
                                <Wifi size={64} className="text-indigo-600 animate-pulse"/>
                             </div>
                             <div className="space-y-4 px-6">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase text-[16px]">External Auth</h3>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed max-w-[280px] mx-auto opacity-70">Handshaking with <span className="text-indigo-600">{paymentMethod}</span> gateway...</p>
                             </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* STEP 5: Review Audit */}
                    {paymentPhase === 'FINAL_REVIEW' && (
                      <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 h-full flex flex-col">
                         <div className="mb-6">
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Manifest Audit</h3>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Verify terminal entries</p>
                         </div>
                         <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 mb-6">
                           {cart.map(i => (
                             <div key={i.id} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-200 transition-all group">
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-black text-[10px] group-hover:bg-indigo-50 transition-colors">{i.quantity}x</div>
                                   <div className="min-w-0">
                                      <h4 className="font-bold text-slate-900 text-[11px] truncate uppercase tracking-tight max-w-[160px]">{i.name}</h4>
                                      <p className="text-[9px] text-slate-400 font-black mt-0.5 uppercase tracking-widest">{formatCurrency(i.price)}</p>
                                   </div>
                                </div>
                                <span className="font-black text-slate-900 text-[11px] tabular-nums">{formatCurrency(i.price * i.quantity)}</span>
                             </div>
                           ))}
                         </div>
                         <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex items-center gap-4 text-emerald-700 shadow-sm border-dashed">
                           <ShieldCheck size={28} className="shrink-0" />
                           <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">Inventory stock lock engaged. Ready for ledger commit.</p>
                         </div>
                      </div>
                    )}

                    {/* STEP 6: Proceed Checkout (Processing) */}
                    {paymentPhase === 'PROCESSING' && (
                      <div className="h-full flex flex-col items-center justify-center py-20 gap-8 animate-in zoom-in-95 duration-700">
                         <div className="relative">
                            <Loader2 size={110} className="text-indigo-600 animate-spin" strokeWidth={3}/>
                            <div className="absolute inset-0 flex items-center justify-center"><Zap size={36} className="text-indigo-200 fill-indigo-500/10"/></div>
                         </div>
                         <div className="text-center space-y-4">
                           <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase tracking-wider">Syncing Ledger</h3>
                           <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">{processingStatus}</p>
                         </div>
                      </div>
                    )}

                    {/* STEP 7 & 8: Success (Print Receipt > Done) */}
                    {paymentPhase === 'SUCCESS' && (
                      <div className="h-full flex flex-col items-center justify-center py-12 text-center animate-in zoom-in-95 duration-500">
                         <div className="w-28 h-28 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-2xl border-4 border-emerald-100 animate-bounce">
                           <Check size={52} strokeWidth={6}/>
                         </div>
                         <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter uppercase text-[24px]">Session Success</h2>
                         <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.4em] mb-12 max-w-[280px] mx-auto leading-relaxed">Registry Synced • Store Nodes Updated Consistent</p>
                         
                         <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                            <button onClick={() => window.print()} className="py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 flex items-center justify-center gap-2 transition-all"><Printer size={18}/> Print Receipt</button>
                            <button onClick={resetTerminal} className="py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">New Session</button>
                         </div>
                      </div>
                    )}
                 </div>

                 {/* Modal Step Navigation */}
                 {['METHOD_SELECT', 'CONFIRM_PAYMENT', 'FINAL_REVIEW'].includes(paymentPhase) && (
                    <div className="mt-auto pt-6 border-t border-slate-100 flex gap-3 bg-white/40 backdrop-blur-sm shrink-0">
                       {paymentPhase !== 'METHOD_SELECT' && (
                          <button onClick={() => setPaymentPhase(paymentPhase === 'FINAL_REVIEW' ? 'CONFIRM_PAYMENT' : 'METHOD_SELECT')} className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-[9px] hover:text-slate-900 transition-colors flex items-center justify-center gap-2 active:scale-95">
                            <ArrowLeft size={14}/> Back
                          </button>
                       )}
                       {paymentPhase === 'METHOD_SELECT' && (
                         <div className="flex-1"></div>
                       )}
                       {paymentPhase === 'CONFIRM_PAYMENT' && (
                         <button 
                            disabled={paymentMethod === 'Cash' && (!cashTendered || parseFloat(cashTendered) < finalTotal)}
                            onClick={() => { setPaymentPhase('FINAL_REVIEW'); playBeep('success', terminalConfig.soundEnabled); }}
                            className="flex-[2] bg-slate-900 text-white rounded-2xl font-black py-4 shadow-xl active:scale-95 uppercase tracking-widest text-[10px] disabled:opacity-30 transition-all flex items-center justify-center gap-2"
                         >
                           Check Manifest <ChevronRight size={18}/>
                         </button>
                       )}
                       {paymentPhase === 'FINAL_REVIEW' && (
                         <button onClick={proceedToCheckout} className="flex-[2] bg-indigo-600 text-white rounded-2xl font-black py-4 shadow-xl active:scale-95 uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2">Finalize Sale <ArrowRight size={18}/></button>
                       )}
                    </div>
                 )}
              </div>

              {/* Right Panel: Persistent Summary (Desktop/Tablet) */}
              <div className="hidden md:flex w-[280px] lg:w-[380px] p-8 lg:p-10 bg-white shrink-0 shadow-[-20px_0_80px_rgba(0,0,0,0.03)] flex-col overflow-y-auto no-scrollbar relative">
                 <div className="mb-10">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-3 leading-none">Net Amount Due</p>
                    <h3 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter tabular-nums drop-shadow-sm leading-none">{formatCurrency(finalTotal)}</h3>
                 </div>

                 <div className="space-y-4 flex-1">
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] shadow-inner relative overflow-hidden group transition-all">
                       <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Verified size={64}/></div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2 relative z-10 leading-none">
                         <Lock size={12} className="text-indigo-500" /> Authorized Tender
                       </p>
                       <div className="flex items-center gap-4 relative z-10">
                          <div className="w-1.5 h-12 bg-indigo-500 rounded-full" />
                          <div>
                             <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">{paymentMethod}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-2 leading-none">Master Node 01</p>
                          </div>
                       </div>
                    </div>

                    {paymentMethod === 'Cash' && paymentPhase !== 'METHOD_SELECT' && (
                      <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-[2rem] shadow-xl shadow-emerald-500/5 animate-in slide-in-from-top-2 duration-500">
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2 leading-none"><Coins size={14}/> Change Return</p>
                        <p className="text-4xl font-black text-emerald-600 tabular-nums tracking-tighter leading-none">{formatCurrency(changeDue)}</p>
                      </div>
                    )}

                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-3 shadow-sm">
                       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400"><span>Fiscal Base</span><span className="tabular-nums font-bold text-slate-600">{formatCurrency(subtotal)}</span></div>
                       {discountAmount > 0 && <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-emerald-600"><span>Rebate</span><span className="tabular-nums font-bold">-{formatCurrency(discountAmount)}</span></div>}
                       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400"><span>VAT ({terminalConfig.taxRate}%)</span><span className="tabular-nums font-bold text-slate-600">{formatCurrency(tax)}</span></div>
                    </div>
                 </div>

                 <div className="mt-10 pt-6 border-t border-slate-50 text-center opacity-30 shrink-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] leading-none">AutoMate Precision Node v3.2</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Item Removal Verification Dialog */}
      {itemToRemove && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="absolute inset-0" onClick={() => setItemToRemove(null)} />
          <div className="relative bg-white border border-slate-200 rounded-[2.5rem] p-8 max-w-sm w-full shadow-3xl text-center animate-in zoom-in-95 duration-300">
             <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-rose-500 shadow-xl border border-rose-100">
                <Trash2 size={28} />
             </div>
             <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2 uppercase text-[14px]">Void Entry?</h3>
             <p className="text-slate-500 text-[11px] font-medium mb-8 leading-relaxed px-4 opacity-70">
               Confirm removal of <span className="text-slate-900 font-bold">"{itemToRemove.name}"</span> from the current manifest?
             </p>
             <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setItemToRemove(null)} className="py-3.5 bg-slate-100 text-slate-500 font-black rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[9px] active:scale-95">Cancel</button>
                <button onClick={handleRemove} className="py-3.5 bg-rose-600 text-white font-black rounded-xl shadow-lg transition-all uppercase tracking-widest text-[9px] active:scale-95">Confirm</button>
             </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Footer Toggle */}
      <div className="md:hidden fixed bottom-6 left-4 right-4 flex gap-3 z-50">
        <button 
          onClick={() => setIsMobileCartOpen(true)}
          className="flex-1 bg-slate-900 text-white p-4 rounded-[1.75rem] shadow-2xl flex items-center justify-between px-6 active:scale-95 transition-transform border border-white/10"
        >
          <div className="flex items-center gap-3">
            <ShoppingBasket size={18} className="text-indigo-400" />
            <span className="font-black text-[11px] uppercase tracking-[0.2em]">{cart.reduce((a,c)=>a+c.quantity,0)} Assets Selected</span>
          </div>
          <span className="font-black text-[11px] tabular-nums tracking-wider">{formatCurrency(finalTotal)}</span>
        </button>
      </div>

      {/* Hidden Print Receipt Template */}
      <div id="receipt-print-area" className="hidden">
        {lastReceipt && (
           <div className="p-10 font-mono text-[10px] max-w-[80mm] mx-auto text-black leading-relaxed bg-white">
              <div className="text-center mb-6 space-y-1">
                <h1 className="text-xl font-black uppercase tracking-tighter">{businessDetails?.name || 'AutoMate Terminal'}</h1>
                <p className="text-[9px] font-bold opacity-70 uppercase">{businessDetails?.address}</p>
                <p className="text-[8px] font-medium opacity-60 uppercase">{new Date(lastReceipt.date).toLocaleString()}</p>
              </div>
              <div className="border-b border-black border-dashed mb-4"></div>
              <div className="space-y-3">
                {lastReceipt.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-start uppercase">
                    <div className="flex-1 pr-4">
                        <span className="font-bold">{item.name}</span>
                        <div className="text-[8px] opacity-60">{item.quantity} x {formatCurrency(item.price)}</div>
                    </div>
                    <div className="font-black tabular-nums">{formatCurrency(item.price * item.quantity)}</div>
                  </div>
                ))}
              </div>
              <div className="border-b border-black border-dashed my-6"></div>
              <div className="space-y-1.5 font-black">
                 <div className="flex justify-between"><span>SUBTOTAL</span><span>{formatCurrency(lastReceipt.subtotal)}</span></div>
                 {lastReceipt.discountAmount > 0 && <div className="flex justify-between"><span>REBATE</span><span>-{formatCurrency(lastReceipt.discountAmount)}</span></div>}
                 <div className="flex justify-between"><span>VAT ({terminalConfig.taxRate}%)</span><span>{formatCurrency(lastReceipt.tax)}</span></div>
                 <div className="flex justify-between text-base border-t border-black pt-2 uppercase"><span>NET TOTAL</span><span>{formatCurrency(lastReceipt.total)}</span></div>
              </div>
              <div className="mt-6 pt-4 border-t border-black border-dashed space-y-1 text-[9px] font-bold uppercase opacity-80">
                <div className="flex justify-between"><span>TENDER TYPE</span><span>{lastReceipt.paymentMethod}</span></div>
                {lastReceipt.paymentMethod === 'Cash' && (
                  <>
                    <div className="flex justify-between"><span>RECEIVED</span><span>{formatCurrency(parseFloat(lastReceipt.cashTendered) || 0)}</span></div>
                    <div className="flex justify-between"><span>CHANGE</span><span>{formatCurrency(lastReceipt.changeDue)}</span></div>
                  </>
                )}
              </div>
              <div className="mt-12 text-center text-[8px] font-black uppercase opacity-60 leading-tight space-y-1">
                <p>{businessDetails?.footerMessage || 'Official Sales Voucher'}</p>
                <p>Node ID: {lastReceipt.id}</p>
                <p>AutoMate™ Logic Verified</p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};