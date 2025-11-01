"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Edit, CreditCard, Building, User, Check, X, Loader2, ChevronLeft, ChevronRight, RefreshCw, Trash2, Calendar } from 'lucide-react'
import { toast } from 'sonner'

// Types
interface BankAccount {
  id: string;
  account_code: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  branch?: string;
  currency: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface BankAccountResponse {
  success: boolean;
  data: BankAccount[];
  pagination: PaginationInfo;
  message?: string;
}

interface BankAccountFilters {
  search?: string;
  page?: number;
  limit?: number;
  show_inactive?: boolean;
}

interface FormData {
  account_code: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  branch: string;
  currency: string;
  description: string;
}

// API Service
class BankAccountService {
  static async fetchWithAuth(url: string, options: RequestInit = {}) {
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

  static async handleResponse(response: Response) {
    const contentType = response.headers.get('content-type');
    
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
      const responseClone = response.clone();
      
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      } catch (jsonError) {
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
  static async getBankAccounts(filters: BankAccountFilters = {}): Promise<BankAccountResponse> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    params.append('page', String(filters.page || 1));
    params.append('limit', String(filters.limit || 10));
    if (filters.show_inactive) params.append('show_inactive', 'true');

    return this.fetchWithAuth(`/api/bank-accounts?${params}`);
  }

  static async createBankAccount(data: FormData): Promise<BankAccountResponse> {
    return this.fetchWithAuth('/api/bank-accounts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async updateBankAccount(data: FormData): Promise<BankAccountResponse> {
    return this.fetchWithAuth('/api/bank-accounts', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  static async deleteBankAccount(account_code: string): Promise<BankAccountResponse> {
    return this.fetchWithAuth(`/api/bank-accounts?account_code=${account_code}`, {
      method: 'DELETE'
    });
  }

  static async toggleBankAccountStatus(account_code: string, is_active: boolean): Promise<BankAccountResponse> {
    return this.fetchWithAuth('/api/bank-accounts', {
      method: 'PUT',
      body: JSON.stringify({ 
        account_code, 
        is_active: !is_active,
        bank_name: '',
        account_number: '',
        account_holder: '',
        currency: 'IDR'
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
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [formData, setFormData] = useState<FormData>({
    account_code: '',
    bank_name: '',
    account_number: '',
    account_holder: '',
    branch: '',
    currency: 'IDR',
    description: ''
  })

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
    } catch (error: unknown) {
      console.error('Error fetching bank accounts:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load bank accounts'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBankAccounts(1)
  }, [searchTerm, showInactive])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchBankAccounts(newPage)
    }
  }

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }))
    setTimeout(() => fetchBankAccounts(1), 0)
  }

  const generateAccountCode = (): string => {
    const bankPrefix = formData.bank_name ? formData.bank_name.substring(0, 3).toUpperCase() : 'BNK';
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${bankPrefix}${randomNum}`;
  }

  const handleCreateNew = () => {
    setEditingAccount(null)
    setFormData({
      account_code: generateAccountCode(),
      bank_name: '',
      account_number: '',
      account_holder: '',
      branch: '',
      currency: 'IDR',
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
      currency: account.currency || 'IDR',
      description: account.description || ''
    })
    setShowForm(true)
  }

  const updateFormField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const submitForm = async () => {
    if (!formData.account_code.trim() || !formData.bank_name.trim() || !formData.account_number.trim() || !formData.account_holder.trim()) {
      toast.error('Account code, bank name, account number, and account holder are required')
      return
    }

    if (!/^\d{5,16}$/.test(formData.account_number)) {
      toast.error('Account number must be between 5-16 digits')
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
    } catch (error: unknown) {
      console.error('Error saving bank account:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save bank account'
      toast.error(errorMessage)
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
    const confirmMessage = account.is_active 
      ? `Are you sure you want to deactivate ${account.bank_name} - ${formatAccountNumber(account.account_number)}?`
      : `Are you sure you want to activate ${account.bank_name} - ${formatAccountNumber(account.account_number)}?`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      setActionLoading(account.account_code)
      await BankAccountService.toggleBankAccountStatus(account.account_code, account.is_active)
      toast.success(`Bank account ${account.is_active ? 'deactivated' : 'activated'} successfully`)
      await fetchBankAccounts()
    } catch (error: unknown) {
      console.error('Error toggling bank account status:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update bank account status'
      toast.error(errorMessage)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (account: BankAccount) => {
    const confirmMessage = `Are you sure you want to delete ${account.bank_name} - ${formatAccountNumber(account.account_number)}? This action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      setActionLoading(account.account_code)
      await BankAccountService.deleteBankAccount(account.account_code)
      toast.success('Bank account deleted successfully')
      await fetchBankAccounts()
    } catch (error: unknown) {
      console.error('Error deleting bank account:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete bank account'
      toast.error(errorMessage)
    } finally {
      setActionLoading(null)
    }
  }

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

  const formatAccountNumber = (accountNumber: string): string => {
    const cleanNumber = accountNumber.replace(/\D/g, '');
    
    if (cleanNumber.length <= 4) return cleanNumber;
    if (cleanNumber.length <= 8) return `${cleanNumber.slice(0, 4)}-${cleanNumber.slice(4)}`;
    if (cleanNumber.length <= 12) return `${cleanNumber.slice(0, 4)}-${cleanNumber.slice(4, 8)}-${cleanNumber.slice(8)}`;
    
    return cleanNumber.replace(/(.{4})/g, '$1-').replace(/-$/, '');
  }

  const formatAccountNumberInput = (value: string): string => {
    return value.replace(/\D/g, '');
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

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

            {/* Search & Filters */}
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
                      <TableHead className="font-semibold text-gray-900">Account Number</TableHead>
                      <TableHead className="font-semibold text-gray-900">Bank Name</TableHead>
                      <TableHead className="font-semibold text-gray-900">Account Holder</TableHead>
                      <TableHead className="font-semibold text-gray-900">Currency</TableHead>
                      <TableHead className="text-center font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="font-semibold text-gray-900">Created</TableHead>
                      <TableHead className="text-center font-semibold text-gray-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12">
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
                              {account.account_number}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-gray-900">{account.bank_name}</span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-700">{account.account_holder}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {account.currency}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(account.is_active)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Calendar className="h-3 w-3" />
                              {formatDate(account.created_at)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-1 justify-center">
                              <Button
                                onClick={() => handleEdit(account)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-50"
                                title="Edit"
                                disabled={loading || actionLoading !== null}
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
                                disabled={loading || actionLoading === account.account_code}
                              >
                                {actionLoading === account.account_code ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : account.is_active ? (
                                  <X className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                onClick={() => handleDelete(account)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-red-50 text-red-600"
                                title="Delete"
                                disabled={loading || actionLoading === account.account_code}
                              >
                                {actionLoading === account.account_code ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
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

        {/* Bank Account Form */}
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
                      5-16 digits, numbers only
                    </p>
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
                    <Label htmlFor="currency" className="text-sm font-medium">
                      Currency *
                    </Label>
                    <select
                      id="currency"
                      value={formData.currency}
                      onChange={(e) => updateFormField('currency', e.target.value)}
                      disabled={submitting}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="IDR">IDR - Indonesian Rupiah</option>
                      {/* <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="SGD">SGD - Singapore Dollar</option> */}
                    </select>
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