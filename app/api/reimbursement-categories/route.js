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

// GET - Get all reimbursement categories DENGAN PAGINATION
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
    const show_inactive = searchParams.get('show_inactive') === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE is_deleted = 0';
    let params = [];

    if (!show_inactive) {
      whereClause += ' AND is_active = 1';
    }

    if (search) {
      whereClause += ' AND (category_code LIKE ? OR name LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM reimbursement_categories 
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get categories
    const categoriesQuery = `
      SELECT 
        id,
        category_code,
        name,
        description,
        is_active,
        created_at
      FROM reimbursement_categories 
      ${whereClause}
      ORDER BY name
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
    console.error('GET reimbursement categories error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new reimbursement category
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
      description = ''
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
      'SELECT category_code FROM reimbursement_categories WHERE category_code = ? AND is_deleted = 0',
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
      `INSERT INTO reimbursement_categories 
       (category_code, name, description) 
       VALUES (?, ?, ?)`,
      [category_code, name, description]
    );

    // Audit log
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'create',
      'reimbursement_category',
      category_code,
      `Created reimbursement category: ${name}`
    );

    return Response.json({
      success: true,
      message: 'Reimbursement category created successfully',
      category_code: category_code
    });

  } catch (error) {
    console.error('POST reimbursement category error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update reimbursement category
export async function PUT(request) {
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

    // Check if category exists
    const existingCategory = await query(
      'SELECT category_code FROM reimbursement_categories WHERE category_code = ? AND is_deleted = 0',
      [category_code]
    );

    if (existingCategory.length === 0) {
      return Response.json(
        { success: false, error: 'Reimbursement category not found' },
        { status: 404 }
      );
    }

    // Update category
    await query(
      `UPDATE reimbursement_categories 
       SET name = ?, description = ?, is_active = ?
       WHERE category_code = ? AND is_deleted = 0`,
      [name, description, is_active, category_code]
    );

    // Audit log
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'update',
      'reimbursement_category',
      category_code,
      `Updated reimbursement category: ${name}`
    );

    return Response.json({
      success: true,
      message: 'Reimbursement category updated successfully'
    });

  } catch (error) {
    console.error('PUT reimbursement category error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete reimbursement category
export async function DELETE(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category_code = searchParams.get('category_code');

    if (!category_code) {
      return Response.json(
        { success: false, error: 'Category code is required' },
        { status: 400 }
      );
    }

    // Check if category exists
    const existingCategory = await query(
      'SELECT name FROM reimbursement_categories WHERE category_code = ? AND is_deleted = 0',
      [category_code]
    );

    if (existingCategory.length === 0) {
      return Response.json(
        { success: false, error: 'Reimbursement category not found' },
        { status: 404 }
      );
    }

    // Soft delete category
    await query(
      'UPDATE reimbursement_categories SET is_deleted = 1 WHERE category_code = ?',
      [category_code]
    );

    // Audit log
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'delete',
      'reimbursement_category',
      category_code,
      `Deleted reimbursement category: ${existingCategory[0].name}`
    );

    return Response.json({
      success: true,
      message: 'Reimbursement category deleted successfully'
    });

  } catch (error) {
    console.error('DELETE reimbursement category error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}