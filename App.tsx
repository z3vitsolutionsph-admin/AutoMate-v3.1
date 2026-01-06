
// ... existing imports ...
import React, { Component, useState, useEffect, useCallback, useMemo, ReactNode, ErrorInfo } from 'react';
import { Layout } from './components/Layout';
import { Onboarding } from './components/Onboarding';
import { Login } from './components/Login';
import { RoleShell } from './components/RoleShell';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { POS } from './components/POS';
import { Reporting } from './components/Reporting';
import { Promoter } from './components/Promoter';
import { Support } from './components/Support';
import { Settings } from './components/Settings';
import { ViewState, UserRole, OnboardingState, Product, Transaction, Supplier, IntegrationConfig, SyncLog, SystemUser, PlanType, Business, Referral } from '../types';
import { Lock, Crown, ArrowRight, AlertTriangle, Loader2, Copy, Check } from 'lucide-react';
import { dbService } from '../services/dbService';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabaseClient';

// ... ErrorBoundary Component ...
interface ErrorBoundaryProps {
  children?: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null, copied: false };
  constructor(props: ErrorBoundaryProps) { super(props); }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { hasError: true, error, copied: false }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("Uncaught error:", error, errorInfo); }
  handleCopyError = () => { if (this.state.error) { navigator.clipboard.writeText(`${this.state.error.name}: ${this.state.error.message}\n${this.state.error.stack}`); this.setState({ copied: true }); setTimeout(() => this.setState({ copied: false }), 2000); } };
  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
          <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-rose-100 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-rose-500"></div>
             <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-rose-500 shadow-xl shadow-rose-100"><AlertTriangle size={36} strokeWidth={2.5} /></div>
             <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">System Anomaly</h2>
             <p className="text-slate-500 text-sm mb-8 font-medium leading-relaxed">The application encountered a critical runtime error.</p>
             <div className="bg-slate-50 p-5 rounded-2xl text-left mb-6 overflow-auto max-h-32 border border-slate-200 shadow-inner group"><code className="text-[10px] text-slate-600 font-mono break-all block">{this.state.error?.message}</code></div>
             <button onClick={() => window.location.reload()} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-95 uppercase tracking-widest text-[10px]">Reboot System</button>
          </div>
        </div>
      );
    }
    return (this.props as any).children;
  }
}

const App: React.FC = () => {
  const STORAGE_PREFIX = 'automate_v3_';
  const KEYS = {
    SETUP: `${STORAGE_PREFIX}setup`,
    BIZ_NAME: `${STORAGE_PREFIX}biz_name`,
    BUSINESSES: `${STORAGE_PREFIX}businesses`,
    CATS: `${STORAGE_PREFIX}cats`,
    PRODUCTS: `${STORAGE_PREFIX}products`,
    SUPPLIERS: `${STORAGE_PREFIX}suppliers`,
    TRANSACTIONS: `${STORAGE_PREFIX}transactions`,
    USERS: `${STORAGE_PREFIX}users`,
    SESSION_USER: `${STORAGE_PREFIX}session_user_id`,
    INTEGRATIONS: `${STORAGE_PREFIX}integrations`,
    PLAN: `${STORAGE_PREFIX}plan`,
    TRIAL_START: `${STORAGE_PREFIX}trial_start`
  };

  const safeJsonParse = <T,>(key: string, fallback: T): T => { try { const stored = localStorage.getItem(key); return stored ? JSON.parse(stored) : fallback; } catch { return fallback; } };

  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(() => localStorage.getItem(KEYS.SETUP) === 'true');
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [businessName, setBusinessName] = useState<string>(() => localStorage.getItem(KEYS.BIZ_NAME) || 'AutoMateSystem Hub');
  const [businesses, setBusinesses] = useState<Business[]>(() => safeJsonParse<Business[]>(KEYS.BUSINESSES, []));
  const [activeBusinessId, setActiveBusinessId] = useState<string>('');
  const [subscriptionPlan, setSubscriptionPlan] = useState<PlanType>(() => (localStorage.getItem(KEYS.PLAN) as PlanType) || 'STARTER');
  const [trialStartDate, setTrialStartDate] = useState<string | null>(() => localStorage.getItem(KEYS.TRIAL_START));
  const [categories, setCategories] = useState<string[]>(() => safeJsonParse<string[]>(KEYS.CATS, ['Food', 'Beverage', 'Retail']));
  const [users, setUsers] = useState<SystemUser[]>(() => safeJsonParse<SystemUser[]>(KEYS.USERS, []));
  const [products, setProducts] = useState<Product[]>(() => safeJsonParse<Product[]>(KEYS.PRODUCTS, []));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => safeJsonParse<Supplier[]>(KEYS.SUPPLIERS, []));
  const [transactions, setTransactions] = useState<Transaction[]>(() => safeJsonParse<Transaction[]>(KEYS.TRANSACTIONS, []));
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(() => safeJsonParse<IntegrationConfig[]>(KEYS.INTEGRATIONS, [{ id: '1', provider: 'QUICKBOOKS', name: 'QuickBooks', status: 'DISCONNECTED', autoSync: false }, { id: '2', provider: 'XERO', name: 'Xero', status: 'DISCONNECTED', autoSync: false }]));
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => { console.error("Unhandled Promise Rejection:", event.reason); };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  useEffect(() => {
    if (isSetupComplete && businesses.length === 0) {
      const initialBiz: Business = { id: `BIZ-${Date.now()}`, name: businessName, type: 'General', address: 'Main Headquarters', isPrimary: true };
      setBusinesses([initialBiz]); setActiveBusinessId(initialBiz.id);
    } else if (isSetupComplete && businesses.length > 0 && !activeBusinessId) {
      const primary = businesses.find(b => b.isPrimary);
      setActiveBusinessId(primary ? primary.id : businesses[0].id);
    }
  }, [isSetupComplete, businesses, businessName, activeBusinessId]);

  useEffect(() => {
    if (isSetupComplete && activeBusinessId) {
      const loadCloudData = async () => {
        try {
          await dataService.syncPending();
          // Added 'businesses' to fetch to ensure root profile is synced
          const [fetchedProducts, fetchedTransactions, fetchedSuppliers, fetchedUsers, fetchedReferrals, fetchedBusinesses] = await Promise.all([
            dataService.fetch<Product>('products', 'products', activeBusinessId),
            dataService.fetch<Transaction>('transactions', 'transactions', activeBusinessId),
            dataService.fetch<Supplier>('suppliers', 'suppliers', activeBusinessId),
            dataService.fetch<SystemUser>('users', 'users', activeBusinessId),
            dataService.fetch<Referral>('referrals', 'referrals', activeBusinessId),
            dataService.fetch<Business>('businesses', 'businesses', activeBusinessId)
          ]);
          if (fetchedProducts) setProducts(fetchedProducts);
          if (fetchedTransactions) setTransactions(fetchedTransactions);
          if (fetchedSuppliers) setSuppliers(fetchedSuppliers);
          if (fetchedUsers && fetchedUsers.length > 0) setUsers(fetchedUsers);
          if (fetchedReferrals) setReferrals(fetchedReferrals);
          
          if (fetchedBusinesses && fetchedBusinesses.length > 0) {
             const currentCloudBiz = fetchedBusinesses.find(b => b.id === activeBusinessId);
             if (currentCloudBiz) {
                setBusinesses(prev => prev.map(b => b.id === currentCloudBiz.id ? currentCloudBiz : b));
                setBusinessName(currentCloudBiz.name);
             }
          }
        } catch (error) { console.error("Failed to sync with cloud:", error); }
      };
      loadCloudData();
      
      const channels = dataService.subscribeToChanges(
        ['products', 'transactions', 'suppliers', 'users', 'referrals', 'businesses'], activeBusinessId, 
        (change) => {
           if (change.table === 'products') { setProducts(prev => { if (change.event === 'DELETE') return prev.filter(p => p.id !== change.data.id); const exists = prev.find(p => p.id === change.data.id); return exists ? prev.map(p => p.id === change.data.id ? change.data : p) : [change.data, ...prev]; }); } 
           else if (change.table === 'transactions') { setTransactions(prev => { if (change.event === 'DELETE') return prev.filter(t => t.id !== change.data.id); const exists = prev.find(t => t.id === change.data.id); return exists ? prev.map(t => t.id === change.data.id ? change.data : t) : [change.data, ...prev]; }); } 
           else if (change.table === 'suppliers') { setSuppliers(prev => { if (change.event === 'DELETE') return prev.filter(s => s.id !== change.data.id); const exists = prev.find(s => s.id === change.data.id); return exists ? prev.map(s => s.id === change.data.id ? change.data : s) : [change.data, ...prev]; }); } 
           else if (change.table === 'users') { setUsers(prev => { if (change.event === 'DELETE') return prev.filter(u => u.id !== change.data.id); const exists = prev.find(u => u.id === change.data.id); return exists ? prev.map(u => u.id === change.data.id ? change.data : u) : [change.data, ...prev]; }); }
           else if (change.table === 'referrals') { setReferrals(prev => { if (change.event === 'DELETE') return prev.filter(r => r.id !== change.data.id); const exists = prev.find(r => r.id === change.data.id); return exists ? prev.map(r => r.id === change.data.id ? change.data : r) : [change.data, ...prev]; }); }
           else if (change.table === 'businesses') { 
              // Handle root business profile updates (e.g. name change from another device)
              if (change.data && change.data.id === activeBusinessId) {
                 const updatedBiz = change.data;
                 setBusinesses(prev => prev.map(b => b.id === updatedBiz.id ? updatedBiz : b));
                 setBusinessName(updatedBiz.name);
              }
           }
        }
      );
      
      const handleOnline = () => dataService.syncPending();
      window.addEventListener('online', handleOnline);
      return () => { window.removeEventListener('online', handleOnline); channels.forEach(c => supabase.removeChannel(c)); };
    }
  }, [isSetupComplete, activeBusinessId]);

  const activeBusiness = useMemo(() => businesses.find(b => b.id === activeBusinessId) || businesses[0] || { id: 'temp', name: 'Loading...', address: '', type: 'General' }, [businesses, activeBusinessId]);
  const currentProducts = useMemo(() => activeBusinessId ? products.filter(p => p.businessId === activeBusinessId) : [], [products, activeBusinessId]);
  const currentTransactions = useMemo(() => activeBusinessId ? transactions.filter(t => t.businessId === activeBusinessId) : [], [transactions, activeBusinessId]);

  useEffect(() => {
    const sessionId = localStorage.getItem(KEYS.SESSION_USER);
    if (sessionId && isSetupComplete && users.length > 0) {
      const user = users.find(u => u.id === sessionId);
      if (user) { setCurrentUser(user); if (user.role === UserRole.EMPLOYEE) setCurrentView(prev => (prev === ViewState.DASHBOARD || prev === ViewState.SUPPORT) ? ViewState.POS : prev); }
    }
  }, [isSetupComplete, users]);

  useEffect(() => {
    if (!isSetupComplete) return;
    localStorage.setItem(KEYS.SETUP, 'true'); localStorage.setItem(KEYS.BIZ_NAME, businessName); localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(businesses)); localStorage.setItem(KEYS.CATS, JSON.stringify(categories)); localStorage.setItem(KEYS.USERS, JSON.stringify(users)); localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products)); localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(suppliers)); localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions)); localStorage.setItem(KEYS.INTEGRATIONS, JSON.stringify(integrations)); localStorage.setItem(KEYS.PLAN, subscriptionPlan);
    if (trialStartDate) localStorage.setItem(KEYS.TRIAL_START, trialStartDate); else localStorage.removeItem(KEYS.TRIAL_START);
  }, [isSetupComplete, businessName, businesses, categories, users, products, suppliers, transactions, integrations, subscriptionPlan, trialStartDate]);

  const handleOnboardingComplete = useCallback(async (data: OnboardingState) => {
    const bizId = `BIZ-${Date.now()}`;
    const newBusiness: Business = { id: bizId, name: data.businessName, type: data.businessType, address: 'Main Headquarters', contactEmail: data.adminEmail, isPrimary: true };
    const adminUser: SystemUser = { id: `USR-${Date.now()}`, businessId: bizId, name: data.adminName, email: data.adminEmail, password: data.adminPassword, role: UserRole.ADMIN_PRO, status: 'Active', lastLogin: new Date(), createdAt: new Date() };
    const initialProducts = (data.generatedProducts || []).map(p => ({ ...p, businessId: bizId }));
    await dataService.upsert('businesses', 'businesses', newBusiness);
    await Promise.all([dataService.upsert('users', 'users', adminUser, bizId), dataService.upsertMany('products', 'products', initialProducts)]);
    setBusinessName(data.businessName); setBusinesses([newBusiness]); setActiveBusinessId(bizId); setCategories(data.generatedCategories); setUsers([adminUser]); setSubscriptionPlan(data.selectedPlan); setProducts(initialProducts);
    if (data.selectedPlan === 'STARTER') { const now = new Date().toISOString(); localStorage.setItem(KEYS.TRIAL_START, now); setTrialStartDate(now); }
    setIsSetupComplete(true); setCurrentUser(adminUser); localStorage.setItem(KEYS.SESSION_USER, adminUser.id);
  }, []);

  const handleLogin = useCallback(async (email: string, pass: string): Promise<{ success: boolean; error?: string; code?: string }> => {
    // 1. Check Local State (Offline First / Optimistic)
    let user = users.find(u => u.email === email && u.password === pass);
    
    // 2. If not local, try Cloud (Auth Service)
    if (!user) {
       const response = await dataService.authenticate(email, pass);
       if (response.success && response.data?.user) {
          user = response.data.user;
          const biz = response.data.business;
          
          if (biz) {
             setBusinesses(prev => { const exists = prev.find(b => b.id === biz.id); return exists ? prev : [biz, ...prev]; });
             if (biz.isPrimary || !activeBusinessId) { setBusinessName(biz.name); setActiveBusinessId(biz.id); }
          }
          
          // Hydrate local state
          setUsers(prev => [...prev.filter(u => u.id !== user!.id), user!]);
          await dbService.saveItems('users', [user]);
       } else {
          // Return structured error from service, preserving the error code
          return { success: false, error: response.error || 'Authentication Failed', code: response.code };
       }
    }

    // 3. Success Path
    if (user) {
      if (user.status !== 'Active') {
          return { success: false, error: "Account Suspended. Contact Administrator.", code: 'AUTH_FAILED' };
      }
      const updatedUser = { ...user, lastLogin: new Date() };
      setUsers(prevUsers => prevUsers.map(u => u.id === user!.id ? updatedUser : u));
      setCurrentUser(updatedUser);
      // Background sync update
      dataService.upsert('users', 'users', updatedUser, updatedUser.businessId).catch(console.error);
      
      localStorage.setItem(KEYS.SESSION_USER, user.id);
      setCurrentView(user.role === UserRole.EMPLOYEE ? ViewState.POS : ViewState.DASHBOARD);
      return { success: true };
    }
    
    return { success: false, error: "Invalid credentials.", code: 'AUTH_FAILED' };
  }, [users, activeBusinessId]);

  const handleLogout = useCallback(() => { setCurrentUser(null); localStorage.removeItem(KEYS.SESSION_USER); setCurrentView(ViewState.DASHBOARD); }, []);
  const handleSaveBusiness = async (business: Business) => { setBusinesses(prev => { const exists = prev.find(b => b.id === business.id); let updated; if (exists) updated = prev.map(b => b.id === business.id ? business : b); else updated = [...prev, business]; if (business.isPrimary || (exists && businessName === exists.name)) setBusinessName(business.name); return updated; }); await dataService.upsert('businesses', 'businesses', business); };
  const handleSaveUser = async (user: SystemUser) => { const userToSave = { ...user, businessId: activeBusinessId }; setUsers(prev => { const exists = prev.find(u => u.id === userToSave.id); return exists ? prev.map(u => u.id === userToSave.id ? userToSave : u) : [...prev, userToSave]; }); await dataService.upsert('users', 'users', userToSave, activeBusinessId); };
  const handleSwitchBusiness = (id: string) => setActiveBusinessId(id);
  const handleTransactionComplete = useCallback(async (newTransactions: Transaction[]) => { const taggedTransactions = newTransactions.map(t => ({ ...t, businessId: activeBusinessId })); setTransactions(prev => [...taggedTransactions, ...prev]); await dataService.upsertMany('transactions', 'transactions', taggedTransactions); const updatedProducts: Product[] = []; setProducts(prevProducts => { const soldMap = new Map<string, number>(); taggedTransactions.forEach(tx => { const product = prevProducts.find(p => p.id === tx.productId || p.name === tx.product); if (product) soldMap.set(product.id, (soldMap.get(product.id) || 0) + (tx.quantity || 1)); }); return prevProducts.map(p => { const soldQty = soldMap.get(p.id); if (soldQty !== undefined) { const updated = { ...p, stock: Math.max(0, p.stock - soldQty) }; updatedProducts.push(updated); return updated; } return p; }); }); if (updatedProducts.length > 0) await dataService.upsertMany('products', 'products', updatedProducts); }, [activeBusinessId]);
  const handleSaveProduct = async (product: Product) => { const productToSave = { ...product, businessId: activeBusinessId }; setProducts(prev => { const exists = prev.find(p => p.id === productToSave.id); if (exists) return prev.map(p => p.id === productToSave.id ? productToSave : p); return [productToSave, ...prev]; }); await dataService.upsert('products', 'products', productToSave, activeBusinessId); };
  const handleDeleteProduct = async (product: Product) => { setProducts(prev => prev.filter(p => p.id !== product.id)); await dataService.delete('products', 'products', product.id); };
  const handleSaveSupplier = async (supplier: Supplier) => { const supplierToSave = { ...supplier, businessId: activeBusinessId }; setSuppliers(prev => { const exists = prev.find(s => s.id === supplier.id); if (exists) return prev.map(s => s.id === supplier.id ? supplierToSave : s); return [supplierToSave, ...prev]; }); await dataService.upsert('suppliers', 'suppliers', supplierToSave, activeBusinessId); };

  const isTrialExpired = useMemo(() => { if (subscriptionPlan === 'STARTER' && trialStartDate) { return (new Date().getTime() - new Date(trialStartDate).getTime()) > 5 * 24 * 60 * 60 * 1000; } return false; }, [subscriptionPlan, trialStartDate]);
  const upgradeToProfessional = () => { setSubscriptionPlan('PROFESSIONAL'); localStorage.setItem(KEYS.PLAN, 'PROFESSIONAL'); localStorage.removeItem(KEYS.TRIAL_START); setTrialStartDate(null); };

  if (!isSetupComplete) return <Onboarding onComplete={handleOnboardingComplete} onSwitchToLogin={() => setIsSetupComplete(true)} />;
  if (!currentUser) return <Login onLoginSuccess={handleLogin} onBack={() => setIsSetupComplete(false)} businessName={activeBusiness.name} />;
  if (isTrialExpired) return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4"><div className="bg-white border border-slate-200 p-12 rounded-[2.5rem] shadow-2xl max-w-lg text-center space-y-6"><Crown size={48} className="mx-auto text-indigo-600" /><h2 className="text-3xl font-black text-slate-900">Trial Period Ended</h2><p className="text-slate-500">Your trial has concluded. Upgrade to continue.</p><button onClick={upgradeToProfessional} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl">Upgrade Now</button></div></div>;

  return (
    <ErrorBoundary>
      <RoleShell role={currentUser.role}>
        <Layout 
          currentView={currentView} setView={setCurrentView} role={currentUser.role} businessName={activeBusiness.name} 
          onLogout={handleLogout} products={currentProducts} transactions={currentTransactions} currentUser={currentUser} 
          users={users} subscriptionPlan={subscriptionPlan}
        >
          {(() => {
            switch (currentView) {
              case ViewState.DASHBOARD: return <Dashboard transactions={currentTransactions} products={currentProducts} businessName={activeBusiness.name} role={currentUser.role} />;
              case ViewState.INVENTORY: return <Inventory products={currentProducts} setProducts={setProducts} onSaveProduct={handleSaveProduct} onDeleteProduct={handleDeleteProduct} categories={categories} suppliers={suppliers} setSuppliers={setSuppliers} onSaveSupplier={handleSaveSupplier} transactions={currentTransactions} role={currentUser.role} />;
              case ViewState.POS: return <POS products={currentProducts} operatorName={currentUser.name} onTransactionComplete={handleTransactionComplete} businessDetails={{ name: activeBusiness.name, address: activeBusiness.address || 'Main Node', contact: activeBusiness.phone || activeBusiness.contactEmail || currentUser.email, footerMessage: activeBusiness.receiptFooter || "Official Receipt" }} />;
              case ViewState.REPORTING: return <Reporting transactions={currentTransactions} products={currentProducts} />;
              case ViewState.PROMOTER: return <Promoter referrals={referrals} />;
              case ViewState.SUPPORT: return <Support products={currentProducts} transactions={currentTransactions} />;
              case ViewState.SETTINGS: return (
                <Settings 
                  integrations={integrations} setIntegrations={setIntegrations} 
                  syncLogs={syncLogs} setSyncLogs={setSyncLogs} 
                  users={users} setUsers={setUsers} onSaveUser={handleSaveUser} 
                  subscriptionPlan={subscriptionPlan} 
                  businesses={businesses} onSaveBusiness={handleSaveBusiness} 
                  activeBusinessId={activeBusinessId} onSwitchBusiness={handleSwitchBusiness} 
                  products={products} setProducts={setProducts}
                  transactions={transactions} setTransactions={setTransactions}
                />
              );
            }
          })()}
        </Layout>
      </RoleShell>
    </ErrorBoundary>
  );
};

export default App;
