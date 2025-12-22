import { query } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/auth';

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
  // Get users dengan roles
  const users = await query(`
    SELECT 
      u.id, u.user_code, u.name, u.email, u.department, u.position, u.status, 
      u.last_login, u.created_at,
      GROUP_CONCAT(ur.role_code) as role_codes
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
      GROUP_CONCAT(rp.permission_code) as permission_codes,
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
    FROM audit_logs 
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
        roles: user.role_codes ? user.role_codes.split(',') : []
      })),
      roles: roles.map(role => ({
        id: role.id,
        role_code: role.role_code,
        name: role.name,
        description: role.description,
        isSystemRole: Boolean(role.is_system_role),
        createdAt: role.created_at,
        permissions: role.permission_codes ? role.permission_codes.split(',') : [],
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
  oldValues: log.old_values, // ✅ Langsung return string
  newValues: log.new_values, // ✅ Langsung return string
  timestamp: log.timestamp,
  notes: log.notes
}))

    }
  });
}

// Get users dengan filter search
async function handleGetUsers(search) {
  let sql = `
    SELECT 
      u.id, u.user_code, u.name, u.email, u.department, u.position, u.status, 
      u.last_login, u.created_at,
      GROUP_CONCAT(ur.role_code) as role_codes
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
      roles: user.role_codes ? user.role_codes.split(',') : []
    }))
  });
}

// Get roles dengan filter search
async function handleGetRoles(search) {
  let sql = `
    SELECT 
      r.id, r.role_code, r.name, r.description, r.is_system_role, r.created_at,
      GROUP_CONCAT(rp.permission_code) as permission_codes,
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
      permissions: role.permission_codes ? role.permission_codes.split(',') : [],
      userCount: parseInt(role.user_count) || 0
    }))
  });
}

// Get permissions dengan filter search
async function handleGetPermissions(search) {
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
}

// Get audit logs dengan filter
async function handleGetAuditLogs(request) {
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
    FROM audit_logs 
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
    oldValues: log.old_values, // ✅ Tanpa JSON.parse
    newValues: log.new_values, // ✅ Tanpa JSON.parse
    timestamp: log.timestamp,
    notes: log.notes
  }))
});

}

// ==================== POST - Create user/role ====================
export async function POST(request) {
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

    if (type === 'user') {
      return await handleCreateUser(data, decoded);
    } else if (type === 'role') {
      return await handleCreateRole(data, decoded);
    }

    return Response.json({ error: 'Type tidak valid' }, { status: 400 });

  } catch (error) {
    console.error('POST RBAC error:', error);
    return Response.json({ error: 'Gagal membuat data' }, { status: 500 });
  }
}

// Create new user - FIXED with password validation
async function handleCreateUser(userData, decoded) {
  const { name, email, password, roles, department, position, status = 'active' } = userData;

  // ✅ VALIDASI HARUS ADA
  if (!name || !email || !password) {
    return Response.json({ 
      error: 'Nama, email, dan password harus diisi' 
    }, { status: 400 });
  }

  // Check if email already exists
  const existingUser = await query(
    'SELECT user_code FROM users WHERE email = ? AND is_deleted = 0',
    [email]
  );

  if (existingUser.length > 0) {
    return Response.json({ error: 'Email sudah terdaftar' }, { status: 400 });
  }

  // Generate user code
  const userCount = await query(
    'SELECT COUNT(*) as count FROM users WHERE YEAR(created_at) = YEAR(CURDATE())'
  );
  const user_code = `USER-${new Date().getFullYear()}-${String(userCount[0].count + 1).padStart(4, '0')}`;

  // Hash password (gunakan bcrypt di production)
  const bcrypt = await import('bcrypt');
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user dengan password
  await query(
    `INSERT INTO users 
     (user_code, name, email, password_hash, department, position, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [user_code, name, email, hashedPassword, department, position, status, decoded.user_code]
  );

  // Assign roles
  if (roles && roles.length > 0) {
    for (const role_code of roles) {
      const rolePermissionCode = `UR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await query(
        `INSERT INTO user_roles 
         (user_role_code, user_code, role_code, created_by)
         VALUES (?, ?, ?, ?)`,
        [rolePermissionCode, user_code, role_code, decoded.user_code]
      );
    }
  }

  // Log audit
  await createAuditLog(
    decoded.user_code,
    decoded.name,
    'create',
    'user',
    user_code,
    name,
    null,
    { name, email, department, position, status, roles },
    'Created new user account'
  );

  return Response.json({
    success: true,
    message: 'User berhasil dibuat',
    user_code: user_code
  });
}

// Create new role - FIXED
async function handleCreateRole(roleData, decoded) {
  const { name, description, permissions } = roleData;

  // ✅ VALIDASI
  if (!name) {
    return Response.json({ error: 'Nama role harus diisi' }, { status: 400 });
  }

  // Generate role code
  const roleCount = await query(
    'SELECT COUNT(*) as count FROM roles WHERE YEAR(created_at) = YEAR(CURDATE())'
  );
  const role_code = `ROLE-${new Date().getFullYear()}-${String(roleCount[0].count + 1).padStart(4, '0')}`;

  // Create role
  await query(
    `INSERT INTO roles 
     (role_code, name, description, is_system_role, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [role_code, name, description, 0, decoded.user_code]
  );

  // Assign permissions
  if (permissions && permissions.length > 0) {
    for (const permission_code of permissions) {
      const rolePermissionCode = `RP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await query(
        `INSERT INTO role_permissions 
         (role_permission_code, role_code, permission_code, created_by)
         VALUES (?, ?, ?, ?)`,
        [rolePermissionCode, role_code, permission_code, decoded.user_code]
      );
    }
  }

  // Log audit
  await createAuditLog(
    decoded.user_code,
    decoded.name,
    'create',
    'role',
    role_code,
    name,
    null,
    { name, description, permissions },
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

    if (type === 'user') {
      return await handleUpdateUser(id, data, decoded);
    } else if (type === 'role') {
      return await handleUpdateRole(id, data, decoded);
    }

    return Response.json({ error: 'Type tidak valid' }, { status: 400 });

  } catch (error) {
    console.error('PATCH RBAC error:', error);
    return Response.json({ error: 'Gagal mengupdate data' }, { status: 500 });
  }
}

// Update user - FIXED with optional password update
async function handleUpdateUser(user_code, userData, decoded) {
  const { name, email, password, roles, department, position, status } = userData;

  // Get old user data untuk audit
  const oldUser = await query(
    'SELECT name, email, department, position, status FROM users WHERE user_code = ?',
    [user_code]
  );

  if (oldUser.length === 0) {
    return Response.json({ error: 'User tidak ditemukan' }, { status: 404 });
  }

  // ✅ VALIDASI
  if (!name || !email) {
    return Response.json({ error: 'Nama dan email harus diisi' }, { status: 400 });
  }

  let updateSql = `UPDATE users 
     SET name = ?, email = ?, department = ?, position = ?, status = ?,
         updated_at = NOW(), updated_by = ?`;
  let params = [name, email, department, position, status, decoded.user_code];

  // Jika ada password baru, update password
  if (password && password.trim() !== '') {
    const bcrypt = await import('bcrypt');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    updateSql = updateSql.replace('SET', 'SET password_hash = ?,');
    params.splice(2, 0, hashedPassword); // Sisipkan hashedPassword setelah email
  }

  updateSql += ` WHERE user_code = ?`;
  params.push(user_code);

  await query(updateSql, params);

  // Get current roles untuk audit
  const currentRoles = await query(
    'SELECT role_code FROM user_roles WHERE user_code = ? AND is_deleted = 0',
    [user_code]
  );
  const oldRoles = currentRoles.map(r => r.role_code);

  // Update roles - soft delete existing, then add new
  await query(
    'UPDATE user_roles SET is_deleted = 1, deleted_at = NOW() WHERE user_code = ?',
    [user_code]
  );

  if (roles && roles.length > 0) {
    for (const role_code of roles) {
      const rolePermissionCode = `UR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await query(
        `INSERT INTO user_roles 
         (user_role_code, user_code, role_code, created_by)
         VALUES (?, ?, ?, ?)`,
        [rolePermissionCode, user_code, role_code, decoded.user_code]
      );
    }
  }

  // Log audit
  await createAuditLog(
    decoded.user_code,
    decoded.name,
    'update',
    'user',
    user_code,
    name,
    { ...oldUser[0], roles: oldRoles },
    { name, email, department, position, status, roles },
    'Updated user account'
  );

  return Response.json({
    success: true,
    message: 'User berhasil diupdate'
  });
}

// Update role - FIXED
async function handleUpdateRole(role_code, roleData, decoded) {
  const { name, description, permissions } = roleData;

  // ✅ VALIDASI
  if (!name) {
    return Response.json({ error: 'Nama role harus diisi' }, { status: 400 });
  }

  // Get old role data untuk audit
  const oldRole = await query(
    'SELECT name, description FROM roles WHERE role_code = ?',
    [role_code]
  );

  if (oldRole.length === 0) {
    return Response.json({ error: 'Role tidak ditemukan' }, { status: 404 });
  }

  // Update role
  await query(
    `UPDATE roles 
     SET name = ?, description = ?, updated_at = NOW(), updated_by = ?
     WHERE role_code = ?`,
    [name, description, decoded.user_code, role_code]
  );

  // Get current permissions untuk audit
  const currentPermissions = await query(
    'SELECT permission_code FROM role_permissions WHERE role_code = ? AND is_deleted = 0',
    [role_code]
  );
  const oldPermissions = currentPermissions.map(p => p.permission_code);

  // Update permissions - soft delete existing, then add new
  await query(
    'UPDATE role_permissions SET is_deleted = 1, deleted_at = NOW() WHERE role_code = ?',
    [role_code]
  );

  if (permissions && permissions.length > 0) {
    for (const permission_code of permissions) {
      const rolePermissionCode = `RP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await query(
        `INSERT INTO role_permissions 
         (role_permission_code, role_code, permission_code, created_by)
         VALUES (?, ?, ?, ?)`,
        [rolePermissionCode, role_code, permission_code, decoded.user_code]
      );
    }
  }

  // Log audit
  await createAuditLog(
    decoded.user_code,
    decoded.name,
    'update',
    'role',
    role_code,
    name,
    { ...oldRole[0], permissions: oldPermissions },
    { name, description, permissions },
    'Updated role'
  );

  return Response.json({
    success: true,
    message: 'Role berhasil diupdate'
  });
}

// ==================== DELETE - Soft delete user/role ====================
export async function DELETE(request) {
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

    if (type === 'user') {
      return await handleDeleteUser(id, decoded);
    } else if (type === 'role') {
      return await handleDeleteRole(id, decoded);
    }

    return Response.json({ error: 'Type tidak valid' }, { status: 400 });

  } catch (error) {
    console.error('DELETE RBAC error:', error);
    return Response.json({ error: 'Gagal menghapus data' }, { status: 500 });
  }
}

// Soft delete user - FIXED
async function handleDeleteUser(user_code, decoded) {
  // Check if user exists
  const user = await query(
    'SELECT name, is_system_role FROM users WHERE user_code = ? AND is_deleted = 0',
    [user_code]
  );

  if (user.length === 0) {
    return Response.json({ error: 'User tidak ditemukan' }, { status: 404 });
  }

  // Soft delete user
  await query(
    'UPDATE users SET is_deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE user_code = ?',
    [decoded.user_code, user_code]
  );

  // Soft delete user roles
  await query(
    'UPDATE user_roles SET is_deleted = 1, deleted_at = NOW() WHERE user_code = ?',
    [user_code]
  );

  // Log audit
  await createAuditLog(
    decoded.user_code,
    decoded.name,
    'delete',
    'user',
    user_code,
    user[0].name,
    null,
    null,
    'Deleted user account'
  );

  return Response.json({
    success: true,
    message: 'User berhasil dihapus'
  });
}

// Soft delete role - FIXED
async function handleDeleteRole(role_code, decoded) {
  // Check if role exists and is not system role
  const role = await query(
    'SELECT name, is_system_role FROM roles WHERE role_code = ? AND is_deleted = 0',
    [role_code]
  );

  if (role.length === 0) {
    return Response.json({ error: 'Role tidak ditemukan' }, { status: 404 });
  }

  if (role[0].is_system_role) {
    return Response.json({ error: 'System role tidak dapat dihapus' }, { status: 400 });
  }

  // Soft delete role
  await query(
    'UPDATE roles SET is_deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE role_code = ?',
    [decoded.user_code, role_code]
  );

  // Soft delete role permissions
  await query(
    'UPDATE role_permissions SET is_deleted = 1, deleted_at = NOW() WHERE role_code = ?',
    [role_code]
  );

  // Soft delete user roles
  await query(
    'UPDATE user_roles SET is_deleted = 1, deleted_at = NOW() WHERE role_code = ?',
    [role_code]
  );

  // Log audit
  await createAuditLog(
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

// ==================== HELPER FUNCTIONS ====================
async function createAuditLog(user_code, user_name, action, resource_type, resource_id, resource_name, old_values, new_values, notes) {
  const audit_code = `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  await query(
    `INSERT INTO audit_logs 
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