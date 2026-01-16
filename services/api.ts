import { supabase } from './supabase';
import { Product, Category, Supplier, Transaction, Customer, LoyaltyPoint } from '../types';

// Products
export const getProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase.from('products').select('*');
  if (error) throw error;
  return (data as Product[]) || [];
};

export const addProduct = async (product: Omit<Product, 'id' | 'created_at'>): Promise<Product> => {
    const { data, error } = await supabase.from('products').insert(product).single();
    if (error) throw error;
    return (data as Product) || { id: '', name: '', sku: '', category_id: '', price: 0, stock: 0, created_at: new Date().toISOString() };
};

export const updateProduct = async (product: Product): Promise<Product> => {
    const { data, error } = await supabase.from('products').update(product).eq('id', product.id).single();
    if (error) throw error;
    return (data as Product) || product;
};

export const deleteProduct = async (id: string): Promise<void> => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
};

// Categories
export const getCategories = async (): Promise<Category[]> => {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) throw error;
    return (data as Category[]) || [];
};

// Customers
export const getCustomers = async (): Promise<Customer[]> => {
    const { data, error } = await supabase.from('customers').select('*');
    if (error) throw error;
    return (data as Customer[]) || [];
};

export const addCustomer = async (customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').insert(customer).single();
    if (error) throw error;
    return (data as Customer) || { id: '', name: '', created_at: new Date().toISOString() };
};

// Loyalty Points
export const getLoyaltyPoints = async (): Promise<LoyaltyPoint[]> => {
    const { data, error } = await supabase.from('loyalty_points').select('*');
    if (error) throw error;
    return (data as LoyaltyPoint[]) || [];
};

// Suppliers
export const getSuppliers = async (): Promise<Supplier[]> => {
    const { data, error } = await supabase.from('suppliers').select('*');
    if (error) throw error;
    return (data as Supplier[]) || [];
};

export const addSupplier = async (supplier: Omit<Supplier, 'id' | 'created_at'>): Promise<Supplier> => {
    const { data, error } = await supabase.from('suppliers').insert(supplier).single();
    if (error) throw error;
    return (data as Supplier) || { id: '', name: '', contact_person: '', email: '', phone: '', address: '', created_at: new Date().toISOString() };
};

export const updateSupplier = async (supplier: Supplier): Promise<Supplier> => {
    const { data, error } = await supabase.from('suppliers').update(supplier).eq('id', supplier.id).single();
    if (error) throw error;
    return (data as Supplier) || supplier;
};

export const deleteSupplier = async (id: string): Promise<void> => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
};

// Transactions
export const getTransactions = async (): Promise<Transaction[]> => {
    const { data, error } = await supabase.from('transactions').select('*');
    if (error) throw error;
    return (data as Transaction[]) || [];
};

export const addTransaction = async (transaction: Omit<Transaction, 'id' | 'created_at' | 'status'>): Promise<Transaction> => {
    const { data, error } = await supabase.from('transactions').insert({ ...transaction, status: 'Completed' }).single();
    if (error) throw error;
    return (data as Transaction) || { id: '', created_at: new Date().toISOString(), product_id: '', quantity: 0, total_amount: 0, payment_method: 'Cash', user_id: '', status: 'Completed' };
};
