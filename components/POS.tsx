
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, QrCode, Printer, ScanBarcode, X, Camera, Ban, Percent, Settings, AlertCircle, Check, ShoppingBag, ArrowLeft, Save, MapPin, Phone, MessageSquare, Store, RotateCcw, Smartphone, AlertTriangle, ChefHat, Filter, ChevronDown } from 'lucide-react';
import { Product, CartItem, Transaction } from '../types';
import { formatCurrency } from '../constants';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface POSProps {
  products: Product[];
  onTransactionComplete: (transactions: Transaction[]) => void;
}

type PaymentMethod = 'cash' | 'card' | 'ewallet' | 'qr';

// Audio Context for Beep Sound
const playBeep = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch beep
    gain.gain.setValueAtTime(0.1, ctx.currentTime); // Low volume

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.error('Audio beep failed', e);
  }
};

export const POS: React.FC<POSProps> = ({ products, onTransactionComplete }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('All');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash');
  
  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);
  
  // QR Payment States
  const [showQRView, setShowQRView] = useState(false);
  const [selectedQRProvider, setSelectedQRProvider] = useState<string | null>(null);

  // Receipt & Order State
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState('');
  const [confirmedPaymentMethod, setConfirmedPaymentMethod] = useState('');

  // Mobile UI States
  const [showCartMobile, setShowCartMobile] = useState(false);

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<boolean>(false); // For visual feedback
  
  // Settings
  const [discountPercent, setDiscountPercent] = useState<string>('0');
  const [vatRate, setVatRate] = useState<string>('12');

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<any>(null);
  const lastScannedCode = useRef<string | null>(null);
  const lastScanTime = useRef<number>(0);

  // Derived Filters
  const uniqueCategories = useMemo(() => 
    ['All', ...Array.from(new Set(products.map(p => p.category))).sort()], 
  [products]);

  const uniqueSuppliers = useMemo(() => 
    ['All', ...Array.from(new Set(products.map(p => p.supplier || 'N/A'))).sort()], 
  [products]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    const existing = cart.find(item => item.id === product.id);
    if (existing && existing.quantity >= product.stock) return;

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleConfirmRemove = () => {
    if (itemToRemove) {
      removeFromCart(itemToRemove);
      setItemToRemove(null);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const item = cart.find(i => i.id === id);
    const product = products.find(p => p.id === id);
    if (!item || !product) return;

    const newQty = item.quantity + delta;
    if (newQty > product.stock) return;
    
    // If reducing quantity to 0, ask for confirmation
    if (newQty <= 0) {
      setItemToRemove(id);
      return;
    }

    setCart(prev => prev.map(i => {
      if (i.id === id) return { ...i, quantity: newQty };
      return i;
    }));
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const discountVal = Math.max(0, Math.min(100, parseFloat(discountPercent) || 0));
    const taxRateVal = Math.max(0, parseFloat(vatRate) || 0);
    
    const discountAmount = subtotal * (discountVal / 100);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const tax = taxableAmount * (taxRateVal / 100);
    const total = taxableAmount + tax;
    
    return { subtotal, discountAmount, tax, total };
  }, [cart, discountPercent, vatRate]);

  // Scanner Functions
  const startScanning = async () => {
    setIsScanning(true);
    setCameraError(null);
    try {
      const codeReader = new BrowserMultiFormatReader();
      setTimeout(async () => {
        if (videoRef.current) {
          try {
             const controls = await codeReader.decodeFromVideoDevice(
              undefined, 
              videoRef.current, 
              (result, err) => {
                if (result) {
                  const text = result.getText();
                  const now = Date.now();
                  
                  // Debounce scans (prevent double scan within 1.5s)
                  if (text === lastScannedCode.current && now - lastScanTime.current < 1500) {
                    return;
                  }

                  const product = products.find(p => p.sku === text);
                  
                  if (product) {
                    playBeep();
                    lastScannedCode.current = text;
                    lastScanTime.current = now;
                    addToCart(product);
                    
                    // Trigger visual feedback (Green Glow)
                    setScanSuccess(true);
                    setTimeout(() => setScanSuccess(false), 800);
                  }
                }
              }
            );
            controlsRef.current = controls;
          } catch (err) {
            console.error(err);
            setCameraError("Could not access camera. Ensure permission is granted.");
          }
        }
      }, 100);
    } catch (err) {
      setCameraError("Failed to initialize scanner.");
    }
  };

  const stopScanning = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    setIsScanning(false);
  };

  const handleCheckout = () => {
      setSelectedPayment('cash');
      setShowQRView(false);
      setSelectedQRProvider(null);
      setCurrentOrderId(`TRX-${Date.now().toString().slice(-6)}`);
      setShowPaymentModal(true);
  };

  const handlePaymentMethodClick = (method: PaymentMethod) => {
      setSelectedPayment(method);
      if (method === 'qr' || method === 'ewallet') {
          setShowQRView(true);
      } else {
          setShowQRView(false);
          setSelectedQRProvider(null);
      }
  };

  const handleProcessPayment = (specificMethod?: string) => {
    setShowPaymentModal(false);
    setShowSuccessModal(true);
    setShowQRView(false);
    
    // Determine the actual method string to save
    let finalMethod: any = 'Cash';
    if (specificMethod) {
        finalMethod = specificMethod;
    } else {
        if (selectedPayment === 'card') finalMethod = 'Card';
        else if (selectedPayment === 'qr' || selectedPayment === 'ewallet') finalMethod = 'GCash'; // Default fallback
    }
    setConfirmedPaymentMethod(finalMethod);

    const timestamp = new Date().toISOString(); // Store full timestamp

    const newTransactions: Transaction[] = cart.map((item, idx) => ({
      id: `${currentOrderId}-${idx}`,
      date: timestamp,
      product: item.name,
      category: item.category,
      location: 'Main Store',
      amount: item.price * item.quantity,
      quantity: item.quantity,
      status: 'Completed',
      paymentMethod: finalMethod
    }));
    
    onTransactionComplete(newTransactions);
  };

  const handleFinalize = () => {
    setCart([]);
    setShowSuccessModal(false);
    setDiscountPercent('0');
    setCurrentOrderId('');
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSupplier = selectedSupplier === 'All' || p.supplier === selectedSupplier;

    return matchesSearch && matchesCategory && matchesSupplier;
  });

  return (
    <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-7rem)] flex flex-col lg:flex-row gap-6 relative">
      <style>{`
        @keyframes scan-line {
          0%, 100% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          50% { top: 90%; }
        }
        .animate-scan {
          animation: scan-line 2s ease-in-out infinite;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            color: black;
            background: white;
            padding: 0;
            margin: 0;
            overflow: visible;
          }
          /* Hide scrollbars and UI elements */
          ::-webkit-scrollbar {
            display: none;
          }
        }
      `}</style>
      
      {/* Rest of the component code remains exactly the same as previous POS implementation... */}
      {/* Only change above was using const timestamp = new Date().toISOString() in handleProcessPayment */}
      
      {/* --- SCANNER OVERLAY --- */}
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className={`w-full max-w-lg bg-[#18181b] border-2 rounded-3xl overflow-hidden relative transition-all duration-300 transform ${scanSuccess ? 'border-emerald-500 shadow-[0_0_80px_rgba(16,185,129,0.4)] scale-105' : 'border-[#27272a] shadow-2xl'}`}>
            <div className="p-4 border-b border-[#27272a] flex justify-between items-center bg-[#09090b]">
              <h3 className={`font-bold flex items-center gap-2 transition-colors duration-300 ${scanSuccess ? 'text-emerald-400' : 'text-white'}`}>
                <ScanBarcode className={scanSuccess ? 'text-emerald-400 animate-bounce' : 'text-amber-500'} /> 
                {scanSuccess ? 'Product Added!' : 'Scan Product Barcode'}
              </h3>
              <button onClick={stopScanning} className="text-zinc-400 hover:text-white p-1"><X size={24} /></button>
            </div>
            
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
               <video ref={videoRef} className="w-full h-full object-cover" />
               
               {/* Pulsating Reticle */}
               <div className={`absolute inset-0 m-auto w-64 h-40 border-2 rounded-lg pointer-events-none transition-all duration-300 ${
                 scanSuccess 
                   ? 'border-emerald-400 scale-105 bg-emerald-500/10' 
                   : 'border-amber-500/50'
               }`}>
                  {/* Corner Markers */}
                  <div className={`absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 -mt-1 -ml-1 transition-colors duration-300 ${scanSuccess ? 'border-emerald-400' : 'border-amber-500'}`}></div>
                  <div className={`absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 -mt-1 -mr-1 transition-colors duration-300 ${scanSuccess ? 'border-emerald-400' : 'border-amber-500'}`}></div>
                  <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 -mb-1 -ml-1 transition-colors duration-300 ${scanSuccess ? 'border-emerald-400' : 'border-amber-500'}`}></div>
                  <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 -mb-1 -mr-1 transition-colors duration-300 ${scanSuccess ? 'border-emerald-400' : 'border-amber-500'}`}></div>
                  
                  {/* Scanning Line */}
                  {!scanSuccess && (
                     <div className="absolute left-0 w-full h-0.5 bg-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.8)] animate-scan"></div>
                  )}
               </div>

               {cameraError && <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-rose-400 p-4 font-bold">{cameraError}</div>}
            </div>
            
            <div className="p-6 text-center bg-[#18181b]">
              <p className="text-zinc-400 text-sm">Align barcode within the frame.</p>
              <button onClick={stopScanning} className="mt-4 bg-[#27272a] hover:bg-[#3f3f46] text-white px-8 py-2.5 rounded-xl text-sm font-bold border border-[#3f3f46]">Close Scanner</button>
            </div>
          </div>
        </div>
      )}

      {/* --- LEFT: Product Grid --- */}
      <div className={`flex-1 flex flex-col gap-6 min-h-0 ${showCartMobile ? 'hidden lg:flex' : 'flex'}`}>
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <h2 className="text-2xl font-bold text-white">Menu</h2>
          
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full xl:w-auto">
             
             {/* Filters Group */}
             <div className="flex gap-2 w-full sm:w-auto">
                {/* Category Select */}
                <div className="relative flex-1 sm:flex-none">
                    <select 
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full sm:w-40 bg-[#18181b] border border-[#27272a] rounded-xl pl-3 pr-8 py-2.5 text-sm text-white focus:ring-2 focus:ring-amber-500/50 outline-none appearance-none cursor-pointer"
                    >
                        <option value="All">All Categories</option>
                        {uniqueCategories.filter(c => c !== 'All').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500">
                        <ChevronDown size={14} />
                    </div>
                </div>

                {/* Supplier Select */}
                <div className="relative flex-1 sm:flex-none">
                    <select 
                      value={selectedSupplier}
                      onChange={(e) => setSelectedSupplier(e.target.value)}
                      className="w-full sm:w-40 bg-[#18181b] border border-[#27272a] rounded-xl pl-3 pr-8 py-2.5 text-sm text-white focus:ring-2 focus:ring-amber-500/50 outline-none appearance-none cursor-pointer"
                    >
                        <option value="All">All Suppliers</option>
                        {uniqueSuppliers.filter(s => s !== 'All').map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500">
                        <ChevronDown size={14} />
                    </div>
                </div>
             </div>

             {/* Search & Scan Group */}
             <div className="flex gap-3 w-full sm:w-auto flex-1 xl:flex-none">
                 <div className="relative flex-1 sm:w-64 group">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 group-focus-within:text-amber-500 transition-colors" />
                   <input 
                     type="text" 
                     placeholder="Search dishes or SKU..." 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all placeholder-zinc-600"
                   />
                 </div>
                 <button 
                    onClick={startScanning}
                    className="bg-[#18181b] hover:bg-[#27272a] text-amber-500 border border-[#27272a] hover:border-amber-500/30 p-2.5 rounded-xl transition-all shadow-lg active:scale-95 flex-shrink-0"
                    title="Scan Barcode"
                 >
                    <ScanBarcode size={20} />
                 </button>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-24 lg:pb-0">
           {filteredProducts.length > 0 ? (
             filteredProducts.map(product => (
               <div 
                 key={product.id}
                 onClick={() => addToCart(product)}
                 className={`
                   bg-[#18181b] border border-[#27272a] p-4 rounded-3xl cursor-pointer transition-all hover:border-amber-500/50 hover:bg-[#27272a] flex flex-col justify-between h-[200px] group
                   ${product.stock === 0 ? 'opacity-50 pointer-events-none grayscale' : ''}
                 `}
               >
                  <div className="flex justify-center -mt-8 mb-2">
                     <div className="w-24 h-24 rounded-full bg-[#09090b] border-4 border-[#18181b] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform overflow-hidden">
                        {product.imageUrl ? (
                           <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                           <ChefHat size={32} className="text-zinc-600 group-hover:text-amber-500 transition-colors" />
                        )}
                     </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-white font-bold text-sm leading-tight line-clamp-2">{product.name}</h3>
                    <p className="text-zinc-500 text-xs mt-1">{product.stock} available • {product.sku}</p>
                  </div>
                  <div className="text-center mt-2">
                     <span className="text-amber-500 font-bold text-lg">{formatCurrency(product.price)}</span>
                  </div>
               </div>
             ))
           ) : (
             <div className="col-span-full py-12 flex flex-col items-center justify-center text-zinc-500 gap-4">
                <Search size={48} className="opacity-20" />
                <p>No products found matching your filters.</p>
                <button 
                  onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setSelectedSupplier('All'); }}
                  className="text-amber-500 font-bold text-sm hover:underline"
                >
                  Clear all filters
                </button>
             </div>
           )}
        </div>
      </div>

      {/* --- RIGHT: Cart Panel --- */}
      <div className={`
        fixed inset-0 z-30 bg-[#09090b] lg:static lg:bg-transparent lg:z-auto lg:w-[400px] flex flex-col 
        ${showCartMobile ? 'flex animate-in slide-in-from-bottom-full duration-300' : 'hidden lg:flex'}
      `}>
        <div className="bg-[#18181b] border border-[#27272a] lg:rounded-3xl flex flex-col shadow-2xl h-full lg:h-auto lg:flex-1 overflow-hidden">
           
           <div className="p-6 border-b border-[#27272a] flex justify-between items-center">
              <h3 className="font-bold text-white text-xl">Current Order</h3>
              <button 
                  onClick={() => setShowCartMobile(false)}
                  className="lg:hidden p-2 text-zinc-400"
                >
                  <X size={24} />
              </button>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {cart.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                  <ShoppingBag size={48} className="mb-4 opacity-20" />
                  <p>Order is empty</p>
               </div>
             ) : (
               cart.map(item => (
                 <div key={item.id} className="bg-[#27272a] p-3 rounded-2xl flex flex-col gap-3 animate-in slide-in-from-right-4 duration-300 group relative border border-transparent hover:border-[#3f3f46] transition-all">
                    {/* Row 1: Item Info & Delete */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-[#18181b] flex items-center justify-center text-zinc-500 shrink-0 overflow-hidden">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <ChefHat size={18} />
                              )}
                           </div>
                           <div>
                              <h4 className="text-white font-bold text-sm line-clamp-1">{item.name}</h4>
                              <p className="text-zinc-500 text-xs">{formatCurrency(item.price)}</p>
                           </div>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setItemToRemove(item.id); }}
                            className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                            title="Remove Item"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>

                    {/* Row 2: Controls & Subtotal */}
                    <div className="flex justify-between items-center bg-[#18181b]/50 p-1.5 rounded-xl">
                       <div className="flex items-center bg-[#09090b] rounded-lg border border-[#27272a]">
                          <button 
                            onClick={() => updateQuantity(item.id, -1)} 
                            className="p-1.5 w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#27272a] rounded-l-lg transition-colors"
                          >
                             <Minus size={14} />
                          </button>
                          <span className="text-white font-bold text-sm w-8 text-center border-x border-[#27272a] h-8 flex items-center justify-center select-none">
                             {item.quantity}
                          </span>
                          <button 
                             onClick={() => updateQuantity(item.id, 1)} 
                             className="p-1.5 w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#27272a] rounded-r-lg transition-colors"
                          >
                             <Plus size={14} />
                          </button>
                       </div>
                       <span className="text-white font-bold text-sm pr-2">
                          {formatCurrency(item.price * item.quantity)}
                       </span>
                    </div>
                 </div>
               ))
             )}
           </div>

           <div className="p-6 bg-[#18181b] border-t border-[#27272a] space-y-4">
              
              {/* Discount Section */}
              <div className="bg-[#09090b] rounded-xl p-3 border border-[#27272a] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-zinc-400">
                          <Percent size={16} />
                          <span className="text-sm font-medium">Discount</span>
                      </div>
                      <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded-lg w-24 px-2 focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/20 transition-all">
                          <input 
                              type="number" 
                              value={discountPercent}
                              onChange={(e) => setDiscountPercent(e.target.value)}
                              className="w-full bg-transparent text-right text-white text-sm py-1.5 outline-none placeholder-zinc-600"
                              placeholder="0"
                              min="0"
                              max="100"
                          />
                          <span className="text-zinc-500 text-sm ml-1">%</span>
                      </div>
                  </div>
                  
                  {/* Visual Breakdown if Discount Applied */}
                  {parseFloat(discountPercent) > 0 && (
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#27272a] text-center">
                          <div className="bg-[#18181b] rounded-lg p-2 border border-[#27272a]">
                              <span className="text-[10px] text-zinc-500 uppercase block mb-1">Original</span>
                              <span className="text-xs text-zinc-300 font-medium line-through decoration-zinc-500">{formatCurrency(totals.subtotal)}</span>
                          </div>
                          <div className="bg-emerald-950/30 rounded-lg p-2 border border-emerald-500/20">
                              <span className="text-[10px] text-emerald-500 uppercase block mb-1">Saved</span>
                              <span className="text-xs text-emerald-400 font-bold">-{formatCurrency(totals.discountAmount)}</span>
                          </div>
                          <div className="bg-[#18181b] rounded-lg p-2 border border-[#27272a]">
                               <span className="text-[10px] text-white uppercase block mb-1">New Sub</span>
                               <span className="text-xs text-white font-bold">{formatCurrency(totals.subtotal - totals.discountAmount)}</span>
                          </div>
                      </div>
                  )}
              </div>

              <div className="space-y-2">
                 <div className="flex justify-between text-zinc-400 text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                 </div>
                 <div className="flex justify-between text-zinc-400 text-sm">
                    <span>VAT ({vatRate}%)</span>
                    <span>{formatCurrency(totals.tax)}</span>
                 </div>
                 <div className="flex justify-between text-white text-lg font-bold pt-2 border-t border-[#27272a]">
                    <span>Total</span>
                    <span>{formatCurrency(totals.total)}</span>
                 </div>
              </div>
              
              <button 
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl shadow-lg shadow-amber-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Checkout
              </button>
           </div>
        </div>
      </div>
      
      {/* Payment Modals, Receipt Modal, Success Modal remain identical ... */}
      {/* --- PAYMENT MODAL --- */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-[#18181b] w-full max-w-4xl rounded-3xl border border-[#27272a] shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
              {/* Content preserved ... */}
              <div className="flex-1 p-8 border-b md:border-b-0 md:border-r border-[#27272a] bg-[#09090b]">
                 <div className="flex justify-between items-center mb-8">
                    <div>
                       <h2 className="text-2xl font-bold text-white">Payment</h2>
                       <p className="text-zinc-500 text-sm">Order #{currentOrderId}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-zinc-400 text-xs uppercase tracking-wider">Total Amount</p>
                       <h3 className="text-3xl font-bold text-white">{formatCurrency(totals.total)}</h3>
                    </div>
                 </div>

                 <div className="space-y-4 mb-8">
                    <h4 className="text-zinc-400 text-sm font-bold uppercase tracking-wider mb-2">Order Summary</h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                       {cart.map(item => (
                          <div key={item.id} className="flex justify-between text-sm">
                             <span className="text-zinc-300">{item.quantity}x {item.name}</span>
                             <span className="text-white font-medium">{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                       ))}
                    </div>
                    <div className="pt-4 border-t border-[#27272a] flex justify-between text-sm">
                       <span className="text-zinc-500">Tax ({vatRate}%)</span>
                       <span className="text-zinc-300">{formatCurrency(totals.tax)}</span>
                    </div>
                 </div>
              </div>

              {/* Right: Payment Methods or QR View */}
              <div className="w-full md:w-[400px] p-8 flex flex-col bg-[#18181b] relative">
                 <button 
                   onClick={() => setShowPaymentModal(false)} 
                   className="absolute top-4 right-4 text-zinc-500 hover:text-white z-10"
                 >
                   <X size={24} />
                 </button>

                 {!showQRView ? (
                   <>
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-white font-bold">Select Method</h3>
                     </div>

                     <div className="grid grid-cols-2 gap-3 mb-8">
                        <button 
                          onClick={() => handlePaymentMethodClick('cash')}
                          className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${selectedPayment === 'cash' ? 'bg-amber-500 border-amber-500 text-black' : 'bg-[#27272a] border-transparent text-zinc-400 hover:bg-[#3f3f46]'}`}
                        >
                           <Banknote size={24} />
                           <span className="font-bold text-sm">Cash</span>
                        </button>
                        <button 
                          onClick={() => handlePaymentMethodClick('card')}
                          className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${selectedPayment === 'card' ? 'bg-amber-500 border-amber-500 text-black' : 'bg-[#27272a] border-transparent text-zinc-400 hover:bg-[#3f3f46]'}`}
                        >
                           <CreditCard size={24} />
                           <span className="font-bold text-sm">Card</span>
                        </button>
                        <button 
                          onClick={() => handlePaymentMethodClick('qr')}
                          className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${selectedPayment === 'qr' ? 'bg-amber-500 border-amber-500 text-black' : 'bg-[#27272a] border-transparent text-zinc-400 hover:bg-[#3f3f46]'}`}
                        >
                           <QrCode size={24} />
                           <span className="font-bold text-sm">QR Code</span>
                        </button>
                        <button 
                          onClick={() => handlePaymentMethodClick('ewallet')}
                          className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${selectedPayment === 'ewallet' ? 'bg-amber-500 border-amber-500 text-black' : 'bg-[#27272a] border-transparent text-zinc-400 hover:bg-[#3f3f46]'}`}
                        >
                           <Smartphone size={24} />
                           <span className="font-bold text-sm">E-Wallet</span>
                        </button>
                     </div>

                     <div className="mt-auto">
                        <button 
                          onClick={() => handleProcessPayment()}
                          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl shadow-lg shadow-amber-900/20 transition-all text-lg"
                        >
                           Pay Now
                        </button>
                     </div>
                   </>
                 ) : (
                   <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
                      <div className="flex items-center gap-3 mb-6">
                          <button onClick={() => setShowQRView(false)} className="p-2 hover:bg-[#27272a] rounded-full text-zinc-400 hover:text-white transition-colors">
                              <ArrowLeft size={20} />
                          </button>
                          <h3 className="text-white font-bold">
                             {selectedQRProvider ? `Scan ${selectedQRProvider} QR` : 'Select Provider'}
                          </h3>
                      </div>
                      
                      {!selectedQRProvider ? (
                        <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto content-start">
                             {[
                                 { id: 'GCash', color: 'bg-blue-600', text: 'text-white', label: 'GCash' },
                                 { id: 'Maya', color: 'bg-green-600', text: 'text-white', label: 'Maya' },
                                 { id: 'GoTyme', color: 'bg-white', text: 'text-black', label: 'GoTyme' },
                                 { id: 'QRPH', color: 'bg-red-600', text: 'text-white', label: 'QRPH' }
                             ].map(p => (
                                 <button 
                                    key={p.id}
                                    onClick={() => setSelectedQRProvider(p.id)}
                                    className="aspect-square rounded-2xl border border-[#27272a] bg-[#27272a]/50 hover:bg-[#27272a] flex flex-col items-center justify-center gap-3 transition-all group hover:border-zinc-500"
                                 >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg ${p.color} ${p.text}`}>
                                        <QrCode size={24} />
                                    </div>
                                    <span className="font-bold text-white text-sm">{p.label}</span>
                                 </button>
                             ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center flex-1 gap-6 animate-in zoom-in-95 duration-300">
                            <div className="bg-white p-4 rounded-2xl shadow-xl">
                                <QrCode size={160} className="text-black" />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-bold text-lg mb-1">{selectedQRProvider}</p>
                                <p className="text-zinc-500 text-sm">Ask customer to scan to pay</p>
                                <p className="text-amber-500 font-bold text-xl mt-2">{formatCurrency(totals.total)}</p>
                            </div>
                            <button 
                                onClick={() => handleProcessPayment(selectedQRProvider)}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all mt-4"
                            >
                                Confirm Payment Received
                            </button>
                        </div>
                      )}
                      
                      {!selectedQRProvider && (
                        <p className="mt-auto text-center text-xs text-zinc-500 pt-4">
                            Selecting a provider will generate a transaction record.
                        </p>
                      )}
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* --- CONFIRMATION MODAL --- */}
      {itemToRemove && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-[#18181b] border border-[#27272a] rounded-3xl p-6 w-full max-w-sm text-center relative shadow-2xl animate-in zoom-in-95 duration-300">
               <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} className="text-rose-500" />
               </div>
               
               <h2 className="text-xl font-bold text-white mb-2">Remove Item?</h2>
               <p className="text-zinc-400 text-sm mb-6">
                 Are you sure you want to remove this item from the cart?
               </p>

               <div className="flex gap-3">
                  <button 
                    onClick={() => setItemToRemove(null)}
                    className="flex-1 py-3 bg-[#27272a] hover:bg-[#3f3f46] text-white font-bold rounded-xl transition-colors"
                  >
                     Cancel
                  </button>
                  <button 
                    onClick={handleConfirmRemove}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-colors"
                  >
                     Remove
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* --- RECEIPT MODAL --- */}
      {showReceipt && (
        <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white text-black w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Printable Content */}
                <div id="printable-receipt" className="p-8 overflow-y-auto flex-1 font-mono text-sm bg-white">
                    <div className="text-center mb-6 border-b-2 border-dashed border-gray-300 pb-4">
                        <div className="flex justify-center mb-2">
                            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white font-bold">A</div>
                        </div>
                        <h2 className="font-bold text-xl uppercase tracking-wider mb-1">AutoMate Store</h2>
                        <p className="text-xs text-gray-500">123 Business Ave, BGC</p>
                        <p className="text-xs text-gray-500">Taguig City, Metro Manila</p>
                        <p className="text-xs text-gray-500 mt-1">Tel: +63 917 123 4567</p>
                    </div>

                    <div className="mb-6 text-xs space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Date:</span>
                            <span>{new Date().toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Order ID:</span>
                            <span>{currentOrderId}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Cashier:</span>
                            <span>Admin Pro</span>
                        </div>
                    </div>

                    <div className="mb-6 border-b-2 border-dashed border-gray-300 pb-4">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-xs uppercase text-gray-500 border-b border-gray-200">
                                    <th className="pb-2">Item</th>
                                    <th className="pb-2 text-right">Qty</th>
                                    <th className="pb-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {cart.map((item, i) => (
                                    <tr key={i}>
                                        <td className="py-2">
                                            <div className="font-bold">{item.name}</div>
                                            <div className="text-[10px] text-gray-500">@{item.price}</div>
                                        </td>
                                        <td className="py-2 text-right align-top">{item.quantity}</td>
                                        <td className="py-2 text-right align-top font-medium">
                                            {formatCurrency(item.price * item.quantity).replace('₱', '')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-2 mb-6 border-b-2 border-dashed border-gray-300 pb-4">
                        <div className="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span>{formatCurrency(totals.subtotal)}</span>
                        </div>
                        {totals.discountAmount > 0 && (
                            <div className="flex justify-between text-emerald-600">
                                <span>Discount</span>
                                <span>-{formatCurrency(totals.discountAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-gray-600">
                            <span>VAT (12%)</span>
                            <span>{formatCurrency(totals.tax)}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold mt-2 pt-2 border-t border-gray-200">
                            <span>Total</span>
                            <span>{formatCurrency(totals.total)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500 mt-1">
                            <span>Paid via</span>
                            <span className="uppercase font-bold">{confirmedPaymentMethod}</span>
                        </div>
                    </div>

                    <div className="text-center text-xs text-gray-500">
                        <p className="font-bold mb-1">Thank you for your purchase!</p>
                        <p>Please come again.</p>
                        <div className="mt-4 flex justify-center">
                            <div className="w-full h-12 bg-gray-100 flex items-center justify-center tracking-[0.5em] text-gray-400 font-barcode">
                                ||| || ||| || ||| ||
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 print:hidden">
                     <button 
                        onClick={() => setShowReceipt(false)}
                        className="flex-1 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-colors"
                     >
                         Close
                     </button>
                     <button 
                        onClick={() => window.print()}
                        className="flex-1 py-3 bg-black hover:bg-gray-800 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                     >
                         <Printer size={18} /> Print Now
                     </button>
                </div>
            </div>
        </div>
      )}

      {/* --- SUCCESS MODAL --- */}
      {showSuccessModal && (
         <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#18181b] border border-[#27272a] rounded-3xl p-8 w-full max-w-sm text-center relative shadow-2xl animate-in zoom-in-95 duration-300">
               <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-900/40">
                  <Check size={40} className="text-black" strokeWidth={4} />
               </div>
               
               <h2 className="text-2xl font-bold text-white mb-2">Payment Successful</h2>
               <p className="text-zinc-400 text-sm mb-8">
                 Transaction completed successfully.<br/>
                 Amount Paid: <span className="text-white font-bold">{formatCurrency(totals.total)}</span>
               </p>

               <div className="flex gap-3">
                  <button 
                    onClick={() => setShowReceipt(true)}
                    className="flex-1 py-3 bg-[#27272a] hover:bg-[#3f3f46] text-white font-bold rounded-xl transition-colors"
                  >
                     Print Bill
                  </button>
                  <button 
                    onClick={handleFinalize}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors"
                  >
                     Done
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
