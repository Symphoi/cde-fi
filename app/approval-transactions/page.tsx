// app/approval/page.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, CheckCircle, XCircle, FileText, ChevronLeft, ChevronRight, Download, RefreshCw, UserCheck, Users, Phone, MapPin, Mail } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

// Type definitions - UPDATED FOR BACKEND INTEGRATION
interface PurchaseOrder {
  po_code: string
  so_code: string
  so_reference: string
  supplier_name: string
  supplier_contact: string
  supplier_bank: string
  total_amount: number
  status: 'submitted' | 'approved_spv' | 'approved_finance' | 'paid' | 'rejected'
  notes?: string
  date: string
  priority: 'low' | 'medium' | 'high'
  days_waiting: number
  customer_ref: string
  approval_level: 'spv' | 'finance'
  approved_by_spv?: string
  approved_by_finance?: string
  approved_date_spv?: string
  approved_date_finance?: string
  approval_notes?: string
  rejection_reason?: string
  created_at: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  customer_address: string
  sales_rep: string
  sales_rep_email: string
  so_total_amount: number
  items_count: number
  items?: POItem[]
  documents?: Document[]
  is_split_po?: boolean
  original_so_quantity?: number
  split_sequence?: number
}

interface POItem {
  po_item_code: string
  product_name: string
  product_code: string
  quantity: number
  purchase_price: number
  notes: string
  so_unit_price: number
  margin: number
  margin_percentage: number
}

interface Document {
  id: string
  name: string
  type: string
  filename: string
  file_path: string  
  upload_date: string
  source: 'PO' | 'SO'
  is_main?: boolean 
  notes?: string    
}

export default function ApprovalPage() {
  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [poToAction, setPoToAction] = useState<PurchaseOrder | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [approvalNote, setApprovalNote] = useState('')
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)

  const itemsPerPage = 8

  // Fetch data dari API
  useEffect(() => {
    fetchApprovalData()
  }, [])

  const fetchApprovalData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/approval-transactions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setPurchaseOrders(data.data)
        }
      } else {
        console.error('Failed to fetch approval data')
      }
    } catch (error) {
      console.error('Error fetching approval data:', error)
      alert('Error loading approval data')
    } finally {
      setLoading(false)
    }
  }

  // Fetch PO detail
  const fetchPODetail = async (po_code: string) => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`/api/approval-transactions?po_code=${po_code}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          return data.data
        }
      }
      return null
    } catch (error) {
      console.error('Error fetching PO detail:', error)
      return null
    }
  }

  // Filter POs
  const filteredPOs = purchaseOrders.filter(po => {
    const searchLower = searchTerm.toLowerCase()
    return (
      po.po_code.toLowerCase().includes(searchLower) ||
      po.supplier_name.toLowerCase().includes(searchLower) ||
      po.so_reference.toLowerCase().includes(searchLower) ||
      po.customer_name.toLowerCase().includes(searchLower)
    )
  })

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredPOs.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredPOs.length / itemsPerPage)

  // Handler untuk row click
  const handleRowClick = async (po: PurchaseOrder) => {
    if (selectedPO && selectedPO.po_code === po.po_code) {
      setSelectedPO(null)
    } else {
      setIsRefreshing(true)
      const poDetail = await fetchPODetail(po.po_code)
      if (poDetail) {
        setSelectedPO(poDetail)
      }
      setIsRefreshing(false)
      setApprovalNote('')
    }
  }

  // Function untuk refresh detail PO
  const refreshPODetail = async () => {
    if (!selectedPO) return
    setIsRefreshing(true)
    const updatedPO = await fetchPODetail(selectedPO.po_code)
    if (updatedPO) setSelectedPO(updatedPO)
    setIsRefreshing(false)
  }

  // Handlers untuk modal backdrop
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowApproveModal(false)
      setShowRejectModal(false)
    }
  }

  // Handle approve
  const handleApprove = async () => {
    if (!poToAction) return
    
    try {
      const token = localStorage.getItem('token')
      const action = poToAction.approval_level === 'spv' ? 'approve_spv' : 'approve_finance'
      
      const response = await fetch('/api/approval-transactions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          po_code: poToAction.po_code,
          action: action,
          notes: approvalNote
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        let message = `PO ${poToAction.po_code} approved by ${poToAction.approval_level.toUpperCase()}!`
        if (poToAction.approval_level === 'spv') {
          message += ' Menunggu approval Finance.'
        } else {
          message += ' DO created automatically.'
        }

        if (poToAction.is_split_po) {
          message += ` (Part ${poToAction.split_sequence} of ${poToAction.original_so_quantity})`
        }

        alert(message)
        
        setShowApproveModal(false)
        setApprovalNote('')

        // Refresh data
        fetchApprovalData()
        if (selectedPO && selectedPO.po_code === poToAction.po_code) {
          const updatedPO = await fetchPODetail(poToAction.po_code)
          if (updatedPO) setSelectedPO(updatedPO)
        }
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error approving PO:', error)
      alert('Error approving purchase order')
    }
  }

  const handleReject = async () => {
    if (!poToAction) return
    
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/approval-transactions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          po_code: poToAction.po_code,
          action: 'reject',
          notes: approvalNote
        })
      })

      if (response.ok) {
        alert(`PO ${poToAction.po_code} rejected!`)
        setShowRejectModal(false)
        setApprovalNote('')

        // Refresh data
        fetchApprovalData()
        if (selectedPO && selectedPO.po_code === poToAction.po_code) {
          const updatedPO = await fetchPODetail(poToAction.po_code)
          if (updatedPO) setSelectedPO(updatedPO)
        }
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error rejecting PO:', error)
      alert('Error rejecting purchase order')
    }
  }

const downloadDocument = async (doc: Document) => {
  try {
    if (!doc.file_path) {
      alert(`Document ${doc.name} tidak memiliki file path`)
      return
    }

    // Jika file_path adalah URL lengkap
    if (doc.file_path.startsWith('http')) {
      window.open(doc.file_path, '_blank')
    } else {
      // Jika file_path adalah relative path, buat URL lengkap
      const fullUrl = `/api/download?path=${encodeURIComponent(doc.file_path)}&filename=${doc.filename}`
      window.open(fullUrl, '_blank')
    }
  } catch (error) {
    console.error('Error downloading document:', error)
    alert('Error downloading document')
  }
}

  // Status color untuk 2 level approval
  const getStatusColor = (status: string) => {
    const colors = {
      submitted: 'bg-blue-100 text-blue-800',
      approved_spv: 'bg-yellow-100 text-yellow-800',
      approved_finance: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-purple-100 text-purple-800'
    }
    return colors[status as keyof typeof colors] || colors.submitted
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

  // Check if user can approve based on role (simulated)
// Check if user can approve based on actual user data from token
const canApprove = (po: PurchaseOrder) => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return false
    
    const payload = JSON.parse(atob(token.split('.')[1]))
    const userDepartment = payload.department
    
    console.log('👤 User Department:', userDepartment)
    console.log('📋 PO:', { status: po.status, approval_level: po.approval_level })
    
    // Finance department bisa approve kedua level
    if (userDepartment === 'Finance') {
      // TEMPORARY FIX: Handle inconsistent data
      const canApproveFinance = po.status === 'approved_spv' // approval_level bisa 'spv' atau 'finance'
      const canApproveSpv = po.status === 'submitted' && po.approval_level === 'spv'
      console.log('💰 Finance can approve:', { spv: canApproveSpv, finance: canApproveFinance })
      return canApproveSpv || canApproveFinance
    }
    
    // Admin/IT bisa approve semua
    if (userDepartment === 'IT') {
      const canApprove = po.status === 'submitted' || po.status === 'approved_spv'
      console.log('✅ Admin can approve:', canApprove)
      return canApprove
    }
    
    // Other departments hanya bisa approve SPV level
    const canApprove = po.status === 'submitted' && po.approval_level === 'spv'
    console.log('👥 Other can only approve SPV:', canApprove)
    return canApprove
    
  } catch (error) {
    console.error('Error checking approval permission:', error)
    // Fallback
    return po.status === 'submitted' || po.status === 'approved_spv'
  }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading approval data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
    
        {/* PO Table */}
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
              
              <Button 
                variant="outline" 
                onClick={fetchApprovalData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((po) => (
                    <TableRow 
                      key={po.po_code} 
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedPO?.po_code === po.po_code ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => handleRowClick(po)}
                    >
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          {po.po_code}
                          {po.is_split_po && (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                              PART {po.split_sequence}
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
                        <div className="font-medium">{po.supplier_name}</div>
                        <div className="text-sm text-gray-500">{po.sales_rep}</div>
                      </TableCell>
                      <TableCell className="font-medium text-blue-600">{po.so_reference}</TableCell>
                      <TableCell className="font-semibold">
                        Rp {po.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getApprovalBadge(po)}
                      </TableCell>
                      <TableCell>
                        <div className={`text-sm font-medium ${
                          po.days_waiting > 2 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {po.days_waiting}d
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(po.status)} variant="outline">
                          {po.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
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
                  PO Details - {selectedPO.po_code}
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
                      <p className="font-medium text-blue-600">{selectedPO.so_reference}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Customer</Label>
                      <p className="font-medium">{selectedPO.customer_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Current Level</Label>
                      <p className="font-medium capitalize">{selectedPO.approval_level}</p>
                    </div>
                    
                    {/* Approval History */}
                    {selectedPO.approved_by_spv && (
                      <div className="md:col-span-2">
                        <Label className="text-xs text-gray-500">Approved by SPV</Label>
                        <p className="font-medium">{selectedPO.approved_by_spv} - {selectedPO.approved_date_spv}</p>
                      </div>
                    )}
                    {selectedPO.approved_by_finance && (
                      <div className="md:col-span-2">
                        <Label className="text-xs text-gray-500">Approved by Finance</Label>
                        <p className="font-medium">{selectedPO.approved_by_finance} - {selectedPO.approved_date_finance}</p>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-xs text-gray-500">Supplier</Label>
                      <p className="font-medium">{selectedPO.supplier_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Supplier Bank</Label>
                      <p className="font-medium font-mono">{selectedPO.supplier_bank}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Sales Rep</Label>
                      <p className="font-medium">{selectedPO.sales_rep}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Total Amount</Label>
                      <p className="font-medium text-lg">Rp {selectedPO.total_amount.toLocaleString()}</p>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Supplier Contact
                      </Label>
                      <p className="font-medium">{selectedPO.supplier_contact}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Customer Contact
                      </Label>
                      <p className="font-medium">{selectedPO.customer_phone}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Sales Email
                      </Label>
                      <p className="font-medium">{selectedPO.sales_rep_email}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Submitted Time</Label>
                      <p className="font-medium">{new Date(selectedPO.created_at).toLocaleTimeString()}</p>
                    </div>
                    <div className="md:col-span-2 lg:col-span-4">
                      <Label className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Customer Address
                      </Label>
                      <p className="font-medium text-sm">{selectedPO.customer_address}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Price Comparison */}
              {selectedPO.items && selectedPO.items.length > 0 && (
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
                          <TableRow key={item.po_item_code}>
                            <TableCell className="font-medium">{item.product_name}</TableCell>
                            <TableCell className="font-mono text-sm">{item.product_code}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {item.quantity}
                                {selectedPO.is_split_po && (
                                  <Badge variant="outline" className="text-xs bg-gray-100">
                                    of {selectedPO.original_so_quantity}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              Rp {item.so_unit_price.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              Rp {item.purchase_price.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-semibold">
                              Rp {item.margin.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-semibold">
                              {item.margin_percentage.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Documents */}
             {/* Documents */}
{selectedPO.documents && selectedPO.documents.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Documents ({selectedPO.documents.length})
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedPO.documents.map((doc) => (
          <div key={doc.id} className="flex flex-col p-4 border rounded-lg hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <FileText className={`h-8 w-8 ${
                  doc.type === 'pdf' ? 'text-red-500' : 
                  doc.type === 'doc' || doc.type === 'docx' ? 'text-blue-500' :
                  doc.type === 'xls' || doc.type === 'xlsx' ? 'text-green-500' :
                  'text-gray-500'
                } flex-shrink-0`} />
                <div>
                  {doc.is_main && (
                    <Badge variant="default" className="mb-1 text-xs bg-blue-100 text-blue-800">
                      Main
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Badge variant="secondary" className="text-xs">
                  {doc.source}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => downloadDocument(doc)}
                  className="h-8 w-8 p-0"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm mb-1 truncate" title={doc.name}>
                {doc.name}
              </div>
              <div className="text-xs text-gray-500 mb-1">
                {new Date(doc.upload_date).toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </div>
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-400 capitalize">
                  {doc.type} • {doc.source}
                </div>
                {doc.notes && (
                  <div className="text-xs text-gray-500" title={doc.notes}>
                    📝
                  </div>
                )}
              </div>
              {doc.file_path && (
                <div className="text-xs text-gray-500 truncate mt-1" title={doc.file_path}>
                  📁 {doc.file_path.split('/').pop()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)}

              {/* Approval Section */}
              <div className="space-y-6">
                {/* Approval Notes */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Approval Notes (Optional)</Label>
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
                    disabled={selectedPO.status === 'rejected' || selectedPO.status === 'approved_finance' || selectedPO.status === 'paid'}
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
                      selectedPO.status === 'paid' ||
                      !canApprove(selectedPO)
                    }
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {selectedPO.approval_level === 'spv' ? 'Approve (SPV)' : 'Approve (Finance)'}
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
                Confirm {poToAction.approval_level.toUpperCase()} Approval
              </h3>
              <div className="text-gray-600 mb-6">
                Apakah anda yakin untuk approve PO <strong>{poToAction.po_code}</strong> 
                {poToAction.approval_level === 'spv' ? ' sebagai Supervisor?' : ' sebagai Finance?'}
                {poToAction.is_split_po && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                    <strong>Split Information:</strong><br/>
                    Part {poToAction.split_sequence} of {poToAction.original_so_quantity}<br/>
                    Quantity: {poToAction.items?.[0]?.quantity || 0} pcs
                  </div>
                )}
              </div>
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

        {showRejectModal && poToAction && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all duration-200"
            onClick={handleBackdropClick}
          >
            <div className="bg-white rounded-lg max-w-md w-full p-6 animate-in fade-in-zoom-in-95">
              <h3 className="text-lg font-semibold mb-4">Confirm Rejection</h3>
              <div className="text-gray-600 mb-6">
                Apakah anda yakin untuk reject PO <strong>{poToAction.po_code}</strong>?
              </div>
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