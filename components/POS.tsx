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
  FileText, ListChecks, ChevronUp, GripHorizontal
} from 'lucide-react';
import { Product, CartItem, Transaction, HeldOrder } from '../types';
import { formatCurrency } from '../constants';
import { BrowserMultiFormatReader } from '@zxing/browser';

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

interface ReceiptConfig {
  name: string;
  address: string;
  contact: string;
  footerMessage: string;
  taxRate?: number;
}

type POSSystemError = {
  code: 'SCAN_FAILURE' | 'PAYMENT_REJECTED' | 'NETWORK_LATENCY' | 'STOCK_SYNC_ERROR' | 'VALIDATION_ERROR';
  message: string;
  timestamp: Date;
};

let globalAudioCtx: AudioContext | null = null;

const playBeep = (type: 'success' | 'error' | 'neutral' | 'drawer' = 'neutral') => {
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
  } catch (e) { console.warn("Audio feedback disabled", e); }
};

// Workflow Phases: Method -> Details -> Review -> Processing -> Success/Print -> Done
type PaymentPhase = 'METHOD_SELECT' | 'METHOD_DETAILS' | 'REVIEW' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

export const POS: React.FC<POSProps> = ({ products, onTransactionComplete, businessDetails }) => {
  // --- Core State ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSupplier, setSelectedSupplier] = useState('All');
  const [customerName, setCustomerName] = useState('');
  
  // --- Order Suspension ---
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() => {
    const saved = localStorage.getItem('automate_pos_held_orders');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHeldOrdersModal, setShowHeldOrdersModal] = useState(false);

  // --- Transaction Context ---
  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>('METHOD_SELECT');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [systemError, setSystemError] = useState<POSSystemError | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  
  // --- UI Controls ---
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  
  // --- Scanner State ---
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const controlsRef = useRef<any>(null);
  const isProcessingScan = useRef(false);

  // --- Receipt Config ---
  const [receiptConfig, setReceiptConfig] = useState<ReceiptConfig>(() => {
    const STORAGE_KEY = 'automate_pos_receipt_config';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) { console.error("Config parse failure", e); }
    return {
      name: businessDetails?.name || 'AutoMate POS Terminal',
      address: businessDetails?.address || '123 Business Road, Metro Manila',
      contact: businessDetails?.contact || 'support@automate.ph',
      footerMessage: businessDetails?.footerMessage || 'Official Digital Receipt'
    };
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- Calculations ---
  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cart]);
  const tax = subtotal * 0.12;
  const finalTotal = subtotal + tax;
  const changeDue = Math.max(0, (parseFloat(cashTendered) || 0) - finalTotal);
  const totalItems = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category)))], [products]);
  const suppliers = useMemo(() => ['All', ...Array.from(new Set(products.filter(p => p.supplier).map(p => p.supplier as string)))], [products]);

  // --- Handlers ---
  const addToCart = useCallback((product: Product) => {
    if (product.stock <= 0) {
      playBeep('error');
      setSystemError({ code: 'VALIDATION_ERROR', message: `Stock exhausted for ${product.name}.`, timestamp: new Date() });
      return;
    }
    playBeep('success');
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          setSystemError({ code: 'VALIDATION_ERROR', message: "Maximum stock reached.", timestamp: new Date() });
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, [products]);

  // --- Scanner Logic ---
  const startScanning = () => {
    setIsScanning(true);
    setScanSuccess(false);
    isProcessingScan.current = false;
  };

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
  }, []);

  const onVideoRef = useCallback((node: HTMLVideoElement | null) => {
    setVideoElement(node);
  }, []);

  useEffect(() => {
    if (!isScanning || !videoElement) return;

    const reader = new BrowserMultiFormatReader();
    
    const initScanner = async () => {
      try {
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoElement,
          (result, err) => {
            if (result && !isProcessingScan.current) {
              const code = result.getText();
              const p = products.find(prod => prod.id === code || prod.sku === code);
              
              if (p) {
                isProcessingScan.current = true;
                setScanSuccess(true);
                addToCart(p);
                setTimeout(() => {
                  setScanSuccess(false);
                  isProcessingScan.current = false;
                }, 1500);
              }
            }
          }
        );
        controlsRef.current = controls;
      } catch (e) {
        console.error("Scanner init failed", e);
        setSystemError({ code: 'SCAN_FAILURE', message: "Camera access unavailable", timestamp: new Date() });
      }
    };

    initScanner();

    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
    };
  }, [isScanning, videoElement, products, addToCart]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchInputRef.current?.focus(); }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); isScanning ? stopScanning() : startScanning(); }
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (cart.length > 0 && !showPaymentModal && !isMobileCartOpen) {
          setShowPaymentModal(true);
          setPaymentPhase('METHOD_SELECT');
        } else if (showPaymentModal) {
             if (paymentPhase === 'METHOD_DETAILS') validatePaymentDetails();
             else if (paymentPhase === 'REVIEW') processTransaction();
             else if (paymentPhase === 'SUCCESS') handleDone();
        }
      }
      if (e.key === 'Escape') {
        // Only allow close if not processing
        if (paymentPhase !== 'PROCESSING') {
             setShowPaymentModal(false);
             setShowHeldOrdersModal(false);
             setShowConfigModal(false);
             setIsMobileCartOpen(false);
             if (isScanning) stopScanning();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isScanning, showPaymentModal, paymentPhase, stopScanning, isMobileCartOpen]);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQty = Math.max(0, item.quantity + delta);
          if (newQty > 0) playBeep('neutral'); 
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
    playBeep('neutral');
  }, []);

  const holdOrder = () => {
    if (cart.length === 0) return;
    const newHeldOrder: HeldOrder = {
      id: `HELD-${Date.now()}`,
      items: [...cart],
      timestamp: new Date(),
      customerName: customerName || 'Walk-in Customer'
    };
    setHeldOrders(prev => [newHeldOrder, ...prev]);
    setCart([]);
    setCustomerName('');
    playBeep('neutral');
  };

  const resumeOrder = (order: HeldOrder) => {
    setCart(order.items);
    setCustomerName(order.customerName || '');
    setHeldOrders(prev => prev.filter(o => o.id !== order.id));
    setShowHeldOrdersModal(false);
    playBeep('success');
  };

  // --- Transaction Flow Logic ---

  // Step 1: Validate Details -> Move to Review
  const validatePaymentDetails = () => {
      if (paymentMethod === 'Cash' && (parseFloat(cashTendered) || 0) < finalTotal) {
          setSystemError({ code: 'VALIDATION_ERROR', message: "Insufficient tender amount.", timestamp: new Date() });
          return;
      }
      setPaymentPhase('REVIEW');
      setSystemError(null);
  };

  // Step 2: Process -> Move to Success
  const processTransaction = async () => {
    setPaymentPhase('PROCESSING');
    setProcessingStatus('Securing Stock Lock...');
    try {
      // Simulate API Lag
      await new Promise(r => setTimeout(r, 800));
      
      const invalid = cart.filter(item => {
        const p = products.find(prod => prod.id === item.id);
        return !p || p.stock < item.quantity;
      });
      if (invalid.length > 0) throw new Error("STOCK_SYNC_ERROR");
      
      setProcessingStatus('Committing Ledger...');
      await new Promise(r => setTimeout(r, 600));
      
      const tid = `TX-${Date.now()}`;
      
      const receiptData = {
        id: tid,
        items: [...cart],
        subtotal,
        tax,
        total: finalTotal,
        paymentMethod,
        cashTendered: paymentMethod === 'Cash' ? cashTendered : null,
        changeDue: paymentMethod === 'Cash' ? changeDue : null,
        date: new Date(),
        customerName
      };
      setLastReceipt(receiptData);

      const txData: Transaction[] = cart.map(i => ({ 
        id: tid, productId: i.id, date: new Date().toISOString(), product: i.name, 
        category: i.category, location: 'Main Terminal', amount: i.price * i.quantity, 
        status: 'Completed', quantity: i.quantity, paymentMethod: paymentMethod as any
      }));
      
      onTransactionComplete(txData);
      
      if (paymentMethod === 'Cash') playBeep('drawer');
      setPaymentPhase('SUCCESS');
      
    } catch (err: any) {
      playBeep('error');
      setPaymentPhase('ERROR');
      setSystemError({
        code: err.message === 'STOCK_SYNC_ERROR' ? 'STOCK_SYNC_ERROR' : 'NETWORK_LATENCY',
        message: err.message === 'STOCK_SYNC_ERROR' ? "Inventory shifted during process. Recalculating..." : "Handshake failure.",
        timestamp: new Date()
      });
    }
  };

  // Step 3: Done -> Reset
  const handleDone = () => {
      setCart([]); 
      setCustomerName(''); 
      setShowPaymentModal(false);
      setIsMobileCartOpen(false);
      setPaymentPhase('METHOD_SELECT'); 
      setCashTendered('');
      setLastReceipt(null);
  };

  const handlePrint = useCallback(() => {
    if (lastReceipt) {
      setTimeout(() => window.print(), 50);
    }
  }, [lastReceipt]);

  const filteredProducts = useMemo(() => {
    const term = deferredSearchTerm.toLowerCase().trim();
    return products.filter(p => {
      const ms = p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
      const mc = selectedCategory === 'All' || p.category === selectedCategory;
      const msup = selectedSupplier === 'All' || p.supplier === selectedSupplier;
      return ms && mc && msup;
    });
  }, [products, deferredSearchTerm, selectedCategory, selectedSupplier]);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6 relative font-sans animate-in fade-in duration-500">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; background: white; color: black; }
          @page { margin: 0; size: auto; }
          .no-print { display: none !important; }
        }
        /* Cart Item Animation */
        .cart-item-enter { animation: slideInRight 0.3s ease-out forwards; }
        .cart-item-exit { animation: slideOutLeft 0.3s ease-in forwards; }
        .cart-quantity-bump { animation: pulseScale 0.2s ease-in-out; }
        
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideOutLeft {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(-20px); height: 0; margin: 0; padding: 0; }
        }
        @keyframes pulseScale {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Search and Catalog Area */}
      <div className="flex-1 flex flex-col gap-4 md:gap-6 min-h-0 print:hidden relative">
        
        {/* Modern Control Bar */}
        <div className="bg-white/70 backdrop-blur-xl border border-slate-200/60 p-4 md:p-5 rounded-[2rem] shadow-xl shadow-slate-200/40 flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row items-stretch gap-4">
            <div className="flex flex-col md:flex-row items-center gap-3 flex-1">
               <div className="relative flex-1 group w-full">
                  <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input 
                    ref={searchInputRef}
                    placeholder="Search registry... (Ctrl+K)" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-[1.5rem] pl-14 pr-12 py-3.5 md:py-4 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-700" 
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-black text-slate-400 shadow-sm">
                    <Command size={10} /> K
                  </div>
               </div>
               
               <div className="flex w-full md:w-auto gap-2">
                 <button 
                  onClick={isScanning ? stopScanning : startScanning}
                  className={`flex-1 md:flex-none p-3.5 md:p-4 rounded-[1.5rem] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 group ${isScanning ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}`}
                 >
                    <ScanBarcode size={22} className={isScanning ? 'animate-pulse' : ''} />
                    <span className="md:hidden xl:block text-[10px] font-black uppercase tracking-widest">{isScanning ? 'Stop' : 'Scan'}</span>
                 </button>
                 <button 
                  onClick={() => setShowHeldOrdersModal(true)} 
                  className={`flex-1 md:flex-none p-3.5 md:p-4 bg-white text-slate-500 border border-slate-200 rounded-[1.5rem] hover:text-amber-600 hover:border-amber-200 transition-all relative flex items-center justify-center gap-2 group shadow-sm active:scale-95 ${heldOrders.length > 0 ? 'text-amber-600' : ''}`}
                 >
                    <Archive size={22} />
                    <span className="md:hidden xl:block text-[10px] font-black uppercase tracking-widest">Held</span>
                    {heldOrders.length > 0 && <span className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-4 border-white shadow-md">{heldOrders.length}</span>}
                 </button>
               </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-50/50 p-1.5 rounded-[1.5rem] border border-slate-200/60 shadow-inner w-full xl:w-auto">
               <div className="px-4 text-slate-400 border-r border-slate-200/60"><Building2 size={18}/></div>
               <div className="relative flex-1 xl:min-w-[140px]">
                 <select 
                   value={selectedSupplier}
                   onChange={e => setSelectedSupplier(e.target.value)}
                   className="w-full bg-transparent border-none py-2 text-xs font-black uppercase tracking-widest text-slate-700 outline-none cursor-pointer appearance-none pr-8"
                 >
                   {suppliers.map(s => <option key={s} value={s}>{s === 'All' ? 'All Sources' : s}</option>)}
                 </select>
                 <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
               </div>
            </div>
          </div>

          {/* Elegant Category Scroller */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar w-full pb-1 border-t border-slate-100/60 pt-4">
             {categories.map(cat => (
               <button 
                 key={cat} 
                 onClick={() => setSelectedCategory(cat)} 
                 className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border transition-all active:scale-95 whitespace-nowrap shadow-sm ${selectedCategory === cat ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-200' : 'bg-white text-slate-500 border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/30'}`}
               >
                 {cat}
               </button>
             ))}
          </div>
        </div>

        {/* Masonry Product Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 md:pr-2 min-h-0 pb-24 md:pb-0">
          {filteredProducts.length > 0 ? (
            <div className="columns-2 lg:columns-3 xl:columns-4 gap-3 md:gap-5 space-y-3 md:space-y-5 pb-10">
              {filteredProducts.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => addToCart(p)} 
                  className="break-inside-avoid bg-white border border-slate-200/80 rounded-[2rem] p-3 md:p-4 cursor-pointer hover:border-indigo-500 hover:shadow-[0_20px_40px_rgba(79,70,229,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col group relative overflow-hidden active:scale-95 md:active:scale-100"
                >
                   {/* Variable Height Image Logic */}
                   <div className={`rounded-[1.5rem] bg-slate-50/50 mb-3 overflow-hidden relative flex items-center justify-center border border-slate-100/50 shadow-inner group-hover:bg-white transition-colors aspect-square`}>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={p.name}/> 
                      ) : (
                        <ChefHat size={36} className="text-slate-200 group-hover:text-indigo-200 group-hover:scale-110 transition-all duration-1000" />
                      )}
                      
                      {/* Glassmorphic Stock Pill */}
                      <div className={`absolute top-2 right-2 md:top-3 md:right-3 px-2 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-xl backdrop-blur-xl border transition-all ${p.stock < 10 ? 'bg-rose-500/90 text-white border-rose-400/50 animate-pulse' : 'bg-slate-900/70 text-white border-white/20'}`}>
                        <Boxes size={10} /> {p.stock}
                      </div>
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                   </div>
                   
                   <div className="flex-1 space-y-1 px-1">
                     <h4 className="text-slate-900 font-extrabold text-[11px] md:text-xs uppercase tracking-tight leading-tight line-clamp-2">{p.name}</h4>
                     <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.category}</p>
                     <div className="flex items-center justify-between gap-2 pt-1.5 md:pt-2">
                       <p className="text-indigo-600 text-xs md:text-sm font-black tracking-tight">{formatCurrency(p.price)}</p>
                       <div className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-active:scale-90 shadow-sm">
                         <Plus size={14} strokeWidth={3} />
                       </div>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full py-24 text-center flex flex-col items-center gap-6 opacity-40 animate-in fade-in duration-700">
               <div className="w-24 h-24 rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center text-slate-200">
                  <SearchX size={48} />
               </div>
               <div className="space-y-1">
                 <p className="text-xl font-black text-slate-900 uppercase tracking-[0.2em]">Registry mismatch</p>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Adjust query to locate assets</p>
               </div>
            </div>
          )}
        </div>

        {/* Mobile Floating Cart Action Bar */}
        <div 
          onClick={() => setIsMobileCartOpen(true)}
          className="md:hidden fixed bottom-6 left-4 right-4 bg-slate-900 text-white p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-40 flex justify-between items-center cursor-pointer active:scale-95 transition-transform border border-slate-800"
        >
            <div className="flex items-center gap-4">
               <div className="bg-indigo-600 px-3 py-1.5 rounded-xl text-white font-black text-xs shadow-lg shadow-indigo-900/50">{totalItems} Items</div>
               <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Total Payable</span>
                  <span className="text-lg font-black tracking-tight leading-none">{formatCurrency(finalTotal)}</span>
               </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 px-4 py-2 rounded-xl">
               View Cart <ChevronUp size={14} />
            </div>
        </div>
      </div>

      {/* Elegant Checkout Panel - Responsive Drawer */}
      <div className={`
        flex flex-col bg-white/90 backdrop-blur-2xl border border-slate-200 shadow-2xl transition-all duration-300 ease-in-out
        ${isMobileCartOpen 
          ? 'fixed inset-0 z-50 rounded-none w-full h-full' 
          : 'hidden md:flex w-full md:w-[400px] xl:w-[440px] rounded-[3rem] shrink-0 h-full relative translate-y-0 opacity-100'}
      `}>
         
         {/* Cart Header */}
         <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-white/40">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-200">
                 <ShoppingBasket size={24} />
               </div>
               <div>
                 <h3 className="font-black text-slate-900 text-xs uppercase tracking-[0.2em]">Active Basket</h3>
                 <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mt-1">Terminal Secure</p>
               </div>
            </div>
            <div className="flex items-center gap-2">
              {isMobileCartOpen ? (
                <button onClick={() => setIsMobileCartOpen(false)} className="p-3 bg-slate-100 text-slate-500 rounded-2xl active:scale-90"><X size={20}/></button>
              ) : (
                <>
                  <button 
                    onClick={holdOrder} 
                    disabled={cart.length === 0} 
                    title="Suspend Session" 
                    className="p-3 text-amber-500 hover:bg-amber-50 rounded-2xl border border-transparent hover:border-amber-200 disabled:opacity-20 transition-all active:scale-90"
                  >
                    <Archive size={20} />
                  </button>
                  <button 
                    onClick={() => { setCart([]); setCustomerName(''); }} 
                    className="p-3 text-slate-400 hover:text-rose-500 transition-all hover:bg-rose-50 rounded-2xl border border-transparent hover:border-rose-200 active:scale-90"
                  >
                    <RotateCcw size={20} />
                  </button>
                </>
              )}
            </div>
         </div>

         {/* Contextual Input Field */}
         <div className="px-6 md:px-8 py-5 bg-slate-50/40 border-b border-slate-100 flex items-center gap-5">
            <div className="p-2.5 bg-white rounded-xl text-slate-300 border border-slate-200/60 shadow-sm"><User size={16}/></div>
            <input 
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Assign Client Identity..."
              className="bg-transparent border-none text-xs font-black text-slate-800 placeholder-slate-400 w-full outline-none uppercase tracking-widest"
            />
         </div>
         
         {/* Items Area */}
         <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 custom-scrollbar">
            {cart.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-8 opacity-30 animate-in fade-in duration-500">
                  <div className="w-28 h-28 rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center animate-spin-slow">
                    <ShoppingBasket size={48} />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.4em]">Empty Protocol</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest">Awaiting terminal entry</p>
                  </div>
               </div>
            ) : (
               cart.map(item => (
                  <div key={item.id} className="cart-item-enter bg-white border border-slate-100 p-4 rounded-[1.75rem] flex flex-col gap-3 group hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all">
                     <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                           <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                              {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} /> : <ChefHat size={20} className="text-slate-300" />}
                           </div>
                           <div className="min-w-0">
                             <h5 className="text-slate-900 font-black text-[10px] truncate uppercase tracking-tight leading-none">{item.name}</h5>
                             <p className="text-indigo-600 text-[9px] font-black mt-1.5">{formatCurrency(item.price)}</p>
                           </div>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                     </div>
                     <div className="flex justify-between items-center pt-2 border-t border-slate-50/80">
                        <div className="flex items-center bg-slate-50/80 rounded-full border border-slate-200 p-0.5 gap-1">
                           <button 
                            onClick={() => updateQuantity(item.id, -1)} 
                            className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-full text-slate-400 hover:text-indigo-600 transition-all active:scale-75 shadow-sm"
                           >
                             <Minus size={12} strokeWidth={3} />
                           </button>
                           <span className="w-8 text-center text-xs font-black text-slate-900 cart-quantity-bump" key={item.quantity}>{item.quantity}</span>
                           <button 
                            onClick={() => updateQuantity(item.id, 1)} 
                            className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-full text-slate-400 hover:text-indigo-600 transition-all active:scale-75 shadow-sm"
                           >
                             <Plus size={12} strokeWidth={3} />
                           </button>
                        </div>
                        <span className="text-slate-900 font-black text-sm tabular-nums">{formatCurrency(item.price * item.quantity)}</span>
                     </div>
                  </div>
               ))
            )}
         </div>

         {/* Fiscal Summary Layer */}
         <div className="p-8 md:p-10 border-t border-slate-100 bg-slate-50/80 space-y-6 md:space-y-7 backdrop-blur-xl pb-24 md:pb-10">
            <div className="space-y-4">
              <div className="flex justify-between text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]"><span>Fiscal Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]"><span>VAT Allocation (12%)</span><span>{formatCurrency(tax)}</span></div>
              <div className="pt-6 border-t border-slate-200 flex justify-between items-center">
                <span className="text-slate-900 font-black uppercase tracking-[0.25em] text-[10px]">Total Payable</span>
                <span className="text-4xl font-black text-indigo-600 tabular-nums tracking-tighter drop-shadow-sm">{formatCurrency(finalTotal)}</span>
              </div>
            </div>
            
            <button 
              onClick={() => { setShowPaymentModal(true); setPaymentPhase('METHOD_SELECT'); }} 
              disabled={cart.length === 0} 
              className="group w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 md:py-7 rounded-[2rem] shadow-2xl shadow-indigo-200 transition-all active:scale-95 disabled:opacity-20 disabled:grayscale uppercase tracking-[0.25em] text-[11px] flex items-center justify-center gap-4"
            >
              Initialize Payment <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform" />
            </button>
         </div>
      </div>

      {/* Persistence Modal: Held Orders */}
      {showHeldOrdersModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 print:hidden">
           <div className="bg-white/95 backdrop-blur-3xl border border-white/50 rounded-[2.5rem] md:rounded-[3.5rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[85vh]">
              <div className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                 <div className="flex items-center gap-4 md:gap-5">
                    <div className="p-3 md:p-4 bg-amber-500 rounded-2xl text-white shadow-xl shadow-amber-200"><Archive size={24} /></div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none">Parked Sessions</h3>
                      <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2">Resume suspended commerce states</p>
                    </div>
                 </div>
                 <button onClick={() => setShowHeldOrdersModal(false)} className="p-3 text-slate-400 hover:text-slate-900 bg-white border border-slate-200 rounded-2xl transition-all shadow-sm"><X size={24} /></button>
              </div>
              <div className="p-6 md:p-10 overflow-y-auto space-y-4 md:space-y-5 custom-scrollbar bg-slate-50/20">
                 {heldOrders.length > 0 ? heldOrders.map(order => (
                    <div key={order.id} className="p-6 md:p-8 bg-white border border-slate-100 rounded-[2rem] md:rounded-[2.5rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all shadow-sm">
                       <div className="flex items-center gap-4 md:gap-6">
                          <div className="p-3 md:p-4 bg-slate-50 rounded-2xl text-slate-300 border border-slate-100 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all"><Bookmark size={24} /></div>
                          <div>
                            <h4 className="font-black text-slate-900 text-sm md:text-base uppercase tracking-tight">{order.customerName}</h4>
                            <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1.5">{order.items.length} Assets • {new Date(order.timestamp).toLocaleString()}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-3 w-full sm:w-auto">
                          <button onClick={() => setHeldOrders(prev => prev.filter(o => o.id !== order.id))} className="p-3 md:p-4 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all active:scale-90"><Trash2 size={20}/></button>
                          <button onClick={() => resumeOrder(order)} className="flex-1 sm:flex-none px-6 md:px-8 py-3 md:py-4 bg-indigo-600 text-white font-black text-[10px] md:text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">Resume Session</button>
                       </div>
                    </div>
                 )) : (
                   <div className="py-24 text-center flex flex-col items-center gap-6 opacity-30">
                      <div className="w-24 h-24 rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center"><Archive size={48} className="text-slate-200"/></div>
                      <p className="text-[11px] font-black uppercase tracking-[0.4em]">No parked sessions found</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Intelligent Payment Gate Overlay */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-2xl flex items-center justify-center p-4 md:p-6 print:hidden">
           <div className="bg-white/95 backdrop-blur-3xl border border-white/40 rounded-[2.5rem] md:rounded-[4rem] w-full max-w-6xl shadow-[0_40px_100px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-500 max-h-[90vh]">
              
              {/* Left Side: Interaction / Review List */}
              <div className="flex-1 flex flex-col bg-slate-50/50 border-r border-slate-200/60 p-6 md:p-14 overflow-hidden relative">
                 {paymentPhase === 'METHOD_SELECT' && (
                   <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 overflow-y-auto">
                     <div className="flex items-center gap-4 mb-3">
                        <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">Choose Tender</h2>
                     </div>
                     <p className="text-slate-400 text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] mb-8 md:mb-14">Authorized Gate Architecture v3.1</p>
                     
                     <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                       {[
                         { id: 'Cash', icon: Banknote, label: 'Physical Cash', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                         { id: 'GCash', icon: Smartphone, label: 'GCash Hub', color: 'bg-blue-50 text-blue-600 border-blue-100' },
                         { id: 'Stripe', icon: CreditCard, label: 'Secure Card', color: 'bg-indigo-600 text-white border-indigo-500 shadow-xl shadow-indigo-200' },
                         { id: 'PayPal', icon: Wallet, label: 'PayPal Link', color: 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-200' },
                       ].map(method => (
                         <button 
                          key={method.id} 
                          onClick={() => { setPaymentMethod(method.id); setPaymentPhase(method.id === 'Cash' ? 'METHOD_DETAILS' : 'REVIEW'); }} 
                          className={`p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border-4 flex flex-col items-center gap-4 md:gap-6 transition-all active:scale-95 ${paymentMethod === method.id ? 'border-indigo-600 bg-white ring-[8px] md:ring-[12px] ring-indigo-50 shadow-2xl' : 'border-white bg-white/60 hover:border-indigo-100 shadow-lg'}`}
                         >
                           <div className={`p-4 md:p-6 rounded-3xl ${method.color} shadow-lg shadow-current/10`}><method.icon size={32} className="md:w-[44px] md:h-[44px]" /></div>
                           <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.25em] text-slate-700 text-center">{method.label}</span>
                         </button>
                       ))}
                     </div>
                   </div>
                 )}

                 {paymentPhase === 'METHOD_DETAILS' && paymentMethod === 'Cash' && (
                   <div className="animate-in fade-in slide-in-from-right-8 duration-500 h-full flex flex-col justify-center max-w-lg mx-auto w-full">
                      <div className="text-center mb-10 md:mb-16">
                        <div className="w-20 h-20 md:w-24 md:h-24 bg-emerald-50 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 md:mb-8 border border-emerald-100 shadow-2xl shadow-emerald-500/10"><Banknote size={40} className="md:w-[48px] md:h-[48px]" /></div>
                        <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">Tender Input</h3>
                        <p className="text-slate-400 text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] mt-3">Manual Registry Validation</p>
                      </div>
                      <div className="relative group">
                        <span className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 text-4xl md:text-5xl font-black text-slate-200 transition-colors group-focus-within:text-indigo-600">₱</span>
                        <input 
                          autoFocus 
                          type="number" 
                          value={cashTendered} 
                          onChange={e => setCashTendered(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-[2rem] md:rounded-[3rem] py-8 md:py-10 pl-16 md:pl-20 pr-10 text-5xl md:text-6xl font-black text-slate-900 outline-none focus:ring-[12px] md:focus:ring-[16px] focus:ring-indigo-50 transition-all shadow-2xl shadow-indigo-500/5 placeholder:text-slate-100" 
                          placeholder="0.00" 
                        />
                      </div>
                   </div>
                 )}
                 
                 {/* Review Phase: List Items on Left */}
                 {paymentPhase === 'REVIEW' && (
                   <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 h-full flex flex-col">
                      <div className="flex items-center gap-4 mb-6 md:mb-8 shrink-0">
                        <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">Verify Manifest</h2>
                     </div>
                     <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                       {cart.map(item => (
                         <div key={item.id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-2xl">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs">{item.quantity}x</div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm truncate max-w-[120px] md:max-w-none">{item.name}</h4>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest">{formatCurrency(item.price)}/unit</p>
                              </div>
                           </div>
                           <span className="font-black text-slate-900">{formatCurrency(item.price * item.quantity)}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
                 
                 {/* Success Phase: Show Confirmation on Left */}
                 {paymentPhase === 'SUCCESS' && (
                   <div className="animate-in zoom-in-95 duration-500 h-full flex flex-col items-center justify-center text-center p-4">
                      <div className="w-24 h-24 md:w-28 md:h-28 bg-emerald-50 rounded-full flex items-center justify-center mb-8 md:mb-10 text-emerald-500 shadow-[0_20px_40px_rgba(16,185,129,0.15)] border border-emerald-100 animate-bounce"><Check size={48} className="md:w-[56px] md:h-[56px]" strokeWidth={5} /></div>
                      <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 tracking-tighter leading-none">Commerce Successful</h2>
                      <p className="text-slate-400 text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] mb-12 leading-relaxed">Local ledger consistency verified 100%</p>
                   </div>
                 )}

                 {(paymentPhase === 'PROCESSING' || paymentPhase === 'ERROR') && (
                   <div className="h-full flex flex-col items-center justify-center text-center gap-10 py-24 animate-in fade-in zoom-in-95">
                     <div className="relative">
                        <div className={`absolute inset-0 blur-[60px] opacity-30 animate-pulse ${paymentPhase === 'ERROR' ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                        {paymentPhase === 'ERROR' ? (
                          <div className="p-8 md:p-10 bg-rose-50 text-rose-600 rounded-[3rem] border border-rose-100 shadow-2xl relative"><AlertCircle size={60} className="md:w-[80px] md:h-[80px]" /></div>
                        ) : (
                          <div className="relative">
                            <Loader2 size={80} className="text-indigo-600 animate-spin relative md:w-[100px] md:h-[100px]" />
                            <Sparkles size={24} className="absolute -top-4 -right-4 text-indigo-400 animate-bounce md:w-[32px] md:h-[32px]" />
                          </div>
                        )}
                     </div>
                     <div>
                        <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">{paymentPhase === 'ERROR' ? 'System Rejection' : 'Neural Processing'}</h3>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-[0.4em] mt-5 animate-pulse leading-relaxed">{paymentPhase === 'ERROR' ? systemError?.message : processingStatus}</p>
                     </div>
                     {paymentPhase === 'ERROR' && (
                       <button onClick={() => setPaymentPhase('METHOD_SELECT')} className="px-12 py-5 bg-indigo-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-[0.3em] flex items-center gap-4 hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 active:scale-95"><RefreshCw size={20} /> Attempt Retry</button>
                     )}
                   </div>
                 )}
              </div>

              {/* Right Side: Breakdown & Actions */}
              <div className="w-full md:w-[420px] xl:w-[480px] p-6 md:p-14 flex flex-col bg-white shrink-0">
                 <div className="mb-8 md:mb-14">
                    <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2 md:mb-4">Registry Payload</p>
                    <h3 className="text-5xl md:text-7xl font-black text-slate-900 tabular-nums tracking-tighter drop-shadow-sm">{formatCurrency(finalTotal)}</h3>
                 </div>
                 
                 <div className="space-y-6 md:space-y-8 flex-1">
                    <div className="p-6 md:p-10 bg-slate-50/50 border border-slate-100 rounded-[2rem] md:rounded-[3rem] shadow-inner relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform"><Lock size={64}/></div>
                       <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 md:mb-5 flex items-center gap-2 relative z-10"><Shield size={14}/> Node Protocol</p>
                       <div className="flex items-center gap-4 md:gap-5 relative z-10">
                         <div className="w-2 h-8 md:h-10 bg-indigo-500 rounded-full" />
                         <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{paymentMethod}</p>
                       </div>
                    </div>
                    {paymentMethod === 'Cash' && paymentPhase !== 'METHOD_SELECT' && (
                      <div className="p-6 md:p-10 bg-emerald-50 border border-emerald-100 rounded-[2rem] md:rounded-[3rem] shadow-[0_20px_60px_rgba(16,185,129,0.1)] animate-in zoom-in-95 duration-500 flex flex-col gap-2">
                        <p className="text-[10px] md:text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em] flex items-center gap-2"><Coins size={18}/> Fiscal Return</p>
                        <p className="text-4xl md:text-5xl font-black text-emerald-600 tabular-nums tracking-tighter">{formatCurrency(changeDue)}</p>
                      </div>
                    )}
                    {paymentPhase === 'SUCCESS' && (
                       <div className="bg-slate-50/80 border border-slate-200/60 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] space-y-4 text-left shadow-inner">
                         <div className="flex items-center gap-3 text-indigo-600"><div className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm"/><span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em]">Operational Proof</span></div>
                         <p className="text-base md:text-lg font-black text-slate-900 leading-tight uppercase tracking-tight">{receiptConfig.name}</p>
                         <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase truncate tracking-widest leading-none">{receiptConfig.address}</p>
                         <div className="pt-4 border-t border-slate-200/60 flex justify-between items-center">
                            <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Auth</span>
                            <span className="text-[9px] md:text-[10px] font-mono font-bold text-slate-900">#{Date.now().toString().slice(-8)}</span>
                         </div>
                       </div>
                    )}
                 </div>

                 <div className="mt-8 md:mt-14 space-y-4 md:space-y-5">
                    {/* Action Buttons based on Phase */}
                    {paymentPhase === 'METHOD_SELECT' && (
                      <button disabled className="w-full bg-slate-100 text-slate-400 font-black py-5 md:py-7 rounded-[1.5rem] md:rounded-[2rem] cursor-not-allowed uppercase tracking-[0.3em] text-[10px] md:text-[11px]">Select Tender</button>
                    )}

                    {paymentPhase === 'METHOD_DETAILS' && (
                      <button 
                        disabled={paymentMethod === 'Cash' && (!cashTendered || parseFloat(cashTendered) < finalTotal)} 
                        onClick={validatePaymentDetails} 
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-5 md:py-7 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl shadow-slate-200 transition-all active:scale-95 uppercase tracking-[0.3em] text-[10px] md:text-[11px] flex items-center justify-center gap-4 disabled:opacity-20"
                      >
                         Review Manifest <ListChecks size={20} />
                      </button>
                    )}

                    {paymentPhase === 'REVIEW' && (
                      <button 
                        onClick={processTransaction} 
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 md:py-7 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl shadow-indigo-200 transition-all active:scale-95 uppercase tracking-[0.3em] text-[10px] md:text-[11px] flex items-center justify-center gap-4"
                      >
                         Proceed Checkout <Verified size={24} />
                      </button>
                    )}

                    {paymentPhase === 'SUCCESS' && (
                       <div className="space-y-4">
                          <button onClick={handlePrint} className="w-full py-5 md:py-6 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-[1.5rem] md:rounded-[1.75rem] flex items-center justify-center gap-4 transition-all uppercase tracking-[0.25em] text-[10px] md:text-[11px] shadow-xl active:scale-95"><Printer size={22} /> Print Receipt</button>
                          <button onClick={handleDone} className="w-full py-5 md:py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[1.5rem] md:rounded-[1.75rem] shadow-2xl shadow-indigo-200 transition-all active:scale-95 uppercase tracking-[0.25em] text-[10px] md:text-[11px]">Done</button>
                       </div>
                    )}

                    {/* Back / Discard buttons */}
                    {(paymentPhase === 'METHOD_DETAILS' || paymentPhase === 'REVIEW') && (
                         <button onClick={() => { setPaymentPhase(paymentPhase === 'REVIEW' ? 'METHOD_DETAILS' : 'METHOD_SELECT'); }} className="w-full py-3 md:py-5 text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] hover:text-slate-600 transition-colors">Go Back</button>
                    )}
                    
                    {paymentPhase !== 'SUCCESS' && paymentPhase !== 'PROCESSING' && (
                       <button onClick={() => { setShowPaymentModal(false); setSystemError(null); }} className="w-full py-2 text-rose-300 hover:text-rose-600 font-black uppercase tracking-[0.3em] text-[10px] transition-colors">Discard</button>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Hardware Node UI (Scanner) */}
      {isScanning && (
        <div className="fixed inset-0 z-[300] bg-slate-900/95 backdrop-blur-3xl flex flex-col items-center justify-center p-4 md:p-6 print:hidden">
          <div className={`w-full max-w-2xl bg-white border-[8px] md:border-[12px] rounded-[3rem] md:rounded-[5rem] overflow-hidden relative shadow-[0_0_120px_rgba(0,0,0,0.5)] transition-all duration-700 ${scanSuccess ? 'border-emerald-500 scale-105 shadow-[0_0_150px_rgba(16,185,129,0.6)]' : 'border-white/10'}`}>
             <div className="p-6 md:p-10 border-b border-white/10 flex justify-between items-center bg-slate-900">
               <div className="flex items-center gap-4">
                 <div className={`w-3 h-3 rounded-full ${scanSuccess ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,1)]' : 'bg-rose-500 animate-pulse'}`} />
                 <h3 className="font-black text-[10px] md:text-xs uppercase tracking-[0.5em] text-white/40">Optics Node Active</h3>
               </div>
               <button onClick={stopScanning} className="p-3 md:p-4 text-white/40 hover:text-white bg-white/5 rounded-3xl border border-white/10 transition-all active:scale-90"><X size={24} className="md:w-[32px] md:h-[32px]" /></button>
             </div>
             <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
                <video ref={onVideoRef} className={`w-full h-full object-cover transition-opacity duration-500 ${scanSuccess ? 'opacity-40 blur-sm' : 'opacity-100'}`} autoPlay playsInline muted />
                
                {/* Visual Alignment Aids */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <div className={`w-[85%] h-[65%] border-4 rounded-[3rem] md:rounded-[4rem] relative transition-all duration-500 ${scanSuccess ? 'border-emerald-400 shadow-[0_0_100px_rgba(52,211,153,0.8)] scale-110 bg-emerald-500/10' : 'border-indigo-500/80 shadow-[0_0_60px_rgba(99,102,241,0.4)] animate-pulse-reticle'}`}>
                      {/* Corner Accents */}
                      {!scanSuccess && (
                        <>
                          <div className="absolute top-0 left-0 w-12 h-12 border-t-8 border-l-8 border-indigo-500 rounded-tl-[2rem] -mt-1 -ml-1"></div>
                          <div className="absolute top-0 right-0 w-12 h-12 border-t-8 border-r-8 border-indigo-500 rounded-tr-[2rem] -mt-1 -mr-1"></div>
                          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-8 border-l-8 border-indigo-500 rounded-bl-[2rem] -mb-1 -ml-1"></div>
                          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-8 border-r-8 border-indigo-500 rounded-br-[2rem] -mb-1 -mr-1"></div>
                          
                          {/* Scanning Line */}
                          <div className="absolute top-1/2 left-4 right-4 h-1 bg-indigo-400/80 animate-scan shadow-[0_0_30px_rgba(129,140,248,1)]" />
                        </>
                      )}

                      <div className={`absolute -top-12 md:-top-16 left-1/2 -translate-x-1/2 px-6 md:px-8 py-3 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500 flex items-center gap-3 whitespace-nowrap ${scanSuccess ? 'bg-emerald-500 text-white shadow-[0_10px_40px_rgba(16,185,129,0.6)] translate-y-2' : 'bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-xl'}`}>
                        {scanSuccess ? <Check size={14} strokeWidth={4}/> : <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"/>}
                        {scanSuccess ? 'Asset Verified' : 'Scanning...'}
                      </div>
                   </div>
                </div>
                
                {/* Success Overlay Flash */}
                <div className={`absolute inset-0 bg-emerald-500/20 backdrop-blur-md flex items-center justify-center transition-all duration-500 ${scanSuccess ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
                    <div className="relative">
                      <div className="absolute inset-0 bg-emerald-400 blur-[60px] opacity-50 animate-pulse"></div>
                      <div className="p-8 md:p-10 bg-white rounded-full text-emerald-500 shadow-2xl relative z-10 animate-bounce">
                        <Check size={60} className="md:w-[80px] md:h-[80px]" strokeWidth={5} />
                      </div>
                    </div>
                </div>
             </div>
             <div className="p-6 md:p-10 text-center bg-slate-900 border-t border-white/5">
                <div className="flex items-center justify-center gap-4">
                  <span className={`w-3 h-3 rounded-full transition-colors duration-300 ${scanSuccess ? 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]' : 'bg-indigo-500'}`} />
                  <p className="text-[10px] md:text-[11px] font-black text-white/30 uppercase tracking-[0.5em]">Neural Handshake: <span className={`transition-colors duration-300 ${scanSuccess ? "text-emerald-400" : "text-indigo-400"}`}>{scanSuccess ? "ESTABLISHED" : "SEARCHING"}</span></p>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Hidden Printable Receipt Area */}
      <div id="receipt-print-area" className="hidden">
        {lastReceipt && (
          <div className="font-mono text-black p-4 max-w-[80mm] mx-auto text-xs leading-tight">
            <div className="text-center mb-4">
               <h1 className="text-xl font-bold uppercase mb-1">{receiptConfig.name}</h1>
               <p>{receiptConfig.address}</p>
               <p>{receiptConfig.contact}</p>
            </div>
            
            <div className="border-b border-black border-dashed my-2"></div>
            
            <div className="flex justify-between mb-2">
               <span>{new Date(lastReceipt.date).toLocaleDateString()} {new Date(lastReceipt.date).toLocaleTimeString()}</span>
            </div>
             <div className="flex justify-between mb-2">
               <span>Op: Admin</span>
               <span>#{lastReceipt.id.slice(-6)}</span>
            </div>
             {lastReceipt.customerName && (
              <div className="mb-2">Client: {lastReceipt.customerName}</div>
            )}

            <div className="border-b border-black border-dashed my-2"></div>
            
            <div className="space-y-2 mb-4">
              {lastReceipt.items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-start">
                  <div className="flex-1">
                     <div>{item.name}</div>
                     <div className="text-[10px]">{item.quantity} x {formatCurrency(item.price)}</div>
                  </div>
                  <div className="font-bold">{formatCurrency(item.price * item.quantity)}</div>
                </div>
              ))}
            </div>
            
            <div className="border-b border-black border-dashed my-2"></div>
            
            <div className="space-y-1">
              <div className="flex justify-between">
                 <span>Subtotal</span>
                 <span>{formatCurrency(lastReceipt.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                 <span>VAT (12%)</span>
                 <span>{formatCurrency(lastReceipt.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm mt-2">
                 <span>TOTAL</span>
                 <span>{formatCurrency(lastReceipt.total)}</span>
              </div>
            </div>

            {lastReceipt.paymentMethod === 'Cash' && (
              <div className="mt-2 space-y-1">
                 <div className="flex justify-between">
                   <span>Cash</span>
                   <span>{formatCurrency(parseFloat(lastReceipt.cashTendered || '0'))}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Change</span>
                   <span>{formatCurrency(lastReceipt.changeDue || 0)}</span>
                 </div>
              </div>
            )}
            
            <div className="mt-2 text-center uppercase border border-black p-1">
               {lastReceipt.paymentMethod}
            </div>

            <div className="border-b border-black border-dashed my-4"></div>
            
            <div className="text-center space-y-2">
               <p>{receiptConfig.footerMessage}</p>
               <p className="text-[10px] mt-4">Powered by AutoMate™</p>
               <div className="flex justify-center mt-2">
                  {/* Fake Barcode */}
                  <div className="h-8 bg-black w-2/3"></div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};