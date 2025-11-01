import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE p.is_deleted = FALSE';
    let params = [];

    if (search) {
      whereClause += ' AND (p.project_code LIKE ? OR p.name LIKE ? OR p.client_name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (status && status !== 'all') {
      whereClause += ' AND p.status = ?';
      params.push(status);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM projects p
      LEFT JOIN companies c ON p.company_code = c.company_code
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get projects dengan company name
    const projects = await query(
      `SELECT 
        p.id,
        p.project_code,
        p.name,
        p.description,
        p.client_name,
        p.company_code,
        c.name as company_name,
        p.start_date,
        p.end_date,
        p.budget,
        p.status,
        p.created_at,
        p.updated_at
       FROM projects p
       LEFT JOIN companies c ON p.company_code = c.company_code
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    return Response.json({
      success: true,
      data: projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get projects error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, client_name, company_code, start_date, end_date, budget } = await request.json();

    if (!name) {
      return Response.json({ error: 'Project name is required' }, { status: 400 });
    }

    // Generate project code
    const countResult = await query('SELECT COUNT(*) as count FROM projects');
    const projectCode = `PROJ-${new Date().getFullYear()}-${String(countResult[0].count + 1).padStart(3, '0')}`;

    await query(
      `INSERT INTO projects 
       (project_code, name, description, client_name, company_code, start_date, end_date, budget, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [projectCode, name, description, client_name, company_code, start_date, end_date, budget]
    );

    return Response.json({
      success: true,
      message: 'Project created successfully',
      project_code: projectCode
    });

  } catch (error) {
    console.error('Create project error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_code, name, description, client_name, company_code, start_date, end_date, budget, status } = await request.json();

    if (!project_code || !name) {
      return Response.json({ error: 'Project code and name are required' }, { status: 400 });
    }

    await query(
      `UPDATE projects 
       SET name = ?, description = ?, client_name = ?, company_code = ?, start_date = ?, end_date = ?, budget = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE project_code = ?`,
      [name, description, client_name, company_code, start_date, end_date, budget, status, project_code]
    );

    return Response.json({
      success: true,
      message: 'Project updated successfully'
    });

  } catch (error) {
    console.error('Update project error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const project_code = searchParams.get('project_code');

    if (!project_code) {
      return Response.json({ error: 'Project code is required' }, { status: 400 });
    }

    await query(
      'UPDATE projects SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP WHERE project_code = ?',
      [project_code]
    );

    return Response.json({
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Delete project error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}