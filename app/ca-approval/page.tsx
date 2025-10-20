"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, CheckCircle, XCircle, FileText, ChevronLeft, ChevronRight, DollarSign, Loader2, Eye, Calendar, User, Building, Target, Clock, CheckSquare, X, ArrowLeft, Filter } from 'lucide-react'
import { useState, useEffect } from 'react'

interface CashAdvance {
  ca_code: string
  employee_name: string
  department: string
  purpose: string
  total_amount: number
  used_amount: number
  remaining_amount: number
  request_date: string
  project_code?: string
  created_at: string
  submitted_date: string
  submitted_time: string
  days_waiting: number
  status: 'submitted' | 'approved' | 'active' | 'rejected' | 'in_settlement' | 'completed'
  approved_by_spv?: string
  approved_date_spv?: string
  rejection_reason?: string
}

interface CATransaction {
  transaction_code: string
  ca_code: string
  transaction_date: string
  description: string
  category: string
  amount: number
  receipt_filename?: string
  receipt_path?: string
}

interface CADetails extends CashAdvance {
  created_by?: string
  updated_by?: string
  transactions: CATransaction[]
}

interface Stats {
  totalCA: number
  approvedCA: number
  pendingCA: number
  rejectedCA: number
  totalAmountAll: number
  totalAmountPending: number
  totalAmountApproved: number
}

// Format Rupiah function
const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount).replace('Rp', 'Rp ')
}

// Format date function
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Format time function
const formatTime = (timeString: string) => {
  if (!timeString) return ''
  const time = new Date(timeString)
  return time.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function CAApprovalPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [cashAdvances, setCashAdvances] = useState<CashAdvance[]>([])
  const [stats, setStats] = useState<Stats>({ 
    totalCA: 0, 
    approvedCA: 0, 
    pendingCA: 0, 
    rejectedCA: 0,
    totalAmountAll: 0,
    totalAmountPending: 0,
    totalAmountApproved: 0
  })
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedCA, setSelectedCA] = useState<CADetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const itemsPerPage = 10

  useEffect(() => {
    fetchCashAdvances()
  }, [searchTerm, statusFilter])

  const fetchCashAdvances = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      
      const url = `/api/ca-approval${params.toString() ? `?${params.toString()}` : ''}`
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch data')
      }
      
      const result = await response.json()
      if (result.success) {
        setCashAdvances(result.data || [])
        setStats(result.stats || {
          totalCA: 0, 
          approvedCA: 0, 
          pendingCA: 0, 
          rejectedCA: 0,
          totalAmountAll: 0,
          totalAmountPending: 0,
          totalAmountApproved: 0
        })
        setSelectedCA(null)
      } else {
        throw new Error(result.error || 'Failed to fetch data')
      }
    } catch (error) {
      console.error('Error fetching cash advances:', error)
      alert('Gagal memuat data Cash Advance: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const fetchCADetails = async (caCode: string) => {
    setLoadingDetails(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/ca-approval', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ca_code: caCode })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch CA details')
      }

      const result = await response.json()
      if (result.success) {
        setSelectedCA(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch CA details')
      }
    } catch (error) {
      console.error('Error fetching CA details:', error)
      alert('Gagal memuat detail Cash Advance: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleApprove = async (ca: CashAdvance) => {
    if (!confirm(`Setujui Cash Advance ${ca.ca_code}?`)) return

    setProcessing(ca.ca_code)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/ca-approval', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          ca_code: ca.ca_code, 
          action: 'approve' 
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to approve CA')
      }

      const result = await response.json()
      if (result.success) {
        alert(result.message)
        await fetchCashAdvances()
        setSelectedCA(null)
      } else {
        throw new Error(result.error || 'Failed to approve CA')
      }
    } catch (error) {
      alert('Gagal menyetujui Cash Advance: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (ca: CashAdvance) => {
    const reason = prompt('Alasan penolakan:')
    if (!reason) return

    setProcessing(ca.ca_code)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/ca-approval', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          ca_code: ca.ca_code, 
          action: 'reject',
          notes: reason
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reject CA')
      }

      const result = await response.json()
      if (result.success) {
        alert(result.message)
        await fetchCashAdvances()
        setSelectedCA(null)
      } else {
        throw new Error(result.error || 'Failed to reject CA')
      }
    } catch (error) {
      alert('Gagal menolak Cash Advance: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 px-2 py-1 text-xs">Menunggu Approval</Badge>
      case 'approved':
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200 px-2 py-1 text-xs">Disetujui</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200 px-2 py-1 text-xs">Ditolak</Badge>
      case 'in_settlement':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-2 py-1 text-xs">Dalam Settlement</Badge>
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200 px-2 py-1 text-xs">Selesai</Badge>
      default:
        return <Badge variant="outline" className="px-2 py-1 text-xs">{status}</Badge>
    }
  }

  const getCategoryLabel = (category: string) => {
    const categories: { [key: string]: string } = {
      'transportation': 'Transportasi',
      'accommodation': 'Akomodasi',
      'meals': 'Makanan',
      'entertainment': 'Hiburan',
      'office_supplies': 'Perlengkapan Kantor',
      'other': 'Lainnya'
    }
    return categories[category] || category
  }

  const filteredCA = cashAdvances
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredCA.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredCA.length / itemsPerPage)

  const Pagination = () => (
    <div className="flex items-center justify-between px-6 py-4 border-t bg-white">
      <div className="text-sm text-gray-600">
        Menampilkan <span className="font-medium">{indexOfFirstItem + 1}</span> - <span className="font-medium">{Math.min(indexOfLastItem, filteredCA.length)}</span> dari <span className="font-medium">{filteredCA.length}</span> data
      </div>
      <div className="flex items-center gap-1">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }
          
          return (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(pageNum)}
              className="h-8 w-8 p-0 text-xs"
            >
              {pageNum}
            </Button>
          )
        })}
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  // Tampilan Detail CA
  if (selectedCA) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Cash Advance Approval</h1>
                <p className="text-gray-600 mt-1">Detail Cash Advance</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setSelectedCA(null)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Daftar
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loadingDetails ? (
            <div className="flex justify-center items-center py-12 bg-white rounded-lg border">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card className="bg-white border">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Informasi Dasar
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Karyawan</label>
                        <p className="text-gray-900 font-medium mt-1">{selectedCA.employee_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Departemen</label>
                        <p className="text-gray-900 font-medium mt-1">{selectedCA.department}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Tanggal Pengajuan</label>
                        <p className="text-gray-900 font-medium mt-1">{formatDate(selectedCA.request_date)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Project</label>
                        <p className="text-gray-900 font-medium mt-1">{selectedCA.project_code || '-'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Purpose & Amount */}
              <Card className="bg-white border">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    Tujuan & Jumlah
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tujuan</label>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg mt-1 border">{selectedCA.purpose}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <label className="text-sm font-medium text-blue-700">Total Amount</label>
                      <p className="text-xl font-bold text-blue-900 mt-1">{formatRupiah(selectedCA.total_amount)}</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <label className="text-sm font-medium text-green-700">Used Amount</label>
                      <p className="text-xl font-bold text-green-900 mt-1">{formatRupiah(selectedCA.used_amount)}</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <label className="text-sm font-medium text-orange-700">Remaining Amount</label>
                      <p className="text-xl font-bold text-orange-900 mt-1">{formatRupiah(selectedCA.remaining_amount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Information */}
              <Card className="bg-white border">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-gray-600" />
                    Status & Approval
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">Status:</span>
                    {getStatusBadge(selectedCA.status)}
                  </div>
                  
                  {selectedCA.status === 'approved' && selectedCA.approved_by_spv && (
                    <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium text-green-800">Disetujui oleh</p>
                          <p className="text-green-700">{selectedCA.approved_by_spv}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-800">Tanggal Approval</p>
                          <p className="text-green-700">{formatDate(selectedCA.approved_date_spv || '')}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedCA.status === 'rejected' && (
                    <div className="space-y-3 p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-3">
                        <XCircle className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="font-medium text-red-800">Ditolak oleh</p>
                          <p className="text-red-700">{selectedCA.approved_by_spv}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="font-medium text-red-800">Tanggal Penolakan</p>
                          <p className="text-red-700">{formatDate(selectedCA.approved_date_spv || '')}</p>
                        </div>
                      </div>
                      {selectedCA.rejection_reason && (
                        <div>
                          <p className="font-medium text-red-800 mb-2">Alasan Penolakan:</p>
                          <p className="text-red-700 bg-white p-3 rounded border">{selectedCA.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedCA.status === 'submitted' && (
                    <div className="flex gap-2 justify-end pt-4 border-t">
                      <Button 
                        onClick={() => handleApprove(selectedCA)}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={processing === selectedCA.ca_code}
                      >
                        {processing === selectedCA.ca_code ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        {processing === selectedCA.ca_code ? 'Processing...' : 'Approve'}
                      </Button>
                      <Button 
                        onClick={() => handleReject(selectedCA)}
                        variant="destructive"
                        disabled={processing === selectedCA.ca_code}
                      >
                        {processing === selectedCA.ca_code ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1" />
                        )}
                        {processing === selectedCA.ca_code ? 'Processing...' : 'Reject'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Tampilan List CA (Default)
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cash Advance Approval</h1>
              <p className="text-gray-600 mt-1">Kelola persetujuan Cash Advance</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Total: {stats.totalCA} CA</span>
              <span>•</span>
              <span>Pending: {stats.pendingCA}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total CA</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCA}</p>
                  <p className="text-xs text-gray-500 mt-1">Total: {formatRupiah(stats.totalAmountAll)}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved CA</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.approvedCA}</p>
                  <p className="text-xs text-gray-500 mt-1">Total: {formatRupiah(stats.totalAmountApproved)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckSquare className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingCA}</p>
                  <p className="text-xs text-gray-500 mt-1">Total: {formatRupiah(stats.totalAmountPending)}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Rejected CA</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.rejectedCA}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <X className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CA Approval Table */}
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="bg-white border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Cari CA number, employee, atau purpose..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10 border-gray-300"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] border-gray-300">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="submitted">Menunggu Approval</SelectItem>
                    <SelectItem value="active">Disetujui</SelectItem>
                    <SelectItem value="rejected">Ditolak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-700 w-12 text-center">No</TableHead>
                      <TableHead className="font-semibold text-gray-700">CA Number</TableHead>
                      <TableHead className="font-semibold text-gray-700">Employee</TableHead>
                      <TableHead className="font-semibold text-gray-700">Purpose</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">Amount</TableHead>
                      <TableHead className="font-semibold text-gray-700">Request Date</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">Days Waiting</TableHead>
                      <TableHead className="font-semibold text-gray-700">Status</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.map((ca, index) => (
                      <TableRow key={ca.ca_code} className="hover:bg-gray-50 border-b border-gray-100">
                        <TableCell className="text-center text-gray-500 font-medium">
                          {indexOfFirstItem + index + 1}
                        </TableCell>
                        <TableCell className="font-semibold">
                          <div 
                            className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => fetchCADetails(ca.ca_code)}
                          >
                            {ca.ca_code}
                            <Eye className="h-4 w-4 text-gray-400" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900">{ca.employee_name}</div>
                          <div className="text-sm text-gray-500">{ca.department}</div>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="truncate" title={ca.purpose}>
                            {ca.purpose}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900 text-right">
                          {formatRupiah(ca.total_amount)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900">{formatDate(ca.request_date)}</div>
                          <div className="text-sm text-gray-500">
                            {ca.submitted_time ? formatTime(ca.submitted_time) : ''}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            ca.days_waiting > 2 
                              ? 'bg-red-100 text-red-800' 
                              : ca.days_waiting > 1
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {ca.days_waiting}d
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(ca.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button 
                              onClick={() => fetchCADetails(ca.ca_code)}
                              size="sm"
                              variant="outline"
                              className="border-gray-300"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                            {ca.status === 'submitted' && (
                              <>
                                <Button 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleApprove(ca)
                                  }}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 border-green-600"
                                  disabled={processing === ca.ca_code}
                                >
                                  {processing === ca.ca_code ? (
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                  )}
                                  Approve
                                </Button>
                                <Button 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleReject(ca)
                                  }}
                                  size="sm"
                                  variant="destructive"
                                  disabled={processing === ca.ca_code}
                                >
                                  {processing === ca.ca_code ? (
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  ) : (
                                    <XCircle className="h-4 w-4 mr-1" />
                                  )}
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredCA.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada Cash Advance</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Coba ubah pencarian atau filter Anda' 
                        : 'Tidak ada data Cash Advance yang ditemukan'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {filteredCA.length > 0 && (
              <Pagination />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}