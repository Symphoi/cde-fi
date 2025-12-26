import { query } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/auth";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";

// Helper function untuk save file
async function saveFile(file, category) {
  const timestamp = Date.now();
  const fileExtension = file.name.split(".").pop();
  const filename = `${category}_${timestamp}_${Math.random()
    .toString(36)
    .substr(2, 9)}.${fileExtension}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", "delivery");
  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);

  return filename;
}

// Helper function untuk audit log
async function createAuditLog(
  userCode,
  userName,
  action,
  resourceType,
  resourceCode,
  notes
) {
  try {
    const auditCode = `AUD-${Date.now()}`;
    await query(
      `INSERT INTO audit_logs (audit_code, user_code, user_name, action, resource_type, resource_code, resource_name, notes, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        auditCode,
        userCode,
        userName,
        action,
        resourceType,
        resourceCode,
        `${resourceType} ${resourceCode}`,
        notes,
      ]
    );
  } catch (error) {
    console.error("Error creating audit log:", error);
  }
}

// Helper function untuk cek item coverage SO
async function checkSOItemCoverage(soCode) {
  const uncoveredItems = await query(
    `SELECT 
      soi.product_code,
      soi.product_name,
      soi.quantity as so_quantity,
      COALESCE(SUM(poi.quantity), 0) as po_quantity
    FROM sales_order_items soi
    LEFT JOIN purchase_order_items poi ON soi.product_code = poi.product_code
    LEFT JOIN purchase_orders po ON poi.po_code = po.po_code AND po.so_code = soi.so_code
    WHERE soi.so_code = ? AND soi.is_deleted = 0
    GROUP BY soi.product_code, soi.product_name, soi.quantity
    HAVING so_quantity > po_quantity`,
    [soCode]
  );
  return uncoveredItems;
}

async function getLogoBase64(logoPath) {
  try {
    if (!logoPath) {
      console.log('⚠️ No logo path provided');
      return null;
    }
    
    console.log('🔄 Processing logo path:', logoPath);
    
    // Handle semua kemungkinan format path
    let actualPath = logoPath;
    
    // Jika path dimulai dengan "/", hapus
    if (actualPath.startsWith('/')) {
      actualPath = actualPath.substring(1);
    }
    
    // Build full path
    const fullPath = path.join(process.cwd(), 'public', actualPath);
    console.log('📁 Full system path:', fullPath);
    
    // Read file
    const logoBuffer = await readFile(fullPath);
    console.log('✅ Logo file read successfully, size:', logoBuffer.length, 'bytes');
    
    const fileExtension = logoPath.split('.').pop();
    const base64 = `data:image/${fileExtension};base64,${logoBuffer.toString('base64')}`;
    
    return base64;
  } catch (error) {
    console.error('❌ Failed to load logo:', error.message);
    console.error('Logo path was:', logoPath);
    
    // Fallback: return null agar PDF tetap generate tanpa logo
    return null;
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

// GET - Handle semua GET requests (ready-pos & delivery-orders)
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

    if (action === "ready-pos") {
      return await handleGetReadyPOs(request, decoded);
    }

    return await handleGetDeliveryOrders(request, decoded);
  } catch (error) {
    console.error("GET delivery orders error:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle GET ready POs
async function handleGetReadyPOs(request, decoded) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const page = searchParams.get("page") || "1";
  const limit = searchParams.get("limit") || "8";

  const offset = (parseInt(page) - 1) * parseInt(limit);

  let whereClause = `
    WHERE po.is_deleted = 0 
    AND po.status IN ('approved_finance', 'paid') 
    AND (po.do_status = 'not_created' OR po.do_status IS NULL)
  `;
  let params = [];

  if (search) {
    whereClause +=
      " AND (po.po_code LIKE ? OR po.so_code LIKE ? OR po.supplier_name LIKE ? OR so.customer_name LIKE ?)";
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const countQuery = `
    SELECT COUNT(*) as total 
    FROM purchase_orders po
    LEFT JOIN sales_orders so ON po.so_code = so.so_code
    ${whereClause}
  `;
  const countResult = await query(countQuery, params);
  const total = countResult[0]?.total || 0;

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
      so.project_code,
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
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
}

// Handle GET delivery orders
async function handleGetDeliveryOrders(request, decoded) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search") || "";
  const page = searchParams.get("page") || "1";
  const limit = searchParams.get("limit") || "10";

  const offset = (parseInt(page) - 1) * parseInt(limit);

  let whereClause = "WHERE do.is_deleted = 0";
  let params = [];

  if (status && status !== "all") {
    whereClause += " AND do.status = ?";
    params.push(status);
  }

  if (search) {
    whereClause +=
      " AND (do.do_code LIKE ? OR do.so_code LIKE ? OR do.courier LIKE ? OR do.tracking_number LIKE ? OR so.customer_name LIKE ? OR so.project_code LIKE ?)";
    const searchTerm = `%${search}%`;
    params.push(
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm
    );
  }

  const countQuery = `
    SELECT COUNT(*) as total 
    FROM delivery_orders do
    LEFT JOIN sales_orders so ON do.so_code = so.so_code
    ${whereClause}
  `;
  const countResult = await query(countQuery, params);
  const total = countResult[0]?.total || 0;

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
      so.sales_rep,
      so.sales_rep_email,
      so.project_code
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
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
}

// POST - Create delivery order
export async function POST(request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    const decoded = verifyToken(token);

    if (!decoded) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const dataField = formData.get("data");

    if (!dataField) {
      return Response.json(
        { success: false, error: "Missing data field" },
        { status: 400 }
      );
    }

    const doData = JSON.parse(dataField);
    const {
      so_code,
      purchase_order_codes,
      courier,
      tracking_number,
      shipping_date,
      shipping_cost = 0,
      notes = null,
    } = doData;

    // ============== PERBAIKAN: Handle multiple POs ==============
    let poCodesArray = [];
    
    if (Array.isArray(purchase_order_codes)) {
      poCodesArray = purchase_order_codes;
    } else if (typeof purchase_order_codes === 'string') {
      if (purchase_order_codes.includes(',')) {
        poCodesArray = purchase_order_codes.split(',').map(code => code.trim());
      } else {
        poCodesArray = [purchase_order_codes];
      }
    } else {
      return Response.json(
        {
          success: false,
          error: "Purchase order codes harus berupa array atau string"
        },
        { status: 400 }
      );
    }

    if (!so_code || poCodesArray.length === 0) {
      return Response.json(
        {
          success: false,
          error: "SO code dan minimal satu purchase order diperlukan",
        },
        { status: 400 }
      );
    }

    if (!courier || !tracking_number || !shipping_date) {
      return Response.json(
        {
          success: false,
          error: "Courier, tracking number, and shipping date are required",
        },
        { status: 400 }
      );
    }

    console.log('📦 Creating DO with PO codes:', poCodesArray);
    console.log('🔢 PO Count:', poCodesArray.length);

    const placeholders = poCodesArray.map(() => "?").join(",");
    const poCheck = await query(
      `SELECT po_code, status, do_status, so_code 
       FROM purchase_orders 
       WHERE po_code IN (${placeholders}) AND is_deleted = 0`,
      poCodesArray
    );

    if (poCheck.length !== poCodesArray.length) {
      const foundCodes = poCheck.map(po => po.po_code);
      const missingCodes = poCodesArray.filter(code => !foundCodes.includes(code));
      return Response.json(
        { 
          success: false, 
          error: `Purchase orders tidak ditemukan: ${missingCodes.join(', ')}` 
        },
        { status: 400 }
      );
    }

    const invalidPOs = poCheck.filter(
      (po) =>
        (po.status !== "approved_finance" && po.status !== "paid") ||
        (po.do_status !== "not_created" && po.do_status !== null) ||
        po.so_code !== so_code
    );

    if (invalidPOs.length > 0) {
      return Response.json(
        {
          success: false,
          error: `Invalid POs: ${invalidPOs
            .map((po) => po.po_code)
            .join(
              ", "
            )}. All POs must be approved/paid, not in delivery, and belong to the same SO.`,
        },
        { status: 400 }
      );
    }

    const countResult = await query(
      "SELECT COUNT(*) as count FROM delivery_orders WHERE YEAR(created_at) = YEAR(CURDATE())"
    );
    const doCode = `DO-${new Date().getFullYear()}-${String(
      countResult[0].count + 1
    ).padStart(4, "0")}`;

    const shippingProofFile = formData.get("shipping_proof");
    let shippingProofPath = null;
    if (shippingProofFile && shippingProofFile.size > 0) {
      shippingProofPath = await saveFile(shippingProofFile, "shipping_proof");
    }

    // Simpan sebagai JSON array
    await query(
      `INSERT INTO delivery_orders 
       (do_code, so_code, purchase_order_codes, courier, tracking_number, 
        shipping_date, shipping_cost, shipping_proof, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'shipping')`,
      [
        doCode,
        so_code,
        JSON.stringify(poCodesArray),
        courier,
        tracking_number,
        shipping_date,
        shipping_cost,
        shippingProofPath,
      ]
    );

    await query(
      `UPDATE purchase_orders 
       SET do_status = 'created', do_code = ?, delivery_date = ?
       WHERE po_code IN (${placeholders}) AND is_deleted = 0`,
      [doCode, shipping_date, ...poCodesArray]
    );

    await createAuditLog(
      decoded.user_code,
      decoded.name,
      "create",
      "delivery_order",
      doCode,
      `Created delivery order for SO ${so_code} with ${poCodesArray.length} POs: ${poCodesArray.join(', ')}`
    );

    return Response.json({
      success: true,
      message: `Delivery order ${doCode} created successfully with ${poCodesArray.length} POs`,
      do_code: doCode,
      files_uploaded: shippingProofPath ? 1 : 0,
      po_count: poCodesArray.length,
      po_codes: poCodesArray,
    });
  } catch (error) {
    console.error("POST delivery order error:", error);
    return Response.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Mark delivery order as delivered
export async function PATCH(request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    const decoded = verifyToken(token);

    if (!decoded) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const dataField = formData.get("data");

    if (!dataField) {
      return Response.json(
        { success: false, error: "Missing data field" },
        { status: 400 }
      );
    }

    const doData = JSON.parse(dataField);
    const {
      do_code,
      received_date,
      received_by,
      confirmation_method = null,
      notes = "",
    } = doData;

    if (!do_code || !received_date || !received_by) {
      return Response.json(
        {
          success: false,
          error: "DO code, received date, and received by are required",
        },
        { status: 400 }
      );
    }

    const podFile = formData.get("proof_of_delivery");
    if (!podFile || podFile.size === 0) {
      return Response.json(
        { success: false, error: "Proof of delivery file is required" },
        { status: 400 }
      );
    }

    const doCheck = await query(
      "SELECT * FROM delivery_orders WHERE do_code = ? AND is_deleted = 0",
      [do_code]
    );

    if (doCheck.length === 0) {
      return Response.json(
        { success: false, error: "Delivery order not found" },
        { status: 404 }
      );
    }

    const doItem = doCheck[0];

    if (doItem.status !== "shipping") {
      return Response.json(
        {
          success: false,
          error: "Only shipping delivery orders can be marked as delivered",
        },
        { status: 400 }
      );
    }

    const podFilePath = await saveFile(podFile, "proof_of_delivery");

    await query(
      `UPDATE delivery_orders 
       SET status = 'delivered', 
           proof_of_delivery = ?, 
           received_date = ?, 
           received_by = ?, 
           confirmation_method = ?,
           notes = ?
       WHERE do_code = ?`,
      [
        podFilePath,
        received_date,
        received_by,
        confirmation_method,
        notes,
        do_code,
      ]
    );

    let poCodes = [];
    try {
      const purchaseOrderCodes = doItem.purchase_order_codes;
      console.log('Raw purchase_order_codes from DB:', purchaseOrderCodes);
      
      if (purchaseOrderCodes) {
        if (Array.isArray(purchaseOrderCodes)) {
          poCodes = purchaseOrderCodes;
        } else {
          const parsed = JSON.parse(purchaseOrderCodes);
          poCodes = Array.isArray(parsed) ? parsed : [purchaseOrderCodes];
        }
      }
    } catch (error) {
      console.warn(
        "Failed to parse purchase_order_codes as JSON, treating as string:",
        error.message
      );
      if (doItem.purchase_order_codes.includes(',')) {
        poCodes = doItem.purchase_order_codes.split(',').map(code => code.trim());
      } else {
        poCodes = [doItem.purchase_order_codes];
      }
    }

    console.log('Parsed PO Codes for delivery:', poCodes);

    if (poCodes.length > 0) {
      const placeholders = poCodes.map(() => "?").join(",");
      await query(
        `UPDATE purchase_orders 
         SET do_status = 'delivered'
         WHERE po_code IN (${placeholders}) AND is_deleted = 0`,
        poCodes
      );
    }

    // Cek semua PO delivered DAN semua items ter-cover
    const allPOsDelivered = await query(
      `SELECT COUNT(*) as pending_count 
       FROM purchase_orders 
       WHERE so_code = ? AND is_deleted = 0 
       AND (do_status != 'delivered' OR do_status IS NULL)`,
      [doItem.so_code]
    );

    const pendingPOCount = allPOsDelivered[0].pending_count;

    if (pendingPOCount === 0) {
      const uncoveredItems = await checkSOItemCoverage(doItem.so_code);

      if (uncoveredItems.length === 0) {
        await query(
          `UPDATE sales_orders SET status = 'ready_to_invoice' WHERE so_code = ? AND is_deleted = 0`,
          [doItem.so_code]
        );

        await createAuditLog(
          decoded.user_code,
          decoded.name,
          "update",
          "sales_order",
          doItem.so_code,
          "Auto-updated to ready_to_invoice status - all POs delivered and items covered"
        );
      }
    }

    await createAuditLog(
      decoded.user_code,
      decoded.name,
      "update",
      "delivery_order",
      do_code,
      `Marked as delivered. Received by: ${received_by}, PO Count: ${poCodes.length}`
    );

    return Response.json({
      success: true,
      message: "Delivery order marked as delivered successfully",
      po_count: poCodes.length,
      po_codes: poCodes,
      so_updated: pendingPOCount === 0,
    });
  } catch (error) {
    console.error("PATCH delivery order error:", error);
    return Response.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Export delivery order (dengan opsi PDF)
export async function PUT(request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    const decoded = verifyToken(token);

    if (!decoded) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { do_code, format = "json" } = await request.json();

    if (!do_code) {
      return Response.json(
        { success: false, error: "DO code is required" },
        { status: 400 }
      );
    }

    // Get delivery order dengan project code dan sales rep
    const deliveryOrder = await query(
      `SELECT 
        do.*,
        so.customer_name,
        so.customer_phone,
        so.customer_email,
        so.billing_address,
        so.shipping_address,
        so.sales_rep,
        so.sales_rep_email,
        so.project_code
      FROM delivery_orders do
      LEFT JOIN sales_orders so ON do.so_code = so.so_code
      WHERE do.do_code = ? AND do.is_deleted = 0`,
      [do_code]
    );

    if (deliveryOrder.length === 0) {
      return Response.json(
        { success: false, error: "Delivery order not found" },
        { status: 404 }
      );
    }

    const doItem = deliveryOrder[0];
    console.log('📋 DO Item:', {
      do_code: doItem.do_code,
      so_code: doItem.so_code,
      sales_rep: doItem.sales_rep,
      purchase_order_codes: doItem.purchase_order_codes,
      type: typeof doItem.purchase_order_codes
    });

    // Get company info dari project code
    const companyInfo = await getCompanyInfoFromProject(doItem.project_code);

    let poCodes = [];
    // ============== PERBAIKAN: Parse PO Codes dengan benar ==============
    if (doItem.purchase_order_codes) {
      console.log('Raw purchase_order_codes from DB:', doItem.purchase_order_codes);
      console.log('Type:', typeof doItem.purchase_order_codes);
      console.log('Is Array?', Array.isArray(doItem.purchase_order_codes));
      
      if (Array.isArray(doItem.purchase_order_codes)) {
        // Sudah array langsung dari database
        poCodes = doItem.purchase_order_codes;
        console.log('Already an array, using directly');
      } else if (typeof doItem.purchase_order_codes === 'string') {
        // Jika string, coba parse JSON
        const trimmed = doItem.purchase_order_codes.trim();
        
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed);
            poCodes = Array.isArray(parsed) ? parsed : [String(parsed)];
            console.log('Parsed as JSON array:', parsed);
          } catch (error) {
            console.log('Failed to parse JSON, treating as string');
            if (trimmed.includes(',')) {
              poCodes = trimmed.split(',').map(code => code.trim());
            } else {
              poCodes = [trimmed];
            }
          }
        } else {
          // Plain string (bukan JSON)
          if (trimmed.includes(',')) {
            poCodes = trimmed.split(',').map(code => code.trim());
          } else {
            poCodes = [trimmed];
          }
        }
      } else {
        poCodes = [String(doItem.purchase_order_codes)];
      }
    }

    // Pastikan semua item adalah string, bukan array
    poCodes = poCodes.map(code => {
      if (Array.isArray(code)) {
        console.log('Warning: Array inside array found:', code);
        return code[0] ? String(code[0]).trim() : '';
      }
      return String(code).trim();
    }).filter(code => code !== ''); // Hapus yang kosong

    console.log('✅ Final PO Codes (cleaned):', poCodes);
    console.log('🔢 PO Count:', poCodes.length);
    console.log('First PO Code:', poCodes[0]);
    console.log('Type of first PO Code:', typeof poCodes[0]);

    let relatedPOs = [];
    if (poCodes.length > 0) {
      const placeholders = poCodes.map(() => "?").join(",");
      console.log('🔍 Querying PO details with codes:', poCodes);
      console.log('📝 Query: SELECT ... WHERE po.po_code IN (${placeholders})');
      
      // Debug: Cek apakah PO ada di database
      for (const poCode of poCodes) {
        const debugCheck = await query(
          `SELECT po_code, is_deleted FROM purchase_orders WHERE po_code = ?`,
          [poCode]
        );
        console.log(`🔎 Check PO ${poCode}:`, debugCheck.length > 0 ? 'Found' : 'Not found');
      }
      
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
        LEFT JOIN purchase_order_items poi ON po.po_code = poi.po_code AND poi.is_deleted = 0
        WHERE po.po_code IN (${placeholders}) AND po.is_deleted = 0
        ORDER BY po.po_code, poi.product_name`,
        poCodes
      );
      
      console.log('📊 PO Details found:', poDetails.length, 'items');
      if (poDetails.length > 0) {
        console.log('Sample PO Item:', poDetails[0]);
      } else {
        console.log('❌ WARNING: No PO items found!');
      }
      
      relatedPOs = poDetails;
    }

    // Group items by PO code untuk tampilan yang lebih baik
    const groupedPOs = {};
    relatedPOs.forEach(item => {
      if (!groupedPOs[item.po_code]) {
        groupedPOs[item.po_code] = {
          po_code: item.po_code,
          supplier_name: item.supplier_name,
          total_amount: item.total_amount,
          date: item.date,
          items: []
        };
      }
      groupedPOs[item.po_code].items.push({
        product_name: item.product_name,
        product_code: item.product_code,
        quantity: item.quantity,
        purchase_price: item.purchase_price,
        item_total: item.item_total
      });
    });

    const exportData = {
      delivery_order: {
        do_code: doItem.do_code,
        so_code: doItem.so_code,
        project_code: doItem.project_code,
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
        created_at: doItem.created_at,
        sales_rep: doItem.sales_rep,
        sales_rep_email: doItem.sales_rep_email,
      },
      company_info: {
        company_code: companyInfo.company_code,
        name: companyInfo.company_name,
        address: companyInfo.company_address,
        phone: companyInfo.company_phone,
        email: companyInfo.company_email,
        website: companyInfo.company_website,
        tax_id: companyInfo.tax_id,
        logo_url: companyInfo.logo_url,
      },
      purchase_orders: relatedPOs,
      grouped_purchase_orders: Object.values(groupedPOs),
      export_info: {
        exported_by: decoded.name,
        export_date: new Date().toISOString(),
        format: format,
        po_count: poCodes.length,
        item_count: relatedPOs.length
      },
    };

    // Jika format PDF, panggil function generate PDF
    if (format.toLowerCase() === "pdf") {
      const pdfData = await generatePDF(exportData, decoded);

      return Response.json({
        success: true,
        data: {
          pdf_base64: pdfData,
          ...exportData,
        },
        message: `Export data for ${do_code} in PDF format (${poCodes.length} POs, ${relatedPOs.length} items)`,
      });
    }

    return Response.json({
      success: true,
      data: exportData,
      message: `Export data for ${do_code} in ${format} format (${poCodes.length} POs, ${relatedPOs.length} items)`,
    });
  } catch (error) {
    console.error("PUT delivery order error:", error);
    return Response.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function untuk generate PDF dengan logo company
async function generatePDF(exportData, user) {
  try {
    const { delivery_order, company_info, purchase_orders, grouped_purchase_orders } = exportData;

    // Get logo base64 jika ada
    let logoBase64 = null;
    if (company_info.logo_url) {
      logoBase64 = await getLogoBase64(company_info.logo_url);
    }

    // Format currency
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount || 0);
    };

    // Format date
    const formatDate = (dateString) => {
      if (!dateString) return "-";
      return new Date(dateString).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    };

    // Calculate totals
    const poTotal = purchase_orders.reduce(
      (sum, item) => sum + (item.quantity * item.purchase_price),
      0
    );
    const grandTotal = poTotal + (delivery_order.shipping_cost || 0);

    // Tentukan siapa yang menandatangani (gunakan sales rep jika ada, fallback ke default)
    const signerName = delivery_order.sales_rep || "Manager Logistik";
    const signerTitle = delivery_order.sales_rep ? "Sales Representative" : "Manager Logistik";
    const signerContact = delivery_order.sales_rep_email || "";

    // Generate HTML dengan logo
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { display: flex; align-items: center; margin-bottom: 10px; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; }
          .logo { width: 160px; height: 160px; margin-right: 20px; object-fit: contain; }
          .company-info { flex: 1; }
          .company-name { font-size: 24px; font-weight: bold; color: #2c3e50; }
          .company-address { font-size: 12px; color: #7f8c8d; margin-top: 5px; }
          .company-contact { font-size: 11px; color: #95a5a6; }
          .title { text-align: center; font-size: 20px; margin: 30px 0; font-weight: bold; color: #2c3e50; }
          .document-info { text-align: center; margin: 10px 0; }
          .document-code { font-size: 18px; font-weight: bold; color: #3498db; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; margin-bottom: 10px; color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 5px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
          .label { font-weight: bold; color: #555; min-width: 150px; display: inline-block; }
          .value { margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th { background-color: #f8f9fa; padding: 10px; text-align: left; border: 1px solid #dee2e6; color: #2c3e50; }
          td { padding: 10px; border: 1px solid #dee2e6; }
          .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #95a5a6; border-top: 1px solid #eee; padding-top: 10px; }
          .signature { margin-top: 60px; float: right; text-align: center; }
          .signature-line { width: 200px; border-top: 1px solid #333; margin: 0 auto; padding-top: 5px; }
          .signature-left { margin-top: 60px; float: left; margin-right: 100px; text-align: center; }
          .total-row { background-color: #f8f9fa; font-weight: bold; }
          .amount { text-align: right; }
          .po-header { background-color: #e9ecef; font-weight: bold; padding: 8px; margin-top: 15px; border-radius: 4px; }
          .po-subtotal { font-weight: bold; background-color: #f8f9fa; }
          .signer-info { font-size: 11px; color: #95a5a6; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          ${
            logoBase64
              ? `<img class="logo" src="${logoBase64}" alt="Company Logo">`
              : ""
          }
          <div class="company-info">
            <div class="company-name">${company_info.name}</div>
            <div class="company-address">${company_info.address}</div>
            <div class="company-contact">
              Telp: ${company_info.phone} | Email: ${company_info.email} | ${company_info.tax_id ? `NPWP: ${company_info.tax_id}` : ""}
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Informasi Pengiriman</div>
          <div class="grid">
            <div>
              <div class="value"><span class="label">Nomor DO:</span> ${delivery_order.do_code}</div>
              <div class="value"><span class="label">Nomor SO:</span> ${delivery_order.so_code}</div>
              <div class="value"><span class="label">Project:</span> ${delivery_order.project_code || "-"}</div>
              <div class="value"><span class="label">Tanggal Buat:</span> ${formatDate(delivery_order.created_at)}</div>
            </div>
            <div>
              <div class="value"><span class="label">Kurir:</span> ${delivery_order.courier}</div>
              <div class="value"><span class="label">No. Tracking:</span> ${delivery_order.tracking_number}</div>
              <div class="value"><span class="label">Tanggal Pengiriman:</span> ${formatDate(delivery_order.shipping_date)}</div>
              <div class="value"><span class="label">Tanggal Diterima:</span> ${formatDate(delivery_order.received_date)}</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Informasi Pelanggan</div>
          <div class="value"><span class="label">Nama:</span> ${delivery_order.customer_name}</div>
          <div class="value"><span class="label">Telepon:</span> ${delivery_order.customer_phone || "-"}</div>
          <div class="value"><span class="label">Email:</span> ${delivery_order.customer_email || "-"}</div>
          <div class="value"><span class="label">Alamat Pengiriman:</span> ${delivery_order.shipping_address || delivery_order.billing_address || "-"}</div>
        </div>
        
        <div class="section">
          <div class="section-title">Daftar Purchase Order</div>
          
          ${grouped_purchase_orders.length > 0 ? grouped_purchase_orders.map(po => `
            <div class="po-header">
              PO: ${po.po_code} | Supplier: ${po.supplier_name} | Tanggal: ${formatDate(po.date)}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Kode</th>
                  <th>Qty</th>
                  <th>Harga</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${po.items.map(item => `
                  <tr>
                    <td>${item.product_name}</td>
                    <td>${item.product_code}</td>
                    <td>${item.quantity}</td>
                    <td class="amount">${formatCurrency(item.purchase_price)}</td>
                    <td class="amount">${formatCurrency(item.item_total)}</td>
                  </tr>
                `).join('')}
                <tr class="po-subtotal">
                  <td colspan="4" style="text-align: right;"><strong>Subtotal PO ${po.po_code}:</strong></td>
                  <td class="amount"><strong>${formatCurrency(po.items.reduce((sum, item) => sum + item.item_total, 0))}</strong></td>
                </tr>
              </tbody>
            </table>
          `).join('') : `
            <div style="text-align: center; padding: 20px; color: #95a5a6; font-style: italic;">
              Tidak ada data purchase order
            </div>
          `}
          
          ${purchase_orders.length > 0 ? `
            <table style="margin-top: 20px;">
              <tbody>
                <tr class="total-row">
                  <td colspan="4" style="text-align: right;"><strong>Total Nilai PO:</strong></td>
                  <td class="amount"><strong>${formatCurrency(poTotal)}</strong></td>
                </tr>
                <tr class="total-row">
                  <td colspan="4" style="text-align: right;"><strong>Biaya Pengiriman:</strong></td>
                  <td class="amount"><strong>${formatCurrency(delivery_order.shipping_cost || 0)}</strong></td>
                </tr>
                <tr class="total-row">
                  <td colspan="4" style="text-align: right;"><strong>GRAND TOTAL:</strong></td>
                  <td class="amount"><strong>${formatCurrency(grandTotal)}</strong></td>
                </tr>
              </tbody>
            </table>
          ` : ''}
        </div>
        
        <div style="clear: both;"></div>
        
        <div class="signature">
          <div style="margin-bottom: 60px;">Diterima oleh:</div>
          <div class="signature-line"></div>
          <div style="margin-top: 5px; font-weight: bold;">${delivery_order.received_by || "____________________"}</div>
          <div class="signer-info">${formatDate(delivery_order.received_date) || "Tanggal"}</div>
        </div>
        
        <div class="signature-left">
          <div style="margin-bottom: 60px;">Hormat kami,</div>
          <div class="signature-line"></div>
          <div style="margin-top: 5px; font-weight: bold;">${signerName}</div>
          <div class="signer-info">${signerTitle}</div>
          ${signerContact ? `<div class="signer-info">${signerContact}</div>` : ''}
          <div class="signer-info">${company_info.name}</div>
        </div>
        
        <div class="footer">
          <div>Dokumen ini dicetak oleh: ${user.name}  pada ${new Date().toLocaleString("id-ID")}</div>
          <div>${company_info.name} - Delivery Order System | Halaman 1 dari 1</div>
          <div>Total: ${grouped_purchase_orders.length} PO, ${purchase_orders.length} items</div>
          <div>Sales Representative: ${delivery_order.sales_rep || "Tidak tersedia"}</div>
        </div>
      </body>
      </html>
    `;

    // Return HTML content sebagai base64
    return Buffer.from(htmlContent).toString("base64");
  } catch (error) {
    console.error("PDF generation error:", error);
    throw new Error("Failed to generate PDF");
  }
}