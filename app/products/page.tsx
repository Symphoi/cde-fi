'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Edit, Trash2, RefreshCw, Package, Check, X, Loader2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

// Types
interface Product {
  id: number
  product_code: string
  name: string
  description: string
  unit: string
  category_code: string
  is_active: boolean
  created_at: string
}

interface ProductFormData {
  product_code: string
  name: string
  description: string
  unit: string
  category_code: string
  is_active: boolean
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// API Service
class ProductService {
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
    // Clone response untuk bisa baca body multiple times
    const responseClone = response.clone();
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('text/html')) {
      const text = await responseClone.text();
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
        // Coba parse sebagai JSON dulu
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      } catch (jsonError) {
        // Kalo gagal, baca sebagai text dari clone
        const errorText = await responseClone.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }
    }
    
    return response.json();
  }

  // Get all products with pagination
  // Di ProductService - UPDATE interface
static async getProducts(filters: {
  search?: string;
  status?: string;
  category?: string;
  type?: string;  // ← TAMBAH INI
  page?: number;
  limit?: number;
} = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.status) params.append('status', filters.status);
  if (filters.category) params.append('category', filters.category);
  if (filters.type) params.append('type', filters.type);  // ← TAMBAH INI
  params.append('page', String(filters.page || 1));
  params.append('limit', String(filters.limit || 10));

  return this.fetchWithAuth(`/api/products?${params}`);
}

  // Create product
  static async createProduct(data: ProductFormData) {
    return this.fetchWithAuth('/api/products', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Update product
  static async updateProduct(data: ProductFormData & { id: number }) {
    return this.fetchWithAuth('/api/products', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Delete product
  static async deleteProduct(id: number) {
    return this.fetchWithAuth(`/api/products?id=${id}`, {
      method: 'DELETE'
    });
  }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<ProductFormData>({
    product_code: '',
    name: '',
    description: '',
    unit: '',
    category_code: '',
    is_active: true
  })

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  // Fetch categories untuk dropdown
// ✅ FIX - pake ProductService yang ada auth
const fetchCategories = async () => {
  try {
    const response = await ProductService.getProducts({
      type: 'categories'  // ← Kirim type sebagai filter
    });
    if (response.success) {
      setCategories(response.data);
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
}

  // Fetch data dengan pagination
  const fetchProducts = async (page: number = pagination.page) => {
    try {
      setLoading(true)
      const response = await ProductService.getProducts({
        search: searchTerm,
        status: statusFilter,
        category: categoryFilter,
        page: page,
        limit: pagination.limit
      })

      if (response.success) {
        setProducts(response.data)
        setPagination(response.pagination)
      }
    } catch (error: any) {
      console.error('Error fetching products:', error)
      toast.error(error.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts(1)
    fetchCategories()
  }, [searchTerm, statusFilter, categoryFilter])

  // Generate unique product code
  const generateProductCode = async () => {
    try {
      // Fallback manual generation
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const productCode = `PROD${randomSuffix}`;
      setFormData(prev => ({ ...prev, product_code: productCode }))
      toast.success('Product code generated successfully')
    } catch (error: any) {
      console.error('Error generating product code:', error)
      // Fallback manual generation
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const productCode = `PROD${randomSuffix}`;
      setFormData(prev => ({ ...prev, product_code: productCode }))
      toast.success('Product code generated successfully')
    }
  }

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchProducts(newPage)
    }
  }

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }))
    setTimeout(() => fetchProducts(1), 0)
  }

  // Form handlers
  const handleCreateNew = () => {
    setEditingProduct(null)
    setFormData({
      product_code: '',
      name: '',
      description: '',
      unit: '',
      category_code: '',
      is_active: true
    })
    setShowForm(true)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      product_code: product.product_code,
      name: product.name,
      description: product.description || '',
      unit: product.unit || '',
      category_code: product.category_code || '',
      is_active: product.is_active
    })
    setShowForm(true)
  }

  const updateFormField = (field: keyof ProductFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const submitForm = async () => {
    if (!formData.product_code.trim()) {
      toast.error('Product code is required')
      return
    }
    if (!formData.name.trim()) {
      toast.error('Product name is required')
      return
    }

    try {
      setSubmitting(true)
      
      if (editingProduct) {
        const result = await ProductService.updateProduct({
          ...formData,
          id: editingProduct.id
        })
        toast.success(result.message || 'Product updated successfully')
      } else {
        const result = await ProductService.createProduct(formData)
        toast.success(result.message || 'Product created successfully')
      }

      setShowForm(false)
      setEditingProduct(null)
      await fetchProducts()
    } catch (error: any) {
      console.error('Error saving product:', error)
      toast.error(error.message || 'Failed to save product')
    } finally {
      setSubmitting(false)
    }
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingProduct(null)
    setSubmitting(false)
  }

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return

    try {
      setLoading(true)
      const result = await ProductService.deleteProduct(productToDelete.id)
      toast.success(result.message || 'Product deleted successfully')
      setShowDeleteModal(false)
      setProductToDelete(null)
      fetchProducts()
    } catch (error: any) {
      console.error('Error deleting product:', error)
      toast.error(error.message || 'Failed to delete product')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setProductToDelete(null)
  }

  const toggleStatus = async (product: Product) => {
    try {
      setLoading(true)
      await ProductService.updateProduct({
        ...product,
        is_active: !product.is_active
      })
      toast.success(`Product ${!product.is_active ? 'activated' : 'deactivated'}`)
      fetchProducts()
    } catch (error: any) {
      console.error('Error updating product status:', error)
      toast.error(error.message || 'Failed to update product status')
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
        {pagination.total} products
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
    if (!showDeleteModal || !productToDelete) return null

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
          <div className="text-gray-600 mb-6">
            Are you sure you want to delete product <strong>{productToDelete.name}</strong> ({productToDelete.product_code})?
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
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                  Products
                </CardTitle>
                <p className="text-gray-600 mt-2">Manage your products</p>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => fetchProducts()}
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
                  placeholder="Search products..."
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

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.category_code}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
        </Card>

        {/* Products Table */}
        <Card className="bg-white border shadow-sm rounded-lg">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Loading products...</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-12 text-center font-semibold text-gray-900">No</TableHead>
                      <TableHead className="w-32 font-semibold text-gray-900">Product Code</TableHead>
                      <TableHead className="min-w-40 font-semibold text-gray-900">Name</TableHead>
                      <TableHead className="min-w-32 font-semibold text-gray-900">Unit</TableHead>
                      <TableHead className="min-w-32 font-semibold text-gray-900">Category</TableHead>
                      <TableHead className="w-24 text-center font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="w-28 text-center font-semibold text-gray-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <Package className="h-12 w-12 mb-4 text-gray-300" />
                            <p className="text-lg font-medium mb-2">No products found</p>
                            <Button onClick={handleCreateNew} size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Product
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      products.map((product, index) => (
                        <TableRow key={product.id} className="hover:bg-gray-50/50">
                          <TableCell className="text-center text-gray-600 font-medium">
                            {(pagination.page - 1) * pagination.limit + index + 1}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-blue-600">
                              {product.product_code}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">
                            {product.name}
                          </TableCell>
                          <TableCell>
                            {product.unit ? (
                              <span className="text-gray-600 text-sm">{product.unit}</span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {product.category_code ? (
                              <span className="text-gray-600 text-sm">{product.category_code}</span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(product.is_active)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-1 justify-center">
                              <Button
                                onClick={() => handleEdit(product)}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-50"
                                title="Edit"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => toggleStatus(product)}
                                size="sm"
                                variant="outline"
                                className={`h-8 w-8 p-0 border-gray-300 hover:bg-gray-50 ${
                                  product.is_active ? 'text-orange-600' : 'text-green-600'
                                }`}
                                title={product.is_active ? 'Deactivate' : 'Activate'}
                              >
                                {product.is_active ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                              </Button>
                              <Button
                                onClick={() => handleDeleteClick(product)}
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
                {products.length > 0 && <PaginationControls />}
              </>
            )}
          </CardContent>
        </Card>

        {/* Product Form - Below Table */}
        {showForm && (
          <Card className="bg-white border shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Product Code */}
                  <div className="space-y-2">
                    <Label htmlFor="product_code" className="text-sm font-medium">
                      Product Code *
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="product_code"
                        value={formData.product_code}
                        onChange={(e) => updateFormField('product_code', e.target.value.toUpperCase())}
                        placeholder="PROD001"
                        disabled={!!editingProduct || submitting}
                        className="flex-1"
                      />
                      {!editingProduct && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={generateProductCode}
                          disabled={submitting}
                          className="whitespace-nowrap"
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          Generate
                        </Button>
                      )}
                    </div>
                    {editingProduct && (
                      <p className="text-xs text-gray-500 mt-1">
                        Product code cannot be changed
                      </p>
                    )}
                  </div>

                  {/* Product Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Product Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateFormField('name', e.target.value)}
                      placeholder="Product Name"
                      disabled={submitting}
                    />
                  </div>

                  {/* Unit */}
                  <div className="space-y-2">
                    <Label htmlFor="unit" className="text-sm font-medium">
                      Unit
                    </Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => updateFormField('unit', e.target.value)}
                      placeholder="pcs, kg, meter, etc"
                      disabled={submitting}
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category_code" className="text-sm font-medium">
                      Category
                    </Label>
                    <select
                      id="category_code"
                      value={formData.category_code}
                      onChange={(e) => updateFormField('category_code', e.target.value)}
                      disabled={submitting}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.category_code}>
                          {category.name}
                        </option>
                      ))}
                    </select>
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
                      placeholder="Product description..."
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
                        {editingProduct ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingProduct ? 'Update Product' : 'Create Product'
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