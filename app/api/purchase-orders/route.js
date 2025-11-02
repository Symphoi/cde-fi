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

// Helper function untuk generate number sequence dengan template support
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

// Helper function untuk create AP invoice
async function createAPInvoice(poCode, supplierName, totalAmount, decoded) {
  try {
    // Generate AP code
    const sequence = await getNextSequence('AP', null, null, null, null);
    const apCode = `${sequence.prefix}${sequence.number}`;
    
    // Generate supplier invoice number
    const invoiceNumber = `INV-${poCode}-${Date.now().toString().slice(-6)}`;

    const currentDate = new Date();
    const dueDate = new Date(currentDate);
    dueDate.setDate(dueDate.getDate() + 30); // 30 days terms

    // Insert AP invoice
    await query(
      `INSERT INTO accounts_payable 
       (ap_code, supplier_name, invoice_number, invoice_date, due_date, amount, outstanding_amount, status, po_code) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'unpaid', ?)`,
      [
        apCode,
        supplierName,
        invoiceNumber,
        currentDate.toISOString().split('T')[0],
        dueDate.toISOString().split('T')[0],
        totalAmount,
        totalAmount,
        poCode
      ]
    );

    // Update PO dengan AP info
    await query(
      `UPDATE purchase_orders 
       SET ap_code = ?, supplier_invoice_number = ?, supplier_invoice_date = ?, due_date = ?
       WHERE po_code = ?`,
      [
        apCode,
        invoiceNumber,
        currentDate.toISOString().split('T')[0],
        dueDate.toISOString().split('T')[0],
        poCode
      ]
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (audit_code, user_code, user_name, action, resource_type, resource_code, resource_name, notes)
       VALUES (?, ?, ?, 'create', 'ap_invoice', ?, ?, ?)`,
      [
        `AUD-${Date.now()}`,
        decoded.user_code,
        decoded.name,
        apCode,
        `AP Invoice ${apCode}`,
        `Auto-created AP invoice for PO ${poCode}`
      ]
    );

    return { apCode, invoiceNumber };
  } catch (error) {
    console.error('Create AP invoice error:', error);
    throw error;
  }
}

// Helper function untuk create journal entry
async function createJournalEntryForPayment(paymentCode, poCode, amount, companyBankCode, decoded) {
  try {
    // Get accounting rule untuk payment
    const accountingRule = await query(
      'SELECT debit_account_code, credit_account_code FROM accounting_rules WHERE rule_code = ? AND is_active = 1',
      ['RULE004'] // Pengeluaran Kas
    );

    if (accountingRule.length === 0) {
      throw new Error('Accounting rule not found for payment');
    }

    // Get bank account details
    const bankAccount = await query(
      'SELECT account_code, bank_name, account_number FROM bank_accounts WHERE account_code = ? AND is_active = 1 AND is_deleted = 0',
      [companyBankCode]
    );

    if (bankAccount.length === 0) {
      throw new Error('Bank account not found');
    }

    const creditAccountCode = bankAccount[0].account_code; // Use actual bank account code
    const debitAccountCode = accountingRule[0].debit_account_code; // 2110 - Hutang Usaha

    // Get open accounting period
    const openPeriod = await query(
      'SELECT period_code FROM accounting_periods WHERE status = "open" ORDER BY start_date DESC LIMIT 1'
    );

    const periodCode = openPeriod.length > 0 ? openPeriod[0].period_code : '2024-01'; // fallback

    // Generate journal code
    const journalSequence = await getNextSequence('JNL', null, null, null, null);
    const journalCode = `${journalSequence.prefix}${journalSequence.number}`;

    const currentDate = new Date().toISOString().split('T')[0];

    // Insert journal entry
    await query(
      `INSERT INTO journal_entries 
       (journal_code, transaction_date, description, reference_type, reference_code, period_code, total_debit, total_credit, status, created_by)
       VALUES (?, ?, ?, 'payment', ?, ?, ?, ?, 'posted', ?)`,
      [
        journalCode,
        currentDate,
        `Payment for PO ${poCode}`,
        paymentCode,
        periodCode,
        amount,
        amount,
        decoded.name
      ]
    );

    // Insert journal items - Debit: Hutang Usaha
    const debitItemCode = `JNI-${Date.now()}-1`;
    await query(
      `INSERT INTO journal_items 
       (journal_item_code, journal_code, account_code, debit_amount, credit_amount, description)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [
        debitItemCode,
        journalCode,
        debitAccountCode,
        amount,
        `Payment to supplier for PO ${poCode}`
      ]
    );

    // Insert journal items - Credit: Bank
    const creditItemCode = `JNI-${Date.now()}-2`;
    await query(
      `INSERT INTO journal_items 
       (journal_item_code, journal_code, account_code, debit_amount, credit_amount, description)
       VALUES (?, ?, ?, 0, ?, ?)`,
      [
        creditItemCode,
        journalCode,
        creditAccountCode,
        amount,
        `Bank payment for PO ${poCode} - ${bankAccount[0].bank_name}`
      ]
    );

    // Update PO dengan journal info
    await query(
      `UPDATE purchase_orders 
       SET journal_code = ?, accounting_status = 'posted'
       WHERE po_code = ?`,
      [journalCode, poCode]
    );

    // Update AP status to paid
    await query(
      `UPDATE accounts_payable 
       SET status = 'paid', outstanding_amount = 0
       WHERE po_code = ?`,
      [poCode]
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (audit_code, user_code, user_name, action, resource_type, resource_code, resource_name, notes)
       VALUES (?, ?, ?, 'post_journal', 'journal_entry', ?, ?, ?)`,
      [
        `AUD-${Date.now()}`,
        decoded.user_code,
        decoded.name,
        journalCode,
        `Journal Entry ${journalCode}`,
        `Auto-posted journal entry for payment ${paymentCode}`
      ]
    );

    return { journalCode, debitAccountCode, creditAccountCode };
  } catch (error) {
    console.error('Create journal entry error:', error);
    throw error;
  }
}

// ================================
// GET ALL SUPPLIERS ENDPOINT
// ================================
async function handleGetSuppliers(decoded) {
  try {
    const suppliers = await query(
      `SELECT 
        supplier_code,
        supplier_name,
        contact_person,
        phone,
        email,
        bank_name,
        account_number
       FROM suppliers 
       WHERE status = 'active' AND is_deleted = FALSE
       ORDER BY supplier_name`
    );

    return Response.json({
      success: true,
      data: suppliers
    });

  } catch (error) {
    console.error('Get suppliers error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ================================
// GET ALL BANK ACCOUNTS ENDPOINT
// ================================
async function handleGetBankAccounts(decoded) {
  try {
    const bankAccounts = await query(
      `SELECT 
        account_code,
        bank_name,
        account_number,
        account_holder,
        branch,
        currency
       FROM bank_accounts 
       WHERE is_active = 1 AND is_deleted = 0
       ORDER BY bank_name, account_number`
    );

    return Response.json({
      success: true,
      data: bankAccounts
    });

  } catch (error) {
    console.error('Get bank accounts error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
    const endpoint = searchParams.get('endpoint');

    // Handle suppliers endpoint
    if (endpoint === 'suppliers') {
      return await handleGetSuppliers(decoded);
    }

    // Handle bank accounts endpoint
    if (endpoint === 'bank-accounts') {
      return await handleGetBankAccounts(decoded);
    }

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
        po.ap_code,
        po.journal_code,
        po.accounting_status,
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
          po_code,
          so_code,
          so_reference,
          supplier_name,
          amount,
          payment_date,
          payment_method,
          bank_name,
          account_number,
          reference_number,
          notes,
          status,
          created_at
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
      
      // Get all files - FIXED: Gunakan check yang compatible dengan Node.js
      const fileFields = formData.getAll('files');
      files = fileFields.filter(file => {
        return file && typeof file === 'object' && 'size' in file && file.size > 0;
      });
      
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

    // Get company info untuk number sequence
    const companyInfo = await query(
      'SELECT company_code FROM companies WHERE is_deleted = FALSE LIMIT 1'
    );
    const companyCode = companyInfo.length > 0 ? companyInfo[0].company_code : 'COMPANY';

    // Get project info jika ada
    let projectCode = null;
    if (so_code) {
      const soInfo = await query(
        'SELECT project_code FROM sales_orders WHERE so_code = ? AND is_deleted = FALSE',
        [so_code]
      );
      projectCode = soInfo.length > 0 ? soInfo[0].project_code : null;
    }

    // Generate PO code menggunakan advanced number sequence
    const sequence = await getNextSequence('PO', companyCode, projectCode, null, null);
    const poCode = `${sequence.prefix}${String(sequence.number).padStart(4, '0')}`;

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (item.purchase_price * item.quantity), 0);

    // Insert purchase order
    await query(
      `INSERT INTO purchase_orders 
       (po_code, so_code, so_reference, supplier_name, supplier_contact, supplier_bank, 
        total_amount, notes, priority, customer_ref, status, submitted_by, submitted_date, submitted_time) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, CURDATE(), CURTIME())`,
      [
        poCode, so_code, so_reference || so_code, supplier_name, supplier_contact, supplier_bank,
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

    // HANDLE FILE UPLOADS JIKA ADA - FIXED VERSION
    if (files.length > 0) {
      for (let file of files) {
        const timestamp = Date.now();
        const originalName = file.name || `po_file_${timestamp}.pdf`;
        const fileExtension = originalName.split('.').pop() || 'pdf';
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
            originalName,
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
        
        // ✅ AUTO CREATE AP INVOICE ketika PO approved finance
        const poInfo = await query(
          'SELECT supplier_name, total_amount FROM purchase_orders WHERE po_code = ?',
          [po_code]
        );
        
        if (poInfo.length > 0) {
          await createAPInvoice(po_code, poInfo[0].supplier_name, poInfo[0].total_amount, decoded);
        }
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
      so_reference = null,
      company_bank_code // NEW: Bank company yang dipilih
    } = paymentData;

    // Validasi required fields
    if (!po_code || !payment_method || !payment_date || !reference_number || !amount || !supplier_name) {
      return Response.json(
        { error: 'PO code, payment method, payment date, reference number, amount, and supplier name are required' },
        { status: 400 }
      );
    }

    // Validasi: untuk transfer wajib pilih bank company
    if (payment_method === 'transfer' && !company_bank_code) {
      return Response.json(
        { error: 'Company bank account is required for transfer payment' },
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

    // Get company info untuk number sequence
    const companyInfo = await query(
      'SELECT company_code FROM companies WHERE is_deleted = FALSE LIMIT 1'
    );
    const companyCode = companyInfo.length > 0 ? companyInfo[0].company_code : 'COMPANY';

    // Generate payment code menggunakan advanced number sequence
    const sequence = await getNextSequence('PAY', companyCode, null, null, null);
    const paymentCode = `${sequence.prefix}${String(sequence.number).padStart(4, '0')}`;

    // Get bank account details untuk company bank
    let companyBankInfo = null;
    if (company_bank_code) {
      const bankInfo = await query(
        'SELECT bank_name, account_number, account_holder FROM bank_accounts WHERE account_code = ? AND is_active = 1 AND is_deleted = 0',
        [company_bank_code]
      );
      companyBankInfo = bankInfo.length > 0 ? bankInfo[0] : null;
    }

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

    // ✅ AUTO CREATE JOURNAL ENTRY untuk payment
    if (company_bank_code) {
      await createJournalEntryForPayment(paymentCode, po_code, amount, company_bank_code, decoded);
    }

    // Handle file uploads untuk payment documents - FIXED VERSION
    const fileFields = formData.getAll('files');
    
    // FIX: Gunakan check yang compatible dengan Node.js environment
    const files = fileFields.filter(file => {
      // Di Node.js, file dari formData memiliki type dan size properties
      return file && typeof file === 'object' && 'size' in file && file.size > 0;
    });

    if (files.length > 0) {
      for (let file of files) {
        const timestamp = Date.now();
        const originalName = file.name || `payment_doc_${timestamp}.pdf`;
        const fileExtension = originalName.split('.').pop() || 'pdf';
        const filename = `payment_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
        
        // Save file ke public/uploads/payments
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'payments');
        await mkdir(uploadDir, { recursive: true });
        
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);

        // Determine file type
        let fileType = 'proof';
        const lowerName = originalName.toLowerCase();
        if (lowerName.includes('invoice')) {
          fileType = 'invoice';
        } else if (lowerName.includes('receipt') || lowerName.includes('bukti')) {
          fileType = 'proof';
        }

        // Insert payment attachment
        const attachmentCode = `PAYATT-${timestamp}`;
        await query(
          `INSERT INTO purchase_order_attachments 
           (payment_doc_code, payment_code, name, type, filename) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            attachmentCode,
            paymentCode,
            originalName,
            fileType,
            filename
          ]
        );
      }
    }

    // Update temporary attachments (jika ada)
    if (files.length > 0) {
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
      `Payment created for PO ${po_code} using company bank ${companyBankInfo?.bank_name || 'N/A'}`
    );

    return Response.json({
      success: true,
      message: `Payment created successfully with ${files.length} documents`,
      payment_code: paymentCode,
      company_bank_used: companyBankInfo ? {
        bank_name: companyBankInfo.bank_name,
        account_number: companyBankInfo.account_number
      } : null
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
      whereClause += ' AND (so.so_code LIKE ? OR so.customer_name LIKE ? OR so.customer_phone LIKE ?)';
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