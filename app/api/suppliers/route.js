import { query } from '@/app/lib/db';

// GET - Get all suppliers atau single supplier
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const status = searchParams.get('status') || '';

    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (supplier_code LIKE ? OR name LIKE ? OR contact_person LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      if (status === 'active') {
        whereClause += ' AND is_active = 1';
      } else if (status === 'inactive') {
        whereClause += ' AND is_active = 0';
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
        name,
        contact_person,
        phone,
        email,
        address,
        is_active,
        created_at
      FROM suppliers 
      ${whereClause}
      ORDER BY name ASC
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
    const supplierData = await request.json();
    const {
      supplier_code,
      name,
      contact_person = '',
      phone = '',
      email = '',
      address = '',
      is_active = true
    } = supplierData;

    // Validation
    if (!supplier_code || !name) {
      return Response.json(
        { success: false, error: 'Supplier code and name are required' },
        { status: 400 }
      );
    }

    // Check if supplier code already exists
    const existingSupplier = await query(
      'SELECT supplier_code FROM suppliers WHERE supplier_code = ?',
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
       (supplier_code, name, contact_person, phone, email, address, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [supplier_code, name, contact_person, phone, email, address, is_active]
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
    const supplierData = await request.json();
    const {
      id,
      supplier_code,
      name,
      contact_person = '',
      phone = '',
      email = '',
      address = '',
      is_active = true
    } = supplierData;

    // Validation
    if (!id || !supplier_code || !name) {
      return Response.json(
        { success: false, error: 'Supplier ID, code and name are required' },
        { status: 400 }
      );
    }

    // Check if supplier exists
    const existingSupplier = await query(
      'SELECT supplier_code FROM suppliers WHERE id = ?',
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
      'SELECT supplier_code FROM suppliers WHERE supplier_code = ? AND id != ?',
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
       SET supplier_code = ?, name = ?, contact_person = ?, phone = ?, email = ?, address = ?, is_active = ?
       WHERE id = ?`,
      [supplier_code, name, contact_person, phone, email, address, is_active, id]
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

// DELETE - Delete supplier
export async function DELETE(request) {
  try {
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
      'SELECT supplier_code, name FROM suppliers WHERE id = ?',
      [id]
    );

    if (existingSupplier.length === 0) {
      return Response.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // Delete supplier
    await query('DELETE FROM suppliers WHERE id = ?', [id]);

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