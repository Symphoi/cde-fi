'use server';

import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';
import { pool } from '@/app/lib/db';

// ==================== HELPER FUNCTIONS ====================
const safeJsonParse = (value) => {
  if (!value) return null;
  
  // Jika sudah object, langsung return
  if (typeof value === 'object') {
    return value;
  }
  
  // Jika string, coba parse
  if (typeof value === 'string') {
    try {
      // Cek jika string kosong atau 'null'
      if (value.trim() === '' || value.toLowerCase() === 'null') {
        return null;
      }
      return JSON.parse(value);
    } catch (error) {
      console.warn('JSON parse error:', error.message, 'Value:', value.substring(0, 100));
      // Jika tidak bisa di-parse, return sebagai string
      return value;
    }
  }
  
  return value;
};

const validateUserData = (userData, isCreate = false) => {
  const { name, email, password, roles = [] } = userData;
  
  // Validasi nama
  if (!name || name.trim() === '') {
    return 'Nama harus diisi';
  }
  
  // Cegah nama mengandung format email
  if (name.includes('@') && name.includes('.')) {
    return 'Nama tidak boleh mengandung format email';
  }
  
  // Validasi email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return 'Format email tidak valid';
  }
  
  // Cegah email mengandung karakter password hash
  if (email.includes('$2a$') || email.includes('$2b$')) {
    return 'Email tidak valid';
  }
  
  // Validasi password untuk create
  if (isCreate) {
    if (!password || password.length < 6) {
      return 'Password minimal 6 karakter';
    }
  } else {
    // Untuk update, password optional tapi jika diisi harus valid
    if (password && password.length > 0 && password.length < 6) {
      return 'Password minimal 6 karakter';
    }
  }
  
  // Validasi roles array
  if (!Array.isArray(roles)) {
    return 'Roles harus berupa array';
  }
  
  return null; // No error
};

const sanitizeForAudit = (data) => {
  if (!data) return data;
  
  const { password_hash, password, ...safeData } = data;
  return safeData;
};

async function updateUserRoles(connection, user_code, newRoles, decoded) {
  // Get current roles
  const [currentRoles] = await connection.query(
    'SELECT role_code FROM user_roles WHERE user_code = ? AND is_deleted = 0',
    [user_code]
  );
  
  const currentRoleCodes = currentRoles.map(r => r.role_code);
  
  // Roles to remove
  const rolesToRemove = currentRoleCodes.filter(
    role => !newRoles.includes(role)
  );
  
  if (rolesToRemove.length > 0) {
    // Build IN clause manually untuk menghindari SQL injection
    const placeholders = rolesToRemove.map(() => '?').join(',');
    await connection.query(
      `UPDATE user_roles 
       SET is_deleted = 1, deleted_at = NOW(), updated_by = ?, deleted_by = ?
       WHERE user_code = ? AND role_code IN (${placeholders})`,
      [decoded.user_code, decoded.user_code, user_code, ...rolesToRemove]
    );
  }
  
  // Roles to add
  const rolesToAdd = newRoles.filter(
    role => !currentRoleCodes.includes(role)
  );
  
  for (const role_code of rolesToAdd) {
    // Check if already exists (soft deleted)
    const [existing] = await connection.query(
      'SELECT id FROM user_roles WHERE user_code = ? AND role_code = ?',
      [user_code, role_code]
    );
    
    const userRoleCode = `UR-${Date.now()}-${process.pid}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (existing.length > 0) {
      // Reactivate existing
      await connection.query(
        `UPDATE user_roles 
         SET is_deleted = 0, deleted_at = NULL, updated_at = NOW(),
             user_role_code = ?, updated_by = ?
         WHERE user_code = ? AND role_code = ?`,
        [userRoleCode, decoded.user_code, user_code, role_code]
      );
    } else {
      // Insert new
      await connection.query(
        `INSERT INTO user_roles 
         (user_role_code, user_code, role_code, created_by)
         VALUES (?, ?, ?, ?)`,
        [userRoleCode, user_code, role_code, decoded.user_code]
      );
    }
  }
}

async function updateRolePermissions(connection, role_code, newPermissions, decoded) {
  // Get current permissions
  const [currentPermissions] = await connection.query(
    'SELECT permission_code FROM role_permissions WHERE role_code = ? AND is_deleted = 0',
    [role_code]
  );
  
  const currentPermCodes = currentPermissions.map(p => p.permission_code);
  
  // Permissions to remove
  const permsToRemove = currentPermCodes.filter(
    perm => !newPermissions.includes(perm)
  );
  
  if (permsToRemove.length > 0) {
    const placeholders = permsToRemove.map(() => '?').join(',');
    await connection.query(
      `UPDATE role_permissions 
       SET is_deleted = 1, deleted_at = NOW(), updated_by = ?, deleted_by = ?
       WHERE role_code = ? AND permission_code IN (${placeholders})`,
      [decoded.user_code, decoded.user_code, role_code, ...permsToRemove]
    );
  }
  
  // Permissions to add
  const permsToAdd = newPermissions.filter(
    perm => !currentPermCodes.includes(perm)
  );
  
  for (const permission_code of permsToAdd) {
    // Check if already exists (soft deleted)
    const [existing] = await connection.query(
      'SELECT id FROM role_permissions WHERE role_code = ? AND permission_code = ?',
      [role_code, permission_code]
    );
    
    const rolePermissionCode = `RP-${Date.now()}-${process.pid}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (existing.length > 0) {
      // Reactivate existing
      await connection.query(
        `UPDATE role_permissions 
         SET is_deleted = 0, deleted_at = NULL, updated_at = NOW(),
             role_permission_code = ?, updated_by = ?
         WHERE role_code = ? AND permission_code = ?`,
        [rolePermissionCode, decoded.user_code, role_code, permission_code]
      );
    } else {
      // Insert new
      await connection.query(
        `INSERT INTO role_permissions 
         (role_permission_code, role_code, permission_code, created_by)
         VALUES (?, ?, ?, ?)`,
        [rolePermissionCode, role_code, permission_code, decoded.user_code]
      );
    }
  }
}

async function createAuditLog(connection, user_code, user_name, action, resource_type, resource_id, resource_name, old_values, new_values, notes) {
  const audit_code = `AUDIT-${Date.now()}-${process.pid}-${Math.random().toString(36).substr(2, 9)}`;
  
  await connection.query(
    `INSERT INTO user_logs 
     (audit_code, user_code, user_name, action, resource_type, resource_code, resource_name, old_values, new_values, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      audit_code,
      user_code,
      user_name,
      action,
      resource_type,
      resource_id,
      resource_name,
      old_values ? JSON.stringify(old_values) : null,
      new_values ? JSON.stringify(new_values) : null,
      notes
    ]
  );
}

// ==================== GET - Handle semua data RBAC ====================
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const type = searchParams.get('type');
    const search = searchParams.get('search') || '';

    // Get all RBAC data untuk frontend
    if (action === 'all') {
      return await handleGetAllRBACData();
    }

    // Get specific data
    if (type === 'users') {
      return await handleGetUsers(search);
    } else if (type === 'roles') {
      return await handleGetRoles(search);
    } else if (type === 'permissions') {
      return await handleGetPermissions(search);
    } else if (type === 'audit') {
      return await handleGetAuditLogs(request);
    }

    return Response.json({ error: 'Invalid type parameter' }, { status: 400 });

  } catch (error) {
    console.error('GET RBAC error:', error);
    return Response.json({ error: 'Gagal memuat data RBAC' }, { status: 500 });
  }
}

// Get semua data RBAC sekaligus
async function handleGetAllRBACData() {
  try {
    // Get users dengan roles
    const users = await query(`
      SELECT 
        u.id, u.user_code, u.name, u.email, u.department, u.position, u.status, 
        u.last_login, u.created_at,
        GROUP_CONCAT(DISTINCT ur.role_code) as role_codes
      FROM users u
      LEFT JOIN user_roles ur ON u.user_code = ur.user_code AND ur.is_deleted = 0
      WHERE u.is_deleted = 0
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    // Get roles dengan permissions
    const roles = await query(`
      SELECT 
        r.id, r.role_code, r.name, r.description, r.is_system_role, r.created_at,
        GROUP_CONCAT(DISTINCT rp.permission_code) as permission_codes,
        COUNT(DISTINCT ur.user_code) as user_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.role_code = rp.role_code AND rp.is_deleted = 0
      LEFT JOIN user_roles ur ON r.role_code = ur.role_code AND ur.is_deleted = 0
      WHERE r.is_deleted = 0
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `);

    // Get permissions
    const permissions = await query(`
      SELECT 
        id,
        permission_code as code,
        name,
        description,
        category,
        module,
        action,
        created_at
      FROM permissions 
      WHERE is_deleted = 0 
      ORDER BY category, module, action
    `);

    // Get audit logs untuk RBAC saja
    const auditLogs = await query(`
      SELECT 
        id,
        audit_code as code,
        user_code,
        user_name,
        action,
        resource_type,
        resource_code,
        resource_name,
        old_values,
        new_values,
        timestamp,
        notes
      FROM user_logs 
      WHERE is_deleted = 0 
      AND resource_type IN ('user', 'role', 'permission', 'user_role', 'role_permission')
      ORDER BY timestamp DESC 
      LIMIT 100
    `);

    return Response.json({
      success: true,
      data: {
        users: users.map(user => ({
          id: user.id,
          user_code: user.user_code,
          name: user.name,
          email: user.email,
          department: user.department,
          position: user.position,
          status: user.status,
          lastLogin: user.last_login,
          createdAt: user.created_at,
          roles: user.role_codes ? user.role_codes.split(',').filter(r => r) : []
        })),
        roles: roles.map(role => ({
          id: role.id,
          role_code: role.role_code,
          name: role.name,
          description: role.description,
          isSystemRole: Boolean(role.is_system_role),
          createdAt: role.created_at,
          permissions: role.permission_codes ? role.permission_codes.split(',').filter(p => p) : [],
          userCount: parseInt(role.user_count) || 0
        })),
        permissions: permissions.map(perm => ({
          id: perm.id,
          code: perm.code,
          name: perm.name,
          description: perm.description,
          category: perm.category,
          module: perm.module,
          action: perm.action,
          createdAt: perm.created_at
        })),
        auditLogs: auditLogs.map(log => ({
          id: log.id,
          code: log.code,
          userId: log.user_code,
          userName: log.user_name,
          action: log.action,
          resourceType: log.resource_type,
          resourceId: log.resource_code,
          resourceName: log.resource_name,
          oldValues: safeJsonParse(log.old_values),
          newValues: safeJsonParse(log.new_values),
          timestamp: log.timestamp,
          notes: log.notes
        }))
      }
    });
  } catch (error) {
    console.error('Get all RBAC error:', error);
    return Response.json({ error: 'Gagal memuat data' }, { status: 500 });
  }
}

// Get users dengan filter search
async function handleGetUsers(search) {
  try {
    let sql = `
      SELECT 
        u.id, u.user_code, u.name, u.email, u.department, u.position, u.status, 
        u.last_login, u.created_at,
        GROUP_CONCAT(DISTINCT ur.role_code) as role_codes
      FROM users u
      LEFT JOIN user_roles ur ON u.user_code = ur.user_code AND ur.is_deleted = 0
      WHERE u.is_deleted = 0
    `;
    
    const params = [];

    if (search) {
      sql += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.department LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ` GROUP BY u.id ORDER BY u.created_at DESC`;

    const users = await query(sql, params);

    return Response.json({
      success: true,
      data: users.map(user => ({
        id: user.id,
        user_code: user.user_code,
        name: user.name,
        email: user.email,
        department: user.department,
        position: user.position,
        status: user.status,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        roles: user.role_codes ? user.role_codes.split(',').filter(r => r) : []
      }))
    });
  } catch (error) {
    console.error('Get users error:', error);
    return Response.json({ error: 'Gagal memuat data users' }, { status: 500 });
  }
}

// Get roles dengan filter search
async function handleGetRoles(search) {
  try {
    let sql = `
      SELECT 
        r.id, r.role_code, r.name, r.description, r.is_system_role, r.created_at,
        GROUP_CONCAT(DISTINCT rp.permission_code) as permission_codes,
        COUNT(DISTINCT ur.user_code) as user_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.role_code = rp.role_code AND rp.is_deleted = 0
      LEFT JOIN user_roles ur ON r.role_code = ur.role_code AND ur.is_deleted = 0
      WHERE r.is_deleted = 0
    `;
    
    const params = [];

    if (search) {
      sql += ` AND (r.name LIKE ? OR r.description LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    sql += ` GROUP BY r.id ORDER BY r.created_at DESC`;

    const roles = await query(sql, params);

    return Response.json({
      success: true,
      data: roles.map(role => ({
        id: role.id,
        role_code: role.role_code,
        name: role.name,
        description: role.description,
        isSystemRole: Boolean(role.is_system_role),
        createdAt: role.created_at,
        permissions: role.permission_codes ? role.permission_codes.split(',').filter(p => p) : [],
        userCount: parseInt(role.user_count) || 0
      }))
    });
  } catch (error) {
    console.error('Get roles error:', error);
    return Response.json({ error: 'Gagal memuat data roles' }, { status: 500 });
  }
}

// Get permissions dengan filter search
async function handleGetPermissions(search) {
  try {
    let sql = `
      SELECT 
        id,
        permission_code as code,
        name,
        description,
        category,
        module,
        action,
        created_at
      FROM permissions 
      WHERE is_deleted = 0
    `;
    
    const params = [];

    if (search) {
      sql += ` AND (name LIKE ? OR description LIKE ? OR category LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ` ORDER BY category, module, action`;

    const permissions = await query(sql, params);

    // Group by category untuk frontend
    const permissionsByCategory = permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push({
        id: permission.id,
        code: permission.code,
        name: permission.name,
        description: permission.description,
        category: permission.category,
        module: permission.module,
        action: permission.action,
        createdAt: permission.created_at
      });
      return acc;
    }, {});

    return Response.json({
      success: true,
      data: permissionsByCategory,
      allPermissions: permissions.map(perm => ({
        id: perm.id,
        code: perm.code,
        name: perm.name,
        description: perm.description,
        category: perm.category,
        module: perm.module,
        action: perm.action,
        createdAt: perm.created_at
      }))
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    return Response.json({ error: 'Gagal memuat data permissions' }, { status: 500 });
  }
}

// Get audit logs dengan filter
async function handleGetAuditLogs(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resourceType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search') || '';

    let sql = `
      SELECT 
        id,
        audit_code as code,
        user_code,
        user_name,
        action,
        resource_type,
        resource_code,
        resource_name,
        old_values,
        new_values,
        timestamp,
        notes
      FROM user_logs 
      WHERE is_deleted = 0
      AND resource_type IN ('user', 'role', 'permission', 'user_role', 'role_permission')
    `;
    
    const params = [];

    if (search) {
      sql += ` AND (user_name LIKE ? OR resource_name LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (action && action !== 'all') {
      sql += ` AND action = ?`;
      params.push(action);
    }

    if (resourceType && resourceType !== 'all') {
      sql += ` AND resource_type = ?`;
      params.push(resourceType);
    }

    if (dateFrom) {
      sql += ` AND DATE(timestamp) >= ?`;
      params.push(dateFrom);
    }

    if (dateTo) {
      sql += ` AND DATE(timestamp) <= ?`;
      params.push(dateTo);
    }

    sql += ` ORDER BY timestamp DESC LIMIT 100`;

    const auditLogs = await query(sql, params);

    return Response.json({
      success: true,
      data: auditLogs.map(log => ({
        id: log.id,
        code: log.code,
        userId: log.user_code,
        userName: log.user_name,
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_code,
        resourceName: log.resource_name,
        oldValues: safeJsonParse(log.old_values),
        newValues: safeJsonParse(log.new_values),
        timestamp: log.timestamp,
        notes: log.notes
      }))
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return Response.json({ error: 'Gagal memuat audit logs' }, { status: 500 });
  }
}

// ==================== POST - Create user/role ====================
export async function POST(request) {
  const connection = await pool.getConnection();
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return Response.json({ error: 'Type dan data harus diisi' }, { status: 400 });
    }

    await connection.beginTransaction();

    let result;
    if (type === 'user') {
      result = await handleCreateUser(data, decoded, connection);
    } else if (type === 'role') {
      result = await handleCreateRole(data, decoded, connection);
    } else {
      throw new Error('Type tidak valid');
    }

    await connection.commit();
    return result;

  } catch (error) {
    await connection.rollback();
    console.error('POST RBAC error:', error);
    return Response.json({ 
      error: error.message || 'Gagal membuat data' 
    }, { status: 500 });
  } finally {
    connection.release();
  }
}

// Create new user
async function handleCreateUser(userData, decoded, connection) {
  const { name, email, password, roles, department, position, status = 'active' } = userData;

  // VALIDASI
  const validationError = validateUserData(userData, true);
  if (validationError) {
    throw new Error(validationError);
  }

  // Check if email already exists
  const [existingUser] = await connection.query(
    'SELECT user_code FROM users WHERE email = ? AND is_deleted = 0',
    [email]
  );

  if (existingUser.length > 0) {
    throw new Error('Email sudah terdaftar');
  }

  // Generate user code
  const [userCount] = await connection.query(
    'SELECT COUNT(*) as count FROM users WHERE YEAR(created_at) = YEAR(CURDATE())'
  );
  const user_code = `USER-${new Date().getFullYear()}-${String(userCount[0].count + 1).padStart(4, '0')}`;

  // Hash password
  const bcrypt = await import('bcrypt');
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user dengan parameter yang BENAR
  await connection.query(
    `INSERT INTO users 
     (user_code, name, email, password_hash, department, position, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [user_code, name, email, hashedPassword, department, position, status, decoded.user_code]
  );

  // Assign roles
  if (roles && roles.length > 0) {
    for (const role_code of roles) {
      const userRoleCode = `UR-${Date.now()}-${process.pid}-${Math.random().toString(36).substr(2, 9)}`;
      await connection.query(
        `INSERT INTO user_roles 
         (user_role_code, user_code, role_code, created_by)
         VALUES (?, ?, ?, ?)`,
        [userRoleCode, user_code, role_code, decoded.user_code]
      );
    }
  }

  // Log audit
  await createAuditLog(
    connection,
    decoded.user_code,
    decoded.name,
    'create',
    'user',
    user_code,
    name,
    null,
    sanitizeForAudit({ name, email, department, position, status, roles }),
    'Created new user account'
  );

  return Response.json({
    success: true,
    message: 'User berhasil dibuat',
    user_code: user_code
  });
}

// Create new role
async function handleCreateRole(roleData, decoded, connection) {
  const { name, description, permissions } = roleData;

  // VALIDASI
  if (!name || name.trim() === '') {
    throw new Error('Nama role harus diisi');
  }

  // Generate role code
  const [roleCount] = await connection.query(
    'SELECT COUNT(*) as count FROM roles WHERE YEAR(created_at) = YEAR(CURDATE())'
  );
  const role_code = `ROLE-${new Date().getFullYear()}-${String(roleCount[0].count + 1).padStart(4, '0')}`;

  // Create role
  await connection.query(
    `INSERT INTO roles 
     (role_code, name, description, is_system_role, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [role_code, name, description, 0, decoded.user_code]
  );

  // Assign permissions
  if (permissions && permissions.length > 0) {
    for (const permission_code of permissions) {
      const rolePermissionCode = `RP-${Date.now()}-${process.pid}-${Math.random().toString(36).substr(2, 9)}`;
      await connection.query(
        `INSERT INTO role_permissions 
         (role_permission_code, role_code, permission_code, created_by)
         VALUES (?, ?, ?, ?)`,
        [rolePermissionCode, role_code, permission_code, decoded.user_code]
      );
    }
  }

  // Log audit
  await createAuditLog(
    connection,
    decoded.user_code,
    decoded.name,
    'create',
    'role',
    role_code,
    name,
    null,
    sanitizeForAudit({ name, description, permissions }),
    'Created new role'
  );

  return Response.json({
    success: true,
    message: 'Role berhasil dibuat',
    role_code: role_code
  });
}

// ==================== PATCH - Update user/role ====================
export async function PATCH(request) {
  const connection = await pool.getConnection();
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { type, id, data } = body;

    if (!type || !id || !data) {
      return Response.json({ error: 'Type, id, dan data harus diisi' }, { status: 400 });
    }

    await connection.beginTransaction();

    let result;
    if (type === 'user') {
      result = await handleUpdateUser(id, data, decoded, connection);
    } else if (type === 'role') {
      result = await handleUpdateRole(id, data, decoded, connection);
    } else {
      throw new Error('Type tidak valid');
    }

    await connection.commit();
    return result;

  } catch (error) {
    await connection.rollback();
    console.error('PATCH RBAC error:', error);
    return Response.json({ 
      error: error.message || 'Gagal mengupdate data' 
    }, { status: 500 });
  } finally {
    connection.release();
  }
}

// Update user
async function handleUpdateUser(user_code, userData, decoded, connection) {
  const { name, email, password, roles = [], department, position, status } = userData;

  // VALIDASI
  const validationError = validateUserData(userData, false);
  if (validationError) {
    throw new Error(validationError);
  }

  // Check if user exists
  const [oldUser] = await connection.query(
    `SELECT name, email, department, position, status 
     FROM users WHERE user_code = ? AND is_deleted = 0`,
    [user_code]
  );

  if (oldUser.length === 0) {
    throw new Error('User tidak ditemukan');
  }

  // Check email uniqueness (exclude current user)
  const [existingEmail] = await connection.query(
    `SELECT user_code FROM users 
     WHERE email = ? AND user_code != ? AND is_deleted = 0`,
    [email, user_code]
  );

  if (existingEmail.length > 0) {
    throw new Error('Email sudah digunakan oleh user lain');
  }

  // Get current roles for audit
  const [currentRoles] = await connection.query(
    'SELECT role_code FROM user_roles WHERE user_code = ? AND is_deleted = 0',
    [user_code]
  );
  const oldRoles = currentRoles.map(r => r.role_code);

  // Update user - DENGAN PARAMETER YANG BENAR
  if (password && password.trim() !== '') {
    // Validate password
    if (password.length < 6) {
      throw new Error('Password minimal 6 karakter');
    }
    
    const bcrypt = await import('bcrypt');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    await connection.query(
      `UPDATE users 
       SET name = ?, email = ?, password_hash = ?, department = ?, 
           position = ?, status = ?, updated_at = NOW(), updated_by = ?
       WHERE user_code = ?`,
      [name, email, hashedPassword, department, position, status, decoded.user_code, user_code]
    );
  } else {
    await connection.query(
      `UPDATE users 
       SET name = ?, email = ?, department = ?, position = ?, 
           status = ?, updated_at = NOW(), updated_by = ?
       WHERE user_code = ?`,
      [name, email, department, position, status, decoded.user_code, user_code]
    );
  }

  // Update roles menggunakan helper function
  await updateUserRoles(connection, user_code, roles, decoded);

  // Log audit
  await createAuditLog(
    connection,
    decoded.user_code,
    decoded.name,
    'update',
    'user',
    user_code,
    name,
    sanitizeForAudit({ ...oldUser[0], roles: oldRoles }),
    sanitizeForAudit({ name, email, department, position, status, roles }),
    'Updated user account'
  );

  return Response.json({
    success: true,
    message: 'User berhasil diupdate'
  });
}

// Update role
async function handleUpdateRole(role_code, roleData, decoded, connection) {
  const { name, description, permissions = [] } = roleData;

  // VALIDASI
  if (!name || name.trim() === '') {
    throw new Error('Nama role harus diisi');
  }

  // Check if role exists
  const [oldRole] = await connection.query(
    `SELECT name, description, is_system_role 
     FROM roles WHERE role_code = ? AND is_deleted = 0`,
    [role_code]
  );

  if (oldRole.length === 0) {
    throw new Error('Role tidak ditemukan');
  }

  if (oldRole[0].is_system_role) {
    throw new Error('System role tidak dapat diupdate');
  }

  // Get current permissions for audit
  const [currentPermissions] = await connection.query(
    'SELECT permission_code FROM role_permissions WHERE role_code = ? AND is_deleted = 0',
    [role_code]
  );
  const oldPermissions = currentPermissions.map(p => p.permission_code);

  // Update role
  await connection.query(
    `UPDATE roles 
     SET name = ?, description = ?, updated_at = NOW(), updated_by = ?
     WHERE role_code = ?`,
    [name, description, decoded.user_code, role_code]
  );

  // Update permissions menggunakan helper function
  await updateRolePermissions(connection, role_code, permissions, decoded);

  // Log audit
  await createAuditLog(
    connection,
    decoded.user_code,
    decoded.name,
    'update',
    'role',
    role_code,
    name,
    sanitizeForAudit({ ...oldRole[0], permissions: oldPermissions }),
    sanitizeForAudit({ name, description, permissions }),
    'Updated role and permissions'
  );

  return Response.json({
    success: true,
    message: 'Role berhasil diupdate'
  });
}

// ==================== DELETE - Soft delete user/role ====================
export async function DELETE(request) {
  const connection = await pool.getConnection();
  
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { type, id } = body;

    if (!type || !id) {
      return Response.json({ error: 'Type dan id harus diisi' }, { status: 400 });
    }

    await connection.beginTransaction();

    let result;
    if (type === 'user') {
      result = await handleDeleteUser(id, decoded, connection);
    } else if (type === 'role') {
      result = await handleDeleteRole(id, decoded, connection);
    } else {
      throw new Error('Type tidak valid');
    }

    await connection.commit();
    return result;

  } catch (error) {
    await connection.rollback();
    console.error('DELETE RBAC error:', error);
    return Response.json({ 
      error: error.message || 'Gagal menghapus data' 
    }, { status: 500 });
  } finally {
    connection.release();
  }
}

// Soft delete user
async function handleDeleteUser(user_code, decoded, connection) {
  // Check if user exists
  const [user] = await connection.query(
    `SELECT name, email 
     FROM users WHERE user_code = ? AND is_deleted = 0`,
    [user_code]
  );

  if (user.length === 0) {
    throw new Error('User tidak ditemukan');
  }

  // Check if user has system roles
  const [systemRoles] = await connection.query(`
    SELECT r.name 
    FROM user_roles ur
    JOIN roles r ON ur.role_code = r.role_code
    WHERE ur.user_code = ? 
      AND ur.is_deleted = 0
      AND r.is_system_role = 1
  `, [user_code]);

  if (systemRoles.length > 0) {
    const roleNames = systemRoles.map(r => r.name).join(', ');
    throw new Error(`User memiliki system role (${roleNames}) dan tidak dapat dihapus`);
  }

  // Soft delete user dengan updated_by dan deleted_by
  await connection.query(
    `UPDATE users 
     SET is_deleted = 1, deleted_at = NOW(), 
         updated_at = NOW(), updated_by = ?, deleted_by = ?
     WHERE user_code = ?`,
    [decoded.user_code, decoded.user_code, user_code]
  );

  // Soft delete user roles dengan deleted_by
  await connection.query(
    `UPDATE user_roles 
     SET is_deleted = 1, deleted_at = NOW(), deleted_by = ?
     WHERE user_code = ?`,
    [decoded.user_code, user_code]
  );

  // Log audit
  await createAuditLog(
    connection,
    decoded.user_code,
    decoded.name,
    'delete',
    'user',
    user_code,
    user[0].name,
    sanitizeForAudit({ email: user[0].email }),
    null,
    'Deleted user account'
  );

  return Response.json({
    success: true,
    message: 'User berhasil dihapus'
  });
}

// Soft delete role
async function handleDeleteRole(role_code, decoded, connection) {
  // Check if role exists
  const [role] = await connection.query(
    `SELECT name, is_system_role 
     FROM roles WHERE role_code = ? AND is_deleted = 0`,
    [role_code]
  );

  if (role.length === 0) {
    throw new Error('Role tidak ditemukan');
  }

  if (role[0].is_system_role) {
    throw new Error('System role tidak dapat dihapus');
  }

  // Soft delete role
  await connection.query(
    `UPDATE roles 
     SET is_deleted = 1, deleted_at = NOW(), 
         updated_at = NOW(), updated_by = ?, deleted_by = ?
     WHERE role_code = ?`,
    [decoded.user_code, decoded.user_code, role_code]
  );

  // Soft delete role permissions
  await connection.query(
    `UPDATE role_permissions 
     SET is_deleted = 1, deleted_at = NOW(), deleted_by = ?
     WHERE role_code = ?`,
    [decoded.user_code, role_code]
  );

  // Soft delete user roles
  await connection.query(
    `UPDATE user_roles 
     SET is_deleted = 1, deleted_at = NOW(), deleted_by = ?
     WHERE role_code = ?`,
    [decoded.user_code, role_code]
  );

  // Log audit
  await createAuditLog(
    connection,
    decoded.user_code,
    decoded.name,
    'delete',
    'role',
    role_code,
    role[0].name,
    null,
    null,
    'Deleted role'
  );

  return Response.json({
    success: true,
    message: 'Role berhasil dihapus'
  });
}