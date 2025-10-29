'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Edit, Trash2, RefreshCw, Tag, Check, X, Loader2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

// Types
interface ProductCategory {
  id: number
  category_code: string
  name: string
  description: string
  is_active: boolean
  created_at: string
}

interface ProductCategoryFormData {
  category_code: string
  name: string
  description: string
  is_active: boolean
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// API Service
class ProductCategoryService {
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

  // Get all product categories with pagination
  static async getProductCategories(filters: {
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

    return this.fetchWithAuth(`/api/product-categories?${params}`);
  }

  // Create product category
  static async createProductCategory(data: ProductCategoryFormData) {
    return this.fetchWithAuth('/api/product-categories', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Update product category
  static async updateProductCategory(data: ProductCategoryFormData & { id: number }) {
    return this.fetchWithAuth('/api/product-categories', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Delete product category
  static async deleteProductCategory(id: number) {
    return this.fetchWithAuth(`/api/product-categories?id=${id}`, {
      method: 'DELETE'
    });
  }

  // Generate category code
  static async generateCategoryCode() {
    return this.fetchWithAuth('/api/product-categories/generate-code');
  }
}

export default function ProductCategoriesPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
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
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)
  const [formData, setFormData] = useState<ProductCategoryFormData>({
    category_code: '',
    name: '',
    description: '',
    is_active: true
  })

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null)

  // Fetch data dengan pagination
  const fetchCategories = async (page: number = pagination.page) => {
    try {
      setLoading(true)
      const response = await ProductCategoryService.getProductCategories({
        search: searchTerm,
        status: statusFilter,
        page: page,
        limit: pagination.limit
      })

      if (response.success) {
        setCategories(response.data)
        setPagination(response.pagination)
      }
    } catch (error: any) {
      console.error('Error fetching product categories:', error)
      toast.error(error.message || 'Failed to load product categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories(1)
  }, [searchTerm, statusFilter])

  // Generate unique category code
  const generateCategoryCode = async () => {
    try {
      // Fallback manual generation
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const categoryCode = `CAT${randomSuffix}`;
      setFormData(prev => ({ ...prev, category_code: categoryCode }))
      toast.success('Category code generated successfully')
    } catch (error: any) {
      console.error('Error generating category code:', error)
      // Fallback manual generation
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const categoryCode = `CAT${randomSuffix}`;
      setFormData(prev => ({ ...prev, category_code: categoryCode }))
      toast.success('Category code generated successfully')
    }
  }

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
      description: '',
      is_active: true
    })
    setShowForm(true)
  }

  const handleEdit = (category: ProductCategory) => {
    setEditingCategory(category)
    setFormData({
      category_code: category.category_code,
      name: category.name,
      description: category.description || '',
      is_active: category.is_active
    })
    setShowForm(true)
  }

  const updateFormField = (field: keyof ProductCategoryFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const submitForm = async () => {
    if (!formData.category_code.trim()) {
      toast.error('Category code is required')
      return
    }
    if (!formData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      setSubmitting(true)
      
      if (editingCategory) {
        const result = await ProductCategoryService.updateProductCategory({
          ...formData,
          id: editingCategory.id
        })
        toast.success(result.message || 'Product category updated successfully')
      } else {
        const result = await ProductCategoryService.createProductCategory(formData)
        toast.success(result.message || 'Product category created successfully')
      }

      setShowForm(false)
      setEditingCategory(null)
      await fetchCategories()
    } catch (error: any) {
      console.error('Error saving product category:', error)
      toast.error(error.message || 'Failed to save product category')
    } finally {
      setSubmitting(false)
    }
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingCategory(null)
    setSubmitting(false)
  }

  const handleDeleteClick = (category: ProductCategory) => {
    setCategoryToDelete(category)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return

    try {
      setLoading(true)
      const result = await ProductCategoryService.deleteProductCategory(categoryToDelete.id)
      toast.success(result.message || 'Product category deleted successfully')
      setShowDeleteModal(false)
      setCategoryToDelete(null)
      fetchCategories()
    } catch (error: any) {
      console.error('Error deleting product category:', error)
      toast.error(error.message || 'Failed to delete product category')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setCategoryToDelete(null)
  }

  const toggleStatus = async (category: ProductCategory) => {
    try {
      setLoading(true)
      await ProductCategoryService.updateProductCategory({
        ...category,
        is_active: !category.is_active
      })
      toast.success(`Product category ${!category.is_active ? 'activated' : 'deactivated'}`)
      fetchCategories()
    } catch (error: any) {
      console.error('Error updating product category status:', error)
      toast.error(error.message || 'Failed to update product category status')
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
        {pagination.total} categories
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
    if (!showDeleteModal || !categoryToDelete) return null

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
          <div className="text-gray-600 mb-6">
            Are you sure you want to delete category <strong>{categoryToDelete.name}</strong> ({categoryToDelete.category_code})?
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
                    <Tag className="h-6 w-6 text-blue-600" />
                  </div>
                  Product Categories
                </CardTitle>
                <p className="text-gray-600 mt-2">Manage your product categories</p>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white">
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

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </CardHeader>
        </Card>

        {/* Categories Table */}
        <Card className="bg-white border shadow-sm rounded-lg">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Loading product categories...</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-12 text-center font-semibold text-gray-900">No</TableHead>
                      <TableHead className="w-32 font-semibold text-gray-900">Category Code</TableHead>
                      <TableHead className="min-w-40 font-semibold text-gray-900">Name</TableHead>
                      <TableHead className="min-w-48 font-semibold text-gray-900">Description</TableHead>
                      <TableHead className="w-24 text-center font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="w-28 text-center font-semibold text-gray-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <Tag className="h-12 w-12 mb-4 text-gray-300" />
                            <p className="text-lg font-medium mb-2">No product categories found</p>
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
                            <span className="font-semibold text-blue-600">
                              {category.category_code}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">
                            {category.name}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {category.description ? (
                              <span className="text-gray-600 text-sm">{category.description}</span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
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
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => toggleStatus(category)}
                                size="sm"
                                variant="outline"
                                className={`h-8 w-8 p-0 border-gray-300 hover:bg-gray-50 ${
                                  category.is_active ? 'text-orange-600' : 'text-green-600'
                                }`}
                                title={category.is_active ? 'Deactivate' : 'Activate'}
                              >
                                {category.is_active ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                              </Button>
                              <Button
                                onClick={() => handleDeleteClick(category)}
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
          <Card className="bg-white border shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {editingCategory ? 'Edit Product Category' : 'Add New Product Category'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category Code */}
                  <div className="space-y-2">
                    <Label htmlFor="category_code" className="text-sm font-medium">
                      Category Code *
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="category_code"
                        value={formData.category_code}
                        onChange={(e) => updateFormField('category_code', e.target.value.toUpperCase())}
                        placeholder="CAT001"
                        disabled={!!editingCategory || submitting}
                        className="flex-1"
                      />
                      {!editingCategory && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={generateCategoryCode}
                          disabled={submitting}
                          className="whitespace-nowrap"
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          Generate
                        </Button>
                      )}
                    </div>
                    {editingCategory && (
                      <p className="text-xs text-gray-500 mt-1">
                        Category code cannot be changed
                      </p>
                    )}
                  </div>

                  {/* Category Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Category Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateFormField('name', e.target.value)}
                      placeholder="Electronics"
                      disabled={submitting}
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => updateFormField('description', e.target.value)}
                      placeholder="Category description..."
                      rows={3}
                      disabled={submitting}
                    />
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

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal />
      </div>
    </div>
  )
}