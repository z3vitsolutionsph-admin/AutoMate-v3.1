
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  POS = 'POS',
  REPORTING = 'REPORTING',
  PROMOTER = 'PROMOTER',
  SUPPORT = 'SUPPORT',
  SETTINGS = 'SETTINGS'
}

export enum UserRole {
  SUPERUSER = 'SUPERUSER',
  ADMIN = 'ADMIN',
  ADMIN_PRO = 'ADMIN_PRO',
  PROMOTER = 'PROMOTER',
  EMPLOYEE = 'EMPLOYEE'
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  password?: string; // Stored for session validation
  role: UserRole;
  status: 'Active' | 'Inactive';
  lastLogin?: Date;
  avatar?: string;
  createdAt?: Date;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  description?: string;
  supplier?: string; 
  imageUrl?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Transaction {
  id: string;
  date: string; // Format: YYYY-MM-DD
  productId?: string;
  product: string; // Name
  category: string;
  location: string;
  amount: number;
  status: 'Completed' | 'Processing' | 'Refunded';
  quantity?: number;
  paymentMethod?: 'Cash' | 'GCash' | 'PayMaya' | 'QRPH' | 'Card' | 'Stripe' | 'PayPal' | 'PayMongo';
}

export interface HeldOrder {
  id: string;
  items: CartItem[];
  timestamp: Date;
  customerName?: string;
}

export interface ReceiptData {
  transactionId: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  date: string;
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

// Onboarding Types
export type PlanType = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface OnboardingState {
  businessName: string;
  businessType: string;
  generatedCategories: string[];
  generatedProducts?: Product[]; // Added to support auto-stocking
  selectedPlan: PlanType;
  paymentMethod: string;
  adminName: string;
  adminEmail: string;
  adminPassword?: string;
  isComplete: boolean;
}

export interface SubscriptionPlan {
  id: PlanType;
  name: string;
  price: number;
  employeeLimit: number | 'Unlimited';
  features: string[];
  recommended?: boolean;
  color: string;
}

// Accounting & Integration Types
export interface IntegrationConfig {
  id: string;
  provider: 'XERO' | 'QUICKBOOKS' | 'GITHUB' | 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK';
  name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'SYNCING' | 'ERROR';
  lastSync?: Date;
  autoSync: boolean;
}

export interface SyncLog {
  id: string;
  provider: 'XERO' | 'QUICKBOOKS' | 'GITHUB' | 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK';
  action: string;
  status: 'SUCCESS' | 'FAILURE';
  timestamp: Date;
  details: string;
}