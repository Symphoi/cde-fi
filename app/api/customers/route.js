import { query } from '@/app/lib/db';

// GET - Get all customers atau single customer
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
      whereClause += ' AND (customer_code LIKE ? OR name LIKE ? OR contact_person LIKE ? OR email LIKE ?)';
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
    const countQuery = `SELECT COUNT(*) as total FROM customers ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get customers
    const customersQuery = `
      SELECT 
        id,
        customer_code,
        name,
        contact_person,
        phone,
        email,
        address,
        billing_address,
        shipping_address,
        is_active,
        created_at
      FROM customers 
      ${whereClause}
      ORDER BY name ASC
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
    const customerData = await request.json();
    const {
      customer_code,
      name,
      contact_person = '',
      phone = '',
      email = '',
      address = '',
      billing_address = '',
      shipping_address = '',
      is_active = true
    } = customerData;

    // Validation
    if (!customer_code || !name) {
      return Response.json(
        { success: false, error: 'Customer code and name are required' },
        { status: 400 }
      );
    }

    // Check if customer code already exists
    const existingCustomer = await query(
      'SELECT customer_code FROM customers WHERE customer_code = ?',
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
       (customer_code, name, contact_person, phone, email, address, billing_address, shipping_address, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_code, name, contact_person, phone, email, address, billing_address, shipping_address, is_active]
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
    const customerData = await request.json();
    const {
      id,
      customer_code,
      name,
      contact_person = '',
      phone = '',
      email = '',
      address = '',
      billing_address = '',
      shipping_address = '',
      is_active = true
    } = customerData;

    // Validation
    if (!id || !customer_code || !name) {
      return Response.json(
        { success: false, error: 'Customer ID, code and name are required' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const existingCustomer = await query(
      'SELECT customer_code FROM customers WHERE id = ?',
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
      'SELECT customer_code FROM customers WHERE customer_code = ? AND id != ?',
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
       SET customer_code = ?, name = ?, contact_person = ?, phone = ?, email = ?, address = ?, 
           billing_address = ?, shipping_address = ?, is_active = ?
       WHERE id = ?`,
      [customer_code, name, contact_person, phone, email, address, billing_address, shipping_address, is_active, id]
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

// DELETE - Delete customer
export async function DELETE(request) {
  try {
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
      'SELECT customer_code, name FROM customers WHERE id = ?',
      [id]
    );

    if (existingCustomer.length === 0) {
      return Response.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Delete customer
    await query('DELETE FROM customers WHERE id = ?', [id]);

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