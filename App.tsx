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
import { ViewState, UserRole, OnboardingState, Product, Transaction, Supplier, IntegrationConfig, SyncLog, SystemUser, PlanType, Business } from './types';
import { Lock, Crown, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react';
import { dbService } from './services/dbService';
import { dataService } from './services/dataService';

// --- Error Boundary Component ---
// Explicitly define State and Props interfaces to resolve TS property access errors
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Fix: Use React.Component to ensure this.props and this.state are correctly typed in all TS environments.
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
    // Access state directly from this.state
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
    // Access props directly from this.props - using a type assertion to resolve compiler discrepancy where 'props' is not found on type 'ErrorBoundary'
    return (this as any).props.children;
  }
}

const App: React.FC = () => {
  // --- Constants & Storage ---
  const STORAGE_PREFIX = 'automate_v3_';
  const KEYS = {
    SETUP: `${STORAGE_PREFIX}setup`,
    BIZ_NAME: `${STORAGE_PREFIX}biz_name`, // Legacy single name
    BUSINESSES: `${STORAGE_PREFIX}businesses`, // New array
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
  const [businessName, setBusinessName] = useState<string>(() => 
    localStorage.getItem(KEYS.BIZ_NAME) || 'AutoMateSystem Hub'
  );

  // New: Multiple Businesses State
  const [businesses, setBusinesses] = useState<Business[]>(() => 
    safeJsonParse<Business[]>(KEYS.BUSINESSES, [])
  );

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

  // --- Initialization & Migration ---
  useEffect(() => {
    // If setup is complete but businesses array is empty, create initial one from legacy businessName
    if (isSetupComplete && businesses.length === 0) {
      const initialBiz: Business = {
        id: `BIZ-${Date.now()}`,
        name: businessName,
        type: 'General', // Default
        address: 'Main Headquarters',
        isPrimary: true
      };
      setBusinesses([initialBiz]);
    }
  }, [isSetupComplete, businesses.length, businessName]);

  // --- Session Persistence ---
  useEffect(() => {
    const sessionId = localStorage.getItem(KEYS.SESSION_USER);
    if (sessionId && isSetupComplete && users.length > 0) {
      const user = users.find(u => u.id === sessionId);
      if (user) {
        setCurrentUser(user);
        // If restoring session for employee, ensure they land on POS if they were on a restricted page
        if (user.role === UserRole.EMPLOYEE) {
           setCurrentView(prev => (prev === ViewState.DASHBOARD || prev === ViewState.SUPPORT) ? ViewState.POS : prev);
        }
      }
    }
  }, [isSetupComplete, users]);

  // --- Data Sync Layer ---
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
    
    // Initialize Business Array
    const newBusiness: Business = {
      id: `BIZ-${Date.now()}`,
      name: data.businessName,
      type: data.businessType,
      address: 'Main Headquarters',
      contactEmail: data.adminEmail,
      isPrimary: true
    };
    setBusinesses([newBusiness]);

    setCategories(data.generatedCategories);
    setUsers([adminUser]);
    setSubscriptionPlan(data.selectedPlan);
    
    // Persist Initial Data to IndexedDB
    await dbService.saveItems('users', [adminUser]);
    if (data.generatedProducts && data.generatedProducts.length > 0) {
      setProducts(data.generatedProducts);
      await dbService.saveItems('products', data.generatedProducts);
    }
    
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
    const user = users.find(u => u.email === email && u.password === pass);
    if (user) {
      const updatedUser = { ...user, lastLogin: new Date() };
      setUsers(prevUsers => prevUsers.map(u => u.id === user.id ? updatedUser : u));
      setCurrentUser(updatedUser);
      localStorage.setItem(KEYS.SESSION_USER, user.id);
      
      // Auto-redirect Employees to POS/Terminal
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

  const handleSaveBusiness = async (business: Business) => {
    setBusinesses(prev => {
      const exists = prev.find(b => b.id === business.id);
      let updated;
      if (exists) {
        updated = prev.map(b => b.id === business.id ? business : b);
      } else {
        updated = [...prev, business];
      }
      
      // If updating the primary or currently active business name, sync it
      if (business.isPrimary || (exists && businessName === exists.name)) {
        setBusinessName(business.name);
      }
      
      return updated;
    });
  };

  const handleTransactionComplete = useCallback((newTransactions: Transaction[]) => {
    setTransactions(prev => [...newTransactions, ...prev]);
    setProducts(prevProducts => {
      const soldMap = new Map<string, number>();
      newTransactions.forEach(tx => {
        const product = prevProducts.find(p => p.id === tx.productId || p.name === tx.product);
        if (product) {
          const currentSold = soldMap.get(product.id) || 0;
          soldMap.set(product.id, currentSold + (tx.quantity || 1));
        }
      });
      return prevProducts.map(p => {
        const soldQty = soldMap.get(p.id);
        if (soldQty) return { ...p, stock: Math.max(0, p.stock - soldQty) };
        return p;
      });
    });
  }, []);

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
    return <Login onLoginSuccess={handleLogin} onBack={() => setIsSetupComplete(false)} businessName={businessName} />;
  }

  // Blocking Modal for Expired Trial
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
        return <Dashboard transactions={transactions} products={products} businessName={businessName} role={currentUser.role} />;
      case ViewState.INVENTORY:
        return <Inventory products={products} setProducts={setProducts} categories={categories} suppliers={suppliers} setSuppliers={setSuppliers} transactions={transactions} role={currentUser.role} />;
      case ViewState.POS:
        return <POS products={products} onTransactionComplete={handleTransactionComplete} businessDetails={{ name: businessName, address: "Node Main", contact: currentUser.email, footerMessage: "Official Receipt" }} />;
      case ViewState.REPORTING:
        return <Reporting transactions={transactions} products={products} />;
      case ViewState.PROMOTER:
        return <Promoter />;
      case ViewState.SUPPORT:
        return <Support products={products} transactions={transactions} />;
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
        />;
      default:
        return <Dashboard transactions={transactions} products={products} businessName={businessName} role={currentUser.role} />;
    }
  };

  return (
    <RoleShell role={currentUser.role}>
      <Layout 
        currentView={currentView} 
        setView={setCurrentView} 
        role={currentUser.role} 
        businessName={businessName} 
        onLogout={handleLogout}
        products={products}
        transactions={transactions}
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