import React, { useState, useEffect, useCallback, useMemo, ReactNode, ErrorInfo } from 'react';
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
import { ViewState, UserRole, OnboardingState, Product, Transaction, Supplier, IntegrationConfig, SyncLog, SystemUser, PlanType } from './types';
import { Lock, Crown, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react';
import { dbService } from './services/dbService';
import { dataService } from './services/dataService';
import { isSupabaseConfigured } from './services/supabaseClient';

// --- Error Boundary Component ---
interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("Uncaught error:", error, errorInfo); }
  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
          <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-rose-100 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-rose-500"></div>
             <AlertTriangle size={36} className="mx-auto text-rose-500 mb-6" />
             <h2 className="text-2xl font-black text-slate-900 mb-3">System Anomaly</h2>
             <p className="text-slate-500 text-sm mb-4">Critical runtime error encountered.</p>
             <button onClick={() => window.location.reload()} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase text-xs">Reboot System</button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const App: React.FC = () => {
  const STORAGE_PREFIX = 'automate_v3_';
  const KEYS = {
    SETUP: `${STORAGE_PREFIX}setup`,
    BIZ_NAME: `${STORAGE_PREFIX}biz_name`,
    PLAN: `${STORAGE_PREFIX}plan`,
    TRIAL_START: `${STORAGE_PREFIX}trial_start`,
    CATS: `${STORAGE_PREFIX}cats`,
    INTEGRATIONS: `${STORAGE_PREFIX}integrations`,
    SESSION_USER: `${STORAGE_PREFIX}session_user_id`
  };

  // --- Core Engine State ---
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);

  // --- Data Stores ---
  const [businessName, setBusinessName] = useState<string>('');
  const [subscriptionPlan, setSubscriptionPlan] = useState<PlanType>('STARTER');
  const [trialStartDate, setTrialStartDate] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  // Large Datasets (Synced)
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // --- Sync Listeners ---
  useEffect(() => {
    // Attempt to sync pending items on load
    dataService.syncPending();

    const handleOnline = () => {
      console.log("Network restored. Initiating sync...");
      dataService.syncPending();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // --- Initialization (Sync from Cloud or Local) ---
  useEffect(() => {
    const hydrate = async () => {
      try {
        // 1. Config from LocalStorage
        const setup = localStorage.getItem(KEYS.SETUP) === 'true';
        setBusinessName(localStorage.getItem(KEYS.BIZ_NAME) || 'AutoMateSystem Hub');
        setSubscriptionPlan((localStorage.getItem(KEYS.PLAN) as PlanType) || 'STARTER');
        setTrialStartDate(localStorage.getItem(KEYS.TRIAL_START));
        setCategories(JSON.parse(localStorage.getItem(KEYS.CATS) || '["Food", "Retail"]'));
        setIntegrations(JSON.parse(localStorage.getItem(KEYS.INTEGRATIONS) || '[]'));
        setIsSetupComplete(setup);

        // 2. Data from DataService (Supabase -> IndexedDB)
        const [loadedProducts, loadedTx, loadedUsers, loadedSuppliers] = await Promise.all([
          dataService.fetch<Product>('products', 'products'),
          dataService.fetch<Transaction>('transactions', 'transactions'),
          dataService.fetch<SystemUser>('users', 'users'),
          dataService.fetch<Supplier>('suppliers', 'suppliers')
        ]);

        setProducts(loadedProducts);
        setTransactions(loadedTx);
        setUsers(loadedUsers);
        setSuppliers(loadedSuppliers);

        // 3. Session
        const sessionId = localStorage.getItem(KEYS.SESSION_USER);
        if (setup && sessionId && loadedUsers.length > 0) {
          const user = loadedUsers.find(u => u.id === sessionId);
          if (user) {
            setCurrentUser(user);
            if (user.role === UserRole.EMPLOYEE) setCurrentView(ViewState.POS);
          }
        }
      } catch (e) {
        console.error("Hydration Failed", e);
      } finally {
        setIsInitializing(false);
      }
    };

    hydrate();
  }, []);

  // --- Local Config Persistence ---
  useEffect(() => {
    if (!isInitializing && isSetupComplete) {
       localStorage.setItem(KEYS.SETUP, 'true');
       localStorage.setItem(KEYS.BIZ_NAME, businessName);
       localStorage.setItem(KEYS.PLAN, subscriptionPlan);
       if(trialStartDate) localStorage.setItem(KEYS.TRIAL_START, trialStartDate);
       else localStorage.removeItem(KEYS.TRIAL_START);
       localStorage.setItem(KEYS.CATS, JSON.stringify(categories));
       localStorage.setItem(KEYS.INTEGRATIONS, JSON.stringify(integrations));
    }
  }, [isInitializing, isSetupComplete, businessName, subscriptionPlan, trialStartDate, categories, integrations]);

  // --- Centralized Data Mutators (Syncs to Cloud) ---
  
  const handleSaveProduct = async (product: Product) => {
    // 1. Optimistic Update
    setProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.map(p => p.id === product.id ? product : p);
      return [product, ...prev];
    });
    // 2. Persist
    await dataService.upsert('products', 'products', product, currentUser?.businessId);
  };

  const handleDeleteProduct = async (product: Product) => {
    setProducts(prev => prev.filter(p => p.id !== product.id));
    await dataService.delete('products', 'products', product.id);
  };

  const handleSaveSupplier = async (supplier: Supplier) => {
    setSuppliers(prev => {
      const exists = prev.find(s => s.id === supplier.id);
      if (exists) return prev.map(s => s.id === supplier.id ? supplier : s);
      return [supplier, ...prev];
    });
    await dataService.upsert('suppliers', 'suppliers', supplier, currentUser?.businessId);
  };

  const handleSaveUser = async (user: SystemUser) => {
    setUsers(prev => {
      const exists = prev.find(u => u.id === user.id);
      if (exists) return prev.map(u => u.id === user.id ? user : u);
      return [...prev, user];
    });
    await dataService.upsert('users', 'users', user, currentUser?.businessId);
  };

  const handleTransactionComplete = useCallback(async (newTransactions: Transaction[]) => {
    // 1. Update Transactions State
    setTransactions(prev => [...newTransactions, ...prev]);
    
    // 2. Update Stock State
    const soldMap = new Map<string, number>();
    newTransactions.forEach(tx => {
      soldMap.set(tx.productId!, (soldMap.get(tx.productId!) || 0) + (tx.quantity || 1));
    });

    // Update product stock in memory
    const updatedProducts: Product[] = [];
    setProducts(prevProducts => {
      return prevProducts.map(p => {
        const soldQty = soldMap.get(p.id);
        if (soldQty) {
          const updated = { ...p, stock: Math.max(0, p.stock - soldQty) };
          updatedProducts.push(updated); // Collect for sync
          return updated;
        }
        return p;
      });
    });

    // 3. Persist to Cloud (Queue if offline)
    // Save Transactions
    for (const tx of newTransactions) {
      await dataService.upsert('transactions', 'transactions', tx, currentUser?.businessId);
    }
    // Save Updated Products (Stock)
    for (const p of updatedProducts) {
      await dataService.upsert('products', 'products', p, currentUser?.businessId);
    }
  }, [currentUser]);


  // --- Handlers ---
  const handleOnboardingComplete = useCallback(async (data: OnboardingState) => {
    // Note: Onboarding component handles initial Supabase insertion.
    const adminUser: SystemUser = {
      id: `USR-${Date.now()}`,
      name: data.adminName,
      email: data.adminEmail,
      password: data.adminPassword,
      role: UserRole.ADMIN_PRO,
      status: 'Active',
      lastLogin: new Date(),
      createdAt: new Date()
    };

    setBusinessName(data.businessName);
    setCategories(data.generatedCategories);
    setUsers([adminUser]);
    setSubscriptionPlan(data.selectedPlan);
    
    // Ensure local DB has the initial data
    if (data.generatedProducts && data.generatedProducts.length > 0) {
      setProducts(data.generatedProducts);
      await dbService.saveItems('products', data.generatedProducts);
    }
    
    if (data.selectedPlan === 'STARTER') {
       setTrialStartDate(new Date().toISOString());
    }
    
    setIsSetupComplete(true);
    setCurrentUser(adminUser);
    localStorage.setItem(KEYS.SESSION_USER, adminUser.id);
  }, []);

  const handleLogin = useCallback((email: string, pass: string) => {
    const user = users.find(u => u.email === email && u.password === pass);
    if (user) {
      const updatedUser = { ...user, lastLogin: new Date() };
      // Update local and sync login time
      setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
      dataService.upsert('users', 'users', updatedUser, user.businessId);

      setCurrentUser(updatedUser);
      localStorage.setItem(KEYS.SESSION_USER, user.id);
      
      if (user.role === UserRole.EMPLOYEE) {
        setCurrentView(ViewState.POS);
      } else {
        setCurrentView(ViewState.DASHBOARD);
      }
      return true;
    }
    return false;
  }, [users]);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(KEYS.SESSION_USER);
    setCurrentView(ViewState.DASHBOARD);
  }, []);

  const isTrialExpired = useMemo(() => {
    if (subscriptionPlan === 'STARTER' && trialStartDate) {
      const start = new Date(trialStartDate).getTime();
      const now = new Date().getTime();
      return (now - start) > (5 * 24 * 60 * 60 * 1000);
    }
    return false;
  }, [subscriptionPlan, trialStartDate]);

  const upgradeToProfessional = () => {
    setSubscriptionPlan('PROFESSIONAL');
    setTrialStartDate(null);
  };

  // --- Render ---
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
           <Loader2 size={48} className="text-indigo-600 animate-spin" />
           <p className="text-xs font-black uppercase tracking-widest text-slate-400">Synchronizing Neural Node...</p>
        </div>
      </div>
    );
  }

  if (!isSetupComplete) {
    return <Onboarding onComplete={handleOnboardingComplete} onSwitchToLogin={() => setIsSetupComplete(true)} />;
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLogin} onBack={() => setIsSetupComplete(false)} businessName={businessName} />;
  }

  if (isTrialExpired) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="bg-white border border-slate-200 p-12 rounded-[2.5rem] shadow-2xl max-w-lg text-center space-y-6">
                 <Crown size={48} className="mx-auto text-indigo-600 mb-4" />
                 <h2 className="text-3xl font-black text-slate-900 tracking-tight">Trial Period Ended</h2>
                 <p className="text-slate-500 font-medium">Upgrade to Professional to continue.</p>
                 <button onClick={upgradeToProfessional} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                     Upgrade <ArrowRight size={16} />
                 </button>
            </div>
        </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case ViewState.DASHBOARD: return <Dashboard transactions={transactions} products={products} businessName={businessName} role={currentUser.role} />;
      // Pass centralized handlers to Inventory
      case ViewState.INVENTORY: return <Inventory 
          products={products} 
          setProducts={setProducts} 
          onSaveProduct={handleSaveProduct}
          onDeleteProduct={handleDeleteProduct}
          onSaveSupplier={handleSaveSupplier}
          categories={categories} 
          suppliers={suppliers} 
          setSuppliers={setSuppliers} 
          transactions={transactions} 
          role={currentUser.role} 
        />;
      case ViewState.POS: return <POS products={products} onTransactionComplete={handleTransactionComplete} businessDetails={{ name: businessName, address: "Node Main", contact: currentUser.email, footerMessage: "Official Receipt" }} />;
      case ViewState.REPORTING: return <Reporting transactions={transactions} products={products} />;
      case ViewState.PROMOTER: return <Promoter />;
      case ViewState.SUPPORT: return <Support products={products} transactions={transactions} />;
      case ViewState.SETTINGS: return <Settings 
          integrations={integrations} setIntegrations={setIntegrations} 
          syncLogs={syncLogs} setSyncLogs={setSyncLogs} 
          users={users} setUsers={setUsers} 
          onSaveUser={handleSaveUser}
          subscriptionPlan={subscriptionPlan} 
        />;
      default: return <Dashboard transactions={transactions} products={products} businessName={businessName} role={currentUser.role} />;
    }
  };

  return (
    <ErrorBoundary>
      <RoleShell role={currentUser.role}>
        <Layout currentView={currentView} setView={setCurrentView} role={currentUser.role} businessName={businessName} onLogout={handleLogout} products={products} transactions={transactions} currentUser={currentUser} users={users} subscriptionPlan={subscriptionPlan}>
          {renderView()}
        </Layout>
      </RoleShell>
    </ErrorBoundary>
  );
};

export default App;
