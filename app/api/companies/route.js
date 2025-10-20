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

// GET - Get all companies with pagination and search
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
      whereClause += ' AND (company_code LIKE ? OR name LIKE ? OR description LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM companies 
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get companies - FIXED: ORDER BY dan parameter placement
    const companyQuery = `
      SELECT 
        id,
        company_code,
        name,
        description,
        address,
        phone,
        email,
        is_active,
        created_at
      FROM companies 
      ${whereClause}
      ORDER BY name
      LIMIT ? OFFSET ?
    `;

    // FIXED: Push limit dan offset ke params array
    const queryParams = [...params, parseInt(limit), offset];
    const companies = await query(companyQuery, queryParams);

    return Response.json({
      success: true,
      data: companies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('GET companies error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new company
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const companyData = await request.json();
    const {
      company_code,
      name,
      description = '',
      address = '',
      phone = '',
      email = ''
    } = companyData;

    // Validation
    if (!company_code || !name) {
      return Response.json(
        { success: false, error: 'Company code and name are required' },
        { status: 400 }
      );
    }

    // Check if company code already exists
    const existingCompany = await query(
      'SELECT company_code FROM companies WHERE company_code = ? AND is_deleted = 0',
      [company_code]
    );

    if (existingCompany.length > 0) {
      return Response.json(
        { success: false, error: 'Company code already exists' },
        { status: 400 }
      );
    }

    // Insert company
    await query(
      `INSERT INTO companies 
       (company_code, name, description, address, phone, email) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [company_code, name, description, address, phone, email]
    );

    // Audit log
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'create',
      'company',
      company_code,
      `Created new company: ${name}`
    );

    return Response.json({
      success: true,
      message: 'Company created successfully',
      company_code: company_code
    });

  } catch (error) {
    console.error('POST company error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update company
export async function PUT(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const companyData = await request.json();
    const {
      company_code,
      name,
      description = '',
      address = '',
      phone = '',
      email = '',
      is_active = true
    } = companyData;

    // Validation
    if (!company_code || !name) {
      return Response.json(
        { success: false, error: 'Company code and name are required' },
        { status: 400 }
      );
    }

    // Check if company exists
    const existingCompany = await query(
      'SELECT company_code FROM companies WHERE company_code = ? AND is_deleted = 0',
      [company_code]
    );

    if (existingCompany.length === 0) {
      return Response.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    // Update company
    await query(
      `UPDATE companies 
       SET name = ?, description = ?, address = ?, phone = ?, email = ?, is_active = ?
       WHERE company_code = ? AND is_deleted = 0`,
      [name, description, address, phone, email, is_active ? 1 : 0, company_code]
    );

    // Audit log
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'update',
      'company',
      company_code,
      `Updated company: ${name}`
    );

    return Response.json({
      success: true,
      message: 'Company updated successfully'
    });

  } catch (error) {
    console.error('PUT company error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}