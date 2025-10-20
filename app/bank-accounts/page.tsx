"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Edit, CreditCard, Building, User, Check, X, Loader2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

// Types
interface BankAccount {
  id: number
  account_code: string
  bank_name: string
  account_number: string
  account_holder: string
  branch: string
  currency: string
  description: string
  is_active: boolean
  created_at: string
}

interface BankFormData {
  account_code: string
  bank_name: string
  account_number: string
  account_holder: string
  branch: string
  description: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// API Service - IMPROVED VERSION
class BankAccountService {
  private static async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Session expired. Please login again.');
      window.location.href = '/login';
      throw new Error('No authentication token');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    return this.handleResponse(response);
  }

  private static async handleResponse(response: Response) {
    const contentType = response.headers.get('content-type');
    
    // Check if response is HTML (error page)
    if (contentType && contentType.includes('text/html')) {
      const text = await response.text();
      console.error('HTML Response received:', text.substring(0, 500));
      
      if (response.status === 401) {
        toast.error('Session expired. Please login again.');
        window.location.href = '/login';
        throw new Error('Unauthorized - Please login again');
      }
      
      if (response.status === 404) {
        throw new Error('API endpoint not found. Please check the URL.');
      }
      
      throw new Error(`Server error: Received HTML instead of JSON (Status: ${response.status})`);
    }
    
    if (!response.ok) {
      // Clone response untuk menghindari "body stream already read"
      const responseClone = response.clone();
      
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      } catch (jsonError) {
        // Jika parsing JSON gagal, gunakan clone response untuk membaca text
        try {
          const errorText = await responseClone.text();
          throw new Error(errorText || `HTTP error! status: ${response.status}`);
        } catch (textError) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
    }
    
    return response.json();
  }

  // Get all bank accounts with pagination
  static async getBankAccounts(filters: {
    search?: string;
    page?: number;
    limit?: number;
    show_inactive?: boolean;
  } = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    params.append('page', String(filters.page || 1));
    params.append('limit', String(filters.limit || 10));
    if (filters.show_inactive) params.append('show_inactive', 'true');

    return this.fetchWithAuth(`/api/bank-accounts?${params}`);
  }

  static async createBankAccount(data: BankFormData) {
    return this.fetchWithAuth('/api/bank-accounts', {
      method: 'POST',
      body: JSON.stringify({ ...data, currency: 'IDR' })
    });
  }

  static async updateBankAccount(data: BankFormData) {
    return this.fetchWithAuth('/api/bank-accounts', {
      method: 'PUT',
      body: JSON.stringify({ ...data, currency: 'IDR', is_active: true })
    });
  }

  // Toggle bank account status
  static async toggleBankAccountStatus(account_code: string, is_active: boolean) {
    return this.fetchWithAuth('/api/bank-accounts', {
      method: 'PUT',
      body: JSON.stringify({ 
        account_code, 
        is_active: !is_active,
        bank_name: '', // Required fields but won't be used
        account_number: '',
        account_holder: ''
      })
    });
  }
}

export default function BankAccountsPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [formData, setFormData] = useState<BankFormData>({
    account_code: '',
    bank_name: '',
    account_number: '',
    account_holder: '',
    branch: '',
    description: ''
  })

  // Fetch data dengan pagination
  const fetchBankAccounts = async (page: number = pagination.page) => {
    try {
      setLoading(true)
      const response = await BankAccountService.getBankAccounts({
        search: searchTerm,
        page: page,
        limit: pagination.limit,
        show_inactive: showInactive
      })

      if (response.success) {
        setBankAccounts(response.data)
        setPagination(response.pagination)
      }
    } catch (error: any) {
      console.error('Error fetching bank accounts:', error)
      toast.error(error.message || 'Failed to load bank accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBankAccounts(1)
  }, [searchTerm, showInactive])

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchBankAccounts(newPage)
    }
  }

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }))
    setTimeout(() => fetchBankAccounts(1), 0)
  }

  // Form handlers
  const handleCreateNew = () => {
    setEditingAccount(null)
    setFormData({
      account_code: '',
      bank_name: '',
      account_number: '',
      account_holder: '',
      branch: '',
      description: ''
    })
    setShowForm(true)
  }

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account)
    setFormData({
      account_code: account.account_code,
      bank_name: account.bank_name,
      account_number: account.account_number,
      account_holder: account.account_holder,
      branch: account.branch || '',
      description: account.description || ''
    })
    setShowForm(true)
  }

  const updateFormField = (field: keyof BankFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const submitForm = async () => {
    if (!formData.account_code.trim() || !formData.bank_name.trim() || !formData.account_number.trim() || !formData.account_holder.trim()) {
      toast.error('Account code, bank name, account number, and account holder are required')
      return
    }

    if (!/^\d+$/.test(formData.account_number)) {
      toast.error('Account number must contain only numbers')
      return
    }

    try {
      setSubmitting(true)
      
      if (editingAccount) {
        const result = await BankAccountService.updateBankAccount(formData)
        toast.success(result.message || 'Bank account updated successfully')
      } else {
        const result = await BankAccountService.createBankAccount(formData)
        toast.success(result.message || 'Bank account created successfully')
      }

      setShowForm(false)
      setEditingAccount(null)
      await fetchBankAccounts()
    } catch (error: any) {
      console.error('Error saving bank account:', error)
      toast.error(error.message || 'Failed to save bank account')
    } finally {
      setSubmitting(false)
    }
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingAccount(null)
    setSubmitting(false)
  }

  const handleToggleStatus = async (account: BankAccount) => {
    try {
      setLoading(true)
      await BankAccountService.toggleBankAccountStatus(account.account_code, account.is_active)
      toast.success(`Bank account ${account.is_active ? 'deactivated' : 'activated'} successfully`)
      await fetchBankAccounts()
    } catch (error: any) {
      console.error('Error toggling bank account status:', error)
      toast.error(error.message || 'Failed to update bank account status')
    } finally {
      setLoading(false)
    }
  }

  // Status badge
  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
        <Check className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 text-xs">
        <X className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
    )
  }

  // Format account number for display
  const formatAccountNumber = (accountNumber: string) => {
    const cleanNumber = accountNumber.replace(/\D/g, '');
    
    if (cleanNumber.length <= 4) return cleanNumber;
    if (cleanNumber.length <= 8) return `${cleanNumber.slice(0, 4)}-${cleanNumber.slice(4)}`;
    if (cleanNumber.length <= 12) return `${cleanNumber.slice(0, 4)}-${cleanNumber.slice(4, 8)}-${cleanNumber.slice(8)}`;
    
    return cleanNumber.replace(/(.{4})/g, '$1-').replace(/-$/, '');
  }

  // Format account number input
  const formatAccountNumberInput = (value: string) => {
    const cleanNumber = value.replace(/\D/g, '');
    return cleanNumber;
  }

  // Pagination component
  const PaginationControls = () => (
    <div className="flex items-center justify-between px-6 py-4 border-t">
      <div className="text-sm text-gray-600">
        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
        {pagination.total} entries
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Rows per page:</span>
          <select
            value={pagination.limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
            disabled={loading}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1 || loading}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm text-gray-600 min-w-[80px] text-center">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages || loading}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <Card className="bg-white border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  Bank Accounts
                </CardTitle>
                <p className="text-gray-600 mt-2">Manage your company bank accounts</p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateNew}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bank Account
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => fetchBankAccounts()}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Search & Filters - SAMA SEPERTI TAX TYPES */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search account code, bank name, or account holder..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showInactive"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="showInactive" className="text-sm">
                  Show Inactive
                </Label>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Bank Accounts Table */}
        <Card className="bg-white border shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Loading bank accounts...</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-16 text-center font-semibold text-gray-900">No</TableHead>
                      <TableHead className="font-semibold text-gray-900">Account Code</TableHead>
                      <TableHead className="font-semibold text-gray-900">Bank Name</TableHead>
                      <TableHead className="font-semibold text-gray-900">Account Number</TableHead>
                      <TableHead className="font-semibold text-gray-900">Account Holder</TableHead>
                      <TableHead className="text-center font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="text-center font-semibold text-gray-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <CreditCard className="h-12 w-12 mb-4 text-gray-300" />
                            <p className="text-lg font-medium mb-2">
                              {searchTerm || showInactive ? 'No bank accounts found' : 'No bank accounts yet'}
                            </p>
                            <p className="text-sm text-gray-400 mb-4">
                              {searchTerm || showInactive ? 'Try adjusting your search terms' : 'Get started by adding your first bank account'}
                            </p>
                            <Button onClick={handleCreateNew} size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Bank Account
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      bankAccounts.map((account, index) => (
                        <TableRow key={account.id} className="hover:bg-gray-50/50">
                          <TableCell className="text-center text-gray-600 font-medium">
                            {(pagination.page - 1) * pagination.limit + index + 1}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">
                              {account.account_code}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-gray-900">{account.bank_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono font-semibold text-gray-900">
                              {formatAccountNumber(account.account_number)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-700">{account.account_holder}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(account.is_active)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-1 justify-center">
                              <Button
                                onClick={() => handleEdit(account)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-50"
                                title="Edit"
                                disabled={loading}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => handleToggleStatus(account)}
                                size="sm"
                                variant="outline"
                                className={`h-8 w-8 p-0 border-gray-300 hover:bg-gray-50 ${
                                  account.is_active ? 'text-orange-600' : 'text-green-600'
                                }`}
                                title={account.is_active ? 'Deactivate' : 'Activate'}
                                disabled={loading}
                              >
                                {account.is_active ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                
                {/* Pagination Controls */}
                {bankAccounts.length > 0 && <PaginationControls />}
              </>
            )}
          </CardContent>
        </Card>

        {/* Bank Account Form - Below Table */}
        {showForm && (
          <Card className="bg-white border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {editingAccount ? 'Edit Bank Account' : 'Add New Bank Account'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account_code" className="text-sm font-medium">
                      Account Code *
                    </Label>
                    <Input
                      id="account_code"
                      value={formData.account_code}
                      onChange={(e) => updateFormField('account_code', e.target.value.toUpperCase())}
                      placeholder="BANK001"
                      disabled={!!editingAccount || submitting}
                    />
                    {editingAccount && (
                      <p className="text-xs text-gray-500 mt-1">
                        Account code cannot be changed
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank_name" className="text-sm font-medium">
                      Bank Name *
                    </Label>
                    <Input
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(e) => updateFormField('bank_name', e.target.value)}
                      placeholder="e.g., BCA, Mandiri, BNI"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account_number" className="text-sm font-medium">
                      Account Number *
                    </Label>
                    <Input
                      id="account_number"
                      value={formData.account_number}
                      onChange={(e) => updateFormField('account_number', formatAccountNumberInput(e.target.value))}
                      placeholder="1234567890"
                      disabled={submitting}
                      maxLength={16}
                    />
                    <p className="text-xs text-gray-500">
                      Numbers only, no spaces or special characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account_holder" className="text-sm font-medium">
                      Account Holder Name *
                    </Label>
                    <Input
                      id="account_holder"
                      value={formData.account_holder}
                      onChange={(e) => updateFormField('account_holder', e.target.value)}
                      placeholder="Full name as shown in bank account"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch" className="text-sm font-medium">
                    Branch Name
                  </Label>
                  <Input
                    id="branch"
                    value={formData.branch}
                    onChange={(e) => updateFormField('branch', e.target.value)}
                    placeholder="Bank branch location"
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormField('description', e.target.value)}
                    placeholder="Additional notes about this bank account..."
                    rows={2}
                    disabled={submitting}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={submitForm} 
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {editingAccount ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingAccount ? 'Update Account' : 'Create Account'
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={closeForm}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}