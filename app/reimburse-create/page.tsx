'use client';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Upload, FileText, DollarSign, Save, X, Eye, Download, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter } from 'lucide-react';
import { toast } from 'sonner';

type ReimburseItem = {
  id: number;
  temp_id?: number;
  item_date: string;
  description: string;
  amount: number;
  attachment?: string;
  attachment_path?: string;
  attachment_file?: File;
  file_size?: number;
  file_type?: string;
};

type ReimburseForm = {
  title: string;
  notes?: string;
  submitted_by_user_name: string;
  category_code: string;
  project_code?: string;
  items: ReimburseItem[];
  grandTotal: number;
};

type ReimburseHistory = {
  id: string;
  reimbursement_code: string;
  title: string;
  submitted_date: string;
  status: 'submitted' | 'approved' | 'rejected';
  total_amount: number;
  items_count: number;
  submitted_by_user_name: string;
  notes?: string;
};

type ReimburseDetail = {
  id: string;
  reimbursement_code: string;
  title: string;
  notes?: string;
  submitted_by_user_name: string;
  submitted_date: string;
  submitted_time: string;
  items: ReimburseItem[];
  total_amount: number;
  status: 'submitted' | 'approved' | 'rejected';
  approved_by_user_code?: string;
  approved_by_user_name?: string;
  approved_date?: string;
  rejection_reason?: string;
  category_code: string;
  bank_account_code?: string;
  project_code?: string;
  payment_proof_path?: string;
  created_by_user_name: string;
};

type Category = {
  category_code: string;
  category_name: string;
  name?: string;
};

type BankAccount = {
  bank_account_code: string;
  account_code?: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
};

type Project = {
  project_code: string;
  project_name: string;
  name?: string;
};

type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

// Skeleton Loading Component
const HistorySkeleton = () => (
  <TableRow>
    <TableCell className="px-4 py-3 text-center">
      <div className="h-4 bg-gray-200 rounded animate-pulse w-6 mx-auto"></div>
    </TableCell>
    <TableCell className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
    </TableCell>
    <TableCell className="px-4 py-3">
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
        <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
        <div className="flex gap-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-12"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
        </div>
      </div>
    </TableCell>
    <TableCell className="px-4 py-3">
      <div className="space-y-1">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
        <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
      </div>
    </TableCell>
    <TableCell className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
    </TableCell>
    <TableCell className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded animate-pulse w-8"></div>
    </TableCell>
    <TableCell className="px-4 py-3">
      <div className="h-6 bg-gray-200 rounded animate-pulse w-20"></div>
    </TableCell>
    <TableCell className="px-4 py-3">
      <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
    </TableCell>
  </TableRow>
);

const decodeToken = (token: string | null) => {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

const formatDateForInput = (dateString: string) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    // Force format yyyy-mm-dd
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    return '';
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Enhanced fetch with retry logic
const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 2): Promise<any> => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      }
    });

    if (response.status === 401) {
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying... ${retries} attempts left`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
};

export default function ReimburseCreatePage() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [form, setForm] = useState<ReimburseForm>({
    title: '',
    notes: '',
    submitted_by_user_name: '',
    category_code: '',
    project_code: '',
    items: [],
    grandTotal: 0
  });

  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [selectedReimburse, setSelectedReimburse] = useState<ReimburseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  
  const [reimburseHistory, setReimburseHistory] = useState<ReimburseHistory[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [currentUser, setCurrentUser] = useState({
    user_code: '',
    user_name: ''
  });

  // Advanced filter states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [amountRange, setAmountRange] = useState({ min: '', max: '' });
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    const userData = decodeToken(token);
    if (!userData) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return;
    }

    setCurrentUser({
      user_code: userData.user_code || '',
      user_name: userData.name || ''
    });

    setForm({
      title: '',
      notes: '',
      submitted_by_user_name: '',
      category_code: '',
      project_code: '',
      items: [
        { 
          id: Date.now(),
          temp_id: Date.now(),
          item_date: new Date().toISOString().split('T')[0], 
          description: '', 
          amount: 0,
          attachment: ''
        }
      ],
      grandTotal: 0
    });

    fetchDropdownData().finally(() => {
      setIsInitializing(false);
    });
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchReimbursements(1);
    }
  }, [activeTab, debouncedSearch, statusFilter]);

  const fetchDropdownData = async () => {
    try {
      const result = await fetchWithRetry('/api/reimburse-create?action=dropdowns');
      
      if (result.success) {
        setCategories(result.data.categories || []);
        setBankAccounts(result.data.bankAccounts || []);
        setProjects(result.data.projects || []);
      }
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      toast.error('Gagal memuat data dropdown');
      setCategories([]);
      setBankAccounts([]);
      setProjects([]);
    }
  };

  const fetchReimbursements = async (page = pagination.page, limit = pagination.limit) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(dateRange.start && { start_date: dateRange.start }),
        ...(dateRange.end && { end_date: dateRange.end }),
        ...(amountRange.min && { min_amount: amountRange.min }),
        ...(amountRange.max && { max_amount: amountRange.max })
      });

      const result = await fetchWithRetry(`/api/reimburse-create?${params}`);
      
      if (result.success) {
        setReimburseHistory(result.data || []);
        setPagination(result.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        });
      }
    } catch (error) {
      console.error('Error fetching reimbursements:', error);
      toast.error('Gagal memuat data reimbursement');
      setReimburseHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchReimbursementDetail = async (reimbursementCode: string) => {
    try {
      const result = await fetchWithRetry(`/api/reimburse-create?reimbursement_code=${reimbursementCode}`);
      if (result.success) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching reimbursement detail:', error);
      toast.error('Gagal memuat detail reimbursement');
      return null;
    }
  };

  const getFileType = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) return 'previewable';
    if (['doc', 'docx'].includes(ext || '')) return 'document';
    return 'other';
  };

  const downloadAttachment = async (attachmentPath: string, reimbursementCode: string, action: 'download' | 'preview' = 'download') => {
    try {
      const filename = attachmentPath.split('/').pop();
      if (!filename) {
        toast.error('Filename tidak valid');
        return;
      }

      const token = localStorage.getItem('token');
      const url = `/api/reimburse-create?download=attachment&filename=${encodeURIComponent(filename)}&reimbursement_code=${reimbursementCode}${action === 'preview' ? '&preview=true' : ''}`;
      
      if (action === 'preview') {
        window.open(url, '_blank');
      } else {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(downloadUrl);
          document.body.removeChild(a);
        } else {
          toast.error('File tidak ditemukan');
        }
      }
    } catch (error) {
      console.error('Error handling file:', error);
      toast.error('Error mengakses file');
    }
  };

  const updateCell = (id: number, field: string, value: string) => {
    const updatedItems = form.items.map(item => {
      if (item.id === id) {
        return { 
          ...item, 
          [field]: field === 'amount' ? Number(value) : value 
        };
      }
      return item;
    });
    
    setForm(prev => ({ ...prev, items: updatedItems }));
    calculateGrandTotal(updatedItems);
  };

  const addNewRow = () => {
    const newId = Date.now();
    const newItem: ReimburseItem = { 
      id: newId,
      temp_id: newId,
      item_date: new Date().toISOString().split('T')[0], 
      description: '', 
      amount: 0,
      attachment: ''
    };
    
    const updatedItems = [...form.items, newItem];
    setForm(prev => ({ ...prev, items: updatedItems }));
    calculateGrandTotal(updatedItems);
  };

  const removeRow = (id: number) => {
    if (form.items.length > 1) {
      const updatedItems = form.items.filter(item => item.id !== id);
      setForm(prev => ({ ...prev, items: updatedItems }));
      calculateGrandTotal(updatedItems);
    }
  };

  const handleFileUpload = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validasi file size
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File terlalu besar. Maksimal 10MB');
      return;
    }

    // Validasi file type
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      toast.error('Format file tidak didukung. Gunakan PDF, JPG, PNG, DOC, DOCX');
      return;
    }

    const updatedItems = form.items.map(item => 
      item.id === id ? { 
        ...item, 
        attachment: file.name, 
        attachment_file: file,
        file_size: file.size,
        file_type: file.type
      } : item
    );
    
    setForm(prev => ({ ...prev, items: updatedItems }));
    e.target.value = ''; // Reset input
  };

  const removeAttachment = (id: number) => {
    const updatedItems = form.items.map(item => 
      item.id === id ? { ...item, attachment: '', attachment_file: undefined } : item
    );
    
    setForm(prev => ({ ...prev, items: updatedItems }));
  };

  const calculateGrandTotal = (items: ReimburseItem[]) => {
    if (!items || !Array.isArray(items)) {
      setForm(prev => ({ ...prev, grandTotal: 0 }));
      return;
    }

    const grandTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    setForm(prev => ({ ...prev, grandTotal }));
  };

  const handleSubmit = async () => {
    const hasEmptyFields = form.items.some(item => 
      !item.item_date || !item.description || !item.amount
    );

    if (hasEmptyFields) {
      toast.error('Harap lengkapi semua field yang wajib diisi pada tabel items');
      return;
    }

    if (!form.title || !form.submitted_by_user_name || !form.category_code) {
      toast.error('Harap lengkapi judul pengajuan, nama pengaju, dan kategori');
      return;
    }

    const hasValidAmount = form.items.some(item => item.amount > 0);
    if (!hasValidAmount) {
      toast.error('Harap isi total pengeluaran minimal untuk satu item');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      const submitData = {
        title: form.title,
        notes: form.notes,
        submitted_by_user_name: form.submitted_by_user_name,
        category_code: form.category_code,
        project_code: form.project_code,
        items: form.items.map(item => ({
          temp_id: item.temp_id,
          item_date: item.item_date,
          description: item.description,
          amount: item.amount
        }))
      };

      formData.append('data', JSON.stringify(submitData));

      form.items.forEach((item) => {
        if (item.attachment_file && item.temp_id) {
          formData.append(`attachment_${item.temp_id}`, item.attachment_file);
        }
      });

      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const response = await fetch('/api/reimburse-create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Failed to submit reimbursement');
      }

      const result = await response.json();

      if (result.success) {
        toast.success(`Pengajuan reimburse berhasil dikirim! Kode: ${result.reimbursement_code}`);
        
        setForm({
          title: '',
          notes: '',
          submitted_by_user_name: '',
          category_code: '',
          project_code: '',
          items: [
            { 
              id: Date.now(),
              temp_id: Date.now(),
              item_date: new Date().toISOString().split('T')[0], 
              description: '', 
              amount: 0,
              attachment: ''
            }
          ],
          grandTotal: 0
        });

        fetchReimbursements();
        setActiveTab('history');
      } else {
        toast.error(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error submitting reimbursement:', error);
      toast.error(`Terjadi error saat mengajukan reimbursement: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (reimburse: ReimburseHistory) => {
    const currentTime = new Date().getTime();
    const clickGap = currentTime - lastClickTime;
    
    if (clickGap < 300) { // Double click
      if (selectedReimburse?.id === reimburse.id) {
        setSelectedReimburse(null);
        return;
      }
    }
    
    // Single click - fetch detail
    setDetailLoading(reimburse.reimbursement_code);
    fetchReimbursementDetail(reimburse.reimbursement_code).then(detail => {
      if (detail) {
        setSelectedReimburse(detail);
      }
    }).finally(() => {
      setDetailLoading(null);
    });
    
    setLastClickTime(currentTime);
  };

  const getStatusColor = (status: ReimburseHistory['status']) => {
    const colors = {
      submitted: 'bg-blue-100 text-blue-800 border border-blue-200',
      approved: 'bg-green-100 text-green-800 border border-green-200',
      rejected: 'bg-red-100 text-red-800 border border-red-200'
    };
    return colors[status];
  };

  const getStatusIcon = (status: ReimburseHistory['status']) => {
    const icons = {
      submitted: '⏳',
      approved: '✅',
      rejected: '❌'
    };
    return icons[status];
  };

  const getCategoryName = (categoryCode: string) => {
    const category = categories.find(cat => cat.category_code === categoryCode);
    return category?.category_name || category?.name || categoryCode;
  };

  const getBankAccountName = (bankAccountCode: string) => {
    const bankAccount = bankAccounts.find(bank => 
      bank.bank_account_code === bankAccountCode || bank.account_code === bankAccountCode
    );
    return bankAccount ? `${bankAccount.bank_name} - ${bankAccount.account_number}` : bankAccountCode;
  };

  const handlePageChange = (newPage: number) => {
    fetchReimbursements(newPage, pagination.limit);
  };

  const handleLimitChange = (newLimit: number) => {
    fetchReimbursements(1, newLimit);
  };

  const Pagination = () => (
    <div className="flex items-center justify-between border-t pt-4">
      <div className="text-sm text-gray-600">
        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Rows per page:</span>
          <Select 
            value={pagination.limit.toString()} 
            onValueChange={(value) => handleLimitChange(Number(value))}
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handlePageChange(pagination.page - 1)} 
            disabled={pagination.page === 1}
            className="w-8 h-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-sm text-gray-600 mx-2">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handlePageChange(pagination.page + 1)} 
            disabled={pagination.page === pagination.totalPages}
            className="w-8 h-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setDateRange({ start: '', end: '' });
    setAmountRange({ min: '', max: '' });
    setShowAdvancedFilters(false);
    toast.info('Semua filter telah dihapus');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' || dateRange.start || dateRange.end || amountRange.min || amountRange.max;

  if (isInitializing) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pengajuan Reimburse</h1>
          <p className="text-gray-600 mt-2">Kelola pengajuan dan riwayat reimburse</p>
        </div>
      </div>

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

      {activeTab === 'create' && (
        <div className="space-y-6">
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
              <div className="space-y-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="submitted_by_user_name" className="text-sm font-medium mb-2 block">
                      Nama Yang Mengajukan *
                    </Label>
                    <Input
                      id="submitted_by_user_name"
                      placeholder="Nama orang yang mengajukan reimburse"
                      value={form.submitted_by_user_name}
                      onChange={(e) => setForm(prev => ({ ...prev, submitted_by_user_name: e.target.value }))}
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="title" className="text-sm font-medium mb-2 block">
                      Judul Pengajuan *
                    </Label>
                    <Input
                      id="title"
                      placeholder="Contoh: Business Trip Jakarta, Pembelian Alat Kantor, dll."
                      value={form.title}
                      onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                      className="bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category_code" className="text-sm font-medium mb-2 block">
                      Kategori *
                    </Label>
                    <Select 
                      value={form.category_code} 
                      onValueChange={(value) => setForm(prev => ({ ...prev, category_code: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder={categories.length === 0 ? "Loading..." : "Pilih Kategori"} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.length === 0 ? (
                          <SelectItem value="no-category" disabled>
                            Tidak ada kategori
                          </SelectItem>
                        ) : (
                          categories.map(cat => (
                            <SelectItem key={cat.category_code} value={cat.category_code}>
                              {cat.category_name || cat.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="project_code" className="text-sm font-medium mb-2 block">
                      Project (Opsional)
                    </Label>
                    <Select 
                      value={form.project_code || ''} 
                      onValueChange={(value) => setForm(prev => ({ ...prev, project_code: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder={projects.length === 0 ? "Loading..." : "Pilih Project"} />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.length === 0 ? (
                          <SelectItem value="no-project" disabled>
                            Tidak ada project
                          </SelectItem>
                        ) : (
                          projects.map(project => (
                            <SelectItem key={project.project_code} value={project.project_code}>
                              {project.project_name || project.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
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

                <div className="p-3 bg-gray-50 rounded-lg">
                  <Label className="text-sm font-medium text-gray-600">Dibuat Oleh</Label>
                  <p className="font-semibold">{currentUser.user_name || 'Loading...'}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Tanggal *</TableHead>
                      <TableHead className="min-w-[200px]">Keterangan *</TableHead>
                      <TableHead className="w-[150px]">Total (Rp) *</TableHead>
                      <TableHead className="w-[120px]">Lampiran</TableHead>
                      <TableHead className="w-[80px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.items.map((item) => (
                      <TableRow key={item.id} className="hover:bg-gray-50/50">
                        <TableCell>
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className="w-full h-8 justify-start text-left font-normal text-sm">
        {formatDateForInput(item.item_date) || "Pilih tanggal"}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0">
      <Calendar
        mode="single"
        selected={new Date(item.item_date)}
        onSelect={(newDate) => {
          if (newDate) {
            updateCell(item.id, 'item_date', newDate.toISOString().split('T')[0]);
          }
        }}
        initialFocus
      />
    </PopoverContent>
  </Popover>
</TableCell>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) => updateCell(item.id, 'description', e.target.value)}
                            placeholder="Deskripsi pengeluaran..."
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.amount}
                            onChange={(e) => updateCell(item.id, 'amount', e.target.value)}
                            placeholder="0"
                            className="h-8 text-sm"
                          />
                        </TableCell>
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

              <div className="mt-4 p-4 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/50">
                <div className="flex justify-between items-center">
                  <div className="text-center">
                    <Label className="text-xs text-blue-600 font-medium">Total Items</Label>
                    <p className="font-bold text-blue-800 text-lg">{form.items.length}</p>
                  </div>
                  <div className="text-center">
                    <Label className="text-xs text-blue-600 font-medium">Grand Total</Label>
                    <p className="font-bold text-green-600 text-xl">
                      {formatCurrency(form.grandTotal)}
                    </p>
                  </div>
                </div>
                {form.grandTotal > 0 && (
                  <div className="mt-2 text-center">
                    <p className="text-xs text-blue-600">
                      {form.items.length} item • Rata-rata {formatCurrency(form.grandTotal / form.items.length)} per item
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700" 
                  onClick={handleSubmit}
                  disabled={loading || form.items.length === 0 || !form.title || !form.submitted_by_user_name || !form.category_code}
                  size="lg"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      Ajukan Reimburse
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Riwayat Pengajuan Reimburse</CardTitle>
                  <CardDescription>
                    Cari dan filter riwayat pengajuan reimburse
                    {debouncedSearch && ` • Hasil pencarian: "${debouncedSearch}"`}
                    {statusFilter !== 'all' && ` • Status: ${statusFilter}`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    {showAdvancedFilters ? 'Sembunyikan Filter' : 'Filter Lanjutan'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search & Filter Section */}
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">Pencarian</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="search"
                        placeholder="Cari judul, kode, atau nama..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Filter Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Semua Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategori</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Semua Kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Kategori</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.category_code} value={cat.category_code}>
                            {cat.category_name || cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Advanced Filters */}
                {showAdvancedFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-gray-50">
                    <div className="space-y-2">
                      <Label htmlFor="dateFrom">Dari Tanggal</Label>
                      <Input
                        id="dateFrom"
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateTo">Sampai Tanggal</Label>
                      <Input
                        id="dateTo"
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amountMin">Jumlah Minimal</Label>
                      <Input
                        id="amountMin"
                        type="number"
                        placeholder="0"
                        value={amountRange.min}
                        onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amountMax">Jumlah Maksimal</Label>
                      <Input
                        id="amountMax"
                        type="number"
                        placeholder="0"
                        value={amountRange.max}
                        onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="mt-2"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Hapus Semua Filter
                  </Button>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[1000px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px] px-4">No</TableHead>
                          <TableHead className="w-[180px] px-4">Reimburse No</TableHead>
                          <TableHead className="px-4">Title & Purpose</TableHead>
                          <TableHead className="w-[120px] px-4">Submitted By</TableHead>
                          <TableHead className="w-[120px] px-4">Amount</TableHead>
                          <TableHead className="w-[80px] px-4">Days</TableHead>
                          <TableHead className="w-[120px] px-4">Status</TableHead>
                          <TableHead className="w-[100px] px-4">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading && reimburseHistory.length === 0 ? (
                          Array.from({ length: 5 }).map((_, index) => (
                            <HistorySkeleton key={index} />
                          ))
                        ) : (
                          reimburseHistory.map((reimburse, index) => (
                            <TableRow
                              key={reimburse.id}
                              className={`
                                hover:bg-gray-50 cursor-pointer transition-colors
                                ${selectedReimburse?.id === reimburse.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
                              `}
                              onClick={() => handleRowClick(reimburse)}
                            >
                              <TableCell className="px-4 py-3 text-center align-top">
                                {((pagination.page - 1) * pagination.limit) + index + 1}
                              </TableCell>
                              <TableCell className="font-semibold px-4 py-3 align-top">
                                {reimburse.reimbursement_code}
                              </TableCell>
                              <TableCell className="px-4 py-3 align-top">
                                <div className="space-y-1">
                                  <div className="font-medium">{reimburse.title}</div>
                                  <div className="text-sm text-gray-500 line-clamp-1">{reimburse.notes}</div>
                                  <div className="flex gap-2 text-xs text-gray-600">
                                    <span>{reimburse.items_count} items</span>
                                    <span>•</span>
                                    <span>{formatCurrency(reimburse.total_amount)}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-3 align-top">
                                <div className="space-y-1">
                                  <div className="font-medium">{reimburse.submitted_by_user_name}</div>
                                  <div className="text-sm text-gray-500">{formatDate(reimburse.submitted_date)}</div>
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold px-4 py-3 align-top">
                                {formatCurrency(reimburse.total_amount)}
                              </TableCell>
                              <TableCell className="px-4 py-3 align-top">
                                <div className="text-sm font-medium text-gray-600">
                                  0d
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-3 align-top">
                                <Badge className={`${getStatusColor(reimburse.status)} font-medium`}>
                                  <span className="mr-1">{getStatusIcon(reimburse.status)}</span>
                                  {reimburse.status.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-4 py-3 align-top">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRowClick(reimburse);
                                  }}
                                  disabled={detailLoading === reimburse.reimbursement_code}
                                  className="transition-all duration-200"
                                >
                                  {detailLoading === reimburse.reimbursement_code ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mr-2" />
                                      Loading...
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-4 w-4 mr-1" />
                                      Detail
                                    </>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {reimburseHistory.length === 0 && !loading && (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <FileText className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {debouncedSearch || statusFilter !== 'all' || hasActiveFilters ? 'Tidak ada hasil' : 'Belum ada pengajuan'}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {debouncedSearch || statusFilter !== 'all' || hasActiveFilters 
                      ? 'Coba ubah kata kunci pencarian atau filter status' 
                      : 'Mulai dengan membuat pengajuan reimburse pertama Anda'
                    }
                  </p>
                  {(debouncedSearch || statusFilter !== 'all' || hasActiveFilters) ? (
                    <Button 
                      onClick={clearAllFilters}
                      variant="outline"
                    >
                      Reset Pencarian
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => setActiveTab('create')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Buat Pengajuan Baru
                    </Button>
                  )}
                </div>
              )}

              {reimburseHistory.length > 0 && <Pagination />}
            </CardContent>
          </Card>

          {selectedReimburse && (
            <Card className="border-blue-200 border-2">
              <CardHeader className="bg-blue-50 border-b border-blue-100">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Detail Reimburse</CardTitle>
                    <CardDescription>{selectedReimburse.reimbursement_code}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(selectedReimburse.status)}>
                    <span className="mr-1">{getStatusIcon(selectedReimburse.status)}</span>
                    {selectedReimburse.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
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
                              <span>{selectedReimburse.submitted_by_user_name}</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Dibuat Oleh</label>
                            <p className="font-semibold mt-1">{selectedReimburse.created_by_user_name}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Tanggal Ajuan</label>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>{formatDate(selectedReimburse.submitted_date)} {selectedReimburse.submitted_time}</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Grand Total</label>
                            <div className="flex items-center gap-2 mt-1">
                              <DollarSign className="h-4 w-4 text-gray-400" />
                              <span className="font-semibold text-lg">{formatCurrency(selectedReimburse.total_amount)}</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Kategori</label>
                            <p className="font-semibold mt-1">
                              {getCategoryName(selectedReimburse.category_code)}
                            </p>
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

                  <Card>
                    <CardHeader>
                      <CardTitle>Detail Pengeluaran</CardTitle>
                      <CardDescription>{selectedReimburse.items.length} items</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tanggal</TableHead>
                              <TableHead>Keterangan</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead>Lampiran</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedReimburse.items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="whitespace-nowrap">
                                  {formatDate(item.item_date)}
                                </TableCell>
                                <TableCell>{item.description}</TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(Number(item.amount))}
                                </TableCell>
                                <TableCell>
                                  {item.attachment_path ? (
                                    <div className="flex gap-2">
                                      {getFileType(item.attachment_path) === 'previewable' && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => downloadAttachment(item.attachment_path!, selectedReimburse.reimbursement_code, 'preview')}
                                          className="h-8 text-xs"
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          Preview
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => downloadAttachment(item.attachment_path!, selectedReimburse.reimbursement_code, 'download')}
                                        className="h-8 text-xs"
                                      >
                                        <Download className="h-3 w-3 mr-1" />
                                        Download
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-sm">Tidak ada lampiran</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

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
                      
                      {selectedReimburse.approved_by_user_name && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Disetujui Oleh:</span>
                            <span className="font-medium">{selectedReimburse.approved_by_user_name}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Tanggal Approval:</span>
                            <span className="font-medium">{selectedReimburse.approved_date}</span>
                          </div>
                          {selectedReimburse.bank_account_code && (
                            <div className="flex justify-between text-sm">
                              <span>Rekening Bank:</span>
                              <span className="font-medium">
                                {getBankAccountName(selectedReimburse.bank_account_code)}
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {selectedReimburse.rejection_reason && (
                        <div className="pt-4 border-t">
                          <label className="text-sm font-medium text-red-600">Alasan Penolakan</label>
                          <p className="text-sm text-gray-600 mt-1">{selectedReimburse.rejection_reason}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}