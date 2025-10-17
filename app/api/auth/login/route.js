import { query } from '@/app/lib/db';
import { generateToken } from '@/app/lib/auth';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Cari user by email
    const users = await query(
      `SELECT u.*, r.role_code, r.name as role_name 
       FROM users u
       LEFT JOIN user_roles ur ON u.user_code = ur.user_code AND ur.is_deleted = FALSE
       LEFT JOIN roles r ON ur.role_code = r.role_code AND r.is_deleted = FALSE
       WHERE u.email = ? AND u.is_deleted = FALSE`,
      [email]
    );

    if (users.length === 0) {
      return Response.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    const user = users[0];
    
    // Verify password (simple check - ganti dengan bcrypt.compare nanti)
    const isValidPassword = password === 'password123'; // Temporary

    if (!isValidPassword) {
      return Response.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Get user roles
    const userRoles = await query(
      `SELECT r.role_code, r.name as role_name 
       FROM user_roles ur
       JOIN roles r ON ur.role_code = r.role_code 
       WHERE ur.user_code = ? AND ur.is_deleted = FALSE AND r.is_deleted = FALSE`,
      [user.user_code]
    );

    // Get user permissions
    const permissions = await query(
      `SELECT p.permission_code, p.name, p.category, p.module, p.action
       FROM permissions p
       JOIN role_permissions rp ON p.permission_code = rp.permission_code AND rp.is_deleted = FALSE
       JOIN user_roles ur ON rp.role_code = ur.role_code AND ur.is_deleted = FALSE
       WHERE ur.user_code = ? AND p.is_deleted = FALSE`,
      [user.user_code]
    );

    const token = generateToken(user);

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE user_code = ?',
      [user.user_code]
    );

    return Response.json({
      success: true,
      token,
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
    console.error('Login error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
