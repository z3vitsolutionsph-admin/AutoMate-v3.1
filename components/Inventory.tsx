import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Package, Search, Plus, Sparkles, AlertCircle, ScanBarcode, X, Loader2, 
  Check, Edit3, Trash2, Filter, ChevronDown, CheckSquare, Square, 
  Layers, Save, Wand2, Info, ArrowUpRight, ShieldAlert, MoreHorizontal,
  Building2, Tag, Box, Upload, Link, Image as ImageIcon, Trash, Zap,
  Type as FontType, ArrowRight, Globe, FilterX, RefreshCw, Phone, MapPin, Mail, User, Printer, Download
} from 'lucide-react';
import { Product, Supplier, Transaction, UserRole } from '../types';
import { formatCurrency } from '../constants';
import { enhanceProductDetails, generateProductImage, searchProductImage } from '../services/geminiService';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';

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
    <div className={`${size} rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner group-hover:border-indigo-200 transition-colors shrink-0`}>
      <Package size={20} className="text-slate-400 group-hover:text-indigo-300 transition-colors" />
    </div>
  );

  return (
    <div className={`${size} rounded-xl overflow-hidden border border-slate-200 shadow-sm relative group-hover:border-indigo-300 transition-colors shrink-0`}>
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
  const [imageInputMode, setImageInputMode] = useState<'url' | 'upload'>('url');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const DESC_LIMIT = 500;

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setFormData({ ...product });
        setPreviewError(false);
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
        setPreviewError(false);
      }
      setErrors({});
      setDescriptionVariations([]);
      setShowVariations(false);
      setImageInputMode('url');
    }
  }, [product, isOpen, categories, suppliers]);

  useEffect(() => {
    setPreviewError(false);
  }, [formData.imageUrl]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) newErrors.name = "Asset name required";
    if (!formData.sku?.trim()) newErrors.sku = "SKU identity required";
    if ((formData.price || 0) <= 0) newErrors.price = "Valid price required";
    if ((formData.stock || 0) < 0) newErrors.stock = "Stock cannot be negative";
    
    // Validate URL if present
    if (formData.imageUrl && !formData.imageUrl.startsWith('data:') && !formData.imageUrl.startsWith('blob:')) {
      try {
        new URL(formData.imageUrl);
      } catch (_) {
        newErrors.imageUrl = "Invalid URL format";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSave(formData as Product);
    }
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
      
      if (enhanced.descriptions && enhanced.descriptions.length > 0) {
        setDescriptionVariations(enhanced.descriptions);
        setShowVariations(true);
      } else {
         // Fallback if no array returned
         setFormData(prev => ({ ...prev, description: "AI could not generate variations." }));
      }
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
    setErrors(prev => ({ ...prev, imageUrl: "" }));
    
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
      setImageInputMode('url'); // Switch to URL/View mode to show the result path (data url)
    } catch (err: any) {
      console.error(err);
      setErrors(prev => ({ ...prev, imageUrl: err.message || "Visual retrieval failed. Please try again." }));
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, imageUrl: "Image too large (Max 5MB)" }));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
        setErrors(prev => ({ ...prev, imageUrl: "" }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative w-full h-[95vh] sm:h-auto sm:max-h-[90vh] max-w-5xl bg-white/95 backdrop-blur-2xl border-t sm:border border-white/40 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="shrink-0 p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-white/50">
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col-reverse lg:grid lg:grid-cols-12 gap-8">
              
              {/* Fields Section */}
              <div className="lg:col-span-7 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Designation</label>
                  <div className="flex gap-2">
                    <input 
                      value={formData.name || ''} 
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                      placeholder="e.g. Arabica Coffee Blend"
                    />
                    <button type="button" onClick={handleEnhance} disabled={isEnhancing || !formData.name} className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 hover:bg-indigo-100 transition-all disabled:opacity-30"><Sparkles size={18} /></button>
                  </div>
                  {errors.name && <span className="text-[10px] text-rose-500 font-bold">{errors.name}</span>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fiscal Value</label>
                      <div className="relative">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
                          <input 
                              type="number" 
                              step="0.01"
                              value={formData.price || ''} 
                              onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-5 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                              placeholder="0.00"
                          />
                      </div>
                       {errors.price && <span className="text-[10px] text-rose-500 font-bold">{errors.price}</span>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stock Depth</label>
                      <input 
                          type="number" 
                          value={formData.stock || ''} 
                          onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                          placeholder="0"
                      />
                       {errors.stock && <span className="text-[10px] text-rose-500 font-bold">{errors.stock}</span>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category Classification</label>
                      <div className="relative">
                          <select 
                              value={formData.category || ''} 
                              onChange={e => setFormData({ ...formData, category: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 transition-all appearance-none cursor-pointer"
                          >
                              {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier Node</label>
                      <div className="relative">
                          <select 
                              value={formData.supplier || ''} 
                              onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 transition-all appearance-none cursor-pointer"
                          >
                              <option value="">Select Partner...</option>
                              {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                          </select>
                          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                </div>

                {/* Enhanced Description Section */}
                <div className="space-y-2 relative">
                  <div className="flex justify-between items-center ml-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Summary</label>
                     {showVariations && <button type="button" onClick={() => setShowVariations(false)} className="text-[10px] font-bold text-slate-400 hover:text-indigo-600">Close Variations</button>}
                  </div>
                  
                  {showVariations ? (
                    <div className="grid gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 max-h-[160px] overflow-y-auto custom-scrollbar">
                       <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Select an AI Variation:</p>
                       {descriptionVariations.map((desc, idx) => (
                         <button
                           key={idx}
                           type="button"
                           onClick={() => { setFormData(prev => ({ ...prev, description: desc })); setShowVariations(false); }}
                           className="text-left text-xs text-slate-600 p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 hover:shadow-sm transition-all"
                         >
                           {desc}
                         </button>
                       ))}
                    </div>
                  ) : (
                    <div className="relative">
                      <textarea 
                        value={formData.description || ''}
                        maxLength={DESC_LIMIT}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-4 focus:ring-indigo-50 min-h-[120px] resize-none font-medium text-slate-600"
                        placeholder="Detailed product specifications..."
                      />
                      <div className="absolute bottom-3 right-4 text-[9px] font-bold text-slate-400 tabular-nums">
                        {(formData.description || '').length} / {DESC_LIMIT}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Image Section */}
              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Visual Asset</label>
                  
                  {/* Image Preview Area */}
                  <div className="aspect-square sm:aspect-[4/3] lg:aspect-square rounded-[2rem] sm:rounded-[3rem] bg-slate-50 border-2 border-slate-200 flex items-center justify-center overflow-hidden relative group shadow-inner">
                    {isGeneratingImage ? 
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-indigo-600" size={48} />
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest animate-pulse">Synthesizing...</span>
                      </div> : 
                      (formData.imageUrl && !previewError ? 
                        <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" onError={() => setPreviewError(true)} /> : 
                        <div className="flex flex-col items-center gap-2 text-slate-300">
                          <ImageIcon size={48} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{previewError ? 'Invalid Source' : 'No Asset'}</span>
                        </div>
                      )
                    }
                    
                    {/* Floating Action Bar */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                      <button type="button" onClick={() => handleAiImageAction('search')} className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl shadow-lg transition-colors" title="AI Search"><Globe size={18}/></button>
                      <button type="button" onClick={() => handleAiImageAction('generate')} className="bg-white text-indigo-600 hover:text-indigo-700 p-3 rounded-xl border border-indigo-100 shadow-lg transition-colors" title="AI Generate"><Zap size={18}/></button>
                    </div>
                  </div>
                </div>

                {/* Image Input Controls */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                   <div className="flex gap-2 p-1 bg-white border border-slate-100 rounded-xl">
                      <button type="button" onClick={() => setImageInputMode('url')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${imageInputMode === 'url' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>URL Link</button>
                      <button type="button" onClick={() => setImageInputMode('upload')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${imageInputMode === 'upload' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Upload</button>
                   </div>

                   {imageInputMode === 'url' ? (
                     <div className="relative">
                       <Link size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input 
                         value={formData.imageUrl || ''} 
                         onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                         className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                         placeholder="https://"
                       />
                     </div>
                   ) : (
                     <div>
                       <input 
                         type="file" 
                         ref={fileInputRef} 
                         className="hidden" 
                         accept="image/*" 
                         onChange={handleFileUpload}
                       />
                       <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()} 
                          className="w-full bg-white border border-dashed border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-400 rounded-xl py-8 flex flex-col items-center justify-center gap-2 transition-all group"
                       >
                          <Upload size={24} className="group-hover:scale-110 transition-transform"/>
                          <span className="text-[10px] font-black uppercase tracking-widest">Select Local File</span>
                       </button>
                     </div>
                   )}
                   {errors.imageUrl && <div className="flex items-center gap-2 text-[10px] text-rose-500 font-bold px-2"><AlertCircle size={12}/> {errors.imageUrl}</div>}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer (Actions) */}
        <div className="shrink-0 p-6 sm:p-8 border-t border-slate-100 bg-slate-50/50 backdrop-blur-xl flex flex-col sm:flex-row gap-4">
          <button type="button" onClick={onClose} className="flex-1 py-4 text-slate-400 font-bold hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl transition-all">Cancel</button>
          <button type="button" onClick={handleSubmit} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95">
              {product ? 'Update Registry' : 'Enroll Asset'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: Supplier) => void;
  supplier: Supplier | null;
}

const SupplierModal: React.FC<SupplierModalProps> = ({ isOpen, onClose, onSave, supplier }) => {
  const [formData, setFormData] = useState<Partial<Supplier>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        setFormData({ ...supplier });
      } else {
        setFormData({ name: '', contactPerson: '', email: '', phone: '', address: '' });
      }
      setErrors({});
    }
  }, [supplier, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) newErrors.name = "Company name required";
    if (!formData.contactPerson?.trim()) newErrors.contactPerson = "Contact person required";
    if (!formData.email?.trim()) newErrors.email = "Email required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSave(formData as Supplier);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative w-full h-[85vh] sm:h-auto sm:max-h-[90vh] max-w-lg bg-white/95 backdrop-blur-2xl border-t sm:border border-white/40 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="shrink-0 p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-white/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
              {supplier ? <Edit3 size={24} /> : <Building2 size={24} />}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{supplier ? 'Update Partner' : 'Register Vendor'}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Supply Chain Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-100 rounded-xl border border-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
             <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
               <div className="relative">
                 <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                 <input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 transition-all" placeholder="Legal Entity Name" />
               </div>
               {errors.name && <span className="text-[10px] text-rose-500 font-bold">{errors.name}</span>}
             </div>

             <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Key Personnel</label>
               <div className="relative">
                 <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                 <input value={formData.contactPerson || ''} onChange={e => setFormData({...formData, contactPerson: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 transition-all" placeholder="Contact Person" />
               </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                 <div className="relative">
                   <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                   <input value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 transition-all" placeholder="business@email.com" />
                 </div>
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                 <div className="relative">
                   <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                   <input value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 transition-all" placeholder="+63 900 000 0000" />
                 </div>
               </div>
             </div>

             <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Office Address</label>
               <div className="relative">
                 <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                 <input value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 transition-all" placeholder="Full Business Address" />
               </div>
             </div>
          </form>
        </div>

        {/* Footer (Actions) */}
        <div className="shrink-0 p-6 sm:p-8 border-t border-slate-100 bg-slate-50/50 backdrop-blur-xl flex flex-col sm:flex-row gap-4">
           <button type="button" onClick={onClose} className="flex-1 py-4 text-slate-400 font-bold hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl transition-all">Cancel</button>
           <button type="button" onClick={handleSubmit} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95">Save Vendor</button>
        </div>
      </div>
    </div>
  );
};

export const Inventory: React.FC<InventoryProps> = ({ products, setProducts, categories, suppliers, setSuppliers, transactions, role }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'suppliers'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterSupplier, setFilterSupplier] = useState('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Supplier Modal State
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  // Delete Confirmation State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Label Print State
  const [labelProduct, setLabelProduct] = useState<Product | null>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);

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

  // Barcode Generation Effect
  useEffect(() => {
    if (labelProduct) {
      // Preview Barcode
      if (barcodeRef.current) {
        try {
          JsBarcode(barcodeRef.current, labelProduct.sku, {
            format: "CODE128",
            width: 2.5,
            height: 60,
            displayValue: false,
            lineColor: "#0f172a",
            margin: 10,
            background: "transparent"
          });
        } catch (e) {
          console.error("Preview barcode generation failed", e);
        }
      }
    }
  }, [labelProduct]);

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

  const handleDownloadBarcode = () => {
    if (!labelProduct) return;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [50, 30] // 50mm x 30mm sticker size
    });

    // Add Product Name (Top)
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(labelProduct.name.substring(0, 20).toUpperCase(), 25, 5, { align: 'center' });

    // Generate Barcode Image using Canvas
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, labelProduct.sku, {
      format: "CODE128",
      displayValue: false,
      width: 2,
      height: 40,
      margin: 0
    });
    const imgData = canvas.toDataURL("image/png");

    // Add Barcode Image to PDF
    doc.addImage(imgData, 'PNG', 5, 7, 40, 15);

    // Add SKU Text
    doc.setFontSize(7);
    doc.setFont("courier", "bold");
    doc.text(labelProduct.sku, 25, 24, { align: 'center' });

    // Add Price
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(labelProduct.price), 25, 28, { align: 'center' });

    doc.save(`${labelProduct.sku}-barcode.pdf`);
  };

  const handleDeleteProduct = () => {
    if (productToDelete) {
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      setProductToDelete(null);
    }
  };

  const isEmployee = role === UserRole.EMPLOYEE;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 print:hidden">
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
            <button 
              onClick={() => activeTab === 'products' ? setIsProductModalOpen(true) : setIsSupplierModalOpen(true)} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center gap-2 transition-all uppercase tracking-widest text-sm"
            >
              <Plus size={18} /> {activeTab === 'products' ? 'Enroll Asset' : 'Register Vendor'}
            </button>
          )}
        </div>
      </div>

      {activeTab === 'products' && (
        <div className="space-y-6 print:hidden">
          {/* World-Class Filter Bar */}
          <div className="bg-white/50 border border-slate-200 p-5 rounded-[2rem] backdrop-blur-sm space-y-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
               <div className="flex items-center gap-3 shrink-0">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Filter size={14} /></div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sieve Protocol:</span>
               </div>

               {/* Supplier Dropdown */}
               <div className="relative shrink-0 group">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors pointer-events-none" />
                  <select 
                    value={filterSupplier}
                    onChange={(e) => setFilterSupplier(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-xl pl-9 pr-8 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer shadow-sm w-full md:w-auto"
                  >
                    <option value="All">All Vendors</option>
                    {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
               </div>
               
               {/* Quick Pills - Horizontal Scroll for responsiveness */}
               <div className="flex-1 min-w-0 overflow-x-auto pb-2 -mb-2 md:pb-0 md:mb-0 no-scrollbar">
                 <div className="flex gap-2">
                   {['All', ...categories].map(cat => {
                     const isActive = filterCategory === cat;
                     return (
                       <button 
                         key={cat} 
                         onClick={() => setFilterCategory(cat)}
                         className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 shrink-0 ${isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
                       >
                         {cat}
                         <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                           {categoryStats[cat] || 0}
                         </span>
                       </button>
                     );
                   })}
                 </div>
               </div>

               {(filterCategory !== 'All' || filterSupplier !== 'All' || searchTerm) && (
                 <button onClick={clearFilters} className="shrink-0 ml-auto md:ml-0 text-[10px] font-black uppercase text-rose-500 tracking-widest flex items-center gap-2 px-4 py-2 hover:bg-rose-50 rounded-xl transition-all">
                   <FilterX size={14} /> Clear
                 </button>
               )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
            {filteredProducts.length > 0 ? (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="p-6 whitespace-nowrap bg-slate-50">Asset</th>
                      <th className="p-6 whitespace-nowrap bg-slate-50 w-1/4">Classification</th>
                      <th className="p-6 text-right whitespace-nowrap bg-slate-50">Value</th>
                      <th className="p-6 text-center whitespace-nowrap bg-slate-50">Depth</th>
                      {!isEmployee && <th className="p-6 text-right pr-10 whitespace-nowrap bg-slate-50">Protocol</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="p-6">
                          <div className="flex items-center gap-4 min-w-[200px]">
                            <ProductThumbnail src={p.imageUrl} alt={p.name} />
                            <div className="min-w-0">
                                <h4 className="font-bold text-slate-900 text-sm truncate max-w-[180px]">{p.name}</h4>
                                <p className="text-[10px] font-mono text-slate-400">{p.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-6 align-middle">
                            <div className="max-w-[220px]">
                                <span className="inline-block bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-slate-200 truncate max-w-full" title={p.category}>
                                    {p.category}
                                </span>
                            </div>
                        </td>
                        <td className="p-6 text-right font-bold text-slate-900 whitespace-nowrap">{formatCurrency(p.price)}</td>
                        <td className="p-6 text-center">
                          <span className={`inline-block text-sm font-black px-3 py-1 rounded-lg ${p.stock < 10 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'text-slate-600'}`}>
                            {p.stock}
                          </span>
                        </td>
                        {!isEmployee && (
                          <td className="p-6 text-right pr-10 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => setLabelProduct(p)} title="Print Label" className="p-2.5 text-slate-300 hover:text-emerald-600 transition-all bg-transparent hover:bg-emerald-50 rounded-xl"><ScanBarcode size={18} /></button>
                              <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} title="Edit" className="p-2.5 text-slate-300 hover:text-indigo-600 transition-all bg-transparent hover:bg-indigo-50 rounded-xl"><Edit3 size={18} /></button>
                              <button onClick={() => setProductToDelete(p)} title="Delete" className="p-2.5 text-slate-300 hover:text-rose-600 transition-all bg-transparent hover:bg-rose-50 rounded-xl"><Trash2 size={18} /></button>
                            </div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in print:hidden">
          {suppliers.map(sup => (
            <div key={sup.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Building2 size={24} /></div>
                <button onClick={() => { setEditingSupplier(sup); setIsSupplierModalOpen(true); }} className="p-2 text-slate-300 hover:text-indigo-600 bg-white border border-transparent hover:border-slate-200 rounded-xl transition-all"><Edit3 size={18}/></button>
              </div>
              <h4 className="text-lg font-black text-slate-900">{sup.name}</h4>
              <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mt-1">{sup.contactPerson}</p>
              <div className="mt-6 pt-6 border-t border-slate-50 space-y-3">
                <p className="text-xs text-slate-500 flex items-center gap-2"><Mail size={14}/> {sup.email}</p>
                <p className="text-xs text-slate-500 flex items-center gap-2"><Phone size={14}/> {sup.phone}</p>
                <p className="text-xs text-slate-500 flex items-center gap-2"><MapPin size={14}/> {sup.address}</p>
              </div>
            </div>
          ))}
          {suppliers.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100 text-slate-300"><Building2 size={40} /></div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No vendors registered in the supply chain.</p>
              <button onClick={() => setIsSupplierModalOpen(true)} className="mt-2 text-indigo-600 text-xs font-black uppercase tracking-widest hover:underline">Register First Vendor</button>
            </div>
          )}
        </div>
      )}

      {/* Barcode Label Modal (Preview) */}
      {labelProduct && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 print:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setLabelProduct(null)} />
          <div className="relative bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-sm animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-black text-slate-900 tracking-tight">Product Label</h3>
               <button onClick={() => setLabelProduct(null)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-all border border-slate-100"><X size={20} /></button>
             </div>
             
             {/* Visual Preview */}
             <div className="bg-slate-50/50 border-2 border-indigo-300 border-dashed rounded-3xl p-8 flex flex-col items-center gap-4 mb-8 select-none relative group">
                <div className="absolute top-3 right-3 text-indigo-200"><ScanBarcode size={24} opacity={0.5}/></div>
                
                <div className="text-center space-y-1">
                  <h4 className="font-black text-slate-900 text-sm leading-tight uppercase max-w-[200px] break-words">{labelProduct.name}</h4>
                  <p className="text-[10px] font-mono font-bold text-slate-400 tracking-widest">{labelProduct.sku}</p>
                </div>

                <div className="w-full flex justify-center py-2 bg-white rounded-xl shadow-sm border border-slate-100">
                   <svg ref={barcodeRef} className="w-full max-h-[80px]"></svg>
                </div>
                
                <p className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(labelProduct.price)}</p>
             </div>

             <div className="grid grid-cols-2 gap-4">
               <button onClick={() => setLabelProduct(null)} className="py-4 text-slate-500 font-bold bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-xs uppercase tracking-wider">Dismiss</button>
               <button onClick={handleDownloadBarcode} className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wider"><Download size={18} /> Download PDF</button>
             </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 sm:p-6 print:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setProductToDelete(null)} />
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-sm animate-in zoom-in-95 duration-300 border border-slate-200">
             <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 shadow-xl shadow-rose-100 border border-rose-100">
                   <AlertCircle size={32} />
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">Delete Asset?</h3>
                   <p className="text-sm font-medium text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                     Are you sure you want to remove <span className="text-slate-900 font-bold">"{productToDelete.name}"</span>? This action cannot be undone.
                   </p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full pt-4">
                   <button onClick={() => setProductToDelete(null)} className="py-4 text-slate-500 font-bold bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-xs uppercase tracking-wider">Cancel</button>
                   <button onClick={handleDeleteProduct} className="py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl shadow-xl shadow-rose-200 transition-all text-xs uppercase tracking-wider">Confirm Delete</button>
                </div>
             </div>
          </div>
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

      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => { setIsSupplierModalOpen(false); setEditingSupplier(null); }}
        onSave={(s) => {
          if (editingSupplier) setSuppliers(prev => prev.map(item => item.id === editingSupplier.id ? { ...s, id: editingSupplier.id } : item));
          else setSuppliers(prev => [{ ...s, id: `SUP-${Date.now()}` }, ...prev]);
          setIsSupplierModalOpen(false);
        }}
        supplier={editingSupplier}
      />
    </div>
  );
};