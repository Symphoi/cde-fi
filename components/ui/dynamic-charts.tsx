'use client';

import dynamic from 'next/dynamic';
import { TransactionSummary, FinancialBreakdown, RevenueTrend, CashAdvanceTrend } from './custom-charts';

// Dynamically import chart components with no SSR
export const FinancialOverviewChart = dynamic(
  () => import('./charts').then(mod => mod.FinancialOverviewChart),
  { 
    loading: () => <div className="h-[300px] flex items-center justify-center"><div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div></div>,
    ssr: false 
  }
);

export const ReimburseBreakdownChart = dynamic(
  () => import('./charts').then(mod => mod.ReimburseBreakdownChart),
  { 
    loading: () => <div className="h-[300px] flex items-center justify-center"><div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div></div>,
    ssr: false 
  }
);

export const ExpenseBreakdownChart = dynamic(
  () => import('./charts').then(mod => mod.ExpenseBreakdownChart),
  { 
    loading: () => <div className="h-[300px] flex items-center justify-center"><div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div></div>,
    ssr: false 
  }
);

export const RevenueTrendChart = dynamic(
  () => import('./charts').then(mod => mod.RevenueTrendChart),
  { 
    loading: () => <div className="h-[300px] flex items-center justify-center"><div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div></div>,
    ssr: false 
  }
);

export const CashAdvanceTrendChart = dynamic(
  () => import('./charts').then(mod => mod.CashAdvanceTrendChart),
  { 
    loading: () => <div className="h-[300px] flex items-center justify-center"><div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div></div>,
    ssr: false 
  }
);

// Types re-export for convenience
export type { TransactionSummary, FinancialBreakdown, RevenueTrend, CashAdvanceTrend };