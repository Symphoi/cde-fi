'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Edit, Trash2, RefreshCw, BookOpen, Check, X, Loader2, ChevronLeft, ChevronRight, Sparkles, ChevronRightIcon, FolderOpen } from 'lucide-react'
import { toast } from 'sonner'

// Types
interface ChartOfAccount {
  id: number
  account_code: string
  account_name: string
  account_type: string
  parent_account_code: string | null
  is_active: boolean
  created_at: string
  children?: ChartOfAccount[]
}

interface ChartOfAccountFormData {
  account_code: string
  account_name: string
  account_type: string
  parent_account_code: string | null
  is_active: boolean
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// API Service
class ChartOfAccountService {
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  static async getChartOfAccounts(filters: {
    search?: string;
    accountType?: string;
    showInactive?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.accountType) params.append('accountType', filters.accountType);
    if (filters.showInactive) params.append('showInactive', 'true');
    params.append('page', String(filters.page || 1));
    params.append('limit', String(filters.limit || 10));

    return this.fetchWithAuth(`/api/chart-of-accounts?${params}`);
  }

  static async createAccount(data: ChartOfAccountFormData) {
    return this.fetchWithAuth('/api/chart-of-accounts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async updateAccount(data: ChartOfAccountFormData & { id: number }) {
    return this.fetchWithAuth('/api/chart-of-accounts', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  static async deleteAccount(id: number) {
    return this.fetchWithAuth(`/api/chart-of-accounts?id=${id}`, {
      method: 'DELETE'
    });
  }

  static async getAccountTypes() {
    return [
      { value: 'asset', label: 'Asset' },
      { value: 'liability', label: 'Liability' },
      { value: 'equity', label: 'Equity' },
      { value: 'revenue', label: 'Revenue' },
      { value: 'expense', label: 'Expense' }
    ];
  }
}

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [hierarchicalAccounts, setHierarchicalAccounts] = useState<ChartOfAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [accountTypeFilter, setAccountTypeFilter] = useState('')
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
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null)
  const [formData, setFormData] = useState<ChartOfAccountFormData>({
    account_code: '',
    account_name: '',
    account_type: '',
    parent_account_code: null,
    is_active: true
  })

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<ChartOfAccount | null>(null)

  // Account types for dropdown
  const [accountTypes, setAccountTypes] = useState<{value: string, label: string}[]>([])

  // Fetch data dengan pagination
  const fetchAccounts = async (page: number = pagination.page) => {
    try {
      setLoading(true)
      const response = await ChartOfAccountService.getChartOfAccounts({
        search: searchTerm,
        accountType: accountTypeFilter,
        showInactive: showInactive,
        page: page,
        limit: pagination.limit
      })

      if (response.success) {
        setAccounts(response.data)
        setHierarchicalAccounts(response.hierarchicalData || [])
        setPagination(response.pagination)
      }
    } catch (error: any) {
      console.error('Error fetching accounts:', error)
      toast.error(error.message || 'Failed to load chart of accounts')
    } finally {
      setLoading(false)
    }
  }

  // Load account types
  const loadAccountTypes = async () => {
    const types = await ChartOfAccountService.getAccountTypes()
    setAccountTypes(types)
  }

  useEffect(() => {
    fetchAccounts(1)
    loadAccountTypes()
  }, [searchTerm, accountTypeFilter, showInactive])

  // Generate account code suggestion
  const generateAccountCode = () => {
    // Simple sequential suggestion - in real app, you might want more sophisticated logic
    const lastCode = accounts.length > 0 ? 
      Math.max(...accounts.map(acc => parseInt(acc.account_code))) : 1000;
    const newCode = (lastCode + 1).toString().padStart(4, '0');
    setFormData(prev => ({ ...prev, account_code: newCode }))
    toast.success('Account code suggestion generated')
  }

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchAccounts(newPage)
    }
  }

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }))
    setTimeout(() => fetchAccounts(1), 0)
  }

  // Form handlers
  const handleCreateNew = () => {
    setEditingAccount(null)
    setFormData({
      account_code: '',
      account_name: '',
      account_type: '',
      parent_account_code: null,
      is_active: true
    })
    setShowForm(true)
  }

  const handleEdit = (account: ChartOfAccount) => {
    setEditingAccount(account)
    setFormData({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      parent_account_code: account.parent_account_code,
      is_active: account.is_active
    })
    setShowForm(true)
  }

  const updateFormField = (field: keyof ChartOfAccountFormData, value: string | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const submitForm = async () => {
    if (!formData.account_code.trim()) {
      toast.error('Account code is required')
      return
    }
    if (!formData.account_name.trim()) {
      toast.error('Account name is required')
      return
    }
    if (!formData.account_type) {
      toast.error('Account type is required')
      return
    }

    // Validate account code is numeric
    if (!/^\d+$/.test(formData.account_code)) {
      toast.error('Account code must contain only numbers')
      return
    }

    try {
      setSubmitting(true)
      
      if (editingAccount) {
        const result = await ChartOfAccountService.updateAccount({
          ...formData,
          id: editingAccount.id
        })
        toast.success(result.message || 'Account updated successfully')
      } else {
        const result = await ChartOfAccountService.createAccount(formData)
        toast.success(result.message || 'Account created successfully')
      }

      setShowForm(false)
      setEditingAccount(null)
      await fetchAccounts()
    } catch (error: any) {
      console.error('Error saving account:', error)
      toast.error(error.message || 'Failed to save account')
    } finally {
      setSubmitting(false)
    }
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingAccount(null)
    setSubmitting(false)
  }

  const handleDeleteClick = (account: ChartOfAccount) => {
    setAccountToDelete(account)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return

    try {
      setLoading(true)
      const result = await ChartOfAccountService.deleteAccount(accountToDelete.id)
      toast.success(result.message || 'Account deleted successfully')
      setShowDeleteModal(false)
      setAccountToDelete(null)
      fetchAccounts()
    } catch (error: any) {
      console.error('Error deleting account:', error)
      toast.error(error.message || 'Failed to delete account')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setAccountToDelete(null)
  }

  const toggleStatus = async (account: ChartOfAccount) => {
    try {
      setLoading(true)
      await ChartOfAccountService.updateAccount({
        ...account,
        is_active: !account.is_active
      })
      toast.success(`Account ${!account.is_active ? 'activated' : 'deactivated'}`)
      fetchAccounts()
    } catch (error: any) {
      console.error('Error updating account status:', error)
      toast.error(error.message || 'Failed to update account status')
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

  // Account type badge
  const getAccountTypeBadge = (type: string) => {
    const typeColors = {
      asset: 'bg-blue-100 text-blue-800 border-blue-200',
      liability: 'bg-red-100 text-red-800 border-red-200',
      equity: 'bg-purple-100 text-purple-800 border-purple-200',
      revenue: 'bg-green-100 text-green-800 border-green-200',
      expense: 'bg-orange-100 text-orange-800 border-orange-200'
    };

    return (
      <Badge className={`${typeColors[type as keyof typeof typeColors] || 'bg-gray-100 text-gray-800'} text-xs`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    )
  }

  // Recursive function to render tree rows
  // Ganti function renderTreeRows dengan yang ini:
const renderTreeRows = (accounts: ChartOfAccount[], level = 0): React.ReactElement[] => {
  let rows: React.ReactElement[] = [];

  accounts.forEach((account, index) => {
    const paddingLeft = level * 20;
    
    rows.push(
      <TableRow key={account.id} className="hover:bg-gray-50/50">
        <TableCell className="text-center text-gray-600 font-medium">
          {(pagination.page - 1) * pagination.limit + index + 1}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2" style={{ paddingLeft }}>
            {account.children && account.children.length > 0 ? (
              <FolderOpen className="h-4 w-4 text-blue-500" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-400" />
            )}
            <span className="font-semibold text-blue-600">
              {account.account_code}
            </span>
          </div>
        </TableCell>
        <TableCell className="font-medium text-gray-900">
          {account.account_name}
        </TableCell>
        <TableCell>
          {getAccountTypeBadge(account.account_type)}
        </TableCell>
        <TableCell>
          {account.parent_account_code ? (
            <span className="text-gray-600 text-sm">{account.parent_account_code}</span>
          ) : (
            <span className="text-gray-400 text-sm">-</span>
          )}
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
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              onClick={() => toggleStatus(account)}
              size="sm"
              variant="outline"
              className={`h-8 w-8 p-0 border-gray-300 hover:bg-gray-50 ${
                account.is_active ? 'text-orange-600' : 'text-green-600'
              }`}
              title={account.is_active ? 'Deactivate' : 'Activate'}
            >
              {account.is_active ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
            </Button>
            <Button
              onClick={() => handleDeleteClick(account)}
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 border-gray-300 hover:bg-gray-50"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );

    // Recursively render children
    if (account.children && account.children.length > 0) {
      const childRows = renderTreeRows(account.children, level + 1);
      rows = [...rows, ...childRows];
    }
  });

  return rows;
}

  // Pagination component
  const PaginationControls = () => (
    <div className="flex items-center justify-between px-6 py-4 border-t">
      <div className="text-sm text-gray-600">
        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
        {pagination.total} accounts
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Rows per page:</span>
          <select
            value={pagination.limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
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
            disabled={pagination.page === 1}
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
            disabled={pagination.page === pagination.totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  // Delete Confirmation Modal
  const DeleteConfirmationModal = () => {
    if (!showDeleteModal || !accountToDelete) return null

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
          <div className="text-gray-600 mb-6">
            Are you sure you want to delete account <strong>{accountToDelete.account_name}</strong> ({accountToDelete.account_code})?
            This action cannot be undone.
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleDeleteCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              className="flex-1"
              onClick={handleDeleteConfirm}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <Card className="bg-white border shadow-sm rounded-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  Chart of Accounts
                </CardTitle>
                <p className="text-gray-600 mt-2">Manage your accounting accounts</p>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => fetchAccounts()}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={accountTypeFilter}
                onChange={(e) => setAccountTypeFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="">All Types</option>
                {accountTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Show Inactive
              </label>
            </div>
          </CardHeader>
        </Card>

        {/* Accounts Table */}
        <Card className="bg-white border shadow-sm rounded-lg">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Loading accounts...</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-12 text-center font-semibold text-gray-900">No</TableHead>
                      <TableHead className="w-32 font-semibold text-gray-900">Account Code</TableHead>
                      <TableHead className="min-w-40 font-semibold text-gray-900">Account Name</TableHead>
                      <TableHead className="min-w-32 font-semibold text-gray-900">Type</TableHead>
                      <TableHead className="min-w-32 font-semibold text-gray-900">Parent Account</TableHead>
                      <TableHead className="w-24 text-center font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="w-28 text-center font-semibold text-gray-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <BookOpen className="h-12 w-12 mb-4 text-gray-300" />
                            <p className="text-lg font-medium mb-2">No accounts found</p>
                            <Button onClick={handleCreateNew} size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Account
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      renderTreeRows(hierarchicalAccounts)
                    )}
                  </TableBody>
                </Table>
                
                {/* Pagination Controls */}
                {accounts.length > 0 && <PaginationControls />}
              </>
            )}
          </CardContent>
        </Card>

        {/* Account Form - Below Table */}
        {showForm && (
          <Card className="bg-white border shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {editingAccount ? 'Edit Account' : 'Add New Account'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Account Code */}
                  <div className="space-y-2">
                    <Label htmlFor="account_code" className="text-sm font-medium">
                      Account Code *
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="account_code"
                        value={formData.account_code}
                        onChange={(e) => updateFormField('account_code', e.target.value)}
                        placeholder="1101"
                        disabled={!!editingAccount || submitting}
                        className="flex-1"
                      />
                      {!editingAccount && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={generateAccountCode}
                          disabled={submitting}
                          className="whitespace-nowrap"
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          Suggest
                        </Button>
                      )}
                    </div>
                    {editingAccount && (
                      <p className="text-xs text-gray-500 mt-1">
                        Account code cannot be changed
                      </p>
                    )}
                  </div>

                  {/* Account Name */}
                  <div className="space-y-2">
                    <Label htmlFor="account_name" className="text-sm font-medium">
                      Account Name *
                    </Label>
                    <Input
                      id="account_name"
                      value={formData.account_name}
                      onChange={(e) => updateFormField('account_name', e.target.value)}
                      placeholder="Cash"
                      disabled={submitting}
                    />
                  </div>

                  {/* Account Type */}
                  <div className="space-y-2">
                    <Label htmlFor="account_type" className="text-sm font-medium">
                      Account Type *
                    </Label>
                    <select
                      id="account_type"
                      value={formData.account_type}
                      onChange={(e) => updateFormField('account_type', e.target.value)}
                      disabled={submitting}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    >
                      <option value="">Select Type</option>
                      {accountTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Parent Account */}
                  <div className="space-y-2">
                    <Label htmlFor="parent_account_code" className="text-sm font-medium">
                      Parent Account
                    </Label>
                    <select
                      id="parent_account_code"
                      value={formData.parent_account_code || ''}
                      onChange={(e) => updateFormField('parent_account_code', e.target.value || null)}
                      disabled={submitting}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    >
                      <option value="">No Parent</option>
                      {accounts
                        .filter(acc => acc.is_active && acc.account_type === formData.account_type)
                        .map(account => (
                          <option key={account.id} value={account.account_code}>
                            {account.account_code} - {account.account_name}
                          </option>
                        ))
                      }
                    </select>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => updateFormField('is_active', e.target.checked)}
                      disabled={submitting}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="is_active" className="text-sm font-medium">
                      Active
                    </Label>
                  </div>
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

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal />
      </div>
    </div>
  )
}