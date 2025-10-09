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

// Type definitions
interface SalesOrder {
  id: string
  soNumber: string
  date: string
  customerName: string
  customerNumber: string
  status: 'confirmed' | 'processing' | 'completed'
  items: OrderItem[]
  purchaseOrders: PurchaseOrder[]
}

interface OrderItem {
  id: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  subtotal: number
}

interface PurchaseOrder {
  id: string
  poNumber: string
  date: string
  supplier: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'
  items: POItem[]
  totalAmount: number
  payment?: Payment
}

interface POItem {
  id: string
  productName: string
  sku: string
  quantity: number
  supplier: string
  purchasePrice: number
  notes: string
  invoiceFile?: File
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

// Payment Types
interface Payment {
  id: string
  paymentCode: string
  poNumber: string
  soNumber: string
  supplier: string
  amount: number
  paymentDate: string
  paymentMethod: 'transfer' | 'cash' | 'credit_card' | 'other'
  bankName?: string
  accountNumber?: string
  referenceNumber: string
  notes: string
  status: 'pending' | 'paid' | 'failed'
  documents: PaymentDocument[]
  createdAt: string
}

interface PaymentDocument {
  id: string
  name: string
  type: 'invoice' | 'proof'
  file: File
}

interface PaymentFormData {
  poId: string
  paymentMethod: 'transfer' | 'cash' | 'credit_card' | 'other'
  bankName: string
  accountNumber: string
  paymentDate: string
  referenceNumber: string
  notes: string
  documents: PaymentDocument[]
}

export default function PurchaseOrderPage() {
  // State untuk table
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [activeTable, setActiveTable] = useState<'so' | 'po' | 'payment'>('so')

  // State untuk form PO
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [poForms, setPoForms] = useState<POFormData[]>([])
  const fileInputRefs = useRef<{[key: string]: HTMLInputElement}>({})

  // State untuk Payment
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    poId: '',
    paymentMethod: 'transfer',
    bankName: '',
    accountNumber: '',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    notes: '',
    documents: []
  })
  const [payments, setPayments] = useState<Payment[]>([])
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null)
  const paymentFileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Sample data
 // Sample data - UPDATE DENGAN STATUS BERBEDA
const salesOrders: SalesOrder[] = [
  {
    id: '1',
    soNumber: 'SO-2024-001',
    date: '2024-01-15',
    customerName: 'PT. Customer Utama',
    customerNumber: 'CUST-001',
    status: 'confirmed',
    items: [
      { id: '1', productName: 'Laptop Dell XPS 13', sku: 'LP-DLL-XPS-13', quantity: 100, unitPrice: 1200000, subtotal: 120000000 },
      { id: '2', productName: 'Wireless Mouse Logitech', sku: 'ACC-MSE-LOG-01', quantity: 25, unitPrice: 235000, subtotal: 5875000 },
    ],
    purchaseOrders: [
      {
        id: 'po-1',
        poNumber: 'PO-2024-001-01',
        date: '2024-01-20',
        supplier: 'PT. Supplier Elektronik',
        status: 'draft', // ✅ DRAFT - PDF ONLY
        items: [
          {
            id: '1',
            productName: 'Laptop Dell XPS 13',
            sku: 'LP-DLL-XPS-13',
            quantity: 50,
            supplier: 'PT. Supplier Elektronik',
            purchasePrice: 1150000,
            notes: 'Part 1 dari 100 pcs'
          }
        ],
        totalAmount: 57500000
      },
      {
        id: 'po-2',
        poNumber: 'PO-2024-001-02',
        date: '2024-01-21',
        supplier: 'PT. Supplier Elektronik',
        status: 'submitted', // ✅ SUBMITTED - PDF ONLY
        items: [
          {
            id: '2',
            productName: 'Wireless Mouse Logitech',
            sku: 'ACC-MSE-LOG-01',
            quantity: 25,
            supplier: 'PT. Supplier Elektronik',
            purchasePrice: 200000,
            notes: 'Full quantity'
          }
        ],
        totalAmount: 5000000
      },
      {
        id: 'po-3',
        poNumber: 'PO-2024-001-03',
        date: '2024-01-22',
        supplier: 'PT. Supplier Elektronik',
        status: 'approved', // ✅ APPROVED - PAY + PDF
        items: [
          {
            id: '1',
            productName: 'Laptop Dell XPS 13',
            sku: 'LP-DLL-XPS-13',
            quantity: 50,
            supplier: 'PT. Supplier Elektronik',
            purchasePrice: 1150000,
            notes: 'Part 2 dari 100 pcs'
          }
        ],
        totalAmount: 57500000
      }
    ]
  },
  {
    id: '2',
    soNumber: 'SO-2024-002',
    date: '2024-01-16',
    customerName: 'CV. Berkah Abadi',
    customerNumber: 'CUST-002',
    status: 'confirmed',
    items: [
      { id: '3', productName: 'Monitor 24" Samsung', sku: 'MON-24-SAM-FHD', quantity: 80, unitPrice: 3500000, subtotal: 280000000 }
    ],
    purchaseOrders: [
      {
        id: 'po-4',
        poNumber: 'PO-2024-002-01',
        date: '2024-01-22',
        supplier: 'CV. Komputer Mandiri',
        status: 'rejected', // ✅ REJECTED - PDF ONLY
        items: [
          {
            id: '3',
            productName: 'Monitor 24" Samsung',
            sku: 'MON-24-SAM-FHD',
            quantity: 40,
            supplier: 'CV. Komputer Mandiri',
            purchasePrice: 3200000,
            notes: 'Part 1 dari 80 pcs'
          }
        ],
        totalAmount: 128000000
      },
      {
        id: 'po-5',
        poNumber: 'PO-2024-002-02',
        date: '2024-01-23',
        supplier: 'CV. Komputer Mandiri',
        status: 'paid', // ✅ PAID - PDF ONLY
        items: [
          {
            id: '3',
            productName: 'Monitor 24" Samsung',
            sku: 'MON-24-SAM-FHD',
            quantity: 40,
            supplier: 'CV. Komputer Mandiri',
            purchasePrice: 3200000,
            notes: 'Part 2 dari 80 pcs'
          }
        ],
        totalAmount: 128000000,
        payment: {
          id: 'pay-1',
          paymentCode: 'PAY-2024-001',
          poNumber: 'PO-2024-002-02',
          soNumber: 'SO-2024-002',
          supplier: 'CV. Komputer Mandiri',
          amount: 128000000,
          paymentDate: '2024-01-25',
          paymentMethod: 'transfer',
          bankName: 'BCA',
          accountNumber: '1234567890',
          referenceNumber: 'TRF-2024-001',
          notes: 'Pembayaran untuk monitor',
          status: 'paid',
          documents: [],
          createdAt: '2024-01-25T10:30:00Z'
        }
      }
    ]
  },
  {
    id: '3',
    soNumber: 'SO-2024-003',
    date: '2024-01-17',
    customerName: 'PT. Global Teknologi',
    customerNumber: 'CUST-003',
    status: 'processing',
    items: [
      { id: '4', productName: 'Server Rack Cabinet', sku: 'SRV-RACK-42U', quantity: 5, unitPrice: 3500000, subtotal: 17500000 },
    ],
    purchaseOrders: [
      {
        id: 'po-6',
        poNumber: 'PO-2024-003-01',
        date: '2024-01-23',
        supplier: 'PT. Teknologi Server',
        status: 'approved', // ✅ APPROVED - PAY + PDF
        items: [
          {
            id: '4',
            productName: 'Server Rack Cabinet',
            sku: 'SRV-RACK-42U',
            quantity: 5,
            supplier: 'PT. Teknologi Server',
            purchasePrice: 3000000,
            notes: 'Full quantity'
          }
        ],
        totalAmount: 15000000
      }
    ]
  }
]

  const allPOs = salesOrders.flatMap(so => so.purchaseOrders)
  const paidPOs = allPOs.filter(po => po.status === 'paid')
  const payablePOs = allPOs.filter(po => po.status === 'approved' && !po.payment)

  // Filter logic
  const filteredSO = salesOrders.filter(so => {
    const matchesSearch = 
      so.soNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.customerNumber.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || so.status === statusFilter
    const matchesDate = dateFilter === 'all' || so.date === dateFilter
    
    return matchesSearch && matchesStatus && matchesDate
  })

  const filteredPO = allPOs.filter(po => {
    return po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
           po.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const filteredPayments = payments.filter(payment => {
    return payment.paymentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
           payment.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
           payment.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
           payment.soNumber.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const currentData = activeTable === 'so' ? filteredSO : 
                     activeTable === 'po' ? filteredPO : 
                     filteredPayments

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = currentData.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(currentData.length / itemsPerPage)

  // Handlers untuk PO
  const handleCreatePO = (so: SalesOrder) => {
    setSelectedSO(so)
    setShowCreateForm(true)
    setPoForms([])
  }

  const addPOForm = (item: OrderItem) => {
    const newForm: POFormData = {
      id: Date.now().toString(),
      itemId: item.id,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
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
    setPoForms(prev => prev.map(form => 
      form.id === formId ? { ...form, [field]: value } : form
    ))
  }

  const getRemainingQuantity = (itemId: string) => {
    const item = selectedSO?.items.find(item => item.id === itemId)
    if (!item) return 0

    const formsForThisItem = poForms.filter(form => form.itemId === itemId)
    const totalInForms = formsForThisItem.reduce((sum, form) => sum + form.quantity, 0)
    
    return item.quantity - totalInForms
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

  const exportToPDF = (po: PurchaseOrder) => {
    console.log('Exporting PO to PDF:', po.poNumber)
    alert(`Exporting ${po.poNumber} to PDF...`)
  }

  const submitAllPOs = () => {
    if (poForms.length === 0) {
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

      const remaining = getRemainingQuantity(form.itemId)
      if (form.quantity > remaining) {
        alert(`Quantity exceeds remaining quantity for ${form.productName}`)
        return
      }
    }

    // Create POs
    poForms.forEach((form, index) => {
      const sequence = index + 1
      const poNumber = `PO-${selectedSO?.soNumber.split('-').pop()}-${String(sequence).padStart(2, '0')}`
      
      const newPO: PurchaseOrder = {
        id: Date.now().toString() + index,
        poNumber,
        date: new Date().toISOString().split('T')[0],
        supplier: form.supplier,
        status: 'draft',
        items: [{
          id: form.itemId,
          productName: form.productName,
          sku: form.sku,
          quantity: form.quantity,
          supplier: form.supplier,
          purchasePrice: form.purchasePrice,
          notes: form.notes,
          invoiceFile: form.invoiceFile
        }],
        totalAmount: form.purchasePrice * form.quantity
      }

      console.log('Created PO:', newPO)
    })

    alert(`Successfully created ${poForms.length} Purchase Orders!`)
    setPoForms([])
    setShowCreateForm(false)
    setSelectedSO(null)
  }

  // Handlers untuk Payment
  const handleCreatePayment = (po: PurchaseOrder) => {
    // Cek apakah PO approved
    if (po.status !== 'approved') {
      alert('Only approved Purchase Orders can be paid')
      return
    }
    
    setSelectedPO(po)
    setPaymentForm({
      poId: po.id,
      paymentMethod: 'transfer',
      bankName: '',
      accountNumber: '',
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
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

    const newDocuments: PaymentDocument[] = Array.from(files).map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      type: file.name.toLowerCase().includes('invoice') ? 'invoice' : 'proof',
      file: file
    }))

    setPaymentForm(prev => ({
      ...prev,
      documents: [...prev.documents, ...newDocuments]
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

    const newDocuments: PaymentDocument[] = Array.from(files).map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      type: file.name.toLowerCase().includes('invoice') ? 'invoice' : 'proof',
      file: file
    }))

    setPaymentForm(prev => ({
      ...prev,
      documents: [...prev.documents, ...newDocuments]
    }))
  }

  const removePaymentDocument = (docId: string) => {
    setPaymentForm(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== docId)
    }))
  }

  const generatePaymentCode = () => {
    const timestamp = new Date().getTime()
    const random = Math.floor(Math.random() * 1000)
    return `PAY-${timestamp}-${random}`
  }

  const submitPayment = () => {
    if (!selectedPO) return

    // Validation
    if (paymentForm.paymentMethod === 'transfer' && (!paymentForm.bankName || !paymentForm.accountNumber)) {
      alert('Please select bank and enter account number for transfer payment')
      return
    }

    if (!paymentForm.referenceNumber.trim()) {
      alert('Please enter reference number')
      return
    }

    if (paymentForm.documents.length === 0) {
      alert('Please upload at least one payment document')
      return
    }

    const newPayment: Payment = {
      id: Date.now().toString(),
      paymentCode: generatePaymentCode(),
      poNumber: selectedPO.poNumber,
      soNumber: salesOrders.find(so => so.purchaseOrders.some(po => po.id === selectedPO.id))?.soNumber || '',
      supplier: selectedPO.supplier,
      amount: selectedPO.totalAmount,
      paymentDate: paymentForm.paymentDate,
      paymentMethod: paymentForm.paymentMethod,
      bankName: paymentForm.paymentMethod === 'transfer' ? paymentForm.bankName : undefined,
      accountNumber: paymentForm.paymentMethod === 'transfer' ? paymentForm.accountNumber : undefined,
      referenceNumber: paymentForm.referenceNumber,
      notes: paymentForm.notes,
      status: 'paid',
      documents: paymentForm.documents,
      createdAt: new Date().toISOString()
    }

    // Add to payments list
    setPayments(prev => [...prev, newPayment])

    // Update PO status to paid
    const updatedPOs = allPOs.map(po => 
      po.id === selectedPO.id ? { ...po, status: 'paid', payment: newPayment } : po
    )

    alert(`Payment ${newPayment.paymentCode} created successfully!`)
    setShowPaymentForm(false)
    setSelectedPO(null)
    setPaymentForm({
      poId: '',
      paymentMethod: 'transfer',
      bankName: '',
      accountNumber: '',
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      notes: '',
      documents: []
    })
  }

  const viewPaymentDetails = (payment: Payment) => {
    setViewingPayment(payment)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-purple-100 text-purple-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
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
    // Reset semua form dan state ketika ganti tab
    setSelectedSO(null)
    setPoForms([])
    setShowCreateForm(false)
    setSelectedPO(null)
    setShowPaymentForm(false)
    setViewingPayment(null)
    setPaymentForm({
      poId: '',
      paymentMethod: 'transfer',
      bankName: '',
      accountNumber: '',
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      notes: '',
      documents: []
    })
  }, [activeTable])

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
                    activeTable === 'so' ? "Search SO number or customer..." :
                    activeTable === 'po' ? "Search PO number or supplier..." :
                    "Search payment code or PO number..."
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
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                  </>
                ) : activeTable === 'po' ? (
                  <>
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="paid">Paid</option>
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
                {Array.from(new Set(salesOrders.map(so => so.date))).map(date => (
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
                      <TableHead>SO Number</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>PO Count</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  ) : activeTable === 'po' ? (
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>SO Reference</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableHead>Payment Code</TableHead>
                      <TableHead>PO Number</TableHead>
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
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        {activeTable === 'so' ? (
                          <>
                            <TableCell className="font-semibold">{(item as SalesOrder).soNumber}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{(item as SalesOrder).customerName}</div>
                                <div className="text-sm text-gray-500">{(item as SalesOrder).customerNumber}</div>
                              </div>
                            </TableCell>
                            <TableCell>{(item as SalesOrder).date}</TableCell>
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
                              <Badge variant={(item as SalesOrder).purchaseOrders.length > 0 ? "default" : "secondary"}>
                                {(item as SalesOrder).purchaseOrders.length} PO
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                onClick={() => handleCreatePO(item as SalesOrder)}
                                size="sm"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Create PO
                              </Button>
                            </TableCell>
                          </>
                        ) : activeTable === 'po' ? (
                          <>
                            <TableCell className="font-semibold">{(item as PurchaseOrder).poNumber}</TableCell>
                            <TableCell>{(item as PurchaseOrder).supplier}</TableCell>
                            <TableCell className="text-blue-600">
                              {salesOrders.find(so => so.purchaseOrders.some(p => p.id === (item as PurchaseOrder).id))?.soNumber || '-'}
                            </TableCell>
                            <TableCell>{(item as PurchaseOrder).date}</TableCell>
                            <TableCell>{(item as PurchaseOrder).items.length} items</TableCell>
                            <TableCell className="font-semibold">
                              Rp {(item as PurchaseOrder).totalAmount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor((item as PurchaseOrder).status)}>
                                {(item as PurchaseOrder).status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                {/* HANYA TAMPIL JIKA PO APPROVED DAN BELUM PAID */}
                                {(item as PurchaseOrder).status === 'approved' && !(item as PurchaseOrder).payment && (
                                  <Button 
                                    onClick={() => handleCreatePayment(item as PurchaseOrder)}
                                    size="sm"
                                  >
                                    <CreditCard className="h-4 w-4 mr-1" />
                                    Pay
                                  </Button>
                                )}
                                <Button 
                                  onClick={() => exportToPDF(item as PurchaseOrder)}
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
                            <TableCell className="font-semibold">{(item as Payment).paymentCode}</TableCell>
                            <TableCell className="font-semibold">{(item as Payment).poNumber}</TableCell>
                            <TableCell className="text-blue-600">{(item as Payment).soNumber}</TableCell>
                            <TableCell>{(item as Payment).supplier}</TableCell>
                            <TableCell className="font-semibold">
                              Rp {(item as Payment).amount.toLocaleString()}
                            </TableCell>
                            <TableCell>{(item as Payment).paymentDate}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getPaymentMethodIcon((item as Payment).paymentMethod)}
                                <span className="capitalize">{(item as Payment).paymentMethod.replace('_', ' ')}</span>
                                {(item as Payment).bankName && (
                                  <span className="text-xs text-gray-500">({(item as Payment).bankName})</span>
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
                          activeTable === 'po' ? 8 : 
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
                  Create New Purchase Order - {selectedSO.soNumber}
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
                          <TableHead>Quantity</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSO.items.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="font-semibold">{item.productName}</TableCell>
                            <TableCell className="font-mono">{item.sku}</TableCell>
                            <TableCell>{item.quantity} pcs</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                onClick={() => addPOForm(item)}
                                size="sm"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add PO Form
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
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
                          const item = selectedSO.items.find(item => item.id === form.itemId)
                          if (!item) return null

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
                                  max={item.quantity}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Remaining: {getRemainingQuantity(form.itemId)} pcs
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

                              {/* Invoice Upload Section - SUPER SIMPLE */}
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
                                      ref={el => fileInputRefs.current[form.id] = el!}
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
                  Create Payment - {selectedPO.poNumber}
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
                        <Label className="text-sm font-medium">PO Number</Label>
                        <div className="p-2 bg-gray-50 rounded border font-semibold">
                          {selectedPO.poNumber}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Supplier</Label>
                        <div className="p-2 bg-gray-50 rounded border">
                          {selectedPO.supplier}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Total Amount</Label>
                        <div className="p-2 bg-gray-50 rounded border font-semibold text-green-600">
                          Rp {selectedPO.totalAmount.toLocaleString()}
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
                            value={paymentForm.paymentMethod}
                            onChange={(e) => updatePaymentForm('paymentMethod', e.target.value)}
                            className="w-full border rounded-md px-3 py-2"
                          >
                            <option value="transfer">Transfer Bank</option>
                            <option value="cash">Cash</option>
                            <option value="credit_card">Kartu Kredit</option>
                            <option value="other">Lainnya</option>
                          </select>
                        </div>

                        {paymentForm.paymentMethod === 'transfer' && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="bankName" className="text-sm font-medium">
                                Bank Name *
                              </Label>
                              <select
                                id="bankName"
                                value={paymentForm.bankName}
                                onChange={(e) => updatePaymentForm('bankName', e.target.value)}
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
                                value={paymentForm.accountNumber}
                                onChange={(e) => updatePaymentForm('accountNumber', e.target.value)}
                                placeholder="Masukkan nomor rekening supplier"
                              />
                            </div>
                              <div className="space-y-2">
                              <Label htmlFor="accountNumber" className="text-sm font-medium">
                                Nomor Bank Name upplier*
                              </Label>
                              <Input
                                id="accountNumber"
                                value={paymentForm.accountNumber}
                                onChange={(e) => updatePaymentForm('accountNumber', e.target.value)}
                                placeholder="Masukkan bank name supplier"
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
                            value={paymentForm.paymentDate}
                            onChange={(e) => updatePaymentForm('paymentDate', e.target.value)}
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
                            value={paymentForm.referenceNumber}
                            onChange={(e) => updatePaymentForm('referenceNumber', e.target.value)}
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

                        {/* Document Upload - CENTERED & IMPROVED */}
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
                                Upload invoice dan bukti transfer
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
                              {paymentForm.documents.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-green-600" />
                                    <div>
                                      <div className="font-medium text-sm">{doc.name}</div>
                                      <div className="text-xs text-gray-500 capitalize">{doc.type} • {(doc.file.size / 1024 / 1024).toFixed(2)} MB</div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      removePaymentDocument(doc.id)
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
                        disabled={!paymentForm.referenceNumber.trim() || paymentForm.documents.length === 0}
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
                <h3 className="text-lg font-semibold">Payment Details - {viewingPayment.paymentCode}</h3>
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
                          <span className="font-semibold">{viewingPayment.paymentCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">PO Number:</span>
                          <span className="font-semibold">{viewingPayment.poNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">SO Reference:</span>
                          <span className="font-semibold">{viewingPayment.soNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Supplier:</span>
                          <span>{viewingPayment.supplier}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Amount:</span>
                          <span className="font-semibold text-green-600">Rp {viewingPayment.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Payment Date:</span>
                          <span>{viewingPayment.paymentDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Payment Method:</span>
                          <span className="capitalize">{viewingPayment.paymentMethod.replace('_', ' ')}</span>
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
                    {viewingPayment.paymentMethod === 'transfer' && viewingPayment.bankName && (
                      <div className="mt-4 p-4 border rounded-lg bg-blue-50">
                        <h4 className="font-medium text-blue-800 mb-2">Bank Transfer Details</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span>Bank Name:</span>
                          <span className="font-medium">{viewingPayment.bankName}</span>
                          <span>Account Number:</span>
                          <span className="font-medium">{viewingPayment.accountNumber}</span>
                        </div>
                      </div>
                    )}

                    {/* Reference Number */}
                    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                      <h4 className="font-medium mb-2">Reference Information</h4>
                      <div className="text-sm">
                        <span className="font-medium">Reference Number: </span>
                        <span>{viewingPayment.referenceNumber}</span>
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

                {/* Payment Documents */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {viewingPayment.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <div>
                              <div className="font-medium">{doc.name}</div>
                              <div className="text-sm text-gray-500 capitalize">{doc.type}</div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Simulate document download
                              const url = URL.createObjectURL(doc.file)
                              const link = document.createElement('a')
                              link.href = url
                              link.download = doc.name
                              link.click()
                              URL.revokeObjectURL(url)
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Payment History */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>{viewingPayment.createdAt.split('T')[0]}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(viewingPayment.status)}>
                              {viewingPayment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>Payment created and processed</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
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