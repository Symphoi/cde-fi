// File: app/api/product-categories/route.js
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

// GET - Get all product categories DENGAN PAGINATION & FILTERS
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
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE is_deleted = 0';
    let params = [];

    if (search) {
      whereClause += ' AND (category_code LIKE ? OR name LIKE ? OR description LIKE ?)';
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

    // Validate sort column untuk prevent SQL injection
    const validSortColumns = ['category_code', 'name', 'created_at', 'is_active'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM product_categories 
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get product categories
    const categoriesQuery = `
      SELECT 
        id,
        category_code,
        name,
        description,
        is_active,
        created_at
      FROM product_categories 
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, parseInt(limit), offset];
    const categories = await query(categoriesQuery, queryParams);

    return Response.json({
      success: true,
      data: categories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('GET product categories error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new product category
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const categoryData = await request.json();
    const {
      category_code,
      name,
      description = '',
      is_active = true
    } = categoryData;

    // Validation
    if (!category_code || !name) {
      return Response.json(
        { success: false, error: 'Category code and name are required' },
        { status: 400 }
      );
    }

    // Check if category code already exists
    const existingCategory = await query(
      'SELECT category_code FROM product_categories WHERE category_code = ? AND is_deleted = 0',
      [category_code]
    );

    if (existingCategory.length > 0) {
      return Response.json(
        { success: false, error: 'Category code already exists' },
        { status: 400 }
      );
    }

    // Insert category
    await query(
      `INSERT INTO product_categories 
       (category_code, name, description, is_active) 
       VALUES (?, ?, ?, ?)`,
      [category_code, name, description, is_active]
    );

    // Audit log
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'create',
      'product_category',
      category_code,
      `Created product category: ${name}`
    );

    return Response.json({
      success: true,
      message: 'Product category created successfully',
      category_code: category_code
    });

  } catch (error) {
    console.error('POST product category error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update product category
export async function PUT(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const categoryData = await request.json();
    const {
      id,
      category_code,
      name,
      description = '',
      is_active = true
    } = categoryData;

    // Validation
    if (!id || !category_code || !name) {
      return Response.json(
        { success: false, error: 'Category ID, code and name are required' },
        { status: 400 }
      );
    }

    // Check if category exists
    const existingCategory = await query(
      'SELECT category_code FROM product_categories WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (existingCategory.length === 0) {
      return Response.json(
        { success: false, error: 'Product category not found' },
        { status: 404 }
      );
    }

    // Check if category code already exists (for other categories)
    const existingCode = await query(
      'SELECT category_code FROM product_categories WHERE category_code = ? AND id != ? AND is_deleted = 0',
      [category_code, id]
    );

    if (existingCode.length > 0) {
      return Response.json(
        { success: false, error: 'Category code already exists for another category' },
        { status: 400 }
      );
    }

    // Update category
    await query(
      `UPDATE product_categories 
       SET category_code = ?, name = ?, description = ?, is_active = ?
       WHERE id = ? AND is_deleted = 0`,
      [category_code, name, description, is_active, id]
    );

    // Audit log
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'update',
      'product_category',
      category_code,
      `Updated product category: ${name}`
    );

    return Response.json({
      success: true,
      message: 'Product category updated successfully'
    });

  } catch (error) {
    console.error('PUT product category error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete product category
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
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }

    // Check if category exists
    const existingCategory = await query(
      'SELECT category_code, name FROM product_categories WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (existingCategory.length === 0) {
      return Response.json(
        { success: false, error: 'Product category not found' },
        { status: 404 }
      );
    }

    const category = existingCategory[0];

    // Soft delete category
    await query(
      'UPDATE product_categories SET is_deleted = 1, deleted_at = NOW() WHERE id = ?',
      [id]
    );

    // Audit log
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'delete',
      'product_category',
      category.category_code,
      `Deleted product category: ${category.name}`
    );

    return Response.json({
      success: true,
      message: 'Product category deleted successfully'
    });

  } catch (error) {
    console.error('DELETE product category error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}