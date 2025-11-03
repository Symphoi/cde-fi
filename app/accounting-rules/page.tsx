'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Edit, Trash2, CheckCircle, XCircle, FileText, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AccountingRule {
  rule_code: string
  rule_name: string
  description: string
  transaction_type: string
  debit_account_code: string
  credit_account_code: string
  debit_account_name: string
  credit_account_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ChartOfAccount {
  account_code: string
  account_name: string
  account_type: string
}

export default function AccountingRulesPage() {
  const [rules, setRules] = useState<AccountingRule[]>([])
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Form states
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<AccountingRule | null>(null)
  const [formData, setFormData] = useState({
    rule_code: '',
    rule_name: '',
    description: '',
    transaction_type: '',
    debit_account_code: '',
    credit_account_code: '',
    is_active: true
  })
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})
  const [submitLoading, setSubmitLoading] = useState(false)

  // Transaction types - sesuai dengan database
  const transactionTypes = [
    'sales',
    'purchase', 
    'cash_advance',
    'reimbursement',
    'payment',
    'receipt'
  ]

  // Fetch data
  useEffect(() => {
    fetchData()
    fetchChartOfAccounts()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log('🔍 Fetching accounting rules...')
      
      const response = await fetch('/api/accounting-rules')
      
      console.log('📡 Response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Data received:', result)
        setRules(result.data || [])
      } else {
        const errorText = await response.text()
        console.error('❌ API Error:', errorText)
        setRules(getMockAccountingRules())
      }
    } catch (error) {
      console.error('💥 Fetch error:', error)
      setRules(getMockAccountingRules())
    } finally {
      setLoading(false)
    }
  }

  const fetchChartOfAccounts = async () => {
    try {
      console.log('🔍 Fetching chart of accounts...')
      const response = await fetch('/api/chart-of-accounts?is_active=true')
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Accounts data:', result)
        setAccounts(result.data || [])
      } else {
        setAccounts(getMockAccounts())
      }
    } catch (error) {
      console.error('Error fetching chart of accounts:', error)
      setAccounts(getMockAccounts())
    }
  }

  // Mock data fallback
  const getMockAccountingRules = (): AccountingRule[] => {
    return [
      {
        rule_code: 'RULE001',
        rule_name: 'Penjualan Kredit',
        description: 'Aturan untuk transaksi penjualan kredit',
        transaction_type: 'sales',
        debit_account_code: '1130',
        credit_account_code: '4100',
        debit_account_name: 'Piutang Usaha',
        credit_account_name: 'Pendapatan Penjualan',
        is_active: true,
        created_at: '2025-10-29T16:34:36Z',
        updated_at: '2025-10-29T16:34:36Z'
      },
      {
        rule_code: 'RULE002',
        rule_name: 'Pembelian Kredit', 
        description: 'Aturan untuk transaksi pembelian kredit',
        transaction_type: 'purchase',
        debit_account_code: '5100',
        credit_account_code: '2110',
        debit_account_name: 'Beban Operasional',
        credit_account_name: 'Hutang Usaha',
        is_active: true,
        created_at: '2025-10-29T16:34:36Z',
        updated_at: '2025-10-29T16:34:36Z'
      }
    ]
  }

  const getMockAccounts = (): ChartOfAccount[] => {
    return [
      { account_code: '1110', account_name: 'Kas', account_type: 'asset' },
      { account_code: '1130', account_name: 'Piutang Usaha', account_type: 'asset' },
      { account_code: '2110', account_name: 'Hutang Usaha', account_type: 'liability' },
      { account_code: '4100', account_name: 'Pendapatan Penjualan', account_type: 'revenue' },
      { account_code: '5100', account_name: 'Beban Operasional', account_type: 'expense' }
    ]
  }

  // Filter logic
  const filteredRules = rules.filter(rule => {
    const matchesSearch = 
      rule.rule_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.rule_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTransactionType = 
      transactionTypeFilter === 'all' || rule.transaction_type === transactionTypeFilter
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && rule.is_active) ||
      (statusFilter === 'inactive' && !rule.is_active)
    
    return matchesSearch && matchesTransactionType && matchesStatus
  })

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredRules.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredRules.length / itemsPerPage)

  // Form handlers
  const resetForm = () => {
    setFormData({
      rule_code: '',
      rule_name: '',
      description: '',
      transaction_type: '',
      debit_account_code: '',
      credit_account_code: '',
      is_active: true
    })
    setFormErrors({})
    setEditingRule(null)
  }

  const handleCreateNew = () => {
    resetForm()
    setShowForm(true)
  }

  const handleEdit = (rule: AccountingRule) => {
    setFormData({
      rule_code: rule.rule_code,
      rule_name: rule.rule_name,
      description: rule.description || '',
      transaction_type: rule.transaction_type,
      debit_account_code: rule.debit_account_code,
      credit_account_code: rule.credit_account_code,
      is_active: rule.is_active
    })
    setEditingRule(rule)
    setShowForm(true)
  }

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {}

    if (!formData.rule_code.trim()) {
      errors.rule_code = 'Rule code is required'
    }
    if (!formData.rule_name.trim()) {
      errors.rule_name = 'Rule name is required'
    }
    if (!formData.transaction_type) {
      errors.transaction_type = 'Transaction type is required'
    }
    if (!formData.debit_account_code) {
      errors.debit_account_code = 'Debit account is required'
    }
    if (!formData.credit_account_code) {
      errors.credit_account_code = 'Credit account is required'
    }
    if (formData.debit_account_code === formData.credit_account_code) {
      errors.credit_account_code = 'Debit and credit accounts cannot be the same'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      setSubmitLoading(true)
      console.log('📤 Submitting form data:', formData)

      const url = '/api/accounting-rules'
      const method = editingRule ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message)
        setShowForm(false)
        resetForm()
        fetchData()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error submitting accounting rule:', error)
      alert('Error submitting accounting rule')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDelete = async (ruleCode: string) => {
    if (!confirm('Are you sure you want to delete this accounting rule?')) {
      return
    }

    try {
      const response = await fetch(`/api/accounting-rules?rule_code=${ruleCode}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Accounting rule deleted successfully')
        fetchData()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting accounting rule:', error)
      alert('Error deleting accounting rule')
    }
  }

  const getAccountName = (accountCode: string) => {
    const account = accounts.find(acc => acc.account_code === accountCode)
    return account ? `${account.account_code} - ${account.account_name}` : accountCode
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading accounting rules...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Accounting Rules Management</h1>
          <p className="text-gray-600 mt-2">Manage automatic journal entry rules for different transaction types</p>
        </div>

        {/* MAIN CONTENT CARD */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5" />
                Accounting Rules ({filteredRules.length})
              </CardTitle>
              
              <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-1" />
                New Rule
              </Button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              {/* Search Input */}
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by rule code, name, or description..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              
              {/* Transaction Type Filter */}
              <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Transaction Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {transactionTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {/* Reset Filters */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setTransactionTypeFilter('all')
                  setStatusFilter('all')
                  setCurrentPage(1)
                }}
                className="whitespace-nowrap"
              >
                Reset Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Code</TableHead>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Transaction Type</TableHead>
                    <TableHead>Debit Account</TableHead>
                    <TableHead>Credit Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.length > 0 ? (
                    currentItems.map((rule) => (
                      <TableRow key={rule.rule_code} className="hover:bg-gray-50">
                        <TableCell className="font-semibold">{rule.rule_code}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{rule.rule_name}</div>
                            {rule.description && (
                              <div className="text-sm text-gray-500">{rule.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {rule.transaction_type.split('_').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {getAccountName(rule.debit_account_code)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getAccountName(rule.credit_account_code)}
                        </TableCell>
                        <TableCell>
                          <Badge className={rule.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button 
                              onClick={() => handleEdit(rule)}
                              size="sm"
                              variant="outline"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              onClick={() => handleDelete(rule.rule_code)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-12 w-12 text-gray-300" />
                          <p>No accounting rules found matching your filters.</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleCreateNew}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Create New Rule
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {filteredRules.length > 0 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{indexOfFirstItem + 1}</span> to{" "}
                  <span className="font-semibold">{Math.min(indexOfLastItem, filteredRules.length)}</span> of{" "}
                  <span className="font-semibold">{filteredRules.length}</span> rules
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ACCOUNTING RULE FORM DIALOG */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Edit Accounting Rule' : 'Create New Accounting Rule'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rule_code">Rule Code *</Label>
                  <Input
                    id="rule_code"
                    value={formData.rule_code}
                    onChange={(e) => handleFormChange('rule_code', e.target.value)}
                    placeholder="e.g., RULE001"
                    disabled={!!editingRule}
                  />
                  {formErrors.rule_code && (
                    <p className="text-red-500 text-xs">{formErrors.rule_code}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rule_name">Rule Name *</Label>
                  <Input
                    id="rule_name"
                    value={formData.rule_name}
                    onChange={(e) => handleFormChange('rule_name', e.target.value)}
                    placeholder="e.g., Payment to Supplier"
                  />
                  {formErrors.rule_name && (
                    <p className="text-red-500 text-xs">{formErrors.rule_name}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Description of this accounting rule..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transaction_type">Transaction Type *</Label>
                  <Select 
                    value={formData.transaction_type} 
                    onValueChange={(value) => handleFormChange('transaction_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select transaction type" />
                    </SelectTrigger>
                    <SelectContent>
                      {transactionTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.transaction_type && (
                    <p className="text-red-500 text-xs">{formErrors.transaction_type}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-6">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => handleFormChange('is_active', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>
              </div>

              {/* Account Mapping */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="debit_account_code">Debit Account *</Label>
                  <Select 
                    value={formData.debit_account_code} 
                    onValueChange={(value) => handleFormChange('debit_account_code', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select debit account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(account => (
                        <SelectItem key={account.account_code} value={account.account_code}>
                          {account.account_code} - {account.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.debit_account_code && (
                    <p className="text-red-500 text-xs">{formErrors.debit_account_code}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credit_account_code">Credit Account *</Label>
                  <Select 
                    value={formData.credit_account_code} 
                    onValueChange={(value) => handleFormChange('credit_account_code', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select credit account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(account => (
                        <SelectItem key={account.account_code} value={account.account_code}>
                          {account.account_code} - {account.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.credit_account_code && (
                    <p className="text-red-500 text-xs">{formErrors.credit_account_code}</p>
                  )}
                </div>
              </div>

              {/* Validation for same account */}
              {formData.debit_account_code && formData.credit_account_code && 
               formData.debit_account_code === formData.credit_account_code && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Debit and credit accounts cannot be the same. Please select different accounts.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                  disabled={submitLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {submitLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingRule ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingRule ? 'Update Rule' : 'Create Rule'
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}