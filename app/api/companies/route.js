import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';

// Helper function untuk save logo
async function saveLogo(file) {
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop();
  const filename = `logo_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
  
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'company-logos');
  await mkdir(uploadDir, { recursive: true });
  
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);

  return `/uploads/company-logos/${filename}`;
}

// Helper function untuk hapus logo lama
async function deleteOldLogo(logoUrl) {
  try {
    if (logoUrl && logoUrl.startsWith('/uploads/company-logos/')) {
      const oldFilePath = path.join(process.cwd(), 'public', logoUrl);
      await unlink(oldFilePath);
    }
  } catch (error) {
    console.error('Error deleting old logo:', error);
  }
}

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
        logo_url,
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

// POST - Create new company with logo
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Cek apakah request adalah JSON biasa atau FormData
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // Handle JSON request (tanpa logo)
      const companyData = await request.json();
      return await createCompanyWithoutLogo(companyData, decoded);
    } else if (contentType.includes('multipart/form-data')) {
      // Handle FormData request (dengan logo)
      return await createCompanyWithLogo(request, decoded);
    } else {
      return Response.json(
        { success: false, error: 'Invalid content-type' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('POST company error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper: Create company without logo (JSON)
async function createCompanyWithoutLogo(companyData, decoded) {
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
}

// Helper: Create company with logo (FormData)
async function createCompanyWithLogo(request, decoded) {
  const formData = await request.formData();
  const dataField = formData.get('data');
  const logoFile = formData.get('logo');

  if (!dataField) {
    return Response.json(
      { success: false, error: 'Missing data field' },
      { status: 400 }
    );
  }

  const companyData = JSON.parse(dataField);
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

  let logo_url = null;

  // Handle logo upload jika ada
  if (logoFile && logoFile.size > 0) {
    // Validasi file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(logoFile.type)) {
      return Response.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, GIF, WebP allowed' },
        { status: 400 }
      );
    }

    // Validasi file size (max 5MB)
    if (logoFile.size > 5 * 1024 * 1024) {
      return Response.json(
        { success: false, error: 'File too large. Maximum 5MB allowed' },
        { status: 400 }
      );
    }

    // Save logo
    logo_url = await saveLogo(logoFile);
  }

  // Insert company
  await query(
    `INSERT INTO companies 
     (company_code, name, description, address, city, state, postal_code, 
      country, phone, email, website, tax_id, logo_url, status, is_active) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1)`,
    [
      company_code, name, description, address, city, state, postal_code, country,
      phone, email, website, tax_id, logo_url
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
    company_code: company_code,
    logo_url: logo_url
  });
}

// PUT - Update company with logo
export async function PUT(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Cek apakah request adalah JSON biasa atau FormData
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // Handle JSON request (tanpa logo)
      const companyData = await request.json();
      return await updateCompanyWithoutLogo(companyData, decoded);
    } else if (contentType.includes('multipart/form-data')) {
      // Handle FormData request (dengan logo)
      return await updateCompanyWithLogo(request, decoded);
    } else {
      return Response.json(
        { success: false, error: 'Invalid content-type' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('PUT company error:', error);
    return Response.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper: Update company without logo (JSON)
async function updateCompanyWithoutLogo(companyData, decoded) {
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
}

// Helper: Update company with logo (FormData)
async function updateCompanyWithLogo(request, decoded) {
  const formData = await request.formData();
  const dataField = formData.get('data');
  const logoFile = formData.get('logo');

  if (!dataField) {
    return Response.json(
      { success: false, error: 'Missing data field' },
      { status: 400 }
    );
  }

  const companyData = JSON.parse(dataField);
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
    'SELECT company_code, logo_url FROM companies WHERE id = ? AND is_deleted = 0',
    [id]
  );

  if (existingCompany.length === 0) {
    return Response.json(
      { success: false, error: 'Company not found' },
      { status: 404 }
    );
  }

  const oldLogoUrl = existingCompany[0].logo_url;
  let newLogoUrl = oldLogoUrl;

  // Handle logo upload jika ada file baru
  if (logoFile && logoFile.size > 0) {
    // Validasi file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(logoFile.type)) {
      return Response.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, GIF, WebP allowed' },
        { status: 400 }
      );
    }

    // Validasi file size (max 5MB)
    if (logoFile.size > 5 * 1024 * 1024) {
      return Response.json(
        { success: false, error: 'File too large. Maximum 5MB allowed' },
        { status: 400 }
      );
    }

    // Hapus logo lama jika ada
    if (oldLogoUrl) {
      await deleteOldLogo(oldLogoUrl);
    }

    // Save logo baru
    newLogoUrl = await saveLogo(logoFile);
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
         logo_url = ?, status = ?, is_active = ?, updated_at = NOW()
     WHERE id = ? AND is_deleted = 0`,
    [
      company_code, name, description, address, city, state, postal_code, country,
      phone, email, website, tax_id, newLogoUrl, status, status === 'active' ? 1 : 0, id
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
    message: 'Company updated successfully',
    logo_url: newLogoUrl
  });
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
      'SELECT company_code, name, logo_url FROM companies WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (existingCompany.length === 0) {
      return Response.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    const company = existingCompany[0];

    // Hapus logo jika ada
    if (company.logo_url) {
      await deleteOldLogo(company.logo_url);
    }

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

// Handle generate company code (internal function)
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