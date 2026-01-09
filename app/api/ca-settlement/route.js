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
    const action = searchParams.get('action');
    const status_filter = searchParams.get('status') || 'active';

    if (action === 'stats') {
      return await handleGetSettlementStats();
    }

    if (ca_code) {
      return await handleGetSettlementDetail(ca_code);
    }

    return await handleGetSettlementCAs(status_filter, decoded);

  } catch (error) {
    console.error('GET CA settlement error:', error);
    return Response.json({ 
      success: false,
      error: 'Gagal memuat data settlement' 
    }, { status: 500 });
  }
}

async function handleGetSettlementCAs(status_filter, decoded) {
  try {
    let sql = `
      SELECT 
        ca_code,
        employee_name,
        purpose,
        total_amount,
        used_amount,
        remaining_amount,
        status,
        request_date
      FROM cash_advances 
      WHERE is_deleted = 0
    `;
    
    const params = [];

    // ✅ PERBAIKAN: Filter berdasarkan status yang benar
    if (status_filter === 'active') {
      // Untuk user: CA yang bisa disettle (belum in_settlement/completed)
      sql += ` AND status IN ('active', 'partially_used', 'fully_used')`;
      sql += ` AND created_by = ?`;
      params.push(decoded.user_code);
    } else if (status_filter === 'in_settlement') {
      // Untuk finance: CA yang perlu direview
      sql += ` AND status = 'in_settlement'`;
    } else if (status_filter === 'completed') {
      // History settlement
      sql += ` AND status = 'completed'`;
      sql += ` AND created_by = ?`;
      params.push(decoded.user_code);
    }

    sql += ` ORDER BY 
      CASE 
        WHEN status = 'in_settlement' THEN 1
        WHEN status = 'fully_used' THEN 2
        WHEN status = 'partially_used' THEN 3
        WHEN status = 'active' THEN 4
        WHEN status = 'completed' THEN 5
      END,
      created_at DESC`;

    const cashAdvances = await query(sql, params);

    return Response.json({
      success: true,
      data: cashAdvances
    });
  } catch (error) {
    console.error('Error fetching settlement CAs:', error);
    return Response.json({ 
      success: false,
      error: 'Gagal memuat data Cash Advance' 
    }, { status: 500 });
  }
}

async function handleGetSettlementStats() {
  try {
    const stats = await query(
      `SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN status IN ('active', 'partially_used', 'fully_used') THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN status = 'in_settlement' THEN 1 ELSE 0 END) as in_settlement_count,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status IN ('active', 'partially_used', 'fully_used') THEN total_amount ELSE 0 END) as total_amount_active,
        SUM(CASE WHEN status = 'in_settlement' THEN total_amount ELSE 0 END) as total_amount_in_settlement,
        SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as total_amount_completed
       FROM cash_advances 
       WHERE is_deleted = 0`
    );

    const statsData = stats[0] || {
      total_count: 0,
      active_count: 0,
      in_settlement_count: 0,
      completed_count: 0,
      total_amount_active: 0,
      total_amount_in_settlement: 0,
      total_amount_completed: 0
    };

    return Response.json({
      success: true,
      data: {
        total_active: parseInt(statsData.active_count) || 0,
        total_in_settlement: parseInt(statsData.in_settlement_count) || 0,
        total_completed: parseInt(statsData.completed_count) || 0,
        total_amount_active: parseFloat(statsData.total_amount_active) || 0,
        total_amount_in_settlement: parseFloat(statsData.total_amount_in_settlement) || 0,
        total_amount_completed: parseFloat(statsData.total_amount_completed) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching settlement stats:', error);
    return Response.json({ 
      success: false,
      error: 'Gagal memuat statistik settlement' 
    }, { status: 500 });
  }
}

async function handleGetSettlementDetail(ca_code) {
  try {
    // Get CA details
    const caDetails = await query(
      `SELECT * FROM cash_advances WHERE ca_code = ? AND is_deleted = 0`,
      [ca_code]
    );

    if (caDetails.length === 0) {
      return Response.json({ 
        success: false,
        error: 'Cash Advance tidak ditemukan' 
      }, { status: 404 });
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
  } catch (error) {
    console.error('Error fetching settlement detail:', error);
    return Response.json({ 
      success: false,
      error: 'Gagal memuat detail settlement' 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ 
      success: false,
      error: 'Unauthorized' 
    }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ 
      success: false,
      error: 'Invalid token' 
    }, { status: 401 });

    const formData = await request.formData();
    const dataField = formData.get('data');
    
    if (!dataField) {
      return Response.json({ 
        success: false,
        error: 'Data settlement diperlukan' 
      }, { status: 400 });
    }

    const settlementData = JSON.parse(dataField);
    const { ca_code, settlement_date } = settlementData;

    if (!ca_code || !settlement_date) {
      return Response.json({ 
        success: false,
        error: 'CA code dan settlement date diperlukan' 
      }, { status: 400 });
    }

    // Validate CA exists
    const caCheck = await query(
      `SELECT * FROM cash_advances WHERE ca_code = ? AND is_deleted = 0`,
      [ca_code]
    );

    if (caCheck.length === 0) {
      return Response.json({ 
        success: false,
        error: 'Cash Advance tidak ditemukan' 
      }, { status: 404 });
    }

    const ca = caCheck[0];

    // ✅ PERBAIKAN: Validasi status CA
    if (!['active', 'partially_used', 'fully_used'].includes(ca.status)) {
      return Response.json({ 
        success: false,
        error: `Cash Advance tidak bisa disettle. Status saat ini: ${ca.status}` 
      }, { status: 400 });
    }

    if (ca.status === 'completed' || ca.status === 'in_settlement') {
      return Response.json({ 
        success: false,
        error: 'Cash Advance sudah dalam proses settlement' 
      }, { status: 400 });
    }

    // Handle refund proof upload if remaining amount > 0
    const refundProofFile = formData.get('refund_proof');
    let refund_proof_filename = null;
    let refund_proof_path = null;

    if (ca.remaining_amount > 0) {
      if (!refundProofFile || refundProofFile.size === 0) {
        return Response.json({ 
          success: false,
          error: 'Bukti refund harus diupload untuk sisa dana' 
        }, { status: 400 });
      }
      
      if (refundProofFile.size > 5 * 1024 * 1024) {
        return Response.json({ 
          success: false,
          error: 'File terlalu besar. Maksimal 5MB' 
        }, { status: 400 });
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(refundProofFile.type)) {
        return Response.json({ 
          success: false,
          error: 'Format file tidak didukung. Gunakan JPG, PNG, atau PDF' 
        }, { status: 400 });
      }

      refund_proof_path = await saveFile(refundProofFile, 'refund_proof');
      refund_proof_filename = refundProofFile.name;
    }

    // Generate settlement code
    const settlement_code = await generateSettlementCode();

    try {
      // Start transaction
      await query('START TRANSACTION');

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

      // ✅ PERBAIKAN PENTING: Update ke 'in_settlement', bukan 'completed'
      await query(
        `UPDATE cash_advances 
         SET status = 'in_settlement',
             updated_at = NOW(),
             updated_by = ?
         WHERE ca_code = ?`,
        [decoded.user_code, ca_code]
      );

      await query('COMMIT');

      return Response.json({
        success: true,
        message: 'Settlement berhasil diajukan. Menunggu review finance.',
        settlement_code: settlement_code,
        data: {
          settlement_code,
          remaining_amount: ca.remaining_amount,
          refund_uploaded: !!refund_proof_path,
          new_status: 'in_settlement'
        }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Settlement error:', error);
    return Response.json({ 
      success: false,
      error: 'Gagal melakukan settlement' 
    }, { status: 500 });
  }
}

// ✅ ENDPOINT BARU: Untuk finance approve/reject settlement
export async function PATCH(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { settlement_id, action, notes } = body;

    if (!settlement_id || !action) {
      return Response.json({ error: 'Settlement ID dan action harus diisi' }, { status: 400 });
    }

    // Check if settlement exists and CA is in_settlement
    const settlementCheck = await query(
      `SELECT s.*, ca.status as ca_status
       FROM ca_settlements s
       JOIN cash_advances ca ON s.ca_code = ca.ca_code
       WHERE s.id = ? AND ca.status = 'in_settlement' AND s.is_deleted = 0`,
      [settlement_id]
    );

    if (settlementCheck.length === 0) {
      return Response.json({ error: 'Settlement tidak ditemukan atau sudah diproses' }, { status: 404 });
    }

    if (action === 'approve') {
      await query(
        `UPDATE cash_advances 
         SET status = 'completed',
             updated_at = NOW(),
             updated_by = ?
         WHERE ca_code = ?`,
        [decoded.user_code, settlementCheck[0].ca_code]
      );

      await query(
        `UPDATE ca_settlements 
         SET status = 'approved',
             approved_by = ?,
             approved_at = NOW(),
             notes = ?
         WHERE id = ?`,
        [decoded.user_code, notes || null, settlement_id]
      );

      return Response.json({ 
        success: true, 
        message: 'Settlement berhasil disetujui',
        new_status: 'completed'
      });

    } else if (action === 'reject') {
      await query(
        `UPDATE cash_advances 
         SET status = 'active',
             updated_at = NOW(),
             updated_by = ?
         WHERE ca_code = ?`,
        [decoded.user_code, settlementCheck[0].ca_code]
      );

      await query(
        `UPDATE ca_settlements 
         SET status = 'rejected',
             rejected_by = ?,
             rejected_at = NOW(),
             notes = ?
         WHERE id = ?`,
        [decoded.user_code, notes || null, settlement_id]
      );

      return Response.json({ 
        success: true, 
        message: 'Settlement ditolak',
        new_status: 'active'
      });
    } else {
      return Response.json({ error: 'Action tidak valid' }, { status: 400 });
    }

  } catch (error) {
    console.error('PATCH settlement error:', error);
    return Response.json({ error: 'Gagal memproses settlement' }, { status: 500 });
  }
}

// Additional endpoint untuk download settlement report
export async function PUT(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const settlement_code = searchParams.get('settlement_code');

    if (action === 'download-report' && settlement_code) {
      return await handleDownloadReport(settlement_code);
    }

    return Response.json({ error: 'Action tidak valid' }, { status: 400 });

  } catch (error) {
    console.error('PUT CA settlement error:', error);
    return Response.json({ error: 'Gagal memproses request' }, { status: 500 });
  }
}

async function handleDownloadReport(settlement_code) {
  try {
    const settlement = await query(
      `SELECT s.*, ca.employee_name, ca.purpose, ca.department
       FROM ca_settlements s
       JOIN cash_advances ca ON s.ca_code = ca.ca_code
       WHERE s.settlement_code = ? AND s.is_deleted = 0`,
      [settlement_code]
    );

    if (settlement.length === 0) {
      return Response.json({ error: 'Settlement tidak ditemukan' }, { status: 404 });
    }

    const reportData = {
      settlement_code: settlement[0].settlement_code,
      ca_code: settlement[0].ca_code,
      employee_name: settlement[0].employee_name,
      purpose: settlement[0].purpose,
      total_ca_amount: settlement[0].total_ca_amount,
      total_used_amount: settlement[0].total_used_amount,
      remaining_amount: settlement[0].remaining_amount,
      settlement_date: settlement[0].settlement_date,
      status: settlement[0].status || 'completed'
    };

    return Response.json({
      success: true,
      data: reportData,
      message: 'Report settlement berhasil digenerate'
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return Response.json({ error: 'Gagal generate report' }, { status: 500 });
  }
}