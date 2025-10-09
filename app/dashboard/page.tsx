"use client"

import DashboardCard from "@/components/ui/dashboard-card-memoized"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreditCard, DollarSign, TrendingDown, TrendingUp, Wallet, Search, Download } from "lucide-react"
import { useState } from "react"
import { DateRange } from 'react-day-picker';
import dynamic from 'next/dynamic';

// Dynamically import chart components with loading states
const FinancialOverviewChart = dynamic(
  () => import("@/components/ui/dynamic-charts").then(mod => mod.FinancialOverviewChart),
  { 
    loading: () => <div className="h-[300px] flex items-center justify-center"><div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div></div>,
    ssr: false 
  }
);

const ExpenseBreakdownChart = dynamic(
  () => import("@/components/ui/dynamic-charts").then(mod => mod.ExpenseBreakdownChart),
  { 
    loading: () => <div className="h-[300px] flex items-center justify-center"><div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div></div>,
    ssr: false 
  }
);

const ReimburseBreakdownChart = dynamic(
  () => import("@/components/ui/dynamic-charts").then(mod => mod.ReimburseBreakdownChart),
  { 
    loading: () => <div className="h-[300px] flex items-center justify-center"><div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div></div>,
    ssr: false 
  }
);

const RevenueTrendChart = dynamic(
  () => import("@/components/ui/dynamic-charts").then(mod => mod.RevenueTrendChart),
  { 
    loading: () => <div className="h-[300px] flex items-center justify-center"><div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div></div>,
    ssr: false 
  }
);

const CashAdvanceTrendChart = dynamic(
  () => import("@/components/ui/dynamic-charts").then(mod => mod.CashAdvanceTrendChart),
  { 
    loading: () => <div className="h-[300px] flex items-center justify-center"><div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div></div>,
    ssr: false 
  }
);

// Mock data interfaces
interface TransactionSummary {
  name: string
  expense: number
  revenue: number
  balance: number
}

interface FinancialBreakdown {
  name: string
  value: number
}

interface AccountBalance {
  no: number
  name: string
  balance: number
  company: string
  totalTransaction: number
  jumlahTransaction: number
}

// Pre-populated initial data to avoid delay on first render
const initialSummaryData = {
  totalExpense: 125_000_000,
  reimbursePaid: 45_000_000,
  caBalance: 75_000_000,
  refund: 15_000_000,
  income: 200_000_000,
};

const initialChartData: TransactionSummary[] = [
  { name: "Jan", expense: 40_000_000, revenue: 80_000_000, balance: 40_000_000 },
  { name: "Feb", expense: 30_000_000, revenue: 70_000_000, balance: 40_000_000 },
  { name: "Mar", expense: 20_000_000, revenue: 60_000_000, balance: 40_000_000 },
  { name: "Apr", expense: 27_800_000, revenue: 78_000_000, balance: 50_200_000 },
  { name: "May", expense: 18_900_000, revenue: 58_000_000, balance: 39_100_000 },
  { name: "Jun", expense: 23_900_000, revenue: 63_000_000, balance: 39_100_000 },
];

const initialBreakdownData: FinancialBreakdown[] = [
  { name: "Transport", value: 35_000_000 },
  { name: "Food", value: 25_000_000 },
  { name: "Office", value: 20_000_000 },
  { name: "Utilities", value: 15_000_000 },
  { name: "Other", value: 30_000_000 },
];

const initialExpenseBreakdown: FinancialBreakdown[] = [
  { name: "Pengadaan", value: 2_000_000 },
  { name: "Sewa Gedung", value: 3_000_000 },
  { name: "Gaji", value: 5_000_000 },
  { name: "Sewa Kendaraan", value: 4_000_000 },
  { name: "Other", value: 3_000_000 },
];

const initialAccountBalances: AccountBalance[] = [
  { no: 1, name: "BCA Corporate", balance: 500_000_000, company: "PT Induk", totalTransaction: 120_000_000, jumlahTransaction: 24 },
  { no: 2, name: "Mandiri Business", balance: 300_000_000, company: "PT Anak 1", totalTransaction: 80_000_000, jumlahTransaction: 18 },
  { no: 3, name: "BNI Company", balance: 200_000_000, company: "PT Anak 2", totalTransaction: 60_000_000, jumlahTransaction: 12 },
  { no: 4, name: "BRI Corporate", balance: 150_000_000, company: "PT Anak 3", totalTransaction: 45_000_000, jumlahTransaction: 9 },
  { no: 5, name: "CIMB Niaga", balance: 100_000_000, company: "PT Anak 4", totalTransaction: 30_000_000, jumlahTransaction: 6 },
];

export default function DashboardPage() {
  const [dashboardDateRange, setDashboardDateRange] = useState("monthly"); // For dashboard's own date range
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>({
    from: new Date(2024, 0, 1),
    to: new Date(2024, 0, 31),
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Use initial data for immediate render, update with real data as available
  const [summaryData] = useState(initialSummaryData);
  const [chartData] = useState(initialChartData);
  const [breakdownData] = useState(initialBreakdownData);
  const [accountBalances] = useState(initialAccountBalances);
  const [ExpenseBreakDown] = useState(initialExpenseBreakdown);

  return (
    <div className="space-y-6 w-full">
    

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <DashboardCard title="Total Expense" value={summaryData.totalExpense} description="This month" icon={<TrendingDown className="h-4 w-4 text-red-500" />} />
        <DashboardCard title="Reimburse Paid" value={summaryData.reimbursePaid} description="This month" icon={<DollarSign className="h-4 w-4 text-green-500" />} />
        <DashboardCard title="CA Balance" value={summaryData.caBalance} description="Available" icon={<Wallet className="h-4 w-4 text-blue-500" />} />
        <DashboardCard title="Refund" value={summaryData.refund} description="This month" icon={<CreditCard className="h-4 w-4 text-purple-500" />} />
        <DashboardCard title="Income" value={summaryData.income} description="This month" icon={<TrendingUp className="h-4 w-4 text-green-500" />} />
      </div>

      {/* Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>Distribusi kategori expense</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseBreakdownChart data={ExpenseBreakDown} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reimburse Expense</CardTitle>
            <CardDescription>Distribusi kategori reimburse</CardDescription>
          </CardHeader>
          <CardContent>
            <ReimburseBreakdownChart data={breakdownData} />
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview - Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
          <CardDescription>Tren pengeluaran, pendapatan, dan saldo</CardDescription>
        </CardHeader>
        <CardContent>
          <FinancialOverviewChart data={chartData} />
        </CardContent>
      </Card>

      {/* Area Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Tren pendapatan bulanan</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueTrendChart data={chartData.map((item) => ({ name: item.name, value: item.revenue }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cash Advance Trend</CardTitle>
            <CardDescription>Tren penggunaan cash advance</CardDescription>
          </CardHeader>
          <CardContent>
            <CashAdvanceTrendChart data={chartData.map((item) => ({ name: item.name, value: item.expense * 0.7 }))} />
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Account Balance */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Account Balance</CardTitle>
          <CardDescription>Current balances across all companies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/100">
                  <th className="p-2 text-left">No</th>
                  <th className="p-2 text-left">Nama</th>
                  <th className="p-2 text-left">Saldo</th>
                  <th className="p-2 text-left">Perusahaan</th>
                  <th className="p-2 text-left">Total Transaction</th>
                  <th className="p-2 text-left">Jumlah Transaction</th>
                </tr>
              </thead>
              <tbody>
                {accountBalances.map((account) => (
                  <tr key={account.no} className="border-b hover:bg-muted/60">
                    <td className="p-2">{account.no}</td>
                    <td className="p-2">{account.name}</td>
                    <td className="p-2">Rp {account.balance.toLocaleString("id-ID")}</td>
                    <td className="p-2">{account.company}</td>
                    <td className="p-2">Rp {account.totalTransaction.toLocaleString("id-ID")}</td>
                    <td className="p-2">{account.jumlahTransaction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}