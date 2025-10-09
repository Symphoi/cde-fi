'use client';

import { CustomBarChart, CustomPieChart, CustomAreaChart } from '@/components/ui/custom-charts';

// Types
type TransactionSummary = {
  name: string;
  expense: number;
  revenue: number;
  balance: number;
};

type FinancialBreakdown = {
  name: string;
  value: number;
};

type RevenueTrend = {
  name: string;
  value: number;
};

type CashAdvanceTrend = {
  name: string;
  value: number;
};

type ReimburseAnalysis = {
  name: string;
  value: number;
};

// Bar Chart - Financial Overview
export function FinancialOverviewChart({ data }: { data: TransactionSummary[] }) {
  return (
    <div className="h-[300px]">
      <CustomBarChart data={data} />
    </div>
  );
}

// Pie Chart - Reimburse Breakdown
export function ReimburseBreakdownChart({ data }: { data: FinancialBreakdown[] }) {
  return (
    <div className="h-[300px]">
      <CustomPieChart data={data} />
    </div>
  );
}

// Area Chart - Revenue Trend
export function RevenueTrendChart({ data }: { data: RevenueTrend[] }) {
  return (
    <div className="h-[300px]">
      <CustomAreaChart data={data} />
    </div>
  );
}

// Area Chart - Cash Advance Trend
export function CashAdvanceTrendChart({ data }: { data: CashAdvanceTrend[] }) {
  return (
    <div className="h-[300px]">
      <CustomAreaChart data={data} />
    </div>
  );
}


// Pie Chart - Reimburse Breakdown
export function ExpenseBreakdownChart({ data }: { data: FinancialBreakdown[] }) {
  return (
    <div className="h-[300px]">
      <CustomPieChart data={data} />
    </div>
  );
}
// // Bar Chart - Reimburse Analysis
// export function ExpenseBreakdownChart({ data }: { data: ReimburseAnalysis[] }) {
//   return (
//     <div className="h-[300px]">
//       <CustomBarChart 
//         data={data.map(item => ({
//           ...item,
//           expense: 0,
//           revenue: item.value,
//           balance: item.value
//         }))}
//       />
//     </div>
//   );
// }
// Bar Chart - Reimburse Analysis
export function ReimburseAnalysisChart({ data }: { data: ReimburseAnalysis[] }) {
  return (
    <div className="h-[300px]">
      <CustomBarChart 
        data={data.map(item => ({
          ...item,
          expense: 0,
          revenue: item.value,
          balance: item.value
        }))}
      />
    </div>
  );
  
  
}