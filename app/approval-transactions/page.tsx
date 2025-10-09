// app/approval/page.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, CheckCircle, XCircle, FileText, ChevronLeft, ChevronRight, Banknote, Upload, Download, Phone, MapPin, Mail, Truck, RefreshCw, UserCheck, Users } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

// Type definitions
interface PurchaseOrder {
  id: string
  poNumber: string
  date: string
  supplier: string
  supplierContact: string
  supplierBank: string
  soReference: string
  customerName: string
  customerContact: string
  customerAddress: string
  salesRep: string
  salesRepEmail: string
  items: POItem[]
  totalAmount: number
  status: 'draft' | 'submitted' | 'approved_spv' | 'approved_finance' | 'rejected' | 'paid'
  submittedBy: string
  submittedDate: string
  submittedTime: string
  priority: 'low' | 'medium' | 'high'
  daysWaiting: number
  customerRef: string
  doNumber?: string
  doStatus?: 'not_created' | 'created' | 'shipped' | 'delivered'
  deliveryDate?: string
  isSplitPO?: boolean
  originalSOQuantity?: number
  splitSequence?: number
  approvalLevel: 'spv' | 'finance'
  approvedBySpv?: string
  approvedByFinance?: string
  approvedDateSpv?: string
  approvedDateFinance?: string
}

interface POItem {
  id: string
  productName: string
  sku: string
  quantity: number
  soUnitPrice: number
  poUnitPrice: number
  margin: number
}

interface BankAccount {
  id: string
  bankName: string
  accountNumber: string
  accountName: string
  balance: number
}

interface Document {
  id: string
  name: string
  type: 'customer_po' | 'sales_order' | 'purchase_order' | 'supplier_invoice' | 'payment_proof' | 'other'
  uploadDate: string
  size: string
  uploadedBy: string
  file?: File
}

export default function ApprovalPage() {
  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'submitted' | 'approved_spv' | 'all'>('submitted')
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>('')
  const [transferProof, setTransferProof] = useState<File | null>(null)
  const [additionalDocuments, setAdditionalDocuments] = useState<Document[]>([])
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [poToAction, setPoToAction] = useState<PurchaseOrder | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [approvalNote, setApprovalNote] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const itemsPerPage = 8

  // Sample data dengan 2 LEVEL APPROVAL
  const purchaseOrders: PurchaseOrder[] = [
    // PO Baru - Menunggu Approval SPV
    {
      id: '9',
      poNumber: 'PO-2024-005-01',
      date: '2024-01-23',
      supplier: 'PT. Supplier Baru',
      supplierContact: '0819888777',
      supplierBank: 'BCA 777-888-999',
      soReference: 'SO-2024-005',
      customerName: 'PT. Client Baru',
      customerContact: '0812333444',
      customerAddress: 'Jl. Baru No. 99, Jakarta Barat',
      salesRep: 'Ahmad Wijaya',
      salesRepEmail: 'ahmad@company.com',
      items: [
        {
          id: '9',
          productName: 'Printer LaserJet Pro',
          sku: 'PRN-LSJ-PRO-01',
          quantity: 15,
          soUnitPrice: 850000,
          poUnitPrice: 750000,
          margin: 1500000
        }
      ],
      totalAmount: 11250000,
      status: 'submitted',
      submittedBy: 'Ahmad Wijaya',
      submittedDate: '2024-01-23',
      submittedTime: '10:30',
      priority: 'medium',
      daysWaiting: 0,
      customerRef: 'PO-CLIENT-2024-005',
      isSplitPO: false,
      originalSOQuantity: 15,
      splitSequence: 1,
      approvalLevel: 'spv'
    },

    // PO yang sudah di-approve SPV - Menunggu Finance
    {
      id: '10',
      poNumber: 'PO-2024-006-01',
      date: '2024-01-23',
      supplier: 'PT. Komputer Maju',
      supplierContact: '0819555666',
      supplierBank: 'Mandiri 444-555-666',
      soReference: 'SO-2024-006',
      customerName: 'CV. Teknologi Modern',
      customerContact: '0812777888',
      customerAddress: 'Jl. Teknologi No. 45, Surabaya',
      salesRep: 'Sari Dewi',
      salesRepEmail: 'sari@company.com',
      items: [
        {
          id: '10',
          productName: 'Tablet Samsung Galaxy Tab',
          sku: 'TAB-SAM-GAL-01',
          quantity: 25,
          soUnitPrice: 2800000,
          poUnitPrice: 2500000,
          margin: 7500000
        }
      ],
      totalAmount: 62500000,
      status: 'approved_spv',
      submittedBy: 'Sari Dewi',
      submittedDate: '2024-01-23',
      submittedTime: '11:45',
      priority: 'high',
      daysWaiting: 0,
      customerRef: 'PO-CLIENT-2024-006',
      isSplitPO: true,
      originalSOQuantity: 60,
      splitSequence: 1,
      approvalLevel: 'finance',
      approvedBySpv: 'Budi Santoso',
      approvedDateSpv: '2024-01-23 14:20'
    },

    // Split PO Part 2
    {
      id: '11',
      poNumber: 'PO-2024-006-02',
      date: '2024-01-23',
      supplier: 'PT. Komputer Maju',
      supplierContact: '0819555666',
      supplierBank: 'Mandiri 444-555-666',
      soReference: 'SO-2024-006',
      customerName: 'CV. Teknologi Modern',
      customerContact: '0812777888',
      customerAddress: 'Jl. Teknologi No. 45, Surabaya',
      salesRep: 'Sari Dewi',
      salesRepEmail: 'sari@company.com',
      items: [
        {
          id: '11',
          productName: 'Tablet Samsung Galaxy Tab',
          sku: 'TAB-SAM-GAL-01',
          quantity: 35,
          soUnitPrice: 2800000,
          poUnitPrice: 2500000,
          margin: 10500000
        }
      ],
      totalAmount: 87500000,
      status: 'submitted',
      submittedBy: 'Sari Dewi',
      submittedDate: '2024-01-23',
      submittedTime: '11:45',
      priority: 'high',
      daysWaiting: 0,
      customerRef: 'PO-CLIENT-2024-006',
      isSplitPO: true,
      originalSOQuantity: 60,
      splitSequence: 2,
      approvalLevel: 'spv'
    }
  ]

  // Bank accounts data
  const bankAccounts: BankAccount[] = [
    {
      id: '1',
      bankName: 'BCA',
      accountNumber: '888-999-0001',
      accountName: 'PT. Perusahaan Kita - Operating',
      balance: 50000000
    },
    {
      id: '2',
      bankName: 'Mandiri',
      accountNumber: '123-456-7890',
      accountName: 'PT. Perusahaan Kita - Main',
      balance: 75000000
    }
  ]

  // Documents data default
  const defaultDocuments: Document[] = [
    {
      id: '1',
      name: 'customer_po_001.pdf',
      type: 'customer_po',
      uploadDate: '2024-01-15',
      size: '2.4 MB',
      uploadedBy: 'Budi Santoso'
    },
    {
      id: '2',
      name: 'sales_order_001.pdf',
      type: 'sales_order',
      uploadDate: '2024-01-15',
      size: '1.8 MB',
      uploadedBy: 'Budi Santoso'
    }
  ]

  // Statistics - Hitung per status
  const stats = {
    pendingSpv: purchaseOrders.filter(po => po.status === 'submitted').length,
    pendingFinance: purchaseOrders.filter(po => po.status === 'approved_spv').length,
    approvedToday: 2,
    totalAmount: purchaseOrders.filter(po => po.status === 'submitted' || po.status === 'approved_spv')
      .reduce((sum, po) => sum + po.totalAmount, 0)
  }

  // Filter POs
  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = 
      po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.soReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredPOs.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredPOs.length / itemsPerPage)

  // Handler untuk row click
  const handleRowClick = (po: PurchaseOrder) => {
    if (selectedPO && selectedPO.id === po.id) {
      setSelectedPO(null)
    } else {
      setSelectedPO(po)
      // Reset form state
      setSelectedBankAccount('')
      setTransferProof(null)
      setAdditionalDocuments([])
      setApprovalNote('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (docInputRef.current) docInputRef.current.value = ''
    }
  }

  // Function untuk refresh detail PO
  const refreshPODetail = () => {
    if (!selectedPO) return
    setIsRefreshing(true)
    setTimeout(() => {
      const updatedPO = purchaseOrders.find(po => po.id === selectedPO.id)
      if (updatedPO) setSelectedPO(updatedPO)
      setIsRefreshing(false)
    }, 1000)
  }

  // Handlers untuk modal backdrop
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowApproveModal(false)
      setShowRejectModal(false)
    }
  }

  // Handle upload additional documents
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newDocs: Document[] = Array.from(files).map((file, index) => ({
      id: `doc-${Date.now()}-${index}`,
      name: file.name,
      type: 'other',
      uploadDate: new Date().toLocaleDateString('id-ID'),
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      uploadedBy: 'Current User',
      file: file
    }))

    setAdditionalDocuments(prev => [...prev, ...newDocs])
    if (docInputRef.current) docInputRef.current.value = ''
  }

  // Remove document
  const removeDocument = (docId: string) => {
    setAdditionalDocuments(prev => prev.filter(doc => doc.id !== docId))
  }

  // Handle approve dengan 2 level
  const handleApprove = () => {
    if (!poToAction) return
    
    // Validasi berdasarkan level approval
    if (poToAction.approvalLevel === 'finance' && (!selectedBankAccount || !transferProof)) {
      alert('Untuk approval finance, harap pilih bank account dan upload bukti transfer')
      return
    }

    console.log(`Approving PO ${poToAction.poNumber} at ${poToAction.approvalLevel} level`)
    
    let updatedStatus: PurchaseOrder['status']
    let message = ''

    if (poToAction.approvalLevel === 'spv') {
      updatedStatus = 'approved_spv'
      message = `PO ${poToAction.poNumber} approved by Supervisor! Menunggu approval Finance.`
    } else {
      updatedStatus = 'approved_finance'
      const doNumber = poToAction.poNumber.replace('PO-', 'DO-')
      message = `PO ${poToAction.poNumber} approved by Finance! DO ${doNumber} created automatically.`
    }

    const splitInfo = poToAction.isSplitPO 
      ? ` (Part ${poToAction.splitSequence} of ${poToAction.originalSOQuantity})`
      : ''

    alert(`${message}${splitInfo}`)
    
    setShowApproveModal(false)
    setSelectedBankAccount('')
    setTransferProof(null)
    setAdditionalDocuments([])
    setApprovalNote('')

    // Refresh detail jika PO yang di-approve sedang dilihat
    if (selectedPO && selectedPO.id === poToAction.id) {
      const updatedPO = { 
        ...selectedPO, 
        status: updatedStatus,
        approvalLevel: poToAction.approvalLevel === 'spv' ? 'finance' : 'spv'
      }
      setSelectedPO(updatedPO)
    }
  }

  const handleReject = () => {
    if (!poToAction) return
    console.log('Rejecting PO:', poToAction.poNumber)
    alert(`PO ${poToAction.poNumber} rejected!`)
    setShowRejectModal(false)
    
    if (selectedPO && selectedPO.id === poToAction.id) {
      const updatedPO = { ...selectedPO, status: 'rejected' as const }
      setSelectedPO(updatedPO)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setTransferProof(file)
  }

  const removeTransferProof = () => {
    setTransferProof(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const downloadDocument = (doc: Document) => {
    console.log('Downloading:', doc.name)
    alert(`Downloading ${doc.name}`)
  }

  // Status color untuk 2 level approval
  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved_spv: 'bg-yellow-100 text-yellow-800',
      approved_finance: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-purple-100 text-purple-800'
    }
    return colors[status as keyof typeof colors] || colors.draft
  }

  // Get approval badge berdasarkan level
  const getApprovalBadge = (po: PurchaseOrder) => {
    if (po.status === 'submitted') {
      return <Badge className="bg-blue-100 text-blue-800">Waiting SPV</Badge>
    } else if (po.status === 'approved_spv') {
      return <Badge className="bg-yellow-100 text-yellow-800">Waiting Finance</Badge>
    } else if (po.status === 'approved_finance') {
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>
    }
    return null
  }

  // Pagination component
  const Pagination = () => (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="text-sm text-gray-600">
        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredPOs.length)} of {filteredPOs.length} results
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const pageNum = i + 1
          return (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(pageNum)}
            >
              {pageNum}
            </Button>
          )
        })}
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
    
        {/* PO Table - TANPA PRIORITY DAN TANPA ACTIONS */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search PO number, supplier, or SO reference..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as 'submitted' | 'approved_spv' | 'all')
                  setCurrentPage(1)
                }}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="submitted">Waiting SPV</option>
                <option value="approved_spv">Waiting Finance</option>
                <option value="all">All Status</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>SO Reference</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Approval Level</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    {/* TOMBOL ACTIONS DIHAPUS */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((po) => (
                    <TableRow 
                      key={po.id} 
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedPO?.id === po.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => handleRowClick(po)}
                    >
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          {po.poNumber}
                          {po.isSplitPO && (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                              PART {po.splitSequence}
                            </Badge>
                          )}
                          {po.priority === 'high' && (
                            <Badge variant="destructive" className="text-xs">
                              URGENT
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{po.supplier}</div>
                        <div className="text-sm text-gray-500">{po.submittedBy}</div>
                      </TableCell>
                      <TableCell className="font-medium text-blue-600">{po.soReference}</TableCell>
                      <TableCell className="font-semibold">
                        Rp {po.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getApprovalBadge(po)}
                      </TableCell>
                      <TableCell>
                        <div className={`text-sm font-medium ${
                          po.daysWaiting > 2 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {po.daysWaiting}d
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(po.status)} variant="outline">
                          {po.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      {/* TOMBOL ACTIONS DIHAPUS */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {filteredPOs.length > 0 && <Pagination />}
          </CardContent>
        </Card>

        {/* PO Details */}
        {selectedPO && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="sticky top-0 bg-white z-10 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  PO Details - {selectedPO.poNumber}
                  {getApprovalBadge(selectedPO)}
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={refreshPODetail}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedPO(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Basic Information & Approval History */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information & Approval History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-gray-500">PO Date</Label>
                      <p className="font-medium">{selectedPO.date}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">SO Reference</Label>
                      <p className="font-medium text-blue-600">{selectedPO.soReference}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Customer</Label>
                      <p className="font-medium">{selectedPO.customerName}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Current Level</Label>
                      <p className="font-medium capitalize">{selectedPO.approvalLevel}</p>
                    </div>
                    
                    {/* Approval History */}
                    {selectedPO.approvedBySpv && (
                      <div className="md:col-span-2">
                        <Label className="text-xs text-gray-500">Approved by SPV</Label>
                        <p className="font-medium">{selectedPO.approvedBySpv} - {selectedPO.approvedDateSpv}</p>
                      </div>
                    )}
                    {selectedPO.approvedByFinance && (
                      <div className="md:col-span-2">
                        <Label className="text-xs text-gray-500">Approved by Finance</Label>
                        <p className="font-medium">{selectedPO.approvedByFinance} - {selectedPO.approvedDateFinance}</p>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-xs text-gray-500">Supplier</Label>
                      <p className="font-medium">{selectedPO.supplier}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Supplier Bank</Label>
                      <p className="font-medium font-mono">{selectedPO.supplierBank}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Sales Rep</Label>
                      <p className="font-medium">{selectedPO.salesRep}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Total Amount</Label>
                      <p className="font-medium text-lg">Rp {selectedPO.totalAmount.toLocaleString()}</p>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Supplier Contact
                      </Label>
                      <p className="font-medium">{selectedPO.supplierContact}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Customer Contact
                      </Label>
                      <p className="font-medium">{selectedPO.customerContact}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Sales Email
                      </Label>
                      <p className="font-medium">{selectedPO.salesRepEmail}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Submitted Time</Label>
                      <p className="font-medium">{selectedPO.submittedTime}</p>
                    </div>
                    <div className="md:col-span-2 lg:col-span-4">
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Customer Address
                      </Label>
                      <p className="font-medium text-sm">{selectedPO.customerAddress}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Price Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Price Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead className="text-right">SO Price</TableHead>
                        <TableHead className="text-right">PO Price</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                        <TableHead className="text-right">Margin %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPO.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {item.quantity}
                              {selectedPO.isSplitPO && (
                                <Badge variant="outline" className="text-xs bg-gray-100">
                                  of {selectedPO.originalSOQuantity}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            Rp {item.soUnitPrice.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            Rp {item.poUnitPrice.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-semibold">
                            Rp {item.margin.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-semibold">
                            {((item.margin / (item.soUnitPrice * item.quantity)) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Documents */}
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {defaultDocuments.map((doc) => (
                      <div key={doc.id} className="flex flex-col p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <FileText className="h-8 w-8 text-blue-500 flex-shrink-0 mt-1" />
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => downloadDocument(doc)}
                            className="h-8 w-8 p-0"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm mb-1 truncate">{doc.name}</div>
                          <div className="text-xs text-gray-500 mb-1">
                            {doc.uploadedBy} • {doc.uploadDate}
                          </div>
                          <div className="text-xs text-gray-400">{doc.size}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payment & Approval */}
              <div className="space-y-6">
                {/* Grid untuk Transfer Proof dan Additional Documents */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Transfer Proof Upload - Hanya untuk Finance approval */}
                  {selectedPO.approvalLevel === 'finance' && (
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Transfer Proof</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 h-full">
                        {transferProof ? (
                          <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-green-600" />
                              <span className="text-sm">{transferProof.name}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={removeTransferProof}>
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center h-full flex flex-col justify-center">
                            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <Button 
                              variant="outline" 
                              onClick={() => fileInputRef.current?.click()}
                              size="sm"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Proof
                            </Button>
                            <input
                              ref={fileInputRef}
                              type="file"
                              className="hidden"
                              onChange={handleFileUpload}
                              accept=".pdf,.jpg,.jpeg,.png"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Additional Documents Upload */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Additional Documents</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 h-full">
                      {additionalDocuments.length > 0 ? (
                        <div className="space-y-3">
                          {additionalDocuments.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-blue-600" />
                                <div>
                                  <div className="font-medium text-sm">{doc.name}</div>
                                  <div className="text-xs text-gray-500">{doc.size} • {doc.uploadDate}</div>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => removeDocument(doc.id)}>
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center h-full flex flex-col justify-center">
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 mb-3">Upload additional supporting documents</p>
                          <Button 
                            variant="outline" 
                            onClick={() => docInputRef.current?.click()}
                            size="sm"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Documents
                          </Button>
                          <input
                            ref={docInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleDocumentUpload}
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bank Account Selection - Hanya untuk Finance approval */}
                {selectedPO.approvalLevel === 'finance' && (
                  <div>
                    <Label className="text-sm font-medium  block mt-12">Select Bank Account</Label>
                    <div className="space-y-2">
                      {bankAccounts.map((account) => (
                        <div 
                          key={account.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedBankAccount === account.id 
                              ? 'bg-blue-50 border-blue-200' 
                              : 'bg-white hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedBankAccount(account.id)}
                        >
                          <div className="font-medium">{account.bankName}</div>
                          <div className="text-sm text-gray-600 font-mono">{account.accountNumber}</div>
                          <div className="text-sm text-gray-500">{account.accountName}</div>
                          <div className="text-sm text-green-600 mt-1">
                            Balance: Rp {account.balance.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Approval Notes */}
                <div>
                  <Label className="text-sm font-medium mb-3 block mt-12">Approval Notes (Optional)</Label>
                  <Textarea
                    placeholder="Add notes for this approval..."
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                {/* Approval Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setPoToAction(selectedPO)
                      setShowRejectModal(true)
                    }}
                    disabled={selectedPO.status === 'rejected' || selectedPO.status === 'approved_finance'}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject PO
                  </Button>
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setPoToAction(selectedPO)
                      setShowApproveModal(true)
                    }}
                    disabled={
                      selectedPO.status === 'rejected' || 
                      selectedPO.status === 'approved_finance' ||
                      (selectedPO.approvalLevel === 'finance' && (!selectedBankAccount || !transferProof))
                    }
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {selectedPO.approvalLevel === 'spv' ? 'Approve (SPV)' : 'Approve (Finance)'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modals */}
        {showApproveModal && poToAction && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all duration-200"
            onClick={handleBackdropClick}
          >
            <div className="bg-white rounded-lg max-w-md w-full p-6 animate-in fade-in-zoom-in-95">
              <h3 className="text-lg font-semibold mb-4">
                Confirm {poToAction.approvalLevel.toUpperCase()} Approval
              </h3>
              <p className="text-gray-600 mb-6">
                Apakah anda yakin untuk approve PO <strong>{poToAction.poNumber}</strong> 
                {poToAction.approvalLevel === 'spv' ? ' sebagai Supervisor?' : ' sebagai Finance?'}
                {poToAction.isSplitPO && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                    <strong>Split Information:</strong><br/>
                    Part {poToAction.splitSequence} of {poToAction.originalSOQuantity}<br/>
                    Quantity: {poToAction.items[0].quantity} pcs
                  </div>
                )}
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowApproveModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleApprove}
                >
                  Yes, Approve
                </Button>
              </div>
            </div>
          </div>
        )}

        {showRejectModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all duration-200"
            onClick={handleBackdropClick}
          >
            <div className="bg-white rounded-lg max-w-md w-full p-6 animate-in fade-in-zoom-in-95">
              <h3 className="text-lg font-semibold mb-4">Confirm Rejection</h3>
              <p className="text-gray-600 mb-6">
                Apakah anda yakin untuk reject PO <strong>{poToAction?.poNumber}</strong>?
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1"
                  onClick={handleReject}
                >
                  Yes, Reject
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}