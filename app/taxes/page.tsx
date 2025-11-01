"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Edit, Trash2, RefreshCw, Tag, Check, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

// Types
interface TaxType {
  id: number
  tax_code: string
  name: string
  description: string
  tax_rate: number
  tax_type: 'vat' | 'pph' | 'other'
  is_active: boolean
  created_at: string
  updated_at: string
}

interface TaxFormData {
  tax_code: string
  name: string
  description: string
  tax_rate: string
  tax_type: 'vat' | 'pph' | 'other'
  is_active: boolean
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// API Service
class TaxService {
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

  // Get all tax types with pagination
  static async getTaxTypes(filters: {
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

    return this.fetchWithAuth(`/api/taxes?${params}`);
  }

  // Create tax type
  static async createTaxType(data: TaxFormData) {
    return this.fetchWithAuth('/api/taxes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Update tax type
  static async updateTaxType(data: TaxFormData) {
    return this.fetchWithAuth('/api/taxes', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Delete tax type
  static async deleteTaxType(tax_code: string) {
    return this.fetchWithAuth(`/api/taxes?tax_code=${tax_code}`, {
      method: 'DELETE'
    });
  }
}

export default function TaxesPage() {
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
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
  const [editingTax, setEditingTax] = useState<TaxType | null>(null)
  const [formData, setFormData] = useState<TaxFormData>({
    tax_code: '',
    name: '',
    description: '',
    tax_rate: '',
    tax_type: 'vat',
    is_active: true
  })

  // Fetch data dengan pagination
  const fetchTaxTypes = async (page: number = pagination.page) => {
    try {
      setLoading(true)
      const response = await TaxService.getTaxTypes({
        search: searchTerm,
        page: page,
        limit: pagination.limit,
        show_inactive: showInactive
      })

      if (response.success) {
        setTaxTypes(response.data)
        setPagination(response.pagination)
      }
    } catch (error: any) {
      console.error('Error fetching tax types:', error)
      toast.error(error.message || 'Failed to load tax types')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTaxTypes(1)
  }, [searchTerm, showInactive])

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchTaxTypes(newPage)
    }
  }

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }))
    setTimeout(() => fetchTaxTypes(1), 0)
  }

  // Form handlers
  const handleCreateNew = () => {
    setEditingTax(null)
    setFormData({
      tax_code: '',
      name: '',
      description: '',
      tax_rate: '',
      tax_type: 'vat',
      is_active: true
    })
    setShowForm(true)
  }

  const handleEdit = (tax: TaxType) => {
    setEditingTax(tax)
    setFormData({
      tax_code: tax.tax_code,
      name: tax.name,
      description: tax.description || '',
      tax_rate: tax.tax_rate.toString(),
      tax_type: tax.tax_type,
      is_active: tax.is_active
    })
    setShowForm(true)
  }

  const updateFormField = (field: keyof TaxFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const submitForm = async () => {
    if (!formData.tax_code.trim() || !formData.name.trim() || !formData.tax_rate.trim()) {
      toast.error('Tax code, name, and tax rate are required')
      return
    }

    // Validate tax rate is a number
    const taxRate = parseFloat(formData.tax_rate)
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      toast.error('Tax rate must be a valid number between 0 and 100')
      return
    }

    try {
      setSubmitting(true)
      
      if (editingTax) {
        const result = await TaxService.updateTaxType(formData)
        toast.success(result.message || 'Tax type updated successfully')
      } else {
        const result = await TaxService.createTaxType(formData)
        toast.success(result.message || 'Tax type created successfully')
      }

      setShowForm(false)
      setEditingTax(null)
      await fetchTaxTypes()
    } catch (error: any) {
      console.error('Error saving tax:', error)
      toast.error(error.message || 'Failed to save tax type')
    } finally {
      setSubmitting(false)
    }
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingTax(null)
    setSubmitting(false)
  }

  const handleDelete = async (tax: TaxType) => {
    if (!confirm(`Are you sure you want to delete "${tax.name}"?`)) {
      return
    }

    try {
      setActionLoading(tax.tax_code)
      const result = await TaxService.deleteTaxType(tax.tax_code)
      toast.success(result.message || 'Tax type deleted successfully')
      await fetchTaxTypes()
    } catch (error: any) {
      console.error('Error deleting tax:', error)
      toast.error(error.message || 'Failed to delete tax type')
    } finally {
      setActionLoading(null)
    }
  }

  const toggleStatus = async (tax: TaxType) => {
    try {
      setActionLoading(tax.tax_code)
      await TaxService.updateTaxType({
        ...formData,
        tax_code: tax.tax_code,
        name: tax.name,
        tax_rate: tax.tax_rate.toString(),
        tax_type: tax.tax_type,
        is_active: !tax.is_active
      })
      toast.success(`Tax type ${!tax.is_active ? 'activated' : 'deactivated'}`)
      await fetchTaxTypes()
    } catch (error: any) {
      console.error('Error updating tax status:', error)
      toast.error(error.message || 'Failed to update tax status')
    } finally {
      setActionLoading(null)
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

  // Tax type badge
  const getTaxTypeBadge = (taxType: string) => {
    const typeConfig = {
      vat: { label: 'VAT', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      pph: { label: 'PPH', color: 'bg-orange-100 text-orange-800 border-orange-200' },
      other: { label: 'Other', color: 'bg-gray-100 text-gray-800 border-gray-200' }
    }
    
    const config = typeConfig[taxType as keyof typeof typeConfig] || typeConfig.other
    
    return (
      <Badge variant="outline" className={`${config.color} text-xs`}>
        {config.label}
      </Badge>
    )
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
                    <Tag className="h-6 w-6 text-blue-600" />
                  </div>
                  Tax Types
                </CardTitle>
                <p className="text-gray-600 mt-2">Manage your tax types and rates</p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateNew}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tax Type
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => fetchTaxTypes()}
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
                  placeholder="Search tax code or name..."
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

        {/* Tax Types Table */}
        <Card className="bg-white border shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Loading tax types...</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-16 text-center font-semibold text-gray-900">No</TableHead>
                      <TableHead className="font-semibold text-gray-900">Tax Code</TableHead>
                      <TableHead className="font-semibold text-gray-900">Name</TableHead>
                      <TableHead className="font-semibold text-gray-900">Tax Rate</TableHead>
                      <TableHead className="font-semibold text-gray-900">Type</TableHead>
                      <TableHead className="font-semibold text-gray-900">Description</TableHead>
                      <TableHead className="text-center font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="text-center font-semibold text-gray-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <Tag className="h-12 w-12 mb-4 text-gray-300" />
                            <p className="text-lg font-medium mb-2">
                              {searchTerm || showInactive ? 'No tax types found' : 'No tax types yet'}
                            </p>
                            <p className="text-sm text-gray-400 mb-4">
                              {searchTerm || showInactive ? 'Try adjusting your search terms' : 'Get started by adding your first tax type'}
                            </p>
                            <Button onClick={handleCreateNew} size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Tax Type
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      taxTypes.map((tax, index) => (
                        <TableRow key={tax.id} className="hover:bg-gray-50/50">
                          <TableCell className="text-center text-gray-600 font-medium">
                            {(pagination.page - 1) * pagination.limit + index + 1}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">
                              {tax.tax_code}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">
                            {tax.name}
                          </TableCell>
                          <TableCell className="font-semibold text-gray-900">
                            {tax.tax_rate}%
                          </TableCell>
                          <TableCell>
                            {getTaxTypeBadge(tax.tax_type)}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <span className="text-gray-600 text-sm line-clamp-2">
                              {tax.description || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(tax.is_active)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-1 justify-center">
                              <Button
                                onClick={() => handleEdit(tax)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-50"
                                title="Edit"
                                disabled={loading || actionLoading !== null}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => toggleStatus(tax)}
                                size="sm"
                                variant="outline"
                                className={`h-8 w-8 p-0 border-gray-300 hover:bg-gray-50 ${
                                  tax.is_active ? 'text-orange-600' : 'text-green-600'
                                }`}
                                title={tax.is_active ? 'Deactivate' : 'Activate'}
                                disabled={loading || actionLoading === tax.tax_code}
                              >
                                {actionLoading === tax.tax_code ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : tax.is_active ? (
                                  <X className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                onClick={() => handleDelete(tax)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-red-50 text-red-600"
                                title="Delete"
                                disabled={loading || actionLoading === tax.tax_code}
                              >
                                {actionLoading === tax.tax_code ? (
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
                {taxTypes.length > 0 && <PaginationControls />}
              </>
            )}
          </CardContent>
        </Card>

        {/* Tax Form */}
        {showForm && (
          <Card className="bg-white border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {editingTax ? 'Edit Tax Type' : 'Add New Tax Type'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax_code" className="text-sm font-medium">
                      Tax Code *
                    </Label>
                    <Input
                      id="tax_code"
                      value={formData.tax_code}
                      onChange={(e) => updateFormField('tax_code', e.target.value.toUpperCase())}
                      placeholder="TAX001"
                      disabled={!!editingTax || submitting}
                    />
                    {editingTax && (
                      <p className="text-xs text-gray-500 mt-1">
                        Tax code cannot be changed
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Tax Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateFormField('name', e.target.value)}
                      placeholder="PPN 11%"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax_rate" className="text-sm font-medium">
                      Tax Rate (%) *
                    </Label>
                    <Input
                      id="tax_rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.tax_rate}
                      onChange={(e) => updateFormField('tax_rate', e.target.value)}
                      placeholder="11.00"
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax_type" className="text-sm font-medium">
                      Tax Type *
                    </Label>
                    <select
                      id="tax_type"
                      value={formData.tax_type}
                      onChange={(e) => updateFormField('tax_type', e.target.value)}
                      disabled={submitting}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="vat">VAT</option>
                      <option value="pph">PPH</option>
                      <option value="other">Other</option>
                    </select>
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
                    placeholder="Tax description..."
                    rows={3}
                    disabled={submitting}
                  />
                </div>

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

                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={submitForm} 
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {editingTax ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingTax ? 'Update Tax Type' : 'Create Tax Type'
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