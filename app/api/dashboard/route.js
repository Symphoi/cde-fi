import { NextResponse } from 'next/server'
import { query } from '@/app/lib/db'
import { verifyToken } from '@/app/lib/auth'

export async function GET(request) {
  try {
    // Authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Summary Cards Data - SIMPLE VERSION DULU
    const [expenseResult] = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total_expense
       FROM purchase_orders WHERE status = 'paid'`
    )

    const [reimburseResult] = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as reimburse_paid
       FROM reimbursements WHERE status = 'approved'`
    )

    const [caResult] = await query(
      `SELECT COUNT(*) as activeCA, COALESCE(SUM(total_amount - used_amount), 0) as ca_balance
       FROM cash_advances WHERE status = 'active'`
    )

    const [refundResult] = await query(
      `SELECT COALESCE(SUM(remaining_amount), 0) as refund
       FROM ca_settlements WHERE status = 'completed' AND remaining_amount > 0`
    )

    const [incomeResult] = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as income
       FROM sales_orders WHERE status IN ('delivered', 'completed')`
    )

    const [arResult] = await query(
      `SELECT COALESCE(SUM(outstanding_amount), 0) as totalAR
       FROM accounts_receivable WHERE status = 'unpaid'`
    )

    const [apResult] = await query(
      `SELECT COALESCE(SUM(outstanding_amount), 0) as totalAP
       FROM accounts_payable WHERE status = 'unpaid'`
    )

    // 2. Recent Activities
    const [activities] = await query(
      `(SELECT 'SO' as type, so_code as code, customer_name as name, total_amount, status, created_at
        FROM sales_orders ORDER BY created_at DESC LIMIT 5)
       UNION ALL
       (SELECT 'PO' as type, po_code, supplier_name, total_amount, status, created_at  
        FROM purchase_orders ORDER BY created_at DESC LIMIT 5)
       UNION ALL  
       (SELECT 'CA' as type, ca_code, employee_name, total_amount, status, created_at
        FROM cash_advances ORDER BY created_at DESC LIMIT 5)
       ORDER BY created_at DESC LIMIT 15`
    )

    // 3. Chart Data - SIMPLE (6 bulan)
    const [chartData] = await query(
      `SELECT 
         DATE_FORMAT(DATE_SUB(NOW(), INTERVAL n MONTH), '%b') as name,
         0 as expense,
         0 as revenue,
         0 as balance
       FROM (SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) months
       ORDER BY DATE_SUB(NOW(), INTERVAL n MONTH)`
    )

    // 4. Bank Accounts
    const [accountBalances] = await query(
      `SELECT 
         ROW_NUMBER() OVER (ORDER BY created_at DESC) as no,
         CONCAT(bank_name, ' - ', account_holder) as name,
         NULL as balance,
         'Company' as company,
         NULL as totalTransaction,
         NULL as jumlahTransaction
       FROM bank_accounts WHERE is_active = 1 LIMIT 5`
    )

    // 5. Expense Breakdown - EMPTY ARRAY DULU (karena ada error)
    const expenseBreakdown = []

    // 6. Reimburse Breakdown - EMPTY ARRAY DULU
    const reimburseBreakdown = []

    // Response
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalExpense: expenseResult[0]?.total_expense || 0,
          reimbursePaid: reimburseResult[0]?.reimburse_paid || 0,
          caBalance: caResult[0]?.ca_balance || 0,
          refund: refundResult[0]?.refund || 0,
          income: incomeResult[0]?.income || 0,
          totalAR: arResult[0]?.totalAR || 0,
          totalAP: apResult[0]?.totalAP || 0,
          activeCA: caResult[0]?.activeCA || 0
        },
        recentActivities: activities,
        chartData: chartData,
        accountBalances: accountBalances,
        expenseBreakdown: expenseBreakdown,
        reimburseBreakdown: reimburseBreakdown
      }
    })

  } catch (error) {
    console.error('Dashboard API Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch dashboard data',
        message: error.message 
      },
      { status: 500 }
    )
  }
}