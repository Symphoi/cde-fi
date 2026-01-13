import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

// Helper function untuk generate number sequence
async function getNextSequence(sequenceCode, companyCode, projectCode, salesRepCode, customerCode) {
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
async function createAPInvoice(poCode, userName) {
  try {
    // Get PO data
    const poData = await query(
      `SELECT supplier_name, total_amount, so_code 
       FROM purchase_orders WHERE po_code = ?`,
      [poCode]
    );

    if (poData.length === 0) {
      throw new Error('PO not found');
    }

    const po = poData[0];
    
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
        po.supplier_name,
        invoiceNumber,
        currentDate.toISOString().split('T')[0],
        dueDate.toISOString().split('T')[0],
        po.total_amount,
        po.total_amount,
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
        'SYSTEM', // Karena auto-created
        userName,
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

// Helper function untuk create delivery order otomatis
async function createDeliveryOrder(po_code, created_by) {
  try {
    // Get PO data untuk DO
    const poData = await query(
      `SELECT po_code, so_code, supplier_name, total_amount 
       FROM purchase_orders WHERE po_code = ?`,
      [po_code]
    );

    if (poData.length === 0) return;

    const po = poData[0];
    
    // Generate DO code
    const countResult = await query('SELECT COUNT(*) as count FROM delivery_orders');
    const do_code = `DO-${new Date().getFullYear()}-${String(countResult[0].count + 1).padStart(4, '0')}`;

    // Create delivery order
    await query(
      `INSERT INTO delivery_orders (do_code, po_code, so_code, status, created_at)
       VALUES (?, ?, ?, 'shipping', NOW())`,
      [do_code, po.po_code, po.so_code]
    );

    // Update PO dengan DO info
    await query(
      `UPDATE purchase_orders SET do_code = ?, do_status = 'created' WHERE po_code = ?`,
      [do_code, po_code]
    );

    console.log(`Auto-created DO: ${do_code} for PO: ${po_code}`);

  } catch (error) {
    console.error('Create delivery order error:', error);
    // Jangan throw error, karena ini secondary action
  }
}

// GET all approval transactions atau single PO detail
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const po_code = searchParams.get('po_code');

    // Jika ada po_code, return single PO detail
    if (po_code) {
      return await getPODetail(po_code);
    }

    // Jika tidak ada po_code, return semua PO untuk approval
    return await getAllApprovalPOs();

  } catch (error) {
    console.error('Get approval transactions error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get semua PO untuk approval (semua status)
async function getAllApprovalPOs() {
  try {
    // Get semua purchase orders tanpa filter status
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
        po.created_at,
        so.customer_name,
        so.customer_phone,
        so.customer_email,
        so.sales_rep,
        so.sales_rep_email
       FROM purchase_orders po
       LEFT JOIN sales_orders so ON po.so_code = so.so_code
       WHERE po.is_deleted = FALSE
       ORDER BY 
         CASE 
           WHEN po.status = 'submitted' THEN 1
           WHEN po.status = 'approved_spv' THEN 2
           ELSE 3
         END,
         po.created_at DESC`
    );

    // Get items count untuk setiap PO
    for (let po of purchaseOrders) {
      const itemsCount = await query(
        `SELECT COUNT(*) as count FROM purchase_order_items 
         WHERE po_code = ? AND is_deleted = FALSE`,
        [po.po_code]
      );
      po.items_count = itemsCount[0]?.count || 0;

      // Hitung days waiting
      const createdDate = new Date(po.created_at);
      const today = new Date();
      const diffTime = Math.abs(today - createdDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      po.days_waiting = diffDays - 1; // Adjust untuk hari ini
    }

    return Response.json({
      success: true,
      data: purchaseOrders
    });

  } catch (error) {
    console.error('Get all approval POs error:', error);
    throw error;
  }
}

// Get single PO detail dengan semua data lengkap
// Get single PO detail dengan semua data lengkap
async function getPODetail(po_code) {
  try {
    // Get purchase order data
    const poResult = await query(
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
        po.created_at,
        po.attachment_url,
        po.attachment_filename,
        po.attachment_notes,
        so.customer_name,
        so.customer_phone,
        so.customer_email,
        so.billing_address as customer_address,
        so.sales_rep,
        so.sales_rep_email,
        so.total_amount as so_total_amount
       FROM purchase_orders po
       LEFT JOIN sales_orders so ON po.so_code = so.so_code
       WHERE po.po_code = ? AND po.is_deleted = FALSE`,
      [po_code]
    );

    if (poResult.length === 0) {
      return Response.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    const po = poResult[0];

    // Get PO items dengan price comparison
    const poItems = await query(
      `SELECT 
        poi.po_item_code,
        poi.product_name,
        poi.product_code,
        poi.quantity,
        poi.purchase_price,
        poi.notes,
        soi.unit_price as so_unit_price,
        soi.subtotal as so_subtotal
       FROM purchase_order_items poi
       LEFT JOIN sales_order_items soi ON poi.product_code = soi.product_code AND soi.so_code = ?
       WHERE poi.po_code = ? AND poi.is_deleted = FALSE`,
      [po.so_code, po_code]
    );

    // Calculate margin untuk setiap item
    po.items = poItems.map(item => {
      const soUnitPrice = item.so_unit_price || 0;
      const margin = (soUnitPrice - item.purchase_price) * item.quantity;
      const marginPercentage = soUnitPrice > 0 ? ((soUnitPrice - item.purchase_price) / soUnitPrice) * 100 : 0;
      
      return {
        ...item,
        so_unit_price: soUnitPrice,
        margin: margin,
        margin_percentage: marginPercentage
      };
    });

    // Perbaikan query attachments - ambil dari purchase_order_attachments
    const poAttachments = await query(
      `SELECT 
        id,
        payment_doc_code,
        name,
        type,
        filename,
        file_path,
        uploaded_at as upload_date
       FROM purchase_order_attachments 
       WHERE po_code = ? 
       AND is_deleted = FALSE`,
      [po_code]
    );

    // Get attachments dari kolom attachment di purchase_orders
    let documents = [];

    // 1. Tambahkan attachment dari kolom purchase_orders (jika ada)
    if (po.attachment_url) {
      documents.push({
        id: 'po-main-attachment',
        name: po.attachment_filename || 'PO Main Document',
        type: po.attachment_filename?.split('.').pop()?.toLowerCase() || 'pdf',
        filename: po.attachment_filename,
        file_path: po.attachment_url,
        upload_date: po.created_at,
        source: 'PO',
        is_main: true,
        notes: po.attachment_notes
      });
    }

    // 2. Tambahkan attachments dari table purchase_order_attachments
    documents = documents.concat(
      poAttachments.map(doc => ({
        id: doc.id || doc.payment_doc_code,
        name: doc.name || 'Attachment',
        type: doc.type || 'pdf',
        filename: doc.filename,
        file_path: doc.file_path || doc.filename, // fallback
        upload_date: doc.upload_date,
        source: 'PO'
      }))
    );

    po.documents = documents;

    // Get split PO information jika ada
    const splitInfo = await query(
      `SELECT 
        COUNT(*) as total_splits,
        SUM(quantity) as total_quantity
       FROM purchase_orders po
       JOIN purchase_order_items poi ON po.po_code = poi.po_code
       WHERE po.so_code = ? AND po.is_deleted = FALSE AND poi.is_deleted = FALSE
       GROUP BY po.so_code`,
      [po.so_code]
    );

    if (splitInfo.length > 0) {
      po.is_split_po = splitInfo[0].total_splits > 1;
      po.original_so_quantity = splitInfo[0].total_quantity;
      
      // Get split sequence
      const sequenceResult = await query(
        `SELECT COUNT(*) as sequence 
         FROM purchase_orders 
         WHERE so_code = ? AND created_at <= ? AND is_deleted = FALSE 
         ORDER BY created_at`,
        [po.so_code, po.created_at]
      );
      po.split_sequence = sequenceResult[0]?.sequence || 1;
    }

    // Hapus kolom attachment individual dari response jika mau lebih clean
    delete po.attachment_url;
    delete po.attachment_filename;
    delete po.attachment_notes;

    return Response.json({
      success: true,
      data: po
    });

  } catch (error) {
    console.error('Get PO detail error:', error);
    throw error;
  }
}

// PATCH untuk approve/reject PO
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
    let updateApprovalLevel = false;
    let newApprovalLevel = null;

    switch (action) {
      case 'approve_spv':
        newStatus = 'approved_spv';
        approvalField = 'approved_by_spv';
        approvalDateField = 'approved_date_spv';
        auditAction = 'approve';
        updateApprovalLevel = true;
        newApprovalLevel = 'finance';
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

    // Update approval_level jika needed
    if (updateApprovalLevel && newApprovalLevel) {
      queryStr += `, approval_level = ?`;
      params.push(newApprovalLevel);
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

    // Jika approve finance, auto create delivery order DAN AP invoice
    if (action === 'approve_finance') {
      await createDeliveryOrder(po_code, decoded.name);
      await createAPInvoice(po_code, decoded.name);
    }

    // Audit log
    await query(
      `INSERT INTO audit_logs (audit_code, user_code, user_name, action, resource_type, resource_code, resource_name, notes)
       VALUES (?, ?, ?, ?, 'purchase_order', ?, ?, ?)`,
      [
        `AUD-${Date.now()}`,
        decoded.user_code,
        decoded.name,
        auditAction,
        po_code,
        `Purchase Order ${po_code}`,
        `${auditAction === 'reject' ? 'Rejected' : 'Approved'} purchase order${notes ? ': ' + notes : ''}`
      ]
    );

    return Response.json({
      success: true,
      message: `Purchase order ${auditAction === 'reject' ? 'rejected' : 'approved'} successfully`
    });

  } catch (error) {
    console.error('Update approval error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}