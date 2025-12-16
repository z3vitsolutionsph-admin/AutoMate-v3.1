
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Onboarding } from './components/Onboarding';
import { Login } from './components/Login';
import { RoleShell } from './components/RoleShell';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { POS } from './components/POS';
import { Promoter } from './components/Promoter';
import { Support } from './components/Support';
import { Settings } from './components/Settings';
import { ViewState, UserRole, OnboardingState, Product, Transaction } from './types';

const App: React.FC = () => {
  // Constants for LocalStorage
  const STORAGE_KEY_SETUP = 'automate_is_setup';
  const STORAGE_KEY_BIZ_NAME = 'automate_biz_name';
  const STORAGE_KEY_CATS = 'automate_categories';
  const STORAGE_KEY_PRODUCTS = 'automate_products';

  // Helper for safe JSON parsing
  const safeJsonParse = <T,>(key: string, fallback: T): T => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : fallback;
    } catch (error) {
      console.error(`Error parsing storage key "${key}":`, error);
      return fallback;
    }
  };

  // State Management
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_SETUP) === 'true';
  });
  
  // For demo purposes, defaulting auth to true if setup is complete, otherwise false
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  
  // -- Global App Data --
  const [businessName, setBusinessName] = useState<string>(() => localStorage.getItem(STORAGE_KEY_BIZ_NAME) || 'AutoMateSystem Store');
  
  const [categories, setCategories] = useState<string[]>(() => 
    safeJsonParse<string[]>(STORAGE_KEY_CATS, ['General', 'Electronics', 'Home', 'Clothing'])
  );
  
  const [products, setProducts] = useState<Product[]>(() => 
    safeJsonParse<Product[]>(STORAGE_KEY_PRODUCTS, [
      { id: '1', name: 'Wireless Headphones', sku: 'AUD-001', category: 'Electronics', price: 2500, stock: 15, supplier: 'AudioTech', description: 'Noise cancelling headphones' },
      { id: '2', name: 'Ergonomic Mouse', sku: 'ACC-002', category: 'Electronics', price: 1200, stock: 8, supplier: 'TechGear', description: 'Vertical mouse for comfort' },
      { id: '3', name: 'Cotton T-Shirt', sku: 'APP-003', category: 'Clothing', price: 450, stock: 50, supplier: 'ApparelCo', description: '100% Cotton basic tee' },
      { id: '4', name: 'Desk Lamp', sku: 'HOM-004', category: 'Home', price: 899, stock: 20, supplier: 'BrightLives', description: 'LED adjustable lamp' }
    ])
  );
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // In a real app, this would be fetched from auth context
  const userRole = UserRole.ADMIN_PRO; 

  // Auto-login logic for demo smoothness if setup is done
  useEffect(() => {
    if (isSetupComplete) {
       // In a real app, we wouldn't auto-authenticate like this without a token check
       // But for this "Business Buddy" demo flow, we might want to show Login screen
       setIsAuthenticated(false); 
    }
  }, []);

  // Persistence Effects
  useEffect(() => {
    if (isSetupComplete) {
      try {
        localStorage.setItem(STORAGE_KEY_SETUP, 'true');
        localStorage.setItem(STORAGE_KEY_BIZ_NAME, businessName);
        localStorage.setItem(STORAGE_KEY_CATS, JSON.stringify(categories));
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
      } catch (e) {
        console.error("Failed to save to localStorage", e);
      }
    }
  }, [isSetupComplete, businessName, categories, products]);

  const handleOnboardingComplete = (data: OnboardingState) => {
    setBusinessName(data.businessName);
    setCategories(data.generatedCategories);

    // Initialize "Gate 3" Products based on generated categories
    const initialProducts: Product[] = [
      {
        id: 'INIT-001',
        name: `Signature ${data.generatedCategories[0] || 'Item'}`,
        sku: 'START-001',
        category: data.generatedCategories[0] || 'General',
        price: 1500,
        stock: 50,
        description: 'Initial inventory item created during setup.',
        supplier: 'Initial Setup'
      },
      {
        id: 'INIT-002',
        name: `Premium ${data.generatedCategories[1] || 'Item'}`,
        sku: 'START-002',
        category: data.generatedCategories[1] || 'General',
        price: 2500,
        stock: 25,
        description: 'Initial inventory item created during setup.',
        supplier: 'Initial Setup'
      },
      {
        id: 'INIT-003',
        name: `Standard ${data.generatedCategories[0] || 'Item'}`,
        sku: 'START-003',
        category: data.generatedCategories[0] || 'General',
        price: 999,
        stock: 100,
        description: 'Initial inventory item created during setup.',
        supplier: 'Initial Setup'
      }
    ];

    setProducts(initialProducts);
    setIsSetupComplete(true);
    setIsAuthenticated(true); // Auto-login after onboarding
  };

  const handleTransactionComplete = (newTransactions: Transaction[]) => {
    setTransactions(prev => [...newTransactions, ...prev]);
    
    // Update stock levels
    setProducts(prev => prev.map(p => {
        // Calculate total quantity sold for this product in the new transactions
        const soldQuantity = newTransactions
          .filter(tr => tr.product === p.name)
          .reduce((sum, tr) => sum + (tr.quantity || 1), 0);
        
        if (soldQuantity > 0) {
            return { ...p, stock: Math.max(0, p.stock - soldQuantity) };
        }
        return p;
    }));
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

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
          />
        );
      case ViewState.POS:
        return (
          <POS 
            products={products} 
            onTransactionComplete={handleTransactionComplete} 
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

  // --- View Routing Logic ---
  
  // 1. New User -> Onboarding
  if (!isSetupComplete) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // 2. Returning User (Not Logged In) -> Login
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} businessName={businessName} />;
  }

  // 3. Authenticated User -> Main App
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
    </RoleShell>
  );
};

export default App;
