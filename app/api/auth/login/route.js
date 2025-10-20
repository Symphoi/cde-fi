import { query } from '@/app/lib/db';
import { generateToken } from '@/app/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { error: 'Email dan password harus diisi' },
        { status: 400 }
      );
    }

    // Cari user by email
    const users = await query(
      `SELECT u.*, r.role_code, r.name as role_name 
       FROM users u
       LEFT JOIN user_roles ur ON u.user_code = ur.user_code AND ur.is_deleted = 0
       LEFT JOIN roles r ON ur.role_code = r.role_code AND r.is_deleted = 0
       WHERE u.email = ? AND u.is_deleted = 0 AND u.status = 'active'`,
      [email]
    );

    if (users.length === 0) {
      return Response.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    const user = users[0];
    
    // Verify password dengan bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

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
       WHERE ur.user_code = ? AND ur.is_deleted = 0 AND r.is_deleted = 0`,
      [user.user_code]
    );

    // Get user permissions
    const permissions = await query(
      `SELECT p.permission_code, p.name, p.category, p.module, p.action
       FROM permissions p
       JOIN role_permissions rp ON p.permission_code = rp.permission_code AND rp.is_deleted = 0
       JOIN user_roles ur ON rp.role_code = ur.role_code AND ur.is_deleted = 0
       WHERE ur.user_code = ? AND p.is_deleted = 0`,
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