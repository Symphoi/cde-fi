// app/invoice-payment/page.tsx - FIXED JWT VERSION
'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Search, FileText, Eye, Download, Upload, CheckCircle, Calendar, DollarSign, User, Building, Truck, Package, ShoppingCart, Ship, Receipt, CreditCard, Landmark, Banknote, FileIcon, RefreshCw, AlertCircle } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'

// ============================ JWT API SERVICE ============================
class InvoiceService {
  private static getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  private static getAuthHeadersFormData() {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  private static async handleResponse(response: Response) {
    const text = await response.text();
    
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      console.error('Invalid JSON response:', text);
      throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
    }
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  }

  // Get sales orders ready for invoice
  static async getReadySalesOrders(filters: {
    search?: string;
    page?: string;
    limit?: string;
  } = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      params.append('page', filters.page || '1');
      params.append('limit', filters.limit || '10');

      const response = await fetch(`/api/invoice-payment?${params}`, {
        headers: this.getAuthHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Service error in getReadySalesOrders:', error);
      throw error;
    }
  }

  // Process payment and create invoice
  static async processPayment(data: {
    so_code: string;
    invoice_number: string;
    payment_date: string;
    payment_amount: number;
    payment_method: 'transfer' | 'cash' | 'credit_card' | 'other';
    bank_name?: string;
    account_number?: string;
    reference_number: string;
    notes?: string;
  }, paymentProofFile?: File) {
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify(data));
      
      if (paymentProofFile) {
        formData.append('payment_proof', paymentProofFile);
      }

      const response = await fetch('/api/invoice-payment', {
        method: 'POST',
        headers: this.getAuthHeadersFormData(),
        body: formData
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Service error in processPayment:', error);
      throw error;
    }
  }

  // Export invoice data
  static async exportInvoice(so_code: string) {
    try {
      const response = await fetch('/api/invoice-payment', {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ so_code })
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Service error in exportInvoice:', error);
      throw error;
    }
  }
}

// ============================ TYPES ============================
interface SalesOrder {
  id: string
  so_code: string
  date: string
  customer_name: string
  customer_phone: string
  customer_email: string
  billing_address: string
  shipping_address: string
  sales_rep: string
  sales_rep_email: string
  total_amount: number
  tax_amount: number
  shipping_cost: number
  status: 'submitted' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
  notes?: string
  items: OrderItem[]
  taxes: Tax[]
  purchaseOrders: PurchaseOrder[]
  attachments: Attachment[]
  paymentStatus?: 'pending' | 'paid' | 'overdue'
  invoiceNumber?: string
  financialSummary?: {
    totalCost: number
    totalProfit: number
    profitMargin: number
  }
  po_count?: number
  do_count?: number
}

interface OrderItem {
  id: string
  so_item_code: string
  so_code: string
  product_name: string
  product_code: string
  quantity: number
  unit_price: number
  subtotal: number
}

interface Tax {
  id: string
  so_tax_code: string
  so_code: string
  tax_name: string
  tax_rate: number
  tax_amount: number
}

interface Attachment {
  id: string
  attachment_code: string
  so_code: string
  filename: string
  original_filename: string
  file_type: string
  file_size: number
  file_path: string
  uploaded_at: string
}

interface PurchaseOrder {
  id: string
  po_code: string
  so_code: string
  supplier_name: string
  supplier_contact: string
  supplier_bank: string
  total_amount: number
  status: 'submitted' | 'approved_spv' | 'approved_finance' | 'paid' | 'rejected'
  notes?: string
  date: string
  so_reference: string
  submitted_by: string
  submitted_date: string
  submitted_time: string
  items: POItem[]
  payments: Payment[]
  deliveryOrders: DeliveryOrder[]
  do_status: 'not_created' | 'created' | 'shipped' | 'delivered'
  do_code?: string
  delivery_date?: string
}

interface POItem {
  id: string
  po_item_code: string
  po_code: string
  product_name: string
  product_code: string
  quantity: number
  supplier: string
  purchase_price: number
  subtotal: number
  notes?: string
}

interface Payment {
  id: string
  payment_code: string
  po_code: string
  supplier_name: string
  amount: number
  payment_date: string
  payment_method: 'transfer' | 'cash' | 'credit_card' | 'other'
  bank_name?: string
  account_number?: string
  reference_number: string
  notes?: string
  status: 'pending' | 'paid' | 'failed'
}

interface DeliveryOrder {
  id: string
  do_code: string
  so_code: string
  purchase_order_codes: string[]
  courier: string
  tracking_number: string
  shipping_date: string
  shipping_cost: number
  shipping_proof?: string
  status: 'shipping' | 'delivered'
  proof_of_delivery?: string
  received_date?: string
  received_by?: string
  confirmation_method: 'whatsapp' | 'email' | 'call' | 'other'
  notes?: string
}

interface PaymentData {
  invoiceNumber: string
  paymentDate: string
  paymentAmount: number
  paymentMethod: 'transfer' | 'cash' | 'credit_card' | 'other'
  bankName?: string
  accountNumber?: string
  referenceNumber: string
  paymentProof?: File
  notes: string
}

// ============================ MAIN COMPONENT ============================
export default function InvoicePaymentPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null)
  const [selectedRow, setSelectedRow] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [soData, setSoData] = useState<SalesOrder[]>([])
  const [error, setError] = useState<string | null>(null)
  const itemsPerPage = 10

  const paymentProofRef = useRef<HTMLInputElement>(null)

  const [paymentData, setPaymentData] = useState<PaymentData>({
    invoiceNumber: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentAmount: 0,
    paymentMethod: 'transfer',
    bankName: '',
    accountNumber: '',
    referenceNumber: '',
    notes: ''
  })

  // ============================ DATA FETCHING ============================
  const fetchSalesOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await InvoiceService.getReadySalesOrders({
        search: searchTerm,
        page: String(currentPage),
        limit: String(itemsPerPage)
      })

      if (response.success) {
        setSoData(response.data)
      } else {
        throw new Error(response.error || 'Failed to fetch data from API')
      }
    } catch (err: any) {
      console.error('❌ Error fetching sales orders:', err)
      const errorMessage = err.message || 'Gagal memuat data sales orders';
      setError(errorMessage)
      toast.error(errorMessage)
      
      // Set empty data on error
      setSoData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSalesOrders()
  }, [currentPage, searchTerm])

  // ============================ FILTER & PAGINATION ============================
  // Filter: Hanya tampilkan SO delivered yang semua PO-nya paid & delivered
  const readyForInvoiceSO = soData.filter(so => {
    const allPOComplete = so.purchaseOrders.every(po => 
      po.status === 'paid' && 
      po.deliveryOrders.every(doItem => doItem.status === 'delivered')
    )
    return  allPOComplete
  })

  const filteredSO = readyForInvoiceSO.filter(so => {
    return so.so_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
           so.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           so.customer_phone.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredSO.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredSO.length / itemsPerPage)

  // ============================ PAYMENT FUNCTIONS ============================
  // Generate invoice number otomatis
  const generateInvoiceNumber = (soNumber: string) => {
    const date = new Date()
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const seq = '001'
    const uniqueCode = Math.random().toString(36).substr(2, 6).toUpperCase()
    
    return `INV-${soNumber}-${y}-${m}-${d}-${seq}-${uniqueCode}`
  }

  const handlePaymentSubmit = async () => {
    if (!selectedSO) return

    // Validasi
    if (!paymentData.paymentDate || paymentData.paymentAmount <= 0 || !paymentData.referenceNumber) {
      toast.error('Please fill required fields: payment date, amount, and reference number')
      return
    }

    try {
      setLoading(true)
      
      // Generate invoice number jika belum ada
      const invoiceNumber = paymentData.invoiceNumber || generateInvoiceNumber(selectedSO.so_code)
      
      const result = await InvoiceService.processPayment({
        so_code: selectedSO.so_code,
        invoice_number: invoiceNumber,
        payment_date: paymentData.paymentDate,
        payment_amount: paymentData.paymentAmount,
        payment_method: paymentData.paymentMethod,
        bank_name: paymentData.bankName,
        account_number: paymentData.accountNumber,
        reference_number: paymentData.referenceNumber,
        notes: paymentData.notes
      }, paymentData.paymentProof)

      if (result.success) {
        toast.success(`Payment confirmed! Invoice ${invoiceNumber} has been created.`)
        setShowPaymentForm(false)
        setSelectedSO(null)
        
        // Refresh data
        await fetchSalesOrders()
        
        // Reset payment form
        setPaymentData({
          invoiceNumber: '',
          paymentDate: new Date().toISOString().split('T')[0],
          paymentAmount: 0,
          paymentMethod: 'transfer',
          bankName: '',
          accountNumber: '',
          referenceNumber: '',
          notes: ''
        })
      } else {
        throw new Error(result.error || 'Failed to process payment')
      }
    } catch (error: any) {
      console.error('❌ Error processing payment:', error)
      toast.error(error.message || 'Error processing payment')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPaymentData(prev => ({ ...prev, paymentProof: file }))
    }
  }

  const removePaymentProof = () => {
    setPaymentData(prev => ({ ...prev, paymentProof: undefined }))
  }

  const exportInvoicePDF = async (so: SalesOrder) => {
    if (!so.invoiceNumber) {
      alert('Please process payment first to generate invoice')
      return
    }
    
    try {
      const result = await InvoiceService.exportInvoice(so.so_code)

      if (result.success) {
        // Di sini bisa implementasi generate PDF dengan data dari result.data
        console.log('Export data:', result.data)
        toast.success(`Exporting Invoice ${so.invoiceNumber} to PDF...`)
        
        // Contoh download file (harus implement PDF generation di backend)
        // window.open(`/api/generate-pdf?so_code=${so.so_code}`, '_blank')
      } else {
        throw new Error(result.error || 'Failed to export invoice')
      }
    } catch (error: any) {
      console.error('❌ Error exporting invoice:', error)
      toast.error(error.message || 'Error exporting invoice')
    }
  }

  // ============================ HELPER FUNCTIONS ============================
  const downloadAttachment = (attachment: Attachment) => {
    const fileUrl = `/uploads/${attachment.filename}`
    window.open(fileUrl, '_blank')
  }

  const getStatusColor = (status: string) => {
    const colors = {
      submitted: 'bg-gray-100 text-gray-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-yellow-100 text-yellow-800',
      delivered: 'bg-green-100 text-green-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.submitted
  }

  const getPOStatusColor = (status: string) => {
    const colors = {
      submitted: 'bg-gray-100 text-gray-800',
      approved_spv: 'bg-blue-100 text-blue-800',
      approved_finance: 'bg-green-100 text-green-800',
      paid: 'bg-purple-100 text-purple-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.submitted
  }

  // Function untuk get PO items by SO item
  const getPOItemsBySOItem = (productCode: string, purchaseOrders: PurchaseOrder[]) => {
    const items: (POItem & { poNumber: string; supplier: string })[] = []
    purchaseOrders.forEach(po => {
      po.items.filter(item => item.product_code === productCode).forEach(item => {
        items.push({ 
          ...item, 
          poNumber: po.po_code, 
          supplier: po.supplier_name 
        })
      })
    })
    return items
  }

  // ============================ COMPONENTS ============================
  const Pagination = () => (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="text-sm text-gray-600">
        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredSO.length)} of {filteredSO.length} results
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
          Next
        </Button>
      </div>
    </div>
  )

  // Component untuk timeline process
  const ProcessTimeline = ({ so }: { so: SalesOrder }) => {
    const allDeliveryOrders = so.purchaseOrders.flatMap(po => po.deliveryOrders)
    
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Process Timeline - {so.so_code}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* SALES ORDER SECTION */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div className="w-0.5 h-16 bg-blue-200 mt-2"></div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">Sales Order</h3>
                <Badge className="bg-blue-100 text-blue-800">Created</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-gray-500">SO Number</Label>
                  <p className="font-medium">{so.so_code}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Date</Label>
                  <p className="font-medium">{new Date(so.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Customer</Label>
                  <p className="font-medium">{so.customer_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Sales Rep</Label>
                  <p className="font-medium">{so.sales_rep}</p>
                </div>
              </div>
              
              {/* SO Attachments */}
              {so.attachments && so.attachments.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-medium mb-2 block">Sales Order Documents</Label>
                  <div className="space-y-2">
                    {so.attachments.map((attachment, index) => (
                      <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <FileIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{attachment.original_filename}</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadAttachment(attachment)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* SO Items dengan PO References */}
              <div className="mt-4">
                <Label className="text-sm font-medium mb-2 block">Items & PO Distribution</Label>
                <div className="space-y-3">
                  {so.items.map((item, index) => {
                    const poItems = getPOItemsBySOItem(item.product_code, so.purchaseOrders)
                    return (
                      <div key={item.id} className="p-3 bg-white rounded border">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{item.product_name}</div>
                              <div className="text-sm text-gray-500">{item.product_code}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{item.quantity} pcs</div>
                            <div className="text-sm text-gray-600">Rp {item.unit_price.toLocaleString()}</div>
                          </div>
                        </div>
                        
                        {/* PO Distribution untuk item ini */}
                        {poItems.length > 0 && (
                          <div className="ml-9 mt-2 space-y-2">
                            <div className="text-xs text-gray-500">PO Distribution:</div>
                            {poItems.map((poItem, poIndex) => (
                              <div key={poIndex} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                                <span className="text-blue-600 font-medium">{poItem.poNumber}</span>
                                <span>{poItem.quantity} pcs × Rp {poItem.purchase_price.toLocaleString()}</span>
                                <span className="text-gray-600">{poItem.supplier}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* PURCHASE ORDERS SECTION */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-8 bg-blue-200"></div>
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                <FileText className="h-4 w-4" />
              </div>
              <div className="w-0.5 h-16 bg-green-200 mt-2"></div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">Purchase Orders ({so.purchaseOrders.length})</h3>
                <Badge className="bg-green-100 text-green-800">
                  {so.purchaseOrders.every(po => po.status === 'paid') ? 'All Paid' : 'Processing'}
                </Badge>
              </div>
              
              <div className="space-y-4">
                {so.purchaseOrders.map((po, poIndex) => (
                  <div key={po.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold">{po.po_code}</div>
                        <div className="text-sm text-gray-600">{po.supplier_name}</div>
                        <div className="text-xs text-gray-500">{po.supplier_contact} | {po.supplier_bank}</div>
                      </div>
                      <div className="text-right">
                        <Badge className={getPOStatusColor(po.status)}>
                          {po.status.replace('_', ' ')}
                        </Badge>
                        <div className="text-sm font-medium mt-1">Rp {po.total_amount.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* PO Items */}
                    <div className="mb-3">
                      <Label className="text-sm font-medium mb-2 block">PO Items</Label>
                      <div className="space-y-2">
                        {po.items.map((item, itemIndex) => (
                          <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 bg-gray-200 rounded flex items-center justify-center text-xs">
                                {itemIndex + 1}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{item.product_name}</div>
                                <div className="text-xs text-gray-500">{item.product_code}</div>
                                <div className="text-xs text-blue-600">Supplier: {item.supplier}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">{item.quantity} pcs</div>
                              <div className="text-xs text-gray-600">Rp {item.purchase_price.toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* PO Payment */}
                    {po.payments && po.payments.length > 0 && (
                      <div className="mb-3 p-3 bg-blue-50 rounded border">
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="h-4 w-4 text-blue-600" />
                          <Label className="text-sm font-medium">Payment</Label>
                        </div>
                        {po.payments.map(payment => (
                          <div key={payment.id} className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Code:</span>
                              <span className="font-medium ml-2">{payment.payment_code}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Date:</span>
                              <span className="font-medium ml-2">{new Date(payment.payment_date).toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Method:</span>
                              <span className="font-medium ml-2 capitalize">{payment.payment_method}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Reference:</span>
                              <span className="font-medium ml-2">{payment.reference_number}</span>
                            </div>
                            {payment.bank_name && (
                              <div className="col-span-2">
                                <span className="text-gray-600">Bank:</span>
                                <span className="font-medium ml-2">{payment.bank_name} {payment.account_number}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* DELIVERY ORDERS SECTION */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-8 bg-green-200"></div>
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white">
                <Truck className="h-4 w-4" />
              </div>
              <div className="w-0.5 h-16 bg-purple-200 mt-2"></div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">Delivery Orders ({allDeliveryOrders.length})</h3>
                <Badge className="bg-purple-100 text-purple-800">
                  {allDeliveryOrders.every(doItem => doItem.status === 'delivered') ? 'All Delivered' : 'In Transit'}
                </Badge>
              </div>
              
              <div className="space-y-4">
                {allDeliveryOrders.map((doItem, doIndex) => (
                  <div key={doItem.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold">{doItem.do_code}</div>
                        <div className="text-sm text-gray-600">
                          {doItem.courier} - {doItem.tracking_number}
                        </div>
                        <div className="text-xs text-gray-500">PO: {doItem.purchase_order_codes.join(', ')}</div>
                      </div>
                      <div className="text-right">
                        <Badge className={doItem.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {doItem.status}
                        </Badge>
                        <div className="text-sm mt-1">
                          {doItem.received_date ? new Date(doItem.received_date).toLocaleDateString() : 'Not received'}
                        </div>
                      </div>
                    </div>

                    {/* DO Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <Label className="text-xs text-gray-500">Shipping Date</Label>
                        <p className="font-medium">{new Date(doItem.shipping_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Shipping Cost</Label>
                        <p className="font-medium">Rp {doItem.shipping_cost.toLocaleString()}</p>
                      </div>
                      {doItem.received_by && (
                        <div>
                          <Label className="text-xs text-gray-500">Received By</Label>
                          <p className="font-medium">{doItem.received_by}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-xs text-gray-500">Confirmation Method</Label>
                        <p className="font-medium capitalize">{doItem.confirmation_method}</p>
                      </div>
                      {doItem.notes && (
                        <div className="col-span-2">
                          <Label className="text-xs text-gray-500">Notes</Label>
                          <p className="font-medium">{doItem.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* DO Proofs */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {doItem.shipping_proof && (
                        <div>
                          <Label className="text-xs text-gray-500">Shipping Proof</Label>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(`/uploads/${doItem.shipping_proof}`, '_blank')}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      )}
                      {doItem.proof_of_delivery && (
                        <div>
                          <Label className="text-xs text-gray-500">Proof of Delivery</Label>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(`/uploads/${doItem.proof_of_delivery}`, '_blank')}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FINANCIAL SUMMARY SECTION */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-8 bg-purple-200"></div>
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">Financial Summary</h3>
                <Badge className="bg-orange-100 text-orange-800">Ready for Invoice</Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">Rp {so.total_amount.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Total Sales</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        Rp {so.financialSummary?.totalCost.toLocaleString() || '0'}
                      </div>
                      <div className="text-sm text-gray-600">Total Cost</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        Rp {so.financialSummary?.totalProfit.toLocaleString() || '0'}
                      </div>
                      <div className="text-sm text-gray-600">
                        Profit ({so.financialSummary?.profitMargin.toFixed(2) || '0'}%)
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Taxes */}
              {so.taxes.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-medium mb-2 block">Taxes</Label>
                  <div className="space-y-2">
                    {so.taxes.map(tax => (
                      <div key={tax.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-medium">{tax.tax_name}</span>
                        <span className="text-red-600">
                          Rp {tax.tax_amount.toLocaleString()} ({tax.tax_rate}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ============================ RENDER ============================
  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="mt-4 text-gray-600">Loading sales orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Invoice & Payment</h1>
          <p className="text-gray-600 mt-2">Process customer payments for completed orders</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <div className="font-medium text-red-800">Error</div>
              <div className="text-red-600 text-sm">{error}</div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setError(null)}
              className="ml-auto"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Ready for Invoice Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search SO number or customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {readyForInvoiceSO.length} Ready for Invoice
                </Badge>
              </div>
              <Button 
                variant="outline" 
                onClick={fetchSalesOrders}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SO Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>PO Count</TableHead>
                    <TableHead>Profit Margin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((so) => (
                    <TableRow 
                      key={so.id} 
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedRow === so.so_code ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => setSelectedRow(selectedRow === so.so_code ? null : so.so_code)}
                    >
                      <TableCell className="font-semibold">{so.so_code}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{so.customer_name}</div>
                          <div className="text-sm text-gray-500">{so.customer_phone}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        Rp {so.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {so.po_count || 0} PO
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-green-600">
                            {so.financialSummary?.profitMargin.toFixed(2) || '0'}%
                          </span>
                          <span className="text-sm text-gray-500">
                            (Rp {so.financialSummary?.totalProfit.toLocaleString() || '0'})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(so.status)}>
                          {so.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            onClick={() => exportInvoicePDF(so)}
                            size="sm"
                            variant="outline"
                            disabled={!so.invoiceNumber}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Export PDF
                          </Button>
                          <Button 
                            onClick={() => {
                              setSelectedSO(so)
                              setPaymentData(prev => ({
                                ...prev,
                                invoiceNumber: so.invoiceNumber || generateInvoiceNumber(so.so_code),
                                paymentAmount: so.total_amount,
                                referenceNumber: `PAY-${so.so_code}-${Date.now()}`
                              }))
                              setShowPaymentForm(true)
                            }}
                            size="sm"
                            disabled={so.status === 'completed'}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Process Payment
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredSO.length > 0 && <Pagination />}
            {filteredSO.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No sales orders ready for invoice
              </div>
            )}
          </CardContent>
        </Card>

        {/* Process Timeline Card - MUNCUL DI BAWAH SETELAH CLICK ROW */}
        {selectedRow && (
          <ProcessTimeline so={currentItems.find(so => so.so_code === selectedRow)!} />
        )}

        {/* Payment Form */}
        {showPaymentForm && selectedSO && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Process Payment - {selectedSO.so_code}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Invoice Preview */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Invoice Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm text-gray-600">Invoice Number</Label>
                          <p className="font-mono font-bold text-blue-600">{paymentData.invoiceNumber}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Customer</Label>
                          <p className="font-medium">{selectedSO.customer_name}</p>
                          <p className="text-sm text-gray-500">{selectedSO.customer_email}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Billing Address</Label>
                          <p className="text-sm">{selectedSO.billing_address}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm text-gray-600">SO Date</Label>
                          <p className="font-medium">{new Date(selectedSO.date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Total Amount</Label>
                          <p className="font-bold text-lg">Rp {selectedSO.total_amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Profit Summary</Label>
                          <p className="text-sm">
                            Margin: <span className="text-green-600 font-medium">
                              {selectedSO.financialSummary?.profitMargin.toFixed(2) || '0'}%
                            </span> | 
                            Profit: <span className="text-green-600 font-medium">
                              Rp {selectedSO.financialSummary?.totalProfit.toLocaleString() || '0'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Payment Date *</Label>
                      <Input
                        type="date"
                        value={paymentData.paymentDate}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, paymentDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block">Payment Amount *</Label>
                      <Input
                        type="number"
                        value={paymentData.paymentAmount || ''}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, paymentAmount: parseFloat(e.target.value) || 0 }))}
                        placeholder="Enter payment amount"
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block">Reference Number *</Label>
                      <Input
                        value={paymentData.referenceNumber}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                        placeholder="Payment reference number"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Payment Method *</Label>
                      <select
                        value={paymentData.paymentMethod}
                        onChange={(e) => setPaymentData(prev => ({ 
                          ...prev, 
                          paymentMethod: e.target.value as any 
                        }))}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="transfer">Bank Transfer</option>
                        <option value="cash">Cash</option>
                        <option value="credit_card">Credit Card</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    {paymentData.paymentMethod === 'transfer' && (
                      <>
                        <div>
                          <Label className="mb-2 block">Bank Name</Label>
                          <Input
                            value={paymentData.bankName}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, bankName: e.target.value }))}
                            placeholder="Bank name"
                          />
                        </div>
                        <div>
                          <Label className="mb-2 block">Account Number</Label>
                          <Input
                            value={paymentData.accountNumber}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, accountNumber: e.target.value }))}
                            placeholder="Account number"
                          />
                        </div>
                      </>
                    )}
                    
                    <div>
                      <Label className="mb-2 block">Payment Notes</Label>
                      <Input
                        value={paymentData.notes}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Additional payment notes"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Proof Upload */}
                <div>
                  <Label className="mb-2 block">Payment Proof (Optional)</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    {paymentData.paymentProof ? (
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{paymentData.paymentProof.name}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={removePaymentProof}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <Button 
                          variant="outline" 
                          onClick={() => paymentProofRef.current?.click()}
                          size="sm"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Payment Proof
                        </Button>
                        <input
                          ref={paymentProofRef}
                          type="file"
                          className="hidden"
                          onChange={handlePaymentProofUpload}
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3">
                  <Button 
                    onClick={() => {
                      setShowPaymentForm(false)
                      setSelectedSO(null)
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handlePaymentSubmit}
                    className="flex-1"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Confirm Payment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}