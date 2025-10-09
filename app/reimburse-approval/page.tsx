'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Search, CheckCircle, XCircle, FileText, ChevronLeft, ChevronRight, Download, Filter, FileDown, User, Calendar, DollarSign, Upload, Eye, X, Plus, Trash2 } from 'lucide-react';

type ReimburseStatus = 'pending' | 'approved' | 'rejected';

type ReimburseItem = {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  tax: number;
  total: number;
  attachments: string[];
};

type Reimburse = {
  id: string;
  reimburseNumber: string;
  title: string;
  purpose: string;
  submittedBy: string; // Yang ngajuin
  actualUser: string; // Yang beneran punya pengeluaran
  submittedDate: string;
  submittedTime: string;
  items: ReimburseItem[];
  totalAmount: number;
  totalTax: number;
  grandTotal: number;
  notes?: string;
  status: ReimburseStatus;
  daysWaiting: number;
  approvedBy?: string;
  approvedDate?: string;
  rejectionReason?: string;
  paymentProof?: string;
};

// Analytics tracking
const trackAction = (action: string, data: any) => {
  console.log(`[Analytics] ${action}:`, data);
};

export default function ReimburseApprovalPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReimburseStatus | 'all'>('all');
  const [selectedReimburse, setSelectedReimburse] = useState<Reimburse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reimburseToAction, setReimburseToAction] = useState<Reimburse | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // State untuk form di detail
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [viewingDocument, setViewingDocument] = useState<{name: string, url: string} | null>(null);

  // State untuk create new reimburse
  const [newReimburse, setNewReimburse] = useState({
    title: '',
    purpose: '',
    actualUser: '', // User yang punya pengeluaran
    items: [] as ReimburseItem[]
  });
  const [newItem, setNewItem] = useState({
    date: '',
    description: '',
    category: '',
    amount: '',
    tax: ''
  });

  // Dummy list users
  const userList = [
    'Ahmad Wijaya',
    'Sari Dewi', 
    'Rina Melati',
    'Budi Santoso',
    'David Lee',
    'Maya Sari'
  ];

  // Mock data - sekarang ada submittedBy dan actualUser
  const reimburseData: Reimburse[] = [
    {
      id: '1',
      reimburseNumber: 'REIM-2024-001',
      title: 'Business Trip Jakarta Meeting Client',
      purpose: 'Meeting dengan client PT. Maju Jaya untuk presentasi produk baru dan negosiasi kontrak',
      submittedBy: 'Budi Santoso', // Yang ngajuin
      actualUser: 'Ahmad Wijaya', // Yang beneran trip
      submittedDate: '2024-01-20',
      submittedTime: '14:30',
      items: [
        {
          id: '1-1',
          date: '2024-01-15',
          description: 'Tiket pesawat Jakarta-Surabaya kelas ekonomi',
          category: 'Transportasi',
          amount: 850000,
          tax: 0,
          total: 850000,
          attachments: ['tiket_pesawat.pdf']
        },
        {
          id: '1-2',
          date: '2024-01-16',
          description: 'Hotel 2 malam di Hotel Santika',
          category: 'Akomodasi',
          amount: 1200000,
          tax: 120000,
          total: 1320000,
          attachments: ['invoice_hotel.pdf', 'kwitansi_hotel.jpg']
        }
      ],
      totalAmount: 2300000,
      totalTax: 120000,
      grandTotal: 2420000,
      status: 'pending',
      daysWaiting: 3
    },
    {
      id: '2',
      reimburseNumber: 'REIM-2024-002',
      title: 'Pembelian alat kantor dan supplies',
      purpose: 'Bahan habis pakai dan perlengkapan kantor untuk operasional harian',
      submittedBy: 'Rina Melati', // Yang ngajuin
      actualUser: 'Sari Dewi', // Yang beneran beli
      submittedDate: '2024-01-22',
      submittedTime: '09:15',
      items: [
        {
          id: '2-1',
          date: '2024-01-18',
          description: 'Printer toner dan kertas A4 3 rim',
          category: 'Bahan Habis Pakai',
          amount: 750000,
          tax: 75000,
          total: 825000,
          attachments: ['invoice_toner.pdf', 'invoice_kertas.pdf']
        }
      ],
      totalAmount: 1100000,
      totalTax: 110000,
      grandTotal: 1210000,
      status: 'pending',
      daysWaiting: 1
    },
    {
      id: '3',
      reimburseNumber: 'REIM-2024-003',
      title: 'Perbaikan komputer dan maintenance',
      purpose: 'Service dan perbaikan komputer untuk tim development',
      submittedBy: 'Budi Santoso', // Manager yang ngajuin
      actualUser: 'Rina Melati', // Yang beneran service
      submittedDate: '2024-01-18',
      submittedTime: '16:45',
      items: [
        {
          id: '3-1',
          date: '2024-01-15',
          description: 'Ganti harddisk SSD 500GB',
          category: 'Perbaikan & Maintenance',
          amount: 650000,
          tax: 65000,
          total: 715000,
          attachments: ['invoice_ssd.pdf']
        }
      ],
      totalAmount: 650000,
      totalTax: 65000,
      grandTotal: 715000,
      status: 'approved',
      daysWaiting: 0,
      approvedBy: 'Budi Santoso',
      approvedDate: '2024-01-19 11:30',
      paymentProof: 'bukti_transfer_001.pdf'
    }
  ];

  // Filter data
  const filteredReimburse = reimburseData.filter(reimburse => {
    const matchesSearch = 
      reimburse.reimburseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reimburse.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reimburse.submittedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reimburse.actualUser.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || reimburse.status === statusFilter;
    
    const matchesDateRange = 
      (!dateRange.start || reimburse.submittedDate >= dateRange.start) &&
      (!dateRange.end || reimburse.submittedDate <= dateRange.end);

    return matchesSearch && matchesStatus && matchesDateRange;
  });

  // Pagination
  const itemsPerPage = 5;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReimburse.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReimburse.length / itemsPerPage);

  // Status color
  const getStatusColor = (status: ReimburseStatus) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status];
  };

  // Row click handler dengan double click
  const handleRowClick = (reimburse: Reimburse) => {
    const currentTime = new Date().getTime();
    const clickGap = currentTime - lastClickTime;

    if (clickGap < 300) { // Double click
      if (selectedReimburse?.id === reimburse.id) {
        setSelectedReimburse(null);
        trackAction('detail_closed', { reimburseNumber: reimburse.reimburseNumber });
      }
    } else { // Single click
      setSelectedReimburse(reimburse);
      // Reset form ketika pilih reimburse baru
      setRejectionReason('');
      setApprovalNotes('');
      setUploadedFiles([]);
      trackAction('detail_opened', { reimburseNumber: reimburse.reimburseNumber });
    }
    setLastClickTime(currentTime);
  };

  // Quick actions
  const handleQuickApprove = (reimburse: Reimburse, e: React.MouseEvent) => {
    e.stopPropagation();
    setReimburseToAction(reimburse);
    setShowApproveModal(true);
    trackAction('approve_clicked', { reimburseNumber: reimburse.reimburseNumber });
  };

  const handleQuickReject = (reimburse: Reimburse, e: React.MouseEvent) => {
    e.stopPropagation();
    setReimburseToAction(reimburse);
    setShowRejectModal(true);
    trackAction('reject_clicked', { reimburseNumber: reimburse.reimburseNumber });
  };

  // Document viewer
  const handleViewDocument = (fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const documentUrl = `/documents/${fileName}`;
    setViewingDocument({ name: fileName, url: documentUrl });
    trackAction('document_viewed', { fileName });
  };

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    setUploadedFiles(prev => [...prev, ...newFiles]);
    trackAction('files_uploaded', { count: newFiles.length });
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Approval handlers dari detail
  const handleApproveFromDetail = () => {
    if (!selectedReimburse) return;
    
    if (uploadedFiles.length === 0) {
      alert('Please upload payment proof before approving');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      trackAction('reimburse_approved_from_detail', {
        reimburseNumber: selectedReimburse.reimburseNumber,
        amount: selectedReimburse.grandTotal,
        notes: approvalNotes,
        fileCount: uploadedFiles.length,
        timestamp: new Date().toISOString()
      });
      
      setSelectedReimburse({ 
        ...selectedReimburse, 
        status: 'approved',
        approvedBy: 'Current User',
        approvedDate: new Date().toLocaleString('id-ID'),
        paymentProof: uploadedFiles.map(f => f.name).join(', ')
      });
      
      setApprovalNotes('');
      setUploadedFiles([]);
      setIsLoading(false);
      alert(`Reimburse ${selectedReimburse.reimburseNumber} approved!`);
    }, 1000);
  };

  const handleRejectFromDetail = () => {
    if (!selectedReimburse || !rejectionReason.trim()) {
      alert('Please provide rejection reason');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      trackAction('reimburse_rejected_from_detail', {
        reimburseNumber: selectedReimburse.reimburseNumber,
        amount: selectedReimburse.grandTotal,
        reason: rejectionReason,
        timestamp: new Date().toISOString()
      });
      
      setSelectedReimburse({ 
        ...selectedReimburse, 
        status: 'rejected',
        rejectionReason: rejectionReason
      });
      
      setRejectionReason('');
      setIsLoading(false);
      alert(`Reimburse ${selectedReimburse.reimburseNumber} rejected!`);
    }, 1000);
  };

  // Create new reimburse handlers
  const handleAddItem = () => {
    if (!newItem.date || !newItem.description || !newItem.category || !newItem.amount) {
      alert('Please fill all required fields');
      return;
    }

    const amount = parseFloat(newItem.amount);
    const tax = parseFloat(newItem.tax) || 0;
    const total = amount + tax;

    const item: ReimburseItem = {
      id: Date.now().toString(),
      date: newItem.date,
      description: newItem.description,
      category: newItem.category,
      amount: amount,
      tax: tax,
      total: total,
      attachments: []
    };

    setNewReimburse(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));

    // Reset form
    setNewItem({
      date: '',
      description: '',
      category: '',
      amount: '',
      tax: ''
    });

    trackAction('item_added', { description: item.description, amount: item.total });
  };

  const removeItem = (index: number) => {
    setNewReimburse(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmitReimburse = () => {
    if (!newReimburse.title || !newReimburse.purpose || !newReimburse.actualUser || newReimburse.items.length === 0) {
      alert('Please fill all required fields and add at least one item');
      return;
    }

    setIsLoading(true);
    
    // Generate new reimburse data
    const totalAmount = newReimburse.items.reduce((sum, item) => sum + item.amount, 0);
    const totalTax = newReimburse.items.reduce((sum, item) => sum + item.tax, 0);
    const grandTotal = totalAmount + totalTax;

    const newReimburseData: Reimburse = {
      id: Date.now().toString(),
      reimburseNumber: `REIM-2024-${String(reimburseData.length + 1).padStart(3, '0')}`,
      title: newReimburse.title,
      purpose: newReimburse.purpose,
      submittedBy: 'Current User', // Yang login sekarang
      actualUser: newReimburse.actualUser, // User yang dipilih
      submittedDate: new Date().toISOString().split('T')[0],
      submittedTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      items: newReimburse.items,
      totalAmount: totalAmount,
      totalTax: totalTax,
      grandTotal: grandTotal,
      status: 'pending',
      daysWaiting: 0
    };

    trackAction('reimburse_created', {
      reimburseNumber: newReimburseData.reimburseNumber,
      actualUser: newReimburseData.actualUser,
      itemCount: newReimburseData.items.length,
      totalAmount: grandTotal
    });

    // Simulate API call
    setTimeout(() => {
      // Dalam real app, ini akan push ke reimburseData
      alert(`Reimburse ${newReimburseData.reimburseNumber} created successfully for ${newReimburseData.actualUser}!`);
      
      // Reset form
      setNewReimburse({
        title: '',
        purpose: '',
        actualUser: '',
        items: []
      });
      setShowCreateModal(false);
      setIsLoading(false);
    }, 1000);
  };

  // Export handlers
  const exportToExcel = () => {
    setIsLoading(true);
    trackAction('export_excel', {
      itemCount: filteredReimburse.length,
      filters: { searchTerm, statusFilter, dateRange }
    });

    setTimeout(() => {
      const data = filteredReimburse.map(r => ({
        'Reimburse No': r.reimburseNumber,
        'Title': r.title,
        'Submitted By': r.submittedBy,
        'Actual User': r.actualUser,
        'Submit Date': r.submittedDate,
        'Items': r.items.length,
        'Total Amount': r.grandTotal,
        'Status': r.status.toUpperCase(),
        'Days Waiting': r.daysWaiting
      }));

      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).join(','));
      const csvContent = [headers, ...rows].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reimburse-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsLoading(false);
    }, 1000);
  };

  const exportToPDF = (reimburse: Reimburse) => {
    setIsLoading(true);
    trackAction('export_pdf_single', {
      reimburseNumber: reimburse.reimburseNumber,
      amount: reimburse.grandTotal
    });

    setTimeout(() => {
      const pdfContent = `
        REIMBURSE DETAIL
        ================
        Number: ${reimburse.reimburseNumber}
        Title: ${reimburse.title}
        Submitted By: ${reimburse.submittedBy}
        Actual User: ${reimburse.actualUser}
        Date: ${reimburse.submittedDate}
        Total: Rp ${reimburse.grandTotal.toLocaleString()}
        Status: ${reimburse.status.toUpperCase()}
      `;
      
      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reimburse.reimburseNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsLoading(false);
    }, 1000);
  };

  const handleExport = () => {
    if (exportFormat === 'excel' || exportFormat === 'csv') {
      exportToExcel();
    }
  };

  const Pagination = () => (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="text-sm text-gray-600">
        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredReimburse.length)} of {filteredReimburse.length} results
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const pageNum = i + 1;
          return (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(pageNum)}
            >
              {pageNum}
            </Button>
          );
        })}
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Approval Reimburse</h1>
          <p className="text-gray-600 mt-2">Klik 1x untuk lihat detail, 2x row yang sama untuk tutup</p>
        </div>
        <div className="flex gap-3">
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajukan Reimburse
          </Button>
          
          {/* Export Dropdown - CSV Only untuk All */}
          <div className="flex gap-2">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="csv">CSV (All Data)</option>
            </select>
            <Button 
              variant="outline" 
              onClick={handleExport}
              disabled={isLoading || filteredReimburse.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Integrated dengan Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search reimburse number, title, or user..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                      trackAction('search', { term: e.target.value });
                    }}
                    className="pl-10"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as ReimburseStatus | 'all');
                    setCurrentPage(1);
                    trackAction('status_filter', { status: e.target.value });
                  }}
                  className="border rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="whitespace-nowrap"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
            </div>
            
            {/* Advanced Filters */}
            {showFilters && (
              <div className="flex flex-col sm:flex-row gap-3 p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Date Range:</span>
                </div>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, start: e.target.value }));
                    trackAction('date_filter_start', { date: e.target.value });
                  }}
                  className="text-sm"
                />
                <span className="text-sm text-gray-500 self-center">to</span>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, end: e.target.value }));
                    trackAction('date_filter_end', { date: e.target.value });
                  }}
                  className="text-sm"
                />
                {(dateRange.start || dateRange.end) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDateRange({ start: '', end: '' });
                      trackAction('date_filter_cleared', {});
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        {/* Table dengan padding */}
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4">Reimburse No</TableHead>
                      <TableHead className="px-4">Title & Purpose</TableHead>
                      <TableHead className="px-4">Submitted By</TableHead>
                      <TableHead className="px-4">Actual User</TableHead>
                      <TableHead className="px-4">Amount</TableHead>
                      <TableHead className="px-4">Days</TableHead>
                      <TableHead className="px-4">Status</TableHead>
                      <TableHead className="px-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.map((reimburse) => (
                      <TableRow
                        key={reimburse.id}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedReimburse?.id === reimburse.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                        onClick={() => handleRowClick(reimburse)}
                      >
                        <TableCell className="font-semibold px-4">
                          {reimburse.reimburseNumber}
                        </TableCell>
                        <TableCell className="px-4">
                          <div className="font-medium">{reimburse.title}</div>
                          <div className="text-sm text-gray-500 line-clamp-1">{reimburse.purpose}</div>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {reimburse.items.length} items
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Rp {reimburse.grandTotal.toLocaleString()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="px-4">
                          <div className="font-medium">{reimburse.submittedBy}</div>
                          <div className="text-sm text-gray-500">{reimburse.submittedDate}</div>
                        </TableCell>
                        <TableCell className="px-4">
                          <div className="font-medium">{reimburse.actualUser}</div>
                        </TableCell>
                        <TableCell className="font-semibold px-4">
                          Rp {reimburse.grandTotal.toLocaleString()}
                        </TableCell>
                        <TableCell className="px-4">
                          <div className={`text-sm font-medium ${
                            reimburse.daysWaiting > 3 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {reimburse.daysWaiting}d
                          </div>
                        </TableCell>
                        <TableCell className="px-4">
                          <Badge className={getStatusColor(reimburse.status)}>
                            {reimburse.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4">
                          <div className="flex gap-2">
                            {/* PDF Export per reimburse */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportToPDF(reimburse);
                              }}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            
                            {reimburse.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-3 text-green-600 border-green-600 hover:bg-green-50"
                                  onClick={(e) => handleQuickApprove(reimburse, e)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-3 text-red-600 border-red-600 hover:bg-red-50"
                                  onClick={(e) => handleQuickReject(reimburse, e)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredReimburse.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No reimburse found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              )}

              {filteredReimburse.length > 0 && <Pagination />}
            </>
          )}
        </CardContent>
      </Card>

      {/* Selected Reimburse Details */}
      {selectedReimburse && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {selectedReimburse.reimburseNumber} - {selectedReimburse.title}
                </CardTitle>
                <CardDescription>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>
                        <strong>Submitted by:</strong> {selectedReimburse.submittedBy} | 
                        <strong> Actual user:</strong> {selectedReimburse.actualUser}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{selectedReimburse.submittedDate} {selectedReimburse.submittedTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold">Rp {selectedReimburse.grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge className={getStatusColor(selectedReimburse.status)}>
                  {selectedReimburse.status.toUpperCase()}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportToPDF(selectedReimburse)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Purpose */}
            <div>
              <Label className="text-sm font-medium">Purpose</Label>
              <p className="text-gray-700 mt-1">{selectedReimburse.purpose}</p>
            </div>

            {/* Items Table dengan document viewer */}
            <div>
              <Label className="text-sm font-medium mb-4 block">
                Detail Pengeluaran ({selectedReimburse.items.length} items)
              </Label>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4">No</TableHead>
                      <TableHead className="px-4">Tanggal</TableHead>
                      <TableHead className="px-4">Keterangan</TableHead>
                      <TableHead className="px-4">Kategori</TableHead>
                      <TableHead className="px-4">Amount</TableHead>
                      <TableHead className="px-4">Tax</TableHead>
                      <TableHead className="px-4">Total</TableHead>
                      <TableHead className="px-4">Documents</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReimburse.items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium px-4">{index + 1}</TableCell>
                        <TableCell className="px-4">{new Date(item.date).toLocaleDateString('id-ID')}</TableCell>
                        <TableCell className="px-4">
                          <div className="max-w-xs">
                            <p className="font-medium">{item.description}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-4">
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="px-4">Rp {item.amount.toLocaleString()}</TableCell>
                        <TableCell className="px-4">Rp {item.tax.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold px-4">Rp {item.total.toLocaleString()}</TableCell>
                        <TableCell className="px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {item.attachments.map((file, fileIndex) => (
                              <Badge 
                                key={fileIndex} 
                                variant="secondary" 
                                className="text-xs cursor-pointer hover:bg-blue-100"
                                onClick={(e) => handleViewDocument(file, e)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                {file}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Summary & Approval Info dalam satu section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Summary */}
              <div className="space-y-4 p-4 border rounded-lg">
                <Label className="text-sm font-medium">Summary</Label>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Items:</span>
                    <span className="font-medium">{selectedReimburse.items.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Amount:</span>
                    <span className="font-medium">Rp {selectedReimburse.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Tax:</span>
                    <span className="font-medium">Rp {selectedReimburse.totalTax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="font-semibold">Grand Total:</span>
                    <span className="font-semibold text-green-600">Rp {selectedReimburse.grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Approval Info */}
              <div className="space-y-4 p-4 border rounded-lg">
                <Label className="text-sm font-medium">Approval Information</Label>
                {selectedReimburse.approvedBy ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Approved by:</span>
                      <span className="font-medium">{selectedReimburse.approvedBy}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Approved Date:</span>
                      <span className="font-medium">{selectedReimburse.approvedDate}</span>
                    </div>
                    {selectedReimburse.paymentProof && (
                      <div className="flex justify-between text-sm">
                        <span>Payment Proof:</span>
                        <span className="font-medium text-green-600">{selectedReimburse.paymentProof}</span>
                      </div>
                    )}
                  </div>
                ) : selectedReimburse.rejectionReason ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      <span className="font-medium text-red-600">Rejected</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Reason: </span>
                      <span>{selectedReimburse.rejectionReason}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Waiting for approval</p>
                )}
              </div>
            </div>

            {/* Approval/Reject Form untuk status pending */}
            {selectedReimburse.status === 'pending' && (
              <div className="space-y-6 p-6 border rounded-lg bg-gray-50">
                <Label className="text-lg font-medium">Approve / Reject This Reimburse</Label>
                
                {/* Approval Section */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="approvalNotes" className="text-sm font-medium">
                      Approval Notes (Optional)
                    </Label>
                    <Textarea
                      id="approvalNotes"
                      placeholder="Add notes for this approval..."
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      className="mt-1 min-h-[80px]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="fileUpload" className="text-sm font-medium">
                      Upload Payment Proof *
                    </Label>
                    <div className="mt-2">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <Label htmlFor="fileUpload" className="cursor-pointer">
                          <span className="text-blue-600">Click to upload</span> or drag and drop
                        </Label>
                        <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG up to 10MB</p>
                        <input
                          id="fileUpload"
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleFileUpload}
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                      </div>
                      
                      {/* Uploaded files list */}
                      {uploadedFiles.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {uploadedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-green-600" />
                                <span className="text-sm">{file.name}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeUploadedFile(index)}
                                className="h-6 w-6 p-0 text-red-600"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleApproveFromDetail}
                    disabled={isLoading || uploadedFiles.length === 0}
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve Reimburse
                      </>
                    )}
                  </Button>
                </div>

                {/* Reject Section */}
                <div className="border-t pt-6 space-y-4">
                  <div>
                    <Label htmlFor="rejectionReason" className="text-sm font-medium text-red-600">
                      Rejection Reason *
                    </Label>
                    <Textarea
                      id="rejectionReason"
                      placeholder="Enter reason for rejection..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="mt-1 min-h-[80px] border-red-200 focus:border-red-300"
                    />
                  </div>

                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleRejectFromDetail}
                    disabled={isLoading || !rejectionReason.trim()}
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject Reimburse
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create New Reimburse Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">Ajukan Reimburse Baru</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title" className="text-sm font-medium">
                    Judul Reimburse *
                  </Label>
                  <Input
                    id="title"
                    placeholder="Contoh: Business Trip Jakarta"
                    value={newReimburse.title}
                    onChange={(e) => setNewReimburse(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="actualUser" className="text-sm font-medium">
                    Untuk User *
                  </Label>
                  <select
                    id="actualUser"
                    value={newReimburse.actualUser}
                    onChange={(e) => setNewReimburse(prev => ({ ...prev, actualUser: e.target.value }))}
                    className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  >
                    <option value="">Pilih User</option>
                    {userList.map(user => (
                      <option key={user} value={user}>{user}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="purpose" className="text-sm font-medium">
                  Tujuan *
                </Label>
                <Textarea
                  id="purpose"
                  placeholder="Jelaskan tujuan pengajuan reimburse ini..."
                  value={newReimburse.purpose}
                  onChange={(e) => setNewReimburse(prev => ({ ...prev, purpose: e.target.value }))}
                  className="mt-1 min-h-[80px]"
                />
              </div>

              {/* Add Items Section */}
              <div className="border rounded-lg p-4">
                <Label className="text-sm font-medium mb-4 block">Tambah Item Pengeluaran</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="itemDate" className="text-xs">Tanggal *</Label>
                    <Input
                      id="itemDate"
                      type="date"
                      value={newItem.date}
                      onChange={(e) => setNewItem(prev => ({ ...prev, date: e.target.value }))}
                      className="mt-1 text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="itemCategory" className="text-xs">Kategori *</Label>
                    <select
                      id="itemCategory"
                      value={newItem.category}
                      onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                    >
                      <option value="">Pilih Kategori</option>
                      <option value="Transportasi">Transportasi</option>
                      <option value="Akomodasi">Akomodasi</option>
                      <option value="Bahan Habis Pakai">Bahan Habis Pakai</option>
                      <option value="Perbaikan & Maintenance">Perbaikan & Maintenance</option>
                      <option value="Training">Training</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="itemDescription" className="text-xs">Keterangan *</Label>
                    <Input
                      id="itemDescription"
                      placeholder="Deskripsi pengeluaran..."
                      value={newItem.description}
                      onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1 text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="itemAmount" className="text-xs">Amount (Rp) *</Label>
                    <Input
                      id="itemAmount"
                      type="number"
                      placeholder="0"
                      value={newItem.amount}
                      onChange={(e) => setNewItem(prev => ({ ...prev, amount: e.target.value }))}
                      className="mt-1 text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="itemTax" className="text-xs">Tax (Rp)</Label>
                    <Input
                      id="itemTax"
                      type="number"
                      placeholder="0"
                      value={newItem.tax}
                      onChange={(e) => setNewItem(prev => ({ ...prev, tax: e.target.value }))}
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleAddItem}
                  className="w-full"
                  disabled={!newItem.date || !newItem.description || !newItem.category || !newItem.amount}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Item
                </Button>
              </div>

              {/* Items List */}
              {newReimburse.items.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-4">Tanggal</TableHead>
                        <TableHead className="px-4">Keterangan</TableHead>
                        <TableHead className="px-4">Kategori</TableHead>
                        <TableHead className="px-4">Amount</TableHead>
                        <TableHead className="px-4">Tax</TableHead>
                        <TableHead className="px-4">Total</TableHead>
                        <TableHead className="px-4">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newReimburse.items.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell className="px-4 text-sm">{new Date(item.date).toLocaleDateString('id-ID')}</TableCell>
                          <TableCell className="px-4 text-sm">{item.description}</TableCell>
                          <TableCell className="px-4">
                            <Badge variant="outline" className="text-xs">{item.category}</Badge>
                          </TableCell>
                          <TableCell className="px-4 text-sm">Rp {item.amount.toLocaleString()}</TableCell>
                          <TableCell className="px-4 text-sm">Rp {item.tax.toLocaleString()}</TableCell>
                          <TableCell className="px-4 font-semibold text-sm">Rp {item.total.toLocaleString()}</TableCell>
                          <TableCell className="px-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="h-6 w-6 p-0 text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Total Summary */}
                  <div className="p-4 border-t bg-gray-50">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total: Rp {newReimburse.items.reduce((sum, item) => sum + item.total, 0).toLocaleString()}</span>
                      <span className="text-sm text-gray-600">{newReimburse.items.length} items</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCreateModal(false)}
                >
                  Batal
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleSubmitReimburse}
                  disabled={isLoading || !newReimburse.title || !newReimburse.purpose || !newReimburse.actualUser || newReimburse.items.length === 0}
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajukan Reimburse
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">{viewingDocument.name}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingDocument(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 h-[70vh] flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Document Preview: {viewingDocument.name}</p>
                <p className="text-sm text-gray-500 mt-2">
                  In a real application, this would show the actual document
                </p>
                <Button 
                  className="mt-4"
                  onClick={() => window.open(viewingDocument.url, '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Document
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simple Modals untuk quick actions */}
      {showApproveModal && reimburseToAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Konfirmasi Approve</h3>
            <p className="text-gray-600 mb-6">
              Apakah Anda yakin approve <strong>{reimburseToAction.reimburseNumber}</strong>?
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setShowApproveModal(false)}
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700" 
                onClick={() => {
                  setIsLoading(true);
                  setTimeout(() => {
                    trackAction('reimburse_approved_quick', {
                      reimburseNumber: reimburseToAction.reimburseNumber
                    });
                    alert(`Reimburse ${reimburseToAction.reimburseNumber} approved!`);
                    setShowApproveModal(false);
                    setIsLoading(false);
                  }, 1000);
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Ya, Approve'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && reimburseToAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Konfirmasi Reject</h3>
            <p className="text-gray-600 mb-6">
              Apakah Anda yakin reject <strong>{reimburseToAction.reimburseNumber}</strong>?
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setShowRejectModal(false)}
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  setIsLoading(true);
                  setTimeout(() => {
                    trackAction('reimburse_rejected_quick', {
                      reimburseNumber: reimburseToAction.reimburseNumber
                    });
                    alert(`Reimburse ${reimburseToAction.reimburseNumber} rejected!`);
                    setShowRejectModal(false);
                    setIsLoading(false);
                  }, 1000);
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Ya, Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}