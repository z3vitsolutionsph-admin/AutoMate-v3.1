
import React, { useState, useRef, useEffect } from 'react';
import { Package, Search, Plus, Sparkles, AlertCircle, ScanBarcode, X, Camera, Loader2, Truck, Check, Wand2, Building2, Phone, Mail, MapPin, UserSquare2, Pencil, Trash2, Brain, ArrowRight, AlertTriangle, Image as ImageIcon, CheckSquare, Square, Layers, Edit3, Save, ShoppingCart } from 'lucide-react';
import { Product, Supplier, Transaction, ReorderSuggestion } from '../types';
import { formatCurrency } from '../constants';
import { enhanceProductDetails, analyzeStockLevels } from '../services/geminiService';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface InventoryProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: string[];
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  transactions: Transaction[];
}

// Utility: URL Validator
const isValidUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

export const Inventory: React.FC<InventoryProps> = ({ products, setProducts, categories, suppliers, setSuppliers, transactions }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'suppliers'>('products');
  
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New Product State
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  // Supplier State (Add/Edit)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  
  // Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkStockModal, setShowBulkStockModal] = useState(false);
  const [bulkStockValue, setBulkStockValue] = useState<string>('');

  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // AI & Scanning State
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  
  // Stock Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<any>(null);

  // Proactive Alert Check
  const lowStockCount = products.filter(p => p.stock < 10).length;

  // Filtered Lists
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Auto-generate SKU
  useEffect(() => {
    if (isAdding && !newSku) {
      setNewSku(`SKU-${Math.floor(Math.random() * 10000)}`);
    }
  }, [isAdding]);

  // Clear toasts
  useEffect(() => {
    if (scanSuccess) {
      const timer = setTimeout(() => setScanSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [scanSuccess]);

  useEffect(() => {
    if (generalError) {
      const timer = setTimeout(() => setGeneralError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [generalError]);

  // Bulk Action Handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} selected products? This action cannot be undone.`)) {
      setProducts(prev => prev.filter(p => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      setScanSuccess(`${selectedIds.size} products deleted successfully.`);
    }
  };

  const handleBulkStockUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(bulkStockValue);
    if (isNaN(qty) || qty < 0) {
      setGeneralError("Please enter a valid non-negative stock quantity.");
      return;
    }

    setProducts(prev => prev.map(p => {
      if (selectedIds.has(p.id)) {
        return { ...p, stock: qty };
      }
      return p;
    }));
    
    setShowBulkStockModal(false);
    setBulkStockValue('');
    setSelectedIds(new Set());
    setScanSuccess('Stock updated for selected items.');
  };

  const handleSmartEnhance = async () => {
    if (!newName) {
      setErrors(prev => ({ ...prev, name: 'Product name is required for AI enhancement' }));
      return;
    }
    setIsEnhancing(true);
    setGeneralError(null);
    setErrors(prev => ({ ...prev, name: '' })); 
    try {
      const details = await enhanceProductDetails(newName);
      setNewCategory(details.category);
      setNewDesc(details.description);
    } catch (e) {
      setGeneralError("Failed to auto-fill details. Please try again.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleAnalyzeStock = async () => {
    setIsAnalyzing(true);
    setShowSuggestions(true);
    try {
      const results = await analyzeStockLevels(products, transactions);
      setSuggestions(results);
    } catch (e) {
      setGeneralError("Failed to analyze stock levels.");
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const dismissSuggestion = (index: number) => {
    setSuggestions(prev => prev.filter((_, i) => i !== index));
  };

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
                  setNewSku(text);
                  setScanSuccess(text);
                  stopScanning(); 
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

  const validateProductForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newName.trim()) newErrors.name = 'Product name is required';
    
    // Strict Price Validation
    const priceValue = parseFloat(newPrice);
    if (!newPrice || isNaN(priceValue) || priceValue < 0) {
       newErrors.price = 'Price must be a valid positive number';
    }

    // Strict Stock Validation
    const stockValue = Number(newStock);
    if (newStock === '' || isNaN(stockValue) || stockValue < 0) {
       newErrors.stock = 'Stock must be 0 or greater';
    } else if (!Number.isInteger(stockValue)) {
       newErrors.stock = 'Stock must be a whole number';
    }

    // SKU Validation
    if (!newSku.trim()) {
       newErrors.sku = 'SKU is required';
    } else if (products.some(p => p.sku.toLowerCase() === newSku.toLowerCase())) {
       newErrors.sku = 'SKU already exists';
    }

    if (!newCategory) newErrors.category = 'Category is required';
    if (!newSupplier) newErrors.supplier = 'Supplier is required';
    
    // Image URL validation
    if (newImageUrl && !isValidUrl(newImageUrl)) {
      newErrors.image = 'Invalid URL format (must be http/https)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProductForm()) {
      setGeneralError("Please fix the errors before saving.");
      return;
    }

    const newProduct: Product = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName,
      description: newDesc,
      price: parseFloat(newPrice),
      stock: parseInt(newStock),
      category: newCategory || 'Uncategorized',
      supplier: newSupplier || 'Default Supplier',
      sku: newSku,
      imageUrl: newImageUrl
    };
    setProducts([...products, newProduct]);
    setIsAdding(false);
    setScanSuccess('Product added successfully');
    
    setNewName(''); setNewDesc(''); setNewPrice('');
    setNewStock(''); setNewCategory(''); setNewSku(''); setNewSupplier(''); setNewImageUrl('');
    setErrors({});
  };

  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupName(''); setSupContact(''); setSupEmail(''); setSupPhone(''); setSupAddress('');
    setErrors({});
    setIsAddingSupplier(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupName(s.name);
    setSupContact(s.contactPerson);
    setSupEmail(s.email);
    setSupPhone(s.phone);
    setSupAddress(s.address);
    setErrors({});
    setIsAddingSupplier(true);
  };

  const validateSupplierForm = () => {
    const newErrors: Record<string, string> = {};
    if (!supName.trim()) newErrors.supName = 'Company name is required';
    if (!supContact.trim()) newErrors.supContact = 'Contact person is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!supEmail.trim() || !emailRegex.test(supEmail)) newErrors.supEmail = 'Valid email is required';
    if (!supPhone.trim()) newErrors.supPhone = 'Phone number is required';
    if (!supAddress.trim()) newErrors.supAddress = 'Address is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSupplierForm()) {
        setGeneralError("Please fix the errors before saving.");
        return;
    }

    if (editingSupplier) {
        const oldName = editingSupplier.name;
        setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? {
            ...s,
            name: supName,
            contactPerson: supContact,
            email: supEmail,
            phone: supPhone,
            address: supAddress
        } : s));

        if (oldName !== supName) {
            setProducts(prev => prev.map(p => p.supplier === oldName ? { ...p, supplier: supName } : p));
        }
        setScanSuccess('Supplier details updated');
    } else {
        const newSup: Supplier = {
            id: `SUP-${Date.now()}`,
            name: supName,
            contactPerson: supContact,
            email: supEmail,
            phone: supPhone,
            address: supAddress
        };
        setSuppliers([...suppliers, newSup]);
        setScanSuccess('New supplier added');
    }
    
    setIsAddingSupplier(false);
    setEditingSupplier(null);
    setSupName(''); setSupContact(''); setSupEmail(''); setSupPhone(''); setSupAddress('');
    setErrors({});
  };

  const handleDeleteSupplier = (id: string, name: string) => {
      const linkedProducts = products.filter(p => p.supplier === name);
      if (linkedProducts.length > 0) {
          setGeneralError(`Cannot delete "${name}". Please reassign its ${linkedProducts.length} linked product(s) first.`);
          return;
      }
      if (window.confirm(`Delete supplier "${name}"?`)) {
          setSuppliers(prev => prev.filter(s => s.id !== id));
          setScanSuccess('Supplier deleted');
      }
  };

  const getInputClass = (error?: string) => `w-full bg-black/20 border rounded-xl px-4 py-3 text-white focus:ring-2 outline-none transition-all placeholder-zinc-500 backdrop-blur-sm ${
    error ? 'border-rose-500 focus:ring-rose-500/50' : 'border-white/10 focus:ring-amber-500/50 focus:border-amber-500/50'
  }`;

  const isAllSelected = filteredProducts.length > 0 && selectedIds.size === filteredProducts.length;

  return (
    <div className="space-y-6 relative pb-32">
      {/* Scanner Modal */}
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
              <h3 className="font-bold text-white flex items-center gap-2">
                <ScanBarcode className="text-amber-500" /> Scan Product Barcode
              </h3>
              <button onClick={stopScanning} className="text-zinc-400 hover:text-white p-1"><X size={24} /></button>
            </div>
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
               <video ref={videoRef} className="w-full h-full object-cover" />
               <div className="absolute inset-0 border-2 border-amber-500/50 rounded-lg m-12 pointer-events-none animate-pulse"></div>
               {cameraError && <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-rose-400 p-4">{cameraError}</div>}
            </div>
            <div className="p-6 text-center">
              <p className="text-zinc-500 text-sm">Point camera at barcode.</p>
              <button onClick={stopScanning} className="mt-4 bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Stock Update Modal */}
      {showBulkStockModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
             {/* Gradient Blob */}
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
             
             <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <h3 className="text-xl font-bold text-white">Bulk Update Stock</h3>
                  <p className="text-zinc-400 text-sm mt-1">Updating <span className="text-amber-500 font-bold">{selectedIds.size}</span> selected items</p>
                </div>
                <button onClick={() => setShowBulkStockModal(false)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
             </div>
             
             <form onSubmit={handleBulkStockUpdate} className="relative z-10">
                <div className="mb-6">
                   <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">New Stock Quantity</label>
                   <input 
                      type="number"
                      value={bulkStockValue}
                      onChange={(e) => setBulkStockValue(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white text-2xl font-bold focus:ring-2 focus:ring-amber-500/50 outline-none text-center"
                      placeholder="0"
                      autoFocus
                      min="0"
                   />
                </div>
                <div className="flex gap-3">
                   <button 
                     type="button" 
                     onClick={() => setShowBulkStockModal(false)}
                     className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors border border-white/5"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit" 
                     className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors shadow-lg shadow-amber-900/20"
                   >
                     Update All
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Header with Tabs */}
      <div className="glass-panel p-2 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-2 z-20 shadow-xl">
        <div className="flex bg-black/20 p-1 rounded-xl border border-white/5 w-full sm:w-auto">
           <button 
             onClick={() => { setActiveTab('products'); setSearchTerm(''); setIsAdding(false); setIsAddingSupplier(false); setErrors({}); }}
             className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'products' ? 'bg-amber-500 text-black shadow-lg shadow-amber-900/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
           >
             <Package size={16} /> Products
           </button>
           <button 
             onClick={() => { setActiveTab('suppliers'); setSearchTerm(''); setIsAdding(false); setIsAddingSupplier(false); setErrors({}); }}
             className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'suppliers' ? 'bg-amber-500 text-black shadow-lg shadow-amber-900/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
           >
             <Truck size={16} /> Suppliers
           </button>
        </div>

        <div className="flex w-full sm:w-auto gap-3 px-2 sm:px-0">
           <div className="relative flex-1 sm:w-64 group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 group-focus-within:text-amber-500 transition-colors" />
             <input 
               type="text" 
               placeholder={activeTab === 'products' ? "Search products..." : "Search suppliers..."}
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-black/20 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all placeholder-zinc-600 backdrop-blur-sm"
             />
           </div>
           
           {activeTab === 'products' ? (
              <div className="flex gap-2">
                <button
                  onClick={handleAnalyzeStock}
                  disabled={isAnalyzing}
                  className={`w-10 sm:w-auto bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 p-2.5 sm:px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 relative ${lowStockCount > 0 && !showSuggestions ? 'animate-pulse ring-2 ring-rose-500/50' : ''}`}
                  title="AI Stock Analysis"
                >
                   {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Brain size={20} />}
                   <span className="hidden sm:inline font-bold text-sm">AI Analysis</span>
                </button>
                <button 
                  onClick={() => { setIsAdding(!isAdding); setErrors({}); }}
                  className={`w-10 sm:w-auto bg-amber-500 hover:bg-amber-400 text-black p-2.5 sm:px-5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-900/20 ${isAdding ? 'bg-white/10 text-white hover:bg-white/20' : ''}`}
                >
                  {isAdding ? <X size={20} /> : <><Plus size={20} /><span className="hidden sm:inline font-bold text-sm">Add Item</span></>}
                </button>
              </div>
           ) : (
              <button 
                onClick={() => isAddingSupplier ? setIsAddingSupplier(false) : openAddSupplier()}
                className={`w-10 sm:w-auto bg-amber-500 hover:bg-amber-400 text-black p-2.5 sm:px-5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-900/20 ${isAddingSupplier ? 'bg-white/10 text-white hover:bg-white/20' : ''}`}
              >
                {isAddingSupplier ? <X size={20} /> : <><Plus size={20} /><span className="hidden sm:inline font-bold text-sm">Add Supplier</span></>}
              </button>
           )}
        </div>
      </div>

      {/* --- PRODUCTS TAB CONTENT --- */}
      {activeTab === 'products' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* AI Reorder Suggestions Panel */}
          {showSuggestions && (
            <div className="bg-gradient-to-br from-violet-900/40 to-fuchsia-900/20 border border-violet-500/30 rounded-3xl p-6 mb-6 shadow-2xl relative overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-500">
               {/* Background Decorative Elements */}
               <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
               
               <div className="flex justify-between items-start mb-6 relative z-10">
                 <div>
                   <h3 className="text-xl font-bold text-white flex items-center gap-2">
                     <Brain className="text-violet-300" /> AI Reorder Insights
                   </h3>
                   <p className="text-violet-200/60 text-sm mt-1">
                     Analyzed sales velocity & stock patterns to generate proactive suggestions.
                   </p>
                 </div>
                 <button 
                    onClick={() => setShowSuggestions(false)} 
                    className="p-2 hover:bg-white/10 rounded-xl text-violet-300 hover:text-white transition-colors"
                 >
                   <X size={20} />
                 </button>
               </div>

               {isAnalyzing ? (
                 <div className="flex flex-col items-center justify-center py-16 gap-4 text-violet-300">
                    <Loader2 size={32} className="animate-spin" />
                    <span className="font-bold text-lg animate-pulse">Analyzing inventory patterns...</span>
                 </div>
               ) : suggestions.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative z-10">
                    {suggestions.map((item, idx) => (
                      <div key={idx} className="bg-black/30 border border-violet-500/20 rounded-2xl p-5 flex flex-col gap-4 hover:border-violet-500/50 hover:bg-black/40 transition-all backdrop-blur-sm group">
                         <div className="flex justify-between items-start">
                           <h4 className="font-bold text-white truncate pr-2 text-lg">{item.productName}</h4>
                           <button 
                             onClick={() => dismissSuggestion(idx)}
                             className="text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                             title="Dismiss"
                           >
                             <X size={14} />
                           </button>
                         </div>
                         
                         <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              item.priority === 'High' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 
                              item.priority === 'Medium' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 
                              'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            }`}>
                              {item.priority} Priority
                            </span>
                            <span className="text-xs text-zinc-400 italic truncate flex-1">{item.reason}</span>
                         </div>

                         <div className="grid grid-cols-2 gap-2 mt-1">
                            <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                                <span className="text-[10px] text-zinc-400 uppercase block">Current</span>
                                <span className={`text-lg font-bold ${item.currentStock < 10 ? 'text-rose-400' : 'text-white'}`}>
                                  {item.currentStock}
                                </span>
                            </div>
                             <div className="bg-violet-500/10 rounded-lg p-2 border border-violet-500/20">
                                <span className="text-[10px] text-violet-300 uppercase block">Reorder</span>
                                <span className="text-lg font-bold text-violet-200">
                                  +{item.suggestedReorder}
                                </span>
                            </div>
                         </div>
                         
                         <button className="mt-2 w-full py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-violet-900/20 flex items-center justify-center gap-2">
                            <ShoppingCart size={16} /> Order Now
                         </button>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="text-center py-12 text-violet-200/50 flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                      <Check size={32} />
                    </div>
                    <p className="text-lg font-medium">Inventory levels look healthy!</p>
                    <p className="text-sm">No immediate reorders suggested by AI.</p>
                 </div>
               )}
            </div>
          )}

          {/* Add Product Form */}
          {isAdding && (
            <div className="glass-panel p-6 md:p-8 rounded-3xl mb-6 border border-white/10 relative overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -z-10"></div>
              
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Package className="text-amber-500" size={20} /> Add New Product
                </h3>
              </div>

              <form onSubmit={handleAddProduct} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5 ml-1">SKU / Barcode</label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input 
                          type="text" 
                          value={newSku}
                          onChange={(e) => setNewSku(e.target.value)}
                          className={getInputClass(errors.sku)}
                          placeholder="Scan or enter SKU"
                        />
                         {errors.sku && <p className="text-xs text-rose-400 mt-1 ml-1 absolute -bottom-5">{errors.sku}</p>}
                      </div>
                      <button type="button" onClick={startScanning} className="bg-white/5 border border-white/10 hover:bg-white/10 text-amber-500 px-4 rounded-xl transition-colors">
                        <Camera size={20} />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5 ml-1">Product Name *</label>
                    <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className={getInputClass(errors.name)}
                          placeholder="e.g. Wireless Headphones"
                        />
                        <button 
                          type="button"
                          onClick={handleSmartEnhance}
                          disabled={!newName || isEnhancing}
                          className="bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-black px-4 rounded-xl flex items-center gap-2 text-sm font-bold transition-all disabled:opacity-50 whitespace-nowrap"
                        >
                          {isEnhancing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                          Auto-Fill
                        </button>
                    </div>
                    {errors.name && <p className="text-xs text-rose-400 mt-1 ml-1">{errors.name}</p>}
                  </div>

                  <div>
                     <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5 ml-1">Image URL</label>
                     <div className="flex gap-4">
                       <div className="relative flex-1">
                         <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                         <input
                           type="text"
                           value={newImageUrl}
                           onChange={(e) => setNewImageUrl(e.target.value)}
                           className={getInputClass(errors.image).replace('px-4', 'pl-10 pr-4')}
                           placeholder="https://example.com/image.jpg"
                         />
                       </div>
                       {/* Image Preview */}
                       <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                          {isValidUrl(newImageUrl) ? (
                            <img src={newImageUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={16} className="text-zinc-700" />
                          )}
                       </div>
                     </div>
                     {errors.image && <p className="text-xs text-rose-400 mt-1 ml-1">{errors.image}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5 ml-1">Detailed Description</label>
                    <textarea 
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none h-32 resize-none placeholder-zinc-500 backdrop-blur-sm"
                      placeholder="Enter product details (ingredients, dimensions, features)..."
                    />
                  </div>
                </div>
                
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5 ml-1">Price (₱) *</label>
                      <input 
                        type="number" 
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className={getInputClass(errors.price)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                      {errors.price && <p className="text-xs text-rose-400 mt-1 ml-1">{errors.price}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5 ml-1">Stock Qty *</label>
                      <input 
                        type="number" 
                        value={newStock}
                        onChange={(e) => setNewStock(e.target.value)}
                        className={getInputClass(errors.stock)}
                        placeholder="0"
                        min="0"
                        step="1"
                      />
                      {errors.stock && <p className="text-xs text-rose-400 mt-1 ml-1">{errors.stock}</p>}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5 ml-1">Supplier *</label>
                    <div className="relative">
                      <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                      <select 
                        value={newSupplier}
                        onChange={(e) => setNewSupplier(e.target.value)}
                        className={getInputClass(errors.supplier).replace('px-4', 'pl-10 pr-4')}
                      >
                         <option value="" disabled className="text-zinc-500">Select a Supplier</option>
                         {suppliers.map(sup => (
                           <option key={sup.id} value={sup.name} className="bg-slate-900 text-white">{sup.name}</option>
                         ))}
                      </select>
                    </div>
                    {errors.supplier && <p className="text-xs text-rose-400 mt-1 ml-1">{errors.supplier}</p>}
                  </div>

                  <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Category *</label>
                    <div className="flex gap-2 flex-col">
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className={getInputClass(errors.category)}
                      >
                        <option value="" disabled className="text-zinc-500">Select Category</option>
                        {categories.map((cat, idx) => <option key={idx} value={cat} className="bg-slate-900 text-white">{cat}</option>)}
                        <option value="Uncategorized" className="bg-slate-900 text-white">Uncategorized</option>
                      </select>
                      {errors.category && <p className="text-xs text-rose-400 ml-1">{errors.category}</p>}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 gap-3">
                    <button 
                      type="button" 
                      onClick={() => { setIsAdding(false); setErrors({}); }}
                      className="px-6 py-3.5 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-400 text-black px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-amber-900/20 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2">
                      <Save size={18} /> Save Product
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Product List Table */}
          <div className="glass-panel border border-white/5 rounded-3xl overflow-hidden shadow-2xl mb-12">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-black/40 text-zinc-400 text-xs uppercase font-semibold tracking-wider">
                  <tr>
                    <th className="p-4 border-b border-white/5 w-12 text-center">
                        <button 
                            onClick={handleSelectAll} 
                            className="text-zinc-400 hover:text-white transition-colors flex items-center justify-center w-full"
                        >
                            {isAllSelected ? <CheckSquare size={18} className="text-amber-500" /> : <Square size={18} />}
                        </button>
                    </th>
                    <th className="p-4 border-b border-white/5">Product Info</th>
                    <th className="p-4 border-b border-white/5">SKU</th>
                    <th className="p-4 border-b border-white/5">Category</th>
                    <th className="p-4 border-b border-white/5">Supplier</th>
                    <th className="p-4 border-b border-white/5 text-right">Price</th>
                    <th className="p-4 border-b border-white/5 text-center">Stock</th>
                    <th className="p-4 border-b border-white/5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className={`hover:bg-white/5 transition-colors group ${selectedIds.has(product.id) ? 'bg-amber-500/5' : ''}`}>
                         <td className="p-4 text-center">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleSelectOne(product.id); }}
                                className="text-zinc-400 hover:text-white transition-colors flex items-center justify-center w-full"
                            >
                                {selectedIds.has(product.id) ? <CheckSquare size={18} className="text-amber-500" /> : <Square size={18} />}
                            </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                                {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Package size={20} className="text-zinc-700" />
                                )}
                              </div>
                              <div>
                                  <div className="font-bold text-white group-hover:text-amber-500 transition-colors">{product.name}</div>
                                  <div className="text-xs text-zinc-500 truncate max-w-[200px] mt-0.5">{product.description || 'No description'}</div>
                              </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-xs text-zinc-400">{product.sku}</span>
                        </td>
                        <td className="p-4">
                          <span className="bg-white/5 text-zinc-300 px-2.5 py-1 rounded-full text-xs font-medium border border-white/5">{product.category}</span>
                        </td>
                        <td className="p-4 text-zinc-400 flex items-center gap-2">
                          {product.supplier ? (
                            <>
                              <Truck size={14} className="opacity-50" /> {product.supplier}
                            </>
                          ) : (
                            <span className="text-zinc-600">N/A</span>
                          )}
                        </td>
                        <td className="p-4 text-right font-bold text-white">{formatCurrency(product.price)}</td>
                        <td className="p-4 text-center">
                          <span className={`font-bold ${product.stock < 10 ? 'text-rose-400' : 'text-zinc-300'}`}>{product.stock}</span>
                        </td>
                        <td className="p-4 text-center">
                          {product.stock < 10 ? (
                            <span className="inline-flex items-center gap-1.5 text-rose-400 text-xs font-bold bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full animate-pulse">
                              <AlertCircle size={12} /> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                              <Check size={12} /> In Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-16 text-center text-zinc-500">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <Package size={48} strokeWidth={1} className="opacity-20" />
                          <p>No products found matching your search.</p>
                          <button onClick={() => setIsAdding(true)} className="text-amber-500 hover:underline text-sm font-medium">Add a new product</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      {selectedIds.size > 0 && activeTab === 'products' && (
         <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-xl border border-amber-500/30 rounded-full px-6 py-3 shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 fade-in duration-300 ring-1 ring-amber-500/20">
             <div className="flex items-center gap-3 border-r border-white/10 pr-6">
                 <div className="bg-amber-500 text-black text-xs font-bold px-2.5 py-1 rounded-full">{selectedIds.size}</div>
                 <span className="text-sm font-bold text-white">Selected</span>
             </div>
             
             <button 
                onClick={() => setShowBulkStockModal(true)}
                className="flex items-center gap-2 text-sm font-bold text-zinc-300 hover:text-white transition-colors"
             >
                 <Layers size={18} className="text-amber-500" /> Update Stock
             </button>
             
             <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 text-sm font-bold text-rose-400 hover:text-rose-300 transition-colors"
             >
                 <Trash2 size={18} /> Delete
             </button>

             <button 
                onClick={() => setSelectedIds(new Set())}
                className="ml-2 p-1.5 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
             >
                 <X size={16} />
             </button>
         </div>
      )}

      {/* --- SUPPLIERS TAB CONTENT --- */}
      {activeTab === 'suppliers' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Add/Edit Supplier Form */}
          {isAddingSupplier && (
            <div className="glass-panel p-6 md:p-8 rounded-3xl mb-6 border border-white/10 relative overflow-hidden">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Building2 className="text-amber-500" size={20} /> 
                {editingSupplier ? 'Edit Supplier Details' : 'Add New Supplier'}
              </h3>
              <form onSubmit={handleSaveSupplier} className="space-y-5">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5 ml-1">Company Name *</label>
                      <input 
                        type="text" 
                        value={supName}
                        onChange={(e) => setSupName(e.target.value)}
                        className={getInputClass(errors.supName)}
                        placeholder="e.g. Tech Distributor Inc."
                      />
                      {errors.supName && <p className="text-xs text-rose-400 mt-1 ml-1">{errors.supName}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5 ml-1">Contact Person *</label>
                      <input 
                        type="text" 
                        value={supContact}
                        onChange={(e) => setSupContact(e.target.value)}
                        className={getInputClass(errors.supContact)}
                        placeholder="e.g. John Doe"
                      />
                      {errors.supContact && <p className="text-xs text-rose-400 mt-1 ml-1">{errors.supContact}</p>}
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5 ml-1">Email Address *</label>
                      <input 
                        type="email" 
                        value={supEmail}
                        onChange={(e) => setSupEmail(e.target.value)}
                        className={getInputClass(errors.supEmail)}
                        placeholder="contact@supplier.com"
                      />
                      {errors.supEmail && <p className="text-xs text-rose-400 mt-1 ml-1">{errors.supEmail}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5 ml-1">Phone Number *</label>
                      <input 
                        type="text" 
                        value={supPhone}
                        onChange={(e) => setSupPhone(e.target.value)}
                        className={getInputClass(errors.supPhone)}
                        placeholder="0917-XXX-XXXX"
                      />
                      {errors.supPhone && <p className="text-xs text-rose-400 mt-1 ml-1">{errors.supPhone}</p>}
                    </div>
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5 ml-1">Business Address *</label>
                    <input 
                      type="text" 
                      value={supAddress}
                      onChange={(e) => setSupAddress(e.target.value)}
                      className={getInputClass(errors.supAddress)}
                      placeholder="Street, City, Province"
                    />
                    {errors.supAddress && <p className="text-xs text-rose-400 mt-1 ml-1">{errors.supAddress}</p>}
                 </div>

                 <div className="flex justify-end pt-2 gap-3">
                    <button 
                      type="button" 
                      onClick={() => { setIsAddingSupplier(false); setEditingSupplier(null); setErrors({}); }}
                      className="px-6 py-3 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-black px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-amber-900/20 hover:scale-[1.02] active:scale-95">
                      {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                    </button>
                 </div>
              </form>
            </div>
          )}

          {/* Supplier List Table */}
          <div className="glass-panel border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-black/40 text-zinc-400 text-xs uppercase font-semibold tracking-wider">
                  <tr>
                    <th className="p-4 border-b border-white/5">Company Name</th>
                    <th className="p-4 border-b border-white/5">Contact Person</th>
                    <th className="p-4 border-b border-white/5">Contact Info</th>
                    <th className="p-4 border-b border-white/5">Address</th>
                    <th className="p-4 border-b border-white/5 text-center">Products</th>
                    <th className="p-4 border-b border-white/5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map((sup) => {
                      const productCount = products.filter(p => p.supplier === sup.name).length;
                      return (
                        <tr key={sup.id} className="hover:bg-white/5 transition-colors group">
                          <td className="p-4">
                            <div className="font-bold text-white group-hover:text-amber-500 transition-colors">{sup.name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{sup.id}</div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-zinc-300">
                              <UserSquare2 size={16} className="text-zinc-500" />
                              {sup.contactPerson}
                            </div>
                          </td>
                          <td className="p-4 space-y-1">
                            <div className="flex items-center gap-2 text-zinc-400 text-xs">
                              <Mail size={14} /> {sup.email}
                            </div>
                            <div className="flex items-center gap-2 text-zinc-400 text-xs">
                              <Phone size={14} /> {sup.phone}
                            </div>
                          </td>
                          <td className="p-4 text-zinc-400">
                            <div className="flex items-center gap-2 text-xs">
                              <MapPin size={14} className="flex-shrink-0" /> <span className="truncate max-w-[200px]">{sup.address}</span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                             <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${productCount > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-black/40 text-zinc-500'}`}>
                               {productCount} Linked
                             </span>
                          </td>
                          <td className="p-4 text-right">
                             <div className="flex items-center justify-end gap-2">
                               <button 
                                 onClick={() => openEditSupplier(sup)}
                                 className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors" 
                                 title="Edit"
                               >
                                 <Pencil size={16} />
                               </button>
                               <button 
                                 onClick={() => handleDeleteSupplier(sup.id, sup.name)}
                                 className="p-2 hover:bg-rose-500/10 rounded-lg text-zinc-400 hover:text-rose-400 transition-colors" 
                                 title="Delete"
                               >
                                 <Trash2 size={16} />
                               </button>
                             </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                       <td colSpan={6} className="p-16 text-center text-zinc-500">
                         <div className="flex flex-col items-center justify-center gap-4">
                           <Building2 size={48} strokeWidth={1} className="opacity-20" />
                           <p>No suppliers found matching your search.</p>
                           <button onClick={openAddSupplier} className="text-amber-500 hover:underline text-sm font-medium">Add a new supplier</button>
                         </div>
                       </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Notification for SKU Captured / Success */}
      {scanSuccess && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white/20 p-1 rounded-full"><Check size={16} strokeWidth={3} /></div>
          <span className="font-medium text-sm">
             {scanSuccess}
          </span>
        </div>
      )}

      {/* Error Toast */}
      {generalError && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-rose-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white/20 p-1 rounded-full"><AlertCircle size={16} strokeWidth={3} /></div>
          <span className="font-medium text-sm">
             {generalError}
          </span>
        </div>
      )}
    </div>
  );
};
