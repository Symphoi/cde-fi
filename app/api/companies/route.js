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

// Handle generate company code
async function handleGenerateCode() {
  try {
    let isUnique = false;
    let companyCode = '';
    let attempts = 0;
    const maxAttempts = 10;

    // Generate unique company code
    while (!isUnique && attempts < maxAttempts) {
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      companyCode = `COMP${randomSuffix}`;
      
      // Check if code already exists
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

// GET - Handle semua GET requests (companies list DAN generate-code)
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // CEK JIKA INI REQUEST UNTUK GENERATE CODE
    const url = new URL(request.url);
    if (url.pathname === '/api/companies/generate-code') {
      return handleGenerateCode();
    }

    // JIKA BUKAN, PROSES GET COMPANIES BIASA
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
      whereClause += ' AND (company_code LIKE ? OR name LIKE ? OR legal_name LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // Validate sort column untuk prevent SQL injection
    const validSortColumns = ['company_code', 'name', 'created_at', 'status'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

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
        legal_name,
        description,
        industry,
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
        created_at,
        updated_at
      FROM companies 
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
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
      legal_name = '',
      description = '',
      industry = '',
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
       (company_code, name, legal_name, description, industry, address, city, state, postal_code, country, phone, email, website, tax_id, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company_code, name, legal_name, description, industry, 
        address, city, state, postal_code, country, 
        phone, email, website, tax_id, status
      ]
    );

    // Audit log
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
      legal_name = '',
      description = '',
      industry = '',
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
    if (!id || !company_code || !name) {
      return Response.json(
        { success: false, error: 'Company ID, code and name are required' },
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

    // Update company
    await query(
      `UPDATE companies 
       SET company_code = ?, name = ?, legal_name = ?, description = ?, industry = ?, 
           address = ?, city = ?, state = ?, postal_code = ?, country = ?, 
           phone = ?, email = ?, website = ?, tax_id = ?, status = ?, updated_at = NOW()
       WHERE id = ? AND is_deleted = 0`,
      [
        company_code, name, legal_name, description, industry,
        address, city, state, postal_code, country,
        phone, email, website, tax_id, status, id
      ]
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

    // Audit log
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