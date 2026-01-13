
import React, { useState, useMemo, useEffect } from 'react';
import { Package, Search, Plus, Sparkles, X, Loader2, Edit3, Trash2, Box, ImageIcon, Zap, BrainCircuit, AlertCircle } from 'lucide-react';
import { Product, Supplier, UserRole } from '../types';
import { formatCurrency } from '../constants';
import { enhanceProductDetails, generateProductImage, searchProductImage } from '../services/geminiService';

const aistudio = (window as any).aistudio;

interface InventoryProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: string[];
  suppliers: Supplier[];
  role?: UserRole;
  onSaveProduct?: (p: Product) => Promise<void>;
  onDeleteProduct?: (p: Product) => Promise<void>;
}

export const Inventory: React.FC<InventoryProps> = ({ 
  products, setProducts, categories, suppliers, role, onSaveProduct, onDeleteProduct 
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'suppliers'>('items');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Product> | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Product | null>(null);

  // Debounce logic: Delay updating the actual filter term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300); // 300ms delay is the "sweet spot" for search performance

    return () => clearTimeout(handler);
  }, [search]);

  // Memoized Filter: Only recalculates when debounced term or products list changes
  const filtered = useMemo(() => {
    const term = debouncedSearch.toLowerCase().trim();
    if (!term) return products;

    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.sku.toLowerCase().includes(term)
    );
  }, [debouncedSearch, products]);
  
  const isEmployee = role === UserRole.EMPLOYEE;

  const handleOpenModal = (item?: Product) => {
    if (item) {
      setEditingItem({ ...item });
    } else {
      setEditingItem({
        name: '',
        sku: `ITEM-${Math.floor(1000 + Math.random() * 9000)}`,
        category: categories[0] || 'General',
        price: 0,
        stock: 0,
        description: '',
        imageUrl: ''
      });
    }
    setModalOpen(true);
  };

  const handleAutoFill = async () => {
    if (!editingItem?.name) {
      alert("Please enter a name for the item first.");
      return;
    }
    setIsBusy(true);
    try {
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) await aistudio.openSelectKey();
      }
      const data = await enhanceProductDetails(editingItem.name, "Retail", categories);
      setEditingItem(prev => ({ 
        ...prev, 
        category: data.category || prev?.category, 
        description: data.descriptions.formal || prev?.description 
      }));
    } catch (e) { 
      alert("Our assistant is having a moment. Please try filling the details manually."); 
    } finally { 
      setIsBusy(false); 
    }
  };

  const handleGetPhoto = async (mode: 'search' | 'draw') => {
    if (!editingItem?.name) {
      alert("Tell us the item name before we find a photo.");
      return;
    }
    setIsBusy(true);
    try {
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) await aistudio.openSelectKey();
      }
      const img = mode === 'search' ? await searchProductImage(editingItem.name) : await generateProductImage(editingItem.name);
      setEditingItem(prev => ({ ...prev, imageUrl: img }));
    } catch (e) { 
      alert("We couldn't get a photo right now. You can try again in a few seconds."); 
    } finally { 
      setIsBusy(false); 
    }
  };

  const handleSave = async () => {
    if (!editingItem?.name || !editingItem.category) {
      alert("Please make sure the item has a name and a category group.");
      return;
    }
    
    if (onSaveProduct) {
      const finalItem = {
        ...editingItem,
        id: editingItem.id || `ID-${Date.now()}`
      } as Product;
      await onSaveProduct(finalItem);
    }
    setModalOpen(false);
    setEditingItem(null);
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm && onDeleteProduct) {
      await onDeleteProduct(showDeleteConfirm);
      setShowDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
           <div className="flex bg-white border border-slate-200 p-1 rounded-2xl shadow-sm w-fit mb-4">
              <button onClick={() => setActiveTab('items')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'items' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}>Items & Stock</button>
              {!isEmployee && <button onClick={() => setActiveTab('suppliers')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'suppliers' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}>My Suppliers</button>}
           </div>
           <h2 className="text-4xl font-black text-slate-900 tracking-tight">Shop Items</h2>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
            <input 
              placeholder="Find an item..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="w-full bg-white border border-slate-200 rounded-[1.5rem] pl-14 pr-5 py-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm" 
            />
          </div>
          {!isEmployee && (
            <button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-xl flex items-center gap-2 uppercase tracking-widest text-[10px] transition-all active:scale-95">
              <Plus size={18} /> New Item
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[3rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="p-8">Item Details</th>
                <th className="p-8">Group</th>
                <th className="p-8 text-right">Price</th>
                <th className="p-8 text-center">Stock</th>
                {!isEmployee && <th className="p-8 text-right pr-12">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-indigo-50/40 group transition-all">
                  <td className="p-8">
                    <div className="flex items-center gap-5 min-w-[240px]">
                      <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" alt={p.name} /> : <Package size={24} className="text-slate-300" />}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-base">{p.name}</h4>
                        <p className="text-[11px] font-mono text-slate-400 mt-1">{p.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <span className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200">
                      {p.category}
                    </span>
                  </td>
                  <td className="p-8 text-right font-black text-slate-900">{formatCurrency(p.price)}</td>
                  <td className="p-8 text-center">
                    <span className={`text-lg font-black ${p.stock < 10 ? 'text-rose-600' : 'text-slate-900'}`}>{p.stock}</span>
                  </td>
                  {!isEmployee && (
                    <td className="p-8 text-right pr-12">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleOpenModal(p)} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all"><Edit3 size={20}/></button>
                        <button onClick={() => setShowDeleteConfirm(p)} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-rose-600 shadow-sm transition-all"><Trash2 size={20}/></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-slate-300 italic">No items found matching your search criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => !isBusy && setModalOpen(false)} />
           <div className="relative bg-white w-full max-w-5xl max-h-[90vh] rounded-[3rem] shadow-3xl overflow-hidden flex flex-col animate-in zoom-in-95 border border-slate-200">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><Package size={24} /></div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900">{editingItem?.id ? 'Edit Item Info' : 'Add New Item'}</h3>
                       <p className="text-[10px] font-black uppercase text-slate-400">Update your shop records</p>
                    </div>
                 </div>
                 <button onClick={() => setModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-10 custom-scrollbar">
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Item Name</label>
                       <div className="flex gap-2">
                          <input 
                            value={editingItem?.name || ''} 
                            onChange={e => setEditingItem({...editingItem, name: e.target.value})} 
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all" 
                            placeholder="What are you selling?" 
                          />
                          <button onClick={handleAutoFill} disabled={isBusy} className="px-6 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 flex items-center gap-2 font-black text-[10px] uppercase transition-all hover:bg-indigo-100 disabled:opacity-30">
                            {isBusy ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>} Auto-Fill
                          </button>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Sell Price (₱)</label>
                          <input type="number" value={editingItem?.price || ''} onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-50" placeholder="0.00" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Current Stock</label>
                          <input type="number" value={editingItem?.stock || ''} onChange={e => setEditingItem({...editingItem, stock: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-4 focus:ring-indigo-50" placeholder="0" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Group / Category</label>
                       <select value={editingItem?.category || ''} onChange={e => setEditingItem({...editingItem, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none cursor-pointer">
                          <option value="">Choose a group...</option>
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Description</label>
                       <textarea value={editingItem?.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-medium h-32 outline-none focus:ring-4 focus:ring-indigo-50" placeholder="Write a bit about this item..." />
                    </div>
                 </div>
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Item Photo</label>
                       <div className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center relative overflow-hidden group shadow-inner">
                          {isBusy ? (
                             <Loader2 size={40} className="animate-spin text-indigo-600" />
                          ) : editingItem?.imageUrl ? (
                             <img src={editingItem.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                          ) : (
                             <div className="text-center text-slate-300">
                                <ImageIcon size={48} className="mx-auto mb-2 opacity-20"/>
                                <p className="text-[10px] font-black uppercase tracking-widest">No Photo Added</p>
                             </div>
                          )}
                          {!isBusy && (
                             <div className="absolute inset-0 bg-white/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-all">
                                <button onClick={() => handleGetPhoto('search')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 shadow-lg"><Search size={14}/> Find Photo</button>
                                <button onClick={() => handleGetPhoto('draw')} className="bg-white border border-indigo-100 text-indigo-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 shadow-sm"><Zap size={14}/> Create Photo</button>
                             </div>
                          )}
                       </div>
                    </div>
                 </div>
              </div>
              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                 <button onClick={() => setModalOpen(false)} className="flex-1 py-5 bg-white border border-slate-200 rounded-3xl font-black text-[10px] uppercase transition-all hover:bg-slate-50">Cancel</button>
                 <button onClick={handleSave} className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl font-black text-[10px] uppercase shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-95">Save Item Records</button>
              </div>
           </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowDeleteConfirm(null)} />
           <div className="relative bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center space-y-6 shadow-3xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[1.5rem] flex items-center justify-center mx-auto border border-rose-100"><AlertCircle size={40}/></div>
              <div className="space-y-2">
                 <h3 className="text-xl font-black text-slate-900">Remove this item?</h3>
                 <p className="text-sm font-medium text-slate-500 leading-relaxed">Are you sure you want to remove <span className="text-slate-900 font-bold">"{showDeleteConfirm.name}"</span>? This cannot be undone.</p>
              </div>
              <div className="flex flex-col gap-2">
                 <button onClick={confirmDelete} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-100">Yes, Remove Item</button>
                 <button onClick={() => setShowDeleteConfirm(null)} className="w-full py-4 text-slate-400 font-bold text-[10px] uppercase">Cancel</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
