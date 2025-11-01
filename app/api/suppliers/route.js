import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

// Helper function untuk audit log - DISABLED
async function createAuditLog(userCode, userName, action, resourceType, resourceCode, notes) {
  try {
    // Audit log disabled untuk suppliers
    console.log(`[AUDIT DISABLED] ${action} ${resourceType} ${resourceCode}: ${notes}`);
    return;
  } catch (error) {
    console.error('Error in audit log (disabled):', error);
  }
}

// GET - Get all suppliers dengan pagination
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
    const status = searchParams.get('status') || '';

    const offset = (page - 1) * limit;

    let whereClause = 'WHERE is_deleted = 0';
    let params = [];

    if (search) {
      whereClause += ' AND (supplier_code LIKE ? OR supplier_name LIKE ? OR contact_person LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      if (status === 'active') {
        whereClause += ' AND status = "active"';
      } else if (status === 'inactive') {
        whereClause += ' AND status = "inactive"';
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM suppliers ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get suppliers
    const suppliersQuery = `
      SELECT 
        id,
        supplier_code,
        supplier_name,
        contact_person,
        phone,
        email,
        address,
        tax_id,
        bank_name,
        account_number,
        payment_terms,
        status,
        created_at,
        updated_at
      FROM suppliers 
      ${whereClause}
      ORDER BY supplier_name ASC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limit, offset];
    const suppliers = await query(suppliersQuery, queryParams);

    return Response.json({
      success: true,
      data: suppliers,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('GET suppliers error:', error);
    return Response.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// POST - Create new supplier
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supplierData = await request.json();
    const {
      supplier_code,
      supplier_name,
      contact_person = '',
      phone = '',
      email = '',
      address = '',
      tax_id = '',
      bank_name = '',
      account_number = '',
      payment_terms = 30,
      status = 'active'
    } = supplierData;

    // Validation
    if (!supplier_code || !supplier_name) {
      return Response.json(
        { success: false, error: 'Supplier code and name are required' },
        { status: 400 }
      );
    }

    // Check if supplier code already exists
    const existingSupplier = await query(
      'SELECT supplier_code FROM suppliers WHERE supplier_code = ? AND is_deleted = 0',
      [supplier_code]
    );

    if (existingSupplier.length > 0) {
      return Response.json(
        { success: false, error: 'Supplier code already exists' },
        { status: 400 }
      );
    }

    // Insert supplier
    await query(
      `INSERT INTO suppliers 
       (supplier_code, supplier_name, contact_person, phone, email, address, tax_id, bank_name, account_number, payment_terms, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [supplier_code, supplier_name, contact_person, phone, email, address, tax_id, bank_name, account_number, payment_terms, status]
    );

    // Audit log (disabled)
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'create',
      'supplier',
      supplier_code,
      `Created supplier: ${supplier_name}`
    );

    return Response.json({
      success: true,
      message: 'Supplier created successfully'
    });

  } catch (error) {
    console.error('POST supplier error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update supplier
export async function PUT(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supplierData = await request.json();
    const {
      id,
      supplier_code,
      supplier_name,
      contact_person = '',
      phone = '',
      email = '',
      address = '',
      tax_id = '',
      bank_name = '',
      account_number = '',
      payment_terms = 30,
      status = 'active'
    } = supplierData;

    // Validation
    if (!id || !supplier_code || !supplier_name) {
      return Response.json(
        { success: false, error: 'Supplier ID, code and name are required' },
        { status: 400 }
      );
    }

    // Check if supplier exists
    const existingSupplier = await query(
      'SELECT supplier_code FROM suppliers WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (existingSupplier.length === 0) {
      return Response.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // Check if supplier code already exists (for other suppliers)
    const existingCode = await query(
      'SELECT supplier_code FROM suppliers WHERE supplier_code = ? AND id != ? AND is_deleted = 0',
      [supplier_code, id]
    );

    if (existingCode.length > 0) {
      return Response.json(
        { success: false, error: 'Supplier code already exists for another supplier' },
        { status: 400 }
      );
    }

    // Update supplier
    await query(
      `UPDATE suppliers 
       SET supplier_code = ?, supplier_name = ?, contact_person = ?, phone = ?, email = ?, 
           address = ?, tax_id = ?, bank_name = ?, account_number = ?, payment_terms = ?, 
           status = ?, updated_at = NOW()
       WHERE id = ? AND is_deleted = 0`,
      [supplier_code, supplier_name, contact_person, phone, email, address, tax_id, bank_name, account_number, payment_terms, status, id]
    );

    // Audit log (disabled)
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'update',
      'supplier',
      supplier_code,
      `Updated supplier: ${supplier_name}`
    );

    return Response.json({
      success: true,
      message: 'Supplier updated successfully'
    });

  } catch (error) {
    console.error('PUT supplier error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete supplier
export async function DELETE(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json(
        { success: false, error: 'Supplier ID is required' },
        { status: 400 }
      );
    }

    // Check if supplier exists
    const existingSupplier = await query(
      'SELECT supplier_code, supplier_name FROM suppliers WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (existingSupplier.length === 0) {
      return Response.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    const supplier = existingSupplier[0];

    // Soft delete supplier
    await query(
      'UPDATE suppliers SET is_deleted = 1, deleted_at = NOW() WHERE id = ?',
      [id]
    );

    // Audit log (disabled)
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'delete',
      'supplier',
      supplier.supplier_code,
      `Deleted supplier: ${supplier.supplier_name}`
    );

    return Response.json({
      success: true,
      message: 'Supplier deleted successfully'
    });

  } catch (error) {
    console.error('DELETE supplier error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}