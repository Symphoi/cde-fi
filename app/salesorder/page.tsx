// app/salesorder/page.tsx
'use client'

import { useState, useRef , useEffect} from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Search, Plus, FileText, Eye, Upload, Trash2, ChevronDown, ChevronUp, Download, MapPin, Building, Phone, Mail, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CustomDialogContent
} from "@/components/custom-dialog"

// Type definitions
interface SalesOrder {
  id: string
  soNumber: string
  date: string
  customerName: string
  customerPhone: string
  customerEmail: string
  customerCompany: string
  billingAddress: string
  shippingAddress: string
  salesRep: string
  salesRepEmail: string
  salesOrderDoc: string
  totalAmount: number
  status: 'draft' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  items: OrderItem[]
  taxes: Tax[]
  attachments: Attachment[]
  notes: string
}

interface OrderItem {
  id: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  subtotal: number
}

interface Tax {
  id: string
  name: string
  rate: number
  amount: number
}

interface Attachment {
  id: string
  name: string
  type: 'sales_order' | 'other'
  uploadDate: string
  size: string
}

interface Document {
  id: string
  name: string
  file: File
  type: 'sales_order' | 'other'
}

export default function Page() {
  // Refs untuk file input
  const salesOrderFileRef = useRef<HTMLInputElement>(null)
  const otherFilesRef = useRef<HTMLInputElement>(null)
  
  // State untuk toggle form
  const [showCreateForm, setShowCreateForm] = useState(true)
  
  // State untuk modal detail
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // State untuk pagination dan filter
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')

  // State untuk form SO baru
  const [newSO, setNewSO] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    billingAddress: '',
    shippingAddress: '',
    salesRep: '',
    salesOrderDoc: '',
    totalAmount: 0,
    taxIncluded: false,
    shippingCost: 0,
    items: [] as OrderItem[],
    taxes: [] as Tax[],
    documents: [] as Document[],
  })

  // State untuk multiple item forms
  const [itemForms, setItemForms] = useState<OrderItem[]>([
    {
      id: '1',
      productName: '',
      sku: '',
      quantity: 1,
      unitPrice: 0,
      subtotal: 0
    }
  ])

  // State untuk project
  const [projects, setProjects] = useState<{id: number, name: string}[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Ambil daftar project
  useEffect(() => {
    // Contoh sementara dengan data mock
    const mockProjects = [
      {id: 1, name: 'Project Alpha'},
      {id: 2, name: 'Project Beta'},
      {id: 3, name: 'Project Gamma'},
    ];
    setProjects(mockProjects);
  }, []);

  // State untuk taxes
  const [taxRates] = useState([
    { id: '1', name: 'PPN', rate: 0, amount: 0 },
    { id: '2', name: 'PPH', rate: 0, amount: 0 },
    { id: '3', name: 'Sales Tax', rate: 0, amount: 0 }
  ])

  // Data sample SO sebelumnya dengan data lengkap
  const previousSO: SalesOrder[] = [
    {
      id: '1',
      soNumber: 'SO-2024-001',
      date: '2024-01-15',
      customerName: 'PT. Customer Maju',
      customerPhone: '+62 21 1234 5678',
      customerEmail: 'contact@customermaju.com',
      customerCompany: 'PT. Customer Maju Indonesia',
      billingAddress: 'Jl. Sudirman No. 123, Jakarta Selatan 12190, Indonesia',
      shippingAddress: 'Jl. Sudirman No. 123, Jakarta Selatan 12190, Indonesia',
      salesRep: 'Budi Santoso',
      salesRepEmail: 'budi.santoso@company.com',
      salesOrderDoc: 'SO-CLIENT-001',
      totalAmount: 2870000,
      status: 'delivered',
      items: [
        { id: '1', productName: 'Laptop Dell XPS 13', sku: 'LP-DLL-XPS-13', quantity: 2, unitPrice: 1200000, subtotal: 2400000 },
        { id: '2', productName: 'Wireless Mouse', sku: 'ACC-MSE-WRL-01', quantity: 2, unitPrice: 150000, subtotal: 300000 }
      ],
      taxes: [
        { id: '1', name: 'VAT', rate: 10, amount: 270000 },
        { id: '2', name: 'Sales Tax', rate: 5, amount: 135000 }
      ],
      attachments: [
        { id: '1', name: 'sales_order_client.pdf', type: 'sales_order', uploadDate: '2024-01-14', size: '2.4 MB' },
        { id: '2', name: 'quotation_approved.pdf', type: 'other', uploadDate: '2024-01-14', size: '1.8 MB' },
        { id: '3', name: 'payment_terms.docx', type: 'other', uploadDate: '2024-01-14', size: '0.8 MB' },
        { id: '4', name: 'technical_specifications.pdf', type: 'other', uploadDate: '2024-01-13', size: '3.2 MB' }
      ],
      notes: 'Priority shipping requested. Customer will provide shipping label.'
    },
    {
      id: '2',
      soNumber: 'SO-2024-002',
      date: '2024-01-16',
      customerName: 'CV. Berkah Jaya',
      customerPhone: '+62 22 8765 4321',
      customerEmail: 'info@berkahjaya.com',
      customerCompany: 'CV. Berkah Jaya',
      billingAddress: 'Jl. Merdeka No. 45, Bandung 40115, Indonesia',
      shippingAddress: 'Gudang Utama, Jl. Industri No. 78, Bandung 40235, Indonesia',
      salesRep: 'Sari Dewi',
      salesRepEmail: 'sari.dewi@company.com',
      salesOrderDoc: 'SO-CLIENT-002',
      totalAmount: 1925000,
      status: 'confirmed',
      items: [
        { id: '1', productName: 'Monitor 24" Samsung', sku: 'MON-24-SAM-FHD', quantity: 5, unitPrice: 350000, subtotal: 1750000 }
      ],
      taxes: [
        { id: '1', name: 'VAT', rate: 10, amount: 175000 }
      ],
      attachments: [
        { id: '1', name: 'purchase_order_002.pdf', type: 'sales_order', uploadDate: '2024-01-15', size: '1.5 MB' },
        { id: '2', name: 'technical_spec.pdf', type: 'other', uploadDate: '2024-01-15', size: '2.1 MB' }
      ],
      notes: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc sit amet mollis nunc. Cras est ligula, efficitur id condimentum eu, laoreet nec odio. Etiam pellentesque ex vel nibh ultrices, sit amet luctus dolor commodo. Praesent aliquam neque quis augue convallis consequat. Fusce id finibus justo, vitae euismod nibh. Vestibulum convallis urna fringilla arcu efficitur, at ornare urna tempus. Phasellus tempus eleifend nibh, venenatis auctor odio rhoncus ut. Etiam porta bibendum hendrerit. Aliquam semper leo vitae mauris rutrum, eu porta odio efficitur. Etiam ac scelerisque tortor. Mauris laoreet, lorem vel tristique malesuada, ligula ligula varius est, quis efficitur quam lorem vel metus. Ut fermentum fermentum massa. Suspendisse potenti.'
    },
    {
      id: '3',
      soNumber: 'SO-2024-003',
      date: '2024-01-17',
      customerName: 'PT. Global Teknologi',
      customerPhone: '+62 31 9876 5432',
      customerEmail: 'sales@globalteknologi.com',
      customerCompany: 'PT. Global Teknologi Indonesia',
      billingAddress: 'Jl. Teknologi No. 88, Surabaya 60111, Indonesia',
      shippingAddress: 'Jl. Teknologi No. 88, Surabaya 60111, Indonesia',
      salesRep: 'Ahmad Wijaya',
      salesRepEmail: 'ahmad.wijaya@company.com',
      salesOrderDoc: 'SO-CLIENT-003',
      totalAmount: 4500000,
      status: 'shipped',
      items: [
        { id: '1', productName: 'Server Rack Cabinet', sku: 'SRV-RACK-42U', quantity: 1, unitPrice: 3500000, subtotal: 3500000 },
        { id: '2', productName: 'Network Switch 48 Port', sku: 'NET-SW-48P', quantity: 2, unitPrice: 500000, subtotal: 1000000 }
      ],
      taxes: [
        { id: '1', name: 'VAT', rate: 11, amount: 495000 }
      ],
      attachments: [
        { id: '1', name: 'purchase_order_003.pdf', type: 'sales_order', uploadDate: '2024-01-16', size: '1.2 MB' }
      ],
      notes: 'Installation service included.'
    },
    {
      id: '4',
      soNumber: 'SO-2024-004',
      date: '2024-01-18',
      customerName: 'CV. Mandiri Sejahtera',
      customerPhone: '+62 361 2345 6789',
      customerEmail: 'order@mandirisejahtera.com',
      customerCompany: 'CV. Mandiri Sejahtera',
      billingAddress: 'Jl. Raya Denpasar No. 123, Bali 80222, Indonesia',
      shippingAddress: 'Jl. Raya Denpasar No. 123, Bali 80222, Indonesia',
      salesRep: 'Putu Sari',
      salesRepEmail: 'putu.sari@company.com',
      salesOrderDoc: 'SO-CLIENT-004',
      totalAmount: 1250000,
      status: 'draft',
      items: [
        { id: '1', productName: 'Office Chair Executive', sku: 'FUR-CHR-EXEC', quantity: 5, unitPrice: 250000, subtotal: 1250000 }
      ],
      taxes: [
        { id: '1', name: 'VAT', rate: 11, amount: 137500 }
      ],
      attachments: [],
      notes: 'Waiting for client confirmation.'
    },
    {
      id: '5',
      soNumber: 'SO-2024-005',
      date: '2024-01-19',
      customerName: 'PT. Bangun Nusantara',
      customerPhone: '+62 251 3456 7890',
      customerEmail: 'procurement@bangunnusantara.com',
      customerCompany: 'PT. Bangun Nusantara',
      billingAddress: 'Jl. Konstruksi No. 45, Bogor 16152, Indonesia',
      shippingAddress: 'Site Office, Jl. Proyek No. 12, Bogor 16153, Indonesia',
      salesRep: 'Rina Hartati',
      salesRepEmail: 'rina.hartati@company.com',
      salesOrderDoc: 'SO-CLIENT-005',
      totalAmount: 8750000,
      status: 'cancelled',
      items: [
        { id: '1', productName: 'Construction Materials Package', sku: 'CON-MAT-PKG1', quantity: 1, unitPrice: 8750000, subtotal: 8750000 }
      ],
      taxes: [
        { id: '1', name: 'VAT', rate: 11, amount: 962500 }
      ],
      attachments: [
        { id: '1', name: 'cancellation_notice.pdf', type: 'other', uploadDate: '2024-01-18', size: '0.5 MB' }
      ],
      notes: 'Order cancelled due to budget constraints.'
    }
  ]

  // Filter logic
  const filteredSO = previousSO.filter(so => {
    const matchesSearch = 
      so.soNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.customerPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || so.status === statusFilter
    const matchesDate = dateFilter === 'all' || so.date === dateFilter
    
    return matchesSearch && matchesStatus && matchesDate
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

  // Calculate tax rate based on amount and total
  const calculateTaxRate = (amount: number, total: number) => {
    if (total === 0 || amount === 0) return 0
    return (amount / total) * 100
  }

  // Update item form field
  const updateItemForm = (id: string, field: keyof OrderItem, value: string | number) => {
    setItemForms(prev => prev.map(form => {
      if (form.id === id) {
        return { ...form, [field]: value }
      }
      return form
    }))
  }

  // Add new item form
  const addItemForm = () => {
    const newId = (itemForms.length + 1).toString()
    setItemForms(prev => [...prev, {
      id: newId,
      productName: '',
      sku: '',
      quantity: 1,
      unitPrice: 0,
      subtotal: 0
    }])
  }

  // Remove item form
  const removeItemForm = (id: string) => {
    if (itemForms.length > 1) {
      setItemForms(prev => prev.filter(form => form.id !== id))
    }
  }

  // Update tax amount
  const updateTaxAmount = (taxId: string, amount: number) => {
    const rate = calculateTaxRate(amount, newSO.totalAmount)
    const updatedTaxes = newSO.taxes.map(tax => 
      tax.id === taxId ? { ...tax, amount, rate: Math.round(rate * 100) / 100 } : tax
    )
    setNewSO(prev => ({ ...prev, taxes: updatedTaxes }))
  }

  // Update total amount
  const updateTotalAmount = (amount: number) => {
    setNewSO(prev => {
      const updatedTaxes = prev.taxes.map(tax => {
        const newRate = calculateTaxRate(tax.amount, amount)
        return { ...tax, rate: Math.round(newRate * 100) / 100 }
      })
      return { ...prev, totalAmount: amount, taxes: updatedTaxes }
    })
  }

  // Handlers
  const handleTaxToggle = (checked: boolean) => {
    setNewSO(prev => ({ ...prev, taxIncluded: checked }))
  }

  const toggleTax = (taxId: string) => {
    if (newSO.taxes.find(tax => tax.id === taxId)) {
      setNewSO(prev => ({
        ...prev,
        taxes: prev.taxes.filter(tax => tax.id !== taxId)
      }))
    } else {
      const tax = taxRates.find(t => t.id === taxId)
      if (tax) {
        setNewSO(prev => ({
          ...prev,
          taxes: [...prev.taxes, { ...tax, amount: 0, rate: 0 }]
        }))
      }
    }
  }

  const handleSalesOrderUpload = () => {
    salesOrderFileRef.current?.click()
  }

  const handleSalesOrderFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const document: Document = {
        id: Date.now().toString(),
        name: file.name,
        file: file,
        type: 'sales_order'
      }
      setNewSO(prev => ({ 
        ...prev, 
        documents: [...prev.documents.filter(d => d.type !== 'sales_order'), document] 
      }))
    }
  }

  const handleOtherDocumentsUpload = () => {
    otherFilesRef.current?.click()
  }

  const handleOtherFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newDocuments = Array.from(files).map(file => ({
        id: Date.now().toString() + Math.random(),
        name: file.name,
        file: file,
        type: 'other' as const
      }))
      setNewSO(prev => ({ 
        ...prev, 
        documents: [...prev.documents, ...newDocuments] 
      }))
    }
  }

  const removeDocument = (docId: string) => {
    setNewSO(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== docId)
    }))
  }

  const submitSO = () => {
    // Validasi customer data
    if (!newSO.customerName || !newSO.customerPhone || !newSO.totalAmount) {
      alert('Please fill all required fields: Customer Name, Customer Phone, and Total Amount')
      return
    }

    // Validasi items
    const validItems = itemForms.filter(form => 
      form.productName && form.sku && form.quantity > 0 && form.unitPrice > 0 && form.subtotal > 0
    )
    
    if (validItems.length === 0) {
      alert('Please fill at least one item form completely')
      return
    }

    // Simpan items ke state
    setNewSO(prev => ({
      ...prev,
      items: validItems
    }))

    // Handle SO submission
    console.log('Submitting SO:', { ...newSO, project_id: selectedProjectId, items: validItems })
    alert(`Sales Order Created Successfully for Project ID: ${selectedProjectId || 'None'} with ${validItems.length} items!`)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      confirmed: 'bg-blue-100 text-blue-800',
      shipped: 'bg-yellow-100 text-yellow-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.draft
  }

  const viewDetail = (so: SalesOrder) => {
    setSelectedSO(so)
    setShowDetailModal(true)
  }

  const downloadAttachment = (attachment: Attachment) => {
    // Simulasi download
    console.log('Downloading:', attachment.name)
    alert(`Downloading ${attachment.name}`)
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
    <div className="min-h-screen min-w-fit  ">
      <div className="max-w-full mx-auto space-y-6 ">

        {/* Previous Sales Orders - Full Width Table */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Previous Sales Orders
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
                  <option value="draft">Draft</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
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
                  {Array.from(new Set(previousSO.map(so => so.date))).map(date => (
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
                        
                      </button>
                    </Badge>
                  )}
                </div>
              </div>
            )}

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
                      <TableRow key={so.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{so.soNumber}</TableCell>
                        <TableCell>{so.date}</TableCell>
                        <TableCell>{so.customerName}</TableCell>
                        <TableCell>{so.customerPhone}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(so.status)}>
                            {so.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          Rp {so.totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => viewDetail(so)}
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
                          <p>No sales orders found matching your filters.</p>
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
            {filteredSO.length > 0 && <Pagination />}
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
                      value={newSO.customerName}
                      onChange={(e) => setNewSO(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Customer Phone *</Label>
                    <Input
                      id="customerPhone"
                      value={newSO.customerPhone}
                      onChange={(e) => setNewSO(prev => ({ ...prev, customerPhone: e.target.value }))}
                      placeholder="Enter customer phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">Customer Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={newSO.customerEmail}
                      onChange={(e) => setNewSO(prev => ({ ...prev, customerEmail: e.target.value }))}
                      placeholder="customer@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salesRep">Sales Representative</Label>
                    <Input
                      id="salesRep"
                      value={newSO.salesRep}
                      onChange={(e) => setNewSO(prev => ({ ...prev, salesRep: e.target.value }))}
                      placeholder="Sales person name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalAmount">Total Amount *</Label>
                    <Input
                      id="totalAmount"
                      type="number"
                      value={newSO.totalAmount || ''}
                      onChange={(e) => updateTotalAmount(parseInt(e.target.value) || 0)}
                      placeholder="Enter total amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salesOrderDoc"> No SO (From Client)</Label>
                    <Input
                      id="salesOrderDoc"
                      value={newSO.salesOrderDoc}
                      onChange={(e) => setNewSO(prev => ({ ...prev, salesOrderDoc: e.target.value }))}
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
                      value={newSO.billingAddress}
                      onChange={(e) => setNewSO(prev => ({ ...prev, billingAddress: e.target.value }))}
                      placeholder="Billing address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shippingAddress">Shipping Address</Label>
                    <Input
                      id="shippingAddress"
                      value={newSO.shippingAddress}
                      onChange={(e) => setNewSO(prev => ({ ...prev, shippingAddress: e.target.value }))}
                      placeholder="Shipping address"
                    />
                  </div>
                </div>

                {/* Tax Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="tax-included" className="font-semibold">
                        Tax Included
                      </Label>
                      <Switch
                        id="tax-included"
                        checked={newSO.taxIncluded}
                        onCheckedChange={handleTaxToggle}
                      />
                    </div>

                    {newSO.taxIncluded && (
                      <div className="space-y-3">
                        {taxRates.map((tax) => (
                          <div key={tax.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3 flex-1">
                              <Switch
                                checked={!!newSO.taxes.find(t => t.id === tax.id)}
                                onCheckedChange={() => toggleTax(tax.id)}
                              />
                              <div className="flex-1">
                                <div className="font-medium">{tax.name}</div>
                                {newSO.taxes.find(t => t.id === tax.id) && (
                                  <div className="text-sm text-gray-500">
                                    {newSO.taxes.find(t => t.id === tax.id)?.rate.toFixed(2)}%
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="w-32">
                              <Input
                                type="number"
                                value={newSO.taxes.find(t => t.id === tax.id)?.amount || ''}
                                onChange={(e) => updateTaxAmount(tax.id, parseInt(e.target.value) || 0)}
                                placeholder="Amount"
                                disabled={!newSO.taxes.find(t => t.id === tax.id)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  
                </div>

                {/* Product Items Section - MULTIPLE FORMS DALAM 1 CARD */}
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
                  {/* // Dalam Product Items Section - dengan nomor form */}
                 {/* // Dalam Product Items Section - nomor di garis card */}
                  <div className="space-y-4">
                    {itemForms.map((form, index) => (
                      <div key={form.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 p-4 border rounded-lg relative">
                        {/* Nomor Form di garis card kiri atas */}
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
                            value={form.productName}
                            onChange={(e) => updateItemForm(form.id, 'productName', e.target.value)}
                            placeholder="Enter product name"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm">SKU</Label>
                          <Input
                            value={form.sku}
                            onChange={(e) => updateItemForm(form.id, 'sku', e.target.value)}
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
                            value={form.unitPrice || ''}
                            onChange={(e) => updateItemForm(form.id, 'unitPrice', parseInt(e.target.value) || 0)}
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
                          onClick={handleSalesOrderUpload}
                          className="cursor-pointer"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Sales Order Document
                        </Button>
                        <input
                          ref={salesOrderFileRef}
                          type="file"
                          className="hidden"
                          onChange={handleSalesOrderFileChange}
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
                        />
                        <p className="text-xs text-gray-500 text-center">Only 1 file allowed</p>
                      </div>
                      {newSO.documents.filter(d => d.type === 'sales_order').map(doc => (
                        <div key={doc.id} className="flex items-center justify-between mt-3 p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">{doc.name}</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeDocument(doc.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
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
                          onClick={handleOtherDocumentsUpload}
                          className="cursor-pointer"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Other Documents
                        </Button>
                        <input
                          ref={otherFilesRef}
                          type="file"
                          className="hidden"
                          onChange={handleOtherFilesChange}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                          multiple
                        />
                        <p className="text-xs text-gray-500 text-center">Multiple files allowed</p>
                      </div>
                      <div className="mt-3 space-y-2">
                        {newSO.documents.filter(d => d.type === 'other').map(doc => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">{doc.name}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeDocument(doc.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="w-full ">
                  <Button onClick={submitSO} size="lg" className="w-full">
                    Create Sales Order
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Detail Modal - LEBIH BESAR DAN DETAIL */}
       {/* // Detail Modal - proportional items & auto width */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <CustomDialogContent className="w-[90vw] max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">  
          
          <div className=" md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border">
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <FileText className="h-6 w-6" />
                      Sales Order Details - {selectedSO?.soNumber}  #{selectedSO?.status}
                      
                        {/* <Badge className={getStatusColor(selectedSO?.status)}>
                              {selectedSO?.status}
                            </Badge> */}
              {/* <Badge ></Badge> */}
            </DialogTitle>
          </div>
        </DialogHeader>
        {selectedSO && (
          <div className="space-y-6 min-w-0">
            {/* Header Info */}

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
                      <p className="text-gray-900 truncate">{selectedSO.customerName}</p>
                    </div>
                    <div className="min-w-0">
                      <Label className="font-semibold text-sm">Customer Phone</Label>
                      <p className="text-gray-900 truncate">{selectedSO.customerPhone}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                    <div className="min-w-0">
                      <Label className="font-semibold text-sm">Company</Label>
                      <p className="text-gray-900 truncate">{selectedSO.customerCompany}</p>
                    </div>
                    <div className="min-w-0">
                      <Label className="font-semibold text-sm">Sales Order Doc</Label>
                      <p className="text-gray-900 truncate">{selectedSO.salesOrderDoc}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                    <div className="min-w-0">
                      <Label className="font-semibold text-sm flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                      <p className="text-gray-900 truncate">{selectedSO.customerEmail}</p>
                    </div>
                    <div className="min-w-0">
                      <Label className="font-semibold text-sm flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone
                      </Label>
                      <p className="text-gray-900 truncate">{selectedSO.customerPhone}</p>
                    </div>
                  </div>
                  <div className="md:grid-cols-2 gap-4 min-w-0">
                    <div className="min-w-0">
                      <Label className="font-semibold text-sm flex items-center gap-2">
                        {/* <StickyNote className="h-4 w-4" /> */}
                        Notes
                      </Label>
                      <p className="text-gray-900 truncate">{selectedSO.notes}</p>
                    </div>
                  </div>
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
                    <p className="text-gray-900 text-sm leading-relaxed break-words">{selectedSO.billingAddress}</p>
                  </div>
                  <div className="min-w-0">
                    <Label className="font-semibold text-sm">Shipping Address</Label>
                    <p className="text-gray-900 text-sm leading-relaxed break-words">{selectedSO.shippingAddress}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Items (3/4) and Summary (1/4) */}
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
                            <TableRow key={item.id}>
                              <TableCell className="font-medium truncate max-w-[280px]">{item.productName}</TableCell>
                              <TableCell className="text-gray-600 truncate">{item.sku}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>Rp {item.unitPrice.toLocaleString()}</TableCell>
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
                        <div key={tax.id} className="flex justify-between items-center py-2 border-b min-w-0">
                          <div className="min-w-0">
                            <span className="font-medium truncate">{tax.name}</span>
                            <span className="text-sm text-gray-500 ml-2">({tax.rate}%)</span>
                          </div>
                          <span className="font-semibold whitespace-nowrap">Rp {tax.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="border-t pt-3 min-w-0">
                        <div className="flex justify-between items-center font-bold text-lg min-w-0">
                          <span>Grand Total</span>
                          <span className="text-blue-600 whitespace-nowrap">Rp {selectedSO.totalAmount.toLocaleString()}</span>
                        </div>
        {/* 
                {selectedSO.notes && (
                  <Card className="min-w-0">
                    <CardHeader className="pb-4">
                      <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="min-w-0">
                      <p className="text-sm text-gray-700 leading-relaxed break-words">{selectedSO.notes}</p>
                    </CardContent>
                  </Card>
                )} */}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Attachments */}
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
                            <span className={attachment.type === 'sales_order' ? 'text-blue-600' : 'text-gray-600'}>
                              {attachment.type === 'sales_order' ? 'Sales Order' : 'Other'}
                            </span>
                            <span>•</span>
                            <span>{attachment.uploadDate}</span>
                            <span>•</span>
                            <span>{attachment.size}</span>
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
          </div>
        )}
        </CustomDialogContent>
      </Dialog>

      </div>
    </div>
  )
}