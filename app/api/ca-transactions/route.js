import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

async function saveFile(file, category) {
  if (!file) return null;
  
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop();
  const filename = `${category}_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
  
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'ca-transactions');
  await mkdir(uploadDir, { recursive: true });
  
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);

  return `/uploads/ca-transactions/${filename}`;
}

async function generateTransactionCode() {
  const countResult = await query(
    'SELECT COUNT(*) as count FROM ca_transactions WHERE YEAR(created_at) = YEAR(CURDATE())'
  );
  return `CATRX-${new Date().getFullYear()}-${String(countResult[0].count + 1).padStart(4, '0')}`;
}

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const ca_code = searchParams.get('ca_code');

    if (action === 'dropdowns') {
      const categories_query = await query(
      `SELECT 
        t.category_code,
        t.name,
        t.description,
        t.is_active,
        t.is_deleted,
        t.id
       FROM reimbursement_categories t
       WHERE t.category_code LIKE '%'
       AND t.is_deleted = 0
       ORDER BY t.id DESC` 
    );

      // Transform data dari database ke format dropdown
      const dropdownCategories = categories_query.map(category => ({
        value: category.category_code,
        label: category.name 
      }));
      

      // Jika ada hasil dari database, gunakan
      if (dropdownCategories.length > 0) {
        return Response.json({
          success: true,
          data: { categories: dropdownCategories }
        });
      }
      
    }

    if (ca_code) {
      const transactions = await query(
        `SELECT 
          t.transaction_code,
          t.transaction_date,
          t.description,
          t.category,
          t.amount,
          t.receipt_filename,
          t.receipt_path,
          t.created_at
         FROM ca_transactions t
         WHERE t.ca_code = ? 
         AND t.is_deleted = 0
         ORDER BY t.transaction_date DESC`,
        [ca_code]
      );

      return Response.json({
        success: true,
        data: transactions
      });
    }

    const cashAdvances = await query(
      `SELECT 
        ca_code,
        employee_name,
        purpose,
        total_amount,
        used_amount,
        remaining_amount,
        status
       FROM cash_advances 
       WHERE status IN ('active', 'approved')
       AND is_deleted = 0
       AND remaining_amount > 0
       ORDER BY created_at DESC`
    );

    return Response.json({
      success: true,
      data: cashAdvances
    });

  } catch (error) {
    console.error('GET CA transactions error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ error: 'Invalid token' }, { status: 401 });

    const formData = await request.formData();
    const dataField = formData.get('data');
    
    if (!dataField) {
      return Response.json({ error: 'Missing data field' }, { status: 400 });
    }

    const transactionData = JSON.parse(dataField);
    const { ca_code, transaction_date, description, category, amount } = transactionData;

    // Validasi
    if (!ca_code || !transaction_date || !description || !category || !amount) {
      return Response.json({ error: 'Semua field harus diisi' }, { status: 400 });
    }

    // Validasi amount
    if (amount <= 0) {
      return Response.json({ error: 'Amount harus lebih dari 0' }, { status: 400 });
    }

    // Validasi tanggal
    const today = new Date().toISOString().split('T')[0]
    if (transaction_date > today) {
      return Response.json({ error: 'Tanggal tidak boleh lebih dari hari ini' }, { status: 400 })
    }

    // Check CA
    const caCheck = await query(
      `SELECT remaining_amount FROM cash_advances WHERE ca_code = ? AND is_deleted = 0`,
      [ca_code]
    );

    if (caCheck.length === 0) {
      return Response.json({ error: 'Cash Advance tidak ditemukan' }, { status: 404 });
    }

    const remainingAmount = parseFloat(caCheck[0].remaining_amount);
    if (amount > remainingAmount) {
      return Response.json({ 
        error: `Saldo CA tidak cukup. Tersedia: Rp ${remainingAmount.toLocaleString()}` 
      }, { status: 400 });
    }

    // Handle file upload dengan validasi size
    const receiptFile = formData.get('receipt');
    let receipt_filename = null;
    let receipt_path = null;

    if (receiptFile && receiptFile.size > 0) {
      // Max 5MB
      if (receiptFile.size > 5 * 1024 * 1024) {
        return Response.json({ error: 'File terlalu besar. Maksimal 5MB' }, { status: 400 })
      }
      receipt_path = await saveFile(receiptFile, 'receipt')
      receipt_filename = receiptFile.name
    }

    const transaction_code = await generateTransactionCode();

    await query(
      `INSERT INTO ca_transactions 
       (transaction_code, ca_code, transaction_date, description, category, amount, receipt_filename, receipt_path, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [transaction_code, ca_code, transaction_date, description, category, amount, receipt_filename, receipt_path, decoded.user_code]
    );

    await query(
      `UPDATE cash_advances 
       SET used_amount = used_amount + ?,
           remaining_amount = remaining_amount - ?,
           updated_at = NOW(),
           updated_by = ?
       WHERE ca_code = ?`,
      [amount, amount, decoded.user_code, ca_code]
    );

    return Response.json({
      success: true,
      message: 'Transaksi berhasil ditambahkan',
      transaction_code: transaction_code
    });

  } catch (error) {
    console.error('POST CA transaction error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}