
import React, { Component, useState, useEffect, useCallback, useMemo, ReactNode, ErrorInfo } from 'react';
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
import { ViewState, UserRole, OnboardingState, Product, Transaction, Supplier, IntegrationConfig, SyncLog, SystemUser, PlanType, Business, Referral } from '../types';
import { Crown, AlertTriangle, Loader2, Copy, Check } from 'lucide-react';
import { dbService } from '../services/dbService';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabaseClient';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

/**
 * ErrorBoundary implementation for the app shell.
 * Fixed: Explicitly extend from Component and properly initialize state in constructor.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      copied: false
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, copied: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleCopyError = () => {
    const { error } = this.state;
    if (error) {
      navigator.clipboard.writeText(`${error.name}: ${error.message}\n${error.stack}`);
      // Fixed: inherited setState from Component is now correctly called.
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

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
            <div className="bg-slate-50 p-5 rounded-2xl text-left mb-6 overflow-auto max-h-32 border border-slate-200 shadow-inner group">
               <code className="text-[10px] text-slate-600 font-mono break-all block">{this.state.error?.message}</code>
            </div>
            <div className="flex gap-3">
              <button onClick={this.handleCopyError} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                {this.state.copied ? <Check size={14}/> : <Copy size={14}/>} {this.state.copied ? 'Copied' : 'Copy Log'}
              </button>
              <button onClick={() => window.location.reload()} className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-95 uppercase tracking-widest text-[10px]">
                Reboot System
              </button>
            </div>
          </div>
        </div>
      );
    }
    // Fixed: Accessed via this.props.
    return this.props.children;
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

  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(() => 
    localStorage.getItem(KEYS.SETUP) === 'true'
  );
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
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
  const [referrals, setReferrals] = useState<Referral[]>([]);

  // Global Error Trap for Async Operations
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled Promise Rejection:", event.reason);
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  useEffect(() => {
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
      const primary = businesses.find(b => b.isPrimary);
      setActiveBusinessId(primary ? primary.id : businesses[0].id);
    }
  }, [isSetupComplete, businesses, businessName, activeBusinessId]);

  useEffect(() => {
    if (isSetupComplete && activeBusinessId) {
      const loadCloudData = async () => {
        try {
          await dataService.syncPending();
          const [fetchedProducts, fetchedTransactions, fetchedSuppliers, fetchedUsers, fetchedReferrals] = await Promise.all([
            dataService.fetch<Product>('products', 'products', activeBusinessId),
            dataService.fetch<Transaction>('transactions', 'transactions', activeBusinessId),
            dataService.fetch<Supplier>('suppliers', 'suppliers', activeBusinessId),
            dataService.fetch<SystemUser>('users', 'users', activeBusinessId),
            dataService.fetch<Referral>('referrals', 'referrals', activeBusinessId)
          ]);
          if (fetchedProducts) setProducts(fetchedProducts);
          if (fetchedTransactions) setTransactions(fetchedTransactions);
          if (fetchedSuppliers) setSuppliers(fetchedSuppliers);
          if (fetchedUsers && fetchedUsers.length > 0) setUsers(fetchedUsers); 
          if (fetchedReferrals) setReferrals(fetchedReferrals);
        } catch (error) {
          console.error("Failed to sync with cloud:", error);
        }
      };
      loadCloudData();
      
      // Fixed: subscribeToChanges is now implemented in dataService.
      const channels = dataService.subscribeToChanges(
        ['products', 'transactions', 'suppliers', 'users', 'referrals'], 
        activeBusinessId, 
        (change) => {
           if (change.table === 'products') {
              setProducts(prev => {
                 if (change.event === 'DELETE') return prev.filter(p => p.id !== change.data.id);
                 const exists = prev.find(p => p.id === change.data.id);
                 return exists ? prev.map(p => p.id === change.data.id ? change.data : p) : [change.data, ...prev];
              });
           } else if (change.table === 'transactions') {
              setTransactions(prev => {
                 if (change.event === 'DELETE') return prev.filter(t => t.id !== change.data.id);
                 const exists = prev.find(t => t.id === change.data.id);
                 return exists ? prev.map(t => t.id === change.data.id ? change.data : t) : [change.data, ...prev];
              });
           } else if (change.table === 'suppliers') {
              setSuppliers(prev => {
                 if (change.event === 'DELETE') return prev.filter(s => s.id !== change.data.id);
                 const exists = prev.find(s => s.id === change.data.id);
                 return exists ? prev.map(s => s.id === change.data.id ? change.data : s) : [change.data, ...prev];
              });
           } else if (change.table === 'users') {
              setUsers(prev => {
                 if (change.event === 'DELETE') return prev.filter(u => u.id !== change.data.id);
                 const exists = prev.find(u => u.id === change.data.id);
                 return exists ? prev.map(u => u.id === change.data.id ? change.data : u) : [change.data, ...prev];
              });
           } else if (change.table === 'referrals') {
              setReferrals(prev => {
                 if (change.event === 'DELETE') return prev.filter(r => r.id !== change.data.id);
                 const exists = prev.find(r => r.id === change.data.id);
                 return exists ? prev.map(r => r.id === change.data.id ? change.data : r) : [change.data, ...prev];
              });
           }
        }
      );
      
      const handleOnline = () => dataService.syncPending();
      window.addEventListener('online', handleOnline);
      return () => {
        window.removeEventListener('online', handleOnline);
        channels.forEach(c => supabase.removeChannel(c));
      };
    }
  }, [isSetupComplete, activeBusinessId]);

  const activeBusiness = useMemo(() => 
    businesses.find(b => b.id === activeBusinessId) || businesses[0] || { id: 'temp', name: 'Loading...', address: '', type: 'General' }
  , [businesses, activeBusinessId]);

  const currentProducts = useMemo(() => {
    if (!activeBusinessId) return [];
    return products.filter(p => p.businessId === activeBusinessId);
  }, [products, activeBusinessId]);

  const currentSuppliers = useMemo(() => {
    if (!activeBusinessId) return [];
    return suppliers.filter(s => (s as any).businessId === activeBusinessId);
  }, [suppliers, activeBusinessId]);

  const currentTransactions = useMemo(() => {
    if (!activeBusinessId) return [];
    return transactions.filter(t => t.businessId === activeBusinessId);
  }, [transactions, activeBusinessId]);

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
    if (trialStartDate) localStorage.setItem(KEYS.TRIAL_START, trialStartDate);
    else localStorage.removeItem(KEYS.TRIAL_START);
  }, [isSetupComplete, businessName, businesses, categories, users, products, suppliers, transactions, integrations, subscriptionPlan, trialStartDate]);

  const handleOnboardingComplete = useCallback(async (data: OnboardingState) => {
    const bizId = `BIZ-${Date.now()}`;
    const newBusiness: Business = {
      id: bizId,
      name: data.businessName,
      type: data.businessType,
      address: 'Main Headquarters',
      contactEmail: data.adminEmail,
      isPrimary: true
    };

    const adminUser: SystemUser = {
      id: `USR-${Date.now()}`,
      businessId: bizId,
      name: data.adminName,
      email: data.adminEmail,
      password: data.adminPassword,
      role: UserRole.ADMIN_PRO,
      status: 'Active',
      lastLogin: new Date(),
      createdAt: new Date()
    };

    const initialProducts = (data.generatedProducts || []).map(p => ({ ...p, businessId: bizId }));

    await dataService.upsert('businesses', 'businesses', newBusiness);
    await Promise.all([
      dataService.upsert('users', 'users', adminUser, bizId),
      dataService.upsertMany('products', 'products', initialProducts)
    ]);

    setBusinessName(data.businessName);
    setBusinesses([newBusiness]);
    setActiveBusinessId(bizId);
    setCategories(data.generatedCategories);
    setUsers([adminUser]);
    setSubscriptionPlan(data.selectedPlan);
    setProducts(initialProducts);
    
    if (data.selectedPlan === 'STARTER') {
       const now = new Date().toISOString();
       localStorage.setItem(KEYS.TRIAL_START, now);
       setTrialStartDate(now);
    }
    
    setIsSetupComplete(true);
    setCurrentUser(adminUser);
    localStorage.setItem(KEYS.SESSION_USER, adminUser.id);
  }, []);

  const handleLogin = useCallback(async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    let user = users.find(u => u.email === email && u.password === pass);
    if (!user) {
       const response = await dataService.authenticate(email, pass);
       if (response.success && response.data?.user) {
          user = response.data.user;
          const biz = response.data.business;
          if (biz) {
             setBusinesses(prev => { const exists = prev.find(b => b.id === biz.id); return exists ? prev : [biz, ...prev]; });
             if (biz.isPrimary || !activeBusinessId) { setBusinessName(biz.name); setActiveBusinessId(biz.id); }
          }
          setUsers(prev => [...prev.filter(u => u.id !== user!.id), user!]);
          setCurrentUser(user);
          localStorage.setItem(KEYS.SESSION_USER, user.id);
          return { success: true };
       }
       else return { success: false, error: response.error || 'Identity not verified' };
    }
    if (user && user.status === 'Active') { 
      setCurrentUser(user); 
      localStorage.setItem(KEYS.SESSION_USER, user.id); 
      setCurrentView(user.role === UserRole.EMPLOYEE ? ViewState.POS : ViewState.DASHBOARD); 
      return { success: true }; 
    }
    return { success: false, error: "Account access limited." };
  }, [users, activeBusinessId]);

  // Logic for the rest of the component...
