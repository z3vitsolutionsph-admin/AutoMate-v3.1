import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { ViewState, UserRole, OnboardingState, Product, Transaction, Supplier, IntegrationConfig, SyncLog, SystemUser, PlanType } from '../types';
import { Crown, ArrowRight, Lock } from 'lucide-react';

const App: React.FC = () => {
  // --- Constants & Storage ---
  const STORAGE_PREFIX = 'automate_v3_';
  const KEYS = {
    SETUP: `${STORAGE_PREFIX}setup`,
    BIZ_NAME: `${STORAGE_PREFIX}biz_name`,
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
  }, [isSetupComplete, businessName, categories, users, products, suppliers, transactions, integrations, subscriptionPlan, trialStartDate]);

  // --- Handlers ---
  const handleOnboardingComplete = useCallback((data: OnboardingState) => {
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
    
    // Set Trial Start if Starter Plan
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

  const handleLogin = useCallback((email: string, pass: string) => {
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
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLogin} businessName={businessName} />;
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
      >
        {renderContent()}
      </Layout>
    </RoleShell>
  );
};

export default App;