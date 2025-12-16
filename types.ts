
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  POS = 'POS',
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

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  description?: string;
  supplier?: string; 
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
  product: string;
  category: string;
  location: string;
  amount: number;
  status: 'Completed' | 'Processing' | 'Refunded';
  quantity?: number;
  paymentMethod?: 'Cash' | 'GCash' | 'PayMaya' | 'QRPH' | 'Card';
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
export interface OnboardingState {
  currentStep: number;
  isComplete: boolean;
  selectedPlan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM' | null;
  businessName: string;
  businessType: string;
  generatedCategories: string[];
  gates: {
    employeeSet: boolean;
    categorySet: boolean; 
    inventorySet: boolean;
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  recommended?: boolean;
  color: string;
}

// Accounting & Integration Types
export interface IntegrationConfig {
  id: string;
  provider: 'XERO' | 'QUICKBOOKS' | 'GITHUB';
  name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'SYNCING' | 'ERROR';
  lastSync?: Date;
  autoSync: boolean;
}

export interface SyncLog {
  id: string;
  provider: 'XERO' | 'QUICKBOOKS' | 'GITHUB';
  action: string;
  status: 'SUCCESS' | 'FAILURE';
  timestamp: Date;
  details: string;
}
