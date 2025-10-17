// app/salesorder/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Search, Plus, FileText, Eye, Upload, Trash2, ChevronDown, ChevronUp, Download, MapPin, Building, Phone, Mail, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CustomDialogContent
} from "@/components/custom-dialog"
import { toast } from 'sonner'

// Type definitions matching backend
interface SalesOrder {
  so_code: string
  created_at: string
  customer_name: string
  customer_phone: string
  customer_email: string
  customer_company?: string
  billing_address?: string
  shipping_address?: string
  sales_rep?: string
  sales_rep_email?: string
  sales_order_doc?: string
  total_amount: number
  tax_amount: number
  status: 'submitted' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
  notes?: string
  items: SalesOrderItem[]
  taxes: SalesOrderTax[]
  attachments: Attachment[]
}

interface SalesOrderItem {
  so_item_code: string
  product_name: string
  product_code: string
  quantity: number
  unit_price: number
  subtotal: number
}

interface SalesOrderTax {
  so_tax_code: string
  tax_name: string
  tax_rate: number
  tax_amount: number
}

interface Attachment {
  id: string
  name: string
  type: string
  upload_date: string
  size: number
}

interface Project {
  id: number
  name: string
}

interface TaxType {
  id: number
  tax_code: string
  name: string
  description?: string
}

interface CreateSalesOrderRequest {
  customer_name: string
  customer_phone: string
  customer_email?: string
  customer_company?: string
  billing_address?: string
  shipping_address?: string
  sales_rep?: string
  sales_rep_email?: string
  sales_order_doc?: string
  project_id?: number
  total_amount: number
  tax_amount: number
  notes?: string
  items: {
    product_name: string
    product_code: string
    quantity: number
    unit_price: number
    subtotal: number
  }[]
  taxes: {
    tax_code: string
    tax_name: string
    tax_rate: number
    tax_amount: number
  }[]
}

interface SalesOrderResponse {
  success: boolean
  data: SalesOrder[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function SalesOrderPage() {
  // Refs untuk file input
  const salesOrderFileRef = useRef<HTMLInputElement>(null)
  const otherFilesRef = useRef<HTMLInputElement>(null)
  
  // State untuk toggle form
  const [showCreateForm, setShowCreateForm] = useState(false)
  
  // State untuk modal detail
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // State untuk data dari backend
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // State untuk pagination dan filter
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // State untuk form SO baru
  const [newSO, setNewSO] = useState<CreateSalesOrderRequest>({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_company: '',
    billing_address: '',
    shipping_address: '',
    sales_rep: '',
    sales_rep_email: '',
    sales_order_doc: '',
    project_id: undefined,
    total_amount: 0,
    tax_amount: 0,
    notes: '',
    items: [],
    taxes: []
  })

  // State untuk multiple item forms
  const [itemForms, setItemForms] = useState([
    {
      id: '1',
      product_name: '',
      product_code: '',
      quantity: 1,
      unit_price: 0,
      subtotal: 0
    }
  ])

  // State untuk project
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)

  // State untuk tax types
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([])
  const [loadingTaxTypes, setLoadingTaxTypes] = useState(false)

  // State untuk tax input mode (rate/amount)
  const [taxInputMode, setTaxInputMode] = useState<{[key: string]: 'rate' | 'amount'}>({})

  // State untuk file names
  const [salesOrderFileName, setSalesOrderFileName] = useState('')
  const [otherFileNames, setOtherFileNames] = useState<string[]>([])

  // Fetch sales orders dari backend
  const fetchSalesOrders = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      if (!token) {
        toast.error('Please login first')
        window.location.href = '/login'
        return
      }
      
      let url = `/api/sales-orders?page=${currentPage}&limit=${itemsPerPage}`
      
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`
      }
      
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 401) {
        localStorage.removeItem('token')
        toast.error('Session expired, please login again')
        window.location.href = '/login'
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch sales orders')
      }

      const data: SalesOrderResponse = await response.json()
      
      if (data.success) {
        setSalesOrders(data.data)
        toast.success(`✅ Loaded ${data.data.length} sales orders`)
      } else {
        throw new Error('Failed to load sales orders')
      }
    } catch (error) {
      console.error('Error fetching sales orders:', error)
      toast.error("❌ Failed to load sales orders")
    } finally {
      setLoading(false)
    }
  }

  // Fetch projects dari backend
  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setProjects(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  // Fetch tax types
  const fetchTaxTypes = async () => {
    try {
      setLoadingTaxTypes(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/tax-types', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTaxTypes(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching tax types:', error)
      toast.error('❌ Failed to load tax types')
    } finally {
      setLoadingTaxTypes(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchSalesOrders()
    fetchProjects()
    fetchTaxTypes()
  }, [currentPage, itemsPerPage, statusFilter, searchTerm])

  // Filter logic untuk client-side filtering tambahan
  const filteredSO = salesOrders.filter(so => {
    const matchesSearch = 
      so.so_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.customer_phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || so.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredSO.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredSO.length / itemsPerPage)

  // Pagination functions
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  // Update item form field
  const updateItemForm = (id: string, field: keyof typeof itemForms[0], value: string | number) => {
    setItemForms(prev => prev.map(form => {
      if (form.id === id) {
        const updatedForm = { ...form, [field]: value }
        
        // Auto-calculate subtotal if quantity or unit_price changes
        if (field === 'quantity' || field === 'unit_price') {
          updatedForm.subtotal = Number(updatedForm.quantity) * Number(updatedForm.unit_price)
        }
        
        return updatedForm
      }
      return form
    }))
  }

  // Add new item form
  const addItemForm = () => {
    const newId = (itemForms.length + 1).toString()
    setItemForms(prev => [...prev, {
      id: newId,
      product_name: '',
      product_code: '',
      quantity: 1,
      unit_price: 0,
      subtotal: 0
    }])
    toast.success('➕ Added new item form')
  }

  // Remove item form
  const removeItemForm = (id: string) => {
    if (itemForms.length > 1) {
      setItemForms(prev => prev.filter(form => form.id !== id))
      toast.info('🗑️ Item form removed')
    } else {
      toast.error('❌ At least one item is required')
    }
  }

  // Toggle tax input mode
  const toggleTaxInputMode = (taxCode: string) => {
    setTaxInputMode(prev => ({
      ...prev,
      [taxCode]: prev[taxCode] === 'rate' ? 'amount' : 'rate'
    }))
    toast.info(`📊 Switched to ${taxInputMode[taxCode] === 'rate' ? 'Amount' : 'Rate'} input`)
  }

  // Update tax value
  const updateTaxValue = (taxCode: string, value: number) => {
    const mode = taxInputMode[taxCode] || 'amount'
    
    setNewSO(prev => {
      const updatedTaxes = prev.taxes.map(tax => {
        if (tax.tax_code === taxCode) {
          if (mode === 'rate') {
            // Input rate → calculate amount
            const tax_amount = (value * prev.total_amount) / 100
            return { ...tax, tax_rate: value, tax_amount }
          } else {
            // Input amount → calculate rate
            const tax_rate = prev.total_amount > 0 ? (value / prev.total_amount) * 100 : 0
            return { ...tax, tax_amount: value, tax_rate }
          }
        }
        return tax
      })
      return { ...prev, taxes: updatedTaxes }
    })
  }

  // Update total amount
  const updateTotalAmount = (amount: number) => {
    setNewSO(prev => {
      // Update taxes when total amount changes
      const updatedTaxes = prev.taxes.map(tax => {
        if (taxInputMode[tax.tax_code] === 'rate') {
          // Recalculate amount based on rate
          const tax_amount = (tax.tax_rate * amount) / 100
          return { ...tax, tax_amount }
        }
        // If input mode is amount, keep the amount but recalculate rate
        const tax_rate = amount > 0 ? (tax.tax_amount / amount) * 100 : 0
        return { ...tax, tax_rate }
      })
      
      return { ...prev, total_amount: amount, taxes: updatedTaxes }
    })
  }

  // Handlers
  const toggleTax = (taxCode: string) => {
    const taxType = taxTypes.find(t => t.tax_code === taxCode)
    if (!taxType) {
      toast.error('❌ Tax type not found')
      return
    }

    if (newSO.taxes.find(tax => tax.tax_code === taxCode)) {
      setNewSO(prev => ({
        ...prev,
        taxes: prev.taxes.filter(tax => tax.tax_code !== taxCode)
      }))
      // Remove from input mode
      setTaxInputMode(prev => {
        const newMode = { ...prev }
        delete newMode[taxCode]
        return newMode
      })
      toast.info(`🗑️ ${taxType.name} tax removed`)
    } else {
      setNewSO(prev => ({
        ...prev,
        taxes: [...prev.taxes, { 
          tax_code: taxCode,
          tax_name: taxType.name,
          tax_rate: 0, 
          tax_amount: 0 
        }]
      }))
      // Default to amount input mode
      setTaxInputMode(prev => ({
        ...prev,
        [taxCode]: 'amount'
      }))
      toast.success(`✅ ${taxType.name} tax added`)
    }
  }

  const handleFileUpload = (type: 'sales_order' | 'other') => {
    if (type === 'sales_order') {
      salesOrderFileRef.current?.click()
    } else {
      otherFilesRef.current?.click()
    }
  }

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'sales_order' | 'other') => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (type === 'sales_order') {
      setSalesOrderFileName(files[0].name)
      toast.success(`📄 Sales Order Document: ${files[0].name}`)
    } else {
      const names = Array.from(files).map(file => file.name)
      setOtherFileNames(names)
      toast.success(`📁 ${names.length} Other Documents: ${names.join(', ')}`)
    }
  }

  // Clear file inputs
  const clearFileInputs = () => {
    setSalesOrderFileName('')
    setOtherFileNames([])
    if (salesOrderFileRef.current) salesOrderFileRef.current.value = ''
    if (otherFilesRef.current) otherFilesRef.current.value = ''
  }

  // Form validation
  const validateForm = () => {
    const errors: string[] = []

    // Required fields
    if (!newSO.customer_name.trim()) errors.push('❌ Customer name is required')
    if (!newSO.customer_phone.trim()) errors.push('❌ Customer phone is required')
    if (!newSO.total_amount || newSO.total_amount <= 0) errors.push('❌ Total amount must be greater than 0')

    // Validate items
    const validItems = itemForms.filter(form => 
      form.product_name && form.product_code && form.quantity > 0 && form.unit_price > 0
    )
    
    if (validItems.length === 0) {
      errors.push('❌ At least one valid item is required')
    }

    // Validate taxes
    newSO.taxes.forEach(tax => {
      if (taxInputMode[tax.tax_code] === 'rate' && (tax.tax_rate <= 0 || tax.tax_rate > 100)) {
        errors.push(`❌ Tax rate for ${tax.tax_name} must be between 0 and 100`)
      }
      if (taxInputMode[tax.tax_code] === 'amount' && tax.tax_amount < 0) {
        errors.push(`❌ Tax amount for ${tax.tax_name} cannot be negative`)
      }
    })

    return errors
  }

  const submitSO = async () => {
    // Validate form
    const errors = validateForm()
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error))
      return
    }

    // Prepare items data
    const itemsData = itemForms.filter(form => 
      form.product_name && form.product_code && form.quantity > 0 && form.unit_price > 0
    ).map(form => ({
      product_name: form.product_name,
      product_code: form.product_code,
      quantity: form.quantity,
      unit_price: form.unit_price,
      subtotal: form.subtotal
    }))

    try {
      setSubmitting(true)
      const token = localStorage.getItem('token')
      
      if (!token) {
        toast.error('❌ Please login first')
        window.location.href = '/login'
        return
      }

      // PREPARE FORM DATA
      const formData = new FormData()
      
      // Append SO data sebagai JSON string
      const requestData: CreateSalesOrderRequest = {
        ...newSO,
        project_id: selectedProjectId || undefined,
        items: itemsData,
        tax_amount: newSO.taxes.reduce((sum, tax) => sum + tax.tax_amount, 0)
      }
      
      formData.append('data', JSON.stringify(requestData))

      // APPEND FILES JIKA ADA
      if (salesOrderFileRef.current?.files?.[0]) {
        formData.append('sales_order_doc', salesOrderFileRef.current.files[0])
      }
      
      if (otherFilesRef.current?.files) {
        for (let file of otherFilesRef.current.files) {
          formData.append('other_docs', file)
        }
      }

      // KIRIM SEBAGAI FORM DATA
      const response = await fetch('/api/sales-orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success(`🎉 Sales Order ${result.so_code} created successfully!${result.files_uploaded ? ` with ${result.files_uploaded} files` : ''}`)
        
        // Reset form
        setNewSO({
          customer_name: '',
          customer_phone: '',
          customer_email: '',
          customer_company: '',
          billing_address: '',
          shipping_address: '',
          sales_rep: '',
          sales_rep_email: '',
          sales_order_doc: '',
          project_id: undefined,
          total_amount: 0,
          tax_amount: 0,
          notes: '',
          items: [],
          taxes: []
        })
        setItemForms([{
          id: '1',
          product_name: '',
          product_code: '',
          quantity: 1,
          unit_price: 0,
          subtotal: 0
        }])
        setSelectedProjectId(null)
        setShowCreateForm(false)
        setTaxInputMode({})
        
        // Clear file inputs
        clearFileInputs()
        
        // Refresh sales orders list
        fetchSalesOrders()
      } else {
        throw new Error(result.error || 'Failed to create sales order')
      }
    } catch (error) {
      console.error('Create SO error:', error)
      toast.error("❌ Failed to create sales order")
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      submitted: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.submitted
  }

  const viewDetail = async (soCode: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/sales-orders/${soCode}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSelectedSO(data.data)
          setShowDetailModal(true)
          toast.success('📋 Order details loaded')
        }
      } else {
        throw new Error('Failed to fetch order details')
      }
    } catch (error) {
      console.error('Error fetching order details:', error)
      toast.error("❌ Failed to load order details")
    }
  }

  const downloadAttachment = async (attachment: Attachment) => {
    try {
      window.open(`/api/attachments/${attachment.id}`, '_blank')
      toast.success(`📥 Downloading ${attachment.name}`)
    } catch (error) {
      toast.error("❌ Failed to download file")
    }
  }

  // Komponen Pagination
  const Pagination = () => {
    const pageNumbers = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i)
    }

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold">{indexOfFirstItem + 1}</span> to{" "}
          <span className="font-semibold">{Math.min(indexOfLastItem, filteredSO.length)}</span> of{" "}
          <span className="font-semibold">{filteredSO.length}</span> results
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={prevPage}
            disabled={currentPage === 1}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex gap-1">
            {pageNumbers.map(number => (
              <Button
                key={number}
                variant={currentPage === number ? "default" : "outline"}
                size="sm"
                onClick={() => paginate(number)}
                className="w-8 h-8 p-0 min-w-8"
              >
                {number}
              </Button>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="itemsPerPage" className="text-sm whitespace-nowrap">Items per page:</Label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value))
              setCurrentPage(1)
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen min-w-fit">
      <div className="max-w-full mx-auto space-y-6">
        {/* Previous Sales Orders - Full Width Table */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Sales Orders
              </CardTitle>
              
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {/* Search Input */}
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="border rounded px-3 py-2 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                {/* Reset Filters */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setCurrentPage(1)
                  }}
                  className="whitespace-nowrap"
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2">Loading sales orders...</span>
              </div>
            )}

            {/* Active Filters Info */}
            {(searchTerm || statusFilter !== 'all') && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-blue-800">Active filters:</span>
                  {searchTerm && (
                    <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800">
                      Search: {searchTerm}
                      <button 
                        onClick={() => setSearchTerm('')} 
                        className="ml-1 hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {statusFilter !== 'all' && (
                    <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800">
                      Status: {statusFilter}
                      <button 
                        onClick={() => setStatusFilter('all')} 
                        className="ml-1 hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {!loading && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SO Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Customer Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.length > 0 ? (
                      currentItems.map((so) => (
                        <TableRow key={so.so_code} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{so.so_code}</TableCell>
                          <TableCell>{new Date(so.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{so.customer_name}</TableCell>
                          <TableCell>{so.customer_phone}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(so.status)}>
                              {so.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">
                            Rp {so.total_amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => viewDetail(so.so_code)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="h-12 w-12 text-gray-300" />
                            <p>No sales orders found.</p>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowCreateForm(true)}
                            >
                              Create First Sales Order
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {!loading && filteredSO.length > 0 && <Pagination />}
          </CardContent>
        </Card>

        {/* Create New Sales Order - Collapsible */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Create New Sales Order
              </CardTitle>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                {showCreateForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showCreateForm ? 'Hide Form' : 'Show Form'}
              </Button>
            </div>
          </CardHeader>
          
          {showCreateForm && (
            <CardContent>
              <div className="space-y-6">
                {/* Customer and Transaction Data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      value={newSO.customer_name}
                      onChange={(e) => setNewSO(prev => ({ ...prev, customer_name: e.target.value }))}
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Customer Phone *</Label>
                    <Input
                      id="customerPhone"
                      value={newSO.customer_phone}
                      onChange={(e) => setNewSO(prev => ({ ...prev, customer_phone: e.target.value }))}
                      placeholder="Enter customer phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">Customer Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={newSO.customer_email}
                      onChange={(e) => setNewSO(prev => ({ ...prev, customer_email: e.target.value }))}
                      placeholder="customer@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salesRep">Sales Representative</Label>
                    <Input
                      id="salesRep"
                      value={newSO.sales_rep}
                      onChange={(e) => setNewSO(prev => ({ ...prev, sales_rep: e.target.value }))}
                      placeholder="Sales person name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalAmount">Total Amount *</Label>
                    <Input
                      id="totalAmount"
                      type="number"
                      value={newSO.total_amount || ''}
                      onChange={(e) => updateTotalAmount(parseInt(e.target.value) || 0)}
                      placeholder="Enter total amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salesOrderDoc">No SO (From Client)</Label>
                    <Input
                      id="salesOrderDoc"
                      value={newSO.sales_order_doc}
                      onChange={(e) => setNewSO(prev => ({ ...prev, sales_order_doc: e.target.value }))}
                      placeholder="No SO document"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectSelect">Project</Label>
                    <select
                      id="projectSelect"
                      value={selectedProjectId || ''}
                      onChange={(e) => setSelectedProjectId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full border rounded-md px-3 py-2"
                    >
                      <option value="">Pilih Project</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingAddress">Billing Address</Label>
                    <Input
                      id="billingAddress"
                      value={newSO.billing_address}
                      onChange={(e) => setNewSO(prev => ({ ...prev, billing_address: e.target.value }))}
                      placeholder="Billing address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shippingAddress">Shipping Address</Label>
                    <Input
                      id="shippingAddress"
                      value={newSO.shipping_address}
                      onChange={(e) => setNewSO(prev => ({ ...prev, shipping_address: e.target.value }))}
                      placeholder="Shipping address"
                    />
                  </div>
                </div>

                {/* Tax Section */}
                {loadingTaxTypes ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading tax types...</span>
                  </div>
                ) : (
                  taxTypes.map((tax) => (
                    <div key={tax.tax_code} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <Switch
                          checked={!!newSO.taxes.find(t => t.tax_code === tax.tax_code)}
                          onCheckedChange={() => toggleTax(tax.tax_code)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{tax.name}</div>
                          {tax.description && (
                            <div className="text-sm text-gray-500">{tax.description}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleTaxInputMode(tax.tax_code)}
                          className="text-xs"
                        >
                          {taxInputMode[tax.tax_code] === 'rate' ? 'Rate' : 'Amount'}
                        </Button>
                        
                        <div className="w-32">
                          {taxInputMode[tax.tax_code] === 'rate' ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={newSO.taxes.find(t => t.tax_code === tax.tax_code)?.tax_rate || ''}
                              onChange={(e) => updateTaxValue(tax.tax_code, parseFloat(e.target.value) || 0)}
                              placeholder="Rate %"
                              disabled={!newSO.taxes.find(t => t.tax_code === tax.tax_code)}
                            />
                          ) : (
                            <Input
                              type="number"
                              value={newSO.taxes.find(t => t.tax_code === tax.tax_code)?.tax_amount || ''}
                              onChange={(e) => updateTaxValue(tax.tax_code, parseInt(e.target.value) || 0)}
                              placeholder="Amount"
                              disabled={!newSO.taxes.find(t => t.tax_code === tax.tax_code)}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Product Items Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Product Items</CardTitle>
                      <Button onClick={addItemForm} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item Form
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {itemForms.map((form, index) => (
                        <div key={form.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 p-4 border rounded-lg relative">
                          <div className="absolute -top-2 -left-2">
                            <div className="w-6 h-6 bg-cyan-700 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                              {index + 1}
                            </div>
                          </div>
                          
                          {itemForms.length > 1 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="absolute top-2 right-2"
                              onClick={() => removeItemForm(form.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                          <div className="space-y-1">
                            <Label className="text-sm">Product Name</Label>
                            <Input
                              value={form.product_name}
                              onChange={(e) => updateItemForm(form.id, 'product_name', e.target.value)}
                              placeholder="Enter product name"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm">SKU</Label>
                            <Input
                              value={form.product_code}
                              onChange={(e) => updateItemForm(form.id, 'product_code', e.target.value)}
                              placeholder="Enter SKU"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm">Quantity</Label>
                            <Input
                              type="number"
                              value={form.quantity || ''}
                              onChange={(e) => updateItemForm(form.id, 'quantity', parseInt(e.target.value) || 0)}
                              placeholder="Enter quantity"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm">Unit Price</Label>
                            <Input
                              type="number"
                              value={form.unit_price || ''}
                              onChange={(e) => updateItemForm(form.id, 'unit_price', parseInt(e.target.value) || 0)}
                              placeholder="Enter unit price"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm">Subtotal</Label>
                            <Input
                              type="number"
                              value={form.subtotal || ''}
                              onChange={(e) => updateItemForm(form.id, 'subtotal', parseInt(e.target.value) || 0)}
                              placeholder="Enter subtotal"
                              readOnly
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Document Upload Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sales Order Document Upload */}
                  <div className="space-y-3">
                    <Label className="font-semibold">Sales Order Document (From Client)</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <div className="flex flex-col items-center gap-3">
                        <Upload className="h-8 w-8 text-gray-400" />
                        <Button 
                          variant="outline" 
                          onClick={() => handleFileUpload('sales_order')}
                          className="cursor-pointer"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Sales Order Document
                        </Button>
                        
                        {/* FILE INDICATOR */}
                        {salesOrderFileName && (
                          <div className="text-center">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <FileText className="h-3 w-3 mr-1" />
                              {salesOrderFileName}
                            </Badge>
                          </div>
                        )}
                        
                        <input
                          ref={salesOrderFileRef}
                          type="file"
                          className="hidden"
                          onChange={(e) => handleFileInputChange(e, 'sales_order')}
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
                        />
                        <p className="text-xs text-gray-500 text-center">Only 1 file allowed</p>
                      </div>
                    </div>
                  </div>

                  {/* Other Documents Upload */}
                  <div className="space-y-3">
                    <Label className="font-semibold">Other Documents</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <div className="flex flex-col items-center gap-3">
                        <Upload className="h-8 w-8 text-gray-400" />
                        <Button 
                          variant="outline" 
                          onClick={() => handleFileUpload('other')}
                          className="cursor-pointer"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Other Documents
                        </Button>
                        
                        {/* FILE INDICATOR */}
                        {otherFileNames.length > 0 && (
                          <div className="text-center space-y-1">
                            {otherFileNames.map((fileName, index) => (
                              <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800 mr-1 mb-1">
                                <FileText className="h-3 w-3 mr-1" />
                                {fileName}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        <input
                          ref={otherFilesRef}
                          type="file"
                          className="hidden"
                          onChange={(e) => handleFileInputChange(e, 'other')}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                          multiple
                        />
                        <p className="text-xs text-gray-500 text-center">Multiple files allowed</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="w-full">
                  <Button 
                    onClick={submitSO} 
                    size="lg" 
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Sales Order...
                      </>
                    ) : (
                      'Create Sales Order'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Detail Modal */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <CustomDialogContent className="w-[90vw] max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4">  
              <div className="md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border">
                <DialogTitle className="flex items-center gap-2 text-2xl">
                  <FileText className="h-6 w-6" />
                  Sales Order Details - {selectedSO?.so_code}
                </DialogTitle>
              </div>
            </DialogHeader>
            {selectedSO && (
              <div className="space-y-6 min-w-0">
                {/* Customer Information & Address */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <Card className="min-w-0">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Building className="h-5 w-5" />
                        Customer Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 min-w-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                        <div className="min-w-0">
                          <Label className="font-semibold text-sm">Customer Name</Label>
                          <p className="text-gray-900 truncate">{selectedSO.customer_name}</p>
                        </div>
                        <div className="min-w-0">
                          <Label className="font-semibold text-sm">Customer Phone</Label>
                          <p className="text-gray-900 truncate">{selectedSO.customer_phone}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                        {/* <div className="min-w-0">
                          <Label className="font-semibold text-sm">Company</Label>
                          <p className="text-gray-900 truncate">{selectedSO.customer_company || '-'}</p>
                        </div> */}
                        <div className="min-w-0">
                          <Label className="font-semibold text-sm">Sales Order Doc</Label>
                          <p className="text-gray-900 truncate">{selectedSO.sales_order_doc || '-'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                        <div className="min-w-0">
                          <Label className="font-semibold text-sm flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email
                          </Label>
                          <p className="text-gray-900 truncate">{selectedSO.customer_email}</p>
                        </div>
                        <div className="min-w-0">
                          <Label className="font-semibold text-sm flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Phone
                          </Label>
                          <p className="text-gray-900 truncate">{selectedSO.customer_phone}</p>
                        </div>
                      </div>
                      {selectedSO.notes && (
                        <div className="min-w-0">
                          <Label className="font-semibold text-sm">Notes</Label>
                          <p className="text-gray-900 text-sm leading-relaxed break-words">{selectedSO.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="min-w-0">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <MapPin className="h-5 w-5" />
                        Address Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 min-w-0">
                      <div className="min-w-0">
                        <Label className="font-semibold text-sm">Billing Address</Label>
                        <p className="text-gray-900 text-sm leading-relaxed break-words">{selectedSO.billing_address || '-'}</p>
                      </div>
                      <div className="min-w-0">
                        <Label className="font-semibold text-sm">Shipping Address</Label>
                        <p className="text-gray-900 text-sm leading-relaxed break-words">{selectedSO.shipping_address || '-'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Items and Summary */}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 min-w-0">
                  {/* Items */}
                  <div className="xl:col-span-3 min-w-0">
                    <Card className="min-w-0">
                      <CardHeader className="pb-4">
                        <CardTitle>Order Items</CardTitle>
                      </CardHeader>
                      <CardContent className="min-w-0 overflow-x-auto">
                        <div className="min-w-[800px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[300px]">Product</TableHead>
                                <TableHead className="w-[150px]">SKU</TableHead>
                                <TableHead className="w-[100px]">Qty</TableHead>
                                <TableHead className="w-[150px]">Unit Price</TableHead>
                                <TableHead className="w-[150px] text-right">Subtotal</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedSO.items.map((item) => (
                                <TableRow key={item.so_item_code}>
                                  <TableCell className="font-medium truncate max-w-[280px]">{item.product_name}</TableCell>
                                  <TableCell className="text-gray-600 truncate">{item.product_code}</TableCell>
                                  <TableCell>{item.quantity}</TableCell>
                                  <TableCell>Rp {item.unit_price.toLocaleString()}</TableCell>
                                  <TableCell className="text-right font-semibold">Rp {item.subtotal.toLocaleString()}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Summary */}
                  <div className="space-y-6 min-w-0 xl:col-span-1">
                    <Card className="min-w-0">
                      <CardHeader className="pb-4">
                        <CardTitle>Tax Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="min-w-0">
                        <div className="space-y-3 min-w-0">
                          {selectedSO.taxes.map((tax) => (
                            <div key={tax.so_tax_code} className="flex justify-between items-center py-2 border-b min-w-0">
                              <div className="min-w-0">
                                <span className="font-medium truncate">{tax.tax_name}</span>
                                <span className="text-sm text-gray-500 ml-2">({tax.tax_rate}%)</span>
                              </div>
                              <span className="font-semibold whitespace-nowrap">Rp {tax.tax_amount.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="border-t pt-3 min-w-0">
                            <div className="flex justify-between items-center font-bold text-lg min-w-0">
                              <span>Grand Total</span>
                              <span className="text-blue-600 whitespace-nowrap">Rp {selectedSO.total_amount.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Attachments */}
                {selectedSO.attachments && selectedSO.attachments.length > 0 && (
                  <Card className="min-w-0">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Attachments ({selectedSO.attachments.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="min-w-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
                        {selectedSO.attachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow min-w-0">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileText className="h-8 w-8 text-blue-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{attachment.name}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                                  <span className="text-blue-600">
                                    {attachment.type}
                                  </span>
                                  <span>•</span>
                                  <span>{new Date(attachment.upload_date).toLocaleDateString()}</span>
                                  <span>•</span>
                                  <span>{(attachment.size / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="lg"
                              onClick={() => downloadAttachment(attachment)}
                              className="ml-2 flex-shrink-0"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CustomDialogContent>
        </Dialog>
      </div>
    </div>
  )
}