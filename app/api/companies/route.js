import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

// Helper function untuk audit log
async function createAuditLog(userCode, userName, action, resourceType, resourceCode, notes) {
  try {
    const auditCode = `AUD-${Date.now()}`;
    await query(
      `INSERT INTO audit_logs (audit_code, user_code, user_name, action, resource_type, resource_code, resource_name, notes, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        auditCode,
        userCode,
        userName,
        action,
        resourceType,
        resourceCode,
        `${resourceType} ${resourceCode}`,
        notes
      ]
    );
    console.log('✅ Audit log created for:', resourceType, resourceCode);
  } catch (error) {
    console.error('❌ Audit log error:', error);
  }
}

// Handle generate company code
async function handleGenerateCode() {
  try {
    let isUnique = false;
    let companyCode = '';
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      companyCode = `COMP${randomSuffix}`;
      
      const existingCompany = await query(
        'SELECT company_code FROM companies WHERE company_code = ? AND is_deleted = 0',
        [companyCode]
      );
      
      if (existingCompany.length === 0) {
        isUnique = true;
      }
      
      attempts++;
    }

    if (!isUnique) {
      return Response.json(
        { success: false, error: 'Failed to generate unique company code' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      data: { code: companyCode },
      message: 'Company code generated successfully'
    });

  } catch (error) {
    console.error('Generate company code error:', error);
    return Response.json(
      { success: false, error: 'Failed to generate company code' },
      { status: 500 }
    );
  }
}

// GET - Get all companies with pagination
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

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE is_deleted = 0';
    let params = [];

    if (search) {
      whereClause += ' AND (company_code LIKE ? OR name LIKE ? OR email LIKE ? OR tax_id LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM companies 
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get companies
    const companiesQuery = `
      SELECT 
        id,
        company_code,
        name,
        description,
        address,
        city,
        state,
        postal_code,
        country,
        phone,
        email,
        website,
        tax_id,
        status,
        is_active,
        created_at,
        updated_at
      FROM companies 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, parseInt(limit), offset];
    const companies = await query(companiesQuery, queryParams);

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
      { success: false, error: 'Internal server error' },
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
      city = '',
      state = '',
      postal_code = '',
      country = 'Indonesia',
      phone = '',
      email = '',
      website = '',
      tax_id = ''
    } = companyData;

    // Validation
    if (!company_code || !name || !tax_id) {
      return Response.json(
        { success: false, error: 'Company code, name and tax_id are required' },
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

    // Check if company name already exists
    const existingName = await query(
      'SELECT name FROM companies WHERE name = ? AND is_deleted = 0',
      [name]
    );

    if (existingName.length > 0) {
      return Response.json(
        { success: false, error: 'Company name already exists' },
        { status: 400 }
      );
    }

    // Insert company
    await query(
      `INSERT INTO companies 
       (company_code, name, description, address, city, state, postal_code, country, phone, email, website, tax_id, status, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1)`,
      [
        company_code, name, description, address, city, state, postal_code, country,
        phone, email, website, tax_id
      ]
    );

    // Audit log - FIXED parameter
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'create',
      'company',
      company_code,
      `Created company: ${name}`
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
      id,
      company_code,
      name,
      description = '',
      address = '',
      city = '',
      state = '',
      postal_code = '',
      country = 'Indonesia',
      phone = '',
      email = '',
      website = '',
      tax_id = '',
      status = 'active'
    } = companyData;

    // Validation
    if (!id || !company_code || !name || !tax_id) {
      return Response.json(
        { success: false, error: 'Company ID, code, tax id and name are required' },
        { status: 400 }
      );
    }

    // Check if company exists
    const existingCompany = await query(
      'SELECT company_code FROM companies WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (existingCompany.length === 0) {
      return Response.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    // Check if company code already exists (for other companies)
    const existingCode = await query(
      'SELECT company_code FROM companies WHERE company_code = ? AND id != ? AND is_deleted = 0',
      [company_code, id]
    );

    if (existingCode.length > 0) {
      return Response.json(
        { success: false, error: 'Company code already exists for another company' },
        { status: 400 }
      );
    }

    // Check if company name already exists (for other companies)
    const existingName = await query(
      'SELECT name FROM companies WHERE name = ? AND id != ? AND is_deleted = 0',
      [name, id]
    );

    if (existingName.length > 0) {
      return Response.json(
        { success: false, error: 'Company name already exists for another company' },
        { status: 400 }
      );
    }

    // Update company
    await query(
      `UPDATE companies 
       SET company_code = ?, name = ?, description = ?, address = ?, city = ?, state = ?, 
           postal_code = ?, country = ?, phone = ?, email = ?, website = ?, tax_id = ?, 
           status = ?, is_active = ?, updated_at = NOW()
       WHERE id = ? AND is_deleted = 0`,
      [
        company_code, name, description, address, city, state, postal_code, country,
        phone, email, website, tax_id, status, status === 'active' ? 1 : 0, id
      ]
    );

    // Audit log - FIXED parameter
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

// DELETE - Soft delete company
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
        { success: false, error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Check if company exists
    const existingCompany = await query(
      'SELECT company_code, name FROM companies WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (existingCompany.length === 0) {
      return Response.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    const company = existingCompany[0];

    // Soft delete company
    await query(
      'UPDATE companies SET is_deleted = 1, deleted_at = NOW() WHERE id = ?',
      [id]
    );

    // Audit log - FIXED parameter
    await createAuditLog(
      decoded.user_code,
      decoded.name,
      'delete',
      'company',
      company.company_code,
      `Deleted company: ${company.name}`
    );

    return Response.json({
      success: true,
      message: 'Company deleted successfully'
    });

  } catch (error) {
    console.error('DELETE company error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Separate route for generate-code
export async function GET_GENERATE_CODE(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    return handleGenerateCode();
  } catch (error) {
    console.error('Generate code error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}