import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';
import { writeFile, mkdir, readFile, access } from 'fs/promises';
import path from 'path';
import fs from 'fs';

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

async function generateReimbursementCode() {
  const countResult = await query(
    'SELECT COUNT(*) as count FROM reimbursements WHERE YEAR(created_at) = YEAR(CURDATE())'
  );
  return `REIM-${new Date().getFullYear()}-${String(countResult[0].count + 1).padStart(4, '0')}`;
}

async function generateItemCode() {
  const countResult = await query(
    'SELECT COUNT(*) as count FROM reimbursement_items WHERE YEAR(created_at) = YEAR(CURDATE())'
  );
  return `REIM-ITEM-${new Date().getFullYear()}-${String(countResult[0].count + 1).padStart(4, '0')}`;
}

// Handle file download - NO TOKEN REQUIRED
async function handleDownloadAttachment(filename, reimbursement_code, action = 'download') {
  try {
    // Verify reimbursement exists (basic security)
    const accessCheck = await query(
      `SELECT r.reimbursement_code 
       FROM reimbursements r
       WHERE r.reimbursement_code = ? AND r.is_deleted = 0`,
      [reimbursement_code]
    );

    if (accessCheck.length === 0) {
      return Response.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Fixed path
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'reimbursements', filename);
    
    // Check if file exists
    try {
      await access(filePath);
    } catch {
      return Response.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    // Baca file
    const fileBuffer = await readFile(filePath);
    const fileExtension = path.extname(filename).toLowerCase();
    
    // Tentukan content type berdasarkan extension
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    
    const contentType = contentTypes[fileExtension] || 'application/octet-stream';

    // Tentukan header berdasarkan action (download atau preview)
    const contentDisposition = action === 'preview' && ['.pdf', '.jpg', '.jpeg', '.png'].includes(fileExtension) 
      ? `inline; filename="${filename}"`
      : `attachment; filename="${filename}"`;

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-cache'
      },
    });

  } catch (error) {
    console.error('Download file error:', error);
    return Response.json(
      { success: false, error: 'Error downloading file' },
      { status: 500 }
    );
  }
}

// GET - Handle semua: list, detail, dropdown data, dan download
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const reimbursement_code = searchParams.get('reimbursement_code');
    const download = searchParams.get('download');
    const filename = searchParams.get('filename');
    
    // Handle file download/preview - NO TOKEN REQUIRED
    if (download === 'attachment' && filename && reimbursement_code) {
      const downloadAction = searchParams.get('preview') === 'true' ? 'preview' : 'download';
      return await handleDownloadAttachment(filename, reimbursement_code, downloadAction);
    }
    
    // Untuk endpoint lainnya, tetap butuh token
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return Response.json({ success: false, error: 'Authorization token required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
    }
    
    // Jika ada reimbursement_code, return detail
    if (reimbursement_code) {
      return await handleGetReimbursementDetail(reimbursement_code, decoded);
    }

    // Jika action = dropdowns, return data dropdown
    if (action === 'dropdowns') {
      return await handleGetDropdowns(decoded);
    }

    // Default: get all reimbursements
    return await handleGetReimbursements(request, decoded);

  } catch (error) {
    console.error('GET reimbursements error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET all reimbursements
async function handleGetReimbursements(request, decoded) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search') || '';
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '10';

  const offset = (parseInt(page) - 1) * parseInt(limit);

  let whereClause = 'WHERE r.is_deleted = 0';
  let params = [];

  if (status && status !== 'all') {
    whereClause += ' AND r.status = ?';
    params.push(status);
  }

  if (search) {
    whereClause += ' AND (r.reimbursement_code LIKE ? OR r.title LIKE ? OR r.submitted_by_user_name LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM reimbursements r
    ${whereClause}
  `;
  const countResult = await query(countQuery, params);
  const total = countResult[0]?.total || 0;

  // Get reimbursements
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
      COUNT(ri.id) as items_count
    FROM reimbursements r
    LEFT JOIN reimbursement_items ri ON r.reimbursement_code = ri.reimbursement_code AND ri.is_deleted = 0
    ${whereClause}
    GROUP BY r.id
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `;

  params.push(parseInt(limit), offset);
  const reimbursements = await query(reimbursementsQuery, params);

  return Response.json({
    success: true,
    data: reimbursements,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
}

// Handle GET reimbursement detail
async function handleGetReimbursementDetail(reimbursement_code, decoded) {
  // Get reimbursement
  const reimbursement = await query(
    `SELECT * FROM reimbursements WHERE reimbursement_code = ? AND is_deleted = 0`,
    [reimbursement_code]
  );

  if (reimbursement.length === 0) {
    return Response.json({ success: false, error: 'Reimbursement not found' }, { status: 404 });
  }

  // Get reimbursement items
  const items = await query(
    `SELECT * FROM reimbursement_items 
     WHERE reimbursement_code = ? AND is_deleted = 0 
     ORDER BY item_date DESC`,
    [reimbursement_code]
  );

  const reimbursementDetail = {
    ...reimbursement[0],
    items: items
  };

  return Response.json({
    success: true,
    data: reimbursementDetail
  });
}

// Handle GET dropdown data
async function handleGetDropdowns(decoded) {
  try {
    // Get categories dari reimbursement_categories
    const categories = await query(
      `SELECT category_code, name as category_name 
       FROM reimbursement_categories 
       WHERE is_deleted = 0 AND is_active = 1
       ORDER BY name`
    );

    // Get bank accounts dari bank_accounts (gunakan account_code)
    const bankAccounts = await query(
      `SELECT account_code as bank_account_code, bank_name, account_number, account_holder
       FROM bank_accounts 
       WHERE is_deleted = 0 AND is_active = 1
       ORDER BY bank_name`
    );

    // Get projects dari projects
    const projects = await query(
      `SELECT project_code, name as project_name
       FROM projects 
       WHERE is_deleted = 0 AND status = 'active'
       ORDER BY name`
    );

    return Response.json({
      success: true,
      data: {
        categories: categories || [],
        bankAccounts: bankAccounts || [],
        projects: projects || []
      }
    });

  } catch (error) {
    console.error('Error fetching dropdowns:', error);
    return Response.json(
      { success: false, error: 'Error fetching dropdown data' },
      { status: 500 }
    );
  }
}

// POST - Create reimbursement
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return Response.json({ success: false, error: 'Authorization token required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
    }

    const formData = await request.formData();
    const dataField = formData.get('data');
    
    if (!dataField) {
      return Response.json({ success: false, error: 'Missing data field' }, { status: 400 });
    }

    const reimbursementData = JSON.parse(dataField);
    const {
      title,
      notes,
      submitted_by_user_name,
      category_code,
      project_code,
      items
    } = reimbursementData;

    // Validation
    if (!title || !submitted_by_user_name || !category_code) {
      return Response.json(
        { success: false, error: 'Title, nama pengaju, dan kategori are required' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json(
        { success: false, error: 'At least one reimbursement item is required' },
        { status: 400 }
      );
    }

    // Validate items
    for (let item of items) {
      if (!item.item_date || !item.description || !item.amount) {
        return Response.json(
          { success: false, error: 'All item fields (date, description, amount) are required' },
          { status: 400 }
        );
      }
    }

    // Generate reimbursement code
    const reimbursement_code = await generateReimbursementCode();

    // Calculate total amount
    const total_amount = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    // Insert reimbursement
    await query(
      `INSERT INTO reimbursements 
       (reimbursement_code, title, notes, submitted_by_user_name, 
        created_by_user_code, created_by_user_name, category_code, project_code, 
        total_amount, submitted_date, submitted_time) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), TIME(NOW()))`,
      [
        reimbursement_code,
        title,
        notes,
        submitted_by_user_name,
        decoded.user_code,
        decoded.name,
        category_code,
        project_code,
        total_amount
      ]
    );

    // Insert reimbursement items
    for (let item of items) {
      const item_code = await generateItemCode();
      
      // Handle item attachment file upload
      const attachmentFile = formData.get(`attachment_${item.temp_id}`);
      let attachmentPath = null;
      if (attachmentFile && attachmentFile.size > 0) {
        attachmentPath = await saveFile(attachmentFile, 'item_attachment');
      }

      await query(
        `INSERT INTO reimbursement_items 
         (item_code, reimbursement_code, item_date, description, amount, attachment_path) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          item_code,
          reimbursement_code,
          item.item_date,
          item.description,
          item.amount,
          attachmentPath
        ]
      );
    }

    return Response.json({
      success: true,
      message: 'Reimbursement created successfully',
      reimbursement_code: reimbursement_code,
      total_amount: total_amount,
      items_count: items.length
    });

  } catch (error) {
    console.error('POST reimbursement error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update reimbursement status (approve/reject)
export async function PATCH(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return Response.json({ success: false, error: 'Authorization token required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
    }

    const formData = await request.formData();
    const dataField = formData.get('data');
    
    if (!dataField) {
      return Response.json({ success: false, error: 'Missing data field' }, { status: 400 });
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
      return Response.json({ success: false, error: 'Reimbursement not found' }, { status: 404 });
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
    console.error('PATCH reimbursement error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete reimbursement
export async function DELETE(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return Response.json({ success: false, error: 'Authorization token required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
    }

    const { reimbursement_code } = await request.json();

    if (!reimbursement_code) {
      return Response.json(
        { success: false, error: 'Reimbursement code is required' },
        { status: 400 }
      );
    }

    // Check if reimbursement exists
    const reimbursementCheck = await query(
      'SELECT * FROM reimbursements WHERE reimbursement_code = ? AND is_deleted = 0',
      [reimbursement_code]
    );

    if (reimbursementCheck.length === 0) {
      return Response.json({ success: false, error: 'Reimbursement not found' }, { status: 404 });
    }

    // Soft delete reimbursement
    await query(
      'UPDATE reimbursements SET is_deleted = 1 WHERE reimbursement_code = ?',
      [reimbursement_code]
    );

    // Soft delete related items
    await query(
      'UPDATE reimbursement_items SET is_deleted = 1 WHERE reimbursement_code = ?',
      [reimbursement_code]
    );

    return Response.json({
      success: true,
      message: 'Reimbursement deleted successfully'
    });

  } catch (error) {
    console.error('DELETE reimbursement error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}