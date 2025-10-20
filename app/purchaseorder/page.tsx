// app/purchase-order/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, FileText, Trash2, ChevronUp, ChevronLeft, ChevronRight, Upload, Download, Eye, Calendar, CreditCard, Banknote, Landmark } from 'lucide-react'

// Type definitions - UPDATED FOR BACKEND INTEGRATION
interface SalesOrder {
  so_code: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  status: 'submitted' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
  items: OrderItem[]
  po_count: number
  created_at: string
}

interface OrderItem {
  so_item_code: string
  product_name: string
  product_code: string
  quantity: number
  unit_price: number
  subtotal: number
}

interface PurchaseOrder {
  po_code: string
  so_code: string
  so_reference: string
  supplier_name: string
  supplier_contact?: string
  supplier_bank?: string
  total_amount: number
  status: 'submitted' | 'approved_spv' | 'approved_finance' | 'paid' | 'rejected'
  notes?: string
  date: string
  priority: 'low' | 'medium' | 'high'
  items: POItem[]
  payments: Payment[]
  attachments: Attachment[]
  approved_by_spv?: string
  approved_by_finance?: string
  approved_date_spv?: string
  approved_date_finance?: string
  approval_notes?: string
  rejection_reason?: string
  created_at: string
}

interface POItem {
  po_item_code: string
  product_name: string
  product_code: string
  quantity: number
  supplier: string
  purchase_price: number
  notes: string
}

interface POFormData {
  id: string
  itemId: string
  productName: string
  sku: string
  quantity: number
  supplier: string
  purchasePrice: number
  notes: string
  invoiceFile?: File
}

// Payment Types - UPDATED FOR BACKEND
interface Payment {
  payment_code: string
  po_code: string
  so_code?: string
  so_reference?: string
  supplier_name: string
  amount: number
  payment_date: string
  payment_method: 'transfer' | 'cash' | 'credit_card' | 'other'
  bank_name?: string
  account_number?: string
  reference_number: string
  notes?: string
  status: 'pending' | 'paid' | 'failed'
  created_at: string
}

interface Attachment {
  id: string
  name: string
  type: 'invoice' | 'proof'
  filename: string
  upload_date: string
}

interface PaymentFormData {
  po_code: string
  payment_method: 'transfer' | 'cash' | 'credit_card' | 'other'
  bank_name: string
  account_number: string
  payment_date: string
  reference_number: string
  notes: string
  documents: File[]
}

export default function PurchaseOrderPage() {
  // State untuk table
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [activeTable, setActiveTable] = useState<'so' | 'po' | 'payment'>('so')

  // State untuk data
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  // State untuk form PO
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [poForms, setPoForms] = useState<POFormData[]>([])
  const fileInputRefs = useRef<{[key: string]: HTMLInputElement}>({})

  // State untuk Payment
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    po_code: '',
    payment_method: 'transfer',
    bank_name: '',
    account_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: '',
    documents: []
  })
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null)
  const paymentFileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Fetch data dari API
  useEffect(() => {
    fetchData()
  }, [activeTable])

  const fetchData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      if (activeTable === 'so' || activeTable === 'po') {
        // Fetch sales orders
        const soResponse = await fetch('/api/sales-orders', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (soResponse.ok) {
          const soData = await soResponse.json()
          if (soData.success) {
            setSalesOrders(soData.data)
          }
        }

        // Fetch purchase orders
        const poResponse = await fetch('/api/purchase-orders', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (poResponse.ok) {
          const poData = await poResponse.json()
          if (poData.success) {
            setPurchaseOrders(poData.data)
            
            // Extract all payments dari purchase orders
            const allPayments = poData.data.flatMap((po: PurchaseOrder) => po.payments || [])
            setPayments(allPayments)
          }
        }
      }
      
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error loading data')
    } finally {
      setLoading(false)
    }
  }

  const allPOs = purchaseOrders
  const paidPOs = allPOs.filter(po => po.status === 'paid')
  const payablePOs = allPOs.filter(po => po.status === 'approved_finance' && (!po.payments || po.payments.length === 0))

  // Filter logic
  const filteredSO = salesOrders.filter(so => {
    const searchLower = searchTerm?.toLowerCase() || ''
    
    const matchesSearch = 
      so.so_code?.toLowerCase()?.includes(searchLower) ||
      so.customer_name?.toLowerCase()?.includes(searchLower)
    
    const matchesStatus = statusFilter === 'all' || so.status === statusFilter
    const matchesDate = dateFilter === 'all' || so.created_at?.split('T')[0] === dateFilter
    
    return matchesSearch && matchesStatus && matchesDate
  })

  const filteredPO = allPOs.filter(po => {
    const searchLower = searchTerm?.toLowerCase() || ''
    
    return po.po_code?.toLowerCase()?.includes(searchLower) ||
           po.supplier_name?.toLowerCase()?.includes(searchLower) ||
           po.so_reference?.toLowerCase()?.includes(searchLower)
  })

  const filteredPayments = payments.filter(payment => {
    const searchLower = searchTerm?.toLowerCase() || ''
    
    return payment.payment_code?.toLowerCase()?.includes(searchLower) ||
           payment.po_code?.toLowerCase()?.includes(searchLower) ||
           payment.supplier_name?.toLowerCase()?.includes(searchLower) ||
           payment.so_reference?.toLowerCase()?.includes(searchLower)
  })

  const currentData = activeTable === 'so' ? filteredSO : 
                     activeTable === 'po' ? filteredPO : 
                     filteredPayments

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = currentData.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(currentData.length / itemsPerPage)

  // FIXED: Fungsi untuk menghitung remaining quantity untuk SO tertentu
  const getRemainingQuantityForSO = (itemId: string, productCode: string, soCode: string) => {
    const so = salesOrders.find(so => so.so_code === soCode)
    if (!so) return 0

    const item = so.items.find(item => item.so_item_code === itemId)
    if (!item) return 0

    // Hitung total quantity yang sudah dibuat PO untuk product ini dari SO yang sama
    const existingPOsForThisProduct = purchaseOrders.filter(po => 
      po.so_code === soCode && 
      po.items.some(poItem => poItem.product_code === productCode)
    )

    const totalInExistingPOs = existingPOsForThisProduct.reduce((total, po) => {
      const poItem = po.items.find(poItem => poItem.product_code === productCode)
      return total + (poItem ? poItem.quantity : 0)
    }, 0)

    return Math.max(0, item.quantity - totalInExistingPOs)
  }

  // FIXED: Fungsi untuk cek apakah SO masih bisa buat PO (ada item yang remaining > 0)
  const canCreatePO = (so: SalesOrder) => {
    return so.items.some(item => {
      const remaining = getRemainingQuantityForSO(item.so_item_code, item.product_code, so.so_code)
      return remaining > 0
    })
  }

  // FIXED: Fungsi untuk menghitung remaining quantity yang benar (dengan selectedSO)
  const getRemainingQuantity = (itemId: string, productCode: string) => {
    if (!selectedSO) return 0

    const item = selectedSO.items.find(item => item.so_item_code === itemId)
    if (!item) return 0

    // Hitung total quantity yang sudah dibuat PO untuk product ini dari SO yang sama
    const existingPOsForThisProduct = purchaseOrders.filter(po => 
      po.so_code === selectedSO.so_code && 
      po.items.some(poItem => poItem.product_code === productCode)
    )

    const totalInExistingPOs = existingPOsForThisProduct.reduce((total, po) => {
      const poItem = po.items.find(poItem => poItem.product_code === productCode)
      return total + (poItem ? poItem.quantity : 0)
    }, 0)

    // Hitung total quantity yang sedang dalam form untuk product ini
    const formsForThisProduct = poForms.filter(form => 
      form.itemId === itemId && form.sku === productCode
    )
    const totalInForms = formsForThisProduct.reduce((sum, form) => sum + form.quantity, 0)

    // Remaining = quantity original - (sudah di PO + sedang di form)
    const remaining = item.quantity - totalInExistingPOs - totalInForms
    
    return Math.max(0, remaining)
  }

  // Handlers untuk PO
  const handleCreatePO = (so: SalesOrder) => {
    // FIXED: Cek dulu apakah masih bisa buat PO
    if (!canCreatePO(so)) {
      alert('Tidak bisa membuat PO untuk Sales Order ini. Semua quantity sudah diproses.')
      return
    }
    
    setSelectedSO(so)
    setShowCreateForm(true)
    setPoForms([])
  }

  const addPOForm = (item: OrderItem) => {
    const remaining = getRemainingQuantity(item.so_item_code, item.product_code)
    
    // PERUBAHAN: Boleh buat form meski remaining 0
    const newForm: POFormData = {
      id: Date.now().toString(),
      itemId: item.so_item_code,
      productName: item.product_name,
      sku: item.product_code,
      quantity: Math.min(1, Math.max(1, remaining)), // Default quantity 1
      supplier: '',
      purchasePrice: 0,
      notes: ''
    }
    setPoForms(prev => [...prev, newForm])
  }

  const removePOForm = (formId: string) => {
    setPoForms(prev => prev.filter(form => form.id !== formId))
  }

  const updatePOForm = (formId: string, field: keyof POFormData, value: string | number) => {
    setPoForms(prev => prev.map(form => {
      if (form.id === formId) {
        // Validasi quantity
        if (field === 'quantity') {
          const numericValue = typeof value === 'string' ? parseInt(value) || 0 : value
          
          // PERUBAHAN: Validasi lebih longgar
          if (numericValue < 0) {
            alert('Quantity tidak boleh negatif')
            return form
          }
          
          const remaining = getRemainingQuantity(form.itemId, form.sku)
          const maxAllowed = remaining + form.quantity // Bisa pakai quantity yang sudah ada di form
          
          if (numericValue > maxAllowed) {
            alert(`Quantity tidak boleh melebihi ${maxAllowed} (available quantity)`)
            return { ...form, quantity: maxAllowed }
          }
          
          return { ...form, [field]: numericValue }
        }
        
        return { ...form, [field]: value }
      }
      return form
    }))
  }

  const handleInvoiceUpload = (formId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPoForms(prev => prev.map(form => 
        form.id === formId ? { ...form, invoiceFile: file } : form
      ))
    }
  }

  const removeInvoice = (formId: string) => {
    setPoForms(prev => prev.map(form => 
      form.id === formId ? { ...form, invoiceFile: undefined } : form
    ))
  }

  const submitAllPOs = async () => {
    if (poForms.length === 0 || !selectedSO) {
      alert('No PO forms to submit')
      return
    }

    // Validate all forms
    for (const form of poForms) {
      if (!form.supplier.trim()) {
        alert(`Please enter supplier for ${form.productName}`)
        return
      }
      if (form.quantity <= 0) {
        alert(`Please enter valid quantity for ${form.productName}`)
        return
      }
      if (form.purchasePrice <= 0) {
        alert(`Please enter purchase price for ${form.productName}`)
        return
      }

      const remaining = getRemainingQuantity(form.itemId, form.sku)
      
      // PERUBAHAN: Boleh submit meski remaining 0, asal quantity di form valid
      if (form.quantity > (remaining + form.quantity)) {
        // Ini seharusnya tidak terjadi karena sudah divalidasi di updatePOForm
        alert(`Quantity exceeds available quantity for ${form.productName}. Available: ${remaining}`)
        return
      }
    }

    // PERUBAHAN: Cek apakah ada setidaknya satu form dengan quantity > 0
    const hasValidQuantity = poForms.some(form => form.quantity > 0)
    if (!hasValidQuantity) {
      alert('Please enter at least one item with quantity greater than 0')
      return
    }

    try {
      const token = localStorage.getItem('token')
      
      // Filter hanya form dengan quantity > 0
      const validForms = poForms.filter(form => form.quantity > 0)
      
      if (validForms.length === 0) {
        alert('No valid PO forms to submit (all quantities are 0)')
        return
      }

      // Group by supplier untuk buat multiple POs
      const formsBySupplier: { [key: string]: POFormData[] } = {}
      
      validForms.forEach(form => {
        if (!formsBySupplier[form.supplier]) {
          formsBySupplier[form.supplier] = []
        }
        formsBySupplier[form.supplier].push(form)
      })

      // Create PO untuk setiap supplier
      for (const [supplier, forms] of Object.entries(formsBySupplier)) {
        const poData = {
          so_code: selectedSO.so_code,
          so_reference: selectedSO.so_code,
          supplier_name: supplier,
          supplier_contact: '',
          supplier_bank: '',
          notes: forms.map(f => f.notes).filter(n => n).join(', '),
          items: forms.map(form => ({
            product_name: form.productName,
            product_code: form.sku,
            quantity: form.quantity,
            supplier: form.supplier,
            purchase_price: form.purchasePrice,
            notes: form.notes
          })),
          priority: 'medium',
          customer_ref: selectedSO.so_code
        }

        const response = await fetch('/api/purchase-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(poData)
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error)
        }

        const result = await response.json()
        console.log(`Created PO: ${result.po_code}`)
      }

      alert(`Successfully created ${Object.keys(formsBySupplier).length} Purchase Order(s)!`)
      setPoForms([])
      setShowCreateForm(false)
      setSelectedSO(null)
      fetchData() // Refresh data
      
    } catch (error) {
      console.error('Error creating PO:', error)
      alert('Error creating purchase order')
    }
  }

  // Handlers untuk Payment
  const handleCreatePayment = (po: PurchaseOrder) => {
    // Cek apakah PO approved_finance
    if (po.status !== 'approved_finance') {
      alert('Only finance-approved Purchase Orders can be paid')
      return
    }
    
    setSelectedPO(po)
    setPaymentForm({
      po_code: po.po_code,
      payment_method: 'transfer',
      bank_name: '',
      account_number: '',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: '',
      documents: []
    })
    setShowPaymentForm(true)
  }

  const updatePaymentForm = (field: keyof PaymentFormData, value: any) => {
    setPaymentForm(prev => ({ ...prev, [field]: value }))
  }

  const handlePaymentDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles = Array.from(files)
    setPaymentForm(prev => ({
      ...prev,
      documents: [...prev.documents, ...newFiles]
    }))
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (!files) return

    const newFiles = Array.from(files)
    setPaymentForm(prev => ({
      ...prev,
      documents: [...prev.documents, ...newFiles]
    }))
  }

  const removePaymentDocument = (index: number) => {
    setPaymentForm(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }))
  }

  const submitPayment = async () => {
    if (!selectedPO) return

    // Validation
    if (paymentForm.payment_method === 'transfer' && (!paymentForm.bank_name || !paymentForm.account_number)) {
      alert('Please select bank and enter account number for transfer payment')
      return
    }

    if (!paymentForm.reference_number.trim()) {
      alert('Please enter reference number')
      return
    }

    if (paymentForm.documents.length === 0) {
      alert('Please upload at least one payment document')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      
      // Add payment data
      const paymentData = {
        po_code: selectedPO.po_code,
        payment_method: paymentForm.payment_method,
        bank_name: paymentForm.bank_name,
        account_number: paymentForm.account_number,
        payment_date: paymentForm.payment_date,
        reference_number: paymentForm.reference_number,
        notes: paymentForm.notes,
        amount: selectedPO.total_amount,
        supplier_name: selectedPO.supplier_name,
        so_code: selectedPO.so_code,
        so_reference: selectedPO.so_reference
      }
      
      formData.append('data', JSON.stringify(paymentData))
      
      // Add files
      paymentForm.documents.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch('/api/purchase-orders', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Payment ${result.payment_code} created successfully!`)
        setShowPaymentForm(false)
        setSelectedPO(null)
        setPaymentForm({
          po_code: '',
          payment_method: 'transfer',
          bank_name: '',
          account_number: '',
          payment_date: new Date().toISOString().split('T')[0],
          reference_number: '',
          notes: '',
          documents: []
        })
        fetchData() // Refresh data
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating payment:', error)
      alert('Error creating payment')
    }
  }

  const viewPaymentDetails = (payment: Payment) => {
    setViewingPayment(payment)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      // SO Status
      submitted: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      shipped: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      
      // PO Status
      approved_spv: 'bg-green-100 text-green-800',
      approved_finance: 'bg-purple-100 text-purple-800',
      paid: 'bg-indigo-100 text-indigo-800',
      rejected: 'bg-red-100 text-red-800',
      
      // Payment Status
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string) => {
    const texts: {[key: string]: string} = {
      submitted: 'Submitted',
      approved_spv: 'Approved SPV',
      approved_finance: 'Approved Finance',
      paid: 'Paid',
      rejected: 'Rejected',
      pending: 'Pending',
      failed: 'Failed'
    }
    return texts[status] || status
  }

  const getPaymentMethodIcon = (method: string) => {
    const icons = {
      transfer: <Landmark className="h-4 w-4" />,
      cash: <Banknote className="h-4 w-4" />,
      credit_card: <CreditCard className="h-4 w-4" />,
      other: <FileText className="h-4 w-4" />
    }
    return icons[method as keyof typeof icons]
  }

  // Pagination Component
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
          <span className="font-semibold">{Math.min(indexOfLastItem, currentData.length)}</span> of{" "}
          <span className="font-semibold">{currentData.length}</span> results
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                onClick={() => setCurrentPage(number)}
                className="w-8 h-8 p-0 min-w-8"
              >
                {number}
              </Button>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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

  // Reset ketika switch table
  useEffect(() => {
    setSelectedSO(null)
    setPoForms([])
    setShowCreateForm(false)
    setSelectedPO(null)
    setShowPaymentForm(false)
    setViewingPayment(null)
    setPaymentForm({
      po_code: '',
      payment_method: 'transfer',
      bank_name: '',
      account_number: '',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: '',
      documents: []
    })
  }, [activeTable])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Previous Sales Orders - Full Width Table */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {activeTable === 'so' ? 'Sales Orders' : 
                 activeTable === 'po' ? 'Purchase Orders' : 
                 'Payments'}
              </CardTitle>
              
              {/* Table Switch */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
                <Button
                  variant={activeTable === 'so' ? "default" : "ghost"}
                  onClick={() => setActiveTable('so')}
                  className="px-4"
                >
                  Sales Orders
                </Button>
                <Button
                  variant={activeTable === 'po' ? "default" : "ghost"}
                  onClick={() => setActiveTable('po')}
                  className="px-4"
                >
                  Purchase Orders
                </Button>
                <Button
                  variant={activeTable === 'payment' ? "default" : "ghost"}
                  onClick={() => setActiveTable('payment')}
                  className="px-4"
                >
                  Payments
                </Button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Search Input */}
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={
                    activeTable === 'so' ? "Search SO code or customer..." :
                    activeTable === 'po' ? "Search PO code or supplier..." :
                    "Search payment code or PO code..."
                  }
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
                {activeTable === 'so' ? (
                  <>
                    <option value="submitted">Submitted</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </>
                ) : activeTable === 'po' ? (
                  <>
                    <option value="submitted">Submitted</option>
                    <option value="approved_spv">Approved SPV</option>
                    <option value="approved_finance">Approved Finance</option>
                    <option value="paid">Paid</option>
                    <option value="rejected">Rejected</option>
                  </>
                ) : (
                  <>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                  </>
                )}
              </select>
              
              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="all">All Dates</option>
                {Array.from(new Set([
                  ...salesOrders.map(so => so.created_at?.split('T')[0]).filter(Boolean),
                  ...purchaseOrders.map(po => po.date).filter(Boolean),
                  ...payments.map(p => p.payment_date).filter(Boolean)
                ])).slice(0, 10).map(date => (
                  <option key={date} value={date}>
                    {new Date(date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </option>
                ))}
              </select>

              {/* Reset Filters */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setDateFilter('all')
                  setCurrentPage(1)
                }}
                className="whitespace-nowrap"
              >
                Reset Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Active Filters Info */}
            {(searchTerm || statusFilter !== 'all' || dateFilter !== 'all') && (
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
                  {dateFilter !== 'all' && (
                    <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800">
                      Date: {new Date(dateFilter).toLocaleDateString()}
                      <button 
                        onClick={() => setDateFilter('all')} 
                        className="ml-1 hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {activeTable === 'so' ? (
                    <TableRow>
                      <TableHead>SO Code</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>PO Count</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  ) : activeTable === 'po' ? (
                    <TableRow>
                      <TableHead>PO Code</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>SO Reference</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableHead>Payment Code</TableHead>
                      <TableHead>PO Code</TableHead>
                      <TableHead>SO Reference</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  )}
                </TableHeader>
                <TableBody>
                  {currentItems.length > 0 ? (
                    currentItems.map((item) => (
                      <TableRow key={activeTable === 'so' ? (item as SalesOrder).so_code : 
                                    activeTable === 'po' ? (item as PurchaseOrder).po_code : 
                                    (item as Payment).payment_code} 
                                className="hover:bg-gray-50">
                        {activeTable === 'so' ? (
                          <>
                            <TableCell className="font-semibold">{(item as SalesOrder).so_code}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{(item as SalesOrder).customer_name}</div>
                                <div className="text-sm text-gray-500">{(item as SalesOrder).customer_phone}</div>
                              </div>
                            </TableCell>
                            <TableCell>{new Date((item as SalesOrder).created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{(item as SalesOrder).items.length} items</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor((item as SalesOrder).status)}>
                                {(item as SalesOrder).status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={(item as SalesOrder).po_count > 0 ? "default" : "secondary"}>
                                {(item as SalesOrder).po_count} PO
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                onClick={() => handleCreatePO(item as SalesOrder)}
                                size="sm"
                                disabled={!canCreatePO(item as SalesOrder)} // FIXED: Disable jika tidak bisa buat PO
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Create PO
                              </Button>
                            </TableCell>
                          </>
                        ) : activeTable === 'po' ? (
                          <>
                            <TableCell className="font-semibold">{(item as PurchaseOrder).po_code}</TableCell>
                            <TableCell>{(item as PurchaseOrder).supplier_name}</TableCell>
                            <TableCell className="text-blue-600">
                              {(item as PurchaseOrder).so_reference}
                            </TableCell>
                            <TableCell>{(item as PurchaseOrder).date}</TableCell>
                            <TableCell className="font-semibold">
                              Rp {(item as PurchaseOrder).total_amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor((item as PurchaseOrder).status)}>
                                {getStatusText((item as PurchaseOrder).status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                {/* PAYMENT ACTION - HANYA UNTUK APPROVED_FINANCE */}
                                {(item as PurchaseOrder).status === 'approved_finance' && (
                                  <Button 
                                    onClick={() => handleCreatePayment(item as PurchaseOrder)}
                                    size="sm"
                                  >
                                    <CreditCard className="h-4 w-4 mr-1" />
                                    Pay
                                  </Button>
                                )}
                                
                                {/* PDF EXPORT */}
                                <Button 
                                  onClick={() => {/* Export PDF logic */}}
                                  size="sm"
                                  variant="outline"
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  PDF
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-semibold">{(item as Payment).payment_code}</TableCell>
                            <TableCell className="font-semibold">{(item as Payment).po_code}</TableCell>
                            <TableCell className="text-blue-600">{(item as Payment).so_reference || '-'}</TableCell>
                            <TableCell>{(item as Payment).supplier_name}</TableCell>
                            <TableCell className="font-semibold">
                              Rp {(item as Payment).amount.toLocaleString()}
                            </TableCell>
                            <TableCell>{(item as Payment).payment_date}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getPaymentMethodIcon((item as Payment).payment_method)}
                                <span className="capitalize">{(item as Payment).payment_method.replace('_', ' ')}</span>
                                {(item as Payment).bank_name && (
                                  <span className="text-xs text-gray-500">({(item as Payment).bank_name})</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor((item as Payment).status)}>
                                {(item as Payment).status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                onClick={() => viewPaymentDetails(item as Payment)}
                                size="sm"
                                variant="outline"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell 
                        colSpan={
                          activeTable === 'so' ? 7 : 
                          activeTable === 'po' ? 7 : 
                          9
                        } 
                        className="text-center py-8 text-gray-500"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-12 w-12 text-gray-300" />
                          <p>No {activeTable === 'so' ? 'sales orders' : activeTable === 'po' ? 'purchase orders' : 'payments'} found matching your filters.</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSearchTerm('')
                              setStatusFilter('all')
                              setDateFilter('all')
                            }}
                          >
                            Clear Filters
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {currentData.length > 0 && <Pagination />}
          </CardContent>
        </Card>

        {/* Create New Purchase Order - Collapsible */}
        {showCreateForm && selectedSO && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Create New Purchase Order - {selectedSO.so_code}
                </CardTitle>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateForm(false)
                    setSelectedSO(null)
                    setPoForms([])
                  }}
                >
                  <ChevronUp className="h-4 w-4" />
                  Hide Form
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-6">
                {/* Product Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Product Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">No</TableHead>
                          <TableHead>Product Name</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Original Quantity</TableHead>
                          <TableHead>Remaining Quantity</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSO.items.map((item, index) => {
                          const remaining = getRemainingQuantity(item.so_item_code, item.product_code)
                          return (
                            <TableRow key={item.so_item_code}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell className="font-semibold">{item.product_name}</TableCell>
                              <TableCell className="font-mono">{item.product_code}</TableCell>
                              <TableCell>{item.quantity} pcs</TableCell>
                              <TableCell>
                                <Badge variant={remaining > 0 ? "default" : "secondary"}>
                                  {remaining} pcs
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  onClick={() => addPOForm(item)}
                                  size="sm"
                                  // PERUBAHAN: Tidak disable meski remaining 0
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add PO Form
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* PO Forms */}
                {poForms.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">PO Forms ({poForms.length})</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {poForms.map((form, index) => {
                          const item = selectedSO.items.find(item => item.so_item_code === form.itemId)
                          if (!item) return null

                          const remaining = getRemainingQuantity(form.itemId, form.sku)

                          return (
                            <div key={form.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 p-4 border rounded-lg relative">
                              {/* Nomor Form di garis card kiri atas */}
                              <div className="absolute -top-2 -left-2">
                                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                                  {index + 1}
                                </div>
                              </div>
                              
                              {poForms.length > 1 && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute top-2 right-2"
                                  onClick={() => removePOForm(form.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}

                              <div className="space-y-1">
                                <Label className="text-sm">Product Name</Label>
                                <div className="p-2 bg-gray-50 rounded border text-sm font-medium">
                                  {form.productName}
                                </div>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-sm">Supplier Name *</Label>
                                <Input
                                  value={form.supplier}
                                  onChange={(e) => updatePOForm(form.id, 'supplier', e.target.value)}
                                  placeholder="Enter supplier name"
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="text-sm">Purchase Price *</Label>
                                <Input
                                  type="number"
                                  value={form.purchasePrice || ''}
                                  onChange={(e) => updatePOForm(form.id, 'purchasePrice', parseInt(e.target.value) || 0)}
                                  placeholder="Enter purchase price"
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="text-sm">Quantity *</Label>
                                <Input
                                  type="number"
                                  value={form.quantity || ''}
                                  onChange={(e) => updatePOForm(form.id, 'quantity', parseInt(e.target.value) || 0)}
                                  placeholder="Enter quantity"
                                  min="1"
                                  max={remaining + form.quantity} // Bisa sampai remaining + quantity yang sudah di form
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Remaining: {remaining} pcs
                                </p>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-sm">Notes</Label>
                                <Input
                                  value={form.notes}
                                  onChange={(e) => updatePOForm(form.id, 'notes', e.target.value)}
                                  placeholder="Additional notes"
                                />
                              </div>

                              {/* Invoice Upload Section */}
                              <div className="space-y-2">
                                <Label className="text-sm">Invoice</Label>
                                {form.invoiceFile ? (
                                  <div className="flex items-center gap-2 p-2 border rounded bg-green-50">
                                    <FileText className="h-4 w-4 text-green-600" />
                                    <span className="text-sm flex-1 truncate">{form.invoiceFile.name}</span>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => removeInvoice(form.id)}
                                      className="h-6 w-6 p-0"
                                    >
                                      ×
                                    </Button>
                                  </div>
                                ) : (
                                  <Button 
                                    variant="outline" 
                                    onClick={() => fileInputRefs.current[form.id]?.click()}
                                    size="sm"
                                    className="w-full"
                                  >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Invoice
                                    <input
                                     ref={el => {
    if (el) {
      fileInputRefs.current[form.id] = el;
    }
  }}
  type="file"
  className="hidden"
  onChange={(e) => handleInvoiceUpload(form.id, e)}
  accept=".pdf,.jpg,.jpeg,.png"
                                    />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        })}

                        {/* Submit Button */}
                        <div className="w-full pt-4">
                          <Button onClick={submitAllPOs} size="lg" className="w-full">
                            Create {poForms.length} Purchase Order(s)
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Payment Form */}
        {showPaymentForm && selectedPO && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Create Payment - {selectedPO.po_code}
                </CardTitle>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowPaymentForm(false)
                    setSelectedPO(null)
                  }}
                >
                  <ChevronUp className="h-4 w-4" />
                  Hide Form
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-6">
                {/* Payment Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">PO Code</Label>
                        <div className="p-2 bg-gray-50 rounded border font-semibold">
                          {selectedPO.po_code}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Supplier</Label>
                        <div className="p-2 bg-gray-50 rounded border">
                          {selectedPO.supplier_name}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Total Amount</Label>
                        <div className="p-2 bg-gray-50 rounded border font-semibold text-green-600">
                          Rp {selectedPO.total_amount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="paymentMethod" className="text-sm font-medium">
                            Payment Method *
                          </Label>
                          <select
                            id="paymentMethod"
                            value={paymentForm.payment_method}
                            onChange={(e) => updatePaymentForm('payment_method', e.target.value)}
                            className="w-full border rounded-md px-3 py-2"
                          >
                            <option value="transfer">Transfer Bank</option>
                            <option value="cash">Cash</option>
                            <option value="credit_card">Kartu Kredit</option>
                            <option value="other">Lainnya</option>
                          </select>
                        </div>

                        {paymentForm.payment_method === 'transfer' && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="bankName" className="text-sm font-medium">
                                Bank Name *
                              </Label>
                              <select
                                id="bankName"
                                value={paymentForm.bank_name}
                                onChange={(e) => updatePaymentForm('bank_name', e.target.value)}
                                className="w-full border rounded-md px-3 py-2"
                              >
                                <option value="">Pilih Bank</option>
                                <option value="BCA">BCA</option>
                                <option value="Mandiri">Mandiri</option>
                                <option value="BNI">BNI</option>
                                <option value="BRI">BRI</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="accountNumber" className="text-sm font-medium">
                                Nomor Rekening Supplier *
                              </Label>
                              <Input
                                id="accountNumber"
                                value={paymentForm.account_number}
                                onChange={(e) => updatePaymentForm('account_number', e.target.value)}
                                placeholder="Masukkan nomor rekening supplier"
                              />
                            </div>
                          </>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="paymentDate" className="text-sm font-medium">
                            Payment Date *
                          </Label>
                          <Input
                            id="paymentDate"
                            type="date"
                            value={paymentForm.payment_date}
                            onChange={(e) => updatePaymentForm('payment_date', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="referenceNumber" className="text-sm font-medium">
                            Reference Number *
                          </Label>
                          <Input
                            id="referenceNumber"
                            value={paymentForm.reference_number}
                            onChange={(e) => updatePaymentForm('reference_number', e.target.value)}
                            placeholder="Masukkan nomor referensi pembayaran"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="notes" className="text-sm font-medium">
                            Notes
                          </Label>
                          <Textarea
                            id="notes"
                            value={paymentForm.notes}
                            onChange={(e) => updatePaymentForm('notes', e.target.value)}
                            placeholder="Catatan tambahan untuk pembayaran"
                            rows={3}
                          />
                        </div>

                        {/* Document Upload */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Payment Documents *
                          </Label>
                          <div 
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                              ${isDragOver 
                                ? 'border-blue-400 bg-blue-50' 
                                : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                              }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => paymentFileInputRef.current?.click()}
                          >
                            <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragOver ? 'text-blue-400' : 'text-gray-400'}`} />
                            <div className="space-y-2">
                              <p className="text-lg font-medium text-gray-700">
                                {isDragOver ? 'Drop files here' : 'Click to upload or drag and drop'}
                              </p>
                              <p className="text-sm text-gray-500">
                                Upload bukti transfer atau dokumen pembayaran
                              </p>
                              <p className="text-xs text-gray-400">
                                PDF, JPG, PNG (Max. 10MB per file)
                              </p>
                            </div>
                            <input
                              ref={paymentFileInputRef}
                              type="file"
                              multiple
                              className="hidden"
                              onChange={handlePaymentDocumentUpload}
                              accept=".pdf,.jpg,.jpeg,.png"
                            />
                          </div>

                          {/* Uploaded Documents List */}
                          {paymentForm.documents.length > 0 && (
                            <div className="mt-4 space-y-3">
                              <Label className="text-sm font-medium text-gray-700">
                                Uploaded Documents ({paymentForm.documents.length})
                              </Label>
                              {paymentForm.documents.map((doc, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-green-600" />
                                    <div>
                                      <div className="font-medium text-sm">{doc.name}</div>
                                      <div className="text-xs text-gray-500">{(doc.size / 1024 / 1024).toFixed(2)} MB</div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      removePaymentDocument(index)
                                    }}
                                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                  >
                                    ×
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="w-full pt-6">
                      <Button 
                        onClick={submitPayment} 
                        size="lg" 
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={!paymentForm.reference_number.trim() || paymentForm.documents.length === 0}
                      >
                        <CreditCard className="h-5 w-5 mr-2" />
                        Submit Payment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Details Modal */}
        {viewingPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-lg font-semibold">Payment Details - {viewingPayment.payment_code}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewingPayment(null)}
                >
                  ×
                </Button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Payment Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Payment Code:</span>
                          <span className="font-semibold">{viewingPayment.payment_code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">PO Code:</span>
                          <span className="font-semibold">{viewingPayment.po_code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">SO Reference:</span>
                          <span className="font-semibold">{viewingPayment.so_reference || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Supplier:</span>
                          <span>{viewingPayment.supplier_name}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Amount:</span>
                          <span className="font-semibold text-green-600">Rp {viewingPayment.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Payment Date:</span>
                          <span>{viewingPayment.payment_date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Payment Method:</span>
                          <span className="capitalize">{viewingPayment.payment_method.replace('_', ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Status:</span>
                          <Badge className={getStatusColor(viewingPayment.status)}>
                            {viewingPayment.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Bank Details for Transfer */}
                    {viewingPayment.payment_method === 'transfer' && viewingPayment.bank_name && (
                      <div className="mt-4 p-4 border rounded-lg bg-blue-50">
                        <h4 className="font-medium text-blue-800 mb-2">Bank Transfer Details</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span>Bank Name:</span>
                          <span className="font-medium">{viewingPayment.bank_name}</span>
                          <span>Account Number:</span>
                          <span className="font-medium">{viewingPayment.account_number}</span>
                        </div>
                      </div>
                    )}

                    {/* Reference Number */}
                    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                      <h4 className="font-medium mb-2">Reference Information</h4>
                      <div className="text-sm">
                        <span className="font-medium">Reference Number: </span>
                        <span>{viewingPayment.reference_number}</span>
                      </div>
                      {viewingPayment.notes && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Notes: </span>
                          <span>{viewingPayment.notes}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}