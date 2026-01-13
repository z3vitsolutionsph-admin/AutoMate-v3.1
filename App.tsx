
import React, { Component, useState, useEffect, useCallback, ReactNode, ErrorInfo, useMemo } from 'react';
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
import { IntroVideo } from './components/IntroVideo';
import { ViewState, UserRole, OnboardingState, Product, Transaction, Supplier, IntegrationConfig, SyncLog, SystemUser, PlanType, Business, Referral } from './types';
import { RefreshCw, ShieldX, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';
import { dataService } from './services/dataService';
import { supabase } from './services/supabaseClient';

interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null; showDetails: boolean; }

// Fixed ErrorBoundary by using React.Component with explicit Generic types to resolve Property 'state'/'props'/'setState' does not exist errors.
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> { 
    return { hasError: true, error }; 
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("Critical System Glitch:", error, errorInfo);
  }

  handleSoftReboot = () => {
    sessionStorage.clear();
    window.location.reload();
  };

  handleHardRecovery = () => {
    if (window.confirm("Perform Hard Recovery? This will reset your terminal view but your local sales data (IndexedDB) will remain safe.")) {
      const keysToClear = ['automate_v3_setup', 'automate_v3_session_user_id'];
      keysToClear.forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.2] pointer-events-none" />
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 relative z-10">
             <div className="p-12 text-center space-y-8">
                <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center text-rose-500 mx-auto shadow-xl border border-rose-100">
                  <AlertTriangle size={48} strokeWidth={2.5}/>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight">Terminal Node Interrupted</h2>
                  <p className="text-slate-500 font-medium leading-relaxed max-w-md mx-auto">
                    AutoMate encountered a logic anomaly. Your shop records are protected via **Neural Resilience™**. Use the healing tools below to restore the node.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button onClick={this.handleSoftReboot} className="group py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-3xl shadow-xl shadow-indigo-100 transition-all flex flex-col items-center justify-center gap-1 uppercase active:scale-95 border-b-4 border-indigo-800">
                    <div className="flex items-center gap-2"><RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500"/> <span className="text-[10px] tracking-widest">Soft Reboot</span></div>
                    <span className="text-[7px] opacity-60">Restart Session</span>
                  </button>
                  <button onClick={this.handleHardRecovery} className="group py-5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-3xl shadow-xl transition-all flex flex-col items-center justify-center gap-1 uppercase active:scale-95 border-b-4 border-slate-950">
                    <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-400"/> <span className="text-[10px] tracking-widest">Hard Recovery</span></div>
                    <span className="text-[7px] opacity-60">Reset System Node</span>
                  </button>
                </div>

                <button onClick={() => this.setState({showDetails: !this.state.showDetails})} className="text-[9px] font-black uppercase text-slate-300 tracking-[0.2em] hover:text-indigo-600 transition-all py-2">
                  {this.state.showDetails ? 'Hide' : 'Show'} Diagnostic Core Data
                </button>

                {this.state.showDetails && (
                  <div className="p-6 bg-slate-50 rounded-2xl text-left border border-slate-200 overflow-auto max-h-40 shadow-inner">
                    <pre className="text-[9px] font-mono text-rose-400/80">{this.state.error?.stack}</pre>
                  </div>
                )}
             </div>
             <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-3">
               <Zap size={14} className="text-indigo-400" />
               <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.4em]">Resilience Layer v3.7.1 - Active Protection</span>
             </div>
          </div>
        </div>
      );
    }
    return this.props.children;
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
    PLAN: `${STORAGE_PREFIX}plan`, 
    INTRO_SEEN: `${STORAGE_PREFIX}intro_seen`,
    INTEGRATIONS: `${STORAGE_PREFIX}integrations`
  };

  const safeJsonParse = <T,>(key: string, fallback: T): T => { 
    try { const stored = localStorage.getItem(key); return stored ? JSON.parse(stored) : fallback; } catch { return fallback; } 
  };

  const [showIntro, setShowIntro] = useState<boolean>(() => !sessionStorage.getItem(KEYS.INTRO_SEEN));
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(() => localStorage.getItem(KEYS.SETUP) === 'true');
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [businessName, setBusinessName] = useState<string>(() => localStorage.getItem(KEYS.BIZ_NAME) || 'AutoMate Shop');
  const [businesses, setBusinesses] = useState<Business[]>(() => safeJsonParse<Business[]>(KEYS.BUSINESSES, []));
  const [activeBusinessId, setActiveBusinessId] = useState<string>('');
  const [subscriptionPlan, setSubscriptionPlan] = useState<PlanType>(() => (localStorage.getItem(KEYS.PLAN) as PlanType) || 'STARTER');
  const [categories, setCategories] = useState<string[]>(() => safeJsonParse<string[]>(KEYS.CATS, ['Food', 'Drinks', 'Retail']));
  const [users, setUsers] = useState<SystemUser[]>(() => safeJsonParse<SystemUser[]>(KEYS.USERS, []));
  const [products, setProducts] = useState<Product[]>(() => safeJsonParse<Product[]>(KEYS.PRODUCTS, []));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => safeJsonParse<Supplier[]>(KEYS.SUPPLIERS, []));
  const [transactions, setTransactions] = useState<Transaction[]>(() => safeJsonParse<Transaction[]>(KEYS.TRANSACTIONS, []));
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(() => 
    safeJsonParse<IntegrationConfig[]>(KEYS.INTEGRATIONS, [
      { id: '1', provider: 'QUICKBOOKS', name: 'QuickBooks', status: 'DISCONNECTED', autoSync: false },
      { id: '2', provider: 'XERO', name: 'Xero', status: 'DISCONNECTED', autoSync: false }
    ])
  );
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  // 1. Resolve Active Business ID
  useEffect(() => {
    if (isSetupComplete && businesses.length > 0 && !activeBusinessId) {
      const primary = businesses.find(b => b.isPrimary) || businesses[0];
      setActiveBusinessId(primary.id);
    }
  }, [isSetupComplete, businesses, activeBusinessId]);

  // 2. Load Data & Synchronize with Supabase Realtime
  useEffect(() => {
    if (isSetupComplete && activeBusinessId) {
      const loadInitialData = async () => {
        try {
          // Process any locally queued actions before fetching
          await dataService.syncPending();
          
          const [fProd, fTrans, fSupp, fUsers, fRefs, fBiz] = await Promise.all([
            dataService.fetch<Product>('products', 'products', activeBusinessId),
            dataService.fetch<Transaction>('transactions', 'transactions', activeBusinessId),
            dataService.fetch<Supplier>('suppliers', 'suppliers', activeBusinessId),
            dataService.fetch<SystemUser>('users', 'users', activeBusinessId),
            dataService.fetch<Referral>('referrals', 'referrals', activeBusinessId),
            dataService.fetch<Business>('businesses', 'businesses', activeBusinessId)
          ]);
          
          setProducts(fProd); 
          setTransactions(fTrans); 
          setSuppliers(fSupp); 
          setUsers(fUsers); 
          setReferrals(fRefs);
          
          if (fBiz.length > 0) {
            const current = fBiz.find(b => b.id === activeBusinessId);
            if (current) { 
              setBusinesses(prev => prev.map(b => b.id === current.id ? current : b)); 
              setBusinessName(current.name); 
            }
          }
        } catch (e) { 
          console.warn("[App] Running in Hybrid Offline Mode.", e); 
        }
      };
      
      loadInitialData();

      // ESTABLISH REAL-TIME SUBSCRIPTIONS
      // This makes the app "Live" - changes in DB automatically apply here
      const channels = dataService.subscribeToChanges(
        ['products', 'transactions', 'users', 'suppliers', 'referrals', 'businesses'],
        activeBusinessId,
        (change) => {
          const { table, event, data } = change;
          
          if (table === 'products') {
            setProducts(prev => {
              if (event === 'DELETE') return prev.filter(p => p.id !== data.id);
              const exists = prev.some(p => p.id === data.id);
              if (exists) return prev.map(p => p.id === data.id ? data : p);
              return [data, ...prev];
            });
          } else if (table === 'transactions') {
            setTransactions(prev => {
              if (event === 'DELETE') return prev.filter(t => t.id !== data.id);
              const exists = prev.some(t => t.id === data.id);
              if (exists) return prev.map(t => t.id === data.id ? data : t);
              return [data, ...prev];
            });
          } else if (table === 'users') {
            setUsers(prev => {
              if (event === 'DELETE') return prev.filter(u => u.id !== data.id);
              return [data, ...prev.filter(u => u.id !== data.id)];
            });
          } else if (table === 'suppliers') {
            setSuppliers(prev => {
                if (event === 'DELETE') return prev.filter(s => s.id !== data.id);
                return [data, ...prev.filter(s => s.id !== data.id)];
            });
          } else if (table === 'referrals') {
            setReferrals(prev => {
                if (event === 'DELETE') return prev.filter(r => r.id !== data.id);
                return [data, ...prev.filter(r => r.id !== data.id)];
            });
          } else if (table === 'businesses') {
            setBusinesses(prev => prev.map(b => b.id === data.id ? data : b));
            if (data.id === activeBusinessId) setBusinessName(data.name);
          }
        }
      );

      return () => {
        channels.forEach(c => {
            if (c) supabase.removeChannel(c);
        });
      };
    }
  }, [isSetupComplete, activeBusinessId]);

  // 3. User Session Management
  useEffect(() => {
    const sid = localStorage.getItem(KEYS.SESSION_USER);
    if (sid && isSetupComplete && users.length > 0) {
      const user = users.find(u => u.id === sid);
      if (user) {
        setCurrentUser(user);
        if (user.role === UserRole.EMPLOYEE && (currentView === ViewState.DASHBOARD || currentView === ViewState.SETTINGS)) {
          setCurrentView(ViewState.POS);
        }
      }
    }
  }, [isSetupComplete, users, currentView]);

  const handleOnboardingComplete = useCallback(async (data: OnboardingState) => {
    const bizId = `BIZ-${Date.now()}`;
    const newBiz: Business = { 
        id: bizId, 
        name: data.businessName, 
        type: data.businessType, 
        address: 'Main Hub', 
        isPrimary: true 
    };
    
    const admin: SystemUser = { 
      id: `USR-${Date.now()}`, 
      businessId: bizId, 
      name: data.adminName, 
      email: data.adminEmail, 
      password: data.adminPassword, 
      role: UserRole.ADMIN_PRO, 
      status: 'Active', 
      createdAt: new Date() 
    };
    
    try {
      await dataService.upsert('businesses', 'businesses', newBiz);
      await dataService.upsert('users', 'users', admin, bizId);
      
      const productsToUpsert = (data.generatedProducts ?? []).map(p => ({ 
        ...p, 
        businessId: bizId,
        stock: 10 
      }));
      
      if (productsToUpsert.length > 0) {
        await dataService.upsertMany('products', 'products', productsToUpsert);
      }
      
      setBusinessName(data.businessName); 
      setBusinesses([newBiz]); 
      setActiveBusinessId(bizId); 
      setUsers([admin]); 
      setProducts(productsToUpsert);
      setSubscriptionPlan(data.selectedPlan); 
      setIsSetupComplete(true); 
      setCurrentUser(admin); 
      
      localStorage.setItem(KEYS.SESSION_USER, admin.id);
      localStorage.setItem(KEYS.SETUP, 'true');
      localStorage.setItem(KEYS.PLAN, data.selectedPlan);
    } catch (err) {
      console.error("[App] Critical Onboarding Failure:", err);
      setIsSetupComplete(true); // Fallback to local mode
    }
  }, []);

  const handleLogin = useCallback(async (email: string, pass: string) => {
    let user = users.find(u => u.email === email && u.password === pass);
    if (!user) {
      const res = await dataService.authenticate(email, pass);
      if (res.success && res.data?.user) { 
        user = res.data.user; 
        setCurrentUser(user!); 
        localStorage.setItem(KEYS.SESSION_USER, user!.id); 
        setCurrentView(user!.role === UserRole.EMPLOYEE ? ViewState.POS : ViewState.DASHBOARD); 
        return { success: true }; 
      }
      else return { success: false, error: res.error || 'Identity not verified', code: res.code };
    }
    if (user && user.status === 'Active') { 
      setCurrentUser(user); 
      localStorage.setItem(KEYS.SESSION_USER, user.id); 
      setCurrentView(user.role === UserRole.EMPLOYEE ? ViewState.POS : ViewState.DASHBOARD); 
      return { success: true }; 
    }
    return { success: false, error: "Account access limited." };
  }, [users]);

  const handleSaveProduct = async (p: Product) => { 
    const s = { ...p, businessId: activeBusinessId }; 
    // State is updated automatically by subscription, but we update locally for snappiness
    setProducts(prev => {
        const exists = prev.some(x => x.id === s.id);
        if (exists) return prev.map(x => x.id === s.id ? s : x);
        return [s, ...prev];
    }); 
    await dataService.upsert('products', 'products', s, activeBusinessId); 
  };
  
  const handleDeleteProduct = async (p: Product) => { 
    setProducts(prev => prev.filter(item => item.id !== p.id)); 
    await dataService.delete('products', 'products', p.id); 
  };

  const handleTransactionComplete = useCallback(async (txs: Transaction[]) => { 
    const tagged = txs.map(t => ({ ...t, businessId: activeBusinessId })); 
    setTransactions(prev => [...tagged, ...prev]); 
    await dataService.upsertMany('transactions', 'transactions', tagged); 
    
    // Deduct stock
    for (const tx of tagged) {
        if (tx.productId) {
            const p = products.find(prod => prod.id === tx.productId);
            if (p) {
                const newStock = Math.max(0, p.stock - (tx.quantity || 1));
                await dataService.upsert('products', 'products', { ...p, stock: newStock }, activeBusinessId);
            }
        }
    }
  }, [activeBusinessId, products]);

  if (showIntro) return <ErrorBoundary><IntroVideo onComplete={() => { sessionStorage.setItem(KEYS.INTRO_SEEN, 'true'); setShowIntro(false); }} /></ErrorBoundary>;
  if (!isSetupComplete) return <Onboarding onComplete={handleOnboardingComplete} onSwitchToLogin={() => setIsSetupComplete(true)} />;
  if (!currentUser) return <Login onLoginSuccess={handleLogin} onBack={() => setIsSetupComplete(false)} businessName={businessName} />;
  
  return (
    <ErrorBoundary>
      <RoleShell role={currentUser.role}>
        <Layout 
          currentView={currentView} 
          setView={setCurrentView} 
          role={currentUser.role} 
          businessName={businessName} 
          onLogout={() => { setCurrentUser(null); localStorage.removeItem(KEYS.SESSION_USER); }} 
          products={products} 
          transactions={transactions} 
          currentUser={currentUser} 
          subscriptionPlan={subscriptionPlan}
        >
          {(() => {
            switch (currentView) {
              case ViewState.DASHBOARD: return <Dashboard transactions={transactions} products={products} businessName={businessName} role={currentUser.role} />;
              case ViewState.INVENTORY: return <Inventory products={products} setProducts={setProducts} onSaveProduct={handleSaveProduct} onDeleteProduct={handleDeleteProduct} categories={categories} suppliers={suppliers} role={currentUser.role} />;
              case ViewState.POS: return <POS products={products} operatorName={currentUser.name} onTransactionComplete={handleTransactionComplete} businessDetails={{ name: businessName, address: 'Main Hub', contact: currentUser.email, footerMessage: "Thank you for shopping!" }} />;
              case ViewState.REPORTING: return <Reporting transactions={transactions} products={products} />;
              case ViewState.PROMOTER: return <Promoter referrals={referrals} />;
              case ViewState.SUPPORT: return <Support products={products} transactions={transactions} />;
              case ViewState.SETTINGS: return <Settings integrations={integrations} setIntegrations={setIntegrations} syncLogs={syncLogs} setSyncLogs={setSyncLogs} users={users} setUsers={setUsers} subscriptionPlan={subscriptionPlan} businesses={businesses} activeBusinessId={activeBusinessId} onSwitchBusiness={setActiveBusinessId} setProducts={setProducts} setTransactions={setTransactions} />;
              default: return null;
            }
          })()}
        </Layout>
      </RoleShell>
    </ErrorBoundary>
  );
};

export default App;
