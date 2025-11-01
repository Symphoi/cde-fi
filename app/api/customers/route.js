import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

// Helper function untuk audit log - DISABLED
async function createAuditLog(userCode, userName, action, resourceType, resourceCode, notes) {
  try {
    // Audit log disabled untuk customers
    console.log(`[AUDIT DISABLED] ${action} ${resourceType} ${resourceCode}: ${notes}`);
    return;
  } catch (error) {
    console.error('Error in audit log (disabled):', error);
  }
}

// GET - Get all customers dengan pagination
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
      whereClause += ' AND (customer_code LIKE ? OR customer_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      if (status === 'active') {
        whereClause += ' AND status = "active"';
      } else if (status === 'inactive') {
        whereClause += ' AND status = "inactive"';
      }
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM customers ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get customers
    const customersQuery = `
      SELECT 
        id,
        customer_code,
        customer_name,
        customer_type,
        phone,
        email,
        billing_address,
        shipping_address,
        tax_id,
        credit_limit,
        payment_terms,
        status,
        created_at,
        updated_at
      FROM customers 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limit, offset];
    const customers = await query(customersQuery, queryParams);

    return Response.json({
      success: true,
      data: customers,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('GET customers error:', error);
    return Response.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// POST - Create new customer
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const customerData = await request.json();
    const {
      customer_code,
      customer_name,
      customer_type = 'company',
      phone = '',
      email = '',
      billing_address = '',
      shipping_address = '',
      tax_id = '',
      credit_limit = 0,
      payment_terms = 30,
      status = 'active'
    } = customerData;

    // Validation
    if (!customer_code || !customer_name) {
      return Response.json(
        { success: false, error: 'Customer code and name are required' },
        { status: 400 }
      );
    }

    // Check if customer code already exists
    const existingCustomer = await query(
      'SELECT customer_code FROM customers WHERE customer_code = ? AND is_deleted = 0',
      [customer_code]
    );

    if (existingCustomer.length > 0) {
      return Response.json(
        { success: false, error: 'Customer code already exists' },
        { status: 400 }
      );
    }

    // Insert customer
    await query(
      `INSERT INTO customers 
       (customer_code, customer_name, customer_type, phone, email, billing_address, shipping_address, tax_id, credit_limit, payment_terms, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_code, customer_name, customer_type, phone, email, billing_address, shipping_address, tax_id, credit_limit, payment_terms, status]
    );

    // Audit log (disabled)
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'create',
      'customer',
      customer_code,
      `Created customer: ${customer_name}`
    );

    return Response.json({
      success: true,
      message: 'Customer created successfully'
    });

  } catch (error) {
    console.error('POST customer error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update customer
export async function PUT(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const customerData = await request.json();
    const {
      id,
      customer_code,
      customer_name,
      customer_type = 'company',
      phone = '',
      email = '',
      billing_address = '',
      shipping_address = '',
      tax_id = '',
      credit_limit = 0,
      payment_terms = 30,
      status = 'active'
    } = customerData;

    // Validation
    if (!id || !customer_code || !customer_name) {
      return Response.json(
        { success: false, error: 'Customer ID, code and name are required' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const existingCustomer = await query(
      'SELECT customer_code FROM customers WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (existingCustomer.length === 0) {
      return Response.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if customer code already exists (for other customers)
    const existingCode = await query(
      'SELECT customer_code FROM customers WHERE customer_code = ? AND id != ? AND is_deleted = 0',
      [customer_code, id]
    );

    if (existingCode.length > 0) {
      return Response.json(
        { success: false, error: 'Customer code already exists for another customer' },
        { status: 400 }
      );
    }

    // Update customer
    await query(
      `UPDATE customers 
       SET customer_code = ?, customer_name = ?, customer_type = ?, phone = ?, email = ?, 
           billing_address = ?, shipping_address = ?, tax_id = ?, credit_limit = ?, 
           payment_terms = ?, status = ?, updated_at = NOW()
       WHERE id = ? AND is_deleted = 0`,
      [customer_code, customer_name, customer_type, phone, email, billing_address, shipping_address, tax_id, credit_limit, payment_terms, status, id]
    );

    // Audit log (disabled)
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'update',
      'customer',
      customer_code,
      `Updated customer: ${customer_name}`
    );

    return Response.json({
      success: true,
      message: 'Customer updated successfully'
    });

  } catch (error) {
    console.error('PUT customer error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete customer
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
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const existingCustomer = await query(
      'SELECT customer_code, customer_name FROM customers WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (existingCustomer.length === 0) {
      return Response.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = existingCustomer[0];

    // Soft delete customer
    await query(
      'UPDATE customers SET is_deleted = 1, deleted_at = NOW() WHERE id = ?',
      [id]
    );

    // Audit log (disabled)
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'delete',
      'customer',
      customer.customer_code,
      `Deleted customer: ${customer.customer_name}`
    );

    return Response.json({
      success: true,
      message: 'Customer deleted successfully'
    });

  } catch (error) {
    console.error('DELETE customer error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}