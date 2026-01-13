import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';

// ================================
// HELPER FUNCTIONS
// ================================

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

// Helper function untuk get company info dari project code
async function getCompanyInfoFromProject(projectCode) {
  try {
    const result = await query(
      `SELECT 
        c.company_code,
        c.name as company_name,
        c.address as company_address,
        c.phone as company_phone,
        c.email as company_email,
        c.website as company_website,
        c.logo_url,
        c.tax_id
       FROM projects p
       LEFT JOIN companies c ON p.company_code = c.company_code
       WHERE p.project_code = ? AND p.is_deleted = 0 AND c.is_deleted = 0`,
      [projectCode]
    );

    if (result.length > 0) {
      return result[0];
    }

    // Fallback: get default company
    const defaultCompany = await query(
      `SELECT 
        company_code,
        name as company_name,
        address as company_address,
        phone as company_phone,
        email as company_email,
        website as company_website,
        logo_url,
        tax_id
       FROM companies WHERE is_deleted = 0 ORDER BY id LIMIT 1`
    );

    return defaultCompany.length > 0
      ? defaultCompany[0]
      : {
          company_code: "DEFAULT",
          company_name: "PT. MAKMUR SEJAHTERA ABADI",
          company_address: "Jl. Sudirman No. 123, Jakarta Pusat",
          company_phone: "(021) 12345678",
          company_email: "info@company.com",
          company_website: "www.company.com",
          logo_url: null,
          tax_id: null,
        };
  } catch (error) {
    console.error("Error getting company info from project:", error);
    return null;
  }
}

// Helper function untuk get logo base64
async function getLogoBase64(logoPath) {
  try {
    if (!logoPath) {
      console.log('⚠️ No logo path provided');
      return null;
    }
    
    console.log('🔄 Processing logo path:', logoPath);
    
    let actualPath = logoPath;
    
    if (actualPath.startsWith('/')) {
      actualPath = actualPath.substring(1);
    }
    
    const fullPath = path.join(process.cwd(), 'public', actualPath);
    console.log('📁 Full system path:', fullPath);
    
    const logoBuffer = await readFile(fullPath);
    console.log('✅ Logo file read successfully, size:', logoBuffer.length, 'bytes');
    
    const fileExtension = logoPath.split('.').pop();
    const base64 = `data:image/${fileExtension};base64,${logoBuffer.toString('base64')}`;
    
    return base64;
  } catch (error) {
    console.error('❌ Failed to load logo:', error.message);
    console.error('Logo path was:', logoPath);
    
    return null;
  }
}

// Helper function untuk save PO document ke purchase_orders table
async function savePODocument(file, poCode, notes = '', userCode) {
  try {
    const timestamp = Date.now();
    const originalName = file.name || `po_document_${timestamp}.pdf`;
    const fileExtension = originalName.split('.').pop() || 'pdf';
    const filename = `po_document_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
    
    // Save file ke public/uploads/po_documents
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'po_documents');
    await mkdir(uploadDir, { recursive: true });
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Update purchase_orders dengan attachment info
    await query(
      `UPDATE purchase_orders 
       SET attachment_url = ?, attachment_filename = ?, attachment_notes = ?
       WHERE po_code = ?`,
      [
        `/uploads/po_documents/${filename}`,
        originalName,
        notes,
        poCode
      ]
    );

    // Audit log
    await createAuditLog(
      userCode,
      userCode,
      'upload',
      'purchase_order_submission',
      poCode,
      `Uploaded PO submission document: ${originalName}`
    );

    return {
      name: originalName,
      filename: filename,
      notes: notes,
      file_path: `/uploads/po_documents/${filename}`,
      uploaded_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Save PO document error:', error);
    throw error;
  }
}

// ================================
// PDF GENERATOR FOR PO
// ================================

async function generatePOPDF(exportData, user) {
  try {
    const { purchase_order, items, payments, company_info } = exportData;

    let logoBase64 = null;
    if (company_info.logo_url) {
      logoBase64 = await getLogoBase64(company_info.logo_url);
    }

    const formatCurrency = (amount) => {
      const numAmount = Number(amount) || 0;
      return new Intl.NumberFormat("id-ID").format(numAmount);
    };

    const formatDate = (dateString) => {
      if (!dateString) return "-";
      try {
        return new Date(dateString).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
      } catch (error) {
        return dateString;
      }
    };

    const subtotal = items.reduce((sum, item) => 
      sum + (Number(item.purchase_price) * Number(item.quantity)), 0);
    
    const totalPaid = payments.reduce((sum, payment) => 
      sum + Number(payment.amount), 0);
    
    const remainingBalance = subtotal - totalPaid;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 40px; 
            line-height: 1.6;
          }
          .header { 
            display: flex; 
            align-items: center; 
            margin-bottom: 10px; 
            border-bottom: 2px solid #2c3e50; 
            padding-bottom: 10px; 
          }
          .logo { 
            width: 160px; 
            height: 160px; 
            margin-right: 20px; 
            object-fit: contain; 
          }
          .company-info { 
            flex: 1; 
          }
          .company-name { 
            font-size: 24px; 
            font-weight: bold; 
            color: #2c3e50; 
            margin-bottom: 5px;
          }
          .company-address { 
            font-size: 12px; 
            color: #7f8c8d; 
            margin-bottom: 3px;
          }
          .company-contact { 
            font-size: 11px; 
            color: #95a5a6; 
          }
          .title { 
            text-align: center; 
            font-size: 20px; 
            margin: 30px 0; 
            font-weight: bold; 
            color: #2c3e50; 
          }
          .document-info { 
            text-align: center; 
            margin: 10px 0; 
            font-size: 18px; 
            font-weight: bold; 
            color: #3498db; 
          }
          .section { 
            margin-bottom: 20px; 
          }
          .section-title { 
            font-weight: bold; 
            margin-bottom: 10px; 
            color: #2c3e50; 
            border-bottom: 1px solid #eee; 
            padding-bottom: 5px; 
            font-size: 16px;
          }
          .grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 20px; 
            margin-bottom: 15px; 
          }
          .label { 
            font-weight: bold; 
            color: #555; 
            min-width: 150px; 
            display: inline-block; 
          }
          .value { 
            margin-bottom: 8px; 
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 10px; 
            font-size: 12px; 
          }
          th { 
            background-color: #f8f9fa; 
            padding: 10px; 
            text-align: left; 
            border: 1px solid #dee2e6; 
            color: #2c3e50; 
          }
          td { 
            padding: 10px; 
            border: 1px solid #dee2e6; 
          }
          .footer { 
            margin-top: 50px; 
            text-align: center; 
            font-size: 10px; 
            color: #95a5a6; 
            border-top: 1px solid #eee; 
            padding-top: 10px; 
          }
          .signature { 
            margin-top: 60px; 
            float: right; 
            text-align: center; 
            width: 200px;
          }
          .signature-line { 
            width: 200px; 
            border-top: 1px solid #333; 
            margin: 0 auto; 
            padding-top: 5px; 
          }
          .signature-left { 
            margin-top: 60px; 
            float: left; 
            margin-right: 100px; 
            text-align: center; 
            width: 200px;
          }
          .total-row { 
            background-color: #f8f9fa; 
            font-weight: bold; 
          }
          .amount { 
            text-align: right; 
            white-space: nowrap;
          }
          .text-right {
            text-align: right;
          }
          .page-break { page-break-before: always; }
          .notes-box {
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 4px;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <!-- HEADER -->
        <div class="header">
          ${logoBase64 ? `<img class="logo" src="${logoBase64}" alt="Company Logo">` : ""}
          <div class="company-info">
            <div class="company-name">${company_info.company_name}</div>
            <div class="company-address">${company_info.company_address}</div>
            <div class="company-contact">
              Telp: ${company_info.company_phone} | Email: ${company_info.company_email} 
              ${company_info.tax_id ? `| NPWP: ${company_info.tax_id}` : ""}
            </div>
          </div>
        </div>
        
        <!-- TITLE -->
        <div class="title">PURCHASE ORDER</div>
        <div class="document-info">${purchase_order.po_code}</div>
        
        <!-- PO INFORMATION -->
        <div class="section">
          <div class="section-title">Informasi Purchase Order</div>
          <div class="grid">
            <div>
              <div class="value"><span class="label">Nomor PO:</span> ${purchase_order.po_code}</div>
              <div class="value"><span class="label">Nomor SO:</span> ${purchase_order.so_reference}</div>
              <div class="value"><span class="label">Kontak Supplier:</span> ${purchase_order.supplier_contact || "-"}</div>
            </div>
            <div>
              <div class="value"><span class="label">Tanggal PO:</span> ${formatDate(purchase_order.date)}</div>
              <div class="value"><span class="label">Project:</span> ${purchase_order.project_code || "-"}</div>
              <div class="value"><span class="label">Supplier:</span> ${purchase_order.supplier_name}</div>
            </div>
          </div>
          
          ${purchase_order.notes ? `
            <div class="notes-box">
              <span class="label">Catatan:</span> ${purchase_order.notes}
            </div>
          ` : ""}
        </div>
        
        <!-- ITEMS TABLE -->
        <div class="section">
          <div class="section-title">Daftar Barang</div>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Barang</th>
                <th>SKU</th>
                <th>Qty</th>
                <th>Harga Satuan</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.product_name || "-"}</td>
                  <td>${item.product_code || "-"}</td>
                  <td>${item.quantity || 0}</td>
                  <td>Rp ${formatCurrency(item.purchase_price || 0)}</td>
                  <td class="amount">Rp ${formatCurrency(Number(item.purchase_price) * Number(item.quantity))}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="5" class="text-right"><strong>SUBTOTAL:</strong></td>
                <td class="amount"><strong>Rp ${formatCurrency(subtotal)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <!-- PAYMENT INFORMATION -->
        ${payments.length > 0 ? `
          <div class="section">
            <div class="section-title">Riwayat Pembayaran</div>
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Kode Pembayaran</th>
                  <th>Tanggal</th>
                  <th>Metode</th>
                  <th>Referensi</th>
                  <th class="text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                ${payments.map((payment, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${payment.payment_code || "-"}</td>
                    <td>${formatDate(payment.payment_date)}</td>
                    <td>${payment.payment_method || "-"}</td>
                    <td>${payment.reference_number || "-"}</td>
                    <td class="amount">Rp ${formatCurrency(payment.amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="5" class="text-right"><strong>TOTAL DIBAYAR:</strong></td>
                  <td class="amount"><strong>Rp ${formatCurrency(totalPaid)}</strong></td>
                </tr>
                ${remainingBalance > 0 ? `
                  <tr class="total-row" style="background-color: #fff3cd;">
                    <td colspan="5" class="text-right"><strong>SISA HUTANG:</strong></td>
                    <td class="amount"><strong>Rp ${formatCurrency(remainingBalance)}</strong></td>
                  </tr>
                ` : ''}
              </tfoot>
            </table>
          </div>
        ` : ""}
        
        <!-- BANK INFORMATION -->
        ${purchase_order.supplier_bank ? `
          <div class="section">
            <div class="section-title">Informasi Bank Supplier</div>
            <div style="padding: 15px; background-color: #e8f4fd; border-radius: 4px;">
              <div class="value"><span class="label">Bank:</span> ${purchase_order.supplier_bank}</div>
            </div>
          </div>
        ` : ""}
        
        <!-- SIGNATURES -->
        <div style="clear: both;"></div>
        
        <div class="signature">
          <div style="margin-bottom: 60px;">Disetujui oleh Supplier:</div>
          <div class="signature-line"></div>
          <div style="margin-top: 5px; font-weight: bold;">${purchase_order.supplier_name}</div>
          <div style="font-size: 11px; color: #95a5a6;">Supplier</div>
        </div>
        
        <div class="signature-left">
          <div style="margin-bottom: 60px;">Dibuat oleh:</div>
          <div class="signature-line"></div>
          <div style="margin-top: 5px; font-weight: bold;">${user.name}</div>
          <div style="font-size: 11px; color: #95a5a6;">${company_info.company_name}</div>
        </div>
        
        <!-- FOOTER -->
        <div class="footer">
          <div>Dokumen ini dicetak oleh: ${user.name} pada ${new Date().toLocaleString("id-ID")}</div>
          <div>Total: ${items.length} items</div>
        </div>
      </body>
      </html>
    `;

    return Buffer.from(htmlContent).toString("base64");
  } catch (error) {
    console.error("PO PDF generation error:", error);
    throw new Error("Failed to generate PO PDF");
  }
}

// ================================
// ENDPOINT HANDLERS
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

// ================================
// MAIN API ENDPOINTS
// ================================

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

    // Handle PDF export
    if (endpoint === 'pdf' || endpoint === 'export-pdf') {
      const poCode = searchParams.get('po_code');
      
      if (!poCode) {
        return Response.json({ error: 'PO code is required' }, { status: 400 });
      }

      try {
        // Get PO data dengan detail
        const poDetails = await query(
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
            so.customer_name,
            so.project_code,
            po.attachment_url,
            po.attachment_filename,
            po.attachment_notes
          FROM purchase_orders po
          LEFT JOIN sales_orders so ON po.so_code = so.so_code
          WHERE po.po_code = ? AND po.is_deleted = 0`,
          [poCode]
        );

        if (poDetails.length === 0) {
          return Response.json({ error: 'Purchase order not found' }, { status: 404 });
        }

        // Get items
        const items = await query(
          `SELECT 
            product_name,
            product_code,
            quantity,
            purchase_price
          FROM purchase_order_items 
          WHERE po_code = ? AND is_deleted = 0`,
          [poCode]
        );

        // Get payments
        const payments = await query(
          `SELECT 
            payment_code,
            payment_date,
            payment_method,
            reference_number,
            amount,
            status
          FROM purchase_order_payments 
          WHERE po_code = ? AND is_deleted = 0`,
          [poCode]
        );

        // Get company info
        const companyInfo = await getCompanyInfoFromProject(poDetails[0].project_code);

        // Get attachments dari purchase_orders table
        const attachments = [];
        if (poDetails[0].attachment_url && poDetails[0].attachment_filename) {
          attachments.push({
            id: `PO-ATT-${poCode}`,
            name: poDetails[0].attachment_filename,
            type: 'submission',
            filename: poDetails[0].attachment_filename,
            file_path: poDetails[0].attachment_url,
            notes: poDetails[0].attachment_notes,
            source: 'purchase_order'
          });
        }

        // Get attachments dari purchase_order_attachments untuk pembayaran
        const paymentAttachments = await query(
          `SELECT 
            payment_doc_code as id,
            name,
            type,
            filename,
            file_path,
            uploaded_at as upload_date,
            notes
          FROM purchase_order_attachments 
          WHERE payment_code IN (SELECT payment_code FROM purchase_order_payments WHERE po_code = ?)
          AND is_deleted = 0`,
          [poCode]
        );

        const exportData = {
          purchase_order: poDetails[0],
          items: items,
          payments: payments,
          attachments: [...attachments, ...paymentAttachments],
          company_info: companyInfo
        };

        // Generate PDF
        const pdfBase64 = await generatePOPDF(exportData, decoded);

        return Response.json({
          success: true,
          data: {
            pdf_base64: pdfBase64,
            ...exportData
          },
          message: `PDF generated for PO ${poCode}`
        });

      } catch (error) {
        console.error('Export PO PDF error:', error);
        return Response.json(
          { error: error.message || 'Internal server error' },
          { status: 500 }
        );
      }
    }

    // Default: Get purchase orders with pagination
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
        po.attachment_url,
        po.attachment_filename,
        po.attachment_notes,
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

    // Get items, payments, dan attachments untuk setiap purchase order
    for (let po of purchaseOrders) {
      // Get items
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

      // Get payment info
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

      // Get attachments dari purchase_orders table
      const attachments = [];
      if (po.attachment_url && po.attachment_filename) {
        attachments.push({
          id: `PO-ATT-${po.po_code}`,
          name: po.attachment_filename,
          type: 'submission',
          filename: po.attachment_filename,
          file_path: po.attachment_url,
          upload_date: po.created_at,
          notes: po.attachment_notes,
          source: 'purchase_order'
        });
      }

      // Get attachments dari purchase_order_attachments untuk pembayaran
      const paymentAttachments = await query(
        `SELECT 
          payment_doc_code as id,
          name,
          type,
          filename,
          file_path,
          uploaded_at as upload_date,
          notes
         FROM purchase_order_attachments 
         WHERE payment_code IN (SELECT payment_code FROM purchase_order_payments WHERE po_code = ?)
         AND is_deleted = FALSE`,
        [po.po_code]
      );
      
      po.attachments = [...attachments, ...paymentAttachments];
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

// CREATE purchase order dengan dukungan dokumen
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    let poData;
    let attachmentFile = null;
    let attachmentNotes = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      
      const dataField = formData.get('data');
      if (!dataField) {
        return Response.json({ error: 'Missing data field' }, { status: 400 });
      }
      
      poData = JSON.parse(dataField);
      
      const attachmentField = formData.get('attachment');
      if (attachmentField && typeof attachmentField === 'object' && 'size' in attachmentField && attachmentField.size > 0) {
        attachmentFile = attachmentField;
      }
      
      const notesField = formData.get('attachment_notes');
      if (notesField) {
        attachmentNotes = notesField;
      }
      
    } else {
      poData = await request.json();
    }

    const {
      so_code,
      so_reference,
      supplier_name,
      supplier_contact = null,
      supplier_bank = null,
      notes = null,
      items = [],
      priority = '-',
      customer_ref = null
    } = poData;

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

    let projectCode = null;
    if (so_code) {
      const soInfo = await query(
        'SELECT project_code FROM sales_orders WHERE so_code = ? AND is_deleted = FALSE',
        [so_code]
      );
      projectCode = soInfo.length > 0 ? soInfo[0].project_code : null;
    }

    // Generate PO code
    const sequence = await getNextSequence('PO', companyCode, projectCode, null, null);
    const poCode = `${sequence.prefix}${String(sequence.number).padStart(4, '0')}`;

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (item.purchase_price * item.quantity), 0);

    // Insert purchase order - INCLUDE ATTACHMENT FIELDS
    await query(
      `INSERT INTO purchase_orders 
       (po_code, so_code, so_reference, supplier_name, supplier_contact, supplier_bank, 
        total_amount, notes, priority, customer_ref, status, submitted_by, submitted_date, submitted_time,
        created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, CURDATE(), CURTIME(), ?)`,
      [
        poCode, 
        so_code, 
        so_reference || so_code, 
        supplier_name, 
        supplier_contact, 
        supplier_bank,
        totalAmount, 
        notes, 
        priority, 
        customer_ref, 
        decoded.name,
        decoded.name // created_by
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

    // AUTO-UPDATE STATUS SO
    const existingPOs = await query(
      `SELECT COUNT(*) as po_count FROM purchase_orders WHERE so_code = ? AND is_deleted = 0`,
      [so_code]
    );

    if (existingPOs[0].po_count === 1) {
      await query(
        `UPDATE sales_orders SET status = 'processing' WHERE so_code = ? AND is_deleted = 0`,
        [so_code]
      );
      
      await createAuditLog(
        decoded.user_code,
        decoded.name,
        'update',
        'sales_order',
        so_code,
        'Auto-updated to processing status - first PO created'
      );
    }

    // HANDLE ATTACHMENT FILE UPLOAD - SIMPAN LANGSUNG KE TABLE PURCHASE_ORDERS
    let uploadedDocument = null;
    if (attachmentFile) {
      try {
        // SIMPAN SEBAGAI DOKUMEN PENGAJUAN DI TABLE PURCHASE_ORDERS
        uploadedDocument = await savePODocument(
          attachmentFile, 
          poCode, 
          attachmentNotes, 
          decoded.user_code
        );
      } catch (error) {
        console.error('Error uploading PO document:', error);
      }
    }

    // Audit log untuk PO creation
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'create',
      'purchase_order',
      poCode,
      `Created new purchase order${attachmentFile ? ' with attachment' : ''}`
    );

    return Response.json({
      success: true,
      message: `Purchase order created successfully${attachmentFile ? ' with attachment document' : ''}`,
      po_code: poCode,
      attachment_uploaded: !!attachmentFile,
      so_updated: existingPOs[0].po_count === 1,
      document_info: uploadedDocument
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
        
        // AUTO CREATE AP INVOICE ketika PO approved finance
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

// PAYMENTS ENDPOINT
export async function PUT(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return Response.json({ error: 'Content-Type must be multipart/form-data' }, { status: 400 });
    }

    const formData = await request.formData();
    
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
      company_bank_code
    } = paymentData;

    if (!po_code || !payment_method || !payment_date || !reference_number || !amount || !supplier_name) {
      return Response.json(
        { error: 'PO code, payment method, payment date, reference number, amount, and supplier name are required' },
        { status: 400 }
      );
    }

    if (payment_method === 'transfer' && !company_bank_code) {
      return Response.json(
        { error: 'Company bank account is required for transfer payment' },
        { status: 400 }
      );
    }

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

    const companyInfo = await query(
      'SELECT company_code FROM companies WHERE is_deleted = FALSE LIMIT 1'
    );
    const companyCode = companyInfo.length > 0 ? companyInfo[0].company_code : 'COMPANY';

    const sequence = await getNextSequence('PAY', companyCode, null, null, null);
    const paymentCode = `${sequence.prefix}${String(sequence.number).padStart(4, '0')}`;

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

    // AUTO CREATE JOURNAL ENTRY untuk payment
    if (company_bank_code) {
      await createJournalEntryForPayment(paymentCode, po_code, amount, company_bank_code, decoded);
    }

    // Handle file uploads untuk payment documents (bukti bayar/invoice)
    const fileFields = formData.getAll('files');
    
    const files = fileFields.filter(file => {
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

        let fileType = 'proof';
        const lowerName = originalName.toLowerCase();
        if (lowerName.includes('invoice')) {
          fileType = 'invoice';
        } else if (lowerName.includes('receipt') || lowerName.includes('bukti')) {
          fileType = 'proof';
        }

        // Insert payment attachment ke purchase_order_attachments
        const attachmentCode = `PAYATT-${timestamp}-${Math.random().toString(36).substr(2, 6)}`;
        await query(
          `INSERT INTO purchase_order_attachments 
           (payment_doc_code, payment_code, name, type, filename, file_path) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            attachmentCode,
            paymentCode,
            originalName,
            fileType,
            filename,
            `/uploads/payments/${filename}`
          ]
        );
      }
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

// SALES ORDERS ENDPOINT
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