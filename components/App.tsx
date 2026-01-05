
import React, { useState, useEffect, useCallback, useMemo, ReactNode, ErrorInfo } from 'react';
import { Layout } from './Layout';
import { Onboarding } from './Onboarding';
import { Login } from './Login';
import { RoleShell } from './RoleShell';
import { Dashboard } from './Dashboard';
import { Inventory } from './Inventory';
import { POS } from './POS';
import { Reporting } from './Reporting';
import { Promoter } from './Promoter';
import { Support } from './Support';
import { Settings } from './Settings';
import { ViewState, UserRole, OnboardingState, Product, Transaction, Supplier, IntegrationConfig, SyncLog, SystemUser, PlanType, Business } from '../types';
import { Lock, Crown, ArrowRight, AlertTriangle } from 'lucide-react';
import { dbService } from '../services/dbService';
import { dataService } from '../services/dataService';

// --- Error Boundary Component ---
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
          <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-rose-100 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-rose-500"></div>
            <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-rose-500 shadow-xl shadow-rose-100">
              <AlertTriangle size={36} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">System Anomaly</h2>
            <p className="text-slate-500 text-sm mb-8 font-medium leading-relaxed">
              The application encountered a critical runtime error. Diagnostics have been logged to the neural console.
            </p>
            <div className="bg-slate-50 p-5 rounded-2xl text-left mb-8 overflow-auto max-h-32 border border-slate-200 shadow-inner">
               <code className="text-[10px] text-slate-600 font-mono break-all block">{this.state.error?.message}</code>
            </div>
            <button onClick={() => window.location.reload()} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-95 uppercase tracking-widest text-xs">
              Reboot System
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const App: React.FC = () => {
  // --- Constants & Storage ---
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

  const safeJsonParse = <T,>(key: string, fallback: T): T => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : fallback;
    } catch {
      return fallback;
    }
  };

  // --- Core Engine State ---
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(() => 
    localStorage.getItem(KEYS.SETUP) === 'true'
  );
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);

  // --- Business Ledger ---
  // Legacy support: 'businessName' might be used for login display, but real business logic moves to 'businesses' array
  const [businessName, setBusinessName] = useState<string>(() => 
    localStorage.getItem(KEYS.BIZ_NAME) || 'AutoMateSystem Hub'
  );

  const [businesses, setBusinesses] = useState<Business[]>(() => 
    safeJsonParse<Business[]>(KEYS.BUSINESSES, [])
  );

  const [activeBusinessId, setActiveBusinessId] = useState<string>('');

  const [subscriptionPlan, setSubscriptionPlan] = useState<PlanType>(() => 
    (localStorage.getItem(KEYS.PLAN) as PlanType) || 'STARTER'
  );

  const [trialStartDate, setTrialStartDate] = useState<string | null>(() => 
    localStorage.getItem(KEYS.TRIAL_START)
  );
  
  const [categories, setCategories] = useState<string[]>(() => 
    safeJsonParse<string[]>(KEYS.CATS, ['Food', 'Beverage', 'Retail'])
  );

  const [users, setUsers] = useState<SystemUser[]>(() => 
    safeJsonParse<SystemUser[]>(KEYS.USERS, [])
  );

  const [products, setProducts] = useState<Product[]>(() => 
    safeJsonParse<Product[]>(KEYS.PRODUCTS, [])
  );

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => 
    safeJsonParse<Supplier[]>(KEYS.SUPPLIERS, [])
  );
  
  const [transactions, setTransactions] = useState<Transaction[]>(() => 
    safeJsonParse<Transaction[]>(KEYS.TRANSACTIONS, [])
  );

  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(() => 
    safeJsonParse<IntegrationConfig[]>(KEYS.INTEGRATIONS, [
      { id: '1', provider: 'QUICKBOOKS', name: 'QuickBooks', status: 'DISCONNECTED', autoSync: false },
      { id: '2', provider: 'XERO', name: 'Xero', status: 'DISCONNECTED', autoSync: false }
    ])
  );

  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  // --- Initialization & Active Business Logic ---
  useEffect(() => {
    // If setup is complete but businesses array is empty, create initial one from legacy businessName
    if (isSetupComplete && businesses.length === 0) {
      const initialBiz: Business = {
        id: `BIZ-${Date.now()}`,
        name: businessName,
        type: 'General',
        address: 'Main Headquarters',
        isPrimary: true
      };
      setBusinesses([initialBiz]);
      setActiveBusinessId(initialBiz.id);
    } else if (isSetupComplete && businesses.length > 0 && !activeBusinessId) {
      // Find primary or default to first
      const primary = businesses.find(b => b.isPrimary);
      setActiveBusinessId(primary ? primary.id : businesses[0].id);
    }
  }, [isSetupComplete, businesses, businessName, activeBusinessId]);

  // --- Cloud Sync & Data Fetching ---
  useEffect(() => {
    if (isSetupComplete && activeBusinessId) {
      const loadCloudData = async () => {
        try {
          // Attempt to flush offline queue first
          await dataService.syncPending();

          const [fetchedProducts, fetchedTransactions, fetchedSuppliers, fetchedUsers] = await Promise.all([
            dataService.fetch<Product>('products', 'products', activeBusinessId),
            dataService.fetch<Transaction>('transactions', 'transactions', activeBusinessId),
            dataService.fetch<Supplier>('suppliers', 'suppliers', activeBusinessId),
            dataService.fetch<SystemUser>('users', 'users', activeBusinessId)
          ]);

          if (fetchedProducts) setProducts(fetchedProducts);
          if (fetchedTransactions) setTransactions(fetchedTransactions);
          if (fetchedSuppliers) setSuppliers(fetchedSuppliers);
          // Only update users if we have cloud data, otherwise keep legacy local users
          if (fetchedUsers && fetchedUsers.length > 0) setUsers(fetchedUsers); 
        } catch (error) {
          console.error("Failed to sync with cloud:", error);
        }
      };
      loadCloudData();
      
      // Setup listener for online status to trigger sync
      const handleOnline = () => dataService.syncPending();
      window.addEventListener('online', handleOnline);
      return () => window.removeEventListener('online', handleOnline);
    }
  }, [isSetupComplete, activeBusinessId]);

  // Derived Active Business Object
  const activeBusiness = useMemo(() => 
    businesses.find(b => b.id === activeBusinessId) || businesses[0] || { id: 'temp', name: 'Loading...', address: '', type: 'General' }
  , [businesses, activeBusinessId]);

  // Filtered Data based on Active Business
  // Logic: Match businessId OR if businessId is missing/undefined, associate with the first business (Legacy compatibility)
  const currentProducts = useMemo(() => {
    if (!activeBusinessId) return [];
    return products.filter(p => p.businessId === activeBusinessId || (!p.businessId && activeBusinessId === businesses[0]?.id));
  }, [products, activeBusinessId, businesses]);

  const currentTransactions = useMemo(() => {
    if (!activeBusinessId) return [];
    return transactions.filter(t => t.businessId === activeBusinessId || (!t.businessId && activeBusinessId === businesses[0]?.id));
  }, [transactions, activeBusinessId, businesses]);

  // --- Session Persistence ---
  useEffect(() => {
    const sessionId = localStorage.getItem(KEYS.SESSION_USER);
    if (sessionId && isSetupComplete && users.length > 0) {
      const user = users.find(u => u.id === sessionId);
      if (user) {
        setCurrentUser(user);
        if (user.role === UserRole.EMPLOYEE) {
           setCurrentView(prev => (prev === ViewState.DASHBOARD || prev === ViewState.SUPPORT) ? ViewState.POS : prev);
        }
      }
    }
  }, [isSetupComplete, users]);

  // --- Local Storage Backup Layer ---
  useEffect(() => {
    if (!isSetupComplete) return;
    localStorage.setItem(KEYS.SETUP, 'true');
    localStorage.setItem(KEYS.BIZ_NAME, businessName);
    localStorage.setItem(KEYS.BUSINESSES, JSON.stringify(businesses));
    localStorage.setItem(KEYS.CATS, JSON.stringify(categories));
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
    localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
    localStorage.setItem(KEYS.INTEGRATIONS, JSON.stringify(integrations));
    localStorage.setItem(KEYS.PLAN, subscriptionPlan);
    if (trialStartDate) {
      localStorage.setItem(KEYS.TRIAL_START, trialStartDate);
    } else {
      localStorage.removeItem(KEYS.TRIAL_START);
    }
  }, [isSetupComplete, businessName, businesses, categories, users, products, suppliers, transactions, integrations, subscriptionPlan, trialStartDate]);

  // --- Handlers ---
  const handleOnboardingComplete = useCallback(async (data: OnboardingState) => {
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
    
    const newBusiness: Business = {
      id: `BIZ-${Date.now()}`,
      name: data.businessName,
      type: data.businessType,
      address: 'Main Headquarters',
      contactEmail: data.adminEmail,
      isPrimary: true
    };
    setBusinesses([newBusiness]);
    setActiveBusinessId(newBusiness.id);

    setCategories(data.generatedCategories);
    setUsers([adminUser]);
    setSubscriptionPlan(data.selectedPlan);
    
    // Initial Products with Business ID
    const initialProducts = (data.generatedProducts || []).map(p => ({ ...p, businessId: newBusiness.id }));
    setProducts(initialProducts);
    
    // Persist to Cloud & Local via DataService
    await Promise.all([
      dataService.upsert('users', 'users', adminUser, newBusiness.id),
      dataService.upsertMany('products', 'products', initialProducts)
    ]);
    
    if (data.selectedPlan === 'STARTER') {
       const now = new Date().toISOString();
       localStorage.setItem(KEYS.TRIAL_START, now);
       setTrialStartDate(now);
    } else {
       localStorage.removeItem(KEYS.TRIAL_START);
       setTrialStartDate(null);
    }
    
    setIsSetupComplete(true);
    setCurrentUser(adminUser);
    localStorage.setItem(KEYS.SESSION_USER, adminUser.id);
  }, []);

  const handleLogin = useCallback(async (email: string, pass: string) => {
    // 1. Local Authentication Check
    let user = users.find(u => u.email === email && u.password === pass);

    // 2. Cloud Authentication Check (Restore Mode)
    if (!user) {
       const result = await dataService.authenticate(email, pass);
       if (result && result.user) {
          // Map Cloud User to SystemUser
          const cloudUser = result.user;
          user = {
            id: cloudUser.id,
            businessId: cloudUser.business_id, // Map snake to camel
            name: cloudUser.name,
            email: cloudUser.email,
            password: cloudUser.password, // In real app, this would be a token
            role: cloudUser.role as UserRole,
            status: cloudUser.status,
            avatar: cloudUser.avatar,
            createdAt: cloudUser.created_at ? new Date(cloudUser.created_at) : undefined,
          };

          // Bootstrap Business Data if retrieved
          if (result.business) {
             const cloudBiz = result.business;
             const business: Business = {
                id: cloudBiz.id,
                name: cloudBiz.name,
                type: cloudBiz.type,
                address: cloudBiz.address,
                contactEmail: cloudBiz.contact_email,
                phone: cloudBiz.phone,
                isPrimary: cloudBiz.is_primary,
                tin: cloudBiz.tin,
                receiptFooter: cloudBiz.receipt_footer
             };
             
             // Update State immediately to unblock view
             setBusinesses(prev => {
                const exists = prev.find(b => b.id === business.id);
                return exists ? prev : [business, ...prev];
             });
             if (business.isPrimary || !activeBusinessId) {
                setBusinessName(business.name);
                setActiveBusinessId(business.id);
             }
          }
          
          // Add verified user to local state and persistence
          setUsers(prev => [...prev.filter(u => u.id !== user!.id), user!]);
          await dbService.saveItems('users', [user]);
       }
    }

    if (user) {
      const updatedUser = { ...user, lastLogin: new Date() };
      setUsers(prevUsers => prevUsers.map(u => u.id === user!.id ? updatedUser : u));
      setCurrentUser(updatedUser);
      
      // Update last login in cloud
      await dataService.upsert('users', 'users', updatedUser, updatedUser.businessId);
      
      localStorage.setItem(KEYS.SESSION_USER, user.id);
      
      if (user.role === UserRole.EMPLOYEE) {
        setCurrentView(ViewState.POS);
      } else {
        setCurrentView(ViewState.DASHBOARD);
      }
      return true;
    }
    return false;
  }, [users, activeBusinessId]);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(KEYS.SESSION_USER);
    setCurrentView(ViewState.DASHBOARD);
  }, []);

  const handleSaveBusiness = async (business: Business) => {
    setBusinesses(prev => {
      const exists = prev.find(b => b.id === business.id);
      let updated;
      if (exists) {
        updated = prev.map(b => b.id === business.id ? business : b);
      } else {
        updated = [...prev, business];
        // If it's a new business and we only had one (or none), switch to it automatically? 
        if (prev.length === 0) setActiveBusinessId(business.id);
      }
      
      // Update global legacy businessName if editing primary
      if (business.isPrimary || (exists && businessName === exists.name)) {
        setBusinessName(business.name);
      }
      
      return updated;
    });
    // Note: Business syncing logic would go here if businesses table is standardized
  };

  const handleSwitchBusiness = (id: string) => {
    setActiveBusinessId(id);
  };

  // --- CRUD Wrappers for Inventory/POS to inject Business ID ---

  const handleTransactionComplete = useCallback(async (newTransactions: Transaction[]) => {
    // Inject active business ID into transactions
    const taggedTransactions = newTransactions.map(t => ({ ...t, businessId: activeBusinessId }));
    
    setTransactions(prev => [...taggedTransactions, ...prev]);
    
    // Persist Transactions
    await dataService.upsertMany('transactions', 'transactions', taggedTransactions);

    // Update stock levels
    const updatedProducts: Product[] = [];
    setProducts(prevProducts => {
      const soldMap = new Map<string, number>();
      taggedTransactions.forEach(tx => {
        const product = prevProducts.find(p => p.id === tx.productId || p.name === tx.product);
        if (product) {
          const currentSold = soldMap.get(product.id) || 0;
          soldMap.set(product.id, currentSold + (tx.quantity || 1));
        }
      });
      
      return prevProducts.map(p => {
        const soldQty = soldMap.get(p.id);
        if (soldQty !== undefined) {
           const newStock = Math.max(0, p.stock - soldQty);
           const updated = { ...p, stock: newStock };
           updatedProducts.push(updated);
           return updated;
        }
        return p;
      });
    });

    // Persist Product Updates
    if (updatedProducts.length > 0) {
      await dataService.upsertMany('products', 'products', updatedProducts);
    }

  }, [activeBusinessId]);

  const handleSaveProduct = async (product: Product) => {
    const productToSave = { ...product, businessId: activeBusinessId };
    setProducts(prev => {
        const exists = prev.find(p => p.id === productToSave.id);
        if (exists) return prev.map(p => p.id === productToSave.id ? productToSave : p);
        return [productToSave, ...prev];
    });
    // Persist to Cloud & Local
    await dataService.upsert('products', 'products', productToSave, activeBusinessId);
  };

  const handleDeleteProduct = async (product: Product) => {
    setProducts(prev => prev.filter(p => p.id !== product.id));
    // Remove from Cloud & Local
    await dataService.delete('products', 'products', product.id);
  };

  const handleSaveSupplier = async (supplier: Supplier) => {
     const supplierToSave = { ...supplier, businessId: activeBusinessId };
     setSuppliers(prev => {
        const exists = prev.find(s => s.id === supplier.id);
        if (exists) return prev.map(s => s.id === supplier.id ? supplierToSave : s);
        return [supplierToSave, ...prev];
     });
     // Persist to Cloud & Local
     await dataService.upsert('suppliers', 'suppliers', supplierToSave, activeBusinessId);
  };

  // --- Trial Logic ---
  const isTrialExpired = useMemo(() => {
    if (subscriptionPlan === 'STARTER' && trialStartDate) {
      const start = new Date(trialStartDate).getTime();
      const now = new Date().getTime();
      const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000;
      return (now - start) > fiveDaysInMs;
    }
    return false;
  }, [subscriptionPlan, trialStartDate]);

  const upgradeToProfessional = () => {
    setSubscriptionPlan('PROFESSIONAL');
    localStorage.setItem(KEYS.PLAN, 'PROFESSIONAL');
    localStorage.removeItem(KEYS.TRIAL_START);
    setTrialStartDate(null);
  };

  // --- Render Logic ---
  if (!isSetupComplete) {
    return <Onboarding onComplete={handleOnboardingComplete} onSwitchToLogin={() => setIsSetupComplete(true)} />;
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLogin} onBack={() => setIsSetupComplete(false)} businessName={activeBusiness.name} />;
  }

  if (isTrialExpired) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="bg-white border border-slate-200 p-12 rounded-[2.5rem] shadow-2xl max-w-lg text-center space-y-6 relative overflow-hidden animate-in zoom-in-95">
                 <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                 <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto text-indigo-600 mb-4 shadow-xl shadow-indigo-100">
                     <Crown size={48} />
                 </div>
                 <h2 className="text-3xl font-black text-slate-900 tracking-tight">Trial Period Ended</h2>
                 <p className="text-slate-500 font-medium leading-relaxed">
                     Your 5-day Starter trial has concluded. To continue accessing your AutoMate™ intelligence node and data, please upgrade to the Professional plan.
                 </p>
                 <div className="pt-6">
                     <button onClick={upgradeToProfessional} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs active:scale-95">
                         Upgrade to Professional <ArrowRight size={16} />
                     </button>
                     <p className="mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                       <Lock size={12}/> Secure Payment Processing
                     </p>
                 </div>
            </div>
        </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard transactions={currentTransactions} products={currentProducts} businessName={activeBusiness.name} role={currentUser.role} />;
      case ViewState.INVENTORY:
        return <Inventory 
          products={currentProducts} 
          setProducts={setProducts} // Legacy prop, kept but logic overridden by onSaveProduct
          onSaveProduct={handleSaveProduct}
          onDeleteProduct={handleDeleteProduct}
          categories={categories} 
          suppliers={suppliers} 
          setSuppliers={setSuppliers} // Legacy
          onSaveSupplier={handleSaveSupplier}
          transactions={currentTransactions} 
          role={currentUser.role} 
        />;
      case ViewState.POS:
        return <POS 
          products={currentProducts} 
          onTransactionComplete={handleTransactionComplete} 
          businessDetails={{ 
            name: activeBusiness.name, 
            address: activeBusiness.address || 'Main Node', 
            contact: activeBusiness.phone || activeBusiness.contactEmail || currentUser.email, 
            footerMessage: activeBusiness.receiptFooter || "Official Receipt" 
          }} 
        />;
      case ViewState.REPORTING:
        return <Reporting transactions={currentTransactions} products={currentProducts} />;
      case ViewState.PROMOTER:
        return <Promoter />;
      case ViewState.SUPPORT:
        return <Support products={currentProducts} transactions={currentTransactions} />;
      case ViewState.SETTINGS:
        return <Settings 
          integrations={integrations} 
          setIntegrations={setIntegrations} 
          syncLogs={syncLogs} 
          setSyncLogs={setSyncLogs} 
          users={users} 
          setUsers={setUsers}
          subscriptionPlan={subscriptionPlan}
          businesses={businesses}
          onSaveBusiness={handleSaveBusiness}
          activeBusinessId={activeBusinessId}
          onSwitchBusiness={handleSwitchBusiness}
        />;
      default:
        return <Dashboard transactions={currentTransactions} products={currentProducts} businessName={activeBusiness.name} role={currentUser.role} />;
    }
  };

  return (
    <RoleShell role={currentUser.role}>
      <Layout 
        currentView={currentView} 
        setView={setCurrentView} 
        role={currentUser.role} 
        businessName={activeBusiness.name} 
        onLogout={handleLogout}
        products={currentProducts}
        transactions={currentTransactions}
        currentUser={currentUser}
        users={users}
        subscriptionPlan={subscriptionPlan}
      >
        {renderContent()}
      </Layout>
    </RoleShell>
  );
};

export default App;
