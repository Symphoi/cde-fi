import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Helper function untuk audit log
async function createAuditLog(userCode, userName, action, resourceType, resourceCode, notes) {
  try {
    const auditCode = `AUD-${Date.now()}`;
    await query(
      `INSERT INTO audit_logs (audit_code, user_code, user_name, action, resource_type, resource_code, resource_name, notes, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [auditCode, userCode, userName, action, resourceType, resourceCode, `${resourceType} ${resourceCode}`, notes]
    );
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
}

// GET all purchase orders
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE po.is_deleted = FALSE';
    let params = [];

    if (status && status !== 'all') {
      whereClause += ' AND po.status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (po.po_code LIKE ? OR po.supplier_name LIKE ? OR po.so_reference LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Get purchase orders
    const purchaseOrders = await query(
      `SELECT 
        po.po_code,
        po.so_code,
        po.so_reference,
        po.supplier_name,
        po.supplier_contact,
        po.supplier_bank,
        po.total_amount,
        po.status,
        po.notes,
        po.date,
        po.priority,
        po.days_waiting,
        po.customer_ref,
        po.approval_level,
        po.approved_by_spv,
        po.approved_by_finance,
        po.approved_date_spv,
        po.approved_date_finance,
        po.approval_notes,
        po.rejection_reason,
        po.created_at
       FROM purchase_orders po 
       ${whereClause}
       ORDER BY po.created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM purchase_orders po ${whereClause}`,
      params
    );

    // Get items for each purchase order
    for (let po of purchaseOrders) {
      const items = await query(
        `SELECT 
          po_item_code,
          product_name,
          product_code,
          quantity,
          supplier,
          purchase_price,
          notes
         FROM purchase_order_items 
         WHERE po_code = ? AND is_deleted = FALSE`,
        [po.po_code]
      );
      po.items = items;

      // Get payment info if exists
      const payments = await query(
        `SELECT 
          payment_code,
          amount,
          payment_date,
          payment_method,
          bank_name,
          account_number,
          reference_number,
          status
         FROM purchase_order_payments 
         WHERE po_code = ? AND is_deleted = FALSE`,
        [po.po_code]
      );
      po.payments = payments;

      // Get attachments
      const attachments = await query(
        `SELECT 
          payment_doc_code as id,
          name,
          type,
          filename,
          uploaded_at as upload_date
         FROM purchase_order_attachments 
         WHERE payment_code IN (SELECT payment_code FROM purchase_order_payments WHERE po_code = ?) 
         AND is_deleted = FALSE`,
        [po.po_code]
      );
      po.attachments = attachments;
    }

    return Response.json({
      success: true,
      data: purchaseOrders,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get purchase orders error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// CREATE purchase order - SUPPORT BOTH JSON AND FORM DATA
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    let poData;
    let files = [];

    // CHECK JIKA INI FORM DATA (WITH FILES)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      
      // Parse PO data dari formData
      const dataField = formData.get('data');
      if (!dataField) {
        return Response.json({ error: 'Missing data field' }, { status: 400 });
      }
      
      poData = JSON.parse(dataField);
      
      // Get all files
      const fileFields = formData.getAll('files');
      files = fileFields.filter(file => file instanceof File && file.size > 0);
      
    } else {
      // HANDLE JSON REQUEST BIASA
      poData = await request.json();
    }

    // Extract data dari poData
    const {
      so_code,
      so_reference,
      supplier_name,
      supplier_contact = null,
      supplier_bank = null,
      notes = null,
      items = [],
      priority = 'medium',
      customer_ref = null
    } = poData;

    // Validasi required fields
    if (!so_code || !supplier_name || !items || items.length === 0) {
      return Response.json(
        { error: 'SO code, supplier name, and items are required' },
        { status: 400 }
      );
    }

    // Generate PO code
    const countResult = await query('SELECT COUNT(*) as count FROM purchase_orders');
    const poCode = `PO-${new Date().getFullYear()}-${String(countResult[0].count + 1).padStart(4, '0')}`;

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (item.purchase_price * item.quantity), 0);

    // Insert purchase order
    await query(
      `INSERT INTO purchase_orders 
       (po_code, so_code, so_reference, supplier_name, supplier_contact, supplier_bank, 
        total_amount, notes, priority, customer_ref, status, submitted_by, submitted_date, submitted_time) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, CURDATE(), CURTIME())`,
      [
        poCode, so_code, so_reference, supplier_name, supplier_contact, supplier_bank,
        totalAmount, notes, priority, customer_ref, decoded.name
      ]
    );

    // Insert items
    for (let item of items) {
      const itemCode = `POI-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      await query(
        `INSERT INTO purchase_order_items 
         (po_item_code, po_code, product_name, product_code, quantity, supplier, purchase_price, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemCode, poCode, item.product_name, item.product_code, 
          item.quantity, item.supplier, item.purchase_price, item.notes || ''
        ]
      );
    }

    // ✅ AUTO-UPDATE STATUS SO: Cek apakah ini PO pertama untuk SO ini
    const existingPOs = await query(
      `SELECT COUNT(*) as po_count FROM purchase_orders WHERE so_code = ? AND is_deleted = 0`,
      [so_code]
    );

    // Jika ini PO pertama (count = 1 karena baru saja dibuat), update SO status ke 'processing'
    if (existingPOs[0].po_count === 1) {
      await query(
        `UPDATE sales_orders SET status = 'processing' WHERE so_code = ? AND is_deleted = 0`,
        [so_code]
      );
      
      // Audit log untuk update SO status
      await createAuditLog(
        decoded.user_code,
        decoded.name,
        'update',
        'sales_order',
        so_code,
        'Auto-updated to processing status - first PO created'
      );
    }

    // HANDLE FILE UPLOADS JIKA ADA
    if (files.length > 0) {
      for (let file of files) {
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const filename = `po_file_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
        
        // Save file ke public/uploads/po
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'po');
        await mkdir(uploadDir, { recursive: true });
        
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);

        // Insert ke database (temporary, belum ada payment code)
        const attachmentCode = `POATT-${timestamp}`;
        await query(
          `INSERT INTO purchase_order_attachments 
           (payment_doc_code, payment_code, name, type, filename) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            attachmentCode,
            'TEMP', // akan diupdate ketika payment dibuat
            file.name,
            'proof',
            filename
          ]
        );
      }
    }

    // Audit log untuk PO creation
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'create',
      'purchase_order',
      poCode,
      'Created new purchase order'
    );

    return Response.json({
      success: true,
      message: `Purchase order created successfully${files.length > 0 ? ' with ' + files.length + ' files' : ''}`,
      po_code: poCode,
      files_uploaded: files.length,
      so_updated: existingPOs[0].po_count === 1 // Tambah info bahwa SO di-update
    });

  } catch (error) {
    console.error('Create purchase order error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// UPDATE purchase order status (approval/rejection)
export async function PATCH(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { po_code, action, notes, rejection_reason } = await request.json();

    if (!po_code || !action) {
      return Response.json({ error: 'PO code and action are required' }, { status: 400 });
    }

    let newStatus, approvalField, approvalDateField, auditAction;

    switch (action) {
      case 'approve_spv':
        newStatus = 'approved_spv';
        approvalField = 'approved_by_spv';
        approvalDateField = 'approved_date_spv';
        auditAction = 'approve';
        break;
      case 'approve_finance':
        newStatus = 'approved_finance';
        approvalField = 'approved_by_finance';
        approvalDateField = 'approved_date_finance';
        auditAction = 'approve';
        break;
      case 'reject':
        newStatus = 'rejected';
        auditAction = 'reject';
        break;
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update purchase order
    let queryStr = `UPDATE purchase_orders SET status = ?`;
    let params = [newStatus];

    if (approvalField) {
      queryStr += `, ${approvalField} = ?, ${approvalDateField} = CURDATE()`;
      params.push(decoded.name);
    }

    if (notes) {
      queryStr += `, approval_notes = ?`;
      params.push(notes);
    }

    if (rejection_reason) {
      queryStr += `, rejection_reason = ?`;
      params.push(rejection_reason);
    }

    queryStr += ` WHERE po_code = ? AND is_deleted = FALSE`;
    params.push(po_code);

    const result = await query(queryStr, params);

    if (result.affectedRows === 0) {
      return Response.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    // Audit log
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      auditAction,
      'purchase_order',
      po_code,
      `${auditAction === 'reject' ? 'Rejected' : 'Approved'} purchase order${notes ? ': ' + notes : ''}`
    );

    return Response.json({
      success: true,
      message: `Purchase order ${auditAction === 'reject' ? 'rejected' : 'approved'} successfully`
    });

  } catch (error) {
    console.error('Update purchase order error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ================================
// PAYMENTS ENDPOINT - FIXED VERSION
// ================================
export async function PUT(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    // Hanya handle form data untuk payments (karena ada file upload)
    if (!contentType.includes('multipart/form-data')) {
      return Response.json({ error: 'Content-Type must be multipart/form-data' }, { status: 400 });
    }

    const formData = await request.formData();
    
    // Parse payment data
    const dataField = formData.get('data');
    if (!dataField) {
      return Response.json({ error: 'Missing data field' }, { status: 400 });
    }
    
    const paymentData = JSON.parse(dataField);
    const {
      po_code,
      payment_method,
      bank_name = null,
      account_number = null,
      payment_date,
      reference_number,
      notes = '',
      amount,
      supplier_name,
      so_code = null,
      so_reference = null
    } = paymentData;

    // Validasi required fields
    if (!po_code || !payment_method || !payment_date || !reference_number || !amount || !supplier_name) {
      return Response.json(
        { error: 'PO code, payment method, payment date, reference number, amount, and supplier name are required' },
        { status: 400 }
      );
    }

    // Validasi: cek apakah PO status = approved_finance
    const poCheck = await query(
      'SELECT status FROM purchase_orders WHERE po_code = ? AND is_deleted = FALSE',
      [po_code]
    );

    if (poCheck.length === 0) {
      return Response.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    if (poCheck[0].status !== 'approved_finance') {
      return Response.json(
        { error: 'Only finance-approved purchase orders can be paid' },
        { status: 400 }
      );
    }

    // Generate payment code
    const countResult = await query('SELECT COUNT(*) as count FROM purchase_order_payments');
    const paymentCode = `PAY-${new Date().getFullYear()}-${String(countResult[0].count + 1).padStart(4, '0')}`;

    // Insert payment
    await query(
      `INSERT INTO purchase_order_payments 
       (payment_code, po_code, so_code, so_reference, supplier_name, amount, 
        payment_date, payment_method, bank_name, account_number, reference_number, notes, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid')`,
      [
        paymentCode, po_code, so_code, so_reference, supplier_name, amount,
        payment_date, payment_method, bank_name, account_number, reference_number, notes
      ]
    );

    // Update PO status to paid
    await query(
      'UPDATE purchase_orders SET status = ? WHERE po_code = ?',
      ['paid', po_code]
    );

    // Handle file uploads untuk payment documents
    const fileFields = formData.getAll('files');
    const files = fileFields.filter(file => file instanceof File && file.size > 0);

    if (files.length > 0) {
      for (let file of files) {
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const filename = `payment_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
        
        // Save file ke public/uploads/payments
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'payments');
        await mkdir(uploadDir, { recursive: true });
        
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);

        // Insert payment attachment
        const attachmentCode = `PAYATT-${timestamp}`;
        await query(
          `INSERT INTO purchase_order_attachments 
           (payment_doc_code, payment_code, name, type, filename) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            attachmentCode,
            paymentCode,
            file.name,
            file.name.toLowerCase().includes('invoice') ? 'invoice' : 'proof',
            filename
          ]
        );
      }
    }

    // FIX: Update temporary attachments - tanpa subquery dengan LIMIT
    if (files.length > 0) {
      // Cara 1: Update berdasarkan timestamp terbaru
      await query(
        `UPDATE purchase_order_attachments 
         SET payment_code = ? 
         WHERE payment_code = 'TEMP' 
         AND uploaded_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
         ORDER BY uploaded_at DESC 
         LIMIT ?`,
        [paymentCode, files.length]
      );
    }

    // Audit log
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'pay',
      'payment',
      paymentCode,
      `Payment created for PO ${po_code}`
    );

    return Response.json({
      success: true,
      message: `Payment created successfully with ${files.length} documents`,
      payment_code: paymentCode
    });

  } catch (error) {
    console.error('Create payment error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ================================
// SALES ORDERS ENDPOINT
// ================================
export async function OPTIONS(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE so.is_deleted = FALSE';
    let params = [];

    if (search) {
      whereClause += ' AND (so.so_code LIKE ? OR so.customer_name LIKE ? OR so.so_reference LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Get sales orders
    const salesOrders = await query(
      `SELECT 
        so.so_code,
        so.customer_name,
        so.customer_phone,
        so.customer_email,
        so.sales_rep,
        so.total_amount,
        so.status,
        so.created_at
       FROM sales_orders so 
       ${whereClause}
       ORDER BY so.created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM sales_orders so ${whereClause}`,
      params
    );

    // Get items for each sales order
    for (let so of salesOrders) {
      const items = await query(
        `SELECT 
          so_item_code,
          product_name,
          product_code,
          quantity,
          unit_price,
          subtotal
         FROM sales_order_items 
         WHERE so_code = ? AND is_deleted = FALSE`,
        [so.so_code]
      );
      so.items = items;

      // Get purchase orders count
      const poCount = await query(
        `SELECT COUNT(*) as po_count FROM purchase_orders 
         WHERE so_code = ? AND is_deleted = FALSE`,
        [so.so_code]
      );
      so.po_count = poCount[0]?.po_count || 0;
    }

    return Response.json({
      success: true,
      data: salesOrders,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get sales orders error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}