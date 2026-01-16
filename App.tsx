
import React, { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
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
import { supabase } from './services/supabase';
import { getProducts, getCategories, getSuppliers, getTransactions, getCustomers, addCustomer, getLoyaltyPoints } from './services/api';
import { mockProducts, mockCategories, mockSuppliers, mockTransactions, mockCustomers, mockLoyaltyPoints } from './services/mockData';
import { Settings } from './components/Settings';
import { Customers } from './components/Customers';
import { ViewState, UserRole, Product, Transaction, Supplier, Category, Customer, LoyaltyPoint } from './types';

const App: React.FC = () => {
  // --- State Initialization ---
  
  // System State
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(true); // Assuming setup is complete for now
  const [session, setSession] = useState<Session | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Business Data
  const [businessName, setBusinessName] = useState<string>('AutoMateSystem Store');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState<LoyaltyPoint[]>([]);

  // --- Helper: Validate UserRole ---
  const isValidUserRole = (value: unknown): value is UserRole => {
    return Object.values(UserRole).includes(value as UserRole);
  };

  // --- Effects ---

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        // Fetch user role from the database
        const fetchUserRole = async () => {
          const { data, error } = await supabase
            .from('users')
            .select('role:roles(name)')
            .eq('id', session.user.id)
            .single();

          if (data && data.role && typeof data.role === 'object' && 'name' in data.role) {
            const roleName = data.role.name;
            if (isValidUserRole(roleName)) {
              setUserRole(roleName);
            } else {
              console.error('Invalid user role:', roleName);
              setUserRole(null);
            }
          } else {
            console.error('Error fetching user role:', error);
            setUserRole(null);
          }
        };
        fetchUserRole();
      } else {
        setUserRole(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          if (userRole === UserRole.PROMOTER) {
            setProducts(mockProducts);
            setCategories(mockCategories);
            setSuppliers(mockSuppliers);
            setTransactions(mockTransactions);
            setCustomers(mockCustomers);
            setLoyaltyPoints(mockLoyaltyPoints);
          } else {
            const [productsData, categoriesData, suppliersData, transactionsData, customersData, loyaltyPointsData] = await Promise.all([
              getProducts(),
              getCategories(),
              getSuppliers(),
              getTransactions(),
              getCustomers(),
              getLoyaltyPoints(),
            ]);
            setProducts(productsData);
            setCategories(categoriesData);
            setSuppliers(suppliersData);
            setTransactions(transactionsData);
            setCustomers(customersData);
            setLoyaltyPoints(loyaltyPointsData);
          }
        } catch (error) {
          setError('Failed to fetch data. Please try again later.');
          console.error(error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [session, userRole]);

  // --- Handlers ---

  const handleAddCustomer = async (customer: Omit<Customer, 'id' | 'created_at'>) => {
    const newCustomer = await addCustomer(customer);
    setCustomers(prev => [...prev, newCustomer]);
  };

  const handleTransactionComplete = useCallback((newTransactions: Transaction[]) => {
    // 1. Record Transactions
    setTransactions(prev => [...newTransactions, ...prev]);
    
    // 2. Update Inventory Stocks
    setProducts(prevProducts => {
      // Create a map of sold quantities to optimize lookup
      const soldMap = new Map<string, number>();
      
      newTransactions.forEach(tx => {
        const currentSold = soldMap.get(tx.product_id) || 0;
        soldMap.set(tx.product_id, currentSold + tx.quantity);
      });

      return prevProducts.map(p => {
        const soldQty = soldMap.get(p.id);
        if (soldQty) {
          return { ...p, stock: Math.max(0, p.stock - soldQty) };
        }
        return p;
      });
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
            categories={categories}
            suppliers={suppliers}
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
      case ViewState.CUSTOMERS:
        return (
          <Customers
            customers={customers}
            loyaltyPoints={loyaltyPoints}
            onAddCustomer={handleAddCustomer}
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

  // Authentication Flow
  if (!session) {
    return <Login businessName={businessName} />;
  }

  // Main Application Flow
  if (loading || !userRole) {
    return <RoleShell role={userRole!} loading={true} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-rose-500 mb-4">An Error Occurred</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <RoleShell role={userRole} loading={false}>
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
