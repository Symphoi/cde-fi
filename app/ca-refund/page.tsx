"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Search, FileText, DollarSign, Calculator, Upload, Download, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useRef } from 'react'

interface CashAdvance {
  id: string
  caNumber: string
  employee: string
  purpose: string
  totalAmount: number
  usedAmount: number
  remainingAmount: number
  status: 'active' | 'in_settlement' | 'completed'
}

interface CATransaction {
  id: string
  date: string
  description: string
  category: string
  amount: number
  receipt: string
}

export default function CASettlementPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCA, setSelectedCA] = useState<CashAdvance | null>(null)
  const [refundProof, setRefundProof] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const itemsPerPage = 8

  // Sample data
  const cashAdvances: CashAdvance[] = [
    {
      id: '1',
      caNumber: 'CA-2024-001',
      employee: 'Budi Santoso',
      purpose: 'Perjalanan dinas ke Surabaya',
      totalAmount: 10000000,
      usedAmount: 8500000,
      remainingAmount: 1500000,
      status: 'in_settlement'
    },
    {
      id: '2',
      caNumber: 'CA-2024-002',
      employee: 'Sari Dewi',
      purpose: 'Meeting dengan client Jakarta',
      totalAmount: 5000000,
      usedAmount: 5200000,
      remainingAmount: -200000,
      status: 'active'
    }
  ]

  // Sample transactions for selected CA
  const transactions: CATransaction[] = selectedCA ? [
    {
      id: '1',
      date: '2024-01-25',
      description: 'Tiket pesawat Surabaya',
      category: 'Transportation',
      amount: 2500000,
      receipt: 'tiket.pdf'
    },
    {
      id: '2',
      date: '2024-01-26',
      description: 'Hotel 3 malam',
      category: 'Accommodation',
      amount: 3000000,
      receipt: 'hotel.pdf'
    },
    {
      id: '3',
      date: '2024-01-27',
      description: 'Transportasi lokal',
      category: 'Transportation',
      amount: 500000,
      receipt: 'transport.pdf'
    },
    {
      id: '4',
      date: '2024-01-28',
      description: 'Makan dan konsumsi',
      category: 'Meals',
      amount: 1500000,
      receipt: 'makan.pdf'
    },
    {
      id: '5',
      date: '2024-01-29',
      description: 'Meeting expenses',
      category: 'Entertainment',
      amount: 1000000,
      receipt: 'meeting.pdf'
    }
  ] : []

  const filteredCA = cashAdvances.filter(ca => 
    ca.caNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ca.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ca.purpose.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredCA.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredCA.length / itemsPerPage)

  const handleSelectCA = (ca: CashAdvance) => {
    setSelectedCA(ca)
    setRefundAmount(Math.max(0, ca.remainingAmount))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setRefundProof(file)
    }
  }

  const handleSubmitSettlement = () => {
    if (!selectedCA) return

    if (selectedCA.remainingAmount > 0 && !refundProof) {
      alert('Please upload refund proof for remaining amount')
      return
    }

    console.log('Submitting settlement for:', selectedCA.caNumber)
    alert(`Settlement for ${selectedCA.caNumber} submitted successfully!`)
    
    // Reset form
    setSelectedCA(null)
    setRefundProof(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CA Settlement (LPJ)</h1>
            <p className="text-gray-600">Laporan Pertanggungjawaban Cash Advance</p>
          </div>
        </div>

        {/* CA Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Cash Advance for Settlement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
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

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CA Number</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Used Amount</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((ca) => (
                    <TableRow key={ca.id} className="hover:bg-gray-50">
                      <TableCell className="font-semibold">
                        {ca.caNumber}
                      </TableCell>
                      <TableCell>{ca.employee}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={ca.purpose}>
                        {ca.purpose}
                      </TableCell>
                      <TableCell className="font-semibold">
                        Rp {ca.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        Rp {ca.usedAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className={`font-semibold ${
                          ca.remainingAmount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          Rp {Math.abs(ca.remainingAmount).toLocaleString()}
                          {ca.remainingAmount >= 0 ? ' (Kembali)' : ' (Kurang)'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          ca.status === 'active' ? 'bg-green-100 text-green-800' :
                          ca.status === 'in_settlement' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {ca.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          onClick={() => handleSelectCA(ca)}
                          variant={selectedCA?.id === ca.id ? "default" : "outline"}
                          disabled={ca.status === 'completed'}
                        >
                          {selectedCA?.id === ca.id ? 'Selected' : 'Settle'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {filteredCA.length > 0 && <Pagination />}
          </CardContent>
        </Card>

        {/* Settlement Details - Only show when CA is selected */}
        {selectedCA && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Transactions Summary */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Transactions Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Receipt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{transaction.date}</TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{transaction.category}</Badge>
                            </TableCell>
                            <TableCell className="font-semibold">
                              Rp {transaction.amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Settlement Calculation */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Settlement Calculation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total CA Amount:</span>
                      <span className="font-semibold">Rp {selectedCA.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Used:</span>
                      <span className="font-semibold">Rp {selectedCA.usedAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600">Remaining Amount:</span>
                      <span className={`font-semibold ${
                        selectedCA.remainingAmount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Rp {Math.abs(selectedCA.remainingAmount).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Refund Section - Only show if there's remaining amount */}
                  {selectedCA.remainingAmount > 0 && (
                    <div className="border-t pt-4">
                      <Label className="text-sm font-medium mb-3 block">Refund Proof</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                        {refundProof ? (
                          <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-green-600" />
                              <span className="text-sm">{refundProof.name}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setRefundProof(null)}>
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <Button 
                              variant="outline" 
                              onClick={() => fileInputRef.current?.click()}
                              size="sm"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Refund Proof
                            </Button>
                            <input
                              ref={fileInputRef}
                              type="file"
                              className="hidden"
                              onChange={handleFileUpload}
                              accept=".pdf,.jpg,.jpeg,.png"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                              Upload bukti transfer kembali sebesar Rp {selectedCA.remainingAmount.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Additional Payment Section - If used amount exceeds CA */}
                  {selectedCA.remainingAmount < 0 && (
                    <div className="border-t pt-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-sm font-medium">Additional Payment Required</span>
                        </div>
                        <p className="text-sm text-yellow-700 mt-1">
                          Kekurangan sebesar Rp {Math.abs(selectedCA.remainingAmount).toLocaleString()} akan dibayarkan ke karyawan.
                        </p>
                      </div>
                    </div>
                  )}

                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleSubmitSettlement}
                    disabled={selectedCA.remainingAmount > 0 && !refundProof}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Settlement
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}