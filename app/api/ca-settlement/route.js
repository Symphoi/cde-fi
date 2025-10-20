import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

async function saveFile(file, category) {
  if (!file) return null;
  
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop();
  const filename = `${category}_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
  
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'ca-settlements');
  await mkdir(uploadDir, { recursive: true });
  
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);

  return `/uploads/ca-settlements/${filename}`;
}

async function generateSettlementCode() {
  const countResult = await query(
    'SELECT COUNT(*) as count FROM ca_settlements WHERE YEAR(created_at) = YEAR(CURDATE())'
  );
  return `CASETTLE-${new Date().getFullYear()}-${String(countResult[0].count + 1).padStart(4, '0')}`;
}

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const ca_code = searchParams.get('ca_code');

    if (ca_code) {
      return await handleGetSettlementDetail(ca_code);
    }

    return await handleGetSettlementCAs();

  } catch (error) {
    console.error('GET CA settlement error:', error);
    return Response.json({ error: 'Gagal memuat data settlement' }, { status: 500 });
  }
}

async function handleGetSettlementCAs() {
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
     WHERE status IN ('active', 'in_settlement')
     AND is_deleted = 0
     ORDER BY created_at DESC`
  );

  return Response.json({
    success: true,
    data: cashAdvances
  });
}

async function handleGetSettlementDetail(ca_code) {
  // Get CA details
  const caDetails = await query(
    `SELECT * FROM cash_advances WHERE ca_code = ? AND is_deleted = 0`,
    [ca_code]
  );

  if (caDetails.length === 0) {
    return Response.json({ error: 'Cash Advance tidak ditemukan' }, { status: 404 });
  }

  // Get transactions
  const transactions = await query(
    `SELECT 
      transaction_code,
      transaction_date,
      description,
      category,
      amount,
      receipt_filename,
      receipt_path
     FROM ca_transactions 
     WHERE ca_code = ? AND is_deleted = 0 
     ORDER BY transaction_date DESC`,
    [ca_code]
  );

  // Get existing settlement if any
  const settlement = await query(
    `SELECT * FROM ca_settlements WHERE ca_code = ? AND is_deleted = 0`,
    [ca_code]
  );

  return Response.json({
    success: true,
    data: {
      cash_advance: caDetails[0],
      transactions: transactions,
      settlement: settlement[0] || null
    }
  });
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

    const settlementData = JSON.parse(dataField);
    const { ca_code, settlement_date } = settlementData;

    // Validate CA exists
    const caCheck = await query(
      `SELECT * FROM cash_advances WHERE ca_code = ? AND is_deleted = 0`,
      [ca_code]
    );

    if (caCheck.length === 0) {
      return Response.json({ error: 'Cash Advance tidak ditemukan' }, { status: 404 });
    }

    const ca = caCheck[0];

    // Check if already settled
    if (ca.status === 'completed') {
      return Response.json({ error: 'Cash Advance sudah diselesaikan' }, { status: 400 });
    }

    // Handle refund proof upload if remaining amount > 0
    const refundProofFile = formData.get('refund_proof');
    let refund_proof_filename = null;
    let refund_proof_path = null;

    if (ca.remaining_amount > 0) {
      if (!refundProofFile || refundProofFile.size === 0) {
        return Response.json({ error: 'Bukti refund harus diupload untuk sisa dana' }, { status: 400 });
      }
      
      // Validate file size
      if (refundProofFile.size > 5 * 1024 * 1024) {
        return Response.json({ error: 'File terlalu besar. Maksimal 5MB' }, { status: 400 });
      }

      refund_proof_path = await saveFile(refundProofFile, 'refund_proof');
      refund_proof_filename = refundProofFile.name;
    }

    // Generate settlement code
    const settlement_code = await generateSettlementCode();

    // Create settlement record
    await query(
      `INSERT INTO ca_settlements 
       (settlement_code, ca_code, total_ca_amount, total_used_amount, remaining_amount, 
        refund_proof_filename, refund_proof_path, settlement_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        settlement_code,
        ca_code,
        ca.total_amount,
        ca.used_amount,
        ca.remaining_amount,
        refund_proof_filename,
        refund_proof_path,
        settlement_date,
        decoded.user_code
      ]
    );

    // Update CA status
    await query(
      `UPDATE cash_advances 
       SET status = 'completed',
           updated_at = NOW(),
           updated_by = ?
       WHERE ca_code = ?`,
      [decoded.user_code, ca_code]
    );

    return Response.json({
      success: true,
      message: 'Settlement berhasil disubmit',
      settlement_code: settlement_code
    });

  } catch (error) {
    console.error('Settlement error:', error);
    return Response.json({ error: 'Gagal melakukan settlement' }, { status: 500 });
  }
}