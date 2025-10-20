"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, FileText, Calendar, User, DollarSign, ChevronLeft, ChevronRight, Eye, Loader2, Save, X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface CashAdvance {
  ca_code: string
  employee_name: string
  department: string
  purpose: string
  total_amount: number | string
  used_amount: number | string
  remaining_amount: number | string
  status: string
  request_date: string
  project_code?: string
}

interface CashAdvanceDetail {
  ca_code: string
  employee_name: string
  department: string
  purpose: string
  total_amount: number | string
  used_amount: number | string
  remaining_amount: number | string
  status: string
  request_date: string
  project_code?: string
  created_by: string
  created_at: string
  approved_by_spv?: string
  approved_by_finance?: string
  approved_date_spv?: string
  approved_date_finance?: string
}

interface CashAdvanceForm {
  purpose: string
  total_amount: number
  request_date: string
  project_code?: string
}

interface Project {
  project_code: string
  name: string
}

// Format currency to Rupiah - handle both number and string
const formatRupiah = (amount: number | string | null | undefined) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (numAmount === null || numAmount === undefined || isNaN(numAmount as number)) {
    return 'Rp 0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(numAmount as number);
};

// Format date from "2025-10-19T17:00:00.000Z" to "2025-10-20"
const formatDateDisplay = (dateString: string) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    return dateString;
  }
};

export default function CashAdvancePage() {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'approved'  | 'rejected' | 'active'  | 'in_settlement'   | 'completed'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [cashAdvances, setCashAdvances] = useState<CashAdvance[]>([])
  const [selectedCA, setSelectedCA] = useState<CashAdvanceDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [currentUser, setCurrentUser] = useState({ name: '', department: '' })
  const [stats, setStats] = useState({ 
    pending: 0, 
    approved: 0, 
    active: 0, 
    totalAmount: 0 
  })
  
  // Form state
  const [form, setForm] = useState<CashAdvanceForm>({
    purpose: '',
    total_amount: 0,
    request_date: new Date().toISOString().split('T')[0],
    project_code: ''
  })

  const itemsPerPage = 8

  useEffect(() => {
    fetchDropdownData()
    if (activeTab === 'history') {
      fetchMyCashAdvances()
    }
  }, [activeTab, statusFilter])

  const fetchDropdownData = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/ca-create?action=dropdowns', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()
      if (result.success) {
        setProjects(result.data.projects || [])
      }
    } catch (error) {
      console.error('Error fetching dropdown data:', error)
    }


    setSelectedCA(null);
  }

  const fetchMyCashAdvances = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const url = `/api/ca-create?status=${statusFilter}&search=${searchTerm}`
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) throw new Error('Failed to fetch data')
      
      const result = await response.json()
      if (result.success) {
        setCashAdvances(result.data || [])
        
        // Convert string stats to numbers
        const statsData = result.stats || {}
        setStats({
          pending: parseInt(statsData.pending) || 0,
          approved: parseInt(statsData.approved) || 0,
          active: parseInt(statsData.active) || 0,
          totalAmount: parseFloat(statsData.totalAmount) || 0
        })
        
        setCurrentUser(result.currentUser || { name: '', department: '' })
      } else {
        throw new Error(result.error || 'Failed to fetch data')
      }
    } catch (error) {
      console.error('Error fetching cash advances:', error)
      alert('Gagal memuat data Cash Advance')
    } finally {
      setLoading(false)
    }
  }

  const fetchCADetail = async (caCode: string) => {
    setDetailLoading(caCode)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/ca-create?ca_code=${caCode}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // FIX: Ambil element pertama dari array
          setSelectedCA(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching CA detail:', error)
    } finally {
      setDetailLoading(null)
    }
  }

  const handleRowClick = (ca: CashAdvance) => {
    if (selectedCA?.ca_code === ca.ca_code) {
      setSelectedCA(null)
    } else {
      fetchCADetail(ca.ca_code)
    }
  }

  const handleCreateCA = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/ca-create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      })

      const result = await response.json()
      if (result.success) {
        alert('Cash Advance berhasil dibuat')
        setForm({
          purpose: '',
          total_amount: 0,
          request_date: new Date().toISOString().split('T')[0],
          project_code: ''
        })
        setActiveTab('history')
        fetchMyCashAdvances()
      } else {
        alert(result.error || 'Gagal membuat Cash Advance')
      }
    } catch (error) {
      alert('Gagal membuat Cash Advance')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitCA = async (ca_code: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/ca-create', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ca_code, action: 'submit' })
      })

      const result = await response.json()
      if (result.success) {
        alert('Cash Advance berhasil disubmit')
        fetchMyCashAdvances()
        if (selectedCA) {
          fetchCADetail(selectedCA.ca_code)
        }
      } else {
        alert(result.error || 'Gagal submit Cash Advance')
      }
    } catch (error) {
      alert('Gagal submit Cash Advance')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      submitted: 'bg-blue-100 text-blue-800 border-blue-200',
      approved: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      in_settlement: 'bg-purple-100 text-purple-800 border-purple-200',
      completed: 'bg-green-100 text-green-800 border-green-200'
    }
    return colors[status] || colors.draft
  }

  const getStatusText = (status: string) => {
    const texts: { [key: string]: string } = {
      submitted: 'Menunggu Approval',
      approved: 'Disetujui',
      rejected: 'Ditolak',
      active: 'Aktif',
      in_settlement: 'Dalam Settlement',
      completed: 'Selesai'
    }
    return texts[status] || status
  }

  const filteredCA = cashAdvances.filter(ca =>
    ca.ca_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ca.purpose.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredCA.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredCA.length / itemsPerPage)

  const Pagination = () => (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="text-sm text-gray-600">
        Menampilkan {indexOfFirstItem + 1} sampai {Math.min(indexOfLastItem, filteredCA.length)} dari {filteredCA.length} hasil
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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cash Advance</h1>
            <p className="text-gray-600">Kelola pengajuan dan riwayat Cash Advance</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex space-x-8">
            <button
              className={`pb-4 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'create'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('create')}
            >
              Buat Cash Advance Baru
            </button>
            <button
              className={`pb-4 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('history')}
            >
              Riwayat Cash Advance
            </button>
          </div>
        </div>

        {activeTab === 'create' && (
          <Card>
            <CardHeader>
              <CardTitle>Buat Cash Advance Baru</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Purpose *</label>
                  <Input
                    placeholder="Tujuan penggunaan cash advance"
                    value={form.purpose}
                    onChange={(e) => setForm(prev => ({ ...prev, purpose: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Total Amount *</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.total_amount}
                    onChange={(e) => setForm(prev => ({ ...prev, total_amount: Number(e.target.value) }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Request Date *</label>
                  <Input
                    type="date"
                    value={form.request_date}
                    onChange={(e) => setForm(prev => ({ ...prev, request_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Project (Optional)</label>
                  <select
                    value={form.project_code}
                    onChange={(e) => setForm(prev => ({ ...prev, project_code: e.target.value }))}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Pilih Project</option>
                    {projects.map(project => (
                      <option key={project.project_code} value={project.project_code}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleCreateCA}
                  disabled={loading || !form.purpose || !form.total_amount || !form.request_date}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Buat Cash Advance
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setForm({
                    purpose: '',
                    total_amount: 0,
                    request_date: new Date().toISOString().split('T')[0],
                    project_code: ''
                  })}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'history' && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

             
              <Card className="bg-white border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active CA</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <User className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold text-gray-900">{formatRupiah(stats.totalAmount)}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <DollarSign className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* CA Table */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex flex-col sm:flex-row gap-3 flex-1">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Cari CA number atau purpose..."
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
                        setStatusFilter(e.target.value as 'all' | 'submitted' | 'approved'  | 'rejected' | 'active'  | 'in_settlement'   | 'completed' )
                        setCurrentPage(1)
                      }}
                      className="border rounded-md px-3 py-2 text-sm"
                    >  

                      <option value="all">Semua Status</option>
                      <option value="submitted">Menunggu Approval</option>
                      <option value="approved">Disetujui</option>
                      <option value="rejected">ditolak</option>
                      <option value="active">Aktif</option>
                      <option value="completed">Completed</option>
                      <option value="settlement">In Settlement</option>
                    </select>
                  </div>
                  
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => setActiveTab('create')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Cash Advance Baru
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>CA Number</TableHead>
                          <TableHead>Purpose</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Request Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentItems.map((ca) => (
                          <TableRow 
                            key={ca.ca_code} 
                            className={`hover:bg-gray-50 cursor-pointer ${
                              selectedCA?.ca_code === ca.ca_code ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                            }`}
                            onClick={() => handleRowClick(ca)}
                          >
                            <TableCell className="font-semibold">
                              {ca.ca_code}
                            </TableCell>
                            <TableCell className="max-w-[300px]">
                              <div className="font-medium">{ca.purpose}</div>
                              <div className="text-sm text-gray-500">{ca.department}</div>
                              {ca.project_code && (
                                <div className="text-xs text-blue-600 mt-1">
                                  Project: {ca.project_code}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatRupiah(ca.total_amount)}
                            </TableCell>
                            <TableCell>{formatDateDisplay(ca.request_date)}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(ca.status)} variant="outline">
                                {getStatusText(ca.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRowClick(ca)
                                  }}
                                  disabled={detailLoading === ca.ca_code}
                                >
                                  {detailLoading === ca.ca_code ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Eye className="h-4 w-4 mr-1" />
                                  )}
                                  Detail
                                </Button>
                                
                                
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {filteredCA.length === 0 && !loading && (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada Cash Advance</h3>
                        <p className="text-gray-500 mb-4">
                          {searchTerm || statusFilter !== 'all' 
                            ? 'Coba ubah pencarian atau filter Anda' 
                            : "Anda belum memiliki Cash Advance"}
                        </p>
                        {!searchTerm && statusFilter === 'all' && (
                          <Button 
                            onClick={() => setActiveTab('create')}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Buat Cash Advance Pertama
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {filteredCA.length > 0 && <Pagination />}
              </CardContent>
            </Card>

            {/* Detail Panel */}
            {selectedCA && (
              <Card className="border-blue-200 border-2">
                <CardHeader className="bg-blue-50 border-b border-blue-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Detail Cash Advance</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{selectedCA.ca_code}</p>
                    </div>
                    <Badge className={getStatusColor(selectedCA.status)}>
                      {getStatusText(selectedCA.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Purpose</label>
                        <p className="font-semibold mt-1">{selectedCA.purpose}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Department</label>
                        <p className="font-semibold mt-1">{selectedCA.department}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Request Date</label>
                        <p className="font-semibold mt-1">{formatDateDisplay(selectedCA.request_date)}</p>
                      </div>
                      {selectedCA.project_code && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Project</label>
                          <p className="font-semibold mt-1">{selectedCA.project_code}</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Total Amount</label>
                        <p className="font-semibold text-lg text-green-600 mt-1">
                          {formatRupiah(selectedCA.total_amount)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Used Amount</label>
                        <p className="font-semibold mt-1">{formatRupiah(selectedCA.used_amount)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Remaining Amount</label>
                        <p className="font-semibold mt-1">{formatRupiah(selectedCA.remaining_amount)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Created By</label>
                        <p className="font-semibold mt-1">{selectedCA.created_by}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex gap-2">
                      {(selectedCA.status !== 'submitted' && selectedCA.status !== 'rejected') && (
                        <Button 
                          variant="outline"
                          className="border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                          Lihat Transactions
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}