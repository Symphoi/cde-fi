import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

// Helper function untuk audit log
// async function createAuditLog(userCode, userName, action, resourceType, resourceCode, notes) {
  try {
    const auditCode = `AUD-${Date.now()}`;
    
    // Map resource type ke nilai yang valid
    const validResourceTypes = {
      'tax_type': 'payment' // menggunakan 'payment' sebagai resource type yang valid
    };
    
    const mappedResourceType = validResourceTypes[resourceType] || resourceType;
    
    await query(
      `INSERT INTO audit_logs (audit_code, user_code, user_name, action, resource_type, resource_code, resource_name, notes, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [auditCode, userCode, userName, action, mappedResourceType, resourceCode, `${resourceType} ${resourceCode}`, notes]
    );
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
// }

// GET - Get all tax types
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
    const showInactive = searchParams.get('show_inactive') === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE is_deleted = 0';
    let params = [];

    if (!showInactive) {
      whereClause += ' AND is_active = 1';
    }

    if (search) {
      whereClause += ' AND (tax_code LIKE ? OR name LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM tax_types 
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get tax types
    const taxQuery = `
      SELECT 
        id,
        tax_code,
        name,
        description,
        tax_rate,
        tax_type,
        is_active,
        created_at,
        updated_at
      FROM tax_types 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, parseInt(limit), offset];
    const taxTypes = await query(taxQuery, queryParams);

    return Response.json({
      success: true,
      data: taxTypes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('GET tax types error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new tax type
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const taxData = await request.json();
    const {
      tax_code,
      name,
      description = '',
      tax_rate,
      tax_type = 'vat',
      is_active = true
    } = taxData;

    // Validation
    if (!tax_code || !name || !tax_rate) {
      return Response.json(
        { success: false, error: 'Tax code, name, and tax rate are required' },
        { status: 400 }
      );
    }

    // Check if tax code already exists
    const existingTax = await query(
      'SELECT tax_code FROM tax_types WHERE tax_code = ? AND is_deleted = 0',
      [tax_code]
    );

    if (existingTax.length > 0) {
      return Response.json(
        { success: false, error: 'Tax code already exists' },
        { status: 400 }
      );
    }

    // Insert tax type
    await query(
      `INSERT INTO tax_types 
       (tax_code, name, description, tax_rate, tax_type, is_active) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tax_code, name, description, parseFloat(tax_rate), tax_type, is_active ? 1 : 0]
    );

    // Audit log
    // await createAuditLog(
    //   decoded.user_code,
    //   decoded.name,
    //   'create',
    //   'tax_type',
    //   tax_code,
    //   `Created new tax type: ${name} (${tax_rate}%)`
    // );

    return Response.json({
      success: true,
      message: 'Tax type created successfully',
      tax_code: tax_code
    });

  } catch (error) {
    console.error('POST tax type error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update tax type
export async function PUT(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const taxData = await request.json();
    const {
      tax_code,
      name,
      description = '',
      tax_rate,
      tax_type = 'vat',
      is_active = true
    } = taxData;

    // Validation
    if (!tax_code || !name || !tax_rate) {
      return Response.json(
        { success: false, error: 'Tax code, name, and tax rate are required' },
        { status: 400 }
      );
    }

    // Check if tax exists
    const existingTax = await query(
      'SELECT tax_code FROM tax_types WHERE tax_code = ? AND is_deleted = 0',
      [tax_code]
    );

    if (existingTax.length === 0) {
      return Response.json(
        { success: false, error: 'Tax type not found' },
        { status: 404 }
      );
    }

    // Update tax type
    await query(
      `UPDATE tax_types 
       SET name = ?, description = ?, tax_rate = ?, tax_type = ?, is_active = ?, updated_at = NOW()
       WHERE tax_code = ? AND is_deleted = 0`,
      [name, description, parseFloat(tax_rate), tax_type, is_active ? 1 : 0, tax_code]
    );

    // Audit log
    // await createAuditLog(
    //   decoded.user_code,
    //   decoded.name,
    //   'update',
    //   'tax_type',
    //   tax_code,
    //   `Updated tax type: ${name} (${tax_rate}%)`
    // );

    return Response.json({
      success: true,
      message: 'Tax type updated successfully'
    });

  } catch (error) {
    console.error('PUT tax type error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete tax type
export async function DELETE(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tax_code = searchParams.get('tax_code');

    if (!tax_code) {
      return Response.json(
        { success: false, error: 'Tax code is required' },
        { status: 400 }
      );
    }

    // Check if tax exists
    const existingTax = await query(
      'SELECT name FROM tax_types WHERE tax_code = ? AND is_deleted = 0',
      [tax_code]
    );

    if (existingTax.length === 0) {
      return Response.json(
        { success: false, error: 'Tax type not found' },
        { status: 404 }
      );
    }

    // Soft delete tax type
    await query(
      `UPDATE tax_types 
       SET is_deleted = 1, deleted_at = NOW()
       WHERE tax_code = ?`,
      [tax_code]
    );

    // Audit log
    // await createAuditLog(
    //   decoded.user_code,
    //   decoded.name,
    //   'delete',
    //   'tax_type',
    //   tax_code,
    //   `Deleted tax type: ${existingTax[0].name}`
    // );

    return Response.json({
      success: true,
      message: 'Tax type deleted successfully'
    });

  } catch (error) {
    console.error('DELETE tax type error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}