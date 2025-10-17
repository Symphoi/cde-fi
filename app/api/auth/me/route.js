import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return Response.json(
        { error: 'Token required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return Response.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user data dengan roles dan permissions
    const users = await query(
      `SELECT u.* FROM users u WHERE u.user_code = ? AND u.is_deleted = FALSE`,
      [decoded.user_code]
    );

    if (users.length === 0) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];

    const userRoles = await query(
      `SELECT r.role_code, r.name as role_name 
       FROM user_roles ur
       JOIN roles r ON ur.role_code = r.role_code 
       WHERE ur.user_code = ? AND ur.is_deleted = FALSE AND r.is_deleted = FALSE`,
      [user.user_code]
    );

    const permissions = await query(
      `SELECT p.permission_code, p.name, p.category, p.module, p.action
       FROM permissions p
       JOIN role_permissions rp ON p.permission_code = rp.permission_code AND rp.is_deleted = FALSE
       JOIN user_roles ur ON rp.role_code = ur.role_code AND ur.is_deleted = FALSE
       WHERE ur.user_code = ? AND p.is_deleted = FALSE`,
      [user.user_code]
    );

    return Response.json({
      success: true,
      user: {
        user_code: user.user_code,
        name: user.name,
        email: user.email,
        department: user.department,
        position: user.position,
        roles: userRoles,
        permissions: permissions
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
