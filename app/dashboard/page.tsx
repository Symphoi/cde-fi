"use client"

import DashboardCard from "@/components/ui/dashboard-card-memoized"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreditCard, DollarSign, TrendingDown, TrendingUp, Wallet, Search, Download, RefreshCw } from "lucide-react"
import { useState, useEffect } from "react"
import dynamic from 'next/dynamic'

// Dynamically import chart components
const FinancialOverviewChart = dynamic(
  () => import("@/components/ui/dynamic-charts").then(mod => mod.FinancialOverviewChart),
  { 
    loading: () => <div className="h-[300px] flex items-center justify-center"><div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div></div>,
    ssr: false 
  }
)

const ExpenseBreakdownChart = dynamic(
  () => import("@/components/ui/dynamic-charts").then(mod => mod.ExpenseBreakdownChart),
  { 
    loading: () => <div className="h-[300px] flex items-center justify-center"><div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div></div>,
    ssr: false 
  }
)

const ReimburseBreakdownChart = dynamic(
  () => import("@/components/ui/dynamic-charts").then(mod => mod.ReimburseBreakdownChart),
  { 
    loading: () => <div className="h-[300px] flex items-center justify-center"><div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div></div>,
    ssr: false 
  }
)

const RevenueTrendChart = dynamic(
  () => import("@/components/ui/dynamic-charts").then(mod => mod.RevenueTrendChart),
  { 
    loading: () => <div className="h-[300px] flex items-center justify-center"><div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div></div>,
    ssr: false 
  }
)

const CashAdvanceTrendChart = dynamic(
  () => import("@/components/ui/dynamic-charts").then(mod => mod.CashAdvanceTrendChart),
  { 
    loading: () => <div className="h-[300px] flex items-center justify-center"><div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div></div>,
    ssr: false 
  }
)

// Interfaces
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

// Default empty data
const defaultSummaryData = {
  totalExpense: 0,
  reimbursePaid: 0,
  caBalance: 0,
  refund: 0,
  income: 0,
  totalAR: 0,
  totalAP: 0,
  activeCA: 0
}

const defaultChartData: TransactionSummary[] = Array(6).fill(null).map((_, i) => ({
  name: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i],
  expense: 0,
  revenue: 0,
  balance: 0
}))

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dashboardDateRange, setDashboardDateRange] = useState("monthly")
  const [searchTerm, setSearchTerm] = useState('')

  // State untuk data real dari API
  const [summaryData, setSummaryData] = useState(defaultSummaryData)
  const [chartData, setChartData] = useState<TransactionSummary[]>(defaultChartData)
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([])
  const [expenseBreakdown, setExpenseBreakdown] = useState<FinancialBreakdown[]>([])
  const [reimburseBreakdown, setReimburseBreakdown] = useState<FinancialBreakdown[]>([])
  const [recentActivities, setRecentActivities] = useState<any[]>([])

  // Fetch data function
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true)
      
      // Get token dari localStorage
      const token = localStorage.getItem('token') || ''
      
      const response = await fetch('/api/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch')
      
      const result = await response.json()
      
      if (result.success && result.data) {
        const data = result.data
        
        setSummaryData(data.summary || defaultSummaryData)
        setChartData(data.chartData?.length > 0 ? data.chartData : defaultChartData)
        setAccountBalances(data.accountBalances || [])
        setExpenseBreakdown(data.expenseBreakdown || [])
        setReimburseBreakdown(data.reimburseBreakdown || [])
        setRecentActivities(data.recentActivities || [])
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 w-full">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="h-10 w-48 bg-gray-200 animate-pulse rounded"></div>
          <div className="flex flex-wrap gap-2">
            <div className="h-10 w-32 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-10 w-24 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-10 w-32 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-10 w-24 bg-gray-200 animate-pulse rounded"></div>
          </div>
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[350px] bg-gray-200 animate-pulse rounded-lg"></div>
          <div className="h-[350px] bg-gray-200 animate-pulse rounded-lg"></div>
        </div>

        {/* Table Skeleton */}
        <div className="h-[400px] bg-gray-200 animate-pulse rounded-lg"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your financial performance</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select value={dashboardDateRange} onValueChange={setDashboardDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-10 w-[200px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Button variant="outline" size="icon" onClick={fetchDashboardData} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards - REMOVE trend prop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <DashboardCard 
          title="Total Expense" 
          value={summaryData.totalExpense} 
          description="This month" 
          icon={<TrendingDown className="h-4 w-4 text-red-500" />}
        />
        <DashboardCard 
          title="Reimburse Paid" 
          value={summaryData.reimbursePaid} 
          description="This month" 
          icon={<DollarSign className="h-4 w-4 text-green-500" />}
        />
        <DashboardCard 
          title="CA Balance" 
          value={summaryData.caBalance} 
          description={`${summaryData.activeCA} active`} 
          icon={<Wallet className="h-4 w-4 text-blue-500" />}
        />
        <DashboardCard 
          title="AR Outstanding" 
          value={summaryData.totalAR} 
          description="Unpaid invoices" 
          icon={<CreditCard className="h-4 w-4 text-orange-500" />}
        />
        <DashboardCard 
          title="Income" 
          value={summaryData.income} 
          description="This month" 
          icon={<TrendingUp className="h-4 w-4 text-green-500" />}
        />
      </div>

      {/* Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>Distribution of expense categories</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseBreakdown.length > 0 ? (
              <ExpenseBreakdownChart data={expenseBreakdown} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No expense data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reimburse Expense</CardTitle>
            <CardDescription>Distribution of reimburse categories</CardDescription>
          </CardHeader>
          <CardContent>
            {reimburseBreakdown.length > 0 ? (
              <ReimburseBreakdownChart data={reimburseBreakdown} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No reimburse data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview - Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
          <CardDescription>Trend of expenses, revenue, and balance</CardDescription>
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
            <CardDescription>Monthly revenue trend</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueTrendChart data={chartData.map((item) => ({ 
              name: item.name, 
              value: item.revenue 
            }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cash Advance Trend</CardTitle>
            <CardDescription>Cash advance usage trend</CardDescription>
          </CardHeader>
          <CardContent>
            <CashAdvanceTrendChart data={chartData.map((item) => ({ 
              name: item.name, 
              value: item.expense * 0.7 
            }))} />
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
          <CardDescription>Active bank accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {accountBalances.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/100">
                    <th className="p-2 text-left">No</th>
                    <th className="p-2 text-left">Account Name</th>
                    <th className="p-2 text-left">Account Holder</th>
                  </tr>
                </thead>
                <tbody>
                  {accountBalances.map((account) => (
                    <tr key={account.no} className="border-b hover:bg-muted/60">
                      <td className="p-2">{account.no}</td>
                      <td className="p-2 font-medium">{account.name}</td>
                      <td className="p-2 text-muted-foreground">{account.company}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No bank accounts registered
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activities */}
      {recentActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest transactions across all modules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/100">
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Code</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Amount</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivities.map((activity, index) => (
                    <tr key={index} className="border-b hover:bg-muted/60">
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          activity.type === 'SO' ? 'bg-blue-100 text-blue-800' :
                          activity.type === 'PO' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {activity.type}
                        </span>
                      </td>
                      <td className="p-2 font-medium">{activity.code}</td>
                      <td className="p-2">{activity.name}</td>
                      <td className="p-2">{formatCurrency(activity.total_amount || 0)}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          activity.status === 'completed' || activity.status === 'paid' || activity.status === 'approved' ? 
                            'bg-green-100 text-green-800' :
                          activity.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {activity.status}
                        </span>
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {new Date(activity.created_at).toLocaleDateString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}