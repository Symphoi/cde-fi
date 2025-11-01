import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

// Helper function untuk audit log - DISABLED
async function createAuditLog(userCode, userName, action, resourceType, resourceCode, notes) {
  try {
    // Audit log disabled untuk products
    console.log(`[AUDIT DISABLED] ${action} ${resourceType} ${resourceCode}: ${notes}`);
    return;
  } catch (error) {
    console.error('Error in audit log (disabled):', error);
  }
}

// GET - Get all products atau categories
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // ✅ JIKA INI REQUEST UNTUK CATEGORIES
    if (searchParams.get('type') === 'categories') {
      const categories = await query(`
        SELECT id, category_code, name, description, is_active 
        FROM product_categories 
        WHERE is_active = 1 AND is_deleted = 0
        ORDER BY name ASC
      `);
      return Response.json({ 
        success: true, 
        data: categories 
      });
    }

    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';

    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.is_deleted = 0';
    let params = [];

    if (search) {
      whereClause += ' AND (p.product_code LIKE ? OR p.product_name LIKE ? OR p.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      if (status === 'active') {
        whereClause += ' AND p.is_active = 1';
      } else if (status === 'inactive') {
        whereClause += ' AND p.is_active = 0';
      }
    }

    if (category) {
      whereClause += ' AND p.category = ?';
      params.push(category);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM products p ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get products dengan join ke categories untuk mendapatkan nama category
    const productsQuery = `
      SELECT 
        p.id,
        p.product_code,
        p.product_name,
        p.description,
        p.category,
        pc.name as category_name,
        p.unit_price,
        p.cost_price,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN product_categories pc ON p.category = pc.category_code AND pc.is_deleted = 0
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limit, offset];
    const products = await query(productsQuery, queryParams);

    return Response.json({
      success: true,
      data: products,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('GET products error:', error);
    return Response.json(
      { 
        success: false, 
        error: error.message 
      },
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
      product_name,
      description = '',
      category = '',
      unit_price = 0,
      cost_price = 0,
      is_active = true
    } = productData;

    // Validation
    if (!product_code || !product_name) {
      return Response.json(
        { success: false, error: 'Product code and name are required' },
        { status: 400 }
      );
    }

    // Check if product code already exists
    const existingProduct = await query(
      'SELECT product_code FROM products WHERE product_code = ? AND is_deleted = 0',
      [product_code]
    );

    if (existingProduct.length > 0) {
      return Response.json(
        { success: false, error: 'Product code already exists' },
        { status: 400 }
      );
    }

    // Validate prices
    if (unit_price < 0 || cost_price < 0) {
      return Response.json(
        { success: false, error: 'Prices cannot be negative' },
        { status: 400 }
      );
    }

    // Jika category dipilih, validasi apakah category exists
    if (category) {
      const categoryExists = await query(
        'SELECT category_code FROM product_categories WHERE category_code = ? AND is_active = 1 AND is_deleted = 0',
        [category]
      );
      
      if (categoryExists.length === 0) {
        return Response.json(
          { success: false, error: 'Selected category does not exist or is inactive' },
          { status: 400 }
        );
      }
    }

    // Insert product
    await query(
      `INSERT INTO products 
       (product_code, product_name, description, category, unit_price, cost_price, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [product_code, product_name, description, category, unit_price, cost_price, is_active]
    );

    // Audit log (disabled)
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'create',
      'product',
      product_code,
      `Created product: ${product_name}`
    );

    return Response.json({
      success: true,
      message: 'Product created successfully'
    });

  } catch (error) {
    console.error('POST product error:', error);
    return Response.json(
      { success: false, error: error.message },
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
      product_name,
      description = '',
      category = '',
      unit_price = 0,
      cost_price = 0,
      is_active = true
    } = productData;

    // Validation
    if (!id || !product_code || !product_name) {
      return Response.json(
        { success: false, error: 'Product ID, code and name are required' },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingProduct = await query(
      'SELECT product_code FROM products WHERE id = ? AND is_deleted = 0',
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
      'SELECT product_code FROM products WHERE product_code = ? AND id != ? AND is_deleted = 0',
      [product_code, id]
    );

    if (existingCode.length > 0) {
      return Response.json(
        { success: false, error: 'Product code already exists for another product' },
        { status: 400 }
      );
    }

    // Validate prices
    if (unit_price < 0 || cost_price < 0) {
      return Response.json(
        { success: false, error: 'Prices cannot be negative' },
        { status: 400 }
      );
    }

    // Jika category dipilih, validasi apakah category exists
    if (category) {
      const categoryExists = await query(
        'SELECT category_code FROM product_categories WHERE category_code = ? AND is_active = 1 AND is_deleted = 0',
        [category]
      );
      
      if (categoryExists.length === 0) {
        return Response.json(
          { success: false, error: 'Selected category does not exist or is inactive' },
          { status: 400 }
        );
      }
    }

    // Update product
    await query(
      `UPDATE products 
       SET product_code = ?, product_name = ?, description = ?, category = ?, 
           unit_price = ?, cost_price = ?, is_active = ?, updated_at = NOW()
       WHERE id = ? AND is_deleted = 0`,
      [product_code, product_name, description, category, unit_price, cost_price, is_active, id]
    );

    // Audit log (disabled)
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'update',
      'product',
      product_code,
      `Updated product: ${product_name}`
    );

    return Response.json({
      success: true,
      message: 'Product updated successfully'
    });

  } catch (error) {
    console.error('PUT product error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete product
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
      'SELECT product_code, product_name FROM products WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (existingProduct.length === 0) {
      return Response.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const product = existingProduct[0];

    // Soft delete product
    await query(
      'UPDATE products SET is_deleted = 1, deleted_at = NOW() WHERE id = ?',
      [id]
    );

    // Audit log (disabled)
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'delete',
      'product',
      product.product_code,
      `Deleted product: ${product.product_name}`
    );

    return Response.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('DELETE product error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}