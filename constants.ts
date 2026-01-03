import { PromoterTier } from './types';

// Currency Formatter for Philippine Peso
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const PROMOTER_TIERS: PromoterTier[] = [
  { name: 'Bronze', commissionRate: 0.15, minSales: 0, color: 'text-orange-400' },
  { name: 'Silver', commissionRate: 0.20, minSales: 50000, color: 'text-slate-300' },
  { name: 'Gold', commissionRate: 0.25, minSales: 150000, color: 'text-yellow-400' },
  { name: 'Platinum', commissionRate: 0.30, minSales: 500000, color: 'text-cyan-400' },
];