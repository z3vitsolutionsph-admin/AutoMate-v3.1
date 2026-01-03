import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Package, Search, Plus, Sparkles, AlertCircle, ScanBarcode, X, Loader2, 
  Check, Edit3, Trash2, Filter, ChevronDown, CheckSquare, Square, 
  Layers, Save, Wand2, Info, ArrowUpRight, ShieldAlert, MoreHorizontal,
  Building2, Tag, Box, Upload, Link, Image as ImageIcon, Trash, Zap,
  Type as FontType, ArrowRight, Globe, FilterX, RefreshCw
} from 'lucide-react';
import { Product, Supplier, Transaction, UserRole } from '../types';
import { formatCurrency } from '../constants';
import { enhanceProductDetails, generateProductImage, searchProductImage } from '../services/geminiService';

// Safely access window for AI Studio helpers
const aistudio = (window as any).aistudio;

interface InventoryProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: string[];
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  transactions: Transaction[];
  role?: UserRole;
}

const ProductThumbnail: React.FC<{ src?: string, alt: string, size?: string }> = ({ src, alt, size = "w-12 h-12" }) => {
  const [hasError, setHasError] = useState(false);
  useEffect(() => { setHasError(false); }, [src]);

  if (!src || hasError) return (
    <div className={`${size} rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner group-hover:border-indigo-200 transition-colors`}>
      <Package size={20} className="text-slate-400 group-hover:text-indigo-300 transition-colors" />
    </div>
  );

  return (
    <div className={`${size} rounded-xl overflow-hidden border border-slate-200 shadow-sm relative group-hover:border-indigo-300 transition-colors`}>
      <img 
        src={src} 
        alt={alt} 
        className="w-full h-full object-cover" 
        onError={() => setHasError(true)} 
      />
    </div>
  );
};

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  product: Product | null;
  categories: string[];
  suppliers: Supplier[];
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, product, categories, suppliers }) => {
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [descriptionVariations, setDescriptionVariations] = useState<string[]>([]);
  const [showVariations, setShowVariations] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewError, setPreviewError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const DESC_LIMIT = 500;

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setFormData({ ...product });
      } else {
        setFormData({
          name: '',
          sku: `SKU-${Math.floor(10000 + Math.random() * 90000)}`,
          category: categories[0] || 'General',
          price: 0,
          stock: 0,
          description: '',
          supplier: suppliers[0]?.name || '',
          imageUrl: ''
        });
      }
      setErrors({});
      setPreviewError(false);
      setDescriptionVariations([]);
      setShowVariations(false);
    }
  }, [product, isOpen, categories, suppliers]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) newErrors.name = "Asset name required";
    if (!formData.sku?.trim()) newErrors.sku = "SKU identity required";
    if ((formData.price || 0) <= 0) newErrors.price = "Valid price required";
    if ((formData.stock || 0) < 0) newErrors.stock = "Stock cannot be negative";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEnhance = async () => {
    if (!formData.name) {
      setErrors(prev => ({ ...prev, name: "Name is needed for AI context" }));
      return;
    }
    setIsEnhancing(true);
    try {
      const enhanced = await enhanceProductDetails(formData.name);
      setFormData(prev => ({ ...prev, category: enhanced.category || prev.category }));
      setDescriptionVariations(enhanced.descriptions || []);
      setShowVariations(true);
      setErrors(prev => ({ ...prev, name: "" }));
    } catch (err) {
      setErrors(prev => ({ ...prev, name: "AI node temporarily unavailable" }));
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleAiImageAction = async (mode: 'generate' | 'search') => {
    const context = formData.description || formData.name;
    if (!context || context.length < 3) {
      setErrors(prev => ({ ...prev, imageUrl: "Detailed context required for AI imaging." }));
      return;
    }
    setIsGeneratingImage(true);
    try {
      let base64Image = '';
      if (mode === 'search') {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) await aistudio.openSelectKey();
        base64Image = await searchProductImage(context);
      } else {
        base64Image = await generateProductImage(context);
      }
      setFormData(prev => ({ ...prev, imageUrl: base64Image }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, imageUrl: err.message || "Visual retrieval failed." }));
    } finally {
      setIsGeneratingImage(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white/95 backdrop-blur-2xl border border-white/40 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
              {product ? <Edit3 size={24} /> : <Plus size={24} />}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{product ? 'Update Registry' : 'Enroll New Asset'}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Inventory Management Protocol</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-100 rounded-xl border border-slate-200">
            <X size={20} />
          </button>
        </div>
        <form className="p-8 space-y-6" onSubmit={(e) => { e.preventDefault(); if (validate()) onSave(formData as Product); }}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Designation</label>
                <div className="flex gap-2">
                  <input 
                    value={formData.name || ''} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                    placeholder="e.g. Arabica Coffee Blend"
                  />
                  <button type="button" onClick={handleEnhance} disabled={isEnhancing || !formData.name} className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 hover:bg-indigo-100 transition-all disabled:opacity-30"><Sparkles size={18} /></button>
                </div>
                {errors.name && <span className="text-[10px] text-rose-500 font-bold">{errors.name}</span>}
              </div>
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operational Summary</label>
                <textarea 
                  value={formData.description || ''}
                  maxLength={DESC_LIMIT}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-4 focus:ring-indigo-50 min-h-[160px] resize-none"
                />
              </div>
            </div>
            <div className="lg:col-span-5 space-y-6">
              <div className="aspect-square rounded-[3rem] bg-slate-50 border-2 border-slate-200 flex items-center justify-center overflow-hidden relative group">
                {isGeneratingImage ? <Loader2 className="animate-spin text-indigo-600" size={48} /> : (formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" /> : <ImageIcon size={48} className="text-slate-200" />)}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button type="button" onClick={() => handleAiImageAction('search')} className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg"><Globe size={18}/></button>
                  <button type="button" onClick={() => handleAiImageAction('generate')} className="bg-indigo-50 text-indigo-600 p-3 rounded-xl border border-indigo-100"><Zap size={18}/></button>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-slate-400 font-bold hover:text-slate-900 bg-slate-50 rounded-2xl">Cancel</button>
            <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all">Enroll Asset</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Inventory: React.FC<InventoryProps> = ({ products, setProducts, categories, suppliers, transactions, role }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'suppliers'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterSupplier, setFilterSupplier] = useState('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Neural Auto-Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  // Logic: Periodically simulate a stock sync "handshake"
  useEffect(() => {
    const syncInterval = setInterval(() => {
      setIsSyncing(true);
      // Logic: Simulate background sync visual pulse
      setTimeout(() => {
        setIsSyncing(false);
        setLastSyncTime(new Date());
      }, 1500);
    }, 45000); // 45s cycle

    return () => clearInterval(syncInterval);
  }, []);

  // Category counts for dynamic sieve
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = { All: products.length };
    categories.forEach(cat => {
      stats[cat] = products.filter(p => p.category === cat).length;
    });
    return stats;
  }, [products, categories]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
      const matchesSupplier = filterSupplier === 'All' || p.supplier === filterSupplier;
      return matchesSearch && matchesCategory && matchesSupplier;
    });
  }, [products, searchTerm, filterCategory, filterSupplier]);

  const clearFilters = () => {
    setFilterCategory('All');
    setFilterSupplier('All');
    setSearchTerm('');
  };

  const forceSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime(new Date());
    }, 1200);
  };

  const isEmployee = role === UserRole.EMPLOYEE;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
           <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm w-fit mb-4">
              <button onClick={() => setActiveTab('products')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-indigo-600'}`}>Asset Registry</button>
              {!isEmployee && (
                <button onClick={() => setActiveTab('suppliers')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'suppliers' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-indigo-600'}`}>Supplier Hub</button>
              )}
           </div>
           <div className="flex items-center gap-4">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Executive Inventory</h2>
              {/* Neural Auto-Sync Badge */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-700 ${isSyncing ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-100 animate-pulse' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                {isSyncing ? <RefreshCw size={12} className="animate-spin" /> : <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
                {isSyncing ? 'Node Handshake...' : 'Registry Synchronized'}
              </div>
           </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600" size={18} />
            <input placeholder="Query SKU or Name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none" />
          </div>
          <button onClick={forceSync} className="p-3.5 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-indigo-600 hover:border-indigo-100 transition-all active:scale-95 shadow-sm">
            <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          {!isEmployee && (
            <button onClick={() => setIsProductModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center gap-2 transition-all uppercase tracking-widest text-sm">
              <Plus size={18} /> Enroll Asset
            </button>
          )}
        </div>
      </div>

      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* World-Class Filter Bar */}
          <div className="bg-white/50 border border-slate-200 p-6 rounded-[2rem] backdrop-blur-sm space-y-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-6">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Filter size={14} /></div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sieve Protocol:</span>
               </div>
               
               {/* Quick Pills */}
               <div className="flex flex-wrap gap-2">
                 {['All', ...categories.slice(0, 4)].map(cat => {
                   const isActive = filterCategory === cat;
                   return (
                     <button 
                       key={cat} 
                       onClick={() => setFilterCategory(cat)}
                       className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
                     >
                       {cat}
                       <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                         {categoryStats[cat] || 0}
                       </span>
                     </button>
                   );
                 })}
                 
                 {/* Full Dropdown for extra categories */}
                 {categories.length > 4 && (
                    <div className="relative">
                       <select 
                         value={categories.includes(filterCategory) && categories.indexOf(filterCategory) >= 4 ? filterCategory : 'More'}
                         onChange={e => setFilterCategory(e.target.value)}
                         className={`appearance-none bg-white border border-slate-200 rounded-full px-5 py-2 text-[10px] font-black uppercase tracking-widest outline-none pr-10 cursor-pointer transition-all hover:border-indigo-300 ${categories.indexOf(filterCategory) >= 4 ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-500'}`}
                       >
                         <option value="More" disabled>More</option>
                         {categories.slice(4).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                       </select>
                       <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                    </div>
                 )}
               </div>

               {(filterCategory !== 'All' || searchTerm) && (
                 <button onClick={clearFilters} className="ml-auto text-[10px] font-black uppercase text-rose-500 tracking-widest flex items-center gap-2 px-4 py-2 hover:bg-rose-50 rounded-xl transition-all">
                   <FilterX size={14} /> Clear Protocol
                 </button>
               )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
            {filteredProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <tr><th className="p-6">Asset</th><th className="p-6">Classification</th><th className="p-6 text-right">Value</th><th className="p-6 text-center">Depth</th>{!isEmployee && <th className="p-6 text-right pr-10">Protocol</th>}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="p-6 flex items-center gap-4">
                          <ProductThumbnail src={p.imageUrl} alt={p.name} />
                          <div><h4 className="font-bold text-slate-900 text-sm">{p.name}</h4><p className="text-[10px] font-mono text-slate-400">{p.sku}</p></div>
                        </td>
                        <td className="p-6"><span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200">{p.category}</span></td>
                        <td className="p-6 text-right font-bold text-slate-900">{formatCurrency(p.price)}</td>
                        <td className="p-6 text-center">
                          <span className={`text-sm font-black px-3 py-1 rounded-lg ${p.stock < 10 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'text-slate-600'}`}>
                            {p.stock}
                          </span>
                        </td>
                        {!isEmployee && (
                          <td className="p-6 text-right pr-10">
                            <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="p-2.5 text-slate-300 hover:text-indigo-600 transition-all"><Edit3 size={18} /></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-20 text-center space-y-4 animate-in fade-in duration-700">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100 text-slate-200"><Box size={40} /></div>
                <h3 className="text-xl font-black text-slate-900">Zero Assets Found</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-xs mx-auto">The current sieve parameters yielded no registry entries. Adjust your filters or reset protocol.</p>
                <button onClick={clearFilters} className="mt-4 px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all">Reset All Filters</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
          {suppliers.map(sup => (
            <div key={sup.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Building2 size={24} /></div>
                <button className="text-slate-300 hover:text-indigo-600 transition-colors"><MoreHorizontal size={20}/></button>
              </div>
              <h4 className="text-lg font-black text-slate-900">{sup.name}</h4>
              <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mt-1">{sup.contactPerson}</p>
              <div className="mt-6 pt-6 border-t border-slate-50 space-y-3">
                <p className="text-xs text-slate-500 flex items-center gap-2"><Globe size={14}/> {sup.email}</p>
                <p className="text-xs text-slate-500 flex items-center gap-2"><ArrowRight size={14}/> {sup.phone}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductModal 
        isOpen={isProductModalOpen}
        onClose={() => { setIsProductModalOpen(false); setEditingProduct(null); }}
        onSave={(p) => { 
          if (editingProduct) setProducts(prev => prev.map(item => item.id === editingProduct.id ? { ...p, id: editingProduct.id } : item));
          else setProducts(prev => [{ ...p, id: `PRD-${Date.now()}` }, ...prev]);
          setIsProductModalOpen(false);
        }}
        product={editingProduct}
        categories={categories}
        suppliers={suppliers}
      />
    </div>
  );
};