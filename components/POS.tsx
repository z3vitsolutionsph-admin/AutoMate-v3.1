
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
  Settings2, Volume2, VolumeX, CreditCard as CardIcon, Download, UserCheck
} from 'lucide-react';
import { Product, CartItem, Transaction, HeldOrder } from '../types';
import { formatCurrency } from '../constants';
import { jsPDF } from 'jspdf';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';

interface POSProps {
  products: Product[];
  operatorName?: string;
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

export const POS: React.FC<POSProps> = ({ products, operatorName, onTransactionComplete, businessDetails }) => {
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
  
  // --- Scanner State ---
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanned' | 'error'>('idle');
  const [lastScannedProduct, setLastScannedProduct] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | undefined>(undefined);

  // --- Payment Workflow State ---
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>('METHOD_SELECT');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [discountPercentage, setDiscountPercentage] = useState<number>(terminalConfig.defaultDiscount);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  
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
        paymentMethod, cashTendered, changeDue, date: new Date(),
        operator: operatorName || 'System Admin'
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
    setShowReceiptPreview(false);
  };

  const handleDownloadPDF = () => {
    if (!lastReceipt) return;
    
    // 80mm width standard for thermal, variable height
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200]
    });

    let y = 10;
    const centerX = 40;
    const leftX = 5;
    const rightX = 75;
    const lineHeight = 4;

    // Header
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(businessDetails?.name || 'AutoMate Terminal', centerX, y, { align: 'center' });
    y += lineHeight;
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    if (businessDetails?.address) {
       doc.text(businessDetails.address, centerX, y, { align: 'center' });
       y += lineHeight;
    }
    
    doc.text(new Date(lastReceipt.date).toLocaleString(), centerX, y, { align: 'center' });
    y += lineHeight + 2;
    
    (doc as any).setLineDash([1, 1], 0);
    doc.line(leftX, y, rightX, y);
    y += lineHeight + 2;

    // Items
    doc.setFontSize(8);
    lastReceipt.items.forEach((item: any) => {
        const title = item.name.substring(0, 25).toUpperCase();
        doc.text(title, leftX, y);
        const priceStr = formatCurrency(item.price * item.quantity);
        doc.text(priceStr, rightX, y, { align: 'right' });
        y += lineHeight;
        
        doc.setFontSize(7);
        doc.setTextColor(100);
        doc.text(`${item.quantity} x ${formatCurrency(item.price)}`, leftX, y);
        doc.setTextColor(0);
        doc.setFontSize(8);
        y += lineHeight + 1;
    });

    y += 2;
    doc.line(leftX, y, rightX, y);
    y += lineHeight + 2;

    // Totals
    const drawRow = (label: string, value: string, bold = false) => {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.text(label, leftX, y);
        doc.text(value, rightX, y, { align: 'right' });
        y += lineHeight;
    };

    drawRow("SUBTOTAL", formatCurrency(lastReceipt.subtotal));
    if (lastReceipt.discountAmount > 0) {
        drawRow("DISCOUNT", `-${formatCurrency(lastReceipt.discountAmount)}`);
    }
    drawRow("TAX", formatCurrency(lastReceipt.tax));
    y += 2;
    drawRow("TOTAL", formatCurrency(lastReceipt.total), true);
    
    y += lineHeight;
    drawRow("PAYMENT", lastReceipt.paymentMethod);
    if (lastReceipt.paymentMethod === 'Cash') {
        drawRow("CASH", formatCurrency(parseFloat(lastReceipt.cashTendered) || 0));
        drawRow("CHANGE", formatCurrency(lastReceipt.changeDue));
    }

    // Operator Details
    y += lineHeight + 2;
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(`CASHIER: ${lastReceipt.operator}`, leftX, y);

    // Footer
    y += lineHeight + 4;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(businessDetails?.footerMessage || 'Thank you!', centerX, y, { align: 'center' });
    y += lineHeight;
    doc.text(`Ref: ${lastReceipt.id}`, centerX, y, { align: 'center' });

    doc.save(`Receipt-${lastReceipt.id}.pdf`);
  };

  // --- Scanner Logic ---
  useEffect(() => {
    if (isScannerOpen) {
      BrowserMultiFormatReader.listVideoInputDevices()
        .then(devices => {
          setAvailableDevices(devices);
          // Auto-select back camera if not set
          if (!activeDeviceId && devices.length > 0) {
             const back = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
             setActiveDeviceId(back ? back.deviceId : devices[0].deviceId);
          }
        })
        .catch(err => console.error("Device detection failed", err));
    }
  }, [isScannerOpen]);

  useEffect(() => {
    if (isScannerOpen && videoRef.current && activeDeviceId) {
      // Reset controls if changing camera
      if (controlsRef.current) {
         controlsRef.current.stop();
         controlsRef.current = null;
      }

      const codeReader = new BrowserMultiFormatReader();
      codeReader.decodeFromVideoDevice(activeDeviceId, videoRef.current, (result, err, controls) => {
        if (result) {
          const code = result.getText();
          const now = Date.now();
          // Debounce: prevent duplicate scans within 2 seconds
          if (now - lastScanTimeRef.current > 2000) {
             lastScanTimeRef.current = now;
             
             // Logic
             const product = products.find(p => p.sku === code || p.id === code);
             if (product) {
               addToCart(product);
               setScanStatus('scanned');
               setLastScannedProduct(product.name);
               setTimeout(() => {
                  setScanStatus('idle');
                  setLastScannedProduct(null);
               }, 1500);
             } else {
               playBeep('error', terminalConfig.soundEnabled);
               setScanStatus('error');
               setLastScannedProduct(null);
               setTimeout(() => setScanStatus('idle'), 1500);
             }
          }
        }
        if (controls) controlsRef.current = controls;
      }).catch(err => console.error("Camera access failed", err));
    } else {
      // Cleanup when closed
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
    }

    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
    };
  }, [isScannerOpen, activeDeviceId, products, addToCart, terminalConfig.soundEnabled]);

  const toggleCamera = () => {
    if (availableDevices.length < 2) return;
    const currentIndex = availableDevices.findIndex(d => d.deviceId === activeDeviceId);
    const nextIndex = (currentIndex + 1) % availableDevices.length;
    setActiveDeviceId(availableDevices[nextIndex].deviceId);
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
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative group flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                placeholder="Query product registry or SKU..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-xs font-semibold outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
              />
            </div>
            <div className="flex gap-2">
                <button 
                onClick={() => setIsScannerOpen(true)}
                className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white px-5 rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95 group h-11"
                title="Open Scanner"
                >
                <ScanBarcode size={20} className="group-hover:scale-110 transition-transform" />
                <span className="ml-2 text-[10px] font-black uppercase tracking-widest">Scan</span>
                </button>
                <div className="hidden sm:flex items-center gap-2 px-4 bg-slate-50 border border-slate-200 rounded-xl">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-[9px] font-black uppercase text-slate-500 truncate max-w-[80px]">{operatorName || 'Admin'}</span>
                </div>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
             {categories.map(cat => (
               <button 
                 key={cat} 
                 onClick={() => setSelectedCategory(cat)} 
                 className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all shrink-0 ${selectedCategory === cat ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
               >
                 {cat}
               </button>
             ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-28 md:pb-0 pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {filteredProducts.map(p => (
              <div key={p.id} onClick={() => addToCart(p)} className="bg-white border border-slate-200 rounded-[1.5rem] p-2.5 cursor-pointer hover:border-indigo-500 hover:shadow-xl transition-all active:scale-95 flex flex-col group h-full shadow-sm">
                <div className="aspect-square rounded-[1rem] bg-slate-50 mb-2 overflow-hidden relative border border-slate-100 flex items-center justify-center">
                  {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <ChefHat size={28} className="text-slate-200" />}
                  <div className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase backdrop-blur-md ${p.stock < 10 ? 'bg-rose-500 text-white' : 'bg-slate-900/80 text-white'}`}>S: {p.stock}</div>
                </div>
                <div className="px-1 flex-1 flex flex-col">
                  <h4 className="text-slate-900 font-extrabold text-[10px] uppercase tracking-tight truncate leading-tight mb-1">{p.name}</h4>
                  <p className="text-[8px] text-slate-400 font-bold uppercase mb-2">{p.category}</p>
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
                 <p className="text-[8px] text-emerald-500 font-black uppercase tracking-widest mt-1.5 flex items-center gap-1.5"><ShieldCheck size={10}/> Registry Audit Active</p>
               </div>
            </div>
            {isMobileCartOpen && (
              <button onClick={() => setIsMobileCartOpen(false)} className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-colors active:scale-90">
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
                     <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-100/50 rounded-full border border-slate-100 p-0.5">
                           <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-indigo-600 active:scale-90 transition-all shadow-sm"><Minus size={12}/></button>
                           <span className="w-7 text-center text-[10px] font-black text-slate-900 tabular-nums">{item.quantity}</span>
                           <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-indigo-600 active:scale-90 transition-all shadow-sm"><Plus size={12}/></button>
                        </div>
                        <button onClick={() => confirmRemoval(item.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors active:scale-90"><Trash2 size={16}/></button>
                     </div>
                  </div>
               ))
            )}
         </div>

         <div className="p-6 border-t bg-slate-50/80 backdrop-blur-xl space-y-4 pb-12 md:pb-8">
            <div className="space-y-2.5">
              <div className="flex justify-between text-slate-400 text-[9px] font-black uppercase tracking-widest">
                <span>Fiscal Subtotal</span>
                <span className="tabular-nums font-bold text-slate-600">{formatCurrency(subtotal)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                 <button onClick={() => setShowDiscountInput(!showDiscountInput)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[8px] font-black uppercase text-slate-400 hover:border-indigo-300 hover:text-indigo-600 transition-all active:scale-95">
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
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black outline-none focus:ring-2 focus:ring-indigo-100" 
                    placeholder="0%" 
                  />
                  <button onClick={() => setShowDiscountInput(false)} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg active:scale-95"><Check size={14}/></button>
                </div>
              )}

              <div className="flex justify-between text-slate-400 text-[9px] font-black uppercase tracking-widest">
                <span>Tax ({terminalConfig.taxRate}%)</span>
                <span className="tabular-nums font-bold text-slate-600">{formatCurrency(tax)}</span>
              </div>
              <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
                <span className="text-slate-900 font-black uppercase text-[10px] tracking-widest mb-1.5">Total Due</span>
                <span className="text-4xl font-black text-indigo-600 tabular-nums tracking-tighter leading-none">{formatCurrency(finalTotal)}</span>
              </div>
            </div>
            <button 
              disabled={cart.length === 0} 
              onClick={() => { setShowPaymentModal(true); setPaymentPhase('METHOD_SELECT'); }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4.5 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-30 uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 h-14"
            >
              Initialize Payment <ArrowRight size={18} />
            </button>
         </div>
      </div>

      {/* --- SCANNER MODAL --- */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
           {/* Close Button */}
           <div className="absolute top-6 right-6 z-[210]">
              <button onClick={() => setIsScannerOpen(false)} className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all active:scale-90 border border-white/10">
                <X size={24} />
              </button>
           </div>
           
           {/* Camera Switcher */}
           {availableDevices.length > 1 && (
              <div className="absolute top-6 left-6 z-[210]">
                 <button 
                   onClick={toggleCamera} 
                   className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all flex items-center gap-3 border border-white/10 active:scale-95"
                 >
                   <RefreshCw size={20} />
                   <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Switch Camera</span>
                 </button>
              </div>
           )}
           
           <div className="w-full max-w-lg bg-black rounded-[2.5rem] overflow-hidden shadow-2xl relative border border-slate-800">
              {/* Camera Feed */}
              <div className="relative aspect-[3/4] bg-black">
                 <video ref={videoRef} className="w-full h-full object-cover" />
                 
                 {/* Reticle Overlay */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8">
                    <div className={`w-full max-w-[280px] aspect-square border-2 rounded-[2.5rem] relative transition-all duration-300 ${
                        scanStatus === 'scanned' ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_80px_rgba(16,185,129,0.4)]' : 
                        scanStatus === 'error' ? 'border-rose-500 bg-rose-500/10 shadow-[0_0_80px_rgba(244,63,94,0.4)]' : 
                        'border-white/30'
                    }`}>
                       {/* Corners */}
                       <div className={`absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 rounded-tl-3xl -mt-0.5 -ml-0.5 transition-colors duration-300 ${scanStatus === 'scanned' ? 'border-emerald-400' : scanStatus === 'error' ? 'border-rose-500' : 'border-indigo-500'}`}></div>
                       <div className={`absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 rounded-tr-3xl -mt-0.5 -mr-0.5 transition-colors duration-300 ${scanStatus === 'scanned' ? 'border-emerald-400' : scanStatus === 'error' ? 'border-rose-500' : 'border-indigo-500'}`}></div>
                       <div className={`absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 rounded-bl-3xl -mb-0.5 -ml-0.5 transition-colors duration-300 ${scanStatus === 'scanned' ? 'border-emerald-400' : scanStatus === 'error' ? 'border-rose-500' : 'border-indigo-500'}`}></div>
                       <div className={`absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 rounded-br-3xl -mb-0.5 -mr-0.5 transition-colors duration-300 ${scanStatus === 'scanned' ? 'border-emerald-400' : scanStatus === 'error' ? 'border-rose-500' : 'border-indigo-500'}`}></div>
                       
                       {/* Scanning Laser */}
                       {scanStatus === 'idle' && (
                          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/80 shadow-[0_0_20px_rgba(99,102,241,1)] animate-scan"></div>
                       )}

                       {/* Central Feedback Icon */}
                       {scanStatus === 'scanned' && (
                          <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-200">
                             <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl">
                                <Check size={40} className="text-white" strokeWidth={5} />
                             </div>
                          </div>
                       )}
                       {scanStatus === 'error' && (
                          <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-200">
                             <div className="w-20 h-20 bg-rose-500 rounded-full flex items-center justify-center shadow-2xl">
                                <X size={40} className="text-white" strokeWidth={5} />
                             </div>
                          </div>
                       )}
                    </div>
                 </div>

                 {/* Status Messages */}
                 <div className="absolute bottom-10 inset-x-0 text-center space-y-4 px-6">
                    {scanStatus === 'idle' && (
                       <p className="inline-block bg-black/60 backdrop-blur-xl text-white/90 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest border border-white/10 shadow-2xl">
                         Align barcode within frame
                       </p>
                    )}
                    {scanStatus === 'scanned' && (
                       <div className="inline-flex items-center gap-3 bg-emerald-500/95 backdrop-blur-xl text-white px-8 py-4 rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-2xl animate-in zoom-in">
                          <Check size={20} strokeWidth={4} /> {lastScannedProduct || 'Asset Captured'}
                       </div>
                    )}
                    {scanStatus === 'error' && (
                       <div className="inline-flex items-center gap-3 bg-rose-500/95 backdrop-blur-xl text-white px-8 py-4 rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-2xl animate-in zoom-in">
                          <AlertTriangle size={20} strokeWidth={4} /> Ledger Mismatch
                       </div>
                    )}
                 </div>
              </div>
              
              {/* Footer */}
              <div className="p-8 bg-slate-900 border-t border-slate-800 text-center">
                 <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">
                   AutoMate™ Optical Recognition Node v4.0
                 </p>
              </div>
           </div>
        </div>
      )}

      {/* --- PAYMENT MODAL WORKFLOW --- */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/70 backdrop-blur-3xl flex items-center justify-center p-0 md:p-6 print:hidden">
           <div className="bg-white/95 backdrop-blur-3xl border border-white/40 rounded-none md:rounded-[3.5rem] w-full max-w-5xl h-full md:h-auto md:max-h-[85vh] shadow-[0_40px_100px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-500">
              
              {/* Left Panel: Stepper UI */}
              <div className="flex-1 flex flex-col p-6 md:p-10 lg:p-12 overflow-hidden relative">
                 <div className="flex justify-between items-center mb-8 shrink-0">
                    <div className="flex items-center gap-5">
                       <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center font-black transition-all ${paymentPhase === 'SUCCESS' ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-indigo-600 text-white shadow-indigo-100'} shadow-2xl`}>
                          {['PROCESSING', 'SUCCESS'].includes(paymentPhase) ? <ShieldCheck size={24}/> : <Coins size={24}/>}
                       </div>
                       <div>
                          <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase text-[14px]">
                             {paymentPhase === 'METHOD_SELECT' ? 'Payment Method' : 
                              paymentPhase === 'CONFIRM_PAYMENT' ? 'Confirm Payment' :
                              paymentPhase === 'FINAL_REVIEW' ? 'Review Manifest' : 'Checkout'}
                          </h2>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.25em] mt-2">Secure Operator Link</p>
                       </div>
                    </div>
                    {paymentPhase !== 'PROCESSING' && paymentPhase !== 'SUCCESS' && (
                       <button onClick={() => setShowPaymentModal(false)} className="p-3 bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-2xl transition-all active:scale-90"><X size={22}/></button>
                    )}
                 </div>

                 {/* Compact Header for Small Screens */}
                 <div className="md:hidden bg-slate-900 text-white p-7 rounded-[2rem] mb-6 shadow-2xl flex justify-between items-end border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Coins size={80}/>
                    </div>
                    <div className="relative z-10">
                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-2">Net Total Payable</p>
                        <div className="text-4xl font-black tabular-nums tracking-tighter">{formatCurrency(finalTotal)}</div>
                    </div>
                    <div className="relative z-10 text-right">
                       <p className="text-[10px] font-black uppercase text-white/40">Phase {['METHOD_SELECT', 'CONFIRM_PAYMENT', 'FINAL_REVIEW', 'PROCESSING', 'SUCCESS'].indexOf(paymentPhase) + 1} of 5</p>
                    </div>
                 </div>

                 <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
                    {/* STEP 3: Payment Method Selection */}
                    {paymentPhase === 'METHOD_SELECT' && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 animate-in slide-in-from-bottom-6 duration-500">
                        {[
                          { id: 'Cash', icon: Banknote, color: 'emerald', label: 'Cash Tender' },
                          { id: 'GCash', icon: Smartphone, color: 'blue', label: 'GCash Sync' },
                          { id: 'Card', icon: CardIcon, color: 'indigo', label: 'Card Payment' },
                          { id: 'PayMaya', icon: Wallet, color: 'emerald', label: 'Maya Link' },
                          { id: 'QRPH', icon: QrCode, color: 'slate', label: 'QRPH Standard' },
                          { id: 'Bank', icon: Landmark, color: 'slate', label: 'Direct Wire' },
                        ].map(m => (
                          <button 
                            key={m.id} 
                            onClick={() => { setPaymentMethod(m.id); setPaymentPhase('CONFIRM_PAYMENT'); playBeep('neutral', terminalConfig.soundEnabled); }}
                            className="bg-white border-2 border-slate-50 p-7 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:border-indigo-600 hover:bg-indigo-50/20 transition-all group shadow-sm active:scale-95"
                          >
                             <div className={`p-5 rounded-2xl bg-${m.color}-50 text-${m.color}-600 group-hover:scale-110 transition-transform shadow-sm`}><m.icon size={28}/></div>
                             <span className="font-black text-[10px] uppercase tracking-widest text-slate-600 text-center leading-tight">{m.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* STEP 4: Confirm Payment (Tender Input) */}
                    {paymentPhase === 'CONFIRM_PAYMENT' && (
                      <div className="animate-in fade-in slide-in-from-right-6 duration-500 h-full max-w-sm mx-auto flex flex-col gap-5">
                        {paymentMethod === 'Cash' ? (
                          <>
                             <div className="bg-slate-50 border-2 border-slate-200 p-8 rounded-[3rem] text-right shadow-inner relative group ring-8 ring-slate-50/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">Capital Received</p>
                                <div className="text-5xl font-black text-slate-900 tabular-nums tracking-tighter">₱{cashTendered || '0.00'}</div>
                                {cashTendered && <button onClick={() => setCashTendered('')} className="absolute left-6 top-1/2 -translate-y-1/2 p-2.5 bg-white rounded-2xl text-slate-400 hover:text-rose-500 shadow-md border border-slate-100 transition-all active:scale-90"><X size={16}/></button>}
                             </div>
                             
                             <div className="grid grid-cols-4 gap-2">
                                <button 
                                  onClick={() => { 
                                    setCashTendered(finalTotal.toFixed(2)); 
                                    setPaymentPhase('FINAL_REVIEW'); 
                                    playBeep('success', terminalConfig.soundEnabled); 
                                  }} 
                                  className="py-3.5 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest border border-indigo-600 active:scale-95 shadow-md hover:bg-indigo-700 transition-all"
                                >
                                  Exact
                                </button>
                                {[100, 500, 1000].map(amt => (
                                   <button key={amt} onClick={() => setCashTendered(amt.toString())} className="py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] hover:border-indigo-300 active:scale-95 shadow-sm transition-all hover:bg-slate-50">₱{amt}</button>
                                ))}
                             </div>

                             <div className="grid grid-cols-3 gap-2.5 flex-1 max-h-[380px]">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'backspace'].map(k => (
                                  <button 
                                    key={k} 
                                    onClick={() => handleNumpadInput(k)}
                                    className={`h-16 lg:h-20 rounded-[1.75rem] font-black text-2xl transition-all shadow-sm flex items-center justify-center border-b-4 active:translate-y-1 active:border-b-0 ${k === 'backspace' ? 'bg-rose-50 text-rose-500 border-rose-200 hover:bg-rose-100' : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/30'}`}
                                  >
                                    {k === 'backspace' ? <Delete size={26}/> : k}
                                  </button>
                                ))}
                             </div>
                          </>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center py-16 text-center space-y-12 animate-in zoom-in-95">
                             <div className="w-48 h-48 bg-indigo-50 rounded-[4rem] flex items-center justify-center mx-auto shadow-3xl relative">
                                <div className="absolute inset-0 bg-indigo-500/10 blur-[80px] rounded-full animate-pulse"/>
                                <Wifi size={72} className="text-indigo-600 animate-pulse"/>
                             </div>
                             <div className="space-y-5 px-6">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase text-[18px]">External Handshake</h3>
                                <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.35em] leading-relaxed max-w-[300px] mx-auto opacity-70">Awaiting Auth from <span className="text-indigo-600">{paymentMethod}</span> node...</p>
                             </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* STEP 5: Review Audit */}
                    {paymentPhase === 'FINAL_REVIEW' && (
                      <div className="animate-in fade-in slide-in-from-bottom-8 duration-600 h-full flex flex-col">
                         <div className="mb-6 md:mb-8">
                            <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">Manifest Verification</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2 flex items-center gap-2"><UserCheck size={12} className="text-indigo-500"/> Operator: {operatorName || 'Admin'}</p>
                         </div>
                         <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 mb-6 md:mb-8">
                           {cart.map(i => (
                             <div key={i.id} className="flex justify-between items-center p-4 md:p-5 bg-white border border-slate-100 rounded-[1.5rem] md:rounded-[1.75rem] shadow-sm hover:border-indigo-300 transition-all group">
                                <div className="flex items-center gap-4 md:gap-5">
                                   <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 font-black text-[10px] md:text-[11px] group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all shrink-0">{i.quantity}x</div>
                                   <div className="min-w-0">
                                      <h4 className="font-bold text-slate-900 text-[11px] md:text-[12px] truncate uppercase tracking-tight max-w-[150px] md:max-w-[200px]">{i.name}</h4>
                                      <p className="text-[9px] text-slate-400 font-black mt-1 uppercase tracking-widest">{formatCurrency(i.price)} / unit</p>
                                   </div>
                                </div>
                                <span className="font-black text-slate-900 text-[11px] md:text-[12px] tabular-nums whitespace-nowrap">{formatCurrency(i.price * i.quantity)}</span>
                             </div>
                           ))}
                         </div>
                         <div className="bg-emerald-50 border-2 border-emerald-100 border-dashed p-5 md:p-6 rounded-[2rem] flex items-center gap-4 md:gap-5 text-emerald-700 shadow-sm shrink-0">
                           <ShieldCheck size={28} className="shrink-0 text-emerald-500" />
                           <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] leading-relaxed">Inventory Integrity Lock Engaged. Ready for Ledger Commit.</p>
                         </div>
                      </div>
                    )}

                    {/* STEP 6: Proceed Checkout (Processing) */}
                    {paymentPhase === 'PROCESSING' && (
                      <div className="h-full flex flex-col items-center justify-center py-24 gap-10 animate-in zoom-in-95 duration-700">
                         <div className="relative">
                            <Loader2 size={120} className="text-indigo-600 animate-spin" strokeWidth={3.5}/>
                            <div className="absolute inset-0 flex items-center justify-center"><Zap size={44} className="text-indigo-200 fill-indigo-500/10"/></div>
                         </div>
                         <div className="text-center space-y-5">
                           <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase tracking-wider">Syncing Neural Ledger</h3>
                           <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.6em] animate-pulse">{processingStatus}</p>
                         </div>
                      </div>
                    )}

                    {/* STEP 7 & 8: Success (Print Receipt > Done) */}
                    {paymentPhase === 'SUCCESS' && (
                      <div className="h-full flex flex-col items-center justify-center py-16 text-center animate-in zoom-in-95 duration-500">
                         <div className="w-32 h-32 bg-emerald-50 text-emerald-500 rounded-[3rem] flex items-center justify-center mb-10 shadow-3xl border-4 border-emerald-100 animate-bounce">
                           <Check size={64} strokeWidth={7}/>
                         </div>
                         <h2 className="text-4xl font-black text-slate-900 mb-5 tracking-tighter uppercase text-[28px]">Session Confirmed</h2>
                         <p className="text-slate-400 text-[12px] font-black uppercase tracking-[0.45em] mb-14 max-w-[320px] mx-auto leading-relaxed">Registry Synced • Physical Stock Deducted • Consistent</p>
                         
                         <div className="grid grid-cols-2 gap-5 w-full max-w-sm">
                            <button onClick={() => setShowReceiptPreview(true)} className="py-6 bg-slate-900 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-2xl active:scale-95 flex items-center justify-center gap-3 transition-all hover:bg-black"><Printer size={20}/> Print Receipt</button>
                            <button onClick={resetTerminal} className="py-6 bg-indigo-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all hover:bg-indigo-700">New Session</button>
                         </div>
                      </div>
                    )}
                 </div>

                 {/* Modal Step Navigation */}
                 {['METHOD_SELECT', 'CONFIRM_PAYMENT', 'FINAL_REVIEW'].includes(paymentPhase) && (
                    <div className="mt-auto pt-6 md:pt-8 border-t border-slate-100 flex gap-4 bg-white/50 backdrop-blur-md shrink-0">
                       {paymentPhase !== 'METHOD_SELECT' && (
                          <button onClick={() => setPaymentPhase(paymentPhase === 'FINAL_REVIEW' ? 'CONFIRM_PAYMENT' : 'METHOD_SELECT')} className="flex-1 py-5 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-900 transition-colors flex items-center justify-center gap-2 active:scale-95 bg-slate-50 rounded-2xl">
                            <ArrowLeft size={16}/> Back
                          </button>
                       )}
                       {paymentPhase === 'METHOD_SELECT' && (
                         <div className="flex-1"></div>
                       )}
                       {paymentPhase === 'CONFIRM_PAYMENT' && (
                         <button 
                            disabled={paymentMethod === 'Cash' && (!cashTendered || parseFloat(cashTendered) < finalTotal)}
                            onClick={() => { setPaymentPhase('FINAL_REVIEW'); playBeep('success', terminalConfig.soundEnabled); }}
                            className="flex-[2] bg-slate-900 text-white rounded-2xl font-black py-5 shadow-2xl active:scale-95 uppercase tracking-widest text-[11px] disabled:opacity-30 transition-all flex items-center justify-center gap-3"
                         >
                           Audit Manifest <ChevronRight size={20}/>
                         </button>
                       )}
                       {paymentPhase === 'FINAL_REVIEW' && (
                         <button onClick={proceedToCheckout} className="flex-[2] bg-indigo-600 text-white rounded-2xl font-black py-5 shadow-2xl active:scale-95 uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-3 h-16">Finalize Transaction <ArrowRight size={20}/></button>
                       )}
                    </div>
                 )}
              </div>

              {/* Right Panel: Persistent Summary (Desktop/Tablet) */}
              <div className="hidden md:flex w-[280px] lg:w-[380px] p-10 lg:p-12 bg-white shrink-0 shadow-[-20px_0_80px_rgba(0,0,0,0.05)] flex-col overflow-y-auto no-scrollbar relative">
                 <div className="mb-12">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-4 leading-none">Net Ledger Due</p>
                    <h3 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter tabular-nums drop-shadow-md leading-none">{formatCurrency(finalTotal)}</h3>
                 </div>

                 <div className="space-y-5 flex-1">
                    <div className="p-7 bg-slate-50 border border-slate-100 rounded-[2.5rem] shadow-inner relative overflow-hidden group transition-all">
                       <div className="absolute top-0 right-0 p-5 opacity-[0.03] group-hover:scale-125 group-hover:opacity-[0.06] transition-all duration-700"><Verified size={100}/></div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2.5 relative z-10 leading-none">
                         <Lock size={14} className="text-indigo-500" /> Authorized Tender
                       </p>
                       <div className="flex items-center gap-5 relative z-10">
                          <div className="w-2 h-14 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)]" />
                          <div>
                             <p className="text-3xl font-black text-slate-900 tracking-tight leading-none">{paymentMethod}</p>
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-3 leading-none flex items-center gap-1.5"><Smartphone size={12}/> Verified Port 01</p>
                          </div>
                       </div>
                    </div>

                    {paymentMethod === 'Cash' && paymentPhase !== 'METHOD_SELECT' && (
                      <div className="p-7 bg-emerald-50 border border-emerald-100 rounded-[2.5rem] shadow-2xl shadow-emerald-500/10 animate-in slide-in-from-top-4 duration-600 ring-8 ring-emerald-50/30">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2.5 leading-none"><Coins size={16}/> Change Manifest</p>
                        <p className="text-5xl font-black text-emerald-600 tabular-nums tracking-tighter leading-none drop-shadow-sm">{formatCurrency(changeDue)}</p>
                      </div>
                    )}

                    <div className="p-7 bg-slate-50 border border-slate-100 rounded-[2.5rem] space-y-4 shadow-sm border-dashed">
                       <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-400"><span>Fiscal Base</span><span className="tabular-nums font-bold text-slate-600">{formatCurrency(subtotal)}</span></div>
                       {discountAmount > 0 && <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-emerald-600"><span>Rebate</span><span className="tabular-nums font-bold">-{formatCurrency(discountAmount)}</span></div>}
                       <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-400"><span>VAT ({terminalConfig.taxRate}%)</span><span className="tabular-nums font-bold text-slate-600">{formatCurrency(tax)}</span></div>
                    </div>
                 </div>

                 <div className="mt-12 pt-8 border-t border-slate-100 text-center opacity-40 shrink-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] leading-none mb-3">Precision Node v3.4.2</p>
                    <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Served by: {operatorName || 'Admin'}</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* RECEIPT PREVIEW MODAL */}
      {showReceiptPreview && lastReceipt && (
        <div className="fixed inset-0 z-[200] bg-slate-900/85 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden w-full max-w-md flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-400 border border-white/20">
             <div className="p-6 md:p-7 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-md">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><FileText size={20}/></div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Digital Voucher</h3>
               </div>
               <button onClick={() => setShowReceiptPreview(false)} className="p-3 bg-white hover:bg-slate-200 rounded-2xl transition-all active:scale-90 shadow-sm border border-slate-100"><X size={22} className="text-slate-500"/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-100/50 custom-scrollbar flex flex-col items-center">
               <div className="bg-white p-8 shadow-2xl border border-slate-200 w-full max-w-[320px] text-[11px] font-mono leading-relaxed text-slate-900 relative rotate-1">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 py-1 border border-slate-100 rounded-full text-[9px] font-black text-indigo-600 uppercase tracking-widest shadow-sm">Verified Node</div>
                  <div className="text-center mb-8 space-y-1.5">
                    <h1 className="text-xl font-black uppercase tracking-tighter">{businessDetails?.name || 'AutoMate Terminal'}</h1>
                    <p className="opacity-70 uppercase text-[9px] leading-tight">{businessDetails?.address}</p>
                    <p className="opacity-60 text-[9px]">{new Date(lastReceipt.date).toLocaleString()}</p>
                  </div>
                  <div className="border-b border-slate-300 border-dashed mb-5"></div>
                  <div className="space-y-3">
                    {lastReceipt.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-start uppercase">
                        <div className="flex-1 pr-3">
                            <span className="font-bold">{item.name}</span>
                            <div className="opacity-50 text-[9px]">{item.quantity} x {formatCurrency(item.price)}</div>
                        </div>
                        <div className="font-bold">{formatCurrency(item.price * item.quantity)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="border-b border-slate-300 border-dashed my-6"></div>
                  <div className="space-y-2 font-bold">
                     <div className="flex justify-between"><span>SUBTOTAL</span><span>{formatCurrency(lastReceipt.subtotal)}</span></div>
                     {lastReceipt.discountAmount > 0 && <div className="flex justify-between text-emerald-600"><span>REBATE</span><span>-{formatCurrency(lastReceipt.discountAmount)}</span></div>}
                     <div className="flex justify-between"><span>VAT ({terminalConfig.taxRate}%)</span><span>{formatCurrency(lastReceipt.tax)}</span></div>
                     <div className="flex justify-between text-[13px] pt-3 border-t border-slate-900 mt-3 font-black"><span>NET TOTAL</span><span>{formatCurrency(lastReceipt.total)}</span></div>
                  </div>
                  <div className="mt-6 pt-3 border-t border-slate-300 border-dashed space-y-2 opacity-80 font-bold text-[9px]">
                    <div className="flex justify-between uppercase"><span>TENDER TYPE</span><span>{lastReceipt.paymentMethod}</span></div>
                    {lastReceipt.paymentMethod === 'Cash' && (
                      <>
                        <div className="flex justify-between uppercase"><span>RECEIVED</span><span>{formatCurrency(parseFloat(lastReceipt.cashTendered) || 0)}</span></div>
                        <div className="flex justify-between uppercase"><span>CHANGE</span><span>{formatCurrency(lastReceipt.changeDue)}</span></div>
                      </>
                    )}
                  </div>
                  <div className="mt-10 text-center space-y-3">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Served By</p>
                        <p className="text-[10px] font-black text-slate-800 uppercase">{lastReceipt.operator}</p>
                    </div>
                    <div className="opacity-60 space-y-1.5 pt-4">
                        <p className="text-[9px] uppercase font-bold">{businessDetails?.footerMessage || 'Thank you!'}</p>
                        <p className="text-[8px] font-bold">Node Transaction ID: {lastReceipt.id}</p>
                    </div>
                  </div>
               </div>
             </div>

             <div className="p-8 border-t border-slate-100 bg-white grid grid-cols-2 gap-5">
                <button onClick={handleDownloadPDF} className="py-5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black rounded-2xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 transition-all border border-slate-200 active:scale-95">
                  <Download size={18}/> Save PDF
                </button>
                <button onClick={() => window.print()} className="py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 transition-all shadow-2xl shadow-indigo-200 active:scale-95">
                  <Printer size={18}/> Print Now
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Item Removal Verification Dialog */}
      {itemToRemove && (
        <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-6">
          <div className="absolute inset-0" onClick={() => setItemToRemove(null)} />
          <div className="relative bg-white border border-slate-200 rounded-[3rem] p-10 max-w-sm w-full shadow-3xl text-center animate-in zoom-in-95 duration-300">
             <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-rose-500 shadow-2xl border border-rose-100">
                <Trash2 size={36} />
             </div>
             <h3 className="text-xl font-black text-slate-900 tracking-tight mb-3 uppercase text-[16px]">Void Manifest Entry?</h3>
             <p className="text-slate-500 text-[12px] font-medium mb-10 leading-relaxed px-4 opacity-80">
               Confirm removal of <span className="text-slate-900 font-bold">"{itemToRemove.name}"</span> from the active transaction node?
             </p>
             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setItemToRemove(null)} className="py-4.5 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px] active:scale-95">Cancel</button>
                <button onClick={handleRemove} className="py-4.5 bg-rose-600 text-white font-black rounded-2xl shadow-2xl shadow-rose-200 transition-all uppercase tracking-widest text-[10px] active:scale-95 hover:bg-rose-700">Confirm Void</button>
             </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Footer Toggle */}
      <div className="md:hidden fixed bottom-8 left-6 right-6 flex gap-4 z-50">
        <button 
          onClick={() => setIsMobileCartOpen(true)}
          className="flex-1 bg-slate-900 text-white p-5 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex items-center justify-between px-8 active:scale-95 transition-all border border-white/10 ring-8 ring-white/5 ring-inset"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
                <ShoppingBasket size={22} className="text-indigo-400" />
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-slate-900">{cart.reduce((a,c)=>a+c.quantity,0)}</span>
            </div>
            <span className="font-black text-[12px] uppercase tracking-[0.25em]">Basket Manifest</span>
          </div>
          <span className="font-black text-[13px] tabular-nums tracking-widest drop-shadow-sm">{formatCurrency(finalTotal)}</span>
        </button>
      </div>

      {/* Hidden Print Receipt Template */}
      <div id="receipt-print-area" className="hidden">
        {lastReceipt && (
           <div className="p-10 font-mono text-[10px] max-w-[80mm] mx-auto text-black leading-relaxed bg-white">
              <div className="text-center mb-8 space-y-2">
                <h1 className="text-2xl font-black uppercase tracking-tighter leading-tight">{businessDetails?.name || 'AutoMate Terminal'}</h1>
                <p className="text-[10px] font-bold opacity-70 uppercase">{businessDetails?.address}</p>
                <p className="text-[9px] font-medium opacity-60 uppercase">{new Date(lastReceipt.date).toLocaleString()}</p>
              </div>
              <div className="border-b border-black border-dashed mb-6"></div>
              <div className="space-y-4">
                {lastReceipt.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-start uppercase">
                    <div className="flex-1 pr-6">
                        <span className="font-bold">{item.name}</span>
                        <div className="text-[9px] opacity-60 mt-1">{item.quantity} x {formatCurrency(item.price)}</div>
                    </div>
                    <div className="font-black tabular-nums">{formatCurrency(item.price * item.quantity)}</div>
                  </div>
                ))}
              </div>
              <div className="border-b border-black border-dashed my-8"></div>
              <div className="space-y-2 font-black">
                 <div className="flex justify-between"><span>SUBTOTAL</span><span>{formatCurrency(lastReceipt.subtotal)}</span></div>
                 {lastReceipt.discountAmount > 0 && <div className="flex justify-between"><span>REBATE</span><span>-{formatCurrency(lastReceipt.discountAmount)}</span></div>}
                 <div className="flex justify-between"><span>VAT ({terminalConfig.taxRate}%)</span><span>{formatCurrency(lastReceipt.tax)}</span></div>
                 <div className="flex justify-between text-lg border-t-2 border-black pt-4 uppercase mt-4"><span>NET TOTAL</span><span>{formatCurrency(lastReceipt.total)}</span></div>
              </div>
              <div className="mt-8 pt-6 border-t border-black border-dashed space-y-2 text-[10px] font-bold uppercase opacity-90">
                <div className="flex justify-between"><span>TENDER TYPE</span><span>{lastReceipt.paymentMethod}</span></div>
                {lastReceipt.paymentMethod === 'Cash' && (
                  <>
                    <div className="flex justify-between"><span>RECEIVED</span><span>{formatCurrency(parseFloat(lastReceipt.cashTendered) || 0)}</span></div>
                    <div className="flex justify-between"><span>CHANGE</span><span>{formatCurrency(lastReceipt.changeDue)}</span></div>
                  </>
                )}
                <div className="flex justify-between pt-4"><span>OPERATOR</span><span>{lastReceipt.operator}</span></div>
              </div>
              <div className="mt-16 text-center text-[9px] font-black uppercase opacity-70 leading-tight space-y-2">
                <p>{businessDetails?.footerMessage || 'Official Sales Voucher'}</p>
                <p>Node Registry ID: {lastReceipt.id}</p>
                <p className="tracking-[0.3em] pt-4 border-t border-black/10">AutoMate™ Core Logic Verified</p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
