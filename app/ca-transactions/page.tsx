"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Upload, FileText, Trash2, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useRef } from 'react'

interface CATransaction {
  id: string
  date: string
  description: string
  category: string
  amount: number
  receipt: string
  status: 'draft' | 'submitted'
}

interface CashAdvance {
  id: string
  caNumber: string
  employee: string
  purpose: string
  totalAmount: number
  usedAmount: number
  remainingAmount: number
}

export default function CATransactionsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCA, setSelectedCA] = useState<CashAdvance | null>(null)
  const [transactions, setTransactions] = useState<CATransaction[]>([])
  const [newTransaction, setNewTransaction] = useState({
    date: '',
    description: '',
    category: '',
    amount: 0,
    receipt: null as File | null
  })
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
      usedAmount: 0,
      remainingAmount: 10000000
    },
    {
      id: '2',
      caNumber: 'CA-2024-002', 
      employee: 'Sari Dewi',
      purpose: 'Meeting dengan client Jakarta',
      totalAmount: 5000000,
      usedAmount: 0,
      remainingAmount: 5000000
    }
  ]

  const categories = [
    'Transportation',
    'Accommodation',
    'Meals',
    'Entertainment',
    'Office Supplies',
    'Other'
  ]

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
    // In real app, fetch transactions for this CA
  }

  const handleAddTransaction = () => {
    if (!selectedCA) return

    const transaction: CATransaction = {
      id: `trx-${Date.now()}`,
      date: newTransaction.date,
      description: newTransaction.description,
      category: newTransaction.category,
      amount: newTransaction.amount,
      receipt: newTransaction.receipt ? newTransaction.receipt.name : '',
      status: 'draft'
    }

    setTransactions([...transactions, transaction])
    setNewTransaction({
      date: '',
      description: '',
      category: '',
      amount: 0,
      receipt: null
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewTransaction(prev => ({ ...prev, receipt: file }))
    }
  }

  const removeTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id))
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
            <h1 className="text-2xl font-bold text-gray-900">CA Transactions</h1>
            <p className="text-gray-600">Input pengeluaran selama perjalanan dinas</p>
          </div>
        </div>

        {/* CA Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Cash Advance</CardTitle>
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
                          ca.remainingAmount < ca.totalAmount * 0.2 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          Rp {ca.remainingAmount.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          onClick={() => handleSelectCA(ca)}
                          variant={selectedCA?.id === ca.id ? "default" : "outline"}
                        >
                          {selectedCA?.id === ca.id ? 'Selected' : 'Select'}
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

        {/* Transaction Input - Only show when CA is selected */}
        {selectedCA && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Add Transaction - {selectedCA.caNumber}</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  Remaining: Rp {selectedCA.remainingAmount.toLocaleString()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <select
                    value={newTransaction.category}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border rounded-md px-3 py-2"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newTransaction.amount || ''}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Receipt</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-3">
                    {newTransaction.receipt ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{newTransaction.receipt.name}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setNewTransaction(prev => ({ ...prev, receipt: null }))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Button 
                          variant="outline" 
                          onClick={() => fileInputRef.current?.click()}
                          size="sm"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Receipt
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
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Enter transaction description..."
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleAddTransaction}
                  disabled={!newTransaction.date || !newTransaction.description || !newTransaction.category || !newTransaction.amount}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions List - Only show when CA is selected */}
        {selectedCA && transactions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Transactions List</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
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
                        {transaction.receipt && (
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={transaction.status === 'draft' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeTransaction(transaction.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}