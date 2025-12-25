'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Edit, Trash2, Save, X, History, Filter, Users, Shield, Key, Clock, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

// ==================== TYPES ====================
type PermissionCategory = 'transactions' | 'cash_advance' | 'reimburse' | 'projects' | 'settings' | 'reports' | 'delivery';

type Permission = {
  id: number;
  code: string;
  name: string;
  description: string;
  category: PermissionCategory;
  module: string;
  action: string;
  createdAt: string;
};

type Role = {
  id: number;
  role_code: string;
  name: string;
  description: string;
  permissions: string[];
  isSystemRole: boolean;
  createdAt: string;
  userCount: number;
};

type User = {
  id: number;
  user_code: string;
  name: string;
  email: string;
  roles: string[];
  department?: string;
  position?: string;
  status: 'active' | 'inactive';
  lastLogin?: string;
  createdAt: string;
};

type AuditAction = 'create' | 'update' | 'delete' | 'assign' | 'revoke' | 'approve' | 'reject';

type AuditLog = {
  id: number;
  code: string;
  userId: string;
  userName: string;
  action: AuditAction;
  resourceType: 'user' | 'role' | 'permission' | 'user_role' | 'role_permission';
  resourceId: string;
  resourceName: string;
  oldValues?: any;
  newValues?: any;
  timestamp: string;
  notes?: string;
};

// ==================== API SERVICE ====================
const API_URL = '/api';

const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }
  return null;
};

// FIXED GENERIC FUNCTION
const apiFetch = async <T,>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string; message?: string }> => {
  const token = getAuthToken();
  
  // Fix headers type
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

// API functions - FIXED
const rbacApi = {
  // Get semua data sekaligus
  getAllRBACData: async () => {
    return apiFetch<{
      users: User[];
      roles: Role[];
      permissions: Permission[];
      auditLogs: AuditLog[];
    }>('/rbac?action=all');
  },

  // Users
  getUsers: async (search?: string) => {
    const url = search ? `/rbac?type=users&search=${encodeURIComponent(search)}` : '/rbac?type=users';
    return apiFetch<{ data: User[] }>(url);
  },

  createUser: async (userData: any) => {
    return apiFetch<{ user_code: string; message: string }>('/rbac', {
      method: 'POST',
      body: JSON.stringify({
        type: 'user',
        data: userData,
      }),
    });
  },

  updateUser: async (user_code: string, userData: any) => {
    return apiFetch<{ message: string }>('/rbac', {
      method: 'PATCH',
      body: JSON.stringify({
        type: 'user',
        id: user_code,
        data: userData,
      }),
    });
  },

  deleteUser: async (user_code: string) => {
    return apiFetch<{ message: string }>('/rbac', {
      method: 'DELETE',
      body: JSON.stringify({
        type: 'user',
        id: user_code,
      }),
    });
  },

  // Roles
  getRoles: async (search?: string) => {
    const url = search ? `/rbac?type=roles&search=${encodeURIComponent(search)}` : '/rbac?type=roles';
    return apiFetch<{ data: Role[] }>(url);
  },

  createRole: async (roleData: any) => {
    return apiFetch<{ role_code: string; message: string }>('/rbac', {
      method: 'POST',
      body: JSON.stringify({
        type: 'role',
        data: roleData,
      }),
    });
  },

  updateRole: async (role_code: string, roleData: any) => {
    return apiFetch<{ message: string }>('/rbac', {
      method: 'PATCH',
      body: JSON.stringify({
        type: 'role',
        id: role_code,
        data: roleData,
      }),
    });
  },

  deleteRole: async (role_code: string) => {
    return apiFetch<{ message: string }>('/rbac', {
      method: 'DELETE',
      body: JSON.stringify({
        type: 'role',
        id: role_code,
      }),
    });
  },

  // Permissions
  getPermissions: async (search?: string) => {
    const url = search ? `/rbac?type=permissions&search=${encodeURIComponent(search)}` : '/rbac?type=permissions';
    return apiFetch<{ data: Record<string, Permission[]>; allPermissions: Permission[] }>(url);
  },

  // Audit logs
  getAuditLogs: async (filters?: any) => {
    const params = new URLSearchParams();
    params.append('type', 'audit');
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.resourceType) params.append('resourceType', filters.resourceType);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);

    return apiFetch<{ data: AuditLog[] }>(`/rbac?${params.toString()}`);
  },
};

// Helper function untuk group by
const groupBy = <T, K extends keyof any>(array: T[], getKey: (item: T) => K): Record<K, T[]> => {
  return array.reduce((acc, item) => {
    const key = getKey(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
};

// Helper untuk remove duplicates
const getUniqueArray = <T,>(array: T[]): T[] => {
  return [...new Set(array)];
};

// ==================== MAIN COMPONENT ====================
export default function RBACPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'permissions' | 'audit'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // User state
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    roles: [] as string[],
    department: '',
    position: '',
    status: 'active' as 'active' | 'inactive'
  });
  
  // Edit mode state
  const [editingUser, setEditingUser] = useState<string | null>(null);
  
  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  // Role state
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });
  const [editingRole, setEditingRole] = useState<string | null>(null);
  
  // Audit log filters
  const [auditFilter, setAuditFilter] = useState({
    action: '' as AuditAction | '',
    resourceType: '' as AuditLog['resourceType'] | '',
    dateFrom: '',
    dateTo: ''
  });

  // ==================== LOAD DATA ====================
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await rbacApi.getAllRBACData();
      
      if (response.success && response.data) {
        setUsers(response.data.users || []);
        setRoles(response.data.roles || []);
        setPermissions(response.data.permissions || []);
        setAuditLogs(response.data.auditLogs || []);
        setSuccess('Data loaded successfully');
      } else {
        setError(response.error || 'Failed to load data');
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==================== USER FUNCTIONS ====================
  const addUser = async () => {
    // ✅ VALIDASI PASSWORD
    if (!newUser.name || !newUser.email || !newUser.password) {
      setError('Name, email, and password are required');
      return;
    }

    if (newUser.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      const response = await rbacApi.createUser(newUser);
      
      if (response.success) {
        setSuccess(response.message || 'User created successfully');
        await loadData();
        resetForms();
      } else {
        setError(response.error || 'Failed to create user');
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
      console.error('Create user error:', err);
    }
  };

  const updateUser = async () => {
    // ✅ VALIDASI (password optional saat edit)
    if (!editingUser || !newUser.name || !newUser.email) {
      setError('Name and email are required');
      return;
    }

    // Password minimal 6 karakter jika diisi
    if (newUser.password && newUser.password.length > 0 && newUser.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      const response = await rbacApi.updateUser(editingUser, newUser);
      
      if (response.success) {
        setSuccess(response.message || 'User updated successfully');
        await loadData();
        resetForms();
      } else {
        setError(response.error || 'Failed to update user');
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
      console.error('Update user error:', err);
    }
  };

  const deleteUser = async (user_code: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      setError(null);
      setSuccess(null);
      const response = await rbacApi.deleteUser(user_code);
      
      if (response.success) {
        setSuccess(response.message || 'User deleted successfully');
        await loadData();
      } else {
        setError(response.error || 'Failed to delete user');
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
      console.error('Delete user error:', err);
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user.user_code);
    setNewUser({
      name: user.name,
      email: user.email,
      password: '',
      roles: getUniqueArray(user.roles || []),
      department: user.department || '',
      position: user.position || '',
      status: user.status || 'active'
    });
  };

  const toggleUserRole = (roleId: string) => {
    setNewUser(prev => ({
      ...prev,
      roles: prev.roles.includes(roleId)
        ? prev.roles.filter(r => r !== roleId)
        : [...prev.roles, roleId]
    }));
  };

  // ==================== ROLE FUNCTIONS ====================
  const addRole = async () => {
    if (!newRole.name) {
      setError('Role name is required');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      const response = await rbacApi.createRole(newRole);
      
      if (response.success) {
        setSuccess(response.message || 'Role created successfully');
        await loadData();
        resetForms();
      } else {
        setError(response.error || 'Failed to create role');
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
      console.error('Create role error:', err);
    }
  };

  const updateRole = async () => {
    if (!editingRole || !newRole.name) {
      setError('Role name is required');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      const response = await rbacApi.updateRole(editingRole, newRole);
      
      if (response.success) {
        setSuccess(response.message || 'Role updated successfully');
        await loadData();
        resetForms();
      } else {
        setError(response.error || 'Failed to update role');
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
      console.error('Update role error:', err);
    }
  };

  const deleteRole = async (role_code: string) => {
    const role = roles.find(r => r.role_code === role_code);
    if (role?.isSystemRole) {
      setError('System roles cannot be deleted');
      return;
    }

    if (!confirm('Are you sure you want to delete this role?')) return;

    try {
      setError(null);
      setSuccess(null);
      const response = await rbacApi.deleteRole(role_code);
      
      if (response.success) {
        setSuccess(response.message || 'Role deleted successfully');
        await loadData();
      } else {
        setError(response.error || 'Failed to delete role');
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
      console.error('Delete role error:', err);
    }
  };

  const startEditRole = (role: Role) => {
    setEditingRole(role.role_code);
    setNewRole({
      name: role.name,
      description: role.description || '',
      permissions: getUniqueArray(role.permissions || [])
    });
  };

  const toggleRolePermission = (permissionCode: string) => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionCode)
        ? prev.permissions.filter(p => p !== permissionCode)
        : [...prev.permissions, permissionCode]
    }));
  };

  // ==================== HELPER FUNCTIONS ====================
  const resetForms = () => {
    setEditingUser(null);
    setEditingRole(null);
    setNewUser({
      name: '',
      email: '',
      password: '',
      roles: [],
      department: '',
      position: '',
      status: 'active'
    });
    setNewRole({
      name: '',
      description: '',
      permissions: []
    });
    setError(null);
  };

  const getRoleName = (roleCode: string) => {
    return roles.find(r => r.role_code === roleCode)?.name || roleCode;
  };

  const getPermissionName = (permissionCode: string) => {
    return permissions.find(p => p.code === permissionCode)?.name || permissionCode;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      transactions: 'bg-blue-100 text-blue-800',
      cash_advance: 'bg-green-100 text-green-800',
      reimburse: 'bg-purple-100 text-purple-800',
      projects: 'bg-orange-100 text-orange-800',
      settings: 'bg-red-100 text-red-800',
      reports: 'bg-indigo-100 text-indigo-800',
      delivery: 'bg-pink-100 text-pink-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  // ==================== FILTERED DATA ====================
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPermissions = permissions.filter(permission =>
    permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAuditLogs = auditLogs.filter(log =>
    (log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     log.resourceName.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (auditFilter.action === '' || log.action === auditFilter.action) &&
    (auditFilter.resourceType === '' || log.resourceType === auditFilter.resourceType) &&
    (auditFilter.dateFrom === '' || log.timestamp >= auditFilter.dateFrom) &&
    (auditFilter.dateTo === '' || log.timestamp <= auditFilter.dateTo)
  );

  // Group permissions by category
  const permissionsByCategory = groupBy(permissions, p => p.category);

  // ==================== RENDER LOADING ====================
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Role-Based Access Control</h1>
          <p className="text-gray-600 mt-2">Manage users, roles, and permissions for your finance application</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Success Alert */}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles ({roles.length})
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Permissions ({permissions.length})
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit Logs ({auditLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* Search Bar */}
        <div className="my-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* USERS TAB */}
        <TabsContent value="users" className="space-y-6">
          {/* Add/Edit User Form */}
          <Card>
            <CardHeader>
              <CardTitle>
                {editingUser ? 'Edit User' : 'Add New User'}
              </CardTitle>
              <CardDescription>
                {editingUser 
                  ? 'Update user information. Leave password empty to keep current password.' 
                  : 'Create a new user account with password'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter user full name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter user email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {editingUser ? 'New Password (optional)' : 'Password *'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={editingUser ? "Leave empty to keep current password" : "Enter password (min 6 characters)"}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                  {!editingUser && (
                    <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="Enter department"
                    value={newUser.department}
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    placeholder="Enter position"
                    value={newUser.position}
                    onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="status-active"
                      checked={newUser.status === 'active'}
                      onCheckedChange={(checked) => 
                        setNewUser({ ...newUser, status: checked ? 'active' : 'inactive' })
                      }
                    />
                    <Label htmlFor="status-active">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="status-inactive"
                      checked={newUser.status === 'inactive'}
                      onCheckedChange={(checked) => 
                        setNewUser({ ...newUser, status: checked ? 'inactive' : 'active' })
                      }
                    />
                    <Label htmlFor="status-inactive">Inactive</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {roles.map(role => (
                    <div key={role.role_code} className="flex items-center space-x-2">
                      <Checkbox
                        id={`user-role-${role.role_code}`}
                        checked={newUser.roles.includes(role.role_code)}
                        onCheckedChange={() => toggleUserRole(role.role_code)}
                        disabled={role.isSystemRole && role.name.toLowerCase().includes('admin')}
                      />
                      <Label htmlFor={`user-role-${role.role_code}`} className="text-sm flex items-center gap-2">
                        {role.name}
                        {role.isSystemRole && (
                          <Badge variant="secondary" className="text-xs">System</Badge>
                        )}
                        {role.userCount > 0 && (
                          <span className="text-xs text-gray-500">({role.userCount})</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2">
                {editingUser ? (
                  <>
                    <Button onClick={updateUser} className="flex items-center space-x-2">
                      <Save className="h-4 w-4" />
                      <span>Update User</span>
                    </Button>
                    <Button variant="outline" onClick={resetForms}>
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={addUser} className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Add User</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage user accounts and their roles</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map(user => (
                      <TableRow key={user.user_code}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            {user.position && (
                              <div className="text-xs text-gray-400">{user.position}</div>
                            )}
                            <div className="text-xs text-gray-500">
                              ID: {user.user_code}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.department || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {getUniqueArray(user.roles || []).map(roleId => {
                              const role = roles.find(r => r.role_code === roleId);
                              return role ? (
                                <Badge 
                                  key={`${user.user_code}-${roleId}`} 
                                  variant="secondary" 
                                  className="text-xs"
                                >
                                  {role.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEditUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteUser(user.user_code)}
                              disabled={user.roles.some(roleId => {
                                const role = roles.find(r => r.role_code === roleId);
                                return role?.isSystemRole && role.name.toLowerCase().includes('admin');
                              })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROLES TAB */}
        <TabsContent value="roles" className="space-y-6">
          {/* Add/Edit Role Form */}
          <Card>
            <CardHeader>
              <CardTitle>
                {editingRole ? 'Edit Role' : 'Add New Role'}
              </CardTitle>
              <CardDescription>
                {editingRole ? 'Update role permissions' : 'Create a new role with specific permissions'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="roleName">Role Name *</Label>
                  <Input
                    id="roleName"
                    placeholder="Enter role name"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roleDescription">Description</Label>
                  <Input
                    id="roleDescription"
                    placeholder="Enter role description"
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <Label>Permissions</Label>
                <div className="border rounded-lg">
                  {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                    <div key={category} className="border-b last:border-b-0">
                      <div className="p-3 bg-gray-50">
                        <Label className="text-sm font-medium capitalize">{category} Permissions</Label>
                      </div>
                      <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {categoryPermissions.map(permission => (
                          <div key={permission.code} className="flex items-center space-x-2">
                            <Checkbox
                              id={`perm-${permission.code}`}
                              checked={newRole.permissions.includes(permission.code)}
                              onCheckedChange={() => toggleRolePermission(permission.code)}
                            />
                            <Label htmlFor={`perm-${permission.code}`} className="text-sm flex-1">
                              <div className="font-medium">{permission.name}</div>
                              <div className="text-xs text-gray-500">{permission.description}</div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2">
                {editingRole ? (
                  <>
                    <Button onClick={updateRole} className="flex items-center space-x-2">
                      <Save className="h-4 w-4" />
                      <span>Update Role</span>
                    </Button>
                    <Button variant="outline" onClick={resetForms}>
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={addRole} className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Add Role</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Roles Table - FIXED: Remove duplicate permissions */}
          <Card>
            <CardHeader>
              <CardTitle>Roles</CardTitle>
              <CardDescription>Manage roles and their permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No roles found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRoles.map(role => {
                      // Remove duplicate permissions sebelum render
                      const uniquePermissions = getUniqueArray(role.permissions || []);
                      
                      return (
                        <TableRow key={role.role_code}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {role.name}
                              {role.isSystemRole && (
                                <Badge variant="secondary" className="text-xs">System</Badge>
                              )}
                              <div className="text-xs text-gray-500">
                                ({role.role_code})
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{role.description || '-'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[300px]">
                              {uniquePermissions.slice(0, 3).map(permissionCode => (
                                <Badge 
                                  key={`${role.role_code}-${permissionCode}`} 
                                  variant="outline" 
                                  className="text-xs"
                                >
                                  {getPermissionName(permissionCode)}
                                </Badge>
                              ))}
                              {uniquePermissions.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{uniquePermissions.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {role.userCount || 0} users
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditRole(role)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteRole(role.role_code)}
                                disabled={role.isSystemRole}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PERMISSIONS TAB */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Permissions</CardTitle>
              <CardDescription>System permissions organized by categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                  <div key={category} className="border rounded-lg">
                    <div className="p-4 bg-gray-50 border-b">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold capitalize">{category}</h3>
                        <Badge variant="secondary" className={getCategoryColor(category)}>
                          {categoryPermissions.length} permissions
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Permission Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Module</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Roles</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categoryPermissions.map(permission => (
                            <TableRow key={permission.code}>
                              <TableCell className="font-medium">
                                <div>
                                  {permission.name}
                                  <div className="text-xs text-gray-500">
                                    {permission.code}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{permission.description}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {permission.module}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="capitalize">
                                  {permission.action.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {roles
                                    .filter(role => role.permissions.includes(permission.code))
                                    .slice(0, 2)
                                    .map(role => (
                                      <Badge 
                                        key={`${permission.code}-${role.role_code}`} 
                                        variant="outline" 
                                        className="text-xs"
                                      >
                                        {role.name}
                                      </Badge>
                                    ))}
                                  {roles.filter(role => role.permissions.includes(permission.code)).length > 2 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{roles.filter(role => role.permissions.includes(permission.code)).length - 2} more
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUDIT LOGS TAB */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>Track all changes made to users, roles, and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Audit Filters */}
              <div className="flex flex-wrap gap-4 mb-6 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label className="text-sm">Action Type</Label>
                  <Select 
                    value={auditFilter.action} 
                    onValueChange={(v) => setAuditFilter({...auditFilter, action: v === 'all' ? '' : v as AuditAction})}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All actions</SelectItem>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                      <SelectItem value="assign">Assign</SelectItem>
                      <SelectItem value="revoke">Revoke</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Resource Type</Label>
                  <Select 
                    value={auditFilter.resourceType} 
                    onValueChange={(v) => setAuditFilter({...auditFilter, resourceType: v === 'all' ? '' : v as AuditLog['resourceType']})}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All resources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All resources</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="role">Role</SelectItem>
                      <SelectItem value="permission">Permission</SelectItem>
                      <SelectItem value="user_role">User Role</SelectItem>
                      <SelectItem value="role_permission">Role Permission</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Date From</Label>
                  <Input
                    type="date"
                    value={auditFilter.dateFrom}
                    onChange={(e) => setAuditFilter({...auditFilter, dateFrom: e.target.value})}
                    className="w-[180px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Date To</Label>
                  <Input
                    type="date"
                    value={auditFilter.dateTo}
                    onChange={(e) => setAuditFilter({...auditFilter, dateTo: e.target.value})}
                    className="w-[180px]"
                  />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => setAuditFilter({action: '', resourceType: '', dateFrom: '', dateTo: ''})}>
                    <Filter className="h-4 w-4 mr-2" />
                    Reset Filters
                  </Button>
                </div>
              </div>

              {/* Audit Logs Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAuditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No audit logs found matching your criteria</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAuditLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{log.userName}</TableCell>
                        <TableCell>
                          <Badge variant={
                            log.action === 'create' ? 'default' :
                            log.action === 'update' ? 'secondary' :
                            log.action === 'delete' ? 'destructive' :
                            log.action === 'assign' ? 'default' : 'secondary'
                          }>
                            {log.action.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium capitalize">{log.resourceType}</div>
                            <div className="text-sm text-gray-500">{log.resourceName}</div>
                            <div className="text-xs text-gray-400">ID: {log.resourceId}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.oldValues && log.newValues ? (
                            <div className="text-xs space-y-1">
                              <div className="text-red-600 line-through">
                                {JSON.stringify(log.oldValues)}
                              </div>
                              <div className="text-green-600">
                                {JSON.stringify(log.newValues)}
                              </div>
                            </div>
                          ) : log.oldValues ? (
                            <div className="text-red-600 line-through text-xs">
                              Deleted: {JSON.stringify(log.oldValues)}
                            </div>
                          ) : log.newValues ? (
                            <div className="text-green-600 text-xs">
                              Created: {JSON.stringify(log.newValues)}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No changes recorded</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                          {log.notes}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}