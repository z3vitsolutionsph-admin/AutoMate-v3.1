
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  POS = 'POS',
  REPORTING = 'REPORTING',
  CUSTOMERS = 'CUSTOMERS',
  PROMOTER = 'PROMOTER',
  SUPPORT = 'SUPPORT',
  SETTINGS = 'SETTINGS'
}

export enum UserRole {
  ADMIN = 'Admin',
  CASHIER = 'Cashier',
  PROMOTER = 'Promoter',
}

export interface Product {
  id: string; // uuid
  name: string;
  sku: string;
  category_id: string; // Foreign key to categories table
  price: number;
  stock: number;
  description?: string;
  supplier_id?: string; // Foreign key to suppliers table
  image_url?: string;
  created_at: string; // timestamp
}

export interface Category {
  id: string; // uuid
  name: string;
  created_at: string; // timestamp
}

export interface Supplier {
  id: string; // uuid
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  created_at: string; // timestamp
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Transaction {
  id: string; // uuid
  created_at: string; // timestamp
  product_id: string; // Foreign key to products table
  quantity: number;
  total_amount: number;
  payment_method: 'Cash' | 'GCash' | 'PayMaya' | 'QRPH' | 'Card';
  user_id: string; // Foreign key to users table
  status: 'Completed' | 'Processing' | 'Refunded';
}

export interface Customer {
    id: string; // uuid
    name: string;
    email?: string;
    phone?: string;
    created_at: string; // timestamp
}

export interface LoyaltyPoint {
    id: string; // uuid
    customer_id: string; // Foreign key to customers table
    points: number;
    transaction_id: string; // Foreign key to transactions table
    created_at: string; // timestamp
}

export interface ReorderSuggestion {
  productName: string;
  currentStock: number;
  suggestedReorder: number;
  reason: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface PromoterTier {
  name: string;
  commissionRate: number;
  minSales: number;
  color: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}
