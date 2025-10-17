import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Helper function untuk save file
async function saveFile(file, category) {
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop();
  const filename = `${category}_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
  
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'invoices');
  await mkdir(uploadDir, { recursive: true });
  
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filePath = path.join(uuploadDir, filename);
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

// GET - Get all SO ready for invoice
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = `
      WHERE so.is_deleted = 0 
      AND so.status IN ('delivered', 'completed')
      AND NOT EXISTS (
        SELECT 1 FROM purchase_orders po 
        WHERE po.so_code = so.so_code 
        AND po.is_deleted = 0 
        AND (po.status != 'paid' OR po.do_status != 'delivered')
      )
    `;
    let params = [];

    if (search) {
      whereClause += ' AND (so.so_code LIKE ? OR so.customer_name LIKE ? OR so.customer_phone LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM sales_orders so
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get sales orders ready for invoice
    const soQuery = `
      SELECT 
        so.*,
        (SELECT COUNT(*) FROM purchase_orders po WHERE po.so_code = so.so_code AND po.is_deleted = 0) as po_count,
        (SELECT COUNT(*) FROM delivery_orders do WHERE do.so_code = so.so_code AND do.is_deleted = 0) as do_count
      FROM sales_orders so
      ${whereClause}
      ORDER BY so.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), offset);
    const salesOrders = await query(soQuery, params);

    // Get detailed data for each SO
    for (let so of salesOrders) {
      // Get SO items
      const items = await query(
        `SELECT * FROM sales_order_items 
         WHERE so_code = ? AND is_deleted = 0 
         ORDER BY created_at`,
        [so.so_code]
      );
      so.items = items;

      // Get SO taxes
      const taxes = await query(
        `SELECT * FROM sales_order_taxes 
         WHERE so_code = ? AND is_deleted = 0`,
        [so.so_code]
      );
      so.taxes = taxes;

      // Get SO attachments
      const attachments = await query(
        `SELECT * FROM sales_order_attachments 
         WHERE so_code = ? AND is_deleted = 0`,
        [so.so_code]
      );
      so.attachments = attachments;

      // Get related POs dengan detail lengkap
      const purchaseOrders = await query(
        `SELECT * FROM purchase_orders 
         WHERE so_code = ? AND is_deleted = 0 
         ORDER BY created_at`,
        [so.so_code]
      );

      // Get PO items untuk setiap PO
      for (let po of purchaseOrders) {
        const poItems = await query(
          `SELECT * FROM purchase_order_items 
           WHERE po_code = ? AND is_deleted = 0`,
          [po.po_code]
        );
        po.items = poItems;

        // Get PO payments
        const payments = await query(
          `SELECT * FROM purchase_order_payments 
           WHERE po_code = ? AND is_deleted = 0`,
          [po.po_code]
        );
        po.payments = payments;

        // Get PO delivery orders
        const deliveryOrders = await query(
          `SELECT * FROM delivery_orders 
           WHERE JSON_CONTAINS(purchase_order_codes, ?) AND is_deleted = 0`,
          [JSON.stringify([po.po_code])]
        );
        po.deliveryOrders = deliveryOrders;
      }

      so.purchaseOrders = purchaseOrders;

      // Calculate financial summary
      const totalCost = purchaseOrders.reduce((sum, po) => sum + parseFloat(po.total_amount || 0), 0);
      const totalProfit = parseFloat(so.total_amount || 0) - totalCost;
      const profitMargin = parseFloat(so.total_amount || 0) > 0 ? (totalProfit / parseFloat(so.total_amount || 0)) * 100 : 0;

      so.financialSummary = {
        totalCost,
        totalProfit,
        profitMargin: parseFloat(profitMargin.toFixed(2))
      };
    }

    return Response.json({
      success: true,
      data: salesOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('GET invoice payment error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create invoice and process payment
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

    const paymentData = JSON.parse(dataField);
    const {
      so_code,
      invoice_number,
      payment_date,
      payment_amount,
      payment_method,
      bank_name,
      account_number,
      reference_number,
      notes = ''
    } = paymentData;

    // Validation
    if (!so_code || !invoice_number || !payment_date || !payment_amount) {
      return Response.json(
        { success: false, error: 'SO code, invoice number, payment date, and amount are required' },
        { status: 400 }
      );
    }

    // Check if SO exists and is ready for invoice
    const soCheck = await query(
      `SELECT so.*,
        (SELECT COUNT(*) FROM purchase_orders po WHERE po.so_code = so.so_code AND po.is_deleted = 0 AND (po.status != 'paid' OR po.do_status != 'delivered')) as pending_pos
       FROM sales_orders so 
       WHERE so.so_code = ? AND so.is_deleted = 0`,
      [so_code]
    );

    if (soCheck.length === 0) {
      return Response.json({ success: false, error: 'Sales order not found' }, { status: 404 });
    }

    const so = soCheck[0];
    if (so.pending_pos > 0) {
      return Response.json(
        { success: false, error: 'Cannot create invoice - some POs are not completed' },
        { status: 400 }
      );
    }

    // Handle payment proof upload
    const paymentProofFile = formData.get('payment_proof');
    let paymentProofPath = null;
    if (paymentProofFile && paymentProofFile.size > 0) {
      paymentProofPath = await saveFile(paymentProofFile, 'payment_proof');
    }

    // Generate payment code
    const countResult = await query('SELECT COUNT(*) as count FROM customer_payments WHERE YEAR(created_at) = YEAR(CURDATE())');
    const paymentCode = `CUSTPAY-${new Date().getFullYear()}-${String(countResult[0].count + 1).padStart(4, '0')}`;

    // Insert customer payment
    await query(
      `INSERT INTO customer_payments 
       (payment_code, so_code, invoice_number, amount, payment_date, payment_method, 
        bank_name, account_number, reference_number, payment_proof, notes, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid')`,
      [
        paymentCode, so_code, invoice_number, payment_amount, payment_date, payment_method,
        bank_name, account_number, reference_number, paymentProofPath, notes
      ]
    );

    // Update SO status to completed
    await query(
      `UPDATE sales_orders 
       SET status = 'completed'
       WHERE so_code = ? AND is_deleted = 0`,
      [so_code]
    );

    // Audit log
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'pay',
      'sales_order',
      so_code,
      `Processed customer payment for invoice ${invoice_number}`
    );

    return Response.json({
      success: true,
      message: 'Payment processed successfully and invoice created',
      payment_code: paymentCode,
      invoice_number: invoice_number
    });

  } catch (error) {
    console.error('POST invoice payment error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Export invoice to PDF
export async function PUT(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { so_code } = await request.json();

    if (!so_code) {
      return Response.json({ success: false, error: 'SO code is required' }, { status: 400 });
    }

    // Get complete SO data for PDF export
    const soData = await query(
      `SELECT 
        so.*,
        (SELECT SUM(total_amount) FROM purchase_orders WHERE so_code = so.so_code AND is_deleted = 0) as total_cost
       FROM sales_orders so
       WHERE so.so_code = ? AND so.is_deleted = 0`,
      [so_code]
    );

    if (soData.length === 0) {
      return Response.json({ success: false, error: 'Sales order not found' }, { status: 404 });
    }

    const so = soData[0];

    // Get SO items
    const items = await query(
      `SELECT * FROM sales_order_items 
       WHERE so_code = ? AND is_deleted = 0`,
      [so_code]
    );

    // Get SO taxes
    const taxes = await query(
      `SELECT * FROM sales_order_taxes 
       WHERE so_code = ? AND is_deleted = 0`,
      [so_code]
    );

    // Get POs
    const purchaseOrders = await query(
      `SELECT * FROM purchase_orders 
       WHERE so_code = ? AND is_deleted = 0`,
      [so_code]
    );

    // Get customer payments
    const payments = await query(
      `SELECT * FROM customer_payments 
       WHERE so_code = ? AND is_deleted = 0 
       ORDER BY created_at DESC LIMIT 1`,
      [so_code]
    );

    const exportData = {
      sales_order: so,
      items: items,
      taxes: taxes,
      purchase_orders: purchaseOrders,
      payment: payments.length > 0 ? payments[0] : null,
      financial_summary: {
        total_cost: so.total_cost || 0,
        total_profit: parseFloat(so.total_amount || 0) - parseFloat(so.total_cost || 0),
        profit_margin: parseFloat(so.total_amount || 0) > 0 ? 
          ((parseFloat(so.total_amount || 0) - parseFloat(so.total_cost || 0)) / parseFloat(so.total_amount || 0)) * 100 : 0
      },
      export_info: {
        exported_by: decoded.name,
        export_date: new Date().toISOString()
      }
    };

    return Response.json({
      success: true,
      data: exportData,
      message: `Export data for ${so_code}`
    });

  } catch (error) {
    console.error('PUT invoice export error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}