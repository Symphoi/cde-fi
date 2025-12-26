"use client"

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, Truck, Package, Upload, CheckCircle, Eye, Copy, Download, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

/* -------------------- Types -------------------- */
type POStatus = 'ready to ship' | 'shipping' | 'completed'
type DOStatus = 'shipping' | 'delivered'
// ✅ UPDATE: Tambah SO status type
type SOStatus = 'submitted' | 'processing' | 'invoicing' | 'completed' | 'cancelled'

interface POItem {
  id: string
  productName: string
  sku: string
  quantity: number
  purchasePrice: number
}

interface PurchaseOrder {
  id: string
  poNumber: string
  date: string
  supplier: string
  soReference: string
  customerName: string
  items: POItem[]
  status: POStatus
  totalAmount: number
  trackingNumber?: string
  courier?: string
  shippingDate?: string
  shippingCost?: number
  shippingProof?: File | null
  receivedDate?: string
  confirmationMethod?: string
  clientNotes?: string
  receiptProof?: File | null
  // ✅ UPDATE: Tambah SO status info
  soStatus?: SOStatus
}

interface DeliveryOrder {
  id: string
  doNumber: string
  soReference: string
  poIds: string[]
  courier?: string
  trackingNumber?: string
  shippingDate?: string
  shippingCost?: number
  shippingProof?: File | null
  status: DOStatus
  proofOfDelivery?: File | null
  receivedDate?: string
  receivedBy?: string
  confirmationMethod?: string
  createdAt: string
  // ✅ UPDATE: Tambah customer info dari SO
  customerName?: string
  customerPhone?: string
  soStatus?: SOStatus
}

/* -------------------- API Service -------------------- */
class DeliveryOrderService {
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

  // Get ready POs for delivery
  static async getReadyPOs(filters: {
    search?: string;
    page?: string;
    limit?: string;
  } = {}) {
    try {
      const params = new URLSearchParams();
      params.append('action', 'ready-pos');
      if (filters.search) params.append('search', filters.search);
      params.append('page', filters.page || '1');
      params.append('limit', filters.limit || '8');

      const response = await fetch(`/api/deliver-to-client?${params}`, {
        headers: this.getAuthHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Service error in getReadyPOs:', error);
      throw error;
    }
  }

  // Get all delivery orders
  static async getDeliveryOrders(filters: {
    status?: string;
    search?: string;
    page?: string;
    limit?: string;
  } = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      params.append('page', filters.page || '1');
      params.append('limit', filters.limit || '10');

      const response = await fetch(`/api/deliver-to-client?${params}`, {
        headers: this.getAuthHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Service error in getDeliveryOrders:', error);
      throw error;
    }
  }

  // Create delivery order
  static async createDeliveryOrder(data: {
    so_code: string;
    purchase_order_codes: string[];
    courier: string;
    tracking_number: string;
    shipping_date: string;
    shipping_cost?: number;
    notes?: string;
  }, shippingProofFile?: File) {
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify(data));
      
      if (shippingProofFile) {
        formData.append('shipping_proof', shippingProofFile);
      }

      const response = await fetch('/api/deliver-to-client', {
        method: 'POST',
        headers: this.getAuthHeadersFormData(),
        body: formData
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Service error in createDeliveryOrder:', error);
      throw error;
    }
  }

  // Mark delivery order as delivered
  static async markAsDelivered(data: {
    do_code: string;
    received_date: string;
    received_by: string;
    confirmation_method?: string;
    notes?: string;
  }, podFile: File) {
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify(data));
      formData.append('proof_of_delivery', podFile);

      const response = await fetch('/api/deliver-to-client', {
        method: 'PATCH',
        headers: this.getAuthHeadersFormData(),
        body: formData
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Service error in markAsDelivered:', error);
      throw error;
    }
  }

  // Export delivery order
  static async exportDeliveryOrder(do_code: string, format: string = 'pdf') {
    try {
      const response = await fetch('/api/deliver-to-client', {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ do_code, format })
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Service error in exportDeliveryOrder:', error);
      throw error;
    }
  }
}

/* -------------------- PDF Export Function -------------------- */
const generatePDF = (doData: any) => {
  // Create a new window for PDF
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('Cannot open print window. Please allow popups for this site.');
    return;
  }

  const { delivery_order, purchase_orders, export_info } = doData;

  const totalAmount = purchase_orders.reduce((sum: number, po: any) => {
    const poTotal = parseInt(po.item_total?.toString() || '0', 10) || 0;
    return sum + poTotal;
  }, 0) + (parseInt(delivery_order.shipping_cost?.toString() || '0', 10) || 0);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Delivery Order - ${delivery_order.do_code}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 40px; 
          color: #333;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .document-title {
          font-size: 20px;
          color: #666;
        }
        .section { 
          margin-bottom: 25px; 
        }
        .section-title {
          background-color: #f5f5f5;
          padding: 8px 12px;
          font-weight: bold;
          border-left: 4px solid #007acc;
          margin-bottom: 15px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 15px;
        }
        .info-item {
          margin-bottom: 8px;
        }
        .info-label {
          font-weight: bold;
          color: #666;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #f8f9fa;
          font-weight: bold;
        }
        .total-row {
          background-color: #f8f9fa;
          font-weight: bold;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
        .signature-section {
          margin-top: 40px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
        }
        .signature-line {
          border-top: 1px solid #333;
          margin-top: 60px;
          padding-top: 10px;
          text-align: center;
        }
        @media print {
          body { margin: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">YOUR COMPANY NAME</div>
        <div class="document-title">DELIVERY ORDER</div>
      </div>

      <div class="section">
        <div class="section-title">Delivery Information</div>
        <div class="info-grid">
          <div>
            <div class="info-item"><span class="info-label">DO Number:</span> ${delivery_order.do_code}</div>
            <div class="info-item"><span class="info-label">SO Reference:</span> ${delivery_order.so_code}</div>
            <div class="info-item"><span class="info-label">Customer:</span> ${delivery_order.customer_name}</div>
            <div class="info-item"><span class="info-label">Customer Phone:</span> ${delivery_order.customer_phone || 'N/A'}</div>
            <div class="info-item"><span class="info-label">SO Status:</span> ${delivery_order.so_status || 'N/A'}</div>
          </div>
          <div>
            <div class="info-item"><span class="info-label">Shipping Date:</span> ${new Date(delivery_order.shipping_date).toLocaleDateString()}</div>
            <div class="info-item"><span class="info-label">Courier:</span> ${delivery_order.courier || 'N/A'}</div>
            <div class="info-item"><span class="info-label">Tracking Number:</span> ${delivery_order.tracking_number || 'N/A'}</div>
            <div class="info-item"><span class="info-label">Status:</span> ${delivery_order.status.toUpperCase()}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Purchase Orders</div>
        <table>
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Supplier</th>
              <th>Product Name</th>
              <th>SKU</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${purchase_orders.map((po: any) => `
              <tr>
                <td>${po.po_code}</td>
                <td>${po.supplier_name}</td>
                <td>${po.product_name}</td>
                <td>${po.product_code}</td>
                <td>${po.quantity}</td>
                <td>Rp ${parseInt(po.purchase_price).toLocaleString('id-ID')}</td>
                <td>Rp ${parseInt(po.item_total).toLocaleString('id-ID')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Summary</div>
        <div class="info-grid">
          <div>
            <div class="info-item"><span class="info-label">Total Items:</span> ${purchase_orders.length}</div>
            <div class="info-item"><span class="info-label">Shipping Cost:</span> Rp ${parseInt(delivery_order.shipping_cost || '0').toLocaleString('id-ID')}</div>
          </div>
          <div>
            <div class="info-item"><span class="info-label">Subtotal:</span> Rp ${(totalAmount - parseInt(delivery_order.shipping_cost || '0')).toLocaleString('id-ID')}</div>
            <div class="info-item total-row"><span class="info-label">Grand Total:</span> Rp ${totalAmount.toLocaleString('id-ID')}</div>
          </div>
        </div>
      </div>

      ${delivery_order.status === 'delivered' ? `
      <div class="section">
        <div class="section-title">Delivery Confirmation</div>
        <div class="info-grid">
          <div>
            <div class="info-item"><span class="info-label">Received Date:</span> ${new Date(delivery_order.received_date).toLocaleDateString()}</div>
            <div class="info-item"><span class="info-label">Received By:</span> ${delivery_order.received_by}</div>
          </div>
          <div>
            <div class="info-item"><span class="info-label">Confirmation Method:</span> ${delivery_order.confirmation_method || 'N/A'}</div>
            <div class="info-item"><span class="info-label">Delivery Proof:</span> ${delivery_order.proof_of_delivery ? 'Attached' : 'Not Available'}</div>
          </div>
        </div>
      </div>
      ` : ''}

      <div class="signature-section">
        <div>
          <div>Prepared by:</div>
          <div class="signature-line">${export_info.exported_by}</div>
        </div>
        <div>
          <div>Received by:</div>
          <div class="signature-line">${delivery_order.received_by || '________________'}</div>
        </div>
      </div>

      <div class="footer">
        <div>Generated on: ${new Date(export_info.export_date).toLocaleString()}</div>
        <div>Document ID: ${delivery_order.do_code}</div>
      </div>

      <div class="no-print" style="margin-top: 20px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #007acc; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Print PDF
        </button>
        <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
          Close
        </button>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Auto print after a short delay
  setTimeout(() => {
    printWindow.print();
  }, 500);
};

/* -------------------- Component -------------------- */
export default function DeliveryTrackingPage() {
  // mode
  const [mode, setMode] = useState<'create' | 'process' | 'view'>('create')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // search / pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | POStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // file refs
  const createShippingProofRef = useRef<HTMLInputElement | null>(null)
  const podProofRef = useRef<HTMLInputElement | null>(null)

  // Data states
  const [poData, setPoData] = useState<PurchaseOrder[]>([])
  const [doData, setDoData] = useState<DeliveryOrder[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 8,
    total: 0,
    totalPages: 0
  })

  // CREATE DO state
  const [selectedPOIds, setSelectedPOIds] = useState<string[]>([])
  const [createDOForm, setCreateDOForm] = useState({ 
    courier: '', 
    trackingNumber: '', 
    shippingDate: '', 
    shippingCost: '',
    so_code: ''
  })
  const [createShippingProof, setCreateShippingProof] = useState<File | null>(null)

  // PROCESS DO state
  const [selectedDOId, setSelectedDOId] = useState<string | null>(null)
  const [podForm, setPodForm] = useState({ 
    receivedDate: '', 
    receivedBy: '', 
    confirmationMethod: '',
    do_code: ''
  })
  const [podFile, setPodFile] = useState<File | null>(null)

  /* -------------------- Data Fetching -------------------- */
  const fetchReadyPOs = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await DeliveryOrderService.getReadyPOs({
        search: searchTerm,
        page: String(currentPage),
        limit: String(itemsPerPage)
      })

      if (response.success) {
        // Transform API response to match frontend format
        const transformedPOs: PurchaseOrder[] = response.data.map((po: any) => ({
          id: po.po_code,
          poNumber: po.po_code,
          date: po.date,
          supplier: po.supplier_name,
          soReference: po.so_code,
          customerName: po.customer_name,
          items: po.items ? po.items.map((item: any) => ({
            id: item.po_item_code,
            productName: item.product_name,
            sku: item.product_code,
            quantity: item.quantity,
            purchasePrice: item.purchase_price
          })) : [],
          status: 'ready to ship',
          // Konversi totalAmount ke number
          totalAmount: parseInt(po.total_amount?.toString() || '0', 10) || 0,
          // ✅ UPDATE: Tambah SO status info
          soStatus: po.so_status || 'processing'
        }))

        setPoData(transformedPOs)
        setPagination(response.pagination || {
          page: currentPage,
          limit: itemsPerPage,
          total: response.data.length,
          totalPages: Math.ceil(response.data.length / itemsPerPage)
        })
      } else {
        throw new Error(response.error || 'Failed to fetch data from API')
      }
    } catch (err: any) {
      console.error('❌ Error fetching ready POs:', err)
      const errorMessage = err.message || 'Gagal memuat data PO';
      setError(errorMessage)
      toast.error(errorMessage)
      
      // Set empty data on error
      setPoData([])
      setPagination({
        page: 1,
        limit: itemsPerPage,
        total: 0,
        totalPages: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchDeliveryOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      const statusMap: Record<string, DOStatus> = {
        'shipping': 'shipping',
        'delivered': 'delivered'
      }

      const statusFilterForAPI = statusFilter === 'all' ? undefined : 
                               statusFilter === 'ready to ship' ? 'shipping' : statusFilter

      const response = await DeliveryOrderService.getDeliveryOrders({
        status: statusFilterForAPI,
        search: searchTerm,
        page: String(currentPage),
        limit: String(itemsPerPage)
      })

      if (response.success) {
        // Transform API response to match frontend format
        const transformedDOs: DeliveryOrder[] = response.data.map((doItem: any) => {
          // FIX: Parse purchase_order_codes sebagai JSON string dari backend
          let poIds: string[] = [];
          try {
            if (doItem.purchase_order_codes) {
              poIds = JSON.parse(doItem.purchase_order_codes);
            }
          } catch (error) {
            console.warn('Failed to parse purchase_order_codes:', doItem.purchase_order_codes);
            // Fallback: jika parsing gagal, treat sebagai array dengan satu item
            poIds = doItem.purchase_order_codes ? [doItem.purchase_order_codes] : [];
          }

          return {
            id: doItem.do_code,
            doNumber: doItem.do_code,
            soReference: doItem.so_code,
            poIds: poIds,
            courier: doItem.courier,
            trackingNumber: doItem.tracking_number,
            shippingDate: doItem.shipping_date,
            // Konversi shippingCost ke number
            shippingCost: parseInt(doItem.shipping_cost?.toString() || '0', 10) || 0,
            status: statusMap[doItem.status] || 'shipping',
            receivedDate: doItem.received_date,
            receivedBy: doItem.received_by,
            confirmationMethod: doItem.confirmation_method,
            createdAt: doItem.created_at,
            // ✅ UPDATE: Tambah customer info dan SO status
            customerName: doItem.customer_name,
            customerPhone: doItem.customer_phone,
            soStatus: doItem.so_status || 'processing'
          }
        })

        setDoData(transformedDOs)
        setPagination(response.pagination || {
          page: currentPage,
          limit: itemsPerPage,
          total: response.data.length,
          totalPages: Math.ceil(response.data.length / itemsPerPage)
        })
      } else {
        throw new Error(response.error || 'Failed to fetch data from API')
      }
    } catch (err: any) {
      console.error('❌ Error fetching delivery orders:', err)
      const errorMessage = err.message || 'Gagal memuat data DO';
      setError(errorMessage)
      toast.error(errorMessage)
      
      // Set empty data on error
      setDoData([])
      setPagination({
        page: 1,
        limit: itemsPerPage,
        total: 0,
        totalPages: 0
      })
    } finally {
      setLoading(false)
    }
  }

  // Load data based on mode
  useEffect(() => {
    if (mode === 'create') {
      fetchReadyPOs()
    } else {
      fetchDeliveryOrders()
    }
  }, [mode, searchTerm, statusFilter, currentPage])

  /* -------------------- Derived & Helpers -------------------- */
  const term = searchTerm.trim().toLowerCase()
  const poFiltered = poData.filter(po => {
    const matchesSearch = !term || 
      po.poNumber.toLowerCase().includes(term) || 
      po.customerName.toLowerCase().includes(term) || 
      po.soReference.toLowerCase().includes(term)
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const readyToShipCount = poData.filter(p => p.status === 'ready to ship').length
  const shippingPOCount = poData.filter(p => p.status === 'shipping').length
  const completedPOCount = poData.filter(p => p.status === 'completed').length

  const shippingDOs = doData.filter(d => d.status === 'shipping')
  const deliveredDOs = doData.filter(d => d.status === 'delivered')

  // ✅ UPDATE: Helper untuk SO status badge
  const renderSOStatusBadge = (status: SOStatus) => {
    const colors = {
      submitted: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      invoicing: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    )
  }

  /* -------------------- Selection helpers -------------------- */
  const toggleSelectPO = (id: string) => setSelectedPOIds(prev => 
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  const selectAllPage = (checked: boolean) => {
    if (checked) {
      const pageReadyIds = poFiltered.filter(ci => ci.status === 'ready to ship').map(ci => ci.id)
      setSelectedPOIds(prev => Array.from(new Set([...prev, ...pageReadyIds])))
    } else {
      setSelectedPOIds(prev => prev.filter(id => !poFiltered.some(ci => ci.id === id)))
    }
  }

  const isValidSelectionForDO = () => {
    if (selectedPOIds.length === 0) return false
    const selected = poData.filter(p => selectedPOIds.includes(p.id))
    if (selected.some(s => s.status !== 'ready to ship')) return false
    const soSet = new Set(selected.map(s => s.soReference))
    return soSet.size === 1
  }

  const getSelectedPOsTotal = () => {
    return poData.filter(p => selectedPOIds.includes(p.id)).reduce((sum, po) => {
      // Konversi totalAmount ke integer sebelum menjumlahkan
      const amount = parseInt(po.totalAmount.toString(), 10) || 0;
      return sum + amount;
    }, 0)
  }

  /* -------------------- File handlers -------------------- */
  const handleCreateShippingProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setCreateShippingProof(file)
  }

  const handlePodProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setPodFile(file)
  }

  /* -------------------- Create DO -------------------- */
  const handleCreateDO = async () => {
    if (!isValidSelectionForDO()) {
      toast.error('Pilih minimal 1 PO Ready to Ship dan pastikan semua PO berasal dari 1 SO yang sama.')
      return
    }
    if (!createDOForm.courier || !createDOForm.trackingNumber || !createDOForm.shippingDate) {
      toast.error('Isi courier, tracking number, dan shipping date.')
      return
    }

    const selectedPOs = poData.filter(p => selectedPOIds.includes(p.id))
    const soRef = selectedPOs[0]?.soReference

    if (!soRef) {
      toast.error('Tidak dapat menemukan SO reference')
      return
    }

    try {
      setLoading(true)
      
      const result = await DeliveryOrderService.createDeliveryOrder({
        so_code: soRef,
        purchase_order_codes: selectedPOIds,
        courier: createDOForm.courier,
        tracking_number: createDOForm.trackingNumber,
        shipping_date: createDOForm.shippingDate,
        // Konversi shippingCost ke number
        shipping_cost: createDOForm.shippingCost ? parseInt(createDOForm.shippingCost, 10) || 0 : 0,
        notes: 'Delivery order created via frontend'
      }, createShippingProof || undefined)

      if (result.success) {
        toast.success(`Delivery Order ${result.do_code} berhasil dibuat!`)
        
        // Clear form
        setSelectedPOIds([])
        setCreateDOForm({ 
          courier: '', 
          trackingNumber: '', 
          shippingDate: '', 
          shippingCost: '', 
          so_code: '' 
        })
        setCreateShippingProof(null)
        if (createShippingProofRef.current) {
          createShippingProofRef.current.value = ''
        }
        
        // Refresh data
        await fetchReadyPOs()
        setMode('process')
      } else {
        throw new Error(result.error || 'Failed to create delivery order')
      }
    } catch (error: any) {
      console.error('❌ Error creating DO:', error)
      toast.error(error.message || 'Gagal membuat Delivery Order')
    } finally {
      setLoading(false)
    }
  }

  /* -------------------- Process DO (POD) -------------------- */
  const handleStartProcessDO = (doItem: DeliveryOrder) => {
    setSelectedDOId(prev => prev === doItem.id ? null : doItem.id)
    setPodForm({
      receivedDate: new Date().toISOString().split('T')[0], // Set today as default
      receivedBy: '',
      confirmationMethod: '',
      do_code: doItem.doNumber
    })
    setPodFile(null)
  }

  const handleSubmitPOD = async () => {
    if (!selectedDOId || !podForm.do_code) {
      toast.error('Pilih DO untuk diproses.')
      return
    }
    if (!podFile || !podForm.receivedDate || !podForm.receivedBy) {
      toast.error('Upload proof & isi received date & received by.')
      return
    }

    try {
      setLoading(true)
      
      const result = await DeliveryOrderService.markAsDelivered({
        do_code: podForm.do_code,
        received_date: podForm.receivedDate,
        received_by: podForm.receivedBy,
        confirmation_method: podForm.confirmationMethod || undefined,
        notes: `Received by ${podForm.receivedBy}`
      }, podFile)

      if (result.success) {
        toast.success('DO berhasil diproses dan ditandai sebagai delivered!')
        
        // Clear form
        setSelectedDOId(null)
        setPodFile(null)
        setPodForm({ receivedDate: '', receivedBy: '', confirmationMethod: '', do_code: '' })
        if (podProofRef.current) {
          podProofRef.current.value = ''
        }
        
        // Refresh data
        await fetchDeliveryOrders()
      } else {
        throw new Error(result.error || 'Failed to process delivery order')
      }
    } catch (error: any) {
      console.error('❌ Error processing POD:', error)
      toast.error(error.message || 'Gagal memproses Proof of Delivery')
    } finally {
      setLoading(false)
    }
  }
const exportDOToPDF = async (doId: string) => {
  try {
    const doItem = doData.find(d => d.id === doId)
    if (!doItem) {
      toast.error('DO tidak ditemukan')
      return
    }

    console.log('🔄 Requesting PDF from backend for:', doItem.doNumber);
    
    const result = await DeliveryOrderService.exportDeliveryOrder(doItem.doNumber, 'pdf')
    
    if (result.success) {
      console.log('📊 Backend response:', {
        purchaseOrdersCount: result.data?.purchase_orders?.length || 0,
        companyInfo: result.data?.company_info,
        deliveryOrder: result.data?.delivery_order
      });
      
      if (result.data?.pdf_base64) {
        // Decode base64 ke HTML
        const htmlContent = atob(result.data.pdf_base64);
        
        // Buka preview di tab baru dan langsung print dialog
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          toast.error('Tidak dapat membuka jendela baru. Izinkan popup untuk situs ini.');
          return;
        }
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Auto print setelah konten load
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
        
        toast.success(`PDF untuk DO ${doItem.doNumber} siap dicetak!`);
      } else {
        toast.error('Backend tidak mengembalikan data PDF');
      }
    } else {
      throw new Error(result.error || 'Failed to export delivery order');
    }
  } catch (error: any) {
    console.error('❌ Error exporting DO:', error);
    toast.error(error.message || 'Gagal mengekspor DO');
  }
}

  const exportInvoiceForDO = async (doId: string) => {
    try {
      const doItem = doData.find(d => d.id === doId)
      if (!doItem) {
        toast.error('DO tidak ditemukan')
        return
      }

      // For invoice, we'll also use PDF format
      const result = await DeliveryOrderService.exportDeliveryOrder(doItem.doNumber, 'pdf')
      
      if (result.success) {
        // Create invoice PDF from the same data but with invoice template
        const invoiceData = {
          ...result.data,
          invoice_number: `INV-${doItem.doNumber}`,
          is_invoice: true
        }
        generatePDF(invoiceData)
        toast.success(`Invoice untuk ${doItem.doNumber} berhasil dibuat!`)
      } else {
        throw new Error(result.error || 'Failed to export invoice data')
      }
    } catch (error: any) {
      console.error('❌ Error exporting invoice:', error)
      toast.error(error.message || 'Gagal generate invoice')
    }
  }

  const exportAllDOsToCSV = () => {
    if (!doData || doData.length === 0) {
      toast.error('Tidak ada data DO untuk diekspor')
      return
    }

    const headers = ['DO Number', 'SO', 'PO Count', 'PO IDs', 'Courier', 'Tracking', 'Status', 'Shipping Date', 'Shipping Cost', 'Received Date', 'Received By', 'Confirmation Method', 'SO Status', 'Created At']
    const rows = doData.map(d => [
      d.doNumber,
      d.soReference,
      String(d.poIds.length),
      d.poIds.join('|'),
      d.courier || '',
      d.trackingNumber || '',
      d.status,
      d.shippingDate || '',
      // Konversi shippingCost ke string dengan format
      d.shippingCost ? `Rp ${d.shippingCost.toLocaleString('id-ID')}` : '',
      d.receivedDate || '',
      d.receivedBy || '',
      d.confirmationMethod || '',
      // ✅ UPDATE: Tambah SO status ke CSV export
      d.soStatus || '',
      d.createdAt || ''
    ])

    const csvContent = [headers, ...rows].map(r => 
      r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')
    ).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `delivery_orders_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success('Data DO berhasil diekspor ke CSV')
  }

  /* -------------------- UI helpers -------------------- */
  const renderPOStatusBadge = (s: POStatus) => {
    if (s === 'ready to ship') return <Badge className="bg-blue-100 text-blue-800">Ready</Badge>
    if (s === 'shipping') return <Badge className="bg-yellow-100 text-yellow-800">Shipping</Badge>
    return <Badge className="bg-green-100 text-green-800">Completed</Badge>
  }

  const renderDOStatusBadge = (s: DOStatus) => 
    s === 'shipping' ? 
      <Badge className="bg-yellow-100 text-yellow-800">Shipping</Badge> : 
      <Badge className="bg-green-100 text-green-800">Delivered</Badge>

  const copyToClipboard = async (text: string) => {
    try { 
      await navigator.clipboard.writeText(text); 
      toast.success('Copied to clipboard') 
    } catch { 
      toast.error('Unable to copy') 
    }
  }

  /* -------------------- Pagination Component -------------------- */
  const Pagination = () => (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="text-sm text-gray-600">
        Showing {Math.min(pagination.total, (pagination.page - 1) * pagination.limit + 1)} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
      </div>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
          disabled={currentPage === 1 || loading}
        >
          Prev
        </Button>
        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
          const pageNum = i + 1
          return (
            <Button 
              key={pageNum} 
              variant={currentPage === pageNum ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setCurrentPage(pageNum)}
              disabled={loading}
            >
              {pageNum}
            </Button>
          )
        })}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))} 
          disabled={currentPage === pagination.totalPages || loading}
        >
          Next
        </Button>
      </div>
    </div>
  )

  /* -------------------- Render -------------------- */
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5" />
                <CardTitle>Delivery Orders</CardTitle>
                <span className="text-sm text-gray-500">create → process → view</span>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant={mode === 'create' ? 'default' : 'outline'} 
                  onClick={() => setMode('create')}
                  disabled={loading}
                >
                  {loading && mode === 'create' ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                  DO CREATE
                </Button>
                <Button 
                  variant={mode === 'process' ? 'default' : 'outline'} 
                  onClick={() => setMode('process')}
                  disabled={loading}
                >
                  {loading && mode === 'process' ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                  DO PROCESS
                </Button>
                <Button 
                  variant={mode === 'view' ? 'default' : 'outline'} 
                  onClick={() => setMode('view')}
                  disabled={loading}
                >
                  {loading && mode === 'view' ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                  VIEW DOs
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Error State */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
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

            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input 
                    className="pl-10 w-64" 
                    placeholder="Search PO number, customer, SO..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <select 
                  value={statusFilter} 
                  onChange={e => setStatusFilter(e.target.value as any)} 
                  className="border rounded px-3 py-2 text-sm"
                  disabled={loading}
                >
                  <option value="all">All PO</option>
                  <option value="ready to ship">Ready to Ship</option>
                  <option value="shipping">Shipping</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Badge className="bg-blue-50 text-blue-700 border-blue-200">Ready: {readyToShipCount}</Badge>
                <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">Shipping PO: {shippingPOCount}</Badge>
                <Badge className="bg-green-50 text-green-700 border-green-200">Done: {completedPOCount}</Badge>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading...</span>
              </div>
            )}

            {/* Table area */}
            {!loading && (
              <div className="overflow-x-auto">
                {/* CREATE MODE */}
                {mode === 'create' && (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <input 
                              type="checkbox" 
                              checked={poFiltered.length > 0 && poFiltered.every(ci => selectedPOIds.includes(ci.id) || ci.status !== 'ready to ship')} 
                              onChange={(e) => selectAllPage(e.target.checked)}
                              disabled={loading}
                            />
                          </TableHead>
                          <TableHead>PO Number</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>SO Reference</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>PO Status</TableHead>
                          <TableHead>SO Status</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {poFiltered.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-sm text-gray-500 py-8">
                              {searchTerm ? 'Tidak ada PO yang sesuai dengan pencarian' : 'Tidak ada PO yang ready untuk delivery'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          poFiltered.map(po => (
                            <TableRow key={po.id} className={`hover:bg-gray-50 ${selectedPOIds.includes(po.id) ? 'bg-blue-50' : ''}`}>
                              <TableCell>
                                <input 
                                  type="checkbox" 
                                  checked={selectedPOIds.includes(po.id)} 
                                  disabled={po.status !== 'ready to ship' || loading}
                                  onChange={() => toggleSelectPO(po.id)} 
                                />
                              </TableCell>
                              <TableCell className="font-medium">{po.poNumber}</TableCell>
                              <TableCell>{po.customerName}</TableCell>
                              <TableCell className="text-blue-600">{po.soReference}</TableCell>
                              <TableCell>{po.supplier}</TableCell>
                              <TableCell>{renderPOStatusBadge(po.status)}</TableCell>
                              <TableCell>
                                {/* ✅ UPDATE: Tampilkan SO status */}
                                {po.soStatus && renderSOStatusBadge(po.soStatus)}
                              </TableCell>
                              <TableCell className="text-right">Rp {po.totalAmount.toLocaleString('id-ID')}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div className="col-span-2">
                        <Card>
                          <CardHeader><CardTitle>Create Delivery Order</CardTitle></CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label>Courier *</Label>
                                <Input 
                                  value={createDOForm.courier} 
                                  onChange={e => setCreateDOForm(p => ({ ...p, courier: e.target.value }))}
                                  disabled={loading}
                                  placeholder="JNE, TIKI, J&T, etc."
                                />
                              </div>
                              <div>
                                <Label>Tracking Number *</Label>
                                <Input 
                                  value={createDOForm.trackingNumber} 
                                  onChange={e => setCreateDOForm(p => ({ ...p, trackingNumber: e.target.value }))}
                                  disabled={loading}
                                  placeholder="Tracking number"
                                />
                              </div>
                              <div>
                                <Label>Shipping Date *</Label>
                                <Input 
                                  type="date" 
                                  value={createDOForm.shippingDate} 
                                  onChange={e => setCreateDOForm(p => ({ ...p, shippingDate: e.target.value }))}
                                  disabled={loading}
                                />
                              </div>
                              <div>
                                <Label>Shipping Cost</Label>
                                <Input 
                                  type="number" 
                                  value={createDOForm.shippingCost} 
                                  onChange={e => setCreateDOForm(p => ({ ...p, shippingCost: e.target.value }))}
                                  disabled={loading}
                                  placeholder="0"
                                />
                              </div>
                            </div>

                            <div className="mt-3">
                              <Label>Shipping Proof (optional)</Label>
                              <div className="flex items-center gap-2 mt-2">
                                <Button 
                                  variant="outline" 
                                  onClick={() => createShippingProofRef.current?.click()}
                                  disabled={loading}
                                >
                                  <Upload className="h-4 w-4 mr-2" /> Upload
                                </Button>
                                <input 
                                  ref={createShippingProofRef} 
                                  type="file" 
                                  className="hidden" 
                                  onChange={handleCreateShippingProof} 
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  disabled={loading}
                                />
                                <div className="text-sm text-gray-600">
                                  {createShippingProof ? createShippingProof.name : 'No file uploaded'}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 flex gap-2">
                              <Button 
                                onClick={handleCreateDO} 
                                disabled={!isValidSelectionForDO() || loading}
                              >
                                {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />}
                                Create DO ({selectedPOIds.length})
                              </Button>
                              <Button 
                                variant="ghost" 
                                onClick={() => { 
                                  setSelectedPOIds([]); 
                                  setCreateDOForm({ courier: '', trackingNumber: '', shippingDate: '', shippingCost: '', so_code: '' }); 
                                  setCreateShippingProof(null) 
                                }}
                                disabled={loading}
                              >
                                Clear
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div>
                        <Card>
                          <CardHeader><CardTitle>Selection Info</CardTitle></CardHeader>
                          <CardContent>
                            <div className="text-sm">
                              <div>Selected PO: <strong>{selectedPOIds.length}</strong></div>
                              {selectedPOIds.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  <div>
                                    <div className="font-medium">SO Reference:</div>
                                    <div className="text-blue-600">
                                      {poData.find(p => p.id === selectedPOIds[0])?.soReference}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="font-medium">SO Status:</div>
                                    <div>
                                      {poData.find(p => p.id === selectedPOIds[0])?.soStatus && 
                                        renderSOStatusBadge(poData.find(p => p.id === selectedPOIds[0])!.soStatus!)
                                      }
                                    </div>
                                  </div>
                                  <div>
                                    <div className="font-medium">Total Amount:</div>
                                    <div className="text-green-600 font-semibold">
                                      Rp {getSelectedPOsTotal().toLocaleString('id-ID')}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="font-medium">POs Included:</div>
                                    <div className="text-xs text-gray-600">
                                      {selectedPOIds.map(id => poData.find(p => p.id === id)?.poNumber).join(', ')}
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="mt-2 text-xs text-gray-500">
                                Rules: only PO with status <strong>Ready to Ship</strong>. All selected must be from same SO.
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {pagination.totalPages > 1 && <Pagination />}
                  </>
                )}

                {/* PROCESS MODE */}
                {mode === 'process' && (
                  <>
                    <div className="mb-3 flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        onClick={fetchDeliveryOrders}
                        disabled={loading}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>DO Number</TableHead>
                          <TableHead>SO</TableHead>
                          <TableHead>PO Count</TableHead>
                          <TableHead>Courier</TableHead>
                          <TableHead>Tracking</TableHead>
                          <TableHead>DO Status</TableHead>
                          <TableHead>SO Status</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shippingDOs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-sm text-gray-500 py-8">
                              Tidak ada DO dalam status shipping
                            </TableCell>
                          </TableRow>
                        ) : (
                          shippingDOs.map(d => (
                            <TableRow key={d.id}>
                              <TableCell className="font-medium">{d.doNumber}</TableCell>
                              <TableCell>{d.soReference}</TableCell>
                              <TableCell>{d.poIds.length}</TableCell>
                              <TableCell>{d.courier}</TableCell>
                              <TableCell className="text-blue-600">{d.trackingNumber}</TableCell>
                              <TableCell>{renderDOStatusBadge(d.status)}</TableCell>
                              <TableCell>
                                {/* ✅ UPDATE: Tampilkan SO status */}
                                {d.soStatus && renderSOStatusBadge(d.soStatus)}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant={selectedDOId === d.id ? 'default' : 'outline'} 
                                    onClick={() => handleStartProcessDO(d)}
                                    disabled={loading}
                                  >
                                    {selectedDOId === d.id ? 'Cancel' : 'Process'}
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => exportDOToPDF(d.id)}
                                    disabled={loading}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Export PDF
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => copyToClipboard(d.trackingNumber ?? '')}
                                    disabled={loading}
                                  >
                                    <Copy className="h-4 w-4 mr-1" />
                                    Copy
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    {selectedDOId && (
                      <div className="mt-4">
                        <Card>
                          <CardHeader><CardTitle>Process DO - Proof of Delivery</CardTitle></CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label>Upload POD (file) *</Label>
                                <div className="flex items-center gap-2 mt-2">
                                  <Button 
                                    variant="outline" 
                                    onClick={() => podProofRef.current?.click()}
                                    disabled={loading}
                                  >
                                    <Upload className="h-4 w-4 mr-2" /> Upload
                                  </Button>
                                  <input 
                                    ref={podProofRef} 
                                    type="file" 
                                    className="hidden" 
                                    onChange={handlePodProof} 
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    disabled={loading}
                                  />
                                  <div className="text-sm text-gray-600">
                                    {podFile ? podFile.name : 'No file'}
                                  </div>
                                </div>
                              </div>
                              <div>
                                <Label>Received Date *</Label>
                                <Input 
                                  type="date" 
                                  value={podForm.receivedDate} 
                                  onChange={(e) => setPodForm(p => ({ ...p, receivedDate: e.target.value }))}
                                  disabled={loading}
                                />
                              </div>
                              <div>
                                <Label>Received By *</Label>
                                <Input 
                                  value={podForm.receivedBy} 
                                  onChange={(e) => setPodForm(p => ({ ...p, receivedBy: e.target.value }))}
                                  disabled={loading}
                                  placeholder="Nama penerima"
                                />
                              </div>
                              <div>
                                <Label>Confirmation Method</Label>
                                <select 
                                  className="w-full border rounded px-3 py-2" 
                                  value={podForm.confirmationMethod} 
                                  onChange={(e) => setPodForm(p => ({ ...p, confirmationMethod: e.target.value }))}
                                  disabled={loading}
                                >
                                  <option value="">Select method</option>
                                  <option value="whatsapp">WhatsApp</option>
                                  <option value="email">Email</option>
                                  <option value="call">Phone Call</option>
                                  <option value="other">Other</option>
                                </select>
                              </div>
                              <div className="md:col-span-2">
                                <Label>Notes (auto)</Label>
                                <Input 
                                  value={podForm.receivedBy ? `Received by ${podForm.receivedBy}` : ''} 
                                  readOnly 
                                />
                              </div>
                            </div>

                            <div className="mt-4 flex gap-2">
                              <Button 
                                onClick={handleSubmitPOD}
                                disabled={loading}
                              >
                                {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                Submit POD
                              </Button>
                              <Button 
                                variant="ghost" 
                                onClick={() => { 
                                  setSelectedDOId(null); 
                                  setPodFile(null); 
                                  setPodForm({ receivedDate: '', receivedBy: '', confirmationMethod: '', do_code: '' }) 
                                }}
                                disabled={loading}
                              >
                                Cancel
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {pagination.totalPages > 1 && <Pagination />}
                  </>
                )}

                {/* VIEW MODE */}
                {mode === 'view' && (
                  <>
                    <div className="mb-3 flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        Total DOs: {doData.length} ({shippingDOs.length} shipping, {deliveredDOs.length} delivered)
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={exportAllDOsToCSV} 
                          variant="outline"
                          disabled={loading || doData.length === 0}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export CSV (All DOs)
                        </Button>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>DO Number</TableHead>
                          <TableHead>SO</TableHead>
                          <TableHead>PO Count</TableHead>
                          <TableHead>Courier</TableHead>
                          <TableHead>Tracking</TableHead>
                          <TableHead>DO Status</TableHead>
                          <TableHead>SO Status</TableHead>
                          <TableHead>Shipping Cost</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {doData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center text-sm text-gray-500 py-8">
                              Belum ada DO yang dibuat
                            </TableCell>
                          </TableRow>
                        ) : (
                          doData.map(d => (
                            <TableRow key={d.id}>
                              <TableCell className="font-medium">{d.doNumber}</TableCell>
                              <TableCell>{d.soReference}</TableCell>
                              <TableCell>{d.poIds.length}</TableCell>
                              <TableCell>{d.courier}</TableCell>
                              <TableCell className="text-blue-600">{d.trackingNumber}</TableCell>
                              <TableCell>{renderDOStatusBadge(d.status)}</TableCell>
                              <TableCell>
                                {/* ✅ UPDATE: Tampilkan SO status */}
                                {d.soStatus && renderSOStatusBadge(d.soStatus)}
                              </TableCell>
                              <TableCell>
                                {d.shippingCost ? `Rp ${d.shippingCost.toLocaleString('id-ID')}` : '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => exportDOToPDF(d.id)}
                                    disabled={loading}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Export PDF
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => exportInvoiceForDO(d.id)}
                                    disabled={loading}
                                  >
                                    Generate Invoice
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => copyToClipboard(d.trackingNumber ?? '')}
                                    disabled={loading}
                                  >
                                    <Copy className="h-4 w-4 mr-1" />
                                    Copy
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    {pagination.totalPages > 1 && <Pagination />}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}