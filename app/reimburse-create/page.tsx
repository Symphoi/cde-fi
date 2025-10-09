'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Upload, FileText, Calendar, DollarSign, Save, X, Eye, Download } from 'lucide-react';

// Import React PDF
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

type ReimburseItem = {
  id: number;
  date: string;
  description: string;
  category: string;
  total: string;
  attachment: string;
};

type ReimburseForm = {
  title: string;
  notes?: string;
  items: ReimburseItem[];
  grandTotal: number;
};

type ReimburseHistory = {
  id: string;
  reimburseNumber: string;
  title: string;
  submittedDate: string;
  status: 'submitted' | 'approved' | 'rejected' | 'paid';
  totalAmount: number;
  itemsCount: number;
};

type ReimburseDetail = {
  id: string;
  reimburseNumber: string;
  title: string;
  notes?: string;
  submittedBy: string;
  submittedDate: string;
  submittedTime: string;
  items: ReimburseItem[];
  grandTotal: number;
  status: 'submitted' | 'approved' | 'rejected' | 'paid';
  approvedBy?: string;
  approvedDate?: string;
  rejectionReason?: string;
};

// Styles untuk PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#6b7280',
  },
  section: {
    marginBottom: 15,
    padding: 10,
    border: '1px solid #e5e7eb',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  value: {
    fontSize: 10,
    color: '#1f2937',
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginTop: 10,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f3f4f6',
    padding: 5,
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
  },
  tableCellHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableCell: {
    fontSize: 8,
    textAlign: 'left',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1px solid #e5e7eb',
  },
  totalText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#065f46',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
  },
});

// PDF Document Component
const ReimbursePDF = ({ reimburse }: { reimburse: ReimburseDetail }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <Text style={styles.header}>DETAIL PENGAJUAN REIMBURSE</Text>
      <Text style={styles.subtitle}>{reimburse.reimburseNumber}</Text>

      {/* Informasi Pengajuan */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informasi Pengajuan</Text>
        
        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Judul Pengajuan</Text>
            <Text style={styles.value}>{reimburse.title}</Text>
          </View>
          <View>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{reimburse.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Diajukan Oleh</Text>
            <Text style={styles.value}>{reimburse.submittedBy}</Text>
          </View>
          <View>
            <Text style={styles.label}>Tanggal Ajuan</Text>
            <Text style={styles.value}>{reimburse.submittedDate} {reimburse.submittedTime}</Text>
          </View>
        </View>

        {reimburse.notes && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.label}>Catatan</Text>
            <Text style={styles.value}>{reimburse.notes}</Text>
          </View>
        )}

        {reimburse.approvedBy && (
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Disetujui Oleh</Text>
              <Text style={styles.value}>{reimburse.approvedBy}</Text>
            </View>
            <View>
              <Text style={styles.label}>Tanggal Approval</Text>
              <Text style={styles.value}>{reimburse.approvedDate}</Text>
            </View>
          </View>
        )}

        {reimburse.rejectionReason && (
          <View style={{ marginTop: 10 }}>
            <Text style={[styles.label, { color: '#dc2626' }]}>Alasan Penolakan</Text>
            <Text style={styles.value}>{reimburse.rejectionReason}</Text>
          </View>
        )}
      </View>

      {/* Detail Pengeluaran */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detail Pengeluaran ({reimburse.items.length} items)</Text>
        
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Tanggal</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Keterangan</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Kategori</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Total (Rp)</Text>
            </View>
          </View>
          
          {/* Table Rows */}
          {reimburse.items.map((item) => (
            <View style={styles.tableRow} key={item.id}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {new Date(item.date).toLocaleDateString('id-ID')}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{item.description}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{item.category}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {Number(item.total).toLocaleString('id-ID')}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Grand Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>Grand Total:</Text>
          <Text style={styles.totalText}>Rp {reimburse.grandTotal.toLocaleString('id-ID')}</Text>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Dokumen ini dibuat secara otomatis pada {new Date().toLocaleDateString('id-ID')} • © {new Date().getFullYear()} 
      </Text>
    </Page>
  </Document>
);

export default function ReimburseCreatePage() {
  const [form, setForm] = useState<ReimburseForm>({
    title: '',
    notes: '',
    items: [
      { 
        id: 1, 
        date: new Date().toISOString().split('T')[0], 
        description: '', 
        category: '', 
        total: '',
        attachment: ''
      }
    ],
    grandTotal: 0
  });

  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [selectedReimburse, setSelectedReimburse] = useState<ReimburseDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const categories = [
    'Transportasi',
    'Akomodasi',
    'Makanan & Minuman',
    'Bahan Habis Pakai',
    'Perbaikan & Maintenance',
    'Lain-lain'
  ];

  // Mock history data
  const reimburseHistory: ReimburseHistory[] = [
    {
      id: '1',
      reimburseNumber: 'REIM-2024-001',
      title: 'Business Trip Jakarta Meeting Client',
      submittedDate: '2024-01-20',
      status: 'approved',
      totalAmount: 2420000,
      itemsCount: 3
    },
    {
      id: '2',
      reimburseNumber: 'REIM-2024-002',
      title: 'Pembelian alat kantor',
      submittedDate: '2024-01-22',
      status: 'submitted',
      totalAmount: 1210000,
      itemsCount: 2
    },
    {
      id: '3',
      reimburseNumber: 'REIM-2024-003',
      title: 'Perbaikan komputer',
      submittedDate: '2024-01-18',
      status: 'rejected',
      totalAmount: 715000,
      itemsCount: 1
    },
    {
      id: '4',
      reimburseNumber: 'REIM-2024-004',
      title: 'Team building dinner',
      submittedDate: '2024-01-17',
      status: 'paid',
      totalAmount: 1200000,
      itemsCount: 1
    }
  ];

  // Mock detail data
  const mockReimburseDetail: ReimburseDetail = {
    id: '1',
    reimburseNumber: 'REIM-2024-001',
    title: 'Business Trip Jakarta Meeting Client',
    notes: 'Meeting dengan client PT. Maju Jaya untuk presentasi produk baru dan negosiasi kontrak tahun 2024',
    submittedBy: 'Ahmad Wijaya',
    submittedDate: '2024-01-20',
    submittedTime: '14:30',
    items: [
      {
        id: 1,
        date: '2024-01-15',
        description: 'Tiket pesawat Jakarta-Surabaya kelas ekonomi',
        category: 'Transportasi',
        total: '850000',
        attachment: 'tiket_pesawat.pdf'
      },
      {
        id: 2,
        date: '2024-01-16',
        description: 'Hotel 2 malam di Hotel Santika',
        category: 'Akomodasi',
        total: '1320000',
        attachment: 'invoice_hotel.pdf'
      },
      {
        id: 3,
        date: '2024-01-16',
        description: 'Transportasi taxi meeting client',
        category: 'Transportasi',
        total: '250000',
        attachment: 'taxi_receipt.jpg'
      }
    ],
    grandTotal: 2420000,
    status: 'approved',
    approvedBy: 'Budi Santoso',
    approvedDate: '2024-01-21 10:15'
  };

  // Update cell value
  const updateCell = (id: number, field: string, value: string) => {
    const updatedItems = form.items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        return updatedItem;
      }
      return item;
    });
    
    setForm(prev => ({ ...prev, items: updatedItems }));
    calculateGrandTotal(updatedItems);
  };

  // Add new row
  const addNewRow = () => {
    const newItem: ReimburseItem = { 
      id: form.items.length + 1, 
      date: new Date().toISOString().split('T')[0], 
      description: '', 
      category: '', 
      total: '',
      attachment: ''
    };
    
    const updatedItems = [...form.items, newItem];
    setForm(prev => ({ ...prev, items: updatedItems }));
    calculateGrandTotal(updatedItems);
  };

  // Remove row
  const removeRow = (id: number) => {
    if (form.items.length > 1) {
      const updatedItems = form.items.filter(item => item.id !== id);
      setForm(prev => ({ ...prev, items: updatedItems }));
      calculateGrandTotal(updatedItems);
    }
  };

  // Handle file upload for specific row
  const handleFileUpload = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const updatedItems = form.items.map(item => 
      item.id === id ? { ...item, attachment: file.name } : item
    );
    
    setForm(prev => ({ ...prev, items: updatedItems }));
  };

  // Remove attachment from specific row
  const removeAttachment = (id: number) => {
    const updatedItems = form.items.map(item => 
      item.id === id ? { ...item, attachment: '' } : item
    );
    
    setForm(prev => ({ ...prev, items: updatedItems }));
  };

  // Calculate grand total
  const calculateGrandTotal = (items: ReimburseItem[]) => {
    if (!items || !Array.isArray(items)) {
      setForm(prev => ({ ...prev, grandTotal: 0 }));
      return;
    }

    const grandTotal = items.reduce((sum, item) => {
      const itemTotal = Number(item.total) || 0;
      return sum + itemTotal;
    }, 0);
    
    setForm(prev => ({ ...prev, grandTotal }));
  };

  // Submit form
  const handleSubmit = () => {
    const hasEmptyFields = form.items.some(item => 
      !item.date || !item.description || !item.category || !item.total
    );

    if (hasEmptyFields) {
      alert('Harap lengkapi semua field yang wajib diisi pada tabel items');
      return;
    }

    if (!form.title) {
      alert('Harap isi judul pengajuan');
      return;
    }

    const hasValidTotal = form.items.some(item => Number(item.total) > 0);
    if (!hasValidTotal) {
      alert('Harap isi total pengeluaran minimal untuk satu item');
      return;
    }

    console.log('Submitting reimburse:', {
      ...form,
      items: form.items.map(item => ({
        ...item,
        total: Number(item.total)
      }))
    });

    alert(`Pengajuan reimburse berhasil dikirim! Total: Rp ${form.grandTotal.toLocaleString()}`);
    
    setForm({
      title: '',
      notes: '',
      items: [
        { 
          id: 1, 
          date: new Date().toISOString().split('T')[0], 
          description: '', 
          category: '', 
          total: '',
          attachment: ''
        }
      ],
      grandTotal: 0
    });
  };

  // View detail from history
  const viewDetail = (reimburse: ReimburseHistory) => {
    setSelectedReimburse({
      ...mockReimburseDetail,
      id: reimburse.id,
      reimburseNumber: reimburse.reimburseNumber,
      title: reimburse.title,
      grandTotal: reimburse.totalAmount,
      status: reimburse.status
    });
    setShowDetailModal(true);
  };

  // Close detail modal
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedReimburse(null);
  };

  // Export to PDF menggunakan React PDF
  const exportToPDF = async () => {
    if (!selectedReimburse) return;

    try {
      const exportBtn = document.querySelector('.export-pdf-btn') as HTMLButtonElement;
      if (exportBtn) {
        exportBtn.disabled = true;
        exportBtn.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Generating...';
      }

      // Generate PDF blob
      const blob = await pdf(<ReimbursePDF reimburse={selectedReimburse} />).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedReimburse.reimburseNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Restore button state
      if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.innerHTML = '<Download className="h-4 w-4 mr-2" /> Export PDF';
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
      
      const exportBtn = document.querySelector('.export-pdf-btn') as HTMLButtonElement;
      if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.innerHTML = '<Download className="h-4 w-4 mr-2" /> Export PDF';
      }
    }
  };

  const getStatusColor = (status: ReimburseHistory['status']) => {
    const colors = {
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-purple-100 text-purple-800'
    };
    return colors[status];
  };

  const downloadAttachment = (filename: string) => {
    console.log('Downloading:', filename);
    alert(`Downloading ${filename}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pengajuan Reimburse</h1>
          <p className="text-gray-600 mt-2">Kelola pengajuan dan riwayat reimburse</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex space-x-8">
          <button
            className={`pb-4 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('create')}
          >
            Buat Pengajuan Baru
          </button>
          <button
            className={`pb-4 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('history')}
          >
            Riwayat Pengajuan
          </button>
        </div>
      </div>

      {/* Create Tab */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          {/* Detail Pengeluaran */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Detail Pengeluaran</CardTitle>
                  <CardDescription>Tambahkan item pengeluaran yang akan direimburse</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addNewRow}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Baris
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Notes */}
              <div className="mb-6 ">
                <Label htmlFor="notes" className="bg-white mb-2" >Judul Pengajuan *</Label>
                <Input
                  className="bg-white mb-2"
                  id="title"
                  placeholder="Contoh: Business Trip Jakarta, Pembelian Alat Kantor, dll."
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                />
                <Label htmlFor="notes" className="text-sm font-medium mb-2 block">
                  Catatan (Opsional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Tambahkan catatan atau penjelasan khusus untuk semua item..."
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="bg-white"
                />
              </div>

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Tanggal *</TableHead>
                      <TableHead className="min-w-[200px]">Keterangan *</TableHead>
                      <TableHead className="w-[150px]">Kategori *</TableHead>
                      <TableHead className="w-[150px]">Total (Rp) *</TableHead>
                      <TableHead className="w-[120px]">Lampiran</TableHead>
                      <TableHead className="w-[80px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.items.map((item, index) => (
                      <TableRow key={item.id} className="hover:bg-gray-50/50">
                        {/* Date */}
                        <TableCell>
                          <Input
                            type="date"
                            value={item.date}
                            onChange={(e) => updateCell(item.id, 'date', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </TableCell>

                        {/* Description */}
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) => updateCell(item.id, 'description', e.target.value)}
                            placeholder="Deskripsi pengeluaran..."
                            className="h-8 text-sm"
                          />
                        </TableCell>

                        {/* Category */}
                        <TableCell>
                          <Select 
                            value={item.category} 
                            onValueChange={(value) => updateCell(item.id, 'category', value)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Pilih" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat} value={cat} className="text-sm">
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Total */}
                        <TableCell>
                          <Input
                            type="number"
                            value={item.total}
                            onChange={(e) => updateCell(item.id, 'total', e.target.value)}
                            placeholder="0"
                            className="h-8 text-sm"
                          />
                        </TableCell>

                        {/* Attachment */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.attachment ? (
                              <div className="flex items-center gap-1">
                                <FileText className="h-4 w-4 text-green-600" />
                                <span className="text-xs truncate max-w-[80px]">{item.attachment}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAttachment(item.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById(`file-upload-${item.id}`)?.click()}
                                className="h-6 text-xs"
                              >
                                <Upload className="h-3 w-3 mr-1" />
                                Upload
                              </Button>
                            )}
                            <input
                              id={`file-upload-${item.id}`}
                              type="file"
                              className="hidden"
                              onChange={(e) => handleFileUpload(item.id, e)}
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            />
                          </div>
                        </TableCell>

                        {/* Action */}
                        <TableCell>
                          {form.items.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRow(item.id)}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <Label className="text-xs text-gray-500">Total Items</Label>
                    <p className="font-semibold">{form.items.length} items</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Grand Total</Label>
                    <p className="font-semibold text-lg text-green-600">Rp {form.grandTotal.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-6">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700" 
                  onClick={handleSubmit}
                  disabled={form.items.length === 0 || !form.title}
                  size="lg"
                >
                  <Save className="h-5 w-5 mr-2" />
                  Ajukan Reimburse
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Pengajuan Reimburse</CardTitle>
            <CardDescription>Daftar pengajuan reimburse yang pernah dibuat</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reimburse No</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead>Tanggal Ajuan</TableHead>
                  <TableHead>Jumlah Item</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reimburseHistory.map((reimburse) => (
                  <TableRow key={reimburse.id}>
                    <TableCell className="font-semibold">
                      {reimburse.reimburseNumber}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{reimburse.title}</div>
                    </TableCell>
                    <TableCell>
                      {new Date(reimburse.submittedDate).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{reimburse.itemsCount} items</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      Rp {reimburse.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(reimburse.status)}>
                        {reimburse.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewDetail(reimburse)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {reimburseHistory.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Belum ada pengajuan reimburse</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedReimburse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold">Detail Reimburse</h2>
                <p className="text-gray-600">{selectedReimburse.reimburseNumber}</p>
              </div>
              <div className="flex items-center gap-4">
                <Badge className={getStatusColor(selectedReimburse.status)}>
                  {selectedReimburse.status.toUpperCase()}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeDetailModal}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Informasi Pengajuan */}
              <Card>
                <CardHeader>
                  <CardTitle>Informasi Pengajuan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Judul Pengajuan</label>
                        <p className="font-semibold mt-1">{selectedReimburse.title}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Diajukan Oleh</label>
                        <div className="flex items-center gap-2 mt-1">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span>{selectedReimburse.submittedBy}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Tanggal Ajuan</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{selectedReimburse.submittedDate} {selectedReimburse.submittedTime}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Grand Total</label>
                        <div className="flex items-center gap-2 mt-1">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="font-semibold text-lg">Rp {selectedReimburse.grandTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedReimburse.notes && (
                    <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                      <label className="text-sm font-medium text-gray-500">Catatan</label>
                      <p className="mt-1 text-gray-700">{selectedReimburse.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Detail Pengeluaran */}
              <Card>
                <CardHeader>
                  <CardTitle>Detail Pengeluaran</CardTitle>
                  <CardDescription>{selectedReimburse.items.length} items</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Lampiran</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReimburse.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="whitespace-nowrap">
                            {new Date(item.date).toLocaleDateString('id-ID')}
                          </TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            Rp {Number(item.total).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {item.attachment ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadAttachment(item.attachment)}
                                className="h-8 text-xs"
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                {item.attachment}
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Status Info & Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Status Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      <Badge className={getStatusColor(selectedReimburse.status)}>
                        {selectedReimburse.status.toUpperCase()}
                      </Badge>
                    </div>
                    
                    {selectedReimburse.approvedBy && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Disetujui Oleh:</span>
                          <span className="font-medium">{selectedReimburse.approvedBy}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Tanggal Approval:</span>
                          <span className="font-medium">{selectedReimburse.approvedDate}</span>
                        </div>
                      </>
                    )}

                    {selectedReimburse.rejectionReason && (
                      <div className="pt-4 border-t">
                        <label className="text-sm font-medium text-red-600">Alasan Penolakan</label>
                        <p className="text-sm text-gray-600 mt-1">{selectedReimburse.rejectionReason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Ringkasan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Jumlah Item:</span>
                      <span className="font-medium">{selectedReimburse.items.length} items</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="font-semibold">Grand Total:</span>
                      <span className="font-semibold text-green-600">Rp {selectedReimburse.grandTotal.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center p-6 border-t">
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleString('id-ID')}
              </div>
              <div className="flex justify-end gap-3">
                <Button 
                  onClick={exportToPDF}
                  className="export-pdf-btn bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button variant="outline" onClick={closeDetailModal}>
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}