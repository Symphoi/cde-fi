'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, FileText, Trash2, ChevronUp, ChevronLeft, ChevronRight, Upload, Download, Eye, Calendar, CreditCard, Banknote, Landmark, Package, DollarSign, CheckCircle, Clock, XCircle, BarChart3, UserCheck, ShieldCheck, Loader2, AlertCircle, CheckCircle2, X, FileDown } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/app/lib/utils"
import { CustomDialogContent } from '@/components/custom-dialog'

// Type definitions - MATCH DATABASE STRUCTURE
interface SalesOrder {
  so_code: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  status: 'submitted' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
  items: OrderItem[]
  po_count: number
  created_at: string
  total_amount: number
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
  supplier_code?: string
  supplier_data?: any
  so_code: string
  so_reference: string
  supplier_name: string
  supplier_contact?: string
  supplier_bank?: string
  total_amount: number
  status: 'draft' | 'submitted' | 'paid' | 'cancelled' | 'rejected'
  notes?: string
  date: string
  priority: 'low' | 'medium' | 'high'
  items: POItem[]
  payments: Payment[]
  attachments: Attachment[]
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
}

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
  documents?: PaymentDocument[]
}

interface PaymentDocument {
  id: string
  name: string
  url: string
  type: string
  upload_date: string
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
  company_bank_code: string
}

interface Supplier {
  supplier_code: string
  supplier_name: string
  contact_person?: string
  phone?: string
  email?: string
  bank_name?: string
  account_number?: string
}

interface CompanyBank {
  account_code: string
  bank_name: string
  account_number: string
  account_holder: string
  branch?: string
  currency: string
}

// Helper function untuk format Rupiah
const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Helper function untuk format tanggal YYYY-MM-DD
const formatDate = (dateString: string): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toISOString().split('T')[0]
}

// Stat Card Component
const StatCard = ({ title, value, icon, description, color }: { 
  title: string; 
  value: number; 
  icon: React.ReactNode; 
  description: string;
  color: string;
}) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
)

// Loading Component
const LoadingSpinner = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
    <p className="text-gray-600">{message}</p>
  </div>
)

// Error Component
const ErrorMessage = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
    <p className="text-red-600 font-medium mb-2">Error</p>
    <p className="text-gray-600 mb-4">{message}</p>
    {onRetry && (
      <Button onClick={onRetry} variant="outline">
        Try Again
      </Button>
    )}
  </div>
)

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
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [companyBanks, setCompanyBanks] = useState<CompanyBank[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportLoading, setExportLoading] = useState(false)

  // State untuk stat cards
  const [stats, setStats] = useState({
    totalSO: 0,
    totalPO: 0,
    totalPayments: 0,
    pendingApproval: 0,
    submitted: 0,
    processing: 0,
    completed: 0,
    cancelled: 0
  })

  // State untuk form PO
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [poForms, setPoForms] = useState<POFormData[]>([])
  const [poLoading, setPoLoading] = useState(false)

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
    documents: [],
    company_bank_code: ''
  })
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null)
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null)
  const paymentFileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Form validation state
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})

  // Fetch data dari API
  useEffect(() => {
    fetchData()
  }, [activeTable])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token')
      
      // Fetch suppliers
      const suppliersResponse = await fetch('/api/purchase-orders?endpoint=suppliers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (suppliersResponse.ok) {
        const suppliersData = await suppliersResponse.json()
        if (suppliersData.success) {
          setSuppliers(suppliersData.data)
        }
      }

      // Fetch company bank accounts
      const bankAccountsResponse = await fetch('/api/purchase-orders?endpoint=bank-accounts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (bankAccountsResponse.ok) {
        const bankData = await bankAccountsResponse.json()
        if (bankData.success) {
          setCompanyBanks(bankData.data)
        }
      }

      if (activeTable === 'so' || activeTable === 'po') {
        // Fetch sales orders
        const soResponse = await fetch('/api/purchase-orders', {
          method: 'OPTIONS',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (soResponse.ok) {
          const soData = await soResponse.json()
          if (soData.success) {
            setSalesOrders(soData.data)
            setStats(prev => ({ ...prev, totalSO: soData.data.length }))
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
            
            // Calculate breakdown stats untuk PO
            const submitted = poData.data.filter((po: PurchaseOrder) => po.status === 'submitted').length
            const paid = poData.data.filter((po: PurchaseOrder) => po.status === 'paid').length
            const cancelled = poData.data.filter((po: PurchaseOrder) => po.status === 'cancelled').length
            const rejected = poData.data.filter((po: PurchaseOrder) => po.status === 'rejected').length
            
            setStats(prev => ({ 
              ...prev, 
              totalPO: poData.data.length,
              pendingApproval: 0, // Tidak ada approval lagi
              submitted,
              processing: 0, // Tidak ada processing status
              completed: paid,
              cancelled: cancelled + rejected
            }))
            
            // Extract all payments dari purchase orders
            const allPayments = poData.data.flatMap((po: PurchaseOrder) => po.payments || [])
            setPayments(allPayments)
            setStats(prev => ({ ...prev, totalPayments: allPayments.length }))
          }
        }
      }
      
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Export to Excel function
  const exportToExcel = async () => {
    try {
      setExportLoading(true)
      const token = localStorage.getItem('token')
      
      let endpoint = ''
      switch (activeTable) {
        case 'so':
          endpoint = 'export-sales-orders'
          break
        case 'po':
          endpoint = 'export-purchase-orders'
          break
        case 'payment':
          endpoint = 'export-payments'
          break
      }

      const response = await fetch(`/api/purchase-orders?endpoint=${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${activeTable}-export-${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        throw new Error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export data. Please try again.')
    } finally {
      setExportLoading(false)
    }
  }

  // Download PDF function
  const downloadPDF = async (poCode: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/purchase-orders?endpoint=pdf&po_code=${poCode}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `PO-${poCode}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        throw new Error('PDF download failed')
      }
    } catch (error) {
      console.error('PDF download error:', error)
      alert('Failed to download PDF. Please try again.')
    }
  }

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

  const filteredPO = purchaseOrders.filter(po => {
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

  // Fungsi untuk cek apakah PO bisa dilakukan payment
  const canMakePayment = (po: PurchaseOrder): boolean => {
    const allowedStatuses = ['submitted'] // Hanya PO dengan status submitted yang bisa dibayar
    return allowedStatuses.includes(po.status)
  }

  // Fungsi untuk menghitung remaining quantity untuk SO tertentu
  const getRemainingQuantityForSO = (itemId: string, productCode: string, soCode: string): number => {
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

  // Fungsi untuk cek apakah SO masih bisa buat PO (ada item yang remaining > 0)
  const canCreatePO = (so: SalesOrder): boolean => {
    return so.items.some(item => {
      const remaining = getRemainingQuantityForSO(item.so_item_code, item.product_code, so.so_code)
      return remaining > 0
    })
  }

  // Fungsi untuk menghitung remaining quantity yang benar (dengan selectedSO)
  const getRemainingQuantity = (itemId: string, productCode: string): number => {
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

  // Form validation functions
  const validatePOForm = (): boolean => {
    const errors: {[key: string]: string} = {}

    if (poForms.length === 0) {
      errors.general = 'Please add at least one PO form'
    }

    poForms.forEach((form, index) => {
      if (!form.supplier.trim()) {
        errors[`supplier_${index}`] = 'Supplier is required'
      }
      if (form.quantity <= 0) {
        errors[`quantity_${index}`] = 'Quantity must be greater than 0'
      }
      if (form.purchasePrice <= 0) {
        errors[`price_${index}`] = 'Purchase price must be greater than 0'
      }
    })

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validatePaymentForm = (): boolean => {
    const errors: {[key: string]: string} = {}

    if (!paymentForm.reference_number.trim()) {
      errors.reference_number = 'Reference number is required'
    }

    if (paymentForm.payment_method === 'transfer') {
      if (!paymentForm.company_bank_code) {
        errors.company_bank_code = 'Company bank account is required for transfer'
      }
      if (!paymentForm.bank_name) {
        errors.bank_name = 'Supplier bank name is required for transfer'
      }
      if (!paymentForm.account_number) {
        errors.account_number = 'Supplier account number is required for transfer'
      }
    }

    if (paymentForm.documents.length === 0) {
      errors.documents = 'At least one payment document is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handlers untuk PO
  const handleCreatePO = (so: SalesOrder) => {
    // Cek dulu apakah masih bisa buat PO
    if (!canCreatePO(so)) {
      alert('Tidak bisa membuat PO untuk Sales Order ini. Semua quantity sudah diproses.')
      return
    }
    
    setSelectedSO(so)
    setShowCreateForm(true)
    setPoForms([])
    setFormErrors({})
  }

  const addPOForm = (item: OrderItem) => {
    const remaining = getRemainingQuantity(item.so_item_code, item.product_code)
    
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
    setFormErrors({})
  }

  const updatePOForm = (formId: string, field: keyof POFormData, value: string | number) => {
    setPoForms(prev => prev.map(form => {
      if (form.id === formId) {
        // Validasi quantity
        if (field === 'quantity') {
          const numericValue = typeof value === 'string' ? parseInt(value) || 0 : value
          
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

  const submitAllPOs = async () => {
    if (!validatePOForm()) return

    if (poForms.length === 0 || !selectedSO) {
      alert('No PO forms to submit')
      return
    }

    try {
      setPoLoading(true)
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
        const supplierData = suppliers.find(s => s.supplier_name === supplier)
        
        const poData = {
          so_code: selectedSO.so_code,
          so_reference: selectedSO.so_code,
          supplier_code: supplierData?.supplier_code || '',
          supplier_name: supplier,
          supplier_contact: supplierData?.contact_person || '',
          supplier_bank: supplierData?.bank_name || '',
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
    } finally {
      setPoLoading(false)
    }
  }

  // Handlers untuk Payment
  const handleCreatePayment = (po: PurchaseOrder) => {
    // Cek apakah PO bisa dilakukan payment
    if (!canMakePayment(po)) {
      alert(`Cannot create payment for PO with status "${getStatusText(po.status)}". Only submitted Purchase Orders can be paid.`)
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
      documents: [],
      company_bank_code: ''
    })
    setShowPaymentForm(true)
    setFormErrors({})
  }

  const updatePaymentForm = (field: keyof PaymentFormData, value: any) => {
    setPaymentForm(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handlePaymentDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles = Array.from(files)
    setPaymentForm(prev => ({
      ...prev,
      documents: [...prev.documents, ...newFiles]
    }))
    // Clear documents error
    if (formErrors.documents) {
      setFormErrors(prev => ({ ...prev, documents: '' }))
    }
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
    // Clear documents error
    if (formErrors.documents) {
      setFormErrors(prev => ({ ...prev, documents: '' }))
    }
  }

  const removePaymentDocument = (index: number) => {
    setPaymentForm(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }))
  }

  const submitPayment = async () => {
    if (!selectedPO) return

    // Double check sebelum submit payment
    if (!canMakePayment(selectedPO)) {
      alert(`Cannot process payment for PO with status "${getStatusText(selectedPO.status)}". Only submitted Purchase Orders can be paid.`)
      return
    }

    if (!validatePaymentForm()) return

    try {
      setPaymentLoading(true)
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
        so_reference: selectedPO.so_reference,
        company_bank_code: paymentForm.company_bank_code
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
          documents: [],
          company_bank_code: ''
        })
        fetchData() // Refresh data
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating payment:', error)
      alert('Error creating payment')
    } finally {
      setPaymentLoading(false)
    }
  }

  const viewPaymentDetails = (payment: Payment) => {
    setViewingPayment(payment)
  }

  const viewPODetails = (po: PurchaseOrder) => {
    setViewingPO(po)
  }

  const getStatusColor = (status: string) => {
    const colors: {[key: string]: string} = {
      // SO Status
      submitted: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      shipped: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      
      // PO Status
      draft: 'bg-gray-100 text-gray-800',
      paid: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      
      // Payment Status
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string) => {
    const texts: {[key: string]: string} = {
      // PO Status
      draft: 'Draft',
      submitted: 'Submitted',
      paid: 'Paid',
      cancelled: 'Cancelled',
      rejected: 'Rejected',
      
      // Payment Status
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
    setViewingPO(null)
    setPaymentForm({
      po_code: '',
      payment_method: 'transfer',
      bank_name: '',
      account_number: '',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: '',
      documents: [],
      company_bank_code: ''
    })
    setFormErrors({})
  }, [activeTable])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Loading purchase order data..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage message={error} onRetry={fetchData} />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
        
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Purchase Order Management</h1>
          <p className="text-gray-600 mt-2">Manage sales orders, purchase orders, and payments in one place</p>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Sales Orders"
            value={stats.totalSO}
            icon={<FileText className="h-6 w-6 text-blue-600" />}
            description="All time sales orders"
            color="bg-blue-50"
          />
          <StatCard
            title="Total Purchase Orders"
            value={stats.totalPO}
            icon={<Package className="h-6 w-6 text-green-600" />}
            description="All time purchase orders"
            color="bg-green-50"
          />
          <StatCard
            title="Total Payments"
            value={stats.totalPayments}
            icon={<DollarSign className="h-6 w-6 text-purple-600" />}
            description="All time payments processed"
            color="bg-purple-50"
          />
          <StatCard
            title="Pending Approval"
            value={stats.pendingApproval}
            icon={<Clock className="h-6 w-6 text-orange-600" />}
            description="POs waiting for approval"
            color="bg-orange-50"
          />
        </div>

        {/* MAIN CONTENT CARD */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5" />
                {activeTable === 'so' ? 'Sales Orders' : 
                 activeTable === 'po' ? 'Purchase Orders' : 
                 'Payments'}
              </CardTitle>
              
              <div className="flex flex-col sm:flex-row gap-3">
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

                {/* Export Button */}
                <Button
                  onClick={exportToExcel}
                  disabled={exportLoading || currentData.length === 0}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {exportLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  Export Excel
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
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
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
                    {formatDate(date)}
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
                      Date: {formatDate(dateFilter)}
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
                      <TableHead className="w-12">No</TableHead>
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
                      <TableHead className="w-12">No</TableHead>
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
                      <TableHead className="w-12">No</TableHead>
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
                    currentItems.map((item, index) => (
                      <TableRow key={activeTable === 'so' ? (item as SalesOrder).so_code : 
                                    activeTable === 'po' ? (item as PurchaseOrder).po_code : 
                                    (item as Payment).payment_code} 
                                className="hover:bg-gray-50">
                        {/* No Urut */}
                        <TableCell className="font-medium">
                          {indexOfFirstItem + index + 1}
                        </TableCell>
                        
                        {activeTable === 'so' ? (
                          <>
                            <TableCell className="font-semibold">{(item as SalesOrder).so_code}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{(item as SalesOrder).customer_name}</div>
                                <div className="text-sm text-gray-500">{(item as SalesOrder).customer_phone}</div>
                              </div>
                            </TableCell>
                            <TableCell>{formatDate((item as SalesOrder).created_at)}</TableCell>
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
                                disabled={!canCreatePO(item as SalesOrder)}
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
                            <TableCell>{formatDate((item as PurchaseOrder).date)}</TableCell>
                            <TableCell className="font-semibold">
                              {formatRupiah((item as PurchaseOrder).total_amount)}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor((item as PurchaseOrder).status)}>
                                {getStatusText((item as PurchaseOrder).status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                {/* VIEW ACTION */}
                                <Button 
                                  onClick={() => viewPODetails(item as PurchaseOrder)}
                                  size="sm"
                                  variant="outline"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                
                                {/* PAYMENT ACTION - HANYA UNTUK PO YANG BISA DIBUAT PAYMENT */}
                                <Button 
                                  onClick={() => handleCreatePayment(item as PurchaseOrder)}
                                  size="sm"
                                  disabled={!canMakePayment(item as PurchaseOrder)}
                                  title={!canMakePayment(item as PurchaseOrder) ? `Cannot pay PO with status "${getStatusText((item as PurchaseOrder).status)}"` : 'Create Payment'}
                                >
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  Pay
                                </Button>
                                
                                {/* PDF EXPORT */}
                                <Button 
                                  onClick={() => downloadPDF((item as PurchaseOrder).po_code)}
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
                              {formatRupiah((item as Payment).amount)}
                            </TableCell>
                            <TableCell>{formatDate((item as Payment).payment_date)}</TableCell>
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
                                className="flex items-center gap-1"
                              >
                                <Eye className="h-4 w-4" />
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
                          activeTable === 'so' ? 8 : 
                          activeTable === 'po' ? 8 : 
                          10
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

        {/* CREATE NEW PURCHASE ORDER - COLLAPSIBLE */}
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
                                  disabled={remaining === 0}
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
                            <div key={form.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 p-4 border rounded-lg relative">
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
                                <select
                                  value={form.supplier}
                                  onChange={(e) => updatePOForm(form.id, 'supplier', e.target.value)}
                                  className="w-full border rounded px-2 py-1"
                                >
                                  <option value="">Pilih Supplier</option>
                                  {suppliers.map(supplier => (
                                    <option 
                                      key={`${supplier.supplier_code}-${form.id}`}
                                      value={supplier.supplier_name}
                                    >
                                      {supplier.supplier_name}
                                    </option>
                                  ))}
                                </select>
                                {formErrors[`supplier_${index}`] && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors[`supplier_${index}`]}</p>
                                )}
                              </div>

                              <div className="space-y-1">
                                <Label className="text-sm">Purchase Price *</Label>
                                <Input
                                  type="number"
                                  value={form.purchasePrice || ''}
                                  onChange={(e) => updatePOForm(form.id, 'purchasePrice', parseInt(e.target.value) || 0)}
                                  placeholder="Enter purchase price"
                                />
                                {formErrors[`price_${index}`] && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors[`price_${index}`]}</p>
                                )}
                              </div>

                              <div className="space-y-1">
                                <Label className="text-sm">Quantity *</Label>
                                <Input
                                  type="number"
                                  value={form.quantity || ''}
                                  onChange={(e) => updatePOForm(form.id, 'quantity', parseInt(e.target.value) || 0)}
                                  placeholder="Enter quantity"
                                  min="1"
                                  max={remaining + form.quantity}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Remaining: {remaining} pcs
                                </p>
                                {formErrors[`quantity_${index}`] && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors[`quantity_${index}`]}</p>
                                )}
                              </div>

                              <div className="space-y-1">
                                <Label className="text-sm">Notes</Label>
                                <Input
                                  value={form.notes}
                                  onChange={(e) => updatePOForm(form.id, 'notes', e.target.value)}
                                  placeholder="Additional notes"
                                />
                              </div>
                            </div>
                          )
                        })}

                        {/* Submit Button */}
                        <div className="w-full pt-4">
                          <Button 
                            onClick={submitAllPOs} 
                            size="lg" 
                            className="w-full"
                            disabled={poLoading}
                          >
                            {poLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating Purchase Orders...
                              </>
                            ) : (
                              `Create ${poForms.length} Purchase Order(s)`
                            )}
                          </Button>
                          {formErrors.general && (
                            <p className="text-red-500 text-sm mt-2 text-center">{formErrors.general}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CREATE PAYMENT FORM */}
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
                          {formatRupiah(selectedPO.total_amount)}
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

                        {/* Company Bank Selection - Hanya untuk transfer */}
                        {paymentForm.payment_method === 'transfer' && (
                          <div className="space-y-2">
                            <Label htmlFor="companyBank" className="text-sm font-medium">
                              Company Bank Account *
                            </Label>
                            <select
                              id="companyBank"
                              value={paymentForm.company_bank_code}
                              onChange={(e) => updatePaymentForm('company_bank_code', e.target.value)}
                              className="w-full border rounded-md px-3 py-2"
                            >
                              <option value="">Pilih Bank Perusahaan</option>
                              {companyBanks.map(bank => (
                                <option key={bank.account_code} value={bank.account_code}>
                                  {bank.bank_name} - {bank.account_number} ({bank.account_holder})
                                </option>
                              ))}
                            </select>
                            {formErrors.company_bank_code && (
                              <p className="text-red-500 text-xs mt-1">{formErrors.company_bank_code}</p>
                            )}
                          </div>
                        )}

                        {paymentForm.payment_method === 'transfer' && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="bankName" className="text-sm font-medium">
                                Supplier Bank Name *
                              </Label>
                              <select
                                id="bankName"
                                value={paymentForm.bank_name}
                                onChange={(e) => updatePaymentForm('bank_name', e.target.value)}
                                className="w-full border rounded-md px-3 py-2"
                              >
                                <option value="">Pilih Bank Supplier</option>
                                <option value="BCA">BCA</option>
                                <option value="Mandiri">Mandiri</option>
                                <option value="BNI">BNI</option>
                                <option value="BRI">BRI</option>
                              </select>
                              {formErrors.bank_name && (
                                <p className="text-red-500 text-xs mt-1">{formErrors.bank_name}</p>
                              )}
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
                              {formErrors.account_number && (
                                <p className="text-red-500 text-xs mt-1">{formErrors.account_number}</p>
                              )}
                            </div>
                          </>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="paymentDate" className="text-sm font-medium">
                            Payment Date *
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !paymentForm.payment_date && "text-muted-foreground"
                                )}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {paymentForm.payment_date ? format(new Date(paymentForm.payment_date), "PPP") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <CalendarComponent
                                mode="single"
                                selected={paymentForm.payment_date ? new Date(paymentForm.payment_date) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    updatePaymentForm('payment_date', date.toISOString().split('T')[0])
                                  }
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
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
                          {formErrors.reference_number && (
                            <p className="text-red-500 text-xs mt-1">{formErrors.reference_number}</p>
                          )}
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
                          {formErrors.documents && (
                            <p className="text-red-500 text-xs mt-1">{formErrors.documents}</p>
                          )}

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
                        disabled={paymentLoading}
                      >
                        {paymentLoading ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Processing Payment...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-5 w-5 mr-2" />
                            Submit Payment
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PAYMENT DETAILS MODAL */}
        <Dialog open={!!viewingPayment} onOpenChange={() => setViewingPayment(null)}>
          <CustomDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto backdrop-blur-sm bg-white/95">
            <DialogHeader>
              <DialogTitle>Payment Details - {viewingPayment?.payment_code}</DialogTitle>
            </DialogHeader>
            
            {viewingPayment && (
              <div className="space-y-6">
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
                          <span className="font-semibold text-green-600">{formatRupiah(viewingPayment.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Payment Date:</span>
                          <span>{formatDate(viewingPayment.payment_date)}</span>
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

                    {/* Payment Documents */}
                    {viewingPayment.documents && viewingPayment.documents.length > 0 && (
                      <div className="mt-4 p-4 border rounded-lg bg-green-50">
                        <h4 className="font-medium text-green-800 mb-3">Payment Documents</h4>
                        <div className="space-y-2">
                          {viewingPayment.documents.map((doc, index) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 border rounded bg-white">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-green-600" />
                                <div>
                                  <div className="font-medium text-sm">{doc.name}</div>
                                  <div className="text-xs text-gray-500">
                                    Uploaded: {formatDate(doc.upload_date)}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(doc.url, '_blank')}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </CustomDialogContent>
        </Dialog>

        {/* PO DETAILS MODAL */}
        <Dialog open={!!viewingPO} onOpenChange={() => setViewingPO(null)}>
          <CustomDialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto backdrop-blur-sm bg-white/95">
            <DialogHeader>
              <DialogTitle>Purchase Order Details - {viewingPO?.po_code}</DialogTitle>
            </DialogHeader>
            
            {viewingPO && (
              <div className="space-y-6">
                {/* PO Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Purchase Order Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">PO Code:</span>
                          <span className="font-semibold">{viewingPO.po_code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">SO Reference:</span>
                          <span className="font-semibold text-blue-600">{viewingPO.so_reference}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Supplier:</span>
                          <span>{viewingPO.supplier_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Date:</span>
                          <span>{formatDate(viewingPO.date)}</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Total Amount:</span>
                          <span className="font-semibold text-green-600">{formatRupiah(viewingPO.total_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Status:</span>
                          <Badge className={getStatusColor(viewingPO.status)}>
                            {getStatusText(viewingPO.status)}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Priority:</span>
                          <span className="capitalize">{viewingPO.priority}</span>
                        </div>
                        {viewingPO.notes && (
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Notes:</span>
                            <span>{viewingPO.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* PO Items */}
                <Card>
                  <CardHeader>
                    <CardTitle>Items ({viewingPO.items.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">No</TableHead>
                          <TableHead>Product Name</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingPO.items.map((item, index) => (
                          <TableRow key={item.po_item_code}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="font-medium">{item.product_name}</TableCell>
                            <TableCell className="font-mono">{item.product_code}</TableCell>
                            <TableCell>{item.quantity} pcs</TableCell>
                            <TableCell>{item.supplier}</TableCell>
                            <TableCell>{formatRupiah(item.purchase_price)}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatRupiah(item.purchase_price * item.quantity)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Payments */}
                {viewingPO.payments && viewingPO.payments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Payments ({viewingPO.payments.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">No</TableHead>
                            <TableHead>Payment Code</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewingPO.payments.map((payment, index) => (
                            <TableRow key={payment.payment_code}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell className="font-medium">{payment.payment_code}</TableCell>
                              <TableCell>{formatDate(payment.payment_date)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getPaymentMethodIcon(payment.payment_method)}
                                  <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
                                </div>
                              </TableCell>
                              <TableCell>{payment.reference_number}</TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatRupiah(payment.amount)}
                              </TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(payment.status)}>
                                  {payment.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  onClick={() => viewPaymentDetails(payment)}
                                  size="sm"
                                  variant="outline"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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