"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Upload, FileText, Trash2, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface CashAdvance {
  ca_code: string
  employee_name: string
  purpose: string
  total_amount: number | string
  used_amount: number | string
  remaining_amount: number | string
  status: string
}

interface Transaction {
  transaction_code: string
  transaction_date: string
  description: string
  category: string
  amount: number | string
  receipt_filename: string
  receipt_path: string
  created_at: string
}

interface Category {
  value: string
  label: string
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

export default function CATransactionsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCA, setSelectedCA] = useState<CashAdvance | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [cashAdvances, setCashAdvances] = useState<CashAdvance[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [newTransaction, setNewTransaction] = useState({
    transaction_date: '',
    description: '',
    category: '',
    amount: 0,
    receipt: null as File | null
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const itemsPerPage = 8

  // Get category color
  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      transportation: 'bg-blue-100 text-blue-800 border-blue-200',
      accommodation: 'bg-green-100 text-green-800 border-green-200',
      meals: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      entertainment: 'bg-purple-100 text-purple-800 border-purple-200',
      office_supplies: 'bg-gray-100 text-gray-800 border-gray-200',
      other: 'bg-orange-100 text-orange-800 border-orange-200'
    }
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  // Get error message in Bahasa
  const getErrorMessage = (error: string) => {
    const messages: { [key: string]: string } = {
      'Insufficient balance': 'Saldo CA tidak cukup',
      'Cash Advance not found': 'Cash Advance tidak ditemukan',
      'All fields are required': 'Semua field harus diisi',
      'Failed to fetch data': 'Gagal memuat data'
    }
    return messages[error] || error
  }

  useEffect(() => {
    fetchDropdownData()
    fetchAvailableCAs()
  }, [])

  const fetchDropdownData = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/ca-transactions?action=dropdowns', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) throw new Error('Failed to fetch dropdowns')
      
      const result = await response.json()
      if (result.success) {
        setCategories(result.data.categories || [])
      } else {
        throw new Error(result.error || 'Failed to fetch dropdown data')
      }
    } catch (error) {
      console.error('Error fetching dropdown data:', error)
      setMessage({ type: 'error', text: 'Gagal memuat data kategori' })
    }
  }

  const fetchAvailableCAs = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/ca-transactions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      
      const result = await response.json()
      if (result.success) {
        setCashAdvances(result.data || [])
      } else {
        throw new Error(result.error || 'Failed to fetch data')
      }
    } catch (error) {
      console.error('Error fetching CAs:', error)
      setMessage({ type: 'error', text: 'Gagal memuat data Cash Advance' })
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async (ca_code: string) => {
    setLoadingTransactions(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/ca-transactions?ca_code=${ca_code}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      
      const result = await response.json()
      if (result.success) {
        setTransactions(result.data || [])
      } else {
        throw new Error(result.error || 'Failed to fetch transactions')
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      setMessage({ type: 'error', text: 'Gagal memuat data transaksi' })
    } finally {
      setLoadingTransactions(false)
    }
  }

  const handleSelectCA = async (ca: CashAdvance) => {
    setSelectedCA(ca)
    await fetchTransactions(ca.ca_code)
  }

  const handleAddTransaction = async () => {
    if (!selectedCA) return

    // Validations
    const today = new Date().toISOString().split('T')[0]
    if (newTransaction.transaction_date > today) {
      setMessage({ type: 'error', text: 'Tanggal tidak boleh lebih dari hari ini' })
      return
    }

    if (newTransaction.amount <= 0) {
      setMessage({ type: 'error', text: 'Amount harus lebih dari 0' })
      return
    }

    if (newTransaction.receipt && newTransaction.receipt.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File terlalu besar. Maksimal 5MB' })
      return
    }

    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      const formData = new FormData()
      formData.append('data', JSON.stringify({
        ca_code: selectedCA.ca_code,
        transaction_date: newTransaction.transaction_date,
        description: newTransaction.description,
        category: newTransaction.category,
        amount: newTransaction.amount
      }))

      if (newTransaction.receipt) {
        formData.append('receipt', newTransaction.receipt)
      }

      const token = localStorage.getItem('token')
      const response = await fetch('/api/ca-transactions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const result = await response.json()

      if (result.success) {
        setMessage({ type: 'success', text: 'Transaksi berhasil ditambahkan!' })
        
        // Refresh data
        await fetchAvailableCAs()
        await fetchTransactions(selectedCA.ca_code)
        
        // Reset form
        setNewTransaction({
          transaction_date: '',
          description: '',
          category: '',
          amount: 0,
          receipt: null
        })
        
        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
          fileInputRef.current.type = 'text'
          fileInputRef.current.type = 'file'
        }
      } else {
        throw new Error(result.error || 'Failed to add transaction')
      }
    } catch (error) {
      console.error('Error adding transaction:', error)
      setMessage({ type: 'error', text: getErrorMessage(error instanceof Error ? error.message : 'Error adding transaction') })
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File terlalu besar. Maksimal 5MB' })
        return
      }
      setNewTransaction(prev => ({ ...prev, receipt: file }))
      setMessage({ type: '', text: '' })
    }
  }

  const handleDownloadReceipt = (transaction: Transaction) => {
    if (transaction.receipt_path) {
      window.open(transaction.receipt_path, '_blank')
    }
  }

  const clearMessage = () => {
    setMessage({ type: '', text: '' })
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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CA Transactions</h1>
            <p className="text-gray-600">Input pengeluaran selama perjalanan dinas</p>
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`p-4 rounded-md ${
            message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : 
            message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 
            'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            <div className="flex justify-between items-center">
              <span>{message.text}</span>
              <Button variant="ghost" size="sm" onClick={clearMessage}>
                ✕
              </Button>
            </div>
          </div>
        )}

        {/* CA Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Pilih Cash Advance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
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

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : (
              <>
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
                        <TableRow key={ca.ca_code} className="hover:bg-gray-50">
                          <TableCell className="font-semibold">{ca.ca_code}</TableCell>
                          <TableCell>{ca.employee_name}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={ca.purpose}>
                            {ca.purpose}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatRupiah(ca.total_amount)}
                          </TableCell>
                          <TableCell>{formatRupiah(ca.used_amount)}</TableCell>
                          <TableCell>
                            <div className={`font-semibold ${
                              (typeof ca.remaining_amount === 'string' ? parseFloat(ca.remaining_amount) : ca.remaining_amount) < 
                              (typeof ca.total_amount === 'string' ? parseFloat(ca.total_amount) : ca.total_amount) * 0.2 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {formatRupiah(ca.remaining_amount)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              onClick={() => handleSelectCA(ca)}
                              variant={selectedCA?.ca_code === ca.ca_code ? "default" : "outline"}
                              disabled={(typeof ca.remaining_amount === 'string' ? parseFloat(ca.remaining_amount) : ca.remaining_amount) <= 0}
                              className={selectedCA?.ca_code === ca.ca_code ? "bg-blue-600 hover:bg-blue-700" : ""}
                            >
                              {selectedCA?.ca_code === ca.ca_code ? 'Selected' : 'Select'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {filteredCA.length === 0 && !loading && (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900">Tidak ada Cash Advance</h3>
                      <p className="text-gray-500">
                        {searchTerm ? 'Coba ubah pencarian Anda' : 'Tidak ada CA yang aktif'}
                      </p>
                    </div>
                  )}
                </div>
                
                {filteredCA.length > 0 && <Pagination />}
              </>
            )}
          </CardContent>
        </Card>

        {/* Transaction Input - Only show when CA is selected */}
        {selectedCA && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Tambah Transaksi - {selectedCA.ca_code}</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  Sisa: {formatRupiah(selectedCA.remaining_amount)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Tanggal</Label>
                  <Input
                    type="date"
                    value={newTransaction.transaction_date}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, transaction_date: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label>Kategori</Label>
                  <select
                    value={newTransaction.category}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border rounded-md px-3 py-2"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    min="1"
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
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setNewTransaction(prev => ({ ...prev, receipt: null }))}
                        >
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
                        <p className="text-xs text-gray-500 mt-2">Maks. 5MB</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label>Deskripsi</Label>
                <Textarea
                  placeholder="Masukkan deskripsi transaksi..."
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleAddTransaction}
                  disabled={
                    !newTransaction.transaction_date || 
                    !newTransaction.description || 
                    !newTransaction.category || 
                    !newTransaction.amount ||
                    submitting
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {submitting ? 'Menambah...' : 'Tambah Transaksi'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions List - Only show when CA is selected */}
        {selectedCA && (transactions.length > 0 || loadingTransactions) && (
          <Card>
            <CardHeader>
              <CardTitle>Daftar Transaksi - {selectedCA.ca_code}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTransactions ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Dibuat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.transaction_code}>
                        <TableCell>{transaction.transaction_date}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(transaction.category)}>
                            {categories.find(cat => cat.value === transaction.category)?.label || transaction.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatRupiah(transaction.amount)}
                        </TableCell>
                        <TableCell>
                          {transaction.receipt_path && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDownloadReceipt(transaction)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(transaction.created_at).toLocaleDateString('id-ID')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}