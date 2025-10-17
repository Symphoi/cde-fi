import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taxTypes = await query(
      `SELECT 
        id,
        tax_code,
        name,
        description
       FROM tax_types 
       WHERE is_active = TRUE AND is_deleted = FALSE
       ORDER BY name`
    );

    return Response.json({
      success: true,
      data: taxTypes
    });

  } catch (error) {
    console.error('Get tax types error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}