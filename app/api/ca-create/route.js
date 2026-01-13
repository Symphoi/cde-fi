import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const ca_code = searchParams.get('ca_code');

    if (ca_code) {
      const sql = `
        SELECT ca.ca_code, ca.employee_name, ca.purpose, ca.total_amount, 
               ca.used_amount, ca.remaining_amount, ca.status, ca.request_date, 
               ca.project_code,
               p.name as project_name,
               ca.approved_by, ca.approved_date,
               ca.created_at,
               u.name as created_by
        FROM cash_advances ca
        LEFT JOIN users u ON ca.created_by = u.user_code
        LEFT JOIN projects p ON ca.project_code = p.project_code
        WHERE ca.ca_code = ? AND ca.created_by = ? AND ca.is_deleted = 0
      `;
      
      const result = await query(sql, [ca_code, decoded.user_code]);
      
      if (result.length === 0) {
        return Response.json({ error: 'Cash Advance tidak ditemukan' }, { status: 404 });
      }

      const transactionsSql = `
        SELECT id, transaction_date, description, amount, category, created_at
        FROM ca_transactions 
        WHERE ca_code = ? AND is_deleted = 0
        ORDER BY transaction_date DESC
      `;
      const transactions = await query(transactionsSql, [ca_code]);

      return Response.json({
        success: true,
        data: {
          ...result[0],
          transactions: transactions || []
        }
      });
    }

    if (action === 'dropdowns') {
      const projects = await query(
        "SELECT project_code, name FROM projects WHERE is_deleted = 0 AND status = 'active' ORDER BY name"
      );

      return Response.json({
        success: true,
        data: { 
          projects: projects || []
        }
      });
    }

    let sql = `
      SELECT ca.ca_code, ca.employee_name, ca.purpose, ca.total_amount, 
             ca.used_amount, ca.remaining_amount, ca.status, ca.request_date, 
             ca.project_code,
             p.name as project_name
      FROM cash_advances ca
      LEFT JOIN projects p ON ca.project_code = p.project_code
      WHERE ca.created_by = ? AND ca.is_deleted = 0
    `;
    const params = [decoded.user_code];

    // Filter status lengkap untuk user
    if (status !== 'all') {
      if (status === 'draft') {
        sql += ' AND ca.status = ?';
        params.push('draft');
      } else if (status === 'submitted') {
        sql += ' AND ca.status = ?';
        params.push('submitted');
      } else if (status === 'active') {
        sql += ' AND ca.status = ?';
        params.push('active');
      } else if (status === 'partially_used') {
        sql += ' AND ca.status = ?';
        params.push('partially_used');
      } else if (status === 'fully_used') {
        sql += ' AND ca.status = ?';
        params.push('fully_used');
      } else if (status === 'in_settlement') {
        sql += ' AND ca.status = ?';
        params.push('in_settlement');
      } else if (status === 'completed') {
        sql += ' AND ca.status = ?';
        params.push('completed');
      } else if (status === 'rejected') {
        sql += ' AND ca.status = ?';
        params.push('rejected');
      }
    }

    if (search) {
      sql += ' AND (ca.ca_code LIKE ? OR ca.purpose LIKE ? OR ca.employee_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY ca.created_at DESC';

    const cashAdvances = await query(sql, params);

    // ✅ PERBAIKAN STATS: Hapus status 'approved', tambah logic yang benar
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'partially_used' THEN 1 ELSE 0 END) as partially_used,
        SUM(CASE WHEN status = 'fully_used' THEN 1 ELSE 0 END) as fully_used,
        SUM(CASE WHEN status = 'in_settlement' THEN 1 ELSE 0 END) as in_settlement,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'draft' THEN total_amount ELSE 0 END), 0) as total_amount_draft,
        COALESCE(SUM(CASE WHEN status = 'submitted' THEN total_amount ELSE 0 END), 0) as total_amount_submitted,
        COALESCE(SUM(CASE WHEN status IN ('active', 'partially_used', 'fully_used') THEN total_amount ELSE 0 END), 0) as total_amount_active,
        COALESCE(SUM(CASE WHEN status IN ('active', 'partially_used', 'fully_used') THEN used_amount ELSE 0 END), 0) as total_used_amount,
        COALESCE(SUM(CASE WHEN status IN ('active', 'partially_used', 'fully_used') THEN remaining_amount ELSE 0 END), 0) as total_remaining_amount,
        COALESCE(SUM(CASE WHEN status = 'in_settlement' THEN total_amount ELSE 0 END), 0) as total_amount_in_settlement,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) as total_amount_completed,
        COALESCE(SUM(CASE WHEN status = 'rejected' THEN total_amount ELSE 0 END), 0) as total_amount_rejected
      FROM cash_advances 
      WHERE created_by = ? AND is_deleted = 0
    `, [decoded.user_code]);

    const stats = statsResult[0] || { 
      draft: 0, submitted: 0, active: 0, 
      partially_used: 0, fully_used: 0, in_settlement: 0, 
      completed: 0, rejected: 0, total_amount: 0,
      total_amount_draft: 0, total_amount_submitted: 0,
      total_amount_active: 0, total_used_amount: 0, total_remaining_amount: 0,
      total_amount_in_settlement: 0, total_amount_completed: 0, total_amount_rejected: 0
    };

    return Response.json({
      success: true,
      data: cashAdvances || [],
      stats: {
        draft: parseInt(stats.draft) || 0,
        submitted: parseInt(stats.submitted) || 0,
        active: parseInt(stats.active) || 0,
        partiallyUsed: parseInt(stats.partially_used) || 0,
        fullyUsed: parseInt(stats.fully_used) || 0,
        inSettlement: parseInt(stats.in_settlement) || 0,
        completed: parseInt(stats.completed) || 0,
        rejected: parseInt(stats.rejected) || 0,
        totalAmount: parseFloat(stats.total_amount) || 0,
        totalAmountDraft: parseFloat(stats.total_amount_draft) || 0,
        totalAmountSubmitted: parseFloat(stats.total_amount_submitted) || 0,
        totalAmountActive: parseFloat(stats.total_amount_active) || 0,
        totalUsedAmount: parseFloat(stats.total_used_amount) || 0,
        totalRemainingAmount: parseFloat(stats.total_remaining_amount) || 0,
        totalAmountInSettlement: parseFloat(stats.total_amount_in_settlement) || 0,
        totalAmountCompleted: parseFloat(stats.total_amount_completed) || 0,
        totalAmountRejected: parseFloat(stats.total_amount_rejected) || 0
      },
      currentUser: {
        name: decoded.name
      }
    });

  } catch (error) {
    console.error('GET CA create error:', error);
    return Response.json({ error: 'Gagal memuat data' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { purpose, total_amount, request_date, project_code, employee_name } = body;

    if (!purpose || !total_amount || !request_date || !employee_name) {
      return Response.json({ error: 'Purpose, amount, request date, dan nama karyawan harus diisi' }, { status: 400 });
    }

    if (total_amount <= 0) {
      return Response.json({ error: 'Amount harus lebih dari 0' }, { status: 400 });
    }

    const countResult = await query(
      'SELECT COUNT(*) as count FROM cash_advances WHERE YEAR(created_at) = YEAR(CURDATE())'
    );
    const ca_code = `CA-${new Date().getFullYear()}-${String(countResult[0].count + 1).padStart(4, '0')}`;

    const sql = `
      INSERT INTO cash_advances 
      (ca_code, employee_name, department, purpose, total_amount, remaining_amount, request_date, project_code, created_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')
    `;

    await query(sql, [
      ca_code,
      employee_name.trim(),
      '-',
      purpose,
      total_amount,
      total_amount,
      request_date,
      project_code || null,
      decoded.user_code
    ]);

    return Response.json({ 
      success: true, 
      message: 'Cash Advance berhasil dibuat',
      ca_code: ca_code 
    });

  } catch (error) {
    console.error('POST CA create error:', error);
    return Response.json({ error: 'Gagal membuat Cash Advance' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { ca_code, action } = body;

    if (!ca_code || !action) {
      return Response.json({ error: 'CA code dan action harus diisi' }, { status: 400 });
    }

    if (action === 'submit') {
      await query(
        'UPDATE cash_advances SET status = ? WHERE ca_code = ? AND created_by = ? AND status = ?',
        ['submitted', ca_code, decoded.user_code, 'draft']
      );

      const result = await query('SELECT ROW_COUNT() as affectedRows');
      
      if (result[0].affectedRows === 0) {
        return Response.json({ error: 'Cash Advance tidak ditemukan atau sudah disubmit' }, { status: 400 });
      }

      return Response.json({ 
        success: true, 
        message: 'Cash Advance berhasil disubmit'
      });
    }

    return Response.json({ error: 'Action tidak valid' }, { status: 400 });

  } catch (error) {
    console.error('PATCH CA create error:', error);
    return Response.json({ error: 'Gagal update Cash Advance' }, { status: 500 });
  }
}