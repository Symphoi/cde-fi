import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Helper function untuk save file
async function saveFile(file, category) {
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop();
  const filename = `${category}_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
  
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'delivery');
  await mkdir(uploadDir, { recursive: true });
  
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);

  return filename;
}

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

// GET - Handle semua GET requests (ready-pos & delivery-orders)
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    // Jika action = 'ready-pos', return POs ready for delivery
    if (action === 'ready-pos') {
      return await handleGetReadyPOs(request, decoded);
    }

    // Default: get all delivery orders
    return await handleGetDeliveryOrders(request, decoded);

  } catch (error) {
    console.error('GET delivery orders error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET ready POs
async function handleGetReadyPOs(request, decoded) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '8';

  const offset = (parseInt(page) - 1) * parseInt(limit);

  let whereClause = `
    WHERE po.is_deleted = 0 
    AND po.status IN ('approved_finance', 'paid') 
    AND (po.do_status = 'not_created' OR po.do_status IS NULL)
  `;
  let params = [];

  if (search) {
    whereClause += ' AND (po.po_code LIKE ? OR po.so_code LIKE ? OR po.supplier_name LIKE ? OR so.customer_name LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM purchase_orders po
    LEFT JOIN sales_orders so ON po.so_code = so.so_code
    ${whereClause}
  `;
  const countResult = await query(countQuery, params);
  const total = countResult[0]?.total || 0;

  // Get purchase orders ready for delivery
  const poQuery = `
    SELECT 
      po.po_code,
      po.so_code,
      po.supplier_name,
      po.total_amount,
      po.date,
      po.priority,
      po.customer_ref,
      so.customer_name,
      so.customer_phone,
      so.customer_email,
      so.sales_rep,
      so.billing_address,
      so.shipping_address,
      DATEDIFF(CURDATE(), po.date) as days_waiting
    FROM purchase_orders po
    LEFT JOIN sales_orders so ON po.so_code = so.so_code
    ${whereClause}
    ORDER BY 
      CASE po.priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
      END,
      po.date ASC
    LIMIT ? OFFSET ?
  `;

  params.push(parseInt(limit), offset);
  const purchaseOrders = await query(poQuery, params);

  // Get items for each purchase order
  for (let po of purchaseOrders) {
    const items = await query(
      `SELECT 
        po_item_code,
        product_name,
        product_code,
        quantity,
        purchase_price,
        supplier,
        notes
      FROM purchase_order_items 
      WHERE po_code = ? AND is_deleted = 0`,
      [po.po_code]
    );
    po.items = items;
  }

  return Response.json({
    success: true,
    data: purchaseOrders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
}

// Handle GET delivery orders
async function handleGetDeliveryOrders(request, decoded) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search') || '';
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '10';

  const offset = (parseInt(page) - 1) * parseInt(limit);

  let whereClause = 'WHERE do.is_deleted = 0';
  let params = [];

  if (status && status !== 'all') {
    whereClause += ' AND do.status = ?';
    params.push(status);
  }

  if (search) {
    whereClause += ' AND (do.do_code LIKE ? OR do.so_code LIKE ? OR do.courier LIKE ? OR do.tracking_number LIKE ? OR so.customer_name LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM delivery_orders do
    LEFT JOIN sales_orders so ON do.so_code = so.so_code
    ${whereClause}
  `;
  const countResult = await query(countQuery, params);
  const total = countResult[0]?.total || 0;

  // Get delivery orders
  const deliveryOrdersQuery = `
    SELECT 
      do.id,
      do.do_code,
      do.so_code,
      do.purchase_order_codes,
      do.courier,
      do.tracking_number,
      do.shipping_date,
      do.shipping_cost,
      do.shipping_proof,
      do.status,
      do.proof_of_delivery,
      do.received_date,
      do.received_by,
      do.confirmation_method,
      do.created_at,
      so.customer_name,
      so.customer_phone,
      so.customer_email,
      so.sales_rep
    FROM delivery_orders do
    LEFT JOIN sales_orders so ON do.so_code = so.so_code
    ${whereClause}
    ORDER BY do.created_at DESC
    LIMIT ? OFFSET ?
  `;

  params.push(parseInt(limit), offset);
  const deliveryOrders = await query(deliveryOrdersQuery, params);

  return Response.json({
    success: true,
    data: deliveryOrders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
}

// POST - Create delivery order
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const dataField = formData.get('data');
    
    if (!dataField) {
      return Response.json({ success: false, error: 'Missing data field' }, { status: 400 });
    }

    const doData = JSON.parse(dataField);
    const {
      so_code,
      purchase_order_codes,
      courier,
      tracking_number,
      shipping_date,
      shipping_cost = 0,
      notes = null
    } = doData;

    // Validation
    if (!so_code || !purchase_order_codes || !Array.isArray(purchase_order_codes) || purchase_order_codes.length === 0) {
      return Response.json(
        { success: false, error: 'SO code and purchase order codes are required' },
        { status: 400 }
      );
    }

    if (!courier || !tracking_number || !shipping_date) {
      return Response.json(
        { success: false, error: 'Courier, tracking number, and shipping date are required' },
        { status: 400 }
      );
    }

    // Validate POs
    const placeholders = purchase_order_codes.map(() => '?').join(',');
    const poCheck = await query(
      `SELECT po_code, status, do_status, so_code 
       FROM purchase_orders 
       WHERE po_code IN (${placeholders}) AND is_deleted = 0`,
      purchase_order_codes
    );

    if (poCheck.length !== purchase_order_codes.length) {
      return Response.json(
        { success: false, error: 'One or more purchase orders not found' },
        { status: 400 }
      );
    }

    const invalidPOs = poCheck.filter(po => 
      (po.status !== 'approved_finance' && po.status !== 'paid') || 
      (po.do_status !== 'not_created' && po.do_status !== null) ||
      po.so_code !== so_code
    );

    if (invalidPOs.length > 0) {
      return Response.json(
        { 
          success: false, 
          error: `Invalid POs: ${invalidPOs.map(po => po.po_code).join(', ')}. All POs must be approved/paid, not in delivery, and belong to the same SO.`
        },
        { status: 400 }
      );
    }

    // Generate DO code
    const countResult = await query('SELECT COUNT(*) as count FROM delivery_orders WHERE YEAR(created_at) = YEAR(CURDATE())');
    const doCode = `DO-${new Date().getFullYear()}-${String(countResult[0].count + 1).padStart(4, '0')}`;

    // Handle file upload
    const shippingProofFile = formData.get('shipping_proof');
    let shippingProofPath = null;
    if (shippingProofFile && shippingProofFile.size > 0) {
      shippingProofPath = await saveFile(shippingProofFile, 'shipping_proof');
    }

    // Insert delivery order
    await query(
      `INSERT INTO delivery_orders 
       (do_code, so_code, purchase_order_codes, courier, tracking_number, 
        shipping_date, shipping_cost, shipping_proof, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'shipping')`,
      [
        doCode, so_code, JSON.stringify(purchase_order_codes), courier, tracking_number,
        shipping_date, shipping_cost, shippingProofPath
      ]
    );

    // Update PO statuses
    await query(
      `UPDATE purchase_orders 
       SET do_status = 'created', do_code = ?, delivery_date = ?
       WHERE po_code IN (${placeholders}) AND is_deleted = 0`,
      [doCode, shipping_date, ...purchase_order_codes]
    );

    // Audit log
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'create',
      'delivery_order',
      doCode,
      `Created delivery order for SO ${so_code} with ${purchase_order_codes.length} POs`
    );

    return Response.json({
      success: true,
      message: `Delivery order created successfully${shippingProofPath ? ' with shipping proof' : ''}`,
      do_code: doCode,
      files_uploaded: shippingProofPath ? 1 : 0,
      po_count: purchase_order_codes.length
    });

  } catch (error) {
    console.error('POST delivery order error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Mark delivery order as delivered
export async function PATCH(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const dataField = formData.get('data');
    
    if (!dataField) {
      return Response.json({ success: false, error: 'Missing data field' }, { status: 400 });
    }

    const doData = JSON.parse(dataField);
    const {
      do_code,
      received_date,
      received_by,
      confirmation_method = null,
      notes = ''
    } = doData;

    // Validation
    if (!do_code || !received_date || !received_by) {
      return Response.json(
        { success: false, error: 'DO code, received date, and received by are required' },
        { status: 400 }
      );
    }

    const podFile = formData.get('proof_of_delivery');
    if (!podFile || podFile.size === 0) {
      return Response.json(
        { success: false, error: 'Proof of delivery file is required' },
        { status: 400 }
      );
    }

    // Check if DO exists and is in shipping status
    const doCheck = await query(
      'SELECT * FROM delivery_orders WHERE do_code = ? AND is_deleted = 0',
      [do_code]
    );

    if (doCheck.length === 0) {
      return Response.json({ success: false, error: 'Delivery order not found' }, { status: 404 });
    }

    if (doCheck[0].status !== 'shipping') {
      return Response.json(
        { success: false, error: 'Only shipping delivery orders can be marked as delivered' },
        { status: 400 }
      );
    }

    // Handle POD file upload
    const podFilePath = await saveFile(podFile, 'proof_of_delivery');

    // Update delivery order
    await query(
      `UPDATE delivery_orders 
       SET status = 'delivered', 
           proof_of_delivery = ?, 
           received_date = ?, 
           received_by = ?, 
           confirmation_method = ?,
           notes = ?
       WHERE do_code = ?`,
      [podFilePath, received_date, received_by, confirmation_method, notes, do_code]
    );

    // FIX: Parse purchase_order_codes dengan error handling yang benar
    let poCodes = [];
    try {
      const purchaseOrderCodes = doCheck[0].purchase_order_codes;
      if (purchaseOrderCodes) {
        // Coba parse sebagai JSON
        const parsed = JSON.parse(purchaseOrderCodes);
        poCodes = Array.isArray(parsed) ? parsed : [purchaseOrderCodes];
      }
    } catch (error) {
      // Jika parsing gagal, treat sebagai single PO code
      console.warn('Failed to parse purchase_order_codes as JSON, treating as single PO:', doCheck[0].purchase_order_codes);
      poCodes = [doCheck[0].purchase_order_codes];
    }

    // Update related purchase orders
    if (poCodes.length > 0) {
      const placeholders = poCodes.map(() => '?').join(',');
      await query(
        `UPDATE purchase_orders 
         SET do_status = 'delivered'
         WHERE po_code IN (${placeholders}) AND is_deleted = 0`,
        poCodes
      );
    }

    // ✅ AUTO-UPDATE STATUS SO: Cek apakah semua PO di SO ini sudah delivered
    const allPOsDelivered = await query(
      `SELECT COUNT(*) as pending_count 
       FROM purchase_orders 
       WHERE so_code = ? AND is_deleted = 0 
       AND (do_status != 'delivered' OR do_status IS NULL)`,
      [doCheck[0].so_code]
    );

    // Jika semua PO sudah delivered, update SO status ke 'invoicing'
    if (allPOsDelivered[0].pending_count === 0) {
      await query(
        `UPDATE sales_orders SET status = 'invoicing' WHERE so_code = ? AND is_deleted = 0`,
        [doCheck[0].so_code]
      );
      
      // Audit log
      await createAuditLog(
        decoded.user_code,
        decoded.name,
        'update',
        'sales_order',
        doCheck[0].so_code,
        'Auto-updated to invoicing status - all POs delivered'
      );
    }

    // Audit log untuk DO
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'update',
      'delivery_order',
      do_code,
      `Marked as delivered. Received by: ${received_by}`
    );

    return Response.json({
      success: true,
      message: 'Delivery order marked as delivered successfully',
      po_count: poCodes.length,
      so_updated: allPOsDelivered[0].pending_count === 0 // Info apakah SO di-update
    });

  } catch (error) {
    console.error('PATCH delivery order error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Export delivery order
export async function PUT(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { do_code, format = 'json' } = await request.json();

    if (!do_code) {
      return Response.json({ success: false, error: 'DO code is required' }, { status: 400 });
    }

    // Get delivery order with all related data
    const deliveryOrder = await query(
      `SELECT 
        do.*,
        so.customer_name,
        so.customer_phone,
        so.customer_email,
        so.billing_address,
        so.shipping_address,
        so.sales_rep,
        so.sales_rep_email
      FROM delivery_orders do
      LEFT JOIN sales_orders so ON do.so_code = so.so_code
      WHERE do.do_code = ? AND do.is_deleted = 0`,
      [do_code]
    );

    if (deliveryOrder.length === 0) {
      return Response.json({ success: false, error: 'Delivery order not found' }, { status: 404 });
    }

    const doItem = deliveryOrder[0];
    
    // FIX: Parse purchase_order_codes dengan error handling yang benar
    let poCodes = [];
    try {
      if (doItem.purchase_order_codes) {
        const parsed = JSON.parse(doItem.purchase_order_codes);
        poCodes = Array.isArray(parsed) ? parsed : [doItem.purchase_order_codes];
      }
    } catch (error) {
      console.warn('Failed to parse purchase_order_codes as JSON in PUT:', doItem.purchase_order_codes);
      poCodes = doItem.purchase_order_codes ? [doItem.purchase_order_codes] : [];
    }

    // Get PO details
    let relatedPOs = [];
    if (poCodes.length > 0) {
      const placeholders = poCodes.map(() => '?').join(',');
      const poDetails = await query(
        `SELECT 
          po.po_code,
          po.supplier_name,
          po.total_amount,
          po.date,
          poi.product_name,
          poi.product_code,
          poi.quantity,
          poi.purchase_price,
          (poi.quantity * poi.purchase_price) as item_total
        FROM purchase_orders po
        LEFT JOIN purchase_order_items poi ON po.po_code = poi.po_code
        WHERE po.po_code IN (${placeholders}) AND po.is_deleted = 0 AND poi.is_deleted = 0
        ORDER BY po.po_code, poi.product_name`,
        poCodes
      );
      relatedPOs = poDetails;
    }

    const exportData = {
      delivery_order: {
        do_code: doItem.do_code,
        so_code: doItem.so_code,
        customer_name: doItem.customer_name,
        customer_phone: doItem.customer_phone,
        customer_email: doItem.customer_email,
        courier: doItem.courier,
        tracking_number: doItem.tracking_number,
        shipping_date: doItem.shipping_date,
        shipping_cost: doItem.shipping_cost,
        status: doItem.status,
        received_date: doItem.received_date,
        received_by: doItem.received_by,
        confirmation_method: doItem.confirmation_method,
        created_at: doItem.created_at
      },
      purchase_orders: relatedPOs,
      export_info: {
        exported_by: decoded.name,
        export_date: new Date().toISOString(),
        format: format
      }
    };

    return Response.json({
      success: true,
      data: exportData,
      message: `Export data for ${do_code} in ${format} format`
    });

  } catch (error) {
    console.error('PUT delivery order error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}