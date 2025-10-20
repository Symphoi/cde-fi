import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Helper functions
async function saveFile(file, category) {
  if (!file) return null;
  
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop();
  const filename = `${category}_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
  
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'reimbursements');
  await mkdir(uploadDir, { recursive: true });
  
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);

  return `/uploads/reimbursements/${filename}`;
}

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return Response.json(
        { success: false, error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return Response.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const reimbursement_code = searchParams.get('reimbursement_code');

    // Jika ada reimbursement_code, return DETAIL
    if (reimbursement_code) {
      // Get reimbursement detail
      const reimbursement = await query(
        `SELECT * FROM reimbursements WHERE reimbursement_code = ? AND is_deleted = 0`,
        [reimbursement_code]
      );

      if (reimbursement.length === 0) {
        return Response.json(
          { success: false, error: 'Reimbursement not found' },
          { status: 404 }
        );
      }

      // Get reimbursement items
      const items = await query(
        `SELECT * FROM reimbursement_items 
         WHERE reimbursement_code = ? AND is_deleted = 0 
         ORDER BY item_date DESC`,
        [reimbursement_code]
      );

      // Get bank accounts for dropdown
      const bankAccounts = await query(
        `SELECT account_code as bank_account_code, bank_name, account_number, account_holder
         FROM bank_accounts 
         WHERE is_deleted = 0 AND is_active = 1
         ORDER BY bank_name`
      );

      const reimbursementDetail = {
        ...reimbursement[0],
        items: items,
        bank_accounts: bankAccounts
      };

      return Response.json({
        success: true,
        data: reimbursementDetail
      });
    }

    // Jika tidak ada reimbursement_code, return LIST
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;

    const offset = (page - 1) * limit;

    let whereClause = 'WHERE r.is_deleted = 0';
    let params = [];

    // Filter by status
    if (status && status !== 'all') {
      whereClause += ' AND r.status = ?';
      params.push(status);
    }

    // Search filter
    if (search) {
      whereClause += ' AND (r.reimbursement_code LIKE ? OR r.title LIKE ? OR r.submitted_by_user_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Advanced filters
    if (searchParams.get('min_amount')) {
      whereClause += ' AND r.total_amount >= ?';
      params.push(parseFloat(searchParams.get('min_amount')));
    }

    if (searchParams.get('max_amount')) {
      whereClause += ' AND r.total_amount <= ?';
      params.push(parseFloat(searchParams.get('max_amount')));
    }

    if (searchParams.get('category')) {
      whereClause += ' AND r.category_code = ?';
      params.push(searchParams.get('category'));
    }

    if (searchParams.get('start_date')) {
      whereClause += ' AND r.submitted_date >= ?';
      params.push(searchParams.get('start_date'));
    }

    if (searchParams.get('end_date')) {
      whereClause += ' AND r.submitted_date <= ?';
      params.push(searchParams.get('end_date'));
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM reimbursements r
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get reimbursements for approval
    const reimbursementsQuery = `
      SELECT 
        r.id,
        r.reimbursement_code,
        r.title,
        r.notes,
        r.submitted_by_user_name,
        r.created_by_user_code,
        r.created_by_user_name,
        r.category_code,
        r.project_code,
        r.total_amount,
        r.status,
        r.payment_proof_path,
        r.submitted_date,
        r.submitted_time,
        r.approved_by_user_code,
        r.approved_by_user_name,
        r.approved_date,
        r.bank_account_code,
        r.rejection_reason,
        r.created_at,
        COUNT(ri.id) as items_count,
        DATEDIFF(CURDATE(), r.submitted_date) as days_waiting
      FROM reimbursements r
      LEFT JOIN reimbursement_items ri ON r.reimbursement_code = ri.reimbursement_code AND ri.is_deleted = 0
      ${whereClause}
      GROUP BY r.id
      ORDER BY 
        CASE 
          WHEN r.status = 'submitted' THEN 1
          WHEN r.status = 'approved' THEN 2
          ELSE 3
        END,
        r.submitted_date ASC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limit, offset];
    const reimbursements = await query(reimbursementsQuery, queryParams);

    return Response.json({
      success: true,
      data: reimbursements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('GET approval reimbursements error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Approve or reject reimbursement
export async function PATCH(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return Response.json(
        { success: false, error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return Response.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const dataField = formData.get('data');
    
    if (!dataField) {
      return Response.json(
        { success: false, error: 'Missing data field' },
        { status: 400 }
      );
    }

    const { reimbursement_code, status, rejection_reason, bank_account_code } = JSON.parse(dataField);

    if (!reimbursement_code || !status) {
      return Response.json(
        { success: false, error: 'Reimbursement code and status are required' },
        { status: 400 }
      );
    }

    // Check if reimbursement exists
    const reimbursementCheck = await query(
      'SELECT * FROM reimbursements WHERE reimbursement_code = ? AND is_deleted = 0',
      [reimbursement_code]
    );

    if (reimbursementCheck.length === 0) {
      return Response.json(
        { success: false, error: 'Reimbursement not found' },
        { status: 404 }
      );
    }

    // Handle payment proof file upload
    const paymentProofFile = formData.get('payment_proof');
    let paymentProofPath = null;
    if (paymentProofFile && paymentProofFile.size > 0) {
      paymentProofPath = await saveFile(paymentProofFile, 'payment_proof');
    }

    // Update reimbursement
    if (status === 'approved') {
      if (!bank_account_code) {
        return Response.json(
          { success: false, error: 'Bank account is required for approval' },
          { status: 400 }
        );
      }

      await query(
        `UPDATE reimbursements 
         SET status = 'approved', 
             approved_by_user_code = ?,
             approved_by_user_name = ?,
             approved_date = NOW(),
             bank_account_code = ?,
             payment_proof_path = ?,
             rejection_reason = NULL
         WHERE reimbursement_code = ?`,
        [decoded.user_code, decoded.name, bank_account_code, paymentProofPath, reimbursement_code]
      );
    } else if (status === 'rejected') {
      if (!rejection_reason) {
        return Response.json(
          { success: false, error: 'Rejection reason is required' },
          { status: 400 }
        );
      }
      await query(
        `UPDATE reimbursements 
         SET status = 'rejected', 
             approved_by_user_code = ?,
             approved_by_user_name = ?,
             approved_date = NOW(),
             rejection_reason = ?,
             bank_account_code = NULL,
             payment_proof_path = NULL
         WHERE reimbursement_code = ?`,
        [decoded.user_code, decoded.name, rejection_reason, reimbursement_code]
      );
    } else {
      return Response.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: `Reimbursement ${status} successfully`
    });

  } catch (error) {
    console.error('PATCH approval error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}