"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Edit, Trash2, RefreshCw, Users, Check, X, Loader2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

// Types
interface Customer {
  id: number
  customer_code: string
  customer_name: string
  customer_type: 'individual' | 'company' | 'government'
  phone?: string
  email?: string
  billing_address?: string
  shipping_address?: string
  tax_id?: string
  credit_limit: number
  payment_terms: number
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

interface CustomerFormData {
  customer_code: string
  customer_name: string
  customer_type: 'individual' | 'company' | 'government'
  phone: string
  email: string
  billing_address: string
  shipping_address: string
  tax_id: string
  credit_limit: string
  payment_terms: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// API Service
class CustomerService {
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
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      } catch (jsonError) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }
    }
    
    return response.json();
  }

  static async getCustomers(filters: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    params.append('page', String(filters.page || 1));
    params.append('limit', String(filters.limit || 10));

    return this.fetchWithAuth(`/api/customers?${params}`);
  }

  static async createCustomer(data: CustomerFormData) {
    return this.fetchWithAuth('/api/customers', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        credit_limit: parseFloat(data.credit_limit) || 0,
        payment_terms: parseInt(data.payment_terms) || 30,
        status: 'active'
      })
    });
  }

  static async updateCustomer(data: CustomerFormData & { id: number; status: 'active' | 'inactive' }) {
    return this.fetchWithAuth('/api/customers', {
      method: 'PUT',
      body: JSON.stringify({
        ...data,
        credit_limit: parseFloat(data.credit_limit) || 0,
        payment_terms: parseInt(data.payment_terms) || 30
      })
    });
  }

  static async deleteCustomer(id: number) {
    return this.fetchWithAuth(`/api/customers?id=${id}`, {
      method: 'DELETE'
    });
  }
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState<CustomerFormData>({
    customer_code: '',
    customer_name: '',
    customer_type: 'company',
    phone: '',
    email: '',
    billing_address: '',
    shipping_address: '',
    tax_id: '',
    credit_limit: '0',
    payment_terms: '30'
  })

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)

  // Fetch data dengan pagination
  const fetchCustomers = async (page: number = pagination.page) => {
    try {
      setLoading(true)
      const response = await CustomerService.getCustomers({
        search: searchTerm,
        status: statusFilter,
        page: page,
        limit: pagination.limit
      })

      if (response.success) {
        setCustomers(response.data)
        setPagination(response.pagination)
      }
    } catch (error: any) {
      console.error('Error fetching customers:', error)
      toast.error(error.message || 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers(1)
  }, [searchTerm, statusFilter])

  // Generate unique customer code
  const generateCustomerCode = () => {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const customerCode = `CUST${randomSuffix}`;
    setFormData(prev => ({ ...prev, customer_code: customerCode }))
    toast.success('Customer code generated successfully')
  }

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchCustomers(newPage)
    }
  }

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }))
    setTimeout(() => fetchCustomers(1), 0)
  }

  // Form handlers
  const handleCreateNew = () => {
    setEditingCustomer(null)
    setFormData({
      customer_code: '',
      customer_name: '',
      customer_type: 'company',
      phone: '',
      email: '',
      billing_address: '',
      shipping_address: '',
      tax_id: '',
      credit_limit: '0',
      payment_terms: '30'
    })
    setShowForm(true)
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      customer_code: customer.customer_code,
      customer_name: customer.customer_name,
      customer_type: customer.customer_type,
      phone: customer.phone || '',
      email: customer.email || '',
      billing_address: customer.billing_address || '',
      shipping_address: customer.shipping_address || '',
      tax_id: customer.tax_id || '',
      credit_limit: customer.credit_limit.toString(),
      payment_terms: customer.payment_terms.toString()
    })
    setShowForm(true)
  }

  const updateFormField = (field: keyof CustomerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Email validation
  const validateEmail = (email: string) => {
    if (!email) return true // Empty email is allowed
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Phone validation
  const validatePhone = (phone: string) => {
    if (!phone) return true // Empty phone is allowed
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,20}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  const submitForm = async () => {
    // Required field validation
    if (!formData.customer_code.trim()) {
      toast.error('Customer code is required')
      return
    }
    if (!formData.customer_name.trim()) {
      toast.error('Customer name is required')
      return
    }

    // Validate email
    if (formData.email && !validateEmail(formData.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    // Validate phone
    if (formData.phone && !validatePhone(formData.phone)) {
      toast.error('Please enter a valid phone number')
      return
    }

    // Validate credit limit
    const creditLimit = parseFloat(formData.credit_limit)
    if (isNaN(creditLimit) || creditLimit < 0) {
      toast.error('Please enter a valid credit limit')
      return
    }

    // Validate payment terms
    const paymentTerms = parseInt(formData.payment_terms)
    if (isNaN(paymentTerms) || paymentTerms < 0) {
      toast.error('Please enter valid payment terms')
      return
    }

    try {
      setSubmitting(true)
      
      if (editingCustomer) {
        const result = await CustomerService.updateCustomer({
          ...formData,
          id: editingCustomer.id,
          status: editingCustomer.status
        })
        toast.success(result.message || 'Customer updated successfully')
      } else {
        const result = await CustomerService.createCustomer(formData)
        toast.success(result.message || 'Customer created successfully')
      }

      setShowForm(false)
      setEditingCustomer(null)
      await fetchCustomers()
    } catch (error: any) {
      console.error('Error saving customer:', error)
      toast.error(error.message || 'Failed to save customer')
    } finally {
      setSubmitting(false)
    }
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingCustomer(null)
    setSubmitting(false)
  }

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return

    try {
      setActionLoading(customerToDelete.customer_code)
      const result = await CustomerService.deleteCustomer(customerToDelete.id)
      toast.success(result.message || 'Customer deleted successfully')
      setShowDeleteModal(false)
      setCustomerToDelete(null)
      await fetchCustomers()
    } catch (error: any) {
      console.error('Error deleting customer:', error)
      toast.error(error.message || 'Failed to delete customer')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setCustomerToDelete(null)
  }

  const toggleStatus = async (customer: Customer) => {
    try {
      setActionLoading(customer.customer_code)
      const newStatus = customer.status === 'active' ? 'inactive' : 'active'
      await CustomerService.updateCustomer({
        customer_code: customer.customer_code,
        customer_name: customer.customer_name,
        customer_type: customer.customer_type,
        phone: customer.phone || '',
        email: customer.email || '',
        billing_address: customer.billing_address || '',
        shipping_address: customer.shipping_address || '',
        tax_id: customer.tax_id || '',
        credit_limit: customer.credit_limit.toString(),
        payment_terms: customer.payment_terms.toString(),
        id: customer.id,
        status: newStatus
      })
      toast.success(`Customer ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
      await fetchCustomers()
    } catch (error: any) {
      console.error('Error updating customer status:', error)
      toast.error(error.message || 'Failed to update customer status')
    } finally {
      setActionLoading(null)
    }
  }

  // Status badge
  const getStatusBadge = (status: 'active' | 'inactive') => {
    return status === 'active' ? (
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

  // Customer type badge
  const getCustomerTypeBadge = (type: 'individual' | 'company' | 'government') => {
    return type === 'company' ? (
      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
        Company
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
        Individual
      </Badge>
    )
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Pagination component
  const PaginationControls = () => (
    <div className="flex items-center justify-between px-6 py-4 border-t">
      <div className="text-sm text-gray-600">
        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
        {pagination.total} customers
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

  // Delete Confirmation Modal
  const DeleteConfirmationModal = () => {
    if (!showDeleteModal || !customerToDelete) return null

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
          <div className="text-gray-600 mb-6">
            Are you sure you want to delete customer <strong>{customerToDelete.customer_name}</strong> ({customerToDelete.customer_code})?
            This action cannot be undone.
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleDeleteCancel}
              disabled={actionLoading === customerToDelete.customer_code}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              className="flex-1"
              onClick={handleDeleteConfirm}
              disabled={actionLoading === customerToDelete.customer_code}
            >
              {actionLoading === customerToDelete.customer_code ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Yes, Delete'
              )}
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
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  Customers
                </CardTitle>
                <p className="text-gray-600 mt-2">Manage your customers</p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateNew} 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => fetchCustomers()}
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
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
                disabled={loading}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </CardHeader>
        </Card>

        {/* Customers Table */}
        <Card className="bg-white border shadow-sm rounded-lg">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Loading customers...</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-12 text-center font-semibold text-gray-900">No</TableHead>
                      <TableHead className="w-32 font-semibold text-gray-900">Customer Code</TableHead>
                      <TableHead className="min-w-40 font-semibold text-gray-900">Name</TableHead>
                      <TableHead className="min-w-24 font-semibold text-gray-900">Type</TableHead>
                      <TableHead className="min-w-32 font-semibold text-gray-900">Email</TableHead>
                      <TableHead className="min-w-32 font-semibold text-gray-900">Phone</TableHead>
                      <TableHead className="min-w-40 font-semibold text-gray-900">Tax ID</TableHead>
                      <TableHead className="min-w-32 font-semibold text-gray-900">Credit Limit</TableHead>
                      <TableHead className="w-24 text-center font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="w-28 text-center font-semibold text-gray-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <Users className="h-12 w-12 mb-4 text-gray-300" />
                            <p className="text-lg font-medium mb-2">
                              {searchTerm || statusFilter ? 'No customers found' : 'No customers yet'}
                            </p>
                            <p className="text-sm text-gray-400 mb-4">
                              {searchTerm || statusFilter ? 'Try adjusting your search terms' : 'Get started by adding your first customer'}
                            </p>
                            <Button onClick={handleCreateNew} size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Customer
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      customers.map((customer, index) => (
                        <TableRow key={customer.id} className="hover:bg-gray-50/50">
                          <TableCell className="text-center text-gray-600 font-medium">
                            {(pagination.page - 1) * pagination.limit + index + 1}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">
                              {customer.customer_code}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">
                            {customer.customer_name}
                          </TableCell>
                          <TableCell>
                            {getCustomerTypeBadge(customer.customer_type)}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {customer.email ? (
                              <span className="text-gray-600 text-sm">{customer.email}</span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {customer.phone ? (
                              <span className="text-gray-600 text-sm">{customer.phone}</span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[160px] truncate">
                            {customer.tax_id ? (
                              <span className="text-gray-600 text-sm">{customer.tax_id}</span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">
                            {formatCurrency(customer.credit_limit)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(customer.status)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-1 justify-center">
                              <Button
                                onClick={() => handleEdit(customer)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-50"
                                title="Edit"
                                disabled={actionLoading !== null}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => toggleStatus(customer)}
                                size="sm"
                                variant="outline"
                                className={`h-8 w-8 p-0 border-gray-300 hover:bg-gray-50 ${
                                  customer.status === 'active' ? 'text-orange-600' : 'text-green-600'
                                }`}
                                title={customer.status === 'active' ? 'Deactivate' : 'Activate'}
                                disabled={actionLoading === customer.customer_code}
                              >
                                {actionLoading === customer.customer_code ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : customer.status === 'active' ? (
                                  <X className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                onClick={() => handleDeleteClick(customer)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-red-50 text-red-600"
                                title="Delete"
                                disabled={actionLoading === customer.customer_code}
                              >
                                {actionLoading === customer.customer_code ? (
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
                {customers.length > 0 && <PaginationControls />}
              </>
            )}
          </CardContent>
        </Card>

        {/* Customer Form */}
        {showForm && (
          <Card className="bg-white border shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Code */}
                  <div className="space-y-2">
                    <Label htmlFor="customer_code" className="text-sm font-medium">
                      Customer Code *
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="customer_code"
                        value={formData.customer_code}
                        onChange={(e) => updateFormField('customer_code', e.target.value.toUpperCase())}
                        placeholder="CUST001"
                        disabled={!!editingCustomer || submitting}
                        className="flex-1"
                      />
                      {!editingCustomer && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={generateCustomerCode}
                          disabled={submitting}
                          className="whitespace-nowrap"
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          Generate
                        </Button>
                      )}
                    </div>
                    {editingCustomer && (
                      <p className="text-xs text-gray-500 mt-1">
                        Customer code cannot be changed
                      </p>
                    )}
                  </div>

                  {/* Customer Name */}
                  <div className="space-y-2">
                    <Label htmlFor="customer_name" className="text-sm font-medium">
                      Customer Name *
                    </Label>
                    <Input
                      id="customer_name"
                      value={formData.customer_name}
                      onChange={(e) => updateFormField('customer_name', e.target.value)}
                      placeholder="PT Example Customer"
                      disabled={submitting}
                    />
                  </div>

                  {/* Customer Type */}
                  <div className="space-y-2">
                    <Label htmlFor="customer_type" className="text-sm font-medium">
                      Customer Type
                    </Label>
                    <select
                      id="customer_type"
                      value={formData.customer_type}
                      onChange={(e) => updateFormField('customer_type', e.target.value as 'individual' | 'company' | 'government')}
                      disabled={submitting}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="company">Company</option>
                      <option value="individual">Individual</option>
                      <option value="Government">Government</option>
                    </select>
                  </div>

                  {/* Tax ID */}
                  <div className="space-y-2">
                    <Label htmlFor="tax_id" className="text-sm font-medium">
                      Tax ID
                    </Label>
                    <Input
                      id="tax_id"
                      value={formData.tax_id}
                      onChange={(e) => updateFormField('tax_id', e.target.value)}
                      placeholder="12.345.678.9-012.345"
                      disabled={submitting}
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateFormField('phone', e.target.value)}
                      placeholder="+62 812-3456-7890"
                      disabled={submitting}
                      className={formData.phone && !validatePhone(formData.phone) ? 'border-red-500' : ''}
                    />
                    {formData.phone && !validatePhone(formData.phone) && (
                      <p className="text-xs text-red-500">Please enter a valid phone number</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormField('email', e.target.value)}
                      placeholder="customer@example.com"
                      disabled={submitting}
                      className={formData.email && !validateEmail(formData.email) ? 'border-red-500' : ''}
                    />
                    {formData.email && !validateEmail(formData.email) && (
                      <p className="text-xs text-red-500">Please enter a valid email address</p>
                    )}
                  </div>

                  {/* Credit Limit */}
                  <div className="space-y-2">
                    <Label htmlFor="credit_limit" className="text-sm font-medium">
                      Credit Limit
                    </Label>
                    <Input
                      id="credit_limit"
                      type="number"
                      min="0"
                      step="100000"
                      value={formData.credit_limit}
                      onChange={(e) => updateFormField('credit_limit', e.target.value)}
                      placeholder="0"
                      disabled={submitting}
                    />
                  </div>

                  {/* Payment Terms */}
                  <div className="space-y-2">
                    <Label htmlFor="payment_terms" className="text-sm font-medium">
                      Payment Terms (days)
                    </Label>
                    <Input
                      id="payment_terms"
                      type="number"
                      min="0"
                      value={formData.payment_terms}
                      onChange={(e) => updateFormField('payment_terms', e.target.value)}
                      placeholder="30"
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* Billing Address */}
                <div className="space-y-2">
                  <Label htmlFor="billing_address" className="text-sm font-medium">
                    Billing Address
                  </Label>
                  <Textarea
                    id="billing_address"
                    value={formData.billing_address}
                    onChange={(e) => updateFormField('billing_address', e.target.value)}
                    placeholder="Billing address for invoices..."
                    rows={2}
                    disabled={submitting}
                  />
                </div>

                {/* Shipping Address */}
                <div className="space-y-2">
                  <Label htmlFor="shipping_address" className="text-sm font-medium">
                    Shipping Address
                  </Label>
                  <Textarea
                    id="shipping_address"
                    value={formData.shipping_address}
                    onChange={(e) => updateFormField('shipping_address', e.target.value)}
                    placeholder="Shipping address for deliveries..."
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
                        {editingCustomer ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingCustomer ? 'Update Customer' : 'Create Customer'
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