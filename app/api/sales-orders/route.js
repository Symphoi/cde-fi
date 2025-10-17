// app/api/sales-orders/route.js
import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
// GET all sales orders
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

    console.log("test_paging " , limit);
    console.log("test_paging " , offset);
    let whereClause = 'WHERE so.is_deleted = FALSE';
    let params = [];

    if (status && status !== 'all') {
      whereClause += ' AND so.status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (so.so_code LIKE ? OR so.customer_name LIKE ? OR so.customer_phone LIKE ? OR so.customer_email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get sales orders
    const salesOrders = await query(
      `SELECT 
        so.so_code,
        so.created_at,
        so.customer_name,
        so.customer_phone,
        so.customer_email,
        so.billing_address,
        so.shipping_address,
        so.sales_rep,
        so.sales_rep_email,
        so.sales_order_doc,
        so.total_amount,
        so.tax_amount,
        so.shipping_cost,
        so.status,
        so.notes
       FROM sales_orders so 
       ${whereClause}
       ORDER BY so.created_at DESC 
       LIMIT ? OFFSET ?`,
       [limit.toString(), offset.toString()] // ✅ CONVERT TO STRING
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

      const taxes = await query(
        `SELECT 
          so_tax_code,
          tax_name,
          tax_rate,
          tax_amount
         FROM sales_order_taxes 
         WHERE so_code = ? AND is_deleted = FALSE`,
        [so.so_code]
      );
      so.taxes = taxes;

      // Get attachments
      const attachments = await query(
        `SELECT 
          attachment_code as id,
          filename as name,
          file_type as type,
          uploaded_at as upload_date,
          file_size as size
         FROM sales_order_attachments 
         WHERE so_code = ? AND is_deleted = FALSE`,
        [so.so_code]
      );
      so.attachments = attachments;
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

// CREATE new sales order
// CREATE new sales order - SUPPORT BOTH JSON AND FORM DATA
// CREATE new sales order - SUPPORT BOTH JSON AND FORM DATA
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    let soData;
    let files = [];

    // CHECK JIKA INI FORM DATA (WITH FILES)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      
      // Parse SO data dari formData
      const dataField = formData.get('data');
      if (!dataField) {
        return Response.json({ error: 'Missing data field' }, { status: 400 });
      }
      
      soData = JSON.parse(dataField);
      
      // Get all files - FIX: handle dua jenis dokumen
      const salesOrderFiles = formData.getAll('sales_order_doc');
      const otherFiles = formData.getAll('other_docs');
      files = [...salesOrderFiles, ...otherFiles].filter(file => file instanceof File && file.size > 0);
      
    } else {
      // HANDLE JSON REQUEST BIASA (seperti sebelumnya)
      soData = await request.json();
    }

    // Extract data dari soData - CONVERT UNDEFINED TO NULL
    const {
      customer_name,
      customer_phone,
      customer_email = null,
      billing_address = null,
      shipping_address = null,
      sales_rep = null,
      sales_rep_email = null,
      sales_order_doc = null,
      total_amount = 0,
      tax_amount = 0,
      shipping_cost = 0,
      notes = null,
      items = [],
      taxes = []
    } = soData;

    // Validasi required fields
    if (!customer_name || !customer_phone) {
      return Response.json(
        { error: 'Customer name and phone are required' },
        { status: 400 }
      );
    }

    // Validasi items
    if (!items || items.length === 0) {
      return Response.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }

    // Generate SO code
    const countResult = await query('SELECT COUNT(*) as count FROM sales_orders');
    const soCode = `SO-${new Date().getFullYear()}-${String(countResult[0].count + 1).padStart(4, '0')}`;

    // Insert sales order - PASTIKAN SEMUA PARAMS ADA NILAI
    await query(
      `INSERT INTO sales_orders 
       (so_code, customer_name, customer_phone, customer_email, 
        billing_address, shipping_address, sales_rep, sales_rep_email, sales_order_doc,
        total_amount, tax_amount, shipping_cost, notes, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')`,
      [
        soCode, 
        customer_name, 
        customer_phone, 
        customer_email,
        billing_address, 
        shipping_address, 
        sales_rep, 
        sales_rep_email, 
        sales_order_doc,
        total_amount || 0, 
        tax_amount || 0, 
        shipping_cost || 0, 
        notes
      ].map(param => param === undefined ? null : param) // ✅ CONVERT UNDEFINED TO NULL
    );

    // Insert items
    for (let item of items) {
      const itemCode = `SOI-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      await query(
        `INSERT INTO sales_order_items 
         (so_item_code, so_code, product_name, product_code, quantity, unit_price, subtotal) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          itemCode, 
          soCode, 
          item.product_name, 
          item.product_code, 
          item.quantity, 
          item.unit_price, 
          item.subtotal
        ].map(param => param === undefined ? null : param)
      );
    }

    // Insert taxes
    for (let tax of taxes) {
      const taxCode = `SOT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      await query(
        `INSERT INTO sales_order_taxes 
         (so_tax_code, so_code, tax_name, tax_rate, tax_amount) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          taxCode, 
          soCode, 
          tax.tax_name, 
          tax.tax_rate || 0, 
          tax.tax_amount || 0
        ].map(param => param === undefined ? null : param)
      );
    }

    // HANDLE FILE UPLOADS JIKA ADA
    if (files.length > 0) {
      for (let file of files) {
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const filename = `file_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
        
        // Save file ke public/uploads
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });
        
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);

        // Insert ke database
        const attachmentCode = `ATT-${timestamp}`;
        await query(
          `INSERT INTO sales_order_attachments 
           (attachment_code, so_code, filename, original_filename, file_type, file_size, file_path) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            attachmentCode,
            soCode,
            filename,
            file.name,
            file.type,
            file.size,
            `/uploads/${filename}`
          ]
        );
      }
    }

    // Audit log
    await query(
      `INSERT INTO audit_logs (audit_code, user_code, user_name, action, resource_type, resource_code, resource_name, notes)
       VALUES (?, ?, ?, 'create', 'sales_order', ?, ?, ?)`,
      [
        `AUD-${Date.now()}`, 
        decoded.user_code, 
        decoded.name, 
        soCode, 
        `Sales Order ${soCode}`,
        `Created new sales order${files.length > 0 ? ' with files' : ''}`
      ]
    );

    return Response.json({
      success: true,
      message: `Sales order created successfully${files.length > 0 ? ' with ' + files.length + ' files' : ''}`,
      so_code: soCode,
      files_uploaded: files.length
    });

  } catch (error) {
    console.error('Create sales order error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}