// app/api/approval-transactions/route.js - FINAL FIXED VERSION
import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';
import { readFile, access } from 'fs/promises';
import path from 'path';

// Helper untuk cek file
async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Helper untuk resolve file path - DIUPDATE
async function resolveFilePath(filePath) {
  if (!filePath) {
    console.log('⚠️ No file path provided');
    return null;
  }
  
  console.log('🔍 Resolving:', filePath);
  
  // Normalize path
  let normalizedPath = filePath;
  
  // Jika path dimulai dengan http, kita ambil filename saja
  if (filePath.startsWith('http')) {
    try {
      const url = new URL(filePath);
      normalizedPath = path.basename(url.pathname);
      console.log('🌐 Extracted filename from URL:', normalizedPath);
    } catch (e) {
      console.log('⚠️ Invalid URL, using as-is');
    }
  }
  
  // Jika path mengandung backslashes, replace dengan forward slashes
  normalizedPath = normalizedPath.replace(/\\/g, '/');
  
  // Ekstrak nama file
  const fileName = path.basename(normalizedPath);
  console.log('📄 Target filename:', fileName);
  
  // Define semua kemungkinan lokasi
  const searchLocations = [
    // Lokasi umum di project
    path.join(process.cwd(), 'public', 'uploads', fileName),
    path.join(process.cwd(), 'uploads', fileName),
    path.join(process.cwd(), 'public', fileName),
    
    // Dengan subfolder po_documents
    path.join(process.cwd(), 'public', 'uploads', 'po_documents', fileName),
    path.join(process.cwd(), 'uploads', 'po_documents', fileName),
    
    // Jika file path sudah absolute
    normalizedPath,
    
    // VPS common locations
    path.join('/var/www/html/public/uploads/', fileName),
    path.join('/var/www/html/uploads/', fileName),
    path.join('/home/ubuntu/uploads/', fileName),
    path.join('/uploads/', fileName),
    
    // Relative paths
    path.join('./public/uploads/', fileName),
    path.join('./uploads/', fileName),
    path.join('../uploads/', fileName),
    
    // Coba tanpa 'po_documents' folder
    path.join(process.cwd(), 'public', 'uploads', fileName.replace('po_document_', '')),
  ];
  
  // Remove duplicates
  const uniqueLocations = [...new Set(searchLocations.filter(p => p))];
  
  console.log(`🔍 Checking ${uniqueLocations.length} locations...`);
  
  // Cek setiap lokasi
  for (let i = 0; i < uniqueLocations.length; i++) {
    const testPath = uniqueLocations[i];
    try {
      console.log(`   [${i + 1}/${uniqueLocations.length}] Trying: ${testPath}`);
      const exists = await fileExists(testPath);
      if (exists) {
        console.log(`✅ FOUND at: ${testPath}`);
        return testPath;
      }
    } catch (err) {
      // Continue
    }
  }
  
  console.log('❌ File not found in any location');
  return null;
}

// GET handler
export async function GET(request) {
  try {
    // Auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const user = verifyToken(token);
    
    if (!user) {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const po_code = searchParams.get('po_code');
    const file_path = searchParams.get('file_path');
    
    console.log('📥 GET by', user.name, { po_code, has_file: !!file_path });
    
    // Download file
    if (file_path) {
      return await handleFileDownload(file_path);
    }
    
    // PO detail
    if (po_code) {
      return await getPODetail(po_code);
    }
    
    // All POs
    return await getAllApprovalPOs();
    
  } catch (error) {
    console.error('❌ GET error:', error.message);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Handle file download
async function handleFileDownload(file_path) {
  try {
    console.log('📥 Download request:', file_path);
    
    const resolvedPath = await resolveFilePath(file_path);
    
    if (!resolvedPath) {
      console.log('❌ File not found for path:', file_path);
      return Response.json(
        { success: false, error: 'File not found', requested_path: file_path },
        { status: 404 }
      );
    }
    
    // Baca file
    const fileBuffer = await readFile(resolvedPath);
    const fileName = path.basename(resolvedPath);
    const fileExt = path.extname(fileName).toLowerCase();
    
    // Content type
    const contentType = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
    }[fileExt] || 'application/octet-stream';
    
    console.log('✅ Serving:', fileName, 'Size:', fileBuffer.length, 'bytes');
    
    // Return file
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': fileBuffer.length.toString(),
        'X-File-Name': fileName,
        'X-File-Size': fileBuffer.length,
        'X-File-Type': contentType
      }
    });
    
  } catch (error) {
    console.error('❌ Download error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Get PO detail
async function getPODetail(po_code) {
  try {
    console.log('🔍 Getting PO:', po_code);
    
    // Query PO
    const poResult = await query(
      `SELECT 
        po.*,
        so.customer_name,
        so.customer_phone,
        so.customer_email,
        so.billing_address as customer_address,
        so.sales_rep,
        so.sales_rep_email,
        so.total_amount as so_total_amount
       FROM purchase_orders po
       LEFT JOIN sales_orders so ON po.so_code = so.so_code
       WHERE po.po_code = ? AND po.is_deleted = 0`,
      [po_code]
    );
    
    if (!poResult.length) {
      return Response.json(
        { success: false, error: 'PO not found' },
        { status: 404 }
      );
    }
    
    const po = poResult[0];
    
    // Get items
    const items = await query(
      `SELECT 
        poi.*,
        soi.unit_price as so_unit_price
       FROM purchase_order_items poi
       LEFT JOIN sales_order_items soi ON poi.product_code = soi.product_code AND soi.so_code = ?
       WHERE poi.po_code = ? AND poi.is_deleted = 0`,
      [po.so_code, po_code]
    );
    
    // Parse numbers dan hitung margin
    po.items = items.map(item => {
      const qty = parseInt(item.quantity) || 0;
      const poPrice = parseFloat(item.purchase_price) || 0;
      const soPrice = parseFloat(item.so_unit_price) || 0;
      const margin = (soPrice - poPrice) * qty;
      const marginPercent = soPrice > 0 ? ((soPrice - poPrice) / soPrice) * 100 : 0;
      
      return {
        ...item,
        quantity: qty,
        purchase_price: poPrice,
        so_unit_price: soPrice,
        margin: margin,
        margin_percentage: parseFloat(marginPercent.toFixed(2)), // NUMBER
        unique_key: `item-${item.id}-${item.product_code}`
      };
    });
    
    // Get documents
    const documents = [];
    
    // Main PO attachment
    if (po.attachment_url && po.attachment_filename) {
      documents.push({
        id: `main-${po.po_code}`,
        name: po.attachment_filename,
        type: path.extname(po.attachment_filename).replace('.', ''),
        filename: po.attachment_filename,
        file_path: po.attachment_url,
        upload_date: po.created_at,
        source: 'PO',
        document_type: 'submission',
        notes: po.attachment_notes
      });
    }
    
    // Payment attachments
    const paymentDocs = await query(
      `SELECT 
        id,
        name,
        type,
        filename,
        file_path,
        uploaded_at as upload_date
       FROM purchase_order_attachments 
       WHERE payment_code IN (
         SELECT payment_code FROM purchase_order_payments WHERE po_code = ?
       ) AND is_deleted = 0`,
      [po_code]
    );
    
    paymentDocs.forEach(doc => {
      documents.push({
        ...doc,
        source: 'PAYMENT',
        document_type: doc.type === 'invoice' ? 'invoice' : 'proof'
      });
    });
    
    po.documents = documents;
    
    console.log('✅ PO retrieved:', {
      code: po.po_code,
      items: po.items.length,
      documents: po.documents.length
    });
    
    return Response.json({
      success: true,
      data: po
    });
    
  } catch (error) {
    console.error('❌ Get PO error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Get all POs
async function getAllApprovalPOs() {
  try {
    const pos = await query(
      `SELECT 
        po.po_code,
        po.so_code,
        po.so_reference,
        po.supplier_name,
        po.supplier_contact,
        po.total_amount,
        po.status,
        po.date,
        po.priority,
        po.days_waiting,
        po.customer_ref,
        po.approval_level,
        po.approved_by_spv,
        po.approved_by_finance,
        po.approved_date_spv,
        po.approved_date_finance,
        po.is_split_po,
        po.original_so_quantity,
        po.split_sequence,
        po.created_at,
        so.customer_name,
        so.sales_rep,
        so.sales_rep_email
       FROM purchase_orders po
       LEFT JOIN sales_orders so ON po.so_code = so.so_code
       WHERE po.is_deleted = 0
       ORDER BY 
         CASE po.status
           WHEN 'submitted' THEN 1
           WHEN 'approved_spv' THEN 2
           ELSE 3
         END,
         po.created_at DESC`
    );
    
    // Hitung days waiting
    const today = new Date();
    pos.forEach(po => {
      const created = new Date(po.created_at);
      const diffDays = Math.floor((today - created) / (1000 * 60 * 60 * 24));
      po.days_waiting = Math.max(0, diffDays);
    });
    
    console.log(`✅ Found ${pos.length} POs`);
    
    return Response.json({
      success: true,
      data: pos
    });
    
  } catch (error) {
    console.error('❌ Get all POs error:', error);
    throw error;
  }
}

// PATCH handler - FIXED AUDIT LOG
export async function PATCH(request) {
  try {
    // Auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const user = verifyToken(token);
    
    if (!user) {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const body = await request.json();
    const { po_code, action, notes } = body;
    
    console.log('✏️ PATCH by', user.name, { po_code, action });
    
    if (!po_code || !action) {
      return Response.json(
        { error: 'Missing po_code or action' },
        { status: 400 }
      );
    }
    
    // Determine update
    let updateData = {};
    let newStatus = '';
    
    switch (action) {
      case 'approve_spv':
        newStatus = 'approved_spv';
        updateData = {
          status: newStatus,
          approved_by_spv: user.name,
          approved_date_spv: new Date().toISOString().split('T')[0],
          approval_level: 'finance',
          approval_notes: notes || null
        };
        break;
        
      case 'approve_finance':
        newStatus = 'approved_finance';
        updateData = {
          status: newStatus,
          approved_by_finance: user.name,
          approved_date_finance: new Date().toISOString().split('T')[0],
          approval_notes: notes || null
        };
        break;
        
      case 'reject':
        newStatus = 'rejected';
        updateData = {
          status: newStatus,
          rejection_reason: notes || null,
          approval_notes: notes || null
        };
        break;
        
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    // Build query
    const setClause = Object.keys(updateData)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = [...Object.values(updateData), po_code];
    
    // Update PO
    const result = await query(
      `UPDATE purchase_orders SET ${setClause} WHERE po_code = ? AND is_deleted = 0`,
      values
    );
    
    if (result.affectedRows === 0) {
      return Response.json(
        { error: 'PO not found' },
        { status: 404 }
      );
    }
    
    // FIXED: Audit log - gunakan kolom yang benar
    try {
      // Coba dengan notes atau description
      await query(
        `INSERT INTO audit_logs 
         (user_name, action, resource_type, resource_code, notes, created_at)
         VALUES (?, ?, 'purchase_order', ?, ?, NOW())`,
        [
          user.name,
          action.replace('_', ' '),
          po_code,
          notes || `PO ${action.replace('_', ' ')}d`
        ]
      );
    } catch (auditError) {
      console.log('⚠️ Audit log error (non-fatal):', auditError.message);
      // Continue even if audit fails
    }
    
    console.log('✅ PO updated:', po_code, '->', newStatus);
    
    return Response.json({
      success: true,
      message: `PO ${po_code} ${action.replace('_', ' ')}d successfully`
    });
    
  } catch (error) {
    console.error('❌ PATCH error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST handler
export async function POST(request) {
  try {
    // Auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const user = verifyToken(token);
    
    if (!user) {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const body = await request.json();
    const { action, file_path } = body;
    
    console.log('📤 POST by', user.name, { action, has_file: !!file_path });
    
    if (action === 'download' && file_path) {
      return await handleFileDownload(file_path);
    }
    
    return Response.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('❌ POST error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}