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

    // ✅ HANDLE SINGLE CA DETAIL
    if (ca_code) {
      const sql = `
        SELECT ca_code, employee_name, department, purpose, total_amount, 
               used_amount, remaining_amount, status, request_date, project_code,
               approved_by_spv, approved_by_finance, approved_date_spv, approved_date_finance,
               created_by, created_at
        FROM cash_advances 
        WHERE ca_code = ? AND created_by = ? AND is_deleted = 0
      `;
      
      const result = await query(sql, [ca_code, decoded.user_code]);
      
      if (result.length === 0) {
        return Response.json({ error: 'Cash Advance tidak ditemukan' }, { status: 404 });
      }

      // ✅ GET TRANSACTIONS FOR THIS CA
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

    // Handle dropdown data untuk form create
    if (action === 'dropdowns') {
      const projects = await query(
        "SELECT project_code, name FROM projects WHERE is_deleted = 0 AND status = 'active' ORDER BY name"
      );
      
      const departments = await query(
        "SELECT DISTINCT department FROM users WHERE is_deleted = 0 AND status = 'active' ORDER BY department"
      );

      return Response.json({
        success: true,
        data: { 
          projects: projects || [],
          departments: departments.map(d => d.department).filter(Boolean) || [] 
        }
      });
    }

    // Handle get cash advances list
    let sql = `
      SELECT ca_code, employee_name, department, purpose, total_amount, 
             used_amount, remaining_amount, status, request_date, project_code,
             approved_by_spv, approved_by_finance, approved_date_spv, approved_date_finance
      FROM cash_advances 
      WHERE created_by = ? AND is_deleted = 0
    `;
    const params = [decoded.user_code];

    // Filter status
    if (status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    // Search
    if (search) {
      sql += ' AND (ca_code LIKE ? OR purpose LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const cashAdvances = await query(sql, params);

    // ✅ UPDATED STATS - TAMBAH COMPLETED & REJECTED
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        COALESCE(SUM(total_amount), 0) as total_amount
      FROM cash_advances 
      WHERE created_by = ? AND is_deleted = 0
    `, [decoded.user_code]);

    const stats = statsResult[0] || { 
      pending: 0, approved: 0, active: 0, completed: 0, rejected: 0, total_amount: 0 
    };

    return Response.json({
      success: true,
      data: cashAdvances || [],
      stats: {
        pending: stats.pending || 0,
        approved: stats.approved || 0,
        active: stats.active || 0,
        completed: stats.completed || 0,
        rejected: stats.rejected || 0,
        totalAmount: stats.total_amount || 0
      },
      currentUser: {
        name: decoded.name,
        department: decoded.department
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
    const { purpose, total_amount, request_date, project_code } = body;

    // Validasi
    if (!purpose || !total_amount || !request_date) {
      return Response.json({ error: 'Purpose, amount, dan request date harus diisi' }, { status: 400 });
    }

    if (total_amount <= 0) {
      return Response.json({ error: 'Amount harus lebih dari 0' }, { status: 400 });
    }

    // Validasi tanggal tidak boleh lebih dari hari ini
    const today = new Date().toISOString().split('T')[0];
    if (request_date > today) {
      return Response.json({ error: 'Tanggal request tidak boleh lebih dari hari ini' }, { status: 400 });
    }

    // Generate CA Code
    const countResult = await query(
      'SELECT COUNT(*) as count FROM cash_advances WHERE YEAR(created_at) = YEAR(CURDATE())'
    );
    const ca_code = `CA-${new Date().getFullYear()}-${String(countResult[0].count + 1).padStart(4, '0')}`;

    // Insert cash advance
    const sql = `
      INSERT INTO cash_advances 
      (ca_code, employee_name, department, purpose, total_amount, remaining_amount, request_date, project_code, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await query(sql, [
      ca_code,
      decoded.name,
      decoded.department,
      purpose,
      total_amount,
      total_amount, // remaining_amount awal sama dengan total_amount
      request_date,
      project_code,
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
      // Update status dari draft ke submitted
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