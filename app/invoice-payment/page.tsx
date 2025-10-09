// app/invoice-payment/page.tsx - REVISED VERSION
'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Search, FileText, Eye, Download, Upload, CheckCircle, Calendar, DollarSign, User, Building, Truck, Package, ShoppingCart, Ship, Receipt, CreditCard, Landmark, Banknote } from 'lucide-react'
import { useState, useRef } from 'react'

// Extended Type definitions - REAL CASE dengan ITEM → MULTIPLE PO
interface SalesOrder {
  id: string
  soNumber: string
  date: string
  customerName: string
  customerPhone: string
  customerEmail: string
  customerCompany: string
  billingAddress: string
  shippingAddress: string
  salesRep: string
  salesRepEmail: string
  totalAmount: number
  status: 'draft' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'completed'
  items: OrderItem[]
  taxes: Tax[]
  purchaseOrders: PurchaseOrder[]
  deliveryData?: DeliveryData
  paymentStatus?: 'pending' | 'paid' | 'overdue'
  invoiceNumber?: string
  profitMargin: number
  totalProfit: number
  totalCost: number
}

interface OrderItem {
  id: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  subtotal: number
  costPrice?: number
  profit?: number
  poReferences: string[] // Link ke PO yang handle item ini
}

interface Tax {
  id: string
  name: string
  rate: number
  amount: number
}

interface PurchaseOrder {
  id: string
  poNumber: string
  date: string
  supplier: string
  supplierContact: string
  supplierBank: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'
  items: POItem[]
  totalAmount: number
  payment?: Payment
  deliveryOrders?: DeliveryOrder[]
}

interface POItem {
  id: string
  productName: string
  sku: string
  quantity: number
  purchasePrice: number
  subtotal: number
  soReference: string
  soItemId: string // Link ke item di SO
}

interface Payment {
  id: string
  paymentCode: string
  amount: number
  paymentDate: string
  paymentMethod: 'transfer' | 'cash' | 'credit_card' | 'other'
  bankName?: string
  accountNumber?: string
  referenceNumber: string
  status: 'pending' | 'paid' | 'failed'
}

interface DeliveryOrder {
  id: string
  doNumber: string
  date: string
  courier: string
  trackingNumber: string
  shippingDate: string
  shippingCost: number
  receivedDate: string
  confirmationMethod: 'whatsapp' | 'email' | 'call' | 'other'
  clientNotes: string
  status: 'shipped' | 'delivered' | 'completed'
  poReferences: string[]
  items: DOItem[]
}

interface DOItem {
  id: string
  productName: string
  sku: string
  quantity: number
  poReference: string
  soItemId: string
}

interface DeliveryData {
  trackingNumber: string
  courier: string
  shippingDate: string
  shippingCost: number
  receivedDate: string
  confirmationMethod: string
  clientNotes: string
}

interface PaymentData {
  invoiceNumber: string
  paymentDate: string
  paymentAmount: number
  paymentMethod: 'transfer' | 'cash' | 'credit_card' | 'other'
  paymentProof?: File
  notes: string
}

export default function InvoicePaymentPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null)
  const [selectedRow, setSelectedRow] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const paymentProofRef = useRef<HTMLInputElement>(null)

  // Sample data - REAL CASE dengan ITEM → MULTIPLE PO
  const salesOrders: SalesOrder[] = [
    {
      id: '1',
      soNumber: 'SO-2024-001',
      date: '2024-01-15',
      customerName: 'PT. Customer Maju',
      customerPhone: '+62 21 1234 5678',
      customerEmail: 'contact@customermaju.com',
      customerCompany: 'PT. Customer Maju Indonesia',
      billingAddress: 'Jl. Sudirman No. 123, Jakarta Selatan 12190, Indonesia',
      shippingAddress: 'Jl. Sudirman No. 123, Jakarta Selatan 12190, Indonesia',
      salesRep: 'Budi Santoso',
      salesRepEmail: 'budi@company.com',
      totalAmount: 2870000,
      totalCost: 2300000,
      totalProfit: 570000,
      profitMargin: 19.86,
      status: 'delivered',
      paymentStatus: 'pending',
      items: [
        { 
          id: '1', 
          productName: 'Laptop Dell XPS 13', 
          sku: 'LP-DLL-XPS-13', 
          quantity: 2, 
          unitPrice: 1200000, 
          subtotal: 2400000,
          costPrice: 1150000,
          profit: 100000,
          poReferences: ['PO-2024-001-01', 'PO-2024-001-02'] // 1 ITEM → 2 PO
        },
        { 
          id: '2', 
          productName: 'Wireless Mouse', 
          sku: 'ACC-MSE-WRL-01', 
          quantity: 2, 
          unitPrice: 150000, 
          subtotal: 300000,
          costPrice: 125000, 
          profit: 50000,
          poReferences: ['PO-2024-001-01'] // 1 ITEM → 1 PO
        }
      ],
      taxes: [
        { id: '1', name: 'VAT', rate: 10, amount: 270000 }
      ],
      purchaseOrders: [
        {
          id: 'po-1',
          poNumber: 'PO-2024-001-01',
          date: '2024-01-20',
          supplier: 'PT. Supplier Elektronik',
          supplierContact: '+62 21 9876 5432',
          supplierBank: 'BCA 123-456-789',
          status: 'paid',
          items: [
            { 
              id: '1', 
              productName: 'Laptop Dell XPS 13', 
              sku: 'LP-DLL-XPS-13', 
              quantity: 1,  // ← SPLIT QUANTITY: 1 dari 2
              purchasePrice: 1150000, 
              subtotal: 1150000, 
              soReference: 'SO-2024-001',
              soItemId: '1'
            },
            { 
              id: '2', 
              productName: 'Wireless Mouse', 
              sku: 'ACC-MSE-WRL-01', 
              quantity: 2,  // ← FULL QUANTITY
              purchasePrice: 125000, 
              subtotal: 250000, 
              soReference: 'SO-2024-001',
              soItemId: '2'
            }
          ],
          totalAmount: 1400000,
          payment: {
            id: 'pay-1',
            paymentCode: 'PAY-2024-001',
            amount: 1400000,
            paymentDate: '2024-01-22',
            paymentMethod: 'transfer',
            bankName: 'BCA',
            accountNumber: '1234567890',
            referenceNumber: 'TRF-2024-001',
            status: 'paid'
          },
          deliveryOrders: [
            {
              id: 'do-1',
              doNumber: 'DO-2024-001-01',
              date: '2024-01-25',
              courier: 'JNE',
              trackingNumber: 'JNE1234567890',
              shippingDate: '2024-01-25',
              shippingCost: 25000,
              receivedDate: '2024-01-27',
              confirmationMethod: 'whatsapp',
              clientNotes: 'Barang diterima dengan baik',
              status: 'completed',
              poReferences: ['PO-2024-001-01'],
              items: [
                { id: '1', productName: 'Laptop Dell XPS 13', sku: 'LP-DLL-XPS-13', quantity: 1, poReference: 'PO-2024-001-01', soItemId: '1' },
                { id: '2', productName: 'Wireless Mouse', sku: 'ACC-MSE-WRL-01', quantity: 2, poReference: 'PO-2024-001-01', soItemId: '2' }
              ]
            }
          ]
        },
        {
          id: 'po-2',
          poNumber: 'PO-2024-001-02',
          date: '2024-01-21',
          supplier: 'PT. Tech Gadget',
          supplierContact: '+62 21 5555 6666',
          supplierBank: 'Mandiri 987-654-321',
          status: 'paid',
          items: [
            { 
              id: '3', 
              productName: 'Laptop Dell XPS 13', 
              sku: 'LP-DLL-XPS-13', 
              quantity: 1,  // ← SPLIT QUANTITY: 1 dari 2
              purchasePrice: 1150000, 
              subtotal: 1150000, 
              soReference: 'SO-2024-001',
              soItemId: '1'
            }
          ],
          totalAmount: 1150000,
          payment: {
            id: 'pay-2',
            paymentCode: 'PAY-2024-002',
            amount: 1150000,
            paymentDate: '2024-01-23',
            paymentMethod: 'transfer',
            bankName: 'Mandiri',
            accountNumber: '9876543210',
            referenceNumber: 'TRF-2024-002',
            status: 'paid'
          },
          deliveryOrders: [
            {
              id: 'do-2',
              doNumber: 'DO-2024-001-02',
              date: '2024-01-26',
              courier: 'TIKI',
              trackingNumber: 'TIKI987654321',
              shippingDate: '2024-01-26',
              shippingCost: 20000,
              receivedDate: '2024-01-28',
              confirmationMethod: 'email',
              clientNotes: 'Packaging rapi, barang aman',
              status: 'completed',
              poReferences: ['PO-2024-001-02'],
              items: [
                { id: '3', productName: 'Laptop Dell XPS 13', sku: 'LP-DLL-XPS-13', quantity: 1, poReference: 'PO-2024-001-02', soItemId: '1' }
              ]
            }
          ]
        }
      ]
    },
    {
      id: '2',
      soNumber: 'SO-2024-002',
      date: '2024-01-16',
      customerName: 'CV. Berkah Jaya',
      customerPhone: '+62 22 8765 4321',
      customerEmail: 'info@berkahjaya.com',
      customerCompany: 'CV. Berkah Jaya',
      billingAddress: 'Jl. Merdeka No. 45, Bandung 40115, Indonesia',
      shippingAddress: 'Gudang Utama, Jl. Industri No. 78, Bandung 40235, Indonesia',
      salesRep: 'Sari Dewi',
      salesRepEmail: 'sari@company.com',
      totalAmount: 1925000,
      totalCost: 1600000,
      totalProfit: 325000,
      profitMargin: 16.88,
      status: 'delivered',
      paymentStatus: 'pending',
      items: [
        { 
          id: '1', 
          productName: 'Monitor 24" Samsung', 
          sku: 'MON-24-SAM-FHD', 
          quantity: 5, 
          unitPrice: 350000, 
          subtotal: 1750000,
          costPrice: 320000,
          profit: 150000,
          poReferences: ['PO-2024-002-01']
        }
      ],
      taxes: [
        { id: '1', name: 'VAT', rate: 10, amount: 175000 }
      ],
      purchaseOrders: [
        {
          id: 'po-3',
          poNumber: 'PO-2024-002-01',
          date: '2024-01-22',
          supplier: 'CV. Komputer Mandiri',
          supplierContact: '+62 22 5555 6666',
          supplierBank: 'Mandiri 987-654-321',
          status: 'paid',
          items: [
            { 
              id: '1', 
              productName: 'Monitor 24" Samsung', 
              sku: 'MON-24-SAM-FHD', 
              quantity: 5, 
              purchasePrice: 320000, 
              subtotal: 1600000, 
              soReference: 'SO-2024-002',
              soItemId: '1'
            }
          ],
          totalAmount: 1600000,
          payment: {
            id: 'pay-3',
            paymentCode: 'PAY-2024-003',
            amount: 1600000,
            paymentDate: '2024-01-24',
            paymentMethod: 'transfer',
            bankName: 'Mandiri',
            accountNumber: '9876543210',
            referenceNumber: 'TRF-2024-003',
            status: 'paid'
          },
          deliveryOrders: [
            {
              id: 'do-3',
              doNumber: 'DO-2024-002-01',
              date: '2024-01-26',
              courier: 'TIKI',
              trackingNumber: 'TIKI987654321',
              shippingDate: '2024-01-26',
              shippingCost: 35000,
              receivedDate: '2024-01-28',
              confirmationMethod: 'email',
              clientNotes: 'Semua barang sesuai pesanan',
              status: 'completed',
              poReferences: ['PO-2024-002-01'],
              items: [
                { id: '1', productName: 'Monitor 24" Samsung', sku: 'MON-24-SAM-FHD', quantity: 5, poReference: 'PO-2024-002-01', soItemId: '1' }
              ]
            }
          ]
        }
      ]
    }
  ]

  const [soData, setSoData] = useState<SalesOrder[]>(salesOrders)
  const [paymentData, setPaymentData] = useState<PaymentData>({
    invoiceNumber: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentAmount: 0,
    paymentMethod: 'transfer',
    notes: ''
  })

  // Filter: Hanya tampilkan SO delivered yang semua PO-nya paid & delivered
  const readyForInvoiceSO = soData.filter(so => {
    const allPOComplete = so.purchaseOrders.every(po => 
      po.status === 'paid' && 
      po.deliveryOrders?.every(doItem => doItem.status === 'completed')
    )
    return so.status === 'delivered' && so.paymentStatus === 'pending' && allPOComplete
  })

  const filteredSO = readyForInvoiceSO.filter(so => {
    return so.soNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
           so.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           so.customerPhone.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredSO.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredSO.length / itemsPerPage)

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

  const handlePaymentSubmit = () => {
    if (!selectedSO) return

    // Validasi
    if (!paymentData.paymentDate || paymentData.paymentAmount <= 0) {
      alert('Please fill payment date and amount')
      return
    }

    // Generate invoice number jika belum ada
    const invoiceNumber = paymentData.invoiceNumber || generateInvoiceNumber(selectedSO.soNumber)

    // Update SO status
    const updatedSOs = soData.map(so => 
      so.id === selectedSO.id ? {
        ...so,
        paymentStatus: 'paid' as const,
        invoiceNumber,
        status: 'completed' as const
      } : so
    )

    setSoData(updatedSOs)
    alert(`Payment confirmed! Invoice ${invoiceNumber} has been created.`)
    setShowPaymentForm(false)
    setSelectedSO(null)
    
    // Reset payment form
    setPaymentData({
      invoiceNumber: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentAmount: 0,
      paymentMethod: 'transfer',
      notes: ''
    })
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

  const exportInvoicePDF = (so: SalesOrder) => {
    if (!so.invoiceNumber) {
      alert('Please process payment first to generate invoice')
      return
    }
    
    console.log('Exporting Invoice PDF:', so.invoiceNumber)
    alert(`Exporting Invoice ${so.invoiceNumber} to PDF...`)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      confirmed: 'bg-blue-100 text-blue-800',
      shipped: 'bg-yellow-100 text-yellow-800',
      delivered: 'bg-green-100 text-green-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.draft
  }

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  // Function untuk get PO items by SO item
  const getPOItemsBySOItem = (soItemId: string, purchaseOrders: PurchaseOrder[]) => {
    const items: (POItem & { poNumber: string; supplier: string })[] = []
    purchaseOrders.forEach(po => {
      po.items.filter(item => item.soItemId === soItemId).forEach(item => {
        items.push({ ...item, poNumber: po.poNumber, supplier: po.supplier })
      })
    })
    return items
  }

  // Component untuk timeline process - MUNCUL DI BAWAH CARD
  const ProcessTimeline = ({ so }: { so: SalesOrder }) => {
    const allDeliveryOrders = so.purchaseOrders.flatMap(po => po.deliveryOrders || [])
    
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Process Timeline - {so.soNumber}
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
                  <p className="font-medium">{so.soNumber}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Date</Label>
                  <p className="font-medium">{so.date}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Customer</Label>
                  <p className="font-medium">{so.customerName}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Sales Rep</Label>
                  <p className="font-medium">{so.salesRep}</p>
                </div>
              </div>
              
              {/* SO Items dengan PO References */}
              <div className="mt-4">
                <Label className="text-sm font-medium mb-2 block">Items & PO Distribution</Label>
                <div className="space-y-3">
                  {so.items.map((item, index) => {
                    const poItems = getPOItemsBySOItem(item.id, so.purchaseOrders)
                    return (
                      <div key={item.id} className="p-3 bg-white rounded border">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{item.productName}</div>
                              <div className="text-sm text-gray-500">{item.sku}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{item.quantity} pcs</div>
                            <div className="text-sm text-gray-600">Rp {item.unitPrice.toLocaleString()}</div>
                          </div>
                        </div>
                        
                        {/* PO Distribution untuk item ini */}
                        <div className="ml-9 mt-2 space-y-2">
                          <div className="text-xs text-gray-500">PO Distribution:</div>
                          {poItems.map((poItem, poIndex) => (
                            <div key={poIndex} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                              <span className="text-blue-600 font-medium">{poItem.poNumber}</span>
                              <span>{poItem.quantity} pcs × Rp {poItem.purchasePrice.toLocaleString()}</span>
                              <span className="text-gray-600">{poItem.supplier}</span>
                            </div>
                          ))}
                        </div>
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
                        <div className="font-semibold">{po.poNumber}</div>
                        <div className="text-sm text-gray-600">{po.supplier}</div>
                        <div className="text-xs text-gray-500">{po.supplierContact} | {po.supplierBank}</div>
                      </div>
                      <div className="text-right">
                        <Badge className={po.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {po.status}
                        </Badge>
                        <div className="text-sm font-medium mt-1">Rp {po.totalAmount.toLocaleString()}</div>
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
                                <div className="font-medium text-sm">{item.productName}</div>
                                <div className="text-xs text-gray-500">{item.sku}</div>
                                <div className="text-xs text-blue-600">SO Item ID: {item.soItemId}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">{item.quantity} pcs</div>
                              <div className="text-xs text-gray-600">Rp {item.purchasePrice.toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* PO Payment */}
                    {po.payment && (
                      <div className="mb-3 p-3 bg-blue-50 rounded border">
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="h-4 w-4 text-blue-600" />
                          <Label className="text-sm font-medium">Payment</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Code:</span>
                            <span className="font-medium ml-2">{po.payment.paymentCode}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Date:</span>
                            <span className="font-medium ml-2">{po.payment.paymentDate}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Method:</span>
                            <span className="font-medium ml-2 capitalize">{po.payment.paymentMethod}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Reference:</span>
                            <span className="font-medium ml-2">{po.payment.referenceNumber}</span>
                          </div>
                        </div>
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
                  {allDeliveryOrders.every(doItem => doItem.status === 'completed') ? 'All Delivered' : 'In Transit'}
                </Badge>
              </div>
              
              <div className="space-y-4">
                {allDeliveryOrders.map((doItem, doIndex) => (
                  <div key={doItem.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold">{doItem.doNumber}</div>
                        <div className="text-sm text-gray-600">
                          {doItem.courier} - {doItem.trackingNumber}
                        </div>
                        <div className="text-xs text-gray-500">PO: {doItem.poReferences.join(', ')}</div>
                      </div>
                      <div className="text-right">
                        <Badge className={doItem.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {doItem.status}
                        </Badge>
                        <div className="text-sm mt-1">{doItem.receivedDate}</div>
                      </div>
                    </div>

                    {/* DO Items */}
                    <div className="mb-3">
                      <Label className="text-sm font-medium mb-2 block">Delivered Items</Label>
                      <div className="space-y-2">
                        {doItem.items.map((item, itemIndex) => (
                          <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 bg-gray-200 rounded flex items-center justify-center text-xs">
                                {itemIndex + 1}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{item.productName}</div>
                                <div className="text-xs text-gray-500">{item.sku}</div>
                                <div className="text-xs text-blue-600">
                                  PO: {item.poReference} | SO Item: {item.soItemId}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">{item.quantity} pcs</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* DO Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-gray-500">Shipping Date</Label>
                        <p className="font-medium">{doItem.shippingDate}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Shipping Cost</Label>
                        <p className="font-medium">Rp {doItem.shippingCost.toLocaleString()}</p>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-gray-500">Client Notes</Label>
                        <p className="font-medium">{doItem.clientNotes}</p>
                      </div>
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
                      <div className="text-2xl font-bold text-green-600">Rp {so.totalAmount.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Total Sales</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">Rp {so.totalCost.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Total Cost</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">Rp {so.totalProfit.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Profit ({so.profitMargin}%)</div>
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
                        <span className="font-medium">{tax.name}</span>
                        <span className="text-red-600">Rp {tax.amount.toLocaleString()} ({tax.rate}%)</span>
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

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Invoice & Payment</h1>
          <p className="text-gray-600 mt-2">Process customer payments for completed orders</p>
        </div>

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
                        selectedRow === so.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => setSelectedRow(selectedRow === so.id ? null : so.id)}
                    >
                      <TableCell className="font-semibold">{so.soNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{so.customerName}</div>
                          <div className="text-sm text-gray-500">{so.customerPhone}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        Rp {so.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {so.purchaseOrders.length} PO
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-green-600">{so.profitMargin}%</span>
                          <span className="text-sm text-gray-500">(Rp {so.totalProfit.toLocaleString()})</span>
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
                                invoiceNumber: so.invoiceNumber || generateInvoiceNumber(so.soNumber),
                                paymentAmount: so.totalAmount
                              }))
                              setShowPaymentForm(true)
                            }}
                            size="sm"
                            disabled={so.paymentStatus === 'paid'}
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
          </CardContent>
        </Card>

        {/* Process Timeline Card - MUNCUL DI BAWAH SETELAH CLICK ROW */}
        {selectedRow && (
          <ProcessTimeline so={currentItems.find(so => so.id === selectedRow)!} />
        )}

        {/* Payment Form */}
        {showPaymentForm && selectedSO && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Process Payment - {selectedSO.soNumber}
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
                          <p className="font-medium">{selectedSO.customerName}</p>
                          <p className="text-sm text-gray-600">{selectedSO.customerCompany}</p>
                          <p className="text-sm text-gray-500">{selectedSO.customerEmail}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Billing Address</Label>
                          <p className="text-sm">{selectedSO.billingAddress}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm text-gray-600">SO Date</Label>
                          <p className="font-medium">{selectedSO.date}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Total Amount</Label>
                          <p className="font-bold text-lg">Rp {selectedSO.totalAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Profit Summary</Label>
                          <p className="text-sm">
                            Margin: <span className="text-green-600 font-medium">{selectedSO.profitMargin}%</span> | 
                            Profit: <span className="text-green-600 font-medium">Rp {selectedSO.totalProfit.toLocaleString()}</span>
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
                        onChange={(e) => setPaymentData(prev => ({ ...prev, paymentAmount: parseInt(e.target.value) || 0 }))}
                        placeholder="Enter payment amount"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Payment Method *</Label>
                      <select
                        value={paymentData.paymentMethod}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="transfer">Bank Transfer</option>
                        <option value="cash">Cash</option>
                        <option value="credit_card">Credit Card</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
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
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
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