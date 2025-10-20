"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Search, FileText, DollarSign, Calculator, Upload, Download, CheckCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface CashAdvance {
  ca_code: string
  employee_name: string
  purpose: string
  total_amount: number
  used_amount: number
  remaining_amount: number
  status: string
}

interface Transaction {
  transaction_code: string
  transaction_date: string
  description: string
  category: string
  amount: number
  receipt_filename: string
  receipt_path: string
}

interface SettlementData {
  cash_advance: CashAdvance
  transactions: Transaction[]
  settlement: any
}

export default function CASettlementPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCA, setSelectedCA] = useState<CashAdvance | null>(null)
  const [settlementData, setSettlementData] = useState<SettlementData | null>(null)
  const [cashAdvances, setCashAdvances] = useState<CashAdvance[]>([])
  const [refundProof, setRefundProof] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const itemsPerPage = 8

  useEffect(() => {
    fetchSettlementCAs()
  }, [])

  const fetchSettlementCAs = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/ca-settlement', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) throw new Error('Failed to fetch data')
      
      const result = await response.json()
      if (result.success) {
        setCashAdvances(result.data || [])
      } else {
        throw new Error(result.error || 'Failed to fetch data')
      }
    } catch (error) {
      console.error('Error fetching settlement CAs:', error)
      alert('Gagal memuat data Cash Advance')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCA = async (ca: CashAdvance) => {
    setSelectedCA(ca)
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/ca-settlement?ca_code=${ca.ca_code}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) throw new Error('Failed to fetch settlement data')
      
      const result = await response.json()
      if (result.success) {
        setSettlementData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch settlement data')
      }
    } catch (error) {
      console.error('Error fetching settlement detail:', error)
      alert('Gagal memuat detail settlement')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File terlalu besar. Maksimal 5MB')
        return
      }
      setRefundProof(file)
    }
  }

  const handleSubmitSettlement = async () => {
    if (!selectedCA || !settlementData) return

    // Validate refund proof for remaining amount
    if (selectedCA.remaining_amount > 0 && !refundProof) {
      alert('Harap upload bukti refund untuk sisa dana')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('data', JSON.stringify({
        ca_code: selectedCA.ca_code,
        settlement_date: new Date().toISOString().split('T')[0]
      }))

      if (refundProof) {
        formData.append('refund_proof', refundProof)
      }

      const token = localStorage.getItem('token')
      const response = await fetch('/api/ca-settlement', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const result = await response.json()
      if (result.success) {
        alert(result.message)
        // Reset and refresh
        setSelectedCA(null)
        setSettlementData(null)
        setRefundProof(null)
        await fetchSettlementCAs()
      } else {
        alert(result.error || 'Gagal submit settlement')
      }
    } catch (error) {
      console.error('Error submitting settlement:', error)
      alert('Gagal submit settlement')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadReceipt = (transaction: Transaction) => {
    if (transaction.receipt_path) {
      window.open(transaction.receipt_path, '_blank')
    }
  }

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
            <h1 className="text-2xl font-bold text-gray-900">CA Settlement (LPJ)</h1>
            <p className="text-gray-600">Laporan Pertanggungjawaban Cash Advance</p>
          </div>
        </div>

        {/* CA Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Pilih Cash Advance untuk Settlement</CardTitle>
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
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentItems.map((ca) => (
                        <TableRow key={ca.ca_code} className="hover:bg-gray-50">
                          <TableCell className="font-semibold">
                            {ca.ca_code}
                          </TableCell>
                          <TableCell>{ca.employee_name}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={ca.purpose}>
                            {ca.purpose}
                          </TableCell>
                          <TableCell className="font-semibold">
                            Rp {ca.total_amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            Rp {ca.used_amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className={`font-semibold ${
                              ca.remaining_amount >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              Rp {Math.abs(ca.remaining_amount).toLocaleString()}
                              {ca.remaining_amount >= 0 ? ' (Kembali)' : ' (Kurang)'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              ca.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                              ca.status === 'in_settlement' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              'bg-blue-100 text-blue-800 border-blue-200'
                            }>
                              {ca.status === 'active' ? 'Aktif' : 
                               ca.status === 'in_settlement' ? 'Dalam Settlement' : 
                               ca.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              onClick={() => handleSelectCA(ca)}
                              variant={selectedCA?.ca_code === ca.ca_code ? "default" : "outline"}
                              disabled={ca.status === 'completed'}
                            >
                              {selectedCA?.ca_code === ca.ca_code ? 'Selected' : 'Settle'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {filteredCA.length > 0 && <Pagination />}
              </>
            )}
          </CardContent>
        </Card>

        {/* Settlement Details - Only show when CA is selected */}
        {selectedCA && settlementData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Transactions Summary */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Ringkasan Transaksi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Deskripsi</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Receipt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {settlementData.transactions.map((transaction) => (
                          <TableRow key={transaction.transaction_code}>
                            <TableCell>{transaction.transaction_date}</TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell>
                              <Badge className={getCategoryColor(transaction.category)}>
                                {transaction.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">
                              Rp {transaction.amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {transaction.receipt_path && (
                                <Button variant="ghost" size="sm" onClick={() => handleDownloadReceipt(transaction)}>
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              )}
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
                    Perhitungan Settlement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total CA Amount:</span>
                      <span className="font-semibold">Rp {settlementData.cash_advance.total_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Used:</span>
                      <span className="font-semibold">Rp {settlementData.cash_advance.used_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600">Sisa Amount:</span>
                      <span className={`font-semibold ${
                        settlementData.cash_advance.remaining_amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Rp {Math.abs(settlementData.cash_advance.remaining_amount).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Refund Section - Only show if there's remaining amount */}
                  {settlementData.cash_advance.remaining_amount > 0 && (
                    <div className="border-t pt-4">
                      <Label className="text-sm font-medium mb-3 block">Bukti Refund</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                        {refundProof ? (
                          <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-green-600" />
                              <span className="text-sm">{refundProof.name}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setRefundProof(null)}>
                              Hapus
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
                              Upload Bukti Refund
                            </Button>
                            <input
                              ref={fileInputRef}
                              type="file"
                              className="hidden"
                              onChange={handleFileUpload}
                              accept=".pdf,.jpg,.jpeg,.png"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                              Upload bukti transfer kembali sebesar Rp {settlementData.cash_advance.remaining_amount.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Additional Payment Section - If used amount exceeds CA */}
                  {settlementData.cash_advance.remaining_amount < 0 && (
                    <div className="border-t pt-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-sm font-medium">Pembayaran Tambahan Diperlukan</span>
                        </div>
                        <p className="text-sm text-yellow-700 mt-1">
                          Kekurangan sebesar Rp {Math.abs(settlementData.cash_advance.remaining_amount).toLocaleString()} akan dibayarkan ke karyawan.
                        </p>
                      </div>
                    </div>
                  )}

                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleSubmitSettlement}
                    disabled={submitting || (settlementData.cash_advance.remaining_amount > 0 && !refundProof)}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {submitting ? 'Processing...' : 'Submit Settlement'}
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