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
        approved_by,
        approved_date,
        rejection_reason,
        created_at,
        submitted_date,
        submitted_time,
        DATEDIFF(CURDATE(), created_at) as days_waiting
      FROM cash_advances 
      WHERE is_deleted = 0 
      AND status != 'draft'
    `;
    
    const params = [];

    // Filter status lengkap
    if (status !== 'all') {
      if (status === 'submitted') {
        sql += ` AND status = 'submitted'`;
      } else if (status === 'active') {
        sql += ` AND status = 'active'`;
      } else if (status === 'partially_used') {
        sql += ` AND status = 'partially_used'`;
      } else if (status === 'fully_used') {
        sql += ` AND status = 'fully_used'`;
      } else if (status === 'in_settlement') {
        sql += ` AND status = 'in_settlement'`;
      } else if (status === 'completed') {
        sql += ` AND status = 'completed'`;
      } else if (status === 'rejected') {
        sql += ` AND status = 'rejected'`;
      }
    }

    if (search) {
      sql += ` AND (ca_code LIKE ? OR employee_name LIKE ? OR purpose LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ` ORDER BY 
      CASE 
        WHEN status = 'submitted' THEN 1
        WHEN status = 'active' THEN 2
        WHEN status = 'partially_used' THEN 3
        WHEN status = 'fully_used' THEN 4
        WHEN status = 'in_settlement' THEN 5
        WHEN status = 'completed' THEN 6
        WHEN status = 'rejected' THEN 7
      END, created_at DESC`;

    const cashAdvances = await query(sql, params);

    // Stats lengkap
    const statsSql = `
      SELECT 
        COUNT(*) as total_ca,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted_ca,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_ca,
        SUM(CASE WHEN status = 'partially_used' THEN 1 ELSE 0 END) as partially_used_ca,
        SUM(CASE WHEN status = 'fully_used' THEN 1 ELSE 0 END) as fully_used_ca,
        SUM(CASE WHEN status = 'in_settlement' THEN 1 ELSE 0 END) as in_settlement_ca,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_ca,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_ca,
        COALESCE(SUM(total_amount), 0) as total_amount_all,
        COALESCE(SUM(CASE WHEN status = 'submitted' THEN total_amount ELSE 0 END), 0) as total_amount_submitted,
        COALESCE(SUM(CASE WHEN status = 'active' THEN total_amount ELSE 0 END), 0) as total_amount_active,
        COALESCE(SUM(CASE WHEN status = 'partially_used' THEN total_amount ELSE 0 END), 0) as total_amount_partially_used,
        COALESCE(SUM(CASE WHEN status = 'fully_used' THEN total_amount ELSE 0 END), 0) as total_amount_fully_used
      FROM cash_advances 
      WHERE is_deleted = 0 AND status != 'draft'
    `;

    const statsResult = await query(statsSql);
    const stats = statsResult[0] || {};

    return Response.json({ 
      success: true, 
      data: cashAdvances || [],
      stats: {
        totalCA: parseInt(stats.total_ca) || 0,
        submittedCA: parseInt(stats.submitted_ca) || 0,
        activeCA: parseInt(stats.active_ca) || 0,
        partiallyUsedCA: parseInt(stats.partially_used_ca) || 0,
        fullyUsedCA: parseInt(stats.fully_used_ca) || 0,
        inSettlementCA: parseInt(stats.in_settlement_ca) || 0,
        completedCA: parseInt(stats.completed_ca) || 0,
        rejectedCA: parseInt(stats.rejected_ca) || 0,
        totalAmountAll: parseFloat(stats.total_amount_all) || 0,
        totalAmountSubmitted: parseFloat(stats.total_amount_submitted) || 0,
        totalAmountActive: parseFloat(stats.total_amount_active) || 0,
        totalAmountPartiallyUsed: parseFloat(stats.total_amount_partially_used) || 0,
        totalAmountFullyUsed: parseFloat(stats.total_amount_fully_used) || 0
      }
    });

  } catch (error) {
    console.error('GET CA approval error:', error);
    return Response.json({ 
      success: false,
      error: 'Gagal memuat data approval' 
    }, { status: 500 });
  }
}

export async function PATCH(request) {
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

    const body = await request.json();
    const { ca_code, action, notes } = body;

    if (!ca_code || !action) {
      return Response.json({ 
        success: false,
        error: 'CA code dan action harus diisi' 
      }, { status: 400 });
    }

    // Check if CA exists
    const caCheck = await query(
      `SELECT status FROM cash_advances WHERE ca_code = ? AND is_deleted = 0`,
      [ca_code]
    );

    if (caCheck.length === 0) {
      return Response.json({ 
        success: false,
        error: 'Cash Advance tidak ditemukan' 
      }, { status: 404 });
    }

    const currentStatus = caCheck[0].status;

    if (action === 'approve') {
      // ✅ 1 LEVEL APPROVAL: submitted → active
      if (currentStatus !== 'submitted') {
        return Response.json({ 
          success: false,
          error: 'Hanya CA dengan status submitted yang bisa disetujui' 
        }, { status: 400 });
      }
      
      await query(
        `UPDATE cash_advances 
         SET status = 'active',
             approved_by = ?,
             approved_date = CURDATE(),
             updated_at = NOW(),
             updated_by = ?
         WHERE ca_code = ?`,
        [decoded.name, decoded.user_code, ca_code]
      );
      
      return Response.json({ 
        success: true, 
        message: 'Cash Advance berhasil disetujui dan diaktifkan',
        new_status: 'active'
      });
      
    } else if (action === 'reject') {
      // Reject hanya dari submitted
      if (currentStatus !== 'submitted') {
        return Response.json({ 
          success: false,
          error: 'Hanya CA dengan status submitted yang bisa ditolak' 
        }, { status: 400 });
      }
      
      if (!notes) {
        return Response.json({ 
          success: false,
          error: 'Alasan penolakan harus diisi' 
        }, { status: 400 });
      }
      
      await query(
        `UPDATE cash_advances 
         SET status = 'rejected',
             approved_by = ?,
             approved_date = CURDATE(),
             rejection_reason = ?,
             updated_at = NOW(),
             updated_by = ?
         WHERE ca_code = ?`,
        [decoded.name, notes, decoded.user_code, ca_code]
      );
      
      return Response.json({ 
        success: true, 
        message: 'Cash Advance ditolak',
        new_status: 'rejected'
      });
    } else {
      return Response.json({ 
        success: false,
        error: 'Action tidak valid' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('PATCH CA approval error:', error);
    return Response.json({ 
      success: false,
      error: 'Gagal memproses approval' 
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

    const body = await request.json();
    const { ca_code } = body;

    if (!ca_code) {
      return Response.json({ 
        success: false,
        error: 'CA code harus diisi' 
      }, { status: 400 });
    }

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
        approved_by,
        approved_date,
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
      return Response.json({ 
        success: false,
        error: 'Cash Advance tidak ditemukan' 
      }, { status: 404 });
    }

    // Get CA transactions
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
      transactions: caTransactions || []
    };

    return Response.json({ 
      success: true, 
      data: caData
    });

  } catch (error) {
    console.error('GET CA details error:', error);
    return Response.json({ 
      success: false,
      error: 'Gagal memuat detail Cash Advance' 
    }, { status: 500 });
  }
}