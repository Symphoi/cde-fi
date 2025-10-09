// app/delivery-tracking/page.tsx
"use client"

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, Truck, Package, Upload, CheckCircle, Eye, Copy, Download } from 'lucide-react'
import { Document, Page, Text, View, Image, StyleSheet, pdf } from '@react-pdf/renderer'

/* -------------------- Types -------------------- */
type POStatus = 'ready to ship' | 'shipping' | 'completed'
type DOStatus = 'shipping' | 'delivered'

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
}

/* -------------------- PDF STYLES (react-pdf) -------------------- */
const pdfStyles = StyleSheet.create({
  page: { padding: 24, fontFamily: 'Helvetica', fontSize: 10, color: '#111827' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  logo: { width: 80, height: 40 },
  title: { fontSize: 16, fontWeight: '700' },
  section: { marginTop: 8, marginBottom: 6 },
  small: { fontSize: 9 },
  table: { display: 'table', width: 'auto', marginTop: 6 },
  tableRow: { flexDirection: 'row' },
  th: { fontSize: 9, fontWeight: '700', padding: 4, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  td: { fontSize: 9, padding: 4, borderWidth: 1, borderColor: '#e5e7eb' },
  right: { textAlign: 'right' },
  footer: { position: 'absolute', fontSize: 8, bottom: 20, left: 24, right: 24, textAlign: 'center', color: '#6b7280' },
})

/* -------------------- Component -------------------- */
export default function DeliveryTrackingPage() {
  // mode
  const [mode, setMode] = useState<'create' | 'process' | 'view'>('create')

  // search / pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | POStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // file refs
  const createShippingProofRef = useRef<HTMLInputElement | null>(null)
  const podProofRef = useRef<HTMLInputElement | null>(null)

  const seedPOs: PurchaseOrder[] = [
    {
      id: 'po-1',
      poNumber: 'PO-2024-001-01',
      date: '2024-01-20',
      supplier: 'PT. Supplier Elektronik',
      soReference: 'SO-2024-001',
      customerName: 'PT. Customer Utama',
      items: [
        { id: 'i1', productName: 'Laptop Dell XPS 13', sku: 'LP-DLL-XPS-13', quantity: 50, purchasePrice: 11500000 },
        { id: 'i2', productName: 'Laptop Stand', sku: 'ACC-STD-01', quantity: 50, purchasePrice: 150000 }
      ],
      status: 'ready to ship',
      totalAmount: 65000000,
      shippingProof: null,
      receiptProof: null
    },
    {
      id: 'po-2',
      poNumber: 'PO-2024-001-02',
      date: '2024-01-21',
      supplier: 'PT. Supplier Elektronik',
      soReference: 'SO-2024-001',
      customerName: 'PT. Customer Utama',
      items: [
        { id: 'i3', productName: 'Wireless Mouse Logitech', sku: 'ACC-MSE-LOG-01', quantity: 25, purchasePrice: 200000 },
        { id: 'i4', productName: 'Keyboard Mechanical', sku: 'ACC-KBD-MCH-01', quantity: 25, purchasePrice: 350000 }
      ],
      status: 'ready to ship',
      totalAmount: 13750000,
      shippingProof: null,
      receiptProof: null
    },
    {
      id: 'po-3',
      poNumber: 'PO-2024-002-01',
      date: '2024-01-22',
      supplier: 'CV. Komputer Mandiri',
      soReference: 'SO-2024-002',
      customerName: 'CV. Berkah Abadi',
      items: [
        { id: 'i5', productName: 'Monitor 24" Samsung', sku: 'MON-24-SAM-FHD', quantity: 40, purchasePrice: 3200000 },
        { id: 'i6', productName: 'Monitor 27" LG', sku: 'MON-27-LG-4K', quantity: 20, purchasePrice: 4500000 }
      ],
      status: 'completed',
      totalAmount: 218000000,
      trackingNumber: 'TIKI987654321',
      courier: 'TIKI',
      shippingDate: '2024-01-26',
      shippingCost: 35000,
      receivedDate: '2024-01-28',
      confirmationMethod: 'whatsapp',
      clientNotes: 'Barang diterima dengan baik dan sesuai pesanan. Packaging aman dan tidak ada kerusakan.',
      shippingProof: null,
      receiptProof: null
    },
    {
      id: 'po-4',
      poNumber: 'PO-2024-003-01',
      date: '2024-01-23',
      supplier: 'PT. Tech Solutions',
      soReference: 'SO-2024-003',
      customerName: 'PT. Digital Innovation',
      items: [
        { id: 'i7', productName: 'SSD 1TB Samsung', sku: 'SSD-1TB-SAM', quantity: 100, purchasePrice: 1200000 },
        { id: 'i8', productName: 'RAM 16GB DDR4', sku: 'RAM-16G-DDR4', quantity: 80, purchasePrice: 600000 }
      ],
      status: 'ready to ship',
      totalAmount: 168000000,
      shippingProof: null,
      receiptProof: null
    },
    {
      id: 'po-5',
      poNumber: 'PO-2024-004-01',
      date: '2024-01-24',
      supplier: 'CV. Elektro Nusantara',
      soReference: 'SO-2024-004',
      customerName: 'PT. Retail Indonesia',
      items: [
        { id: 'i9', productName: 'Tablet iPad Air', sku: 'TAB-IPD-AIR', quantity: 30, purchasePrice: 8500000 },
        { id: 'i10', productName: 'Apple Pencil', sku: 'ACC-APL-PEN', quantity: 30, purchasePrice: 1500000 }
      ],
      status: 'completed',
      totalAmount: 300000000,
      trackingNumber: 'JNT555666777',
      courier: 'J&T',
      shippingDate: '2024-01-28',
      shippingCost: 45000,
      shippingProof: null,
      receiptProof: null
    }
  ]

  const [poData, setPoData] = useState<PurchaseOrder[]>(seedPOs)

  /* -------------------- Seed DO data (examples) -------------------- */
  const seedDOs: DeliveryOrder[] = [
    {
      id: 'do-1',
      doNumber: 'DO-20241001-101',
      soReference: 'SO-2024-001',
      poIds: ['po-1', 'po-2'],
      courier: 'JNE',
      trackingNumber: 'JNE1234567890',
      shippingDate: '2024-02-01',
      shippingCost: 50000,
      shippingProof: null,
      status: 'shipping',
      proofOfDelivery: null,
      createdAt: new Date().toISOString()
    },
    {
      id: 'do-2',
      doNumber: 'DO-20241002-102',
      soReference: 'SO-2024-002',
      poIds: ['po-3'],
      courier: 'TIKI',
      trackingNumber: 'TIKI987654321',
      shippingDate: '2024-01-26',
      shippingCost: 35000,
      shippingProof: null,
      status: 'delivered',
      proofOfDelivery: null,
      receivedDate: '2024-01-28',
      receivedBy: 'Admin',
      createdAt: new Date().toISOString()
    }
  ]

  const [doData, setDoData] = useState<DeliveryOrder[]>(seedDOs)

  // ensure PO statuses reflect DO seeds (for demo)
  useEffect(() => {
    setPoData(prev =>
      prev.map(p =>
        seedDOs.some(d => d.poIds.includes(p.id))
          ? { ...p, status: doData.find(d => d.poIds.includes(p.id))?.status === 'shipping' ? 'shipping' : 'completed' }
          : p
      )
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // CREATE DO state
  const [selectedPOIds, setSelectedPOIds] = useState<string[]>([])
  const [createDOForm, setCreateDOForm] = useState({ courier: '', trackingNumber: '', shippingDate: '', shippingCost: '' })
  const [createShippingProof, setCreateShippingProof] = useState<File | null>(null)

  // PROCESS DO state
  const [selectedDOId, setSelectedDOId] = useState<string | null>(null)
  const [podForm, setPodForm] = useState({ receivedDate: '', receivedBy: '', confirmationMethod: '' })
  const [podFile, setPodFile] = useState<File | null>(null)

  /* -------------------- Derived & Helpers -------------------- */
  const term = searchTerm.trim().toLowerCase()
  const poFiltered = poData.filter(po => {
    const matchesSearch = !term || po.poNumber.toLowerCase().includes(term) || po.customerName.toLowerCase().includes(term) || po.soReference.toLowerCase().includes(term)
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(poFiltered.length / itemsPerPage))
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(1) }, [poFiltered.length, totalPages])

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = poFiltered.slice(indexOfFirstItem, indexOfLastItem)

  const readyToShipCount = poData.filter(p => p.status === 'ready to ship').length
  const shippingPOCount = poData.filter(p => p.status === 'shipping').length
  const completedPOCount = poData.filter(p => p.status === 'completed').length

  const shippingDOs = doData.filter(d => d.status === 'shipping')
  const deliveredDOs = doData.filter(d => d.status === 'delivered')

  /* -------------------- Selection helpers -------------------- */
  const toggleSelectPO = (id: string) => setSelectedPOIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  const selectAllPage = (checked: boolean) => {
    if (checked) {
      const pageReadyIds = currentItems.filter(ci => ci.status === 'ready to ship').map(ci => ci.id)
      setSelectedPOIds(prev => Array.from(new Set([...prev, ...pageReadyIds])))
    } else {
      setSelectedPOIds(prev => prev.filter(id => !currentItems.some(ci => ci.id === id)))
    }
  }

  const isValidSelectionForDO = () => {
    if (selectedPOIds.length === 0) return false
    const selected = poData.filter(p => selectedPOIds.includes(p.id))
    if (selected.some(s => s.status !== 'ready to ship')) return false
    const soSet = new Set(selected.map(s => s.soReference))
    return soSet.size === 1
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
  const handleCreateDO = () => {
    if (!isValidSelectionForDO()) {
      alert('Pilih minimal 1 PO Ready to Ship dan pastikan semua PO berasal dari 1 SO yang sama.')
      return
    }
    if (!createDOForm.courier || !createDOForm.trackingNumber || !createDOForm.shippingDate) {
      alert('Isi courier, tracking number, dan shipping date.')
      return
    }

    const selectedPOs = poData.filter(p => selectedPOIds.includes(p.id))
    const soRef = selectedPOs[0].soReference

    const newDo: DeliveryOrder = {
      id: `do-${Date.now()}`,
      doNumber: `DO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*900+100)}`,
      soReference: soRef,
      poIds: selectedPOIds.slice(),
      courier: createDOForm.courier,
      trackingNumber: createDOForm.trackingNumber,
      shippingDate: createDOForm.shippingDate,
      shippingCost: createDOForm.shippingCost ? Number(createDOForm.shippingCost) : undefined,
      shippingProof: createShippingProof ?? null,
      status: 'shipping',
      createdAt: new Date().toISOString()
    }

    // add DO
    setDoData(prev => [newDo, ...prev])

    // update PO -> shipping & attach shipping fields
    setPoData(prev => prev.map(po => selectedPOIds.includes(po.id) ? {
      ...po,
      status: 'shipping',
      courier: createDOForm.courier,
      trackingNumber: createDOForm.trackingNumber,
      shippingDate: createDOForm.shippingDate,
      shippingCost: createDOForm.shippingCost ? Number(createDOForm.shippingCost) : undefined,
      shippingProof: createShippingProof
    } : po))

    // clear
    setSelectedPOIds([])
    setCreateDOForm({ courier: '', trackingNumber: '', shippingDate: '', shippingCost: '' })
    setCreateShippingProof(null)

    setMode('process')
  }

  /* -------------------- Process DO (POD) -------------------- */
  const handleStartProcessDO = (doId: string) => {
    setSelectedDOId(prev => prev === doId ? null : doId)
    setPodFile(null)
    setPodForm({ receivedDate: '', receivedBy: '', confirmationMethod: '' })
  }

  const handleSubmitPOD = () => {
    if (!selectedDOId) return alert('Pilih DO untuk diproses.')
    if (!podFile || !podForm.receivedDate || !podForm.receivedBy) return alert('Upload proof & isi received date & received by.')

    // mark DO delivered
    setDoData(prev => prev.map(d => d.id === selectedDOId ? { ...d, status: 'delivered', proofOfDelivery: podFile, receivedDate: podForm.receivedDate, receivedBy: podForm.receivedBy, confirmationMethod: podForm.confirmationMethod || undefined } : d))

    // update related POs -> completed
    const doItem = doData.find(d => d.id === selectedDOId)
    const poIds = doItem?.poIds ?? []
    setPoData(prev => prev.map(po => poIds.includes(po.id) ? {
      ...po,
      status: 'completed',
      receivedDate: podForm.receivedDate,
      confirmationMethod: podForm.confirmationMethod || undefined,
      clientNotes: po.clientNotes ?? `Received by ${podForm.receivedBy}`,
      receiptProof: podFile
    } : po))

    setSelectedDOId(null)
    setPodFile(null)
    setPodForm({ receivedDate: '', receivedBy: '', confirmationMethod: '' })
    alert('DO processed: marked delivered and related PO set to completed.')
  }

  /* -------------------- Export PDF (react-pdf) helpers -------------------- */

  // DO Report Document component (react-pdf)
  const DOReportDoc = ({ doItem, relatedPOs }: { doItem: DeliveryOrder, relatedPOs: PurchaseOrder[] }) => (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image src="/images/logo/logo.png" style={pdfStyles.logo} />
            <View>
              <Text style={pdfStyles.title}>Delivery Order Report</Text>
              <Text style={pdfStyles.small}>{doItem.doNumber} • {doItem.soReference}</Text>
            </View>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text style={pdfStyles.small}>Date: {new Date(doItem.createdAt).toLocaleDateString('id-ID')}</Text>
            <Text style={pdfStyles.small}>Status: {doItem.status}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={{ fontSize: 11, fontWeight: '700' }}>Shipment Info</Text>
          <Text style={pdfStyles.small}>Courier: {doItem.courier ?? '-'}</Text>
          <Text style={pdfStyles.small}>Tracking: {doItem.trackingNumber ?? '-'}</Text>
          <Text style={pdfStyles.small}>Shipping Date: {doItem.shippingDate ?? '-'}</Text>
          <Text style={pdfStyles.small}>Shipping Cost: {doItem.shippingCost ? `Rp ${doItem.shippingCost.toLocaleString('id-ID')}` : '-'}</Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={{ fontSize: 11, fontWeight: '700', marginBottom: 4 }}>Related POs</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableRow}>
              <Text style={[pdfStyles.th, { width: '25%' }]}>PO Number</Text>
              <Text style={[pdfStyles.th, { width: '35%' }]}>Customer</Text>
              <Text style={[pdfStyles.th, { width: '20%', textAlign: 'right' }]}>Total</Text>
              <Text style={[pdfStyles.th, { width: '20%', textAlign: 'center' }]}>Status</Text>
            </View>
            {relatedPOs.map((p, idx) => (
              <View key={p.id} style={pdfStyles.tableRow}>
                <Text style={[pdfStyles.td, { width: '25%' }]}>{p.poNumber}</Text>
                <Text style={[pdfStyles.td, { width: '35%' }]}>{p.customerName}</Text>
                <Text style={[pdfStyles.td, { width: '20%', textAlign: 'right' }]}>{`Rp ${p.totalAmount.toLocaleString('id-ID')}`}</Text>
                <Text style={[pdfStyles.td, { width: '20%', textAlign: 'center' }]}>{p.status}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={pdfStyles.footer}>Generated by system • {new Date().toLocaleDateString('id-ID')}</Text>
      </Page>
    </Document>
  )

  // Invoice Document component (react-pdf) - flatten items from POs into invoice rows
  const InvoiceDoc = ({ doItem, relatedPOs }: { doItem: DeliveryOrder, relatedPOs: PurchaseOrder[] }) => {
    const allItems = relatedPOs.flatMap(po => po.items.map(it => ({ ...it, poNumber: po.poNumber })))
    const subtotal = allItems.reduce((s, it) => s + (it.quantity * it.purchasePrice), 0)
    const shipping = doItem.shippingCost || 0
    const total = subtotal + shipping

    return (
      <Document>
        <Page size="A4" style={pdfStyles.page}>
          <View style={pdfStyles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image src="/images/logo/logo.png" style={pdfStyles.logo} />
              <View>
                <Text style={pdfStyles.title}>PT Placeholder Logistics</Text>
                <Text style={pdfStyles.small}>Jl. Contoh No.123 • Jakarta</Text>
              </View>
            </View>
            <View style={{ textAlign: 'right' }}>
              <Text style={{ fontSize: 12, fontWeight: '700' }}>INVOICE</Text>
              <Text style={pdfStyles.small}>No: INV-{doItem.doNumber}</Text>
              <Text style={pdfStyles.small}>Date: {new Date().toLocaleDateString('id-ID')}</Text>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={{ fontSize: 11, fontWeight: '700' }}>Bill To:</Text>
            <Text style={pdfStyles.small}>{relatedPOs[0]?.customerName ?? '-'}</Text>
            <Text style={pdfStyles.small}>SO: {relatedPOs.map(p => p.soReference).join(', ') || '-'}</Text>
            <Text style={pdfStyles.small}>PO(s): {relatedPOs.map(p => p.poNumber).join(', ') || '-'}</Text>
          </View>

          <View style={pdfStyles.section}>
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableRow}>
                <Text style={[pdfStyles.th, { width: '6%' }]}>No</Text>
                <Text style={[pdfStyles.th, { width: '44%' }]}>Description</Text>
                <Text style={[pdfStyles.th, { width: '16%', textAlign: 'center' }]}>SKU</Text>
                <Text style={[pdfStyles.th, { width: '8%', textAlign: 'center' }]}>Qty</Text>
                <Text style={[pdfStyles.th, { width: '14%', textAlign: 'right' }]}>Unit</Text>
                <Text style={[pdfStyles.th, { width: '12%', textAlign: 'right' }]}>Total</Text>
              </View>

              {allItems.map((it, idx) => (
                <View key={idx} style={pdfStyles.tableRow}>
                  <Text style={[pdfStyles.td, { width: '6%', textAlign: 'center' }]}>{idx + 1}</Text>
                  <Text style={[pdfStyles.td, { width: '44%' }]}>{it.productName}</Text>
                  <Text style={[pdfStyles.td, { width: '16%', textAlign: 'center' }]}>{it.sku}</Text>
                  <Text style={[pdfStyles.td, { width: '8%', textAlign: 'center' }]}>{it.quantity}</Text>
                  <Text style={[pdfStyles.td, { width: '14%', textAlign: 'right' }]}>{`Rp ${it.purchasePrice.toLocaleString('id-ID')}`}</Text>
                  <Text style={[pdfStyles.td, { width: '12%', textAlign: 'right' }]}>{`Rp ${(it.quantity * it.purchasePrice).toLocaleString('id-ID')}`}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
            <Text style={pdfStyles.small}>Subtotal: Rp {subtotal.toLocaleString('id-ID')}</Text>
            <Text style={pdfStyles.small}>Shipping: Rp {shipping.toLocaleString('id-ID')}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', marginTop: 4 }}>Total: Rp {total.toLocaleString('id-ID')}</Text>
          </View>

          <Text style={pdfStyles.footer}>Invoice generated by system • {new Date().toLocaleDateString('id-ID')}</Text>
        </Page>
      </Document>
    )
  }

  // helper to create blob and trigger download from react-pdf Document
  const downloadPdfDocument = async (docElement: JSX.Element, filename: string) => {
    try {
      const asPdf = pdf(docElement)
      const blob = await asPdf.toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF generation error', err)
      alert('Gagal generate PDF. Check console.')
    }
  }

  /* -------------------- Export DO to PDF (react-pdf) -------------------- */
  const exportDOToPDF = (doId: string) => {
    const doItem = doData.find(d => d.id === doId)
    if (!doItem) return alert('DO not found')
    const relatedPOs = poData.filter(p => doItem.poIds.includes(p.id))
    const docElement = <DOReportDoc doItem={doItem} relatedPOs={relatedPOs} />
    const filename = `${doItem.doNumber}.pdf`
    downloadPdfDocument(docElement, filename)
  }

  /* -------------------- Export Invoice for DO (react-pdf) -------------------- */
  const exportInvoiceForDO = (doId: string) => {
    const doItem = doData.find(d => d.id === doId)
    if (!doItem) return alert('DO not found')
    const relatedPOs = poData.filter(p => doItem.poIds.includes(p.id))
    const docElement = <InvoiceDoc doItem={doItem} relatedPOs={relatedPOs} />
    const filename = `Invoice_${doItem.doNumber}.pdf`
    downloadPdfDocument(docElement, filename)
  }

  /* -------------------- Export CSV for all DOs in VIEW table -------------------- */
  const exportAllDOsToCSV = () => {
    if (!doData || doData.length === 0) {
      alert('No DOs to export')
      return
    }

    const headers = ['DO Number', 'SO', 'PO Count', 'PO IDs', 'Courier', 'Tracking', 'Status', 'Shipping Date', 'Shipping Cost', 'Received Date', 'Received By', 'Confirmation Method', 'Created At']
    const rows = doData.map(d => [
      d.doNumber,
      d.soReference,
      String(d.poIds.length),
      d.poIds.join('|'),
      d.courier || '',
      d.trackingNumber || '',
      d.status,
      d.shippingDate || '',
      d.shippingCost ? String(d.shippingCost) : '',
      d.receivedDate || '',
      d.receivedBy || '',
      d.confirmationMethod || '',
      d.createdAt || ''
    ])

    const csvContent = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `delivery_orders_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* -------------------- UI helpers -------------------- */
  const renderPOStatusBadge = (s: POStatus) => {
    if (s === 'ready to ship') return <Badge className="bg-blue-100 text-blue-800">Ready</Badge>
    if (s === 'shipping') return <Badge className="bg-yellow-100 text-yellow-800">Shipping</Badge>
    return <Badge className="bg-green-100 text-green-800">Completed</Badge>
  }
  const renderDOStatusBadge = (s: DOStatus) => s === 'shipping' ? <Badge className="bg-yellow-100 text-yellow-800">Shipping</Badge> : <Badge className="bg-green-100 text-green-800">Delivered</Badge>

  const copyToClipboard = async (text: string) => {
    try { await navigator.clipboard.writeText(text); alert('Copied to clipboard') } catch { alert('Unable to copy') }
  }

  /* -------------------- Pagination component -------------------- */
  const Pagination = () => (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="text-sm text-gray-600">
        Showing {Math.min(poFiltered.length, indexOfFirstItem + 1)} to {Math.min(indexOfLastItem, poFiltered.length)} of {poFiltered.length} results
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const pageNum = i + 1
          return <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(pageNum)}>{pageNum}</Button>
        })}
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
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
                <Button variant={mode === 'create' ? 'default' : 'outline'} onClick={() => setMode('create')}>DO CREATE</Button>
                <Button variant={mode === 'process' ? 'default' : 'outline'} onClick={() => setMode('process')}>DO PROCESS</Button>
                <Button variant={mode === 'view' ? 'default' : 'outline'} onClick={() => setMode('view')}>VIEW DOs</Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input className="pl-10 w-64" placeholder="Search PO number, customer, SO..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="border rounded px-3 py-2 text-sm">
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

            {/* Table area */}
            <div className="overflow-x-auto">
              {/* CREATE MODE */}
              {mode === 'create' && (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <input type="checkbox" checked={currentItems.length > 0 && currentItems.every(ci => selectedPOIds.includes(ci.id) || ci.status !== 'ready to ship')} onChange={(e) => selectAllPage(e.target.checked)} />
                        </TableHead>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>SO Reference</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentItems.map(po => (
                        <TableRow key={po.id} className={`hover:bg-gray-50 ${selectedPOIds.includes(po.id) ? 'bg-blue-50' : ''}`}>
                          <TableCell>
                            <input type="checkbox" checked={selectedPOIds.includes(po.id)} disabled={po.status !== 'ready to ship'} onChange={() => toggleSelectPO(po.id)} />
                          </TableCell>
                          <TableCell className="font-medium">{po.poNumber}</TableCell>
                          <TableCell>{po.customerName}</TableCell>
                          <TableCell className="text-blue-600">{po.soReference}</TableCell>
                          <TableCell>{po.supplier}</TableCell>
                          <TableCell>{renderPOStatusBadge(po.status)}</TableCell>
                          <TableCell className="text-right">Rp {po.totalAmount.toLocaleString('id-ID')}</TableCell>
                        </TableRow>
                      ))}
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
                              <input className="w-full border rounded px-3 py-2" value={createDOForm.courier} onChange={e => setCreateDOForm(p => ({ ...p, courier: e.target.value }))} />
                            </div>
                            <div>
                              <Label>Tracking Number *</Label>
                              <input className="w-full border rounded px-3 py-2" value={createDOForm.trackingNumber} onChange={e => setCreateDOForm(p => ({ ...p, trackingNumber: e.target.value }))} />
                            </div>
                            <div>
                              <Label>Shipping Date *</Label>
                              <input type="date" className="w-full border rounded px-3 py-2" value={createDOForm.shippingDate} onChange={e => setCreateDOForm(p => ({ ...p, shippingDate: e.target.value }))} />
                            </div>
                            <div>
                              <Label>Shipping Cost</Label>
                              <input type="number" className="w-full border rounded px-3 py-2" value={createDOForm.shippingCost} onChange={e => setCreateDOForm(p => ({ ...p, shippingCost: e.target.value }))} />
                            </div>
                          </div>

                          <div className="mt-3">
                            <Label>Shipping Proof (optional)</Label>
                            <div className="flex items-center gap-2 mt-2">
                              <Button variant="outline" onClick={() => createShippingProofRef.current?.click()}><Upload className="h-4 w-4 mr-2" /> Upload</Button>
                              <input ref={createShippingProofRef} type="file" className="hidden" onChange={handleCreateShippingProof} accept=".pdf,.jpg,.jpeg,.png" />
                              <div className="text-sm text-gray-600">{createShippingProof ? createShippingProof.name : 'No file uploaded'}</div>
                            </div>
                          </div>

                          <div className="mt-4 flex gap-2">
                            <Button onClick={handleCreateDO} disabled={!isValidSelectionForDO()}><Truck className="h-4 w-4 mr-2" /> Create DO ({selectedPOIds.length})</Button>
                            <Button variant="ghost" onClick={() => { setSelectedPOIds([]); setCreateDOForm({ courier: '', trackingNumber: '', shippingDate: '', shippingCost: '' }); setCreateShippingProof(null) }}>Clear</Button>
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
                            <div className="mt-2 text-xs text-gray-500">Rules: only PO with status <strong>Ready to Ship</strong>. All selected must be from same SO.</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="mt-4">{poFiltered.length > 0 && <Pagination />}</div>
                </>
              )}

              {/* PROCESS MODE */}
              {mode === 'process' && (
                <>
                  <div className="mb-3 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => { /* helper */ }}>Refresh</Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>DO Number</TableHead>
                        <TableHead>SO</TableHead>
                        <TableHead>PO Count</TableHead>
                        <TableHead>Courier</TableHead>
                        <TableHead>Tracking</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shippingDOs.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-sm text-gray-500">No DOs in shipping state</TableCell></TableRow>
                      )}
                      {shippingDOs.map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.doNumber}</TableCell>
                          <TableCell>{d.soReference}</TableCell>
                          <TableCell>{d.poIds.length}</TableCell>
                          <TableCell>{d.courier}</TableCell>
                          <TableCell className="text-blue-600">{d.trackingNumber}</TableCell>
                          <TableCell>{renderDOStatusBadge(d.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant={selectedDOId === d.id ? 'default' : 'outline'} onClick={() => handleStartProcessDO(d.id)}>{selectedDOId === d.id ? 'Cancel' : 'Process'}</Button>
                              <Button size="sm" variant="outline" onClick={() => exportDOToPDF(d.id)}><Download className="h-4 w-4 mr-1" />Export PDF</Button>
                              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(d.trackingNumber ?? '')}><Copy className="h-4 w-4 mr-1" />Copy</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {selectedDOId && (
                    <div className="mt-4">
                      <Card>
                        <CardHeader><CardTitle>Process DO - Proof of Delivery</CardTitle></CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label>Upload POD (file)</Label>
                              <div className="flex items-center gap-2 mt-2">
                                <Button variant="outline" onClick={() => podProofRef.current?.click()}><Upload className="h-4 w-4 mr-2" /> Upload</Button>
                                <input ref={podProofRef} type="file" className="hidden" onChange={handlePodProof} accept=".pdf,.jpg,.jpeg,.png" />
                                <div className="text-sm text-gray-600">{podFile ? podFile.name : 'No file'}</div>
                              </div>
                            </div>
                            <div>
                              <Label>Received Date *</Label>
                              <input type="date" className="w-full border rounded px-3 py-2" value={podForm.receivedDate} onChange={(e) => setPodForm(p => ({ ...p, receivedDate: e.target.value }))} />
                            </div>
                            <div>
                              <Label>Received By *</Label>
                              <input className="w-full border rounded px-3 py-2" value={podForm.receivedBy} onChange={(e) => setPodForm(p => ({ ...p, receivedBy: e.target.value }))} />
                            </div>
                            <div>
                              <Label>Confirmation Method</Label>
                              <select className="w-full border rounded px-3 py-2" value={podForm.confirmationMethod} onChange={(e) => setPodForm(p => ({ ...p, confirmationMethod: e.target.value }))}>
                                <option value="">Select method</option>
                                <option value="whatsapp">WhatsApp</option>
                                <option value="email">Email</option>
                                <option value="call">Phone Call</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            <div className="md:col-span-2">
                              <Label>Notes (auto)</Label>
                              <input className="w-full border rounded px-3 py-2" value={podForm.receivedBy ? `Received by ${podForm.receivedBy}` : ''} readOnly />
                            </div>
                          </div>

                          <div className="mt-4 flex gap-2">
                            <Button onClick={handleSubmitPOD}><CheckCircle className="h-4 w-4 mr-2" /> Submit POD</Button>
                            <Button variant="ghost" onClick={() => { setSelectedDOId(null); setPodFile(null); setPodForm({ receivedDate: '', receivedBy: '', confirmationMethod: '' }) }}>Cancel</Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              )}

              {/* VIEW MODE */}
              {mode === 'view' && (
                <>
                  <div className="mb-3 flex justify-between items-center">
                    <div />
                    <div className="flex gap-2">
                      <Button onClick={exportAllDOsToCSV} variant="outline">Export CSV (All DOs)</Button>
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
                        <TableHead>Status</TableHead>
                        <TableHead>Shipping Cost</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {doData.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-sm text-gray-500">No DOs created yet.</TableCell></TableRow>}
                      {doData.map(d => (
                        <TableRow key={d.id}>
                          <TableCell>{d.doNumber}</TableCell>
                          <TableCell>{d.soReference}</TableCell>
                          <TableCell>{d.poIds.length}</TableCell>
                          <TableCell>{d.courier}</TableCell>
                          <TableCell className="text-blue-600">{d.trackingNumber}</TableCell>
                          <TableCell>{renderDOStatusBadge(d.status)}</TableCell>
                          <TableCell>{d.shippingCost ? `Rp ${d.shippingCost.toLocaleString('id-ID')}` : '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => exportDOToPDF(d.id)}><Download className="h-4 w-4 mr-1" />Export PDF</Button>
                              <Button size="sm" variant="outline" onClick={() => exportInvoiceForDO(d.id)}>Generate Invoice</Button>
                              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(d.trackingNumber ?? '')}><Copy className="h-4 w-4 mr-1" />Copy</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
