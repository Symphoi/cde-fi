'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Edit, Trash2, RefreshCw, Truck, Check, X, Loader2, ChevronLeft, ChevronRight, Sparkles, Building, User, Phone, Mail, MapPin, FileText, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

// Types
interface Supplier {
  id: number
  supplier_code: string
  supplier_name: string
  contact_person: string
  phone: string
  email: string
  address: string
  tax_id: string
  bank_name: string
  account_number: string
  payment_terms: number
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

interface SupplierFormData {
  supplier_code: string
  supplier_name: string
  contact_person: string
  phone: string
  email: string
  address: string
  tax_id: string
  bank_name: string
  account_number: string
  payment_terms: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// API Service
class SupplierService {
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

  static async getSuppliers(filters: {
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

    return this.fetchWithAuth(`/api/suppliers?${params}`);
  }

  static async createSupplier(data: SupplierFormData) {
    return this.fetchWithAuth('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        payment_terms: parseInt(data.payment_terms) || 30,
        status: 'active'
      })
    });
  }

  static async updateSupplier(data: SupplierFormData & { id: number; status: 'active' | 'inactive' }) {
    return this.fetchWithAuth('/api/suppliers', {
      method: 'PUT',
      body: JSON.stringify({
        ...data,
        payment_terms: parseInt(data.payment_terms) || 30
      })
    });
  }

  static async deleteSupplier(id: number) {
    return this.fetchWithAuth(`/api/suppliers?id=${id}`, {
      method: 'DELETE'
    });
  }
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
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
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState<SupplierFormData>({
    supplier_code: '',
    supplier_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    tax_id: '',
    bank_name: '',
    account_number: '',
    payment_terms: '30'
  })

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null)

  // Fetch data dengan pagination
  const fetchSuppliers = async (page: number = pagination.page) => {
    try {
      setLoading(true)
      const response = await SupplierService.getSuppliers({
        search: searchTerm,
        status: statusFilter,
        page: page,
        limit: pagination.limit
      })

      if (response.success) {
        setSuppliers(response.data)
        setPagination(response.pagination)
      }
    } catch (error: any) {
      console.error('Error fetching suppliers:', error)
      toast.error(error.message || 'Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers(1)
  }, [searchTerm, statusFilter])

  // Generate unique supplier code
  const generateSupplierCode = () => {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const supplierCode = `SUP${randomSuffix}`;
    setFormData(prev => ({ ...prev, supplier_code: supplierCode }))
    toast.success('Supplier code generated successfully')
  }

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchSuppliers(newPage)
    }
  }

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }))
    setTimeout(() => fetchSuppliers(1), 0)
  }

  // Form handlers
  const handleCreateNew = () => {
    setEditingSupplier(null)
    setFormData({
      supplier_code: '',
      supplier_name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      tax_id: '',
      bank_name: '',
      account_number: '',
      payment_terms: '30'
    })
    setShowForm(true)
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      supplier_code: supplier.supplier_code,
      supplier_name: supplier.supplier_name,
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      tax_id: supplier.tax_id || '',
      bank_name: supplier.bank_name || '',
      account_number: supplier.account_number || '',
      payment_terms: supplier.payment_terms?.toString() || '30'
    })
    setShowForm(true)
  }

  const updateFormField = (field: keyof SupplierFormData, value: string) => {
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
    if (!formData.supplier_code.trim()) {
      toast.error('Supplier code is required')
      return
    }
    if (!formData.supplier_name.trim()) {
      toast.error('Supplier name is required')
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

    // Validate payment terms
    const paymentTerms = parseInt(formData.payment_terms)
    if (isNaN(paymentTerms) || paymentTerms < 0) {
      toast.error('Please enter valid payment terms')
      return
    }

    try {
      setSubmitting(true)
      
      if (editingSupplier) {
        const result = await SupplierService.updateSupplier({
          ...formData,
          id: editingSupplier.id,
          status: editingSupplier.status
        })
        toast.success(result.message || 'Supplier updated successfully')
      } else {
        const result = await SupplierService.createSupplier(formData)
        toast.success(result.message || 'Supplier created successfully')
      }

      setShowForm(false)
      setEditingSupplier(null)
      await fetchSuppliers()
    } catch (error: any) {
      console.error('Error saving supplier:', error)
      toast.error(error.message || 'Failed to save supplier')
    } finally {
      setSubmitting(false)
    }
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingSupplier(null)
    setSubmitting(false)
  }

  const handleDeleteClick = (supplier: Supplier) => {
    setSupplierToDelete(supplier)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!supplierToDelete) return

    try {
      setActionLoading(supplierToDelete.supplier_code)
      const result = await SupplierService.deleteSupplier(supplierToDelete.id)
      toast.success(result.message || 'Supplier deleted successfully')
      setShowDeleteModal(false)
      setSupplierToDelete(null)
      await fetchSuppliers()
    } catch (error: any) {
      console.error('Error deleting supplier:', error)
      toast.error(error.message || 'Failed to delete supplier')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setSupplierToDelete(null)
  }

  const toggleStatus = async (supplier: Supplier) => {
    try {
      setActionLoading(supplier.supplier_code)
      const newStatus = supplier.status === 'active' ? 'inactive' : 'active'
      await SupplierService.updateSupplier({
        supplier_code: supplier.supplier_code,
        supplier_name: supplier.supplier_name,
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        tax_id: supplier.tax_id || '',
        bank_name: supplier.bank_name || '',
        account_number: supplier.account_number || '',
        payment_terms: supplier.payment_terms?.toString() || '30',
        id: supplier.id,
        status: newStatus
      })
      toast.success(`Supplier ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
      await fetchSuppliers()
    } catch (error: any) {
      console.error('Error updating supplier status:', error)
      toast.error(error.message || 'Failed to update supplier status')
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

  // Format payment terms
  const formatPaymentTerms = (terms: number) => {
    return `${terms} days`
  }

  // Pagination component
  const PaginationControls = () => (
    <div className="flex items-center justify-between px-6 py-4 border-t">
      <div className="text-sm text-gray-600">
        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
        {pagination.total} suppliers
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
    if (!showDeleteModal || !supplierToDelete) return null

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
          <div className="text-gray-600 mb-6">
            Are you sure you want to delete supplier <strong>{supplierToDelete.supplier_name}</strong> ({supplierToDelete.supplier_code})?
            This action cannot be undone.
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleDeleteCancel}
              disabled={actionLoading === supplierToDelete.supplier_code}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              className="flex-1"
              onClick={handleDeleteConfirm}
              disabled={actionLoading === supplierToDelete.supplier_code}
            >
              {actionLoading === supplierToDelete.supplier_code ? (
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
                    <Truck className="h-6 w-6 text-blue-600" />
                  </div>
                  Suppliers
                </CardTitle>
                <p className="text-gray-600 mt-2">Manage your suppliers</p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateNew} 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => fetchSuppliers()}
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
                  placeholder="Search suppliers..."
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

        {/* Suppliers Table */}
        <Card className="bg-white border shadow-sm rounded-lg">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Loading suppliers...</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-12 text-center font-semibold text-gray-900">No</TableHead>
                      <TableHead className="w-32 font-semibold text-gray-900">Supplier Code</TableHead>
                      <TableHead className="min-w-40 font-semibold text-gray-900">Name</TableHead>
                      <TableHead className="min-w-32 font-semibold text-gray-900">Contact Person</TableHead>
                      <TableHead className="min-w-32 font-semibold text-gray-900">Email</TableHead>
                      <TableHead className="min-w-32 font-semibold text-gray-900">Phone</TableHead>
                      <TableHead className="min-w-32 font-semibold text-gray-900">Payment Terms</TableHead>
                      <TableHead className="w-24 text-center font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="w-28 text-center font-semibold text-gray-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <Truck className="h-12 w-12 mb-4 text-gray-300" />
                            <p className="text-lg font-medium mb-2">
                              {searchTerm || statusFilter ? 'No suppliers found' : 'No suppliers yet'}
                            </p>
                            <p className="text-sm text-gray-400 mb-4">
                              {searchTerm || statusFilter ? 'Try adjusting your search terms' : 'Get started by adding your first supplier'}
                            </p>
                            <Button onClick={handleCreateNew} size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Supplier
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      suppliers.map((supplier, index) => (
                        <TableRow key={supplier.id} className="hover:bg-gray-50/50">
                          <TableCell className="text-center text-gray-600 font-medium">
                            {(pagination.page - 1) * pagination.limit + index + 1}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">
                              {supplier.supplier_code}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">
                            {supplier.supplier_name}
                          </TableCell>
                          <TableCell>
                            {supplier.contact_person ? (
                              <span className="text-gray-600 text-sm">{supplier.contact_person}</span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {supplier.email ? (
                              <span className="text-gray-600 text-sm">{supplier.email}</span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {supplier.phone ? (
                              <span className="text-gray-600 text-sm">{supplier.phone}</span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-gray-600 text-sm">
                              {formatPaymentTerms(supplier.payment_terms)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(supplier.status)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-1 justify-center">
                              <Button
                                onClick={() => handleEdit(supplier)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-50"
                                title="Edit"
                                disabled={actionLoading !== null}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => toggleStatus(supplier)}
                                size="sm"
                                variant="outline"
                                className={`h-8 w-8 p-0 border-gray-300 hover:bg-gray-50 ${
                                  supplier.status === 'active' ? 'text-orange-600' : 'text-green-600'
                                }`}
                                title={supplier.status === 'active' ? 'Deactivate' : 'Activate'}
                                disabled={actionLoading === supplier.supplier_code}
                              >
                                {actionLoading === supplier.supplier_code ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : supplier.status === 'active' ? (
                                  <X className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                onClick={() => handleDeleteClick(supplier)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-red-50 text-red-600"
                                title="Delete"
                                disabled={actionLoading === supplier.supplier_code}
                              >
                                {actionLoading === supplier.supplier_code ? (
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
                {suppliers.length > 0 && <PaginationControls />}
              </>
            )}
          </CardContent>
        </Card>

        {/* Supplier Form */}
        {showForm && (
          <Card className="bg-white border shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Supplier Code */}
                  <div className="space-y-2">
                    <Label htmlFor="supplier_code" className="text-sm font-medium flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Supplier Code *
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="supplier_code"
                        value={formData.supplier_code}
                        onChange={(e) => updateFormField('supplier_code', e.target.value.toUpperCase())}
                        placeholder="SUP001"
                        disabled={!!editingSupplier || submitting}
                        className="flex-1"
                      />
                      {!editingSupplier && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={generateSupplierCode}
                          disabled={submitting}
                          className="whitespace-nowrap"
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          Generate
                        </Button>
                      )}
                    </div>
                    {editingSupplier && (
                      <p className="text-xs text-gray-500 mt-1">
                        Supplier code cannot be changed
                      </p>
                    )}
                  </div>

                  {/* Supplier Name */}
                  <div className="space-y-2">
                    <Label htmlFor="supplier_name" className="text-sm font-medium flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Supplier Name *
                    </Label>
                    <Input
                      id="supplier_name"
                      value={formData.supplier_name}
                      onChange={(e) => updateFormField('supplier_name', e.target.value)}
                      placeholder="PT Example Supplier"
                      disabled={submitting}
                    />
                  </div>

                  {/* Contact Person */}
                  <div className="space-y-2">
                    <Label htmlFor="contact_person" className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Contact Person
                    </Label>
                    <Input
                      id="contact_person"
                      value={formData.contact_person}
                      onChange={(e) => updateFormField('contact_person', e.target.value)}
                      placeholder="John Doe"
                      disabled={submitting}
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
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
                    <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormField('email', e.target.value)}
                      placeholder="supplier@example.com"
                      disabled={submitting}
                      className={formData.email && !validateEmail(formData.email) ? 'border-red-500' : ''}
                    />
                    {formData.email && !validateEmail(formData.email) && (
                      <p className="text-xs text-red-500">Please enter a valid email address</p>
                    )}
                  </div>

                  {/* Tax ID */}
                  <div className="space-y-2">
                    <Label htmlFor="tax_id" className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
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

                  {/* Payment Terms */}
                  <div className="space-y-2">
                    <Label htmlFor="payment_terms" className="text-sm font-medium flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
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

                {/* Bank Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name" className="text-sm font-medium">
                      Bank Name
                    </Label>
                    <Input
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(e) => updateFormField('bank_name', e.target.value)}
                      placeholder="Bank Name"
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account_number" className="text-sm font-medium">
                      Account Number
                    </Label>
                    <Input
                      id="account_number"
                      value={formData.account_number}
                      onChange={(e) => updateFormField('account_number', e.target.value)}
                      placeholder="Account Number"
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address
                  </Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => updateFormField('address', e.target.value)}
                    placeholder="Supplier address..."
                    rows={3}
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
                        {editingSupplier ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingSupplier ? 'Update Supplier' : 'Create Supplier'
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