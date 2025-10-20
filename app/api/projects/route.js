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

    let whereClause = 'WHERE is_deleted = FALSE';
    let params = [];

    if (search) {
      whereClause += ' AND (project_code LIKE ? OR name LIKE ? OR client_name LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (status && status !== 'all') {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM projects 
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Get projects dengan pagination
    const projects = await query(
      `SELECT 
        id,
        project_code,
        name,
        description,
        client_name,
        start_date,
        end_date,
        budget,
        status,
        created_at,
        updated_at
       FROM projects 
       ${whereClause}
       ORDER BY created_at DESC
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

    const { name, description, client_name, start_date, end_date, budget } = await request.json();

    if (!name) {
      return Response.json({ error: 'Project name is required' }, { status: 400 });
    }

    // Generate project code
    const countResult = await query('SELECT COUNT(*) as count FROM projects');
    const projectCode = `PROJ-${new Date().getFullYear()}-${String(countResult[0].count + 1).padStart(3, '0')}`;

    await query(
      `INSERT INTO projects 
       (project_code, name, description, client_name, start_date, end_date, budget, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [projectCode, name, description, client_name, start_date, end_date, budget]
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