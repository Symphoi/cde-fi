"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, CheckCircle, XCircle, FileText, ChevronLeft, ChevronRight, DollarSign, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'

interface CashAdvance {
  ca_code: string
  employee_name: string
  department: string
  purpose: string
  total_amount: number
  request_date: string
  project_code?: string
  created_at: string
  submitted_date: string
  submitted_time: string
  days_waiting: number
}

interface Stats {
  pending: number
  totalAmount: number
}

export default function CAApprovalPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [cashAdvances, setCashAdvances] = useState<CashAdvance[]>([])
  const [stats, setStats] = useState<Stats>({ pending: 0, totalAmount: 0 })
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const itemsPerPage = 8

  useEffect(() => {
    fetchPendingApprovals()
  }, [searchTerm])

  const fetchPendingApprovals = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const url = `/api/ca-approval${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) throw new Error('Failed to fetch data')
      
      const result = await response.json()
      if (result.success) {
        setCashAdvances(result.data || [])
        setStats(result.stats || { pending: 0, totalAmount: 0 })
      } else {
        throw new Error(result.error || 'Failed to fetch data')
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error)
      alert('Gagal memuat data persetujuan')
    } finally {
      setLoading(false)
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

      const result = await response.json()
      if (result.success) {
        alert(result.message)
        await fetchPendingApprovals()
      } else {
        alert(result.error || 'Gagal menyetujui Cash Advance')
      }
    } catch (error) {
      alert('Gagal menyetujui Cash Advance')
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

      const result = await response.json()
      if (result.success) {
        alert(result.message)
        await fetchPendingApprovals()
      } else {
        alert(result.error || 'Gagal menolak Cash Advance')
      }
    } catch (error) {
      alert('Gagal menolak Cash Advance')
    } finally {
      setProcessing(null)
    }
  }

  const filteredCA = cashAdvances.filter(ca => 
    ca.ca_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ca.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <Card className="bg-white border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Amount Pending</p>
                  <p className="text-2xl font-bold text-gray-900">Rp {stats.totalAmount.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CA Approval Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Cari CA number, employee, atau purpose..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10"
                />
              </div>
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
                      <TableHead>Employee</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Days Waiting</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.map((ca) => (
                      <TableRow key={ca.ca_code} className="hover:bg-gray-50">
                        <TableCell className="font-semibold">
                          {ca.ca_code}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{ca.employee_name}</div>
                          <div className="text-sm text-gray-500">{ca.department}</div>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate" title={ca.purpose}>
                          {ca.purpose}
                        </TableCell>
                        <TableCell className="font-semibold">
                          Rp {ca.total_amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{ca.request_date}</div>
                          <div className="text-sm text-gray-500">{ca.submitted_time}</div>
                        </TableCell>
                        <TableCell>
                          <div className={`text-sm font-medium ${
                            ca.days_waiting > 2 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {ca.days_waiting}d
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200" variant="outline">
                            Menunggu Approval
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button 
                              onClick={() => handleApprove(ca)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              disabled={processing === ca.ca_code}
                            >
                              {processing === ca.ca_code ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-1" />
                              )}
                              {processing === ca.ca_code ? 'Processing...' : 'Approve'}
                            </Button>
                            <Button 
                              onClick={() => handleReject(ca)}
                              size="sm"
                              variant="destructive"
                              disabled={processing === ca.ca_code}
                            >
                              {processing === ca.ca_code ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4 mr-1" />
                              )}
                              {processing === ca.ca_code ? 'Processing...' : 'Reject'}
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
                    <p className="text-gray-500">
                      {searchTerm ? 'Coba ubah pencarian Anda' : 'Tidak ada CA yang menunggu approval'}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {filteredCA.length > 0 && <Pagination />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}