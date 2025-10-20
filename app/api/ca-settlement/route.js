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

    if (action === 'stats') {
      return await handleGetSettlementStats();
    }

    if (ca_code) {
      return await handleGetSettlementDetail(ca_code);
    }

    return await handleGetSettlementCAs();

  } catch (error) {
    console.error('GET CA settlement error:', error);
    return Response.json({ 
      success: false,
      error: 'Gagal memuat data settlement' 
    }, { status: 500 });
  }
}

async function handleGetSettlementCAs() {
  try {
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
       WHERE status IN ('active', 'in_settlement', 'completed')
       AND is_deleted = 0
       ORDER BY 
         CASE 
           WHEN status = 'active' THEN 1
           WHEN status = 'in_settlement' THEN 2
           WHEN status = 'completed' THEN 3
         END,
         created_at DESC`
    );

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
        SUM(CASE WHEN status IN ('active', 'in_settlement') THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status IN ('active', 'in_settlement') THEN total_amount ELSE 0 END) as total_amount_active,
        SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as total_amount_completed
       FROM cash_advances 
       WHERE is_deleted = 0`
    );

    const statsData = stats[0] || {
      total_count: 0,
      active_count: 0,
      completed_count: 0,
      total_amount_active: 0,
      total_amount_completed: 0
    };

    return Response.json({
      success: true,
      data: {
        total_active: parseInt(statsData.active_count) || 0,
        total_completed: parseInt(statsData.completed_count) || 0,
        total_amount_active: parseFloat(statsData.total_amount_active) || 0,
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

    // Validasi input
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

    // Check if already settled
    if (ca.status === 'completed') {
      return Response.json({ 
        success: false,
        error: 'Cash Advance sudah diselesaikan' 
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
      
      // Validate file size
      if (refundProofFile.size > 5 * 1024 * 1024) {
        return Response.json({ 
          success: false,
          error: 'File terlalu besar. Maksimal 5MB' 
        }, { status: 400 });
      }

      // Validate file type
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

      // Update CA status to completed
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
        settlement_code: settlement_code,
        data: {
          settlement_code,
          remaining_amount: ca.remaining_amount,
          refund_uploaded: !!refund_proof_path
        }
      });

    } catch (error) {
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

    // Generate report data
    const reportData = {
      settlement_code: settlement[0].settlement_code,
      ca_code: settlement[0].ca_code,
      employee_name: settlement[0].employee_name,
      purpose: settlement[0].purpose,
      total_ca_amount: settlement[0].total_ca_amount,
      total_used_amount: settlement[0].total_used_amount,
      remaining_amount: settlement[0].remaining_amount,
      settlement_date: settlement[0].settlement_date,
      status: 'completed'
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