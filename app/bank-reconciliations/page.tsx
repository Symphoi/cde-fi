// app/accounting/bank-reconciliation/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function BankReconciliationPage() {
  const [reconciliations, setReconciliations] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedReconciliation, setSelectedReconciliation] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    bank_account_code: '',
    period_month: new Date().toISOString().split('T')[0].substring(0, 7),
    opening_balance: 0,
    closing_balance: 0
  });

  useEffect(() => {
    loadReconciliations();
    loadBankAccounts();
  }, []);

  const loadReconciliations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/bank-reconciliations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) setReconciliations(result.data);
    } catch (error) {
      console.error('Error loading reconciliations:', error);
    }
  };

  const loadBankAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/chart-of-accounts?type=asset&category=bank', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) setBankAccounts(result.data);
    } catch (error) {
      console.error('Error loading bank accounts:', error);
    }
  };

  const handleCreateReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/bank-reconciliations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      if (result.success) {
        setShowForm(false);
        loadReconciliations();
        // Auto open the new reconciliation
        handleViewReconciliation(result.data.reconciliation_id);
      }
    } catch (error) {
      console.error('Error creating reconciliation:', error);
    }
  };

  const handleViewReconciliation = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bank-reconciliations/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) setSelectedReconciliation(result.data);
    } catch (error) {
      console.error('Error loading reconciliation details:', error);
    }
  };

  const handleReconcileItems = async (itemIds: number[]) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bank-reconciliations/${selectedReconciliation.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reconciled_items: itemIds })
      });
      
      const result = await response.json();
      if (result.success) {
        handleViewReconciliation(selectedReconciliation.id);
        loadReconciliations();
      }
    } catch (error) {
      console.error('Error reconciling items:', error);
    }
  };

  const calculateDifference = () => {
    if (!selectedReconciliation) return 0;
    return parseFloat(selectedReconciliation.closing_balance) - parseFloat(selectedReconciliation.reconciled_balance);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Rekonsiliasi Bank</h1>
        <Button onClick={() => setShowForm(true)}>Mulai Rekonsiliasi Baru</Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Mulai Rekonsiliasi Bank</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateReconciliation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Akun Bank</label>
                  <select
                    value={formData.bank_account_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, bank_account_code: e.target.value }))}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="">Pilih Akun Bank</option>
                    {bankAccounts.map(account => (
                      <option key={account.account_code} value={account.account_code}>
                        {account.account_name} ({account.account_code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Bulan Periode</label>
                  <Input
                    type="month"
                    value={formData.period_month}
                    onChange={(e) => setFormData(prev => ({ ...prev, period_month: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Saldo Awal</label>
                  <Input
                    type="number"
                    value={formData.opening_balance}
                    onChange={(e) => setFormData(prev => ({ ...prev, opening_balance: parseFloat(e.target.value) }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Saldo Akhir (Bank Statement)</label>
                  <Input
                    type="number"
                    value={formData.closing_balance}
                    onChange={(e) => setFormData(prev => ({ ...prev, closing_balance: parseFloat(e.target.value) }))}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">Mulai Rekonsiliasi</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {selectedReconciliation ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              Rekonsiliasi {selectedReconciliation.bank_account_name} - {selectedReconciliation.period_month}
              <Button 
                variant="outline" 
                className="ml-4"
                onClick={() => setSelectedReconciliation(null)}
              >
                Kembali
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded">
              <div>
                <div className="text-sm text-gray-600">Saldo Awal</div>
                <div className="text-lg font-bold">Rp {parseFloat(selectedReconciliation.opening_balance).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Saldo Akhir (Bank)</div>
                <div className="text-lg font-bold">Rp {parseFloat(selectedReconciliation.closing_balance).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Saldo Terekoniliasi</div>
                <div className="text-lg font-bold">Rp {parseFloat(selectedReconciliation.reconciled_balance).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Selisih</div>
                <div className={`text-lg font-bold ${calculateDifference() === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Rp {calculateDifference().toLocaleString()}
                </div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Referensi</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedReconciliation.items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.transaction_date}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.reference_code}</TableCell>
                    <TableCell>Rp {parseFloat(item.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.is_reconciled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.is_reconciled ? 'Terekoniliasi' : 'Belum'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {!item.is_reconciled && (
                        <Button 
                          onClick={() => handleReconcileItems([item.id])}
                          variant="outline"
                          size="sm"
                        >
                          Tandai
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {selectedReconciliation.items.some((item: any) => !item.is_reconciled) && (
              <div className="mt-4">
                <Button 
                  onClick={() => {
                    const unreconciledIds = selectedReconciliation.items
                      .filter((item: any) => !item.is_reconciled)
                      .map((item: any) => item.id);
                    handleReconcileItems(unreconciledIds);
                  }}
                >
                  Tandai Semua sebagai Terekoniliasi
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Rekonsiliasi</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Akun Bank</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Saldo Awal</TableHead>
                  <TableHead>Saldo Akhir</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliations.map((reconciliation) => (
                  <TableRow key={reconciliation.id}>
                    <TableCell>{reconciliation.bank_account_name}</TableCell>
                    <TableCell>{reconciliation.period_month}</TableCell>
                    <TableCell>Rp {parseFloat(reconciliation.opening_balance).toLocaleString()}</TableCell>
                    <TableCell>Rp {parseFloat(reconciliation.closing_balance).toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        reconciliation.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {reconciliation.status === 'completed' ? 'Selesai' : 'Draft'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button 
                        onClick={() => handleViewReconciliation(reconciliation.id)}
                        variant="outline"
                      >
                        Lihat
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}