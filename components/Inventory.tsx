
import React, { useState, useRef, useEffect } from 'react';
import { Package, Search, Plus, Sparkles, AlertCircle, ScanBarcode, X, Camera, Loader2, Truck, Check, Wand2, Building2, Phone, Mail, MapPin, UserSquare2, Pencil, Trash2 } from 'lucide-react';
import { Product, Supplier } from '../types';
import { formatCurrency } from '../constants';
import { enhanceProductDetails } from '../services/geminiService';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface InventoryProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: string[];
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
}

// Utility: URL Validator
const isValidUrl = (urlString: string): boolean => {
  try {
    return Boolean(new URL(urlString));
  } catch (e) {
    return false;
  }
};

export const Inventory: React.FC<InventoryProps> = ({ products, setProducts, categories, suppliers, setSuppliers }) => {
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

  // Supplier State (Add/Edit)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  
  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // AI & Scanning State
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<any>(null);

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
    if (!newPrice || isNaN(priceValue) || priceValue <= 0) {
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
    
    // Future: Image URL validation placeholder
    // if (imageUrl && !isValidUrl(imageUrl)) newErrors.image = 'Invalid URL format';

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
      sku: newSku
    };
    setProducts([...products, newProduct]);
    setIsAdding(false);
    setScanSuccess('Product added successfully');
    
    setNewName(''); setNewDesc(''); setNewPrice('');
    setNewStock(''); setNewCategory(''); setNewSku(''); setNewSupplier('');
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
          setGeneralError(`Cannot delete "${name}". It is linked to ${linkedProducts.length} product(s).`);
          return;
      }
      if (window.confirm(`Delete supplier "${name}"?`)) {
          setSuppliers(prev => prev.filter(s => s.id !== id));
          setScanSuccess('Supplier deleted');
      }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInputClass = (error?: string) => `w-full bg-[#09090b] border rounded-xl px-4 py-3 text-white focus:ring-2 outline-none transition-all placeholder-zinc-600 ${
    error ? 'border-rose-500 focus:ring-rose-500' : 'border-[#27272a] focus:ring-amber-500/50 focus:border-amber-500'
  }`;

  return (
    <div className="space-y-6 relative pb-12">
      {/* Scanner Modal */}
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#18181b] border border-[#27272a] rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-[#27272a] flex justify-between items-center bg-[#09090b]">
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
              <button onClick={stopScanning} className="mt-4 bg-[#27272a] hover:bg-[#3f3f46] text-white px-6 py-2 rounded-lg text-sm font-bold">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Header with Tabs */}
      <div className="bg-[#18181b]/80 p-2 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-2 z-20 backdrop-blur-xl border border-[#27272a] shadow-2xl">
        <div className="flex bg-[#09090b] p-1.5 rounded-xl border border-[#27272a] w-full sm:w-auto">
           <button 
             onClick={() => { setActiveTab('products'); setSearchTerm(''); setIsAdding(false); setIsAddingSupplier(false); setErrors({}); }}
             className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'products' ? 'bg-amber-500 text-black shadow-lg shadow-amber-900/20' : 'text-zinc-500 hover:text-zinc-200 hover:bg-[#27272a]'}`}
           >
             <Package size={16} /> Products
           </button>
           <button 
             onClick={() => { setActiveTab('suppliers'); setSearchTerm(''); setIsAdding(false); setIsAddingSupplier(false); setErrors({}); }}
             className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'suppliers' ? 'bg-amber-500 text-black shadow-lg shadow-amber-900/20' : 'text-zinc-500 hover:text-zinc-200 hover:bg-[#27272a]'}`}
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
               className="w-full bg-[#09090b] border border-[#27272a] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all placeholder-zinc-600"
             />
           </div>
           
           {activeTab === 'products' ? (
              <button 
                onClick={() => { setIsAdding(!isAdding); setErrors({}); }}
                className={`w-10 sm:w-auto bg-amber-500 hover:bg-amber-400 text-black p-2.5 sm:px-5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-900/20 ${isAdding ? 'bg-[#27272a] text-white hover:bg-[#3f3f46]' : ''}`}
              >
                {isAdding ? <X size={20} /> : <><Plus size={20} /><span className="hidden sm:inline font-bold text-sm">Add Item</span></>}
              </button>
           ) : (
              <button 
                onClick={() => isAddingSupplier ? setIsAddingSupplier(false) : openAddSupplier()}
                className={`w-10 sm:w-auto bg-amber-500 hover:bg-amber-400 text-black p-2.5 sm:px-5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-900/20 ${isAddingSupplier ? 'bg-[#27272a] text-white hover:bg-[#3f3f46]' : ''}`}
              >
                {isAddingSupplier ? <X size={20} /> : <><Plus size={20} /><span className="hidden sm:inline font-bold text-sm">Add Supplier</span></>}
              </button>
           )}
        </div>
      </div>

      {/* --- PRODUCTS TAB CONTENT --- */}
      {activeTab === 'products' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Add Product Form */}
          {isAdding && (
            <div className="bg-[#18181b] p-6 md:p-8 rounded-3xl mb-6 border border-[#27272a] relative overflow-hidden">
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
                      <button type="button" onClick={startScanning} className="bg-[#27272a] border border-[#3f3f46] hover:bg-[#3f3f46] text-amber-500 px-4 rounded-xl transition-colors">
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
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5 ml-1">Description</label>
                    <textarea 
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none h-28 resize-none placeholder-zinc-600"
                      placeholder="Item details..."
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
                         <option value="" disabled>Select a Supplier</option>
                         {suppliers.map(sup => (
                           <option key={sup.id} value={sup.name}>{sup.name}</option>
                         ))}
                      </select>
                    </div>
                    {errors.supplier && <p className="text-xs text-rose-400 mt-1 ml-1">{errors.supplier}</p>}
                  </div>

                  <div className="bg-[#09090b] p-4 rounded-xl border border-[#27272a]">
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Category *</label>
                    <div className="flex gap-2 flex-col">
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className={getInputClass(errors.category)}
                      >
                        <option value="" disabled>Select Category</option>
                        {categories.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
                        <option value="Uncategorized">Uncategorized</option>
                      </select>
                      {errors.category && <p className="text-xs text-rose-400 ml-1">{errors.category}</p>}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 gap-3">
                    <button 
                      type="button" 
                      onClick={() => { setIsAdding(false); setErrors({}); }}
                      className="px-6 py-3.5 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-400 text-black px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-amber-900/20 hover:scale-[1.02] active:scale-95">
                      Save Product
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Product List Table */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-[#27272a] text-zinc-400 text-xs uppercase font-semibold tracking-wider">
                  <tr>
                    <th className="p-4 border-b border-[#3f3f46]">Product Info</th>
                    <th className="p-4 border-b border-[#3f3f46]">SKU</th>
                    <th className="p-4 border-b border-[#3f3f46]">Category</th>
                    <th className="p-4 border-b border-[#3f3f46]">Supplier</th>
                    <th className="p-4 border-b border-[#3f3f46] text-right">Price</th>
                    <th className="p-4 border-b border-[#3f3f46] text-center">Stock</th>
                    <th className="p-4 border-b border-[#3f3f46] text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a] text-sm">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-[#27272a]/50 transition-colors group">
                        <td className="p-4">
                          <div className="font-bold text-white group-hover:text-amber-500 transition-colors">{product.name}</div>
                          <div className="text-xs text-zinc-500 truncate max-w-[200px] mt-0.5">{product.description || 'No description'}</div>
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-xs bg-[#09090b] text-zinc-400 px-2 py-1 rounded border border-[#27272a]">{product.sku}</span>
                        </td>
                        <td className="p-4">
                          <span className="bg-[#09090b] text-zinc-300 px-2.5 py-1 rounded-full text-xs font-medium border border-[#27272a]">{product.category}</span>
                        </td>
                        <td className="p-4 text-zinc-400 flex items-center gap-2">
                          {product.supplier ? (
                            <>
                              <Truck size={14} /> {product.supplier}
                            </>
                          ) : (
                            <span className="text-zinc-600">-</span>
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
                      <td colSpan={7} className="p-12 text-center text-zinc-500">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Package size={40} strokeWidth={1} className="opacity-50" />
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

      {/* --- SUPPLIERS TAB CONTENT --- */}
      {activeTab === 'suppliers' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Add/Edit Supplier Form */}
          {isAddingSupplier && (
            <div className="bg-[#18181b] p-6 md:p-8 rounded-3xl mb-6 border border-[#27272a] relative overflow-hidden">
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
                      className="px-6 py-3 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors"
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
          <div className="bg-[#18181b] border border-[#27272a] rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-[#27272a] text-zinc-400 text-xs uppercase font-semibold tracking-wider">
                  <tr>
                    <th className="p-4 border-b border-[#3f3f46]">Company Name</th>
                    <th className="p-4 border-b border-[#3f3f46]">Contact Person</th>
                    <th className="p-4 border-b border-[#3f3f46]">Contact Info</th>
                    <th className="p-4 border-b border-[#3f3f46]">Address</th>
                    <th className="p-4 border-b border-[#3f3f46] text-center">Products</th>
                    <th className="p-4 border-b border-[#3f3f46] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a] text-sm">
                  {filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map((sup) => {
                      const productCount = products.filter(p => p.supplier === sup.name).length;
                      return (
                        <tr key={sup.id} className="hover:bg-[#27272a]/50 transition-colors group">
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
                             <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${productCount > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-[#27272a] text-zinc-500'}`}>
                               {productCount} Linked
                             </span>
                          </td>
                          <td className="p-4 text-right">
                             <div className="flex items-center justify-end gap-2">
                               <button 
                                 onClick={() => openEditSupplier(sup)}
                                 className="p-2 hover:bg-[#27272a] rounded-lg text-zinc-400 hover:text-white transition-colors" 
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
                       <td colSpan={6} className="p-12 text-center text-zinc-500">
                         <div className="flex flex-col items-center justify-center gap-3">
                           <Building2 size={40} strokeWidth={1} className="opacity-50" />
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
