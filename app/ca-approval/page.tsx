"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, CheckCircle, XCircle, FileText, ChevronLeft, ChevronRight, User, Calendar, DollarSign } from 'lucide-react'
import { useState } from 'react'

interface CashAdvance {
  id: string
  caNumber: string
  employee: string
  department: string
  purpose: string
  amount: number
  requestDate: string
  status: 'submitted' | 'approved' | 'rejected'
  submittedDate: string
  submittedTime: string
  daysWaiting: number
}

export default function CAApprovalPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Sample data
  const cashAdvances: CashAdvance[] = [
    {
      id: '1',
      caNumber: 'CA-2024-001',
      employee: 'Budi Santoso',
      department: 'Sales',
      purpose: 'Perjalanan dinas ke Surabaya untuk meeting client',
      amount: 10000000,
      requestDate: '2024-01-20',
      status: 'submitted',
      submittedDate: '2024-01-20',
      submittedTime: '09:30',
      daysWaiting: 3
    },
    {
      id: '2', 
      caNumber: 'CA-2024-002',
      employee: 'Sari Dewi',
      department: 'Marketing',
      purpose: 'Event launching produk baru di Jakarta',
      amount: 15000000,
      requestDate: '2024-01-21',
      status: 'submitted',
      submittedDate: '2024-01-21',
      submittedTime: '14:15',
      daysWaiting: 2
    }
  ]

  const stats = {
    pending: cashAdvances.length,
    totalAmount: cashAdvances.reduce((sum, ca) => sum + ca.amount, 0)
  }

  const filteredCA = cashAdvances.filter(ca => 
    ca.caNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ca.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ca.purpose.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredCA.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredCA.length / itemsPerPage)

  const handleApprove = (ca: CashAdvance) => {
    console.log('Approving CA:', ca.caNumber)
    alert(`CA ${ca.caNumber} approved!`)
  }

  const handleReject = (ca: CashAdvance) => {
    console.log('Rejecting CA:', ca.caNumber)
    alert(`CA ${ca.caNumber} rejected!`)
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
                  placeholder="Search CA number, employee, or purpose..."
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
                    <TableRow key={ca.id} className="hover:bg-gray-50">
                      <TableCell className="font-semibold">
                        {ca.caNumber}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{ca.employee}</div>
                        <div className="text-sm text-gray-500">{ca.department}</div>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate" title={ca.purpose}>
                        {ca.purpose}
                      </TableCell>
                      <TableCell className="font-semibold">
                        Rp {ca.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{ca.requestDate}</div>
                        <div className="text-sm text-gray-500">{ca.submittedTime}</div>
                      </TableCell>
                      <TableCell>
                        <div className={`text-sm font-medium ${
                          ca.daysWaiting > 2 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {ca.daysWaiting}d
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-800" variant="outline">
                          Waiting Approval
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            onClick={() => handleApprove(ca)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            onClick={() => handleReject(ca)}
                            size="sm"
                            variant="destructive"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {filteredCA.length > 0 && <Pagination />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}