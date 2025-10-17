import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        status
       FROM projects 
       WHERE is_deleted = FALSE
       ORDER BY created_at DESC`
    );

    return Response.json({
      success: true,
      data: projects
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