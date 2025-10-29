import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

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

// GET - Get all products DENGAN PAGINATION & FILTERS
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
   

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    let params = [];

      // ✅ JIKA INI REQUEST UNTUK CATEGORIES
    if (searchParams.get('type') === 'categories') {
      const categories = await query(`
        SELECT id, category_code, name, description, is_active 
        FROM product_categories 
        WHERE is_active = 1 
        ORDER BY name ASC
      `);
      return Response.json({ 
        success: true, 
        data: categories 
      });
    }
    if (search) {
      whereClause += ' AND (product_code LIKE ? OR name LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      if (status === 'active') {
        whereClause += ' AND is_active = 1';
      } else if (status === 'inactive') {
        whereClause += ' AND is_active = 0';
      }
    }

    if (category) {
      whereClause += ' AND category_code = ?';
      params.push(category);
    }

    // Validate sort column untuk prevent SQL injection
    const validSortColumns = ['product_code', 'name', 'created_at', 'is_active', 'category_code'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM products 
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get products
    const productsQuery = `
      SELECT 
        id,
        product_code,
        name,
        description,
        unit,
        category_code,
        is_active,
        created_at
      FROM products 
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, parseInt(limit), offset];
    const products = await query(productsQuery, queryParams);

    return Response.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('GET products error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new product
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const productData = await request.json();
    const {
      product_code,
      name,
      description = '',
      unit = '',
      category_code = '',
      is_active = true
    } = productData;

    // Validation
    if (!product_code || !name) {
      return Response.json(
        { success: false, error: 'Product code and name are required' },
        { status: 400 }
      );
    }

    // Check if product code already exists
    const existingProduct = await query(
      'SELECT product_code FROM products WHERE product_code = ?',
      [product_code]
    );

    if (existingProduct.length > 0) {
      return Response.json(
        { success: false, error: 'Product code already exists' },
        { status: 400 }
      );
    }

    // Insert product
    await query(
      `INSERT INTO products 
       (product_code, name, description, unit, category_code, is_active) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_code, name, description, unit, category_code, is_active]
    );

    // Audit log
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'create',
      'product',
      product_code,
      `Created product: ${name}`
    );

    return Response.json({
      success: true,
      message: 'Product created successfully',
      product_code: product_code
    });

  } catch (error) {
    console.error('POST product error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update product
export async function PUT(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const productData = await request.json();
    const {
      id,
      product_code,
      name,
      description = '',
      unit = '',
      category_code = '',
      is_active = true
    } = productData;

    // Validation
    if (!id || !product_code || !name) {
      return Response.json(
        { success: false, error: 'Product ID, code and name are required' },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingProduct = await query(
      'SELECT product_code FROM products WHERE id = ?',
      [id]
    );

    if (existingProduct.length === 0) {
      return Response.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if product code already exists (for other products)
    const existingCode = await query(
      'SELECT product_code FROM products WHERE product_code = ? AND id != ?',
      [product_code, id]
    );

    if (existingCode.length > 0) {
      return Response.json(
        { success: false, error: 'Product code already exists for another product' },
        { status: 400 }
      );
    }

    // Update product
    await query(
      `UPDATE products 
       SET product_code = ?, name = ?, description = ?, unit = ?, category_code = ?, is_active = ?
       WHERE id = ?`,
      [product_code, name, description, unit, category_code, is_active, id]
    );

    // Audit log
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'update',
      'product',
      product_code,
      `Updated product: ${name}`
    );

    return Response.json({
      success: true,
      message: 'Product updated successfully'
    });

  } catch (error) {
    console.error('PUT product error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete product
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
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingProduct = await query(
      'SELECT product_code, name FROM products WHERE id = ?',
      [id]
    );

    if (existingProduct.length === 0) {
      return Response.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const product = existingProduct[0];

    // Delete product
    await query(
      'DELETE FROM products WHERE id = ?',
      [id]
    );

    // Audit log
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'delete',
      'product',
      product.product_code,
      `Deleted product: ${product.name}`
    );

    return Response.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('DELETE product error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}