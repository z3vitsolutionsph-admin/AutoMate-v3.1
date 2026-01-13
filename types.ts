
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

export interface Business {
  id: string;
  name: string;
  type: string;
  address: string;
  contactEmail?: string;
  phone?: string;
  isPrimary?: boolean;
  tin?: string;
  receiptFooter?: string;
}

export interface SystemUser {
  id: string;
  businessId?: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  lastLogin?: Date;
  avatar?: string;
  createdAt?: Date;
}

export interface Product {
  id: string;
  businessId?: string;
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
  businessId?: string;
  date: string;
  productId?: string;
  product: string;
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

export interface Referral {
  id: string;
  businessId?: string;
  clientName: string;
  dateJoined: string;
  status: 'Active' | 'Pending' | 'Cancelled';
  commission: number;
}

export type PlanType = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface OnboardingState {
  businessName: string;
  businessType: string;
  generatedCategories: string[];
  generatedProducts?: Product[];
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
