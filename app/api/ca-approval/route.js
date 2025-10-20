import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    // Get cash advances based on status filter
    let sql = `
      SELECT 
        ca_code,
        employee_name,
        department,
        purpose,
        total_amount,
        used_amount,
        remaining_amount,
        status,
        request_date,
        project_code,
        approved_by_spv,
        approved_by_finance,
        approved_date_spv,
        rejection_reason,
        created_at,
        submitted_date,
        submitted_time,
        DATEDIFF(CURDATE(), created_at) as days_waiting
      FROM cash_advances 
      WHERE is_deleted = 0 
    `;
    
    const params = [];

    // Filter by status - sesuaikan dengan enum di database
    if (status !== 'all') {
      if (status === 'submitted') {
        sql += ` AND status = 'submitted'`;
      } else if (status === 'active') {
        sql += ` AND status IN ('approved', 'active')`;
      } else if (status === 'rejected') {
        sql += ` AND status = 'rejected'`;
      }
    } else {
      sql += ` AND status IN ('submitted', 'approved', 'active', 'rejected')`;
    }

    if (search) {
      sql += ` AND (ca_code LIKE ? OR employee_name LIKE ? OR purpose LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ` ORDER BY 
      CASE 
        WHEN status = 'submitted' THEN 1
        WHEN status IN ('approved', 'active') THEN 2
        WHEN status = 'rejected' THEN 3
        ELSE 4
      END, created_at DESC`;

    const cashAdvances = await query(sql, params);

    // Get detailed stats - sesuaikan dengan status yang ada
    const statsSql = `
      SELECT 
        COUNT(*) as total_ca,
        SUM(CASE WHEN status IN ('approved', 'active') THEN 1 ELSE 0 END) as approved_ca,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as pending_ca,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_ca,
        COALESCE(SUM(total_amount), 0) as total_amount_all,
        COALESCE(SUM(CASE WHEN status = 'submitted' THEN total_amount ELSE 0 END), 0) as total_amount_pending,
        COALESCE(SUM(CASE WHEN status IN ('approved', 'active') THEN total_amount ELSE 0 END), 0) as total_amount_approved
      FROM cash_advances 
      WHERE is_deleted = 0 
      AND status IN ('submitted', 'approved', 'active', 'rejected')
    `;

    const statsResult = await query(statsSql);
    const stats = statsResult[0];

    return Response.json({ 
      success: true, 
      data: cashAdvances,
      stats: {
        totalCA: stats.total_ca,
        approvedCA: stats.approved_ca,
        pendingCA: stats.pending_ca,
        rejectedCA: stats.rejected_ca,
        totalAmountAll: parseFloat(stats.total_amount_all),
        totalAmountPending: parseFloat(stats.total_amount_pending),
        totalAmountApproved: parseFloat(stats.total_amount_approved)
      }
    });

  } catch (error) {
    console.error('GET CA approval error:', error);
    return Response.json({ error: 'Gagal memuat data approval' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { ca_code, action, notes } = body;

    if (!ca_code || !action) {
      return Response.json({ error: 'CA code dan action harus diisi' }, { status: 400 });
    }

    // Check if CA exists and is pending
    const caCheck = await query(
      `SELECT status FROM cash_advances WHERE ca_code = ? AND is_deleted = 0`,
      [ca_code]
    );

    if (caCheck.length === 0) {
      return Response.json({ error: 'Cash Advance tidak ditemukan' }, { status: 404 });
    }

    if (caCheck[0].status !== 'submitted') {
      return Response.json({ error: 'Cash Advance sudah diproses' }, { status: 400 });
    }

    if (action === 'approve') {
      await query(
        `UPDATE cash_advances 
         SET status = 'approved',
             approved_by_spv = ?,
             approved_date_spv = CURDATE(),
             updated_at = NOW(),
             updated_by = ?
         WHERE ca_code = ?`,
        [decoded.name, decoded.user_code, ca_code]
      );
    } else if (action === 'reject') {
      if (!notes) {
        return Response.json({ error: 'Alasan penolakan harus diisi' }, { status: 400 });
      }
      await query(
        `UPDATE cash_advances 
         SET status = 'rejected',
             approved_by_spv = ?,
             approved_date_spv = CURDATE(),
             rejection_reason = ?,
             updated_at = NOW(),
             updated_by = ?
         WHERE ca_code = ?`,
        [decoded.name, notes, decoded.user_code, ca_code]
      );
    } else {
      return Response.json({ error: 'Action tidak valid' }, { status: 400 });
    }

    return Response.json({ 
      success: true, 
      message: `Cash Advance berhasil di${action === 'approve' ? 'setujui' : 'tolak'}` 
    });

  } catch (error) {
    console.error('PATCH CA approval error:', error);
    return Response.json({ error: 'Gagal memproses approval' }, { status: 500 });
  }
}

// New endpoint to get CA details
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { ca_code } = body;

    if (!ca_code) {
      return Response.json({ error: 'CA code harus diisi' }, { status: 400 });
    }

    // Get detailed CA information - sesuaikan dengan kolom yang ada
    const caDetails = await query(
      `SELECT 
        ca_code,
        employee_name,
        department,
        purpose,
        total_amount,
        used_amount,
        remaining_amount,
        status,
        request_date,
        project_code,
        approved_by_spv,
        approved_by_finance,
        approved_date_spv,
        rejection_reason,
        created_by,
        updated_by,
        updated_at,
        created_at,
        submitted_date,
        submitted_time,
        DATEDIFF(CURDATE(), created_at) as days_waiting
      FROM cash_advances 
      WHERE ca_code = ? AND is_deleted = 0`,
      [ca_code]
    );

    if (caDetails.length === 0) {
      return Response.json({ error: 'Cash Advance tidak ditemukan' }, { status: 404 });
    }

    // Get CA transactions if exists
    const caTransactions = await query(
      `SELECT 
        transaction_code,
        ca_code,
        transaction_date,
        description,
        category,
        amount,
        receipt_filename,
        receipt_path
      FROM ca_transactions 
      WHERE ca_code = ? AND is_deleted = 0
      ORDER BY transaction_date`,
      [ca_code]
    );

    const caData = {
      ...caDetails[0],
      transactions: caTransactions
    };

    return Response.json({ 
      success: true, 
      data: caData
    });

  } catch (error) {
    console.error('GET CA details error:', error);
    return Response.json({ error: 'Gagal memuat detail Cash Advance' }, { status: 500 });
  }
}