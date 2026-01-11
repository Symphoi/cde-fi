// app/api/sales-orders/route.js
import { query } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Helper function untuk generate number sequence
async function getNextSequence(
  sequenceCode,
  companyCode,
  projectCode,
  salesRepCode,
  customerCode
) {
  try {
    const existingSequence = await query(
      "SELECT next_number, prefix FROM numbering_sequences WHERE sequence_code = ?",
      [sequenceCode]
    );

    if (existingSequence.length > 0) {
      const currentNumber = existingSequence[0].next_number;
      const template = existingSequence[0].prefix;

      const dynamicPrefix = template
        .replace("{company}", companyCode || "CS")
        .replace("{project}", projectCode || "PROJ")
        .replace("{sales_rep}", salesRepCode || "SR001")
        .replace("{customer}", customerCode || "CUST001");

      const nextNumber = currentNumber + 1;
      await query(
        "UPDATE numbering_sequences SET next_number = ? WHERE sequence_code = ?",
        [nextNumber, sequenceCode]
      );

      return {
        number: currentNumber,
        prefix: dynamicPrefix,
      };
    } else {
      throw new Error("Sequence not found");
    }
  } catch (error) {
    console.error("Error getting sequence:", error);
    throw error;
  }
}

// Helper function untuk create AR invoice
async function createARInvoice(soCode, customerName, totalAmount, decoded) {
  try {
    // Generate AR code
    const sequence = await getNextSequence('AR', null, null, null, null);
    const arCode = `${sequence.prefix}${sequence.number}`;
    
    // Generate invoice number
    const invoiceSequence = await getNextSequence('INV', null, null, null, null);
    const invoiceNumber = `${invoiceSequence.prefix}${invoiceSequence.number}`;

    const currentDate = new Date();

    // Insert AR invoice - TANPA due_date
    await query(
      `INSERT INTO accounts_receivable 
       (ar_code, customer_name, invoice_number, invoice_date, amount, outstanding_amount, status, so_code) 
       VALUES (?, ?, ?, ?, ?, ?, 'unpaid', ?)`,
      [
        arCode,
        customerName,
        invoiceNumber,
        currentDate.toISOString().split('T')[0],
        totalAmount,
        totalAmount,
        soCode
      ]
    );

    // Update SO dengan AR info - TANPA due_date
    await query(
      `UPDATE sales_orders 
       SET ar_code = ?, invoice_number = ?, invoice_date = ?, accounting_status = 'not_posted'
       WHERE so_code = ?`,
      [
        arCode,
        invoiceNumber,
        currentDate.toISOString().split('T')[0],
        soCode
      ]
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (audit_code, user_code, user_name, action, resource_type, resource_code, resource_name, notes)
       VALUES (?, ?, ?, 'create', 'ar_invoice', ?, ?, ?)`,
      [
        `AUD-${Date.now()}`,
        decoded.user_code,
        decoded.name,
        arCode,
        `AR Invoice ${arCode}`,
        `Auto-created AR invoice for SO ${soCode}`
      ]
    );

    return { arCode, invoiceNumber };
  } catch (error) {
    console.error('Create AR invoice error:', error);
    throw error;
  }
}

// GET_DETAIL function untuk handle single SO
async function GET_DETAIL(soCode) {
  try {
    // Decode URL component
    const decodedSoCode = decodeURIComponent(soCode);

    // Get sales order
    const salesOrders = await query(
      `SELECT 
        so.so_code,
        so.customer_code,
        so.customer_data,
        so.customer_name,
        so.customer_phone,
        so.customer_email,
        so.billing_address,
        so.shipping_address,
        so.sales_rep,
        so.sales_rep_email,
        so.sales_order_doc,
        so.project_code,
        so.total_amount,
        so.tax_amount,
        so.shipping_cost,
        so.status,
        so.notes,
        so.ar_code,
        so.invoice_number,
        so.journal_code,
        so.accounting_status,
        so.tax_configuration,
        so.customer_type,
        so.created_at
       FROM sales_orders so 
       WHERE so.so_code = ? AND so.is_deleted = FALSE`,
      [decodedSoCode]
    );

    if (salesOrders.length === 0) {
      return { success: false, error: "Sales order not found" };
    }

    const so = salesOrders[0];

    // Get items
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
      [decodedSoCode]
    );
    so.items = items;


// Get Projects
    const project = await query(
      `SELECT 
        name
       FROM projects 
       WHERE project_code = ? AND is_deleted = 0`,
      [so.project_code]
    );
    so.project_code = project[0].name;
    // so.project_code = project.toString;
    // Get taxes
    const taxes = await query(
      `SELECT 
        so_tax_code,
        tax_name,
        tax_rate,
        tax_amount
       FROM sales_order_taxes 
       WHERE so_code = ? AND is_deleted = FALSE`,
      [decodedSoCode]
    );
    // console.log(decodedSoCode);
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
      [decodedSoCode]
    );
    so.attachments = attachments;

    return { success: true, data: so };
  } catch (error) {
    console.error("Get sales order detail error:", error);
    return { success: false, error: "Internal server error" };
  }
}

export async function GET(request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    const decoded = verifyToken(token);

    if (!decoded) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const soCode = searchParams.get("so_code");

    // Handler untuk get detail sales order by so_code
    if (soCode) {
      const result = await GET_DETAIL(soCode);
      if (!result.success) {
        return Response.json(
          { success: false, error: result.error },
          { status: 404 }
        );
      }
      return Response.json({
        success: true,
        data: result.data,
      });
    }

    // Handler untuk get tax types
    if (action === "get-tax-types") {
      const taxTypes = await query(
        `SELECT id, tax_code, name, description, tax_rate, tax_type 
         FROM tax_types 
         WHERE is_deleted = FALSE 
         ORDER BY tax_code`
      );
      return Response.json({
        success: true,
        data: taxTypes,
      });
    }

    // Handler untuk get users
    if (action === "get-users") {
      const users = await query(
        `SELECT 
          user_code,
          name,
          email,
          department,
          position,
          status
         FROM users 
         WHERE status = 'active' AND is_deleted = FALSE
         ORDER BY name`
      );

      return Response.json({
        success: true,
        data: users,
      });
    }

    // Default: get all sales orders
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE so.is_deleted = FALSE";
    let params = [];

    if (status && status !== "all") {
      whereClause += " AND so.status = ?";
      params.push(status);
    }

    if (search) {
      whereClause +=
        " AND (so.so_code LIKE ? OR so.customer_name LIKE ? OR so.customer_phone LIKE ? OR so.customer_email LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get sales orders
    const salesOrders = await query(
      `SELECT 
        so.so_code,
        so.customer_code,
        so.customer_data,
        so.customer_name,
        so.customer_phone,
        so.customer_email,
        so.billing_address,
        so.shipping_address,
        so.sales_rep,
        so.sales_rep_email,
        so.sales_order_doc,
        so.project_code,
        so.total_amount,
        so.tax_amount,
        so.shipping_cost,
        so.status,
        so.notes,
        so.ar_code,
        so.invoice_number,
        so.journal_code,
        so.accounting_status,
        so.tax_configuration,
        so.customer_type,
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

    // Get items untuk setiap sales order
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
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (error) {
    console.error("Get sales orders error:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    // ✅ VALIDASI: Hanya terima multipart/form-data
    if (!contentType.includes('multipart/form-data')) {
      return Response.json(
        { success: false, error: 'Content-Type must be multipart/form-data' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    
    // ✅ VALIDASI: Data field required
    const dataField = formData.get('data');
    if (!dataField) {
      return Response.json(
        { success: false, error: 'Sales order data is required' },
        { status: 400 }
      );
    }

    let soData;
    try {
      soData = JSON.parse(dataField);
    } catch (parseError) {
      return Response.json(
        { success: false, error: 'Invalid JSON data format' },
        { status: 400 }
      );
    }

    // ✅ VALIDASI REQUIRED FIELDS
    const errors = [];
    if (!soData.customer_name?.trim()) errors.push('Customer name is required');
    if (!soData.customer_phone?.trim()) errors.push('Customer phone is required');
    if (!soData.total_amount || soData.total_amount <= 0) 
      errors.push('Total amount must be greater than 0');

    // ✅ VALIDASI ITEMS
    const validItems = soData.items?.filter(item => 
      item.product_name && item.product_code && item.quantity > 0 && item.unit_price > 0
    );
    if (!validItems || validItems.length === 0) {
      errors.push('At least one valid item is required');
    }

    if (errors.length > 0) {
      return Response.json(
        { success: false, error: errors.join(', ') },
        { status: 400 }
      );
    }

    // ✅ VALIDASI FILE UPLOAD - REQUIRED
    const salesOrderFile = formData.get('sales_order_doc');
    if (!salesOrderFile || salesOrderFile.size === 0) {
      return Response.json(
        { success: false, error: 'Sales Order Document is required' },
        { status: 400 }
      );
    }

    // ✅ VALIDASI FILE TYPE
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(salesOrderFile.type)) {
      return Response.json(
        { 
          success: false, 
          error: 'Invalid file type. Only PDF, Word (.doc, .docx), and Excel (.xls, .xlsx) files are allowed' 
        },
        { status: 400 }
      );
    }

    // ✅ VALIDASI FILE SIZE (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (salesOrderFile.size > maxSize) {
      return Response.json(
        { 
          success: false, 
          error: 'File size too large. Maximum 10MB allowed' 
        },
        { status: 400 }
      );
    }

    // ✅ VALIDASI OTHER FILES (jika ada)
    const otherFiles = formData.getAll('other_docs').filter(file => file && file.size > 0);
    for (let file of otherFiles) {
      if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
        return Response.json(
          { 
            success: false, 
            error: `Invalid file type for ${file.name}. Only PDF, Word, Excel, and image files are allowed` 
          },
          { status: 400 }
        );
      }
      
      if (file.size > maxSize) {
        return Response.json(
          { 
            success: false, 
            error: `File ${file.name} is too large. Maximum 10MB allowed` 
          },
          { status: 400 }
        );
      }
    }

    // Extract data dari form
    const {
      customer_name,
      customer_phone,
      customer_email = null,
      customer_code = null,
      customer_type = 'company',
      billing_address = null,
      shipping_address = null,
      sales_rep = null,
      sales_rep_email = null,
      sales_rep_code = null,
      sales_order_doc = null,
      project_code = null,
      total_amount = 0,
      tax_amount = 0,
      shipping_cost = 0,
      notes = null,
      tax_configuration = 'included',
      items = [],
      taxes = []
    } = soData;

    // Get company code dari project (jika ada)
    let companyCode = 'CS'; // default
    if (project_code) {
      const projectData = await query(
        'SELECT company_code FROM projects WHERE project_code = ? AND is_deleted = FALSE',
        [project_code]
      );
      if (projectData.length > 0) {
        companyCode = projectData[0].company_code;
      }
    }

    // Generate SO code menggunakan number sequence
    const sequence = await getNextSequence('SO', companyCode, project_code, sales_rep_code, customer_code);
    const soCode = `${sequence.prefix}${sequence.number}`;

    // Insert sales order
    await query(
      `INSERT INTO sales_orders 
       (so_code, customer_code, customer_name, customer_phone, customer_email, 
        billing_address, shipping_address, sales_rep, sales_rep_email, sales_order_doc,
        project_code, total_amount, tax_amount, shipping_cost, notes, status,
        accounting_status, tax_configuration, customer_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', 'not_posted', ?, ?)`,
      [
        soCode, 
        customer_code,
        customer_name, 
        customer_phone, 
        customer_email,
        billing_address, 
        shipping_address, 
        sales_rep, 
        sales_rep_email, 
        sales_order_doc,
        project_code,
        total_amount || 0, 
        tax_amount || 0, 
        shipping_cost || 0, 
        notes,
        tax_configuration,
        customer_type
      ].map(param => param === undefined ? null : param)
    );

    // Insert items
    for (let item of items) {
      if (item.product_name && item.product_code && item.quantity > 0 && item.unit_price > 0) {
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
          ]
        );
      }
    }

    // Insert taxes
    for (let tax of taxes) {
      if (tax.tax_name && (tax.tax_amount > 0 || tax.tax_rate > 0)) {
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
          ]
        );
      }
    }

    // ✅ AUTO CREATE AR INVOICE
    const arResult = await createARInvoice(soCode, customer_name, total_amount, decoded);

    // ✅ HANDLE FILE UPLOADS - FIXED VERSION
    const allFiles = [salesOrderFile, ...otherFiles];
    const uploadedFiles = [];

    for (let file of allFiles) {
      if (file && file.size > 0) {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substr(2, 9);
        
        // ⭐⭐ BERSIHKAN NAMA FILE DARI KARAKTER KHUSUS ⭐⭐
        const cleanSoCode = soCode.replace(/[\/\\:*?"<>|]/g, '_');
        const cleanOriginalName = file.name.replace(/[\/\\:*?"<>|]/g, '_');
        
        const fileExtension = cleanOriginalName.split('.').pop();
        const filename = `so_${cleanSoCode}_${timestamp}_${randomString}.${fileExtension}`;
        
        // Pastikan directory ada
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'sales-orders');
        
        try {
          await mkdir(uploadDir, { recursive: true });
          console.log('Directory created/verified:', uploadDir);
        } catch (mkdirError) {
          console.error('Error creating directory:', mkdirError);
          throw new Error(`Failed to create upload directory: ${mkdirError.message}`);
        }
        
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = path.join(uploadDir, filename);
        
        try {
          await writeFile(filePath, buffer);
          console.log('File saved successfully:', filePath);
        } catch (writeError) {
          console.error('Error writing file:', writeError);
          throw new Error(`Failed to save file: ${writeError.message}`);
        }

        // Insert ke database
        const attachmentCode = `ATT-${timestamp}-${randomString}`;
        await query(
          `INSERT INTO sales_order_attachments 
           (attachment_code, so_code, filename, original_filename, file_type, file_size, file_path) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            attachmentCode,
            soCode,
            filename,
            cleanOriginalName, // Gunakan nama yang sudah dibersihkan
            file.type,
            file.size,
            `/uploads/sales-orders/${filename}`
          ]
        );

        uploadedFiles.push({
          originalName: cleanOriginalName,
          savedName: filename,
          size: file.size,
          type: file.type
        });
      }
    }

    // ✅ AUDIT LOG
    await query(
      `INSERT INTO audit_logs (audit_code, user_code, user_name, action, resource_type, resource_code, resource_name, notes)
       VALUES (?, ?, ?, 'create', 'sales_order', ?, ?, ?)`,
      [
        `AUD-${Date.now()}`, 
        decoded.user_code, 
        decoded.name, 
        soCode, 
        `Sales Order ${soCode}`,
        `Created new sales order with ${uploadedFiles.length} files and AR invoice ${arResult.arCode}`
      ]
    );

    // ✅ SUCCESS RESPONSE
    return Response.json({
      success: true,
      message: 'Sales order created successfully',
      so_code: soCode,
      ar_code: arResult.arCode,
      invoice_number: arResult.invoiceNumber,
      data: {
        so_code: soCode,
        customer_name,
        total_amount,
        files_uploaded: uploadedFiles.length,
        uploaded_files: uploadedFiles.map(f => f.originalName),
        ar_code: arResult.arCode,
        invoice_number: arResult.invoiceNumber
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Create sales order error:', error);
    
    // ✅ ERROR RESPONSE
    return Response.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}