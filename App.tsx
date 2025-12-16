
import React, { useState, useEffect, useCallback } from 'react';
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
import { SystemTutorial } from './components/SystemTutorial';
import { ViewState, UserRole, OnboardingState, Product, Transaction, Supplier } from './types';

const App: React.FC = () => {
  // --- Constants & Storage Keys ---
  const STORAGE_KEY_SETUP = 'automate_is_setup';
  const STORAGE_KEY_BIZ_NAME = 'automate_biz_name';
  const STORAGE_KEY_CATS = 'automate_categories';
  const STORAGE_KEY_PRODUCTS = 'automate_products';
  const STORAGE_KEY_SUPPLIERS = 'automate_suppliers';
  const STORAGE_KEY_TRANSACTIONS = 'automate_transactions';
  const STORAGE_KEY_TUTORIAL = 'automate_tutorial_seen';

  // --- Helper: Safe JSON Parsing ---
  const safeJsonParse = <T,>(key: string, fallback: T): T => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : fallback;
    } catch (error) {
      console.warn(`Data recovery: Resetting ${key} to default.`);
      return fallback;
    }
  };

  // --- State Initialization ---
  
  // System State
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(() => 
    localStorage.getItem(STORAGE_KEY_SETUP) === 'true'
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [showTutorial, setShowTutorial] = useState(false);
  const userRole = UserRole.ADMIN_PRO; // Configurable role for demo

  // Business Data
  const [businessName, setBusinessName] = useState<string>(() => 
    localStorage.getItem(STORAGE_KEY_BIZ_NAME) || 'AutoMateSystem Store'
  );
  
  const [categories, setCategories] = useState<string[]>(() => 
    safeJsonParse<string[]>(STORAGE_KEY_CATS, ['General', 'Electronics', 'Food & Beverage', 'Services'])
  );

  const [products, setProducts] = useState<Product[]>(() => 
    safeJsonParse<Product[]>(STORAGE_KEY_PRODUCTS, [
      { id: '1', name: 'Signature Coffee Blend', sku: 'BVG-001', category: 'Food & Beverage', price: 180, stock: 50, supplier: 'BeanSource Inc', description: 'Premium arabica dark roast' },
      { id: '2', name: 'Wireless POS Terminal', sku: 'EQP-102', category: 'Electronics', price: 12500, stock: 5, supplier: 'TechSolutions Ltd', description: 'Handheld payment device' },
      { id: '3', name: 'Thermal Receipt Paper', sku: 'SUP-203', category: 'General', price: 45, stock: 200, supplier: 'Office Depot', description: '80mm x 80m rolls' },
      { id: '4', name: 'Maintenance Service', sku: 'SRV-004', category: 'Services', price: 1500, stock: 999, supplier: 'Internal', description: 'Monthly system checkup' }
    ])
  );

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => 
    safeJsonParse<Supplier[]>(STORAGE_KEY_SUPPLIERS, [
      { id: '1', name: 'BeanSource Inc', contactPerson: 'Jim Bean', email: 'orders@beansource.com', phone: '0917-555-0001', address: 'BGC, Taguig City' },
      { id: '2', name: 'TechSolutions Ltd', contactPerson: 'Sarah Tech', email: 'support@techsol.ph', phone: '0918-123-4567', address: 'Ortigas Center, Pasig' },
      { id: '3', name: 'Office Depot', contactPerson: 'Sales Dept', email: 'b2b@officedepot.ph', phone: '02-8888-7777', address: 'Makati Ave, Makati' }
    ])
  );
  
  const [transactions, setTransactions] = useState<Transaction[]>(() => 
    safeJsonParse<Transaction[]>(STORAGE_KEY_TRANSACTIONS, [])
  );

  // --- Effects ---

  // Auto-redirect logic based on setup status
  useEffect(() => {
    if (isSetupComplete) {
       // Setup is done, require login.
       setIsAuthenticated(false); 
    }
  }, [isSetupComplete]);

  // Data Persistence Effect
  useEffect(() => {
    if (isSetupComplete) {
      const dataToSave = {
        [STORAGE_KEY_SETUP]: 'true',
        [STORAGE_KEY_BIZ_NAME]: businessName,
        [STORAGE_KEY_CATS]: JSON.stringify(categories),
        [STORAGE_KEY_PRODUCTS]: JSON.stringify(products),
        [STORAGE_KEY_SUPPLIERS]: JSON.stringify(suppliers),
        [STORAGE_KEY_TRANSACTIONS]: JSON.stringify(transactions)
      };

      Object.entries(dataToSave).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, value);
        } catch (e) {
          console.error(`Failed to save ${key}`, e);
        }
      });
    }
  }, [isSetupComplete, businessName, categories, products, suppliers, transactions]);

  // Check and trigger tutorial
  useEffect(() => {
    if (isAuthenticated && isSetupComplete) {
      const seen = localStorage.getItem(STORAGE_KEY_TUTORIAL);
      if (!seen) {
        setShowTutorial(true);
      }
    }
  }, [isAuthenticated, isSetupComplete]);

  // --- Handlers ---

  const handleOnboardingComplete = useCallback((data: OnboardingState) => {
    setBusinessName(data.businessName);
    setCategories(data.generatedCategories);

    // Generate specific starter products based on business type
    const starterProducts: Product[] = data.generatedCategories.slice(0, 3).map((cat, idx) => ({
      id: `INIT-${idx + 100}`,
      name: `Starter ${cat} Item`,
      sku: `START-00${idx + 1}`,
      category: cat,
      price: (idx + 1) * 500,
      stock: 20 * (idx + 1),
      description: 'Automatically generated starter item.',
      supplier: 'Initial Setup'
    }));

    setProducts(prev => [...starterProducts, ...prev]);
    setIsSetupComplete(true);
    setIsAuthenticated(true); // Smooth transition: Auto-login after setup
  }, []);

  const handleTransactionComplete = useCallback((newTransactions: Transaction[]) => {
    // 1. Record Transactions
    setTransactions(prev => [...newTransactions, ...prev]);
    
    // 2. Update Inventory Stocks
    setProducts(prevProducts => {
      // Create a map of sold quantities to optimize lookup
      const soldMap = new Map<string, number>();
      
      newTransactions.forEach(tx => {
        // Assuming 'product' in transaction matches 'name' in product list. 
        // In a real app, use IDs for stability.
        const currentSold = soldMap.get(tx.product) || 0;
        soldMap.set(tx.product, currentSold + (tx.quantity || 1));
      });

      return prevProducts.map(p => {
        const soldQty = soldMap.get(p.name);
        if (soldQty) {
          return { ...p, stock: Math.max(0, p.stock - soldQty) };
        }
        return p;
      });
    });
  }, []);

  const handleLogin = useCallback(() => setIsAuthenticated(true), []);
  const handleLogout = useCallback(() => setIsAuthenticated(false), []);

  const handleCloseTutorial = () => {
    localStorage.setItem(STORAGE_KEY_TUTORIAL, 'true');
    setShowTutorial(false);
  };

  // --- Render Logic ---

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return (
          <Dashboard 
            transactions={transactions} 
            products={products} 
          />
        );
      case ViewState.INVENTORY:
        return (
          <Inventory 
            products={products} 
            setProducts={setProducts} 
            categories={categories}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            transactions={transactions}
          />
        );
      case ViewState.POS:
        return (
          <POS 
            products={products} 
            onTransactionComplete={handleTransactionComplete} 
          />
        );
      case ViewState.REPORTING:
        return (
          <Reporting
            transactions={transactions}
            products={products}
          />
        );
      case ViewState.PROMOTER:
        return <Promoter />;
      case ViewState.SUPPORT:
        return <Support />;
      case ViewState.SETTINGS:
        return <Settings />;
      default:
        return <Dashboard transactions={transactions} products={products} />;
    }
  };

  // 1. Onboarding Flow
  if (!isSetupComplete) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // 2. Authentication Flow
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} businessName={businessName} />;
  }

  // 3. Main Application Flow
  return (
    <RoleShell role={userRole}>
      <Layout 
        currentView={currentView} 
        setView={setCurrentView}
        role={userRole}
        businessName={businessName}
        onLogout={handleLogout}
      >
        {renderContent()}
      </Layout>
      {showTutorial && <SystemTutorial onClose={handleCloseTutorial} />}
    </RoleShell>
  );
};

export default App;
