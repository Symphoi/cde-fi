"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Edit, Check, X, Loader2, ChevronLeft, ChevronRight, RefreshCw, Receipt } from 'lucide-react'
import { toast } from 'sonner'

// Types
interface ReimbursementCategory {
  id: number
  category_code: string
  name: string
  description: string
  is_active: boolean
  created_at: string
}

interface CategoryFormData {
  category_code: string
  name: string
  description: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// API Service
class ReimbursementCategoryService {
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

  // Get all categories with pagination
  static async getCategories(filters: {
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

    return this.fetchWithAuth(`/api/reimbursement-categories?${params}`);
  }

  static async createCategory(data: CategoryFormData) {
    return this.fetchWithAuth('/api/reimbursement-categories', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async updateCategory(data: CategoryFormData) {
    return this.fetchWithAuth('/api/reimbursement-categories', {
      method: 'PUT',
      body: JSON.stringify({ ...data, is_active: true })
    });
  }

  // Toggle category status
  static async toggleCategoryStatus(category_code: string, is_active: boolean) {
    return this.fetchWithAuth('/api/reimbursement-categories', {
      method: 'PUT',
      body: JSON.stringify({ 
        category_code, 
        is_active: !is_active,
        name: '', // Required fields but won't be used
        description: ''
      })
    });
  }

  // Delete category
  static async deleteCategory(category_code: string) {
    return this.fetchWithAuth(`/api/reimbursement-categories?category_code=${category_code}`, {
      method: 'DELETE'
    });
  }
}

export default function ReimbursementCategoriesPage() {
  const [categories, setCategories] = useState<ReimbursementCategory[]>([])
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
  const [editingCategory, setEditingCategory] = useState<ReimbursementCategory | null>(null)
  const [formData, setFormData] = useState<CategoryFormData>({
    category_code: '',
    name: '',
    description: ''
  })

  // Fetch data dengan pagination
  const fetchCategories = async (page: number = pagination.page) => {
    try {
      setLoading(true)
      const response = await ReimbursementCategoryService.getCategories({
        search: searchTerm,
        page: page,
        limit: pagination.limit,
        show_inactive: showInactive
      })

      if (response.success) {
        setCategories(response.data)
        setPagination(response.pagination)
      }
    } catch (error: any) {
      console.error('Error fetching categories:', error)
      toast.error(error.message || 'Failed to load reimbursement categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories(1)
  }, [searchTerm, showInactive])

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchCategories(newPage)
    }
  }

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }))
    setTimeout(() => fetchCategories(1), 0)
  }

  // Form handlers
  const handleCreateNew = () => {
    setEditingCategory(null)
    setFormData({
      category_code: '',
      name: '',
      description: ''
    })
    setShowForm(true)
  }

  const handleEdit = (category: ReimbursementCategory) => {
    setEditingCategory(category)
    setFormData({
      category_code: category.category_code,
      name: category.name,
      description: category.description || ''
    })
    setShowForm(true)
  }

  const updateFormField = (field: keyof CategoryFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const submitForm = async () => {
    if (!formData.category_code.trim() || !formData.name.trim()) {
      toast.error('Category code and name are required')
      return
    }

    try {
      setSubmitting(true)
      
      if (editingCategory) {
        const result = await ReimbursementCategoryService.updateCategory(formData)
        toast.success(result.message || 'Category updated successfully')
      } else {
        const result = await ReimbursementCategoryService.createCategory(formData)
        toast.success(result.message || 'Category created successfully')
      }

      setShowForm(false)
      setEditingCategory(null)
      await fetchCategories()
    } catch (error: any) {
      console.error('Error saving category:', error)
      toast.error(error.message || 'Failed to save category')
    } finally {
      setSubmitting(false)
    }
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingCategory(null)
    setSubmitting(false)
  }

  const handleToggleStatus = async (category: ReimbursementCategory) => {
    try {
      setLoading(true)
      await ReimbursementCategoryService.toggleCategoryStatus(category.category_code, category.is_active)
      toast.success(`Category ${category.is_active ? 'deactivated' : 'activated'} successfully`)
      await fetchCategories()
    } catch (error: any) {
      console.error('Error toggling category status:', error)
      toast.error(error.message || 'Failed to update category status')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (category: ReimbursementCategory) => {
    if (!confirm(`Are you sure you want to delete category "${category.name}"?`)) {
      return
    }

    try {
      setLoading(true)
      await ReimbursementCategoryService.deleteCategory(category.category_code)
      toast.success('Category deleted successfully')
      await fetchCategories()
    } catch (error: any) {
      console.error('Error deleting category:', error)
      toast.error(error.message || 'Failed to delete category')
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
                    <Receipt className="h-6 w-6 text-blue-600" />
                  </div>
                  Reimbursement Categories
                </CardTitle>
                <p className="text-gray-600 mt-2">Manage reimbursement categories for dropdown selection</p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateNew}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => fetchCategories()}
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
                  placeholder="Search category code, name, or description..."
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

        {/* Categories Table */}
        <Card className="bg-white border shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Loading categories...</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-16 text-center font-semibold text-gray-900">No</TableHead>
                      <TableHead className="font-semibold text-gray-900">Category Code</TableHead>
                      <TableHead className="font-semibold text-gray-900">Name</TableHead>
                      <TableHead className="font-semibold text-gray-900">Description</TableHead>
                      <TableHead className="text-center font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="text-center font-semibold text-gray-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <Receipt className="h-12 w-12 mb-4 text-gray-300" />
                            <p className="text-lg font-medium mb-2">
                              {searchTerm || showInactive ? 'No categories found' : 'No categories yet'}
                            </p>
                            <p className="text-sm text-gray-400 mb-4">
                              {searchTerm || showInactive ? 'Try adjusting your search terms' : 'Get started by adding your first category'}
                            </p>
                            <Button onClick={handleCreateNew} size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Category
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((category, index) => (
                        <TableRow key={category.id} className="hover:bg-gray-50/50">
                          <TableCell className="text-center text-gray-600 font-medium">
                            {(pagination.page - 1) * pagination.limit + index + 1}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">
                              {category.category_code}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">
                            {category.name}
                          </TableCell>
                          <TableCell className="text-gray-700 max-w-md truncate">
                            {category.description || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(category.is_active)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-1 justify-center">
                              <Button
                                onClick={() => handleEdit(category)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-50"
                                title="Edit"
                                disabled={loading}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => handleToggleStatus(category)}
                                size="sm"
                                variant="outline"
                                className={`h-8 w-8 p-0 border-gray-300 hover:bg-gray-50 ${
                                  category.is_active ? 'text-orange-600' : 'text-green-600'
                                }`}
                                title={category.is_active ? 'Deactivate' : 'Activate'}
                                disabled={loading}
                              >
                                {category.is_active ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                
                {/* Pagination Controls */}
                {categories.length > 0 && <PaginationControls />}
              </>
            )}
          </CardContent>
        </Card>

        {/* Category Form - Below Table */}
        {showForm && (
          <Card className="bg-white border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category_code" className="text-sm font-medium">
                      Category Code *
                    </Label>
                    <Input
                      id="category_code"
                      value={formData.category_code}
                      onChange={(e) => updateFormField('category_code', e.target.value.toUpperCase())}
                      placeholder="TRANS001"
                      disabled={!!editingCategory || submitting}
                    />
                    {editingCategory && (
                      <p className="text-xs text-gray-500 mt-1">
                        Category code cannot be changed
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Category Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateFormField('name', e.target.value)}
                      placeholder="e.g., Transportasi, Makanan, Akomodasi"
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
                    placeholder="Description for this reimbursement category..."
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
                        {editingCategory ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingCategory ? 'Update Category' : 'Create Category'
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