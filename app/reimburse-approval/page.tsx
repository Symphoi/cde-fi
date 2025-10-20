'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Search, CheckCircle, XCircle, FileText, ChevronLeft, ChevronRight, Download, Filter, User, Calendar, DollarSign, Upload, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import React from 'react';

// Constants
const DOUBLE_CLICK_DELAY = 300;
const DEBOUNCE_DELAY = 300;
const FILE_UPLOAD_CONFIG = {
  acceptTypes: '.pdf,.jpg,.jpeg,.png',
  maxSize: 10 * 1024 * 1024,
  maxSizeText: '10MB'
} as const;

// Types
type ReimburseStatus = 'submitted' | 'approved' | 'rejected';

interface ReimburseItem {
  id: string;
  item_code: string;
  item_date: string;
  description: string;
  amount: number;
  attachment_path?: string;
}

interface Reimburse {
  id: string;
  reimbursement_code: string;
  title: string;
  notes: string;
  submitted_by_user_name: string;
  created_by_user_name: string;
  category_code: string;
  project_code?: string;
  total_amount: number;
  status: ReimburseStatus;
  payment_proof_path?: string;
  submitted_date: string;
  submitted_time: string;
  approved_by_user_name?: string;
  approved_date?: string;
  bank_account_code?: string;
  rejection_reason?: string;
  items_count: number;
  days_waiting: number;
  items: ReimburseItem[];
}

interface BankAccount {
  bank_account_code: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
}

interface DateRange {
  start: string;
  end: string;
}

interface AmountRange {
  min: string;
  max: string;
}

// Utility functions
const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Skeleton Loading Component
const ReimburseSkeleton = () => (
  <TableRow>
    <TableCell className="px-4 text-center">
      <div className="h-4 bg-gray-200 rounded animate-pulse w-8"></div>
    </TableCell>
    <TableCell className="px-4">
      <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
    </TableCell>
    <TableCell className="px-4">
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
        <div className="h-3 bg-gray-200 rounded animate-pulse w-24"></div>
      </div>
    </TableCell>
    <TableCell className="px-4">
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
        <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
      </div>
    </TableCell>
    <TableCell className="px-4">
      <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
    </TableCell>
    <TableCell className="px-4">
      <div className="h-4 bg-gray-200 rounded animate-pulse w-8"></div>
    </TableCell>
    <TableCell className="px-4">
      <div className="h-6 bg-gray-200 rounded animate-pulse w-16"></div>
    </TableCell>
    <TableCell className="px-4">
      <div className="flex gap-2">
        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </TableCell>
  </TableRow>
);

// Error Boundary Component
class ReimburseErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Reimburse Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="mx-auto max-w-md mt-8">
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
              <p className="text-gray-600 mb-4">
                There was an error loading the reimbursement data.
              </p>
              <Button onClick={() => this.setState({ hasError: false })}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Main Component
export default function ReimburseApprovalPage() {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<ReimburseStatus | 'all'>('all');
  const [selectedReimburse, setSelectedReimburse] = useState<Reimburse | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [dateRange, setDateRange] = useState<DateRange>({ start: '', end: '' });
  const [amountRange, setAmountRange] = useState<AmountRange>({ min: '', max: '' });
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  
  // State untuk form approve/reject
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>('');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const [reimburseData, setReimburseData] = useState<Reimburse[]>([]);

  // Utility functions
  const handleViewAttachment = useCallback((attachmentPath: string) => {
    if (!attachmentPath) {
      toast.error('No attachment available');
      return;
    }
    
    const fullUrl = `${window.location.origin}${attachmentPath}`;
    window.open(fullUrl, '_blank');
  }, []);

  const handleViewPaymentProof = useCallback((paymentProofPath: string) => {
    if (!paymentProofPath) {
      toast.error('No payment proof available');
      return;
    }
    
    const fullUrl = `${window.location.origin}${paymentProofPath}`;
    window.open(fullUrl, '_blank');
  }, []);

  // Debounce search implementation
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Get token from auth context
  const getToken = useCallback((): string => {
    return localStorage.getItem('token') || '';
  }, []);

  // Fetch data dari backend
  const fetchReimbursements = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = getToken();
      const params = new URLSearchParams({
        status: statusFilter === 'all' ? '' : statusFilter,
        search: debouncedSearch,
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });

      // Add advanced filters jika ada
      if (amountRange.min) params.append('min_amount', amountRange.min);
      if (amountRange.max) params.append('max_amount', amountRange.max);
      if (categoryFilter) params.append('category', categoryFilter);
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);

      const response = await fetch(`/api/approval-reimbursement?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reimbursements');
      }

      const data = await response.json();
      setReimburseData(data.data || []);
    } catch (error) {
      console.error('Error fetching reimbursements:', error);
      toast.error('Failed to load reimbursement data');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, currentPage, dateRange, amountRange, categoryFilter, getToken, itemsPerPage]);

  // Fetch reimbursement detail - pakai query parameter
  const fetchReimbursementDetail = useCallback(async (reimbursementCode: string) => {
    try {
      const token = getToken();
      const response = await fetch(`/api/approval-reimbursement?reimbursement_code=${reimbursementCode}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reimbursement detail');
      }

      const data = await response.json();
      setSelectedReimburse(data.data);
      setBankAccounts(data.data.bank_accounts || []);
      // Reset form state
      setSelectedBankAccount('');
      setUploadedFiles([]);
      setRejectionReason('');
      setApprovalNotes('');
    } catch (error) {
      console.error('Error fetching reimbursement detail:', error);
      toast.error('Failed to load reimbursement details');
    }
  }, [getToken]);

  // Handle approve
  const handleApprove = useCallback(async () => {
    if (!selectedReimburse) return;

    if (!selectedBankAccount) {
      toast.error('Please select a bank account');
      return;
    }

    if (uploadedFiles.length === 0) {
      toast.error('Please upload payment proof');
      return;
    }

    // Validate file size
    const oversizedFile = uploadedFiles.find(file => file.size > FILE_UPLOAD_CONFIG.maxSize);
    if (oversizedFile) {
      toast.error(`File ${oversizedFile.name} exceeds ${FILE_UPLOAD_CONFIG.maxSizeText} limit`);
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      const submitData = {
        reimbursement_code: selectedReimburse.reimbursement_code,
        status: 'approved',
        bank_account_code: selectedBankAccount
      };

      formData.append('data', JSON.stringify(submitData));

      // Add payment proof file
      if (uploadedFiles[0]) {
        formData.append('payment_proof', uploadedFiles[0]);
      }

      const token = getToken();
      const response = await fetch('/api/approval-reimbursement', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Reimburse ${selectedReimburse.reimbursement_code} approved successfully!`);
        // Refresh data
        await fetchReimbursements();
        await fetchReimbursementDetail(selectedReimburse.reimbursement_code);
      } else {
        toast.error(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error approving reimbursement:', error);
      toast.error('Error approving reimbursement');
    } finally {
      setIsLoading(false);
    }
  }, [selectedReimburse, selectedBankAccount, uploadedFiles, getToken, fetchReimbursements, fetchReimbursementDetail]);

  // Handle reject
  const handleReject = useCallback(async () => {
    if (!selectedReimburse) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide rejection reason');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      const submitData = {
        reimbursement_code: selectedReimburse.reimbursement_code,
        status: 'rejected',
        rejection_reason: rejectionReason
      };

      formData.append('data', JSON.stringify(submitData));

      const token = getToken();
      const response = await fetch('/api/approval-reimbursement', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Reimburse ${selectedReimburse.reimbursement_code} rejected successfully!`);
        // Refresh data
        await fetchReimbursements();
        await fetchReimbursementDetail(selectedReimburse.reimbursement_code);
      } else {
        toast.error(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error rejecting reimbursement:', error);
      toast.error('Error rejecting reimbursement');
    } finally {
      setIsLoading(false);
    }
  }, [selectedReimburse, rejectionReason, getToken, fetchReimbursements, fetchReimbursementDetail]);

  // UseEffect untuk load data
  useEffect(() => {
    fetchReimbursements();
  }, [fetchReimbursements, itemsPerPage]);

  // Filter data
  const filteredReimburse = useMemo(() => {
    return reimburseData.filter(reimburse => {
      const matchesDateRange = 
        (!dateRange.start || reimburse.submitted_date >= dateRange.start) &&
        (!dateRange.end || reimburse.submitted_date <= dateRange.end);

      const matchesAmountRange =
        (!amountRange.min || reimburse.total_amount >= parseFloat(amountRange.min)) &&
        (!amountRange.max || reimburse.total_amount <= parseFloat(amountRange.max));

      const matchesCategory = 
        !categoryFilter || reimburse.category_code === categoryFilter;

      return matchesDateRange && matchesAmountRange && matchesCategory;
    });
  }, [reimburseData, dateRange, amountRange, categoryFilter]);

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReimburse.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReimburse.length / itemsPerPage);

  // Status color
  const getStatusColor = useCallback((status: ReimburseStatus) => {
    const colors = {
      submitted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status];
  }, []);

  // Row click handler
  const handleRowClick = useCallback((reimburse: Reimburse) => {
    const currentTime = new Date().getTime();
    const clickGap = currentTime - lastClickTime;

    if (clickGap < DOUBLE_CLICK_DELAY) {
      if (selectedReimburse?.id === reimburse.id) {
        setSelectedReimburse(null);
      }
    } else {
      fetchReimbursementDetail(reimburse.reimbursement_code);
    }
    setLastClickTime(currentTime);
  }, [lastClickTime, selectedReimburse, fetchReimbursementDetail]);

  // File upload handler
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => file.size <= FILE_UPLOAD_CONFIG.maxSize);
    const invalidFiles = newFiles.filter(file => file.size > FILE_UPLOAD_CONFIG.maxSize);

    if (invalidFiles.length > 0) {
      toast.error(`Some files exceed ${FILE_UPLOAD_CONFIG.maxSizeText} limit and were not uploaded`);
    }

    setUploadedFiles(prev => [...prev, ...validFiles]);
  }, []);

  const removeUploadedFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Export handlers
  const exportToCSV = useCallback(() => {
    setIsLoading(true);
    
    const data = filteredReimburse.map(r => ({
      'Reimburse No': r.reimbursement_code,
      'Title': r.title,
      'Submitted By': r.submitted_by_user_name,
      'Submit Date': formatDate(r.submitted_date),
      'Items': r.items_count,
      'Total Amount': r.total_amount,
      'Status': r.status.toUpperCase(),
      'Days Waiting': r.days_waiting
    }));

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csvContent = [headers, ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reimburse-approval-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('CSV exported successfully!');
    setIsLoading(false);
  }, [filteredReimburse]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setDateRange({ start: '', end: '' });
    setAmountRange({ min: '', max: '' });
    setCategoryFilter('');
    setShowAdvancedFilters(false);
    toast.info('All filters cleared');
  }, []);

  // Pagination Component
  const Pagination = useCallback(() => (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="text-sm text-gray-600">
        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredReimburse.length)} of {filteredReimburse.length} entries
      </div>
      
      <div className="flex items-center gap-6">
        {/* Rows per page */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Rows per page:</span>
          <select 
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>

        {/* Pagination buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
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
                className="h-8 w-8 p-0"
              >
                {pageNum}
              </Button>
            );
          })}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Page info */}
        <div className="text-sm text-gray-600 min-w-[80px] text-center">
          Page {currentPage} of {totalPages}
        </div>
      </div>
    </div>
  ), [currentPage, totalPages, indexOfFirstItem, indexOfLastItem, filteredReimburse.length, itemsPerPage]);

  return (
    <ReimburseErrorBoundary>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Approval Reimburse</h1>
            <p className="text-gray-600 mt-2">Klik 1x untuk lihat detail, 2x row yang sama untuk tutup</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={exportToCSV}
              disabled={isLoading || filteredReimburse.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
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
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ReimburseStatus | 'all')}
                    className="border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="submitted">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="whitespace-nowrap"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </Button>
                  {showFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className="whitespace-nowrap"
                    >
                      {showAdvancedFilters ? 'Simple Filters' : 'Advanced Filters'}
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Filters Section */}
              {showFilters && (
                <div className="flex flex-col gap-4 p-4 border rounded-lg bg-gray-50">
                  {/* Basic Filters */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Date Range:</span>
                    </div>
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="text-sm"
                    />
                    <span className="text-sm text-gray-500 self-center">to</span>
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="text-sm"
                    />
                  </div>

                  {/* Advanced Filters */}
                  {showAdvancedFilters && (
                    <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Amount Range:</span>
                      </div>
                      <Input
                        type="number"
                        placeholder="Min amount"
                        value={amountRange.min}
                        onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))}
                        className="text-sm"
                      />
                      <span className="text-sm text-gray-500 self-center">to</span>
                      <Input
                        type="number"
                        placeholder="Max amount"
                        value={amountRange.max}
                        onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value }))}
                        className="text-sm"
                      />
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="border rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">All Categories</option>
                        <option value="transport">Transport</option>
                        <option value="accommodation">Accommodation</option>
                        <option value="meal">Meal</option>
                        <option value="equipment">Equipment</option>
                      </select>
                    </div>
                  )}

                  {(dateRange.start || dateRange.end || amountRange.min || amountRange.max || categoryFilter) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllFilters}
                      className="self-start"
                    >
                      Clear All Filters
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>

          {/* Table */}
          <CardContent className="p-6">
            {isLoading && currentItems.length === 0 ? (
              // Skeleton Loading
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4 w-12">No</TableHead>
                      <TableHead className="px-4">Reimburse No</TableHead>
                      <TableHead className="px-4">Title & Purpose</TableHead>
                      <TableHead className="px-4">Submitted By</TableHead>
                      <TableHead className="px-4">Amount</TableHead>
                      <TableHead className="px-4">Days</TableHead>
                      <TableHead className="px-4">Status</TableHead>
                      <TableHead className="px-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: itemsPerPage }).map((_, index) => (
                      <ReimburseSkeleton key={index} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-4 w-12">No</TableHead>
                        <TableHead className="px-4">Reimburse No</TableHead>
                        <TableHead className="px-4">Title & Purpose</TableHead>
                        <TableHead className="px-4">Submitted By</TableHead>
                        <TableHead className="px-4">Amount</TableHead>
                        <TableHead className="px-4">Days</TableHead>
                        <TableHead className="px-4">Status</TableHead>
                        <TableHead className="px-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentItems.map((reimburse, index) => (
                        <TableRow
                          key={reimburse.id}
                          className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                            selectedReimburse?.id === reimburse.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                          }`}
                          onClick={() => handleRowClick(reimburse)}
                        >
                          <TableCell className="px-4 text-center font-medium">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </TableCell>
                          <TableCell className="font-semibold px-4">
                            {reimburse.reimbursement_code}
                          </TableCell>
                          <TableCell className="px-4">
                            <div className="font-medium">{reimburse.title}</div>
                            <div className="text-sm text-gray-500 line-clamp-1">{reimburse.notes}</div>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {reimburse.items_count} items
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {formatRupiah(reimburse.total_amount)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="px-4">
                            <div className="font-medium">{reimburse.submitted_by_user_name}</div>
                            <div className="text-sm text-gray-500">{formatDate(reimburse.submitted_date)}</div>
                          </TableCell>
                          <TableCell className="font-semibold px-4">
                            {formatRupiah(reimburse.total_amount)}
                          </TableCell>
                          <TableCell className="px-4">
                            <div className={`text-sm font-medium ${
                              reimburse.days_waiting > 3 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {reimburse.days_waiting}d
                            </div>
                          </TableCell>
                          <TableCell className="px-4">
                            <Badge className={getStatusColor(reimburse.status)}>
                              {reimburse.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4">
                            <div className="flex gap-2">
                              {reimburse.status === 'submitted' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-3 text-green-600 border-green-600 hover:bg-green-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      fetchReimbursementDetail(reimburse.reimbursement_code);
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-3 text-red-600 border-red-600 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      fetchReimbursementDetail(reimburse.reimbursement_code);
                                    }}
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

                {filteredReimburse.length === 0 && !isLoading && (
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
                    {selectedReimburse.reimbursement_code} - {selectedReimburse.title}
                  </CardTitle>
                  <CardDescription>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>
                          <strong>Submitted by:</strong> {selectedReimburse.submitted_by_user_name} | 
                          <strong> Created by:</strong> {selectedReimburse.created_by_user_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(selectedReimburse.submitted_date)} {selectedReimburse.submitted_time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="font-semibold">{formatRupiah(selectedReimburse.total_amount)}</span>
                      </div>
                    </div>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge className={getStatusColor(selectedReimburse.status)}>
                    {selectedReimburse.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notes */}
              {selectedReimburse.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-gray-700 mt-1">{selectedReimburse.notes}</p>
                </div>
              )}

              {/* Items Table */}
              <div>
                <Label className="text-sm font-medium mb-4 block">
                  Detail Pengeluaran ({selectedReimburse.items.length} items)
                </Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-4 w-12">No</TableHead>
                        <TableHead className="px-4">Tanggal</TableHead>
                        <TableHead className="px-4">Keterangan</TableHead>
                        <TableHead className="px-4">Amount</TableHead>
                        <TableHead className="px-4">Documents</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReimburse.items.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium px-4 text-center">{index + 1}</TableCell>
                          <TableCell className="px-4">{formatDate(item.item_date)}</TableCell>
                          <TableCell className="px-4">
                            <div className="max-w-xs">
                              <p className="font-medium">{item.description}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold px-4">{formatRupiah(item.amount)}</TableCell>
                          <TableCell className="px-4">
                            {item.attachment_path ? (
                              <Badge 
                                variant="secondary" 
                                className="text-xs cursor-pointer hover:bg-blue-100"
                                onClick={() => handleViewAttachment(item.attachment_path!)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View Attachment
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Summary & Approval Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Summary */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <Label className="text-sm font-medium">Summary</Label>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Items:</span>
                      <span className="font-medium">{selectedReimburse.items.length}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="font-semibold">Grand Total:</span>
                      <span className="font-semibold text-green-600">{formatRupiah(selectedReimburse.total_amount)}</span>
                    </div>
                  </div>
                </div>

                {/* Approval Info */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <Label className="text-sm font-medium">Approval Information</Label>
                  {selectedReimburse.approved_by_user_name ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Approved by:</span>
                        <span className="font-medium">{selectedReimburse.approved_by_user_name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Approved Date:</span>
                        <span className="font-medium">{selectedReimburse.approved_date}</span>
                      </div>
                      {selectedReimburse.bank_account_code && (
                        <div className="flex justify-between text-sm">
                          <span>Bank Account:</span>
                          <span className="font-medium">{selectedReimburse.bank_account_code}</span>
                        </div>
                      )}
                      {selectedReimburse.payment_proof_path && (
                        <div className="flex justify-between text-sm">
                          <span>Payment Proof:</span>
                          <Badge 
                            variant="secondary" 
                            className="text-xs cursor-pointer hover:bg-blue-100"
                            onClick={() => handleViewPaymentProof(selectedReimburse.payment_proof_path!)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Proof
                          </Badge>
                        </div>
                      )}
                    </div>
                  ) : selectedReimburse.rejection_reason ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Status:</span>
                        <span className="font-medium text-red-600">Rejected</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Reason: </span>
                        <span>{selectedReimburse.rejection_reason}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Waiting for approval</p>
                  )}
                </div>
              </div>

              {/* Approval/Reject Form - Hanya tampil jika status submitted */}
              {selectedReimburse.status === 'submitted' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Approve / Reject Reimbursement</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Column - Approve Form */}
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="bankAccount" className="text-sm font-medium">
                            Select Bank Account *
                          </Label>
                          <select
                            id="bankAccount"
                            value={selectedBankAccount}
                            onChange={(e) => setSelectedBankAccount(e.target.value)}
                            className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                            required
                          >
                            <option value="">Select Bank Account</option>
                            {bankAccounts.map(bank => (
                              <option key={bank.bank_account_code} value={bank.bank_account_code}>
                                {bank.bank_name} - {bank.account_number} ({bank.account_holder})
                              </option>
                            ))}
                          </select>
                        </div>

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
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <div className="text-center">
                                <Label htmlFor="fileUpload" className="cursor-pointer">
                                  <span className="text-blue-600">Click to upload</span> or drag and drop
                                </Label>
                              </div>
                              <p className="text-xs text-gray-500 mt-1 text-center">
                                PDF, JPG, PNG up to {FILE_UPLOAD_CONFIG.maxSizeText}
                              </p>
                              <input
                                id="fileUpload"
                                type="file"
                                multiple
                                className="hidden"
                                onChange={handleFileUpload}
                                accept={FILE_UPLOAD_CONFIG.acceptTypes}
                              />
                            </div>
                            
                            {uploadedFiles.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {uploadedFiles.map((file, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-green-600" />
                                      <span className="text-sm">{file.name}</span>
                                      <span className="text-xs text-gray-500">
                                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                      </span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeUploadedFile(index)}
                                      className="h-6 w-6 p-0 text-red-600"
                                      disabled={isLoading}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Reject Form */}
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="rejectionReason" className="text-sm font-medium text-red-600">
                            Rejection Reason *
                          </Label>
                          <Textarea
                            id="rejectionReason"
                            placeholder="Enter reason for rejection..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="mt-1 min-h-[120px] border-red-200 focus:border-red-300"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons - Sejajar */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={handleApprove}
                        disabled={isLoading || !selectedBankAccount || uploadedFiles.length === 0}
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
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={handleReject}
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
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ReimburseErrorBoundary>
  );
}