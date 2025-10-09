"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, FileText, Calendar, User, DollarSign, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { useState } from 'react'

interface CashAdvance {
  id: string
  caNumber: string
  employee: string
  department: string
  purpose: string
  amount: number
  requestDate: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'in_settlement' | 'completed'
  approvedBy?: string
  approvedDate?: string
  usedAmount?: number
  remainingAmount?: number
}

export default function CashAdvancePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'approved' | 'paid'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Current user data (ini bisa dari context/auth)
  const currentUser = {
    name: 'Budi Santoso',
    department: 'Sales'
  }

  // Sample data - HANYA CA milik user sendiri
  const cashAdvances: CashAdvance[] = [
    {
      id: '1',
      caNumber: 'CA-2024-001',
      employee: currentUser.name, // Selalu pakai nama user sendiri
      department: currentUser.department,
      purpose: 'Perjalanan dinas ke Surabaya meeting client PT. ABC',
      amount: 10000000,
      requestDate: '2024-01-20',
      status: 'submitted',
      usedAmount: 0,
      remainingAmount: 10000000
    },
    {
      id: '2',
      caNumber: 'CA-2024-002',
      employee: currentUser.name, // Selalu pakai nama user sendiri
      department: currentUser.department,
      purpose: 'Kunjungan sales ke Jakarta visit 3 client',
      amount: 5000000,
      requestDate: '2024-01-21',
      status: 'approved',
      approvedBy: 'Manager Finance',
      approvedDate: '2024-01-22',
      usedAmount: 0,
      remainingAmount: 5000000
    },
    {
      id: '3',
      caNumber: 'CA-2024-003',
      employee: currentUser.name, // Selalu pakai nama user sendiri
      department: currentUser.department,
      purpose: 'Training product knowledge di Bandung',
      amount: 7500000,
      requestDate: '2024-01-22',
      status: 'paid',
      approvedBy: 'Manager Finance',
      approvedDate: '2024-01-23',
      usedAmount: 0,
      remainingAmount: 7500000
    },
    {
      id: '4',
      caNumber: 'CA-2024-004',
      employee: currentUser.name,
      department: currentUser.department,
      purpose: 'Perjalanan dinas ke Bali untuk conference tahunan',
      amount: 12000000,
      requestDate: '2024-01-23',
      status: 'draft',
      usedAmount: 0,
      remainingAmount: 12000000
    }
  ]

  // Filter: hanya CA milik user sendiri + search filter
  const userCashAdvances = cashAdvances.filter(ca => ca.employee === currentUser.name)

  const filteredCA = userCashAdvances.filter(ca => {
    const matchesSearch = 
      ca.caNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ca.purpose.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || ca.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const stats = {
    pending: userCashAdvances.filter(ca => ca.status === 'submitted').length,
    approved: userCashAdvances.filter(ca => ca.status === 'approved').length,
    active: userCashAdvances.filter(ca => ca.status === 'paid').length,
    totalAmount: userCashAdvances.filter(ca => ca.status === 'submitted' || ca.status === 'approved' || ca.status === 'paid')
      .reduce((sum, ca) => sum + ca.amount, 0)
  }

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredCA.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredCA.length / itemsPerPage)

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-green-100 text-green-800',
      in_settlement: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800'
    }
    return colors[status as keyof typeof colors] || colors.draft
  }

  const getStatusText = (status: string) => {
    const texts = {
      draft: 'Draft',
      submitted: 'Waiting Approval',
      approved: 'Approved',
      rejected: 'Rejected',
      paid: 'Active',
      in_settlement: 'In Settlement',
      completed: 'Completed'
    }
    return texts[status as keyof typeof texts] || status
  }

  const handleCreateCA = () => {
    // Navigate to create CA form atau open modal
    console.log('Create new CA for:', currentUser.name)
    // Di real app: router.push('/cash-advance/create') atau setShowCreateModal(true)
  }

  const handleViewCA = (ca: CashAdvance) => {
    console.log('View CA:', ca.caNumber)
    // Di real app: router.push(`/cash-advance/${ca.id}`) atau setSelectedCA(ca)
  }

  const handleTransactions = (ca: CashAdvance) => {
    console.log('Go to transactions for:', ca.caNumber)
    // Di real app: router.push(`/cash-advance/transactions?ca=${ca.id}`)
  }

  const Pagination = () => (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="text-sm text-gray-600">
        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredCA.length)} of {filteredCA.length} results
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
        {/* Header dengan info user */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Cash Advance</h1>
            <p className="text-gray-600">Cash Advance requests for {currentUser.name} ({currentUser.department})</p>
          </div>
        </div>

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

          <Card className="bg-white border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Calendar className="h-6 w-6 text-yellow-600" />
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
                  <p className="text-2xl font-bold text-gray-900">Rp {stats.totalAmount.toLocaleString()}</p>
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
                    placeholder="Search CA number or purpose..."
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
                    setStatusFilter(e.target.value as 'all' | 'submitted' | 'approved' | 'paid')
                    setCurrentPage(1)
                  }}
                  className="border rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="submitted">Waiting Approval</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Active</option>
                </select>
              </div>
              
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={handleCreateCA}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Cash Advance
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
                    <TableRow key={ca.id} className="hover:bg-gray-50">
                      <TableCell className="font-semibold">
                        {ca.caNumber}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="font-medium">{ca.purpose}</div>
                        <div className="text-sm text-gray-500">{ca.department}</div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        Rp {ca.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{ca.requestDate}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(ca.status)} variant="outline">
                          {getStatusText(ca.status)}
                        </Badge>
                        {ca.approvedBy && (
                          <div className="text-xs text-gray-500 mt-1">
                            by {ca.approvedBy}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewCA(ca)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          
                          {/* Show Transactions button hanya untuk CA yang active/settlement */}
                          {(ca.status === 'paid' || ca.status === 'in_settlement') && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleTransactions(ca)}
                            >
                              Transactions
                            </Button>
                          )}
                          
                          {/* Edit button untuk draft */}
                          {ca.status === 'draft' && (
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          )}
                          
                          {/* Submit button untuk draft */}
                          {ca.status === 'draft' && (
                            <Button size="sm">
                              Submit
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredCA.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Cash Advance Found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filter' 
                      : "You don't have any Cash Advance requests yet"}
                  </p>
                  {!searchTerm && statusFilter === 'all' && (
                    <Button onClick={handleCreateCA}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Cash Advance
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {filteredCA.length > 0 && <Pagination />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}