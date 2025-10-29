// app/accounting/manual-journals/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Trash2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { AccountCombobox } from '@/components/account-combobox';

interface Account {
  account_code: string;
  account_name: string;
  account_type: string;
  category: string;
}

interface JournalItem {
  account_code: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
}

interface Journal {
  journal_code: string;
  transaction_date: string;
  description: string;
  status: string;
  items: JournalItem[];
  total_amount?: number;
}

// Format currency function
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format date function
const formatDate = (dateString: string) => {
  return dateString; // Already in YYYY-MM-DD format
};

export default function ManualJournalsPage() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedJournals, setExpandedJournals] = useState<Set<string>>(new Set());
  
  // Form states - selalu visible
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    items: [{ account_code: '', debit_amount: 0, credit_amount: 0, description: '' }]
  });

  useEffect(() => {
    loadJournals();
    loadAccounts();
  }, [pagination.page]);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const loadAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/manual-journals?action=accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) setAccounts(result.data);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const loadJournals = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/manual-journals?page=${pagination.page}&limit=${pagination.limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setJournals(result.data);
        setPagination(prev => ({ ...prev, ...result.pagination }));
      }
    } catch (error) {
      console.error('Error loading journals:', error);
      showAlert('error', 'Gagal memuat data jurnal');
    } finally {
      setLoading(false);
    }
  };

  // Filter journals
  const filteredJournals = journals.filter(journal => {
    const matchesSearch = 
      journal.journal_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      journal.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || journal.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const toggleJournalExpansion = (journalCode: string) => {
    setExpandedJournals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(journalCode)) {
        newSet.delete(journalCode);
      } else {
        newSet.add(journalCode);
      }
      return newSet;
    });
  };

  // Calculate journal totals
  const calculateJournalTotals = (items: JournalItem[]) => {
    const totalDebit = items.reduce((sum, item) => sum + (item.debit_amount || 0), 0);
    const totalCredit = items.reduce((sum, item) => sum + (item.credit_amount || 0), 0);
    return { totalDebit, totalCredit, isBalanced: totalDebit === totalCredit };
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { account_code: '', debit_amount: 0, credit_amount: 0, description: '' }]
    }));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/manual-journals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      if (result.success) {
        showAlert('success', result.message || 'Jurnal manual berhasil dibuat');
        setFormData({
          transaction_date: new Date().toISOString().split('T')[0],
          description: '',
          items: [{ account_code: '', debit_amount: 0, credit_amount: 0, description: '' }]
        });
        loadJournals();
      } else {
        showAlert('error', result.error || 'Gagal membuat jurnal');
      }
    } catch (error) {
      console.error('Error creating journal:', error);
      showAlert('error', 'Gagal membuat jurnal');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (journalCode: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/manual-journals', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ journalCode })
      });
      
      const result = await response.json();
      if (result.success) {
        showAlert('success', result.message || 'Jurnal berhasil diposting');
        loadJournals();
      } else {
        showAlert('error', result.error || 'Gagal memposting jurnal');
      }
    } catch (error) {
      console.error('Error posting journal:', error);
      showAlert('error', 'Gagal memposting jurnal');
    } finally {
      setLoading(false);
    }
  };

  const totalDebit = formData.items.reduce((sum, item) => sum + parseFloat(item.debit_amount.toString() || '0'), 0);
  const totalCredit = formData.items.reduce((sum, item) => sum + parseFloat(item.credit_amount.toString() || '0'), 0);

  const changePage = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jurnal Manual</h1>
          <p className="text-gray-600">Kelola pencatatan jurnal manual</p>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <Alert className={alert.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
          <AlertDescription className={alert.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {alert.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <Input
                type="text"
                placeholder="Cari kode atau deskripsi jurnal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            {/* Status Filter */}
            <div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Empty space for alignment */}
            <div></div>
          </div>
        </CardContent>
      </Card>

      {/* Journals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Jurnal Manual</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-500" />
              <p className="mt-2 text-gray-600">Memuat data...</p>
            </div>
          ) : filteredJournals.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada jurnal manual</h3>
              <p className="text-gray-500">Data jurnal akan muncul di sini</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Kode Jurnal</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Total Debit</TableHead>
                    <TableHead>Total Kredit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJournals.map((journal, index) => {
                    const { totalDebit, totalCredit, isBalanced } = calculateJournalTotals(journal.items);
                    const isExpanded = expandedJournals.has(journal.journal_code);
                    
                    return (
                      <>
                        {/* Main Journal Row */}
                        <TableRow key={journal.journal_code} className={isExpanded ? 'bg-muted/50' : ''}>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleJournalExpansion(journal.journal_code)}
                              className="h-8 w-8"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">{journal.journal_code}</TableCell>
                          <TableCell>{formatDate(journal.transaction_date)}</TableCell>
                          <TableCell className="max-w-xs">{journal.description}</TableCell>
                          <TableCell className={!isBalanced ? 'text-destructive font-medium' : ''}>
                            Rp {formatCurrency(totalDebit)}
                          </TableCell>
                          <TableCell className={!isBalanced ? 'text-destructive font-medium' : ''}>
                            Rp {formatCurrency(totalCredit)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={journal.status === 'posted' ? 'default' : 'secondary'}
                              className={!isBalanced ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : ''}
                            >
                              {journal.status === 'posted' ? 'Posted' : 'Draft'}
                              {!isBalanced && ' • Unbalanced'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              onClick={() => handlePost(journal.journal_code)} 
                              variant="outline"
                              disabled={loading || journal.status === 'posted' || !isBalanced}
                              size="sm"
                            >
                              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
                            </Button>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Journal Items */}
                        {isExpanded && journal.items.map((item, itemIndex) => (
                          <TableRow key={`${journal.journal_code}-${itemIndex}`} className="bg-muted/30">
                            <TableCell></TableCell>
                            <TableCell colSpan={2} className="text-xs text-muted-foreground">
                              {itemIndex + 1}. {item.account_code}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-xs">
                              {item.description || '-'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {item.debit_amount > 0 ? `Rp ${formatCurrency(item.debit_amount)}` : '-'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {item.credit_amount > 0 ? `Rp ${formatCurrency(item.credit_amount)}` : '-'}
                            </TableCell>
                            <TableCell colSpan={2} className="text-xs text-muted-foreground">
                              {item.debit_amount > 0 ? 'Debit' : 'Kredit'}
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* Total Row ketika expanded */}
                        {isExpanded && (
                          <TableRow className="bg-muted/50 font-medium">
                            <TableCell colSpan={4} className="text-right">
                              Total:
                            </TableCell>
                            <TableCell className={!isBalanced ? 'text-destructive' : ''}>
                              Rp {formatCurrency(totalDebit)}
                            </TableCell>
                            <TableCell className={!isBalanced ? 'text-destructive' : ''}>
                              Rp {formatCurrency(totalCredit)}
                            </TableCell>
                            <TableCell colSpan={2} className={!isBalanced ? 'text-destructive' : 'text-green-600'}>
                              {isBalanced ? 'Balance ✓' : `Selisih: Rp ${formatCurrency(Math.abs(totalDebit - totalCredit))}`}
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex justify-between items-center mt-6">
                  <div className="text-sm text-gray-600">
                    Menampilkan {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} jurnal
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => changePage(pagination.page - 1)}
                      disabled={pagination.page === 1 || loading}
                    >
                      Previous
                    </Button>
                    <span className="px-3 py-2 text-sm">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => changePage(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages || loading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Form - Always Visible */}
      <Card>
        <CardHeader>
          <CardTitle>Buat Jurnal Manual Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Tanggal Transaksi *
                </label>
                <Input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Deskripsi *
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Deskripsi jurnal"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Item Jurnal *
                </label>
                <Button type="button" onClick={addItem} variant="outline" disabled={loading} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Tambah Item
                </Button>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Akun</TableHead>
                    <TableHead>Debit</TableHead>
                    <TableHead>Kredit</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <AccountCombobox
                          accounts={accounts}
                          value={item.account_code}
                          onChange={(value) => updateItem(index, 'account_code', value)}
                          disabled={loading}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.debit_amount}
                          onChange={(e) => updateItem(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          disabled={loading}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.credit_amount}
                          onChange={(e) => updateItem(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          disabled={loading}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Deskripsi item"
                          disabled={loading}
                        />
                      </TableCell>
                      <TableCell>
                        {formData.items.length > 1 && (
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="icon"
                            onClick={() => removeItem(index)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span>Total Debit: <strong>Rp {formatCurrency(totalDebit)}</strong></span>
                  <span>Total Kredit: <strong>Rp {formatCurrency(totalCredit)}</strong></span>
                  <span className={totalDebit !== totalCredit ? 'text-destructive font-medium' : 'text-green-600 font-medium'}>
                    {totalDebit === totalCredit ? 'Balance ✓' : `Selisih: Rp ${formatCurrency(Math.abs(totalDebit - totalCredit))}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={loading || totalDebit !== totalCredit}
                className="gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Menyimpan...' : 'Simpan Jurnal'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setFormData({
                  transaction_date: new Date().toISOString().split('T')[0],
                  description: '',
                  items: [{ account_code: '', debit_amount: 0, credit_amount: 0, description: '' }]
                })}
                disabled={loading}
              >
                Reset Form
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}