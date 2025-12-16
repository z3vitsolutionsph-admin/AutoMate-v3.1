import { Product, Category, Supplier, Transaction, Customer, LoyaltyPoint } from '../types';

export const mockProducts: Product[] = [
  { id: '1', name: 'Mock Coffee', sku: 'MC-001', category_id: '1', price: 200, stock: 100, created_at: new Date().toISOString() },
  { id: '2', name: 'Mock POS', sku: 'MP-001', category_id: '2', price: 15000, stock: 10, created_at: new Date().toISOString() },
];

export const mockCategories: Category[] = [
  { id: '1', name: 'Mock Beverages', created_at: new Date().toISOString() },
  { id: '2', name: 'Mock Electronics', created_at: new Date().toISOString() },
];

export const mockSuppliers: Supplier[] = [
    { id: '1', name: 'Mock Supplier 1', contact_person: 'Mock Contact 1', email: 'mock1@example.com', phone: '123-456-7890', address: 'Mock Address 1', created_at: new Date().toISOString() },
];

export const mockTransactions: Transaction[] = [
    { id: '1', product_id: '1', quantity: 2, total_amount: 400, user_id: 'promoter-user-id', created_at: new Date().toISOString(), payment_method: 'Cash', status: 'Completed' },
];

export const mockCustomers: Customer[] = [
    { id: '1', name: 'Mock Customer 1', email: 'mockcustomer1@example.com', phone: '987-654-3210', created_at: new Date().toISOString() },
];

export const mockLoyaltyPoints: LoyaltyPoint[] = [
    { id: '1', customer_id: '1', points: 100, transaction_id: '1', created_at: new Date().toISOString() },
];
