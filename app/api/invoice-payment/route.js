// app/api/invoice-payment/route.js
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

// Helper function untuk save file
async function saveFile(file, category) {
  try {
    if (!file || !file.name) {
      throw new Error('Invalid file object');
    }
    
    const timestamp = Date.now();
    const originalName = file.name || 'unnamed_file';
    const fileExtension = originalName.split('.').pop() || 'pdf';
    const filename = `${category}_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
    
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'invoices');
    await mkdir(uploadDir, { recursive: true });
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    return filename;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
}

// Helper function untuk get company info dengan fallback
async function getCompanyInfoFromProject(projectCode) {
  try {
    let result = [];
    
    if (projectCode) {
      result = await query(
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
    }

    if (result.length === 0) {
      // Fallback: get default company
      result = await query(
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
    }

    return result.length > 0
      ? result[0]
      : {
          company_code: "COMPANY",
          company_name: "PT. PERUSAHAAN ANDA",
          company_address: "Alamat Perusahaan",
          company_phone: "(021) 12345678",
          company_email: "info@perusahaan.com",
          company_website: "www.perusahaan.com",
          logo_url: null,
          tax_id: null,
        };
  } catch (error) {
    console.error("Error getting company info:", error);
    return {
      company_code: "COMPANY",
      company_name: "PT. PERUSAHAAN ANDA",
      company_address: "Alamat Perusahaan",
      company_phone: "(021) 12345678",
      company_email: "info@perusahaan.com",
      company_website: "www.perusahaan.com",
      logo_url: null,
      tax_id: null,
    };
  }
}

// Helper function untuk get logo base64 dengan error handling
async function getLogoBase64(logoPath) {
  try {
    if (!logoPath) {
      return null;
    }
    
    let actualPath = logoPath;
    
    // Handle path
    if (actualPath.startsWith('/')) {
      actualPath = actualPath.substring(1);
    }
    
    // Build full path
    const fullPath = path.join(process.cwd(), 'public', actualPath);
    
    // Check if file exists
    try {
      await readFile(fullPath);
    } catch {
      return null; // File tidak ada, return null
    }
    
    const logoBuffer = await readFile(fullPath);
    
    if (logoBuffer.length === 0) {
      return null; // File kosong
    }
    
    const fileExtension = logoPath.split('.').pop() || 'png';
    const base64 = `data:image/${fileExtension};base64,${logoBuffer.toString('base64')}`;
    
    return base64;
  } catch (error) {
    console.error('Failed to load logo:', error.message);
    return null;
  }
}

// ================================
// PDF GENERATOR FOR INVOICE
// ================================

async function generateInvoicePDF(exportData, user) {
  try {
    const { 
      sales_order = {}, 
      items = [], 
      taxes = [], 
      purchase_orders = [], 
      payment = null, 
      company_info = {} 
    } = exportData;

    // Safe data extraction
    const so = sales_order || {};
    const userData = user || { name: 'System' };
    const company = company_info || {};

    // Get logo base64 jika ada
    let logoBase64 = null;
    if (company?.logo_url) {
      logoBase64 = await getLogoBase64(company.logo_url);
    }

    // Format currency dengan fallback
    const formatCurrency = (amount) => {
      const numAmount = Number(amount) || 0;
      return new Intl.NumberFormat("id-ID").format(numAmount);
    };

    // Format date dengan fallback
    const formatDate = (dateString) => {
      if (!dateString) return "-";
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        return date.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
      } catch (error) {
        return dateString;
      }
    };

    // Calculate totals dengan safety checks
    const subtotal = (items || []).reduce((sum, item) => {
      const quantity = Number(item?.quantity) || 0;
      const unitPrice = Number(item?.unit_price) || 0;
      return sum + (quantity * unitPrice);
    }, 0);
    
    const taxTotal = (taxes || []).reduce((sum, tax) => {
      return sum + (Number(tax?.tax_amount) || 0);
    }, 0);
    
    const shippingCost = Number(so?.shipping_cost) || 0;
    const totalAmount = subtotal + taxTotal + shippingCost;

    // Get total cost dari POs
    const totalCost = (purchase_orders || []).reduce((sum, po) => {
      return sum + (Number(po?.total_amount) || 0);
    }, 0);
    
    const totalProfit = totalAmount - totalCost;
    const profitMargin = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;

    // Generate invoice number dengan fallback
    const invoiceNumber = payment?.invoice_number || 
                         so?.invoiceNumber || 
                         `INV-${so?.so_code || 'UNKNOWN'}-${new Date().getFullYear()}`;

    // Safe string untuk HTML
    const safeString = (str) => {
      if (str === null || str === undefined) return '';
      return String(str).replace(/[&<>"']/g, function(m) {
        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }[m];
      });
    };

    // HTML Content dengan semua data yang aman
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
            color: #333;
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
          }
          .document-code { 
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
            word-break: break-word;
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
            vertical-align: top;
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
          .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
          }
          .page-break { page-break-before: always; }
          .notes-box {
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 4px;
            margin-top: 10px;
            word-break: break-word;
          }
          .paid-badge {
            background-color: #d4edda;
            color: #155724;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            display: inline-block;
          }
          .pending-badge {
            background-color: #fff3cd;
            color: #856404;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            display: inline-block;
          }
          .no-data {
            color: #999;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <!-- HEADER -->
        <div class="header">
          ${logoBase64 ? `<img class="logo" src="${logoBase64}" alt="Company Logo">` : ""}
          <div class="company-info">
            <div class="company-name">${safeString(company.company_name || 'INVOICE')}</div>
            <div class="company-contact">
              ${company.company_phone ? `Telp: ${safeString(company.company_phone)}` : ''}
              ${company.company_email ? ` | Email: ${safeString(company.company_email)}` : ''}
              ${company.tax_id ? ` | NPWP: ${safeString(company.tax_id)}` : ''}
            </div>
            <div class="company-address">${safeString(company.company_address || '')}</div>
          </div>
        </div>
        
        <!-- TITLE -->
        <div class="document-info">
          <div class="document-code">${safeString(invoiceNumber)}</div>
        </div>
        
        <!-- CUSTOMER & INVOICE INFO -->
        <div class="section">
          <div class="section-title">Informasi Invoice</div>
          <div class="grid">
            <div>
              <div class="value"><span class="label">No. Invoice:</span> ${safeString(invoiceNumber)}</div>
              <div class="value"><span class="label">No. SO:</span> ${safeString(so.so_code || '-')}</div>
              <div class="value"><span class="label">Tanggal SO:</span> ${formatDate(so.date)}</div>
              <div class="value"><span class="label">Nama Pelanggan:</span> ${safeString(so.customer_name || '-')}</div>
              <div class="value"><span class="label">No. HP:</span> ${safeString(so.customer_phone || '-')}</div>
              <div class="value"><span class="label">Email:</span> ${safeString(so.customer_email || '-')}</div>
            </div>
            <div>
              <div class="value"><span class="label">Alamat Tagih:</span> 
                <div class="notes-box">${safeString(so.billing_address || 'Tidak ada alamat')}</div>
              </div>
              <div class="value"><span class="label">Sales Rep:</span> ${safeString(so.sales_rep || '-')}</div>
              <div class="value"><span class="label">Status Pembayaran:</span> 
                ${payment ? `<span class="paid-badge">LUNAS</span>` : `<span class="pending-badge">BELUM LUNAS</span>`}
              </div>
              ${payment ? `
                <div class="value"><span class="label">Tanggal Bayar:</span> ${formatDate(payment.payment_date)}</div>
                <div class="value"><span class="label">Metode Bayar:</span> ${safeString(payment.payment_method || '-')}</div>
                <div class="value"><span class="label">No. Referensi:</span> ${safeString(payment.reference_number || '-')}</div>
              ` : ''}
            </div>
          </div>
        </div>
        
        <!-- ITEMS TABLE -->
        <div class="section">
          <div class="section-title">Daftar Barang/Jasa</div>
          ${items.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Deskripsi Barang/Jasa</th>
                  <th>Kode</th>
                  <th>Qty</th>
                  <th>Harga Satuan</th>
                  <th class="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${safeString(item.product_name || 'N/A')}</td>
                    <td>${safeString(item.product_code || 'N/A')}</td>
                    <td>${safeString(item.quantity || '0')}</td>
                    <td>Rp ${formatCurrency(item.unit_price || 0)}</td>
                    <td class="amount">Rp ${formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <div class="notes-box no-data">
              Tidak ada data barang/jasa
            </div>
          `}
        </div>
        
        <!-- TAXES SECTION -->
        <div class="section">
          <div class="section-title">Rincian Pajak</div>
          ${taxes.length > 0 ? `
            <div class="notes-box">
              ${taxes.map(tax => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span>${safeString(tax.tax_name || 'Pajak')} (${formatCurrency(tax.tax_rate || 0)}%):</span>
                  <span>Rp ${formatCurrency(tax.tax_amount || 0)}</span>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="notes-box no-data">
              Tidak ada data pajak
            </div>
          `}
        </div>
        
        <!-- TOTALS SECTION -->
        <div class="section">
          <div class="section-title">Ringkasan Tagihan</div>
          <table style="width: 300px; margin-left: auto;">
            <tr>
              <td>Subtotal Barang:</td>
              <td class="amount">Rp ${formatCurrency(subtotal)}</td>
            </tr>
            
            ${taxes.map(tax => `
              <tr>
                <td>${safeString(tax.tax_name || 'Pajak')} (${formatCurrency(tax.tax_rate || 0)}%):</td>
                <td class="amount">Rp ${formatCurrency(tax.tax_amount || 0)}</td>
              </tr>
            `).join('')}
            
            ${shippingCost > 0 ? `
              <tr>
                <td>Biaya Pengiriman:</td>
                <td class="amount">Rp ${formatCurrency(shippingCost)}</td>
              </tr>
            ` : ''}
            
            <tr class="total-row">
              <td><strong>TOTAL TAGIHAN:</strong></td>
              <td class="amount"><strong>Rp ${formatCurrency(totalAmount)}</strong></td>
            </tr>
            
            ${payment ? `
              <tr>
                <td>Jumlah Dibayar:</td>
                <td class="amount">Rp ${formatCurrency(payment.amount || 0)}</td>
              </tr>
              <tr>
                <td>Status:</td>
                <td class="amount"><span class="paid-badge">LUNAS</span></td>
              </tr>
            ` : `
              <tr>
                <td>Status:</td>
                <td class="amount"><span class="pending-badge">BELUM LUNAS</span></td>
              </tr>
            `}
          </table>
        </div>
        
        <!-- SIGNATURES -->
        <div style="clear: both; margin-top: 50px;">
          <div class="signature">
            <div style="margin-bottom: 60px;">Diterima oleh Pelanggan,</div>
            <div class="signature-line"></div>
            <div style="margin-top: 5px; font-weight: bold;">${safeString(so.customer_name || 'Pelanggan')}</div>
            <div style="font-size: 11px; color: #95a5a6;">Tanda Tangan & Stempel</div>
          </div>
          
          <div class="signature-left">
            <div style="margin-bottom: 60px;">Disetujui oleh,</div>
            <div class="signature-line"></div>
            <div style="margin-top: 5px; font-weight: bold;">${safeString(userData.name)}</div>
            <div style="font-size: 11px; color: #95a5a6;">${safeString(company.company_name || 'Perusahaan')}</div>
          </div>
        </div>
        
        <!-- FOOTER -->
        <div class="footer">
          <div>Dokumen ini dicetak oleh: ${safeString(userData.name)} pada ${new Date().toLocaleString("id-ID")}</div>
          <div>Invoice: ${safeString(invoiceNumber)} | SO: ${safeString(so.so_code || 'N/A')} | Total Items: ${items.length}</div>
          ${payment ? `<div>Status: LUNAS | Referensi: ${safeString(payment.reference_number || '-')}</div>` : ''}
        </div>
      </body>
      </html>
    `;

    return Buffer.from(htmlContent).toString("base64");
  } catch (error) {
    console.error("Invoice PDF generation error:", error);
    throw new Error("Failed to generate invoice PDF");
  }
}

// ================================
// MAIN API ENDPOINTS dengan error handling
// ================================

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
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;

    const offset = (page - 1) * limit;

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
        COALESCE((SELECT COUNT(*) FROM purchase_orders po WHERE po.so_code = so.so_code AND po.is_deleted = 0), 0) as po_count,
        COALESCE((SELECT COUNT(*) FROM delivery_orders do WHERE do.so_code = so.so_code AND do.is_deleted = 0), 0) as do_count
      FROM sales_orders so
      ${whereClause}
      ORDER BY so.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    const salesOrders = await query(soQuery, params);

    // Get detailed data for each SO dengan safety checks
    for (let so of salesOrders) {
      try {
        // Get SO items
        const items = await query(
          `SELECT * FROM sales_order_items 
           WHERE so_code = ? AND is_deleted = 0 
           ORDER BY created_at`,
          [so.so_code]
        );
        so.items = items || [];

        // Get SO taxes
        const taxes = await query(
          `SELECT * FROM sales_order_taxes 
           WHERE so_code = ? AND is_deleted = 0`,
          [so.so_code]
        );
        so.taxes = taxes || [];

        // Get SO attachments
        const attachments = await query(
          `SELECT * FROM sales_order_attachments 
           WHERE so_code = ? AND is_deleted = 0`,
          [so.so_code]
        );
        so.attachments = attachments || [];

        // Get related POs
        const purchaseOrders = await query(
          `SELECT * FROM purchase_orders 
           WHERE so_code = ? AND is_deleted = 0 
           ORDER BY created_at`,
          [so.so_code]
        );
        so.purchaseOrders = purchaseOrders || [];

        // Get PO details untuk setiap PO
        for (let po of so.purchaseOrders) {
          try {
            const poItems = await query(
              `SELECT * FROM purchase_order_items 
               WHERE po_code = ? AND is_deleted = 0`,
              [po.po_code]
            );
            po.items = poItems || [];

            const payments = await query(
              `SELECT * FROM purchase_order_payments 
               WHERE po_code = ? AND is_deleted = 0`,
              [po.po_code]
            );
            po.payments = payments || [];

            const deliveryOrders = await query(
              `SELECT * FROM delivery_orders 
               WHERE JSON_CONTAINS(purchase_order_codes, ?) AND is_deleted = 0`,
              [JSON.stringify([po.po_code])]
            );
            po.deliveryOrders = deliveryOrders || [];
          } catch (poError) {
            console.error(`Error getting PO details for ${po.po_code}:`, poError);
            po.items = [];
            po.payments = [];
            po.deliveryOrders = [];
          }
        }

        // Calculate financial summary
        const totalCost = so.purchaseOrders.reduce((sum, po) => {
          return sum + (Number(po.total_amount) || 0);
        }, 0);
        
        const totalAmount = Number(so.total_amount) || 0;
        const totalProfit = totalAmount - totalCost;
        const profitMargin = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;

        so.financialSummary = {
          totalCost,
          totalProfit,
          profitMargin: parseFloat(profitMargin.toFixed(2))
        };

        // Get customer payments untuk invoice number
        const payments = await query(
          `SELECT * FROM customer_payments 
           WHERE so_code = ? AND is_deleted = 0 
           ORDER BY created_at DESC LIMIT 1`,
          [so.so_code]
        );
        
        if (payments.length > 0) {
          so.invoiceNumber = payments[0].invoice_number || null;
          so.paymentStatus = 'paid';
        } else {
          so.invoiceNumber = null;
          so.paymentStatus = 'pending';
        }
      } catch (soError) {
        console.error(`Error processing SO ${so.so_code}:`, soError);
        so.items = [];
        so.taxes = [];
        so.attachments = [];
        so.purchaseOrders = [];
        so.financialSummary = {
          totalCost: 0,
          totalProfit: 0,
          profitMargin: 0
        };
        so.invoiceNumber = null;
        so.paymentStatus = 'error';
      }
    }

    return Response.json({
      success: true,
      data: salesOrders || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('GET invoice payment error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
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

    let formData;
    try {
      formData = await request.formData();
    } catch (error) {
      return Response.json(
        { success: false, error: 'Invalid form data' },
        { status: 400 }
      );
    }

    const dataField = formData.get('data');
    
    if (!dataField) {
      return Response.json({ success: false, error: 'Missing data field' }, { status: 400 });
    }

    let paymentData;
    try {
      paymentData = JSON.parse(dataField);
    } catch (error) {
      return Response.json(
        { success: false, error: 'Invalid JSON data' },
        { status: 400 }
      );
    }

    const {
      so_code,
      invoice_number,
      payment_date,
      payment_amount,
      payment_method = 'transfer',
      bank_name = '',
      account_number = '',
      reference_number,
      notes = ''
    } = paymentData;

    // Validation dengan pesan yang jelas
    if (!so_code) {
      return Response.json({ success: false, error: 'SO code is required' }, { status: 400 });
    }
    
    if (!invoice_number) {
      return Response.json({ success: false, error: 'Invoice number is required' }, { status: 400 });
    }
    
    if (!payment_date) {
      return Response.json({ success: false, error: 'Payment date is required' }, { status: 400 });
    }
    
    if (!payment_amount || payment_amount <= 0) {
      return Response.json({ success: false, error: 'Valid payment amount is required' }, { status: 400 });
    }
    
    if (!reference_number) {
      return Response.json({ success: false, error: 'Reference number is required' }, { status: 400 });
    }

    // Check if SO exists and is ready for invoice
    const soCheck = await query(
      `SELECT so.*,
        COALESCE((SELECT COUNT(*) FROM purchase_orders po WHERE po.so_code = so.so_code AND po.is_deleted = 0 AND (po.status != 'paid' OR po.do_status != 'delivered')), 0) as pending_pos
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
        { success: false, error: 'Cannot create invoice - some purchase orders are not completed' },
        { status: 400 }
      );
    }

    // Handle payment proof upload jika ada
    let paymentProofPath = null;
    const paymentProofFile = formData.get('payment_proof');
    
    if (paymentProofFile && paymentProofFile.size > 0) {
      try {
        paymentProofPath = await saveFile(paymentProofFile, 'payment_proof');
      } catch (fileError) {
        console.error('Error saving payment proof:', fileError);
        // Lanjutkan tanpa payment proof, tidak fatal
      }
    }

    // Generate payment code
    const countResult = await query(
      'SELECT COUNT(*) as count FROM customer_payments WHERE YEAR(created_at) = YEAR(CURDATE())'
    );
    const currentCount = countResult[0]?.count || 0;
    const paymentCode = `CUSTPAY-${new Date().getFullYear()}-${String(currentCount + 1).padStart(4, '0')}`;

    // Insert customer payment
    await query(
      `INSERT INTO customer_payments 
       (payment_code, so_code, invoice_number, amount, payment_date, payment_method, 
        bank_name, account_number, reference_number, payment_proof, notes, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid')`,
      [
        paymentCode, 
        so_code, 
        invoice_number, 
        payment_amount, 
        payment_date, 
        payment_method,
        bank_name || null, 
        account_number || null, 
        reference_number,
        paymentProofPath || null, 
        notes || null
      ]
    );

    // Update SO status to completed
    await query(
      `UPDATE sales_orders 
       SET status = 'completed',
           updated_at = NOW()
       WHERE so_code = ? AND is_deleted = 0`,
      [so_code]
    );

    // Audit log
    await createAuditLog(
      decoded.user_code || 'SYSTEM',
      decoded.name || 'System',
      'pay',
      'sales_order',
      so_code,
      `Processed customer payment for invoice ${invoice_number} - Amount: ${payment_amount}`
    );

    return Response.json({
      success: true,
      message: 'Payment processed successfully and invoice created',
      payment_code: paymentCode,
      invoice_number: invoice_number,
      payment_amount: payment_amount
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

    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      return Response.json(
        { success: false, error: 'Invalid JSON request body' },
        { status: 400 }
      );
    }

    const { so_code } = requestData;

    if (!so_code) {
      return Response.json({ success: false, error: 'SO code is required' }, { status: 400 });
    }

    // Get complete SO data
    const soData = await query(
      `SELECT 
        so.*,
        COALESCE((SELECT SUM(total_amount) FROM purchase_orders WHERE so_code = so.so_code AND is_deleted = 0), 0) as total_cost
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

    // Get customer payments (latest)
    const payments = await query(
      `SELECT * FROM customer_payments 
       WHERE so_code = ? AND is_deleted = 0 
       ORDER BY created_at DESC LIMIT 1`,
      [so_code]
    );

    // Get company info
    const companyInfo = await getCompanyInfoFromProject(so.project_code || null);

    const exportData = {
      sales_order: so,
      items: items || [],
      taxes: taxes || [],
      purchase_orders: purchaseOrders || [],
      payment: payments.length > 0 ? payments[0] : null,
      company_info: companyInfo
    };

    // Generate PDF
    const pdfBase64 = await generateInvoicePDF(exportData, decoded);

    const invoiceNumber = payments.length > 0 
      ? payments[0].invoice_number 
      : `INV-${so.so_code}-${new Date().getTime().toString().slice(-6)}`;

    return Response.json({
      success: true,
      data: {
        pdf_base64: pdfBase64,
        invoice_number: invoiceNumber,
        sales_order: so,
        items_count: items?.length || 0,
        taxes_count: taxes?.length || 0,
        purchase_orders_count: purchaseOrders?.length || 0,
        has_payment: payments.length > 0
      },
      message: `Invoice PDF generated successfully for ${so.so_code}`
    });

  } catch (error) {
    console.error('PUT invoice export error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}