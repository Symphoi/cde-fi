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

    // Get pending cash advances for approval
    let sql = `
      SELECT 
        ca_code,
        employee_name,
        department,
        purpose,
        total_amount,
        request_date,
        project_code,
        created_at,
        submitted_date,
        submitted_time,
        DATEDIFF(CURDATE(), created_at) as days_waiting
      FROM cash_advances 
      WHERE is_deleted = 0 
      AND status = 'submitted'
    `;
    
    const params = [];

    if (search) {
      sql += ` AND (ca_code LIKE ? OR employee_name LIKE ? OR purpose LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ` ORDER BY created_at DESC`;

    const pendingCA = await query(sql, params);

    // Calculate stats
    const stats = {
      pending: pendingCA.length,
      totalAmount: pendingCA.reduce((sum, ca) => sum + parseFloat(ca.total_amount), 0)
    };

    return Response.json({ 
      success: true, 
      data: pendingCA,
      stats: stats
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
         SET status = 'active',
             approved_by_spv = ?,
             approved_date_spv = NOW(),
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
             approved_date_spv = NOW(),
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