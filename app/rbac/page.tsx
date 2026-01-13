'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Edit, Trash2, Save, X, History, Filter, Users, Shield, Key, Clock, Loader2, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { validateEmail, validatePassword } from '@/app/lib/validations';

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

// API Fetch dengan error handling yang lebih baik
const apiFetch = async <T,>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string; message?: string }> => {
  const token = getAuthToken();
  
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
        throw new Error('Unauthorized');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
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

// API functions
const rbacApi = {
  getAllRBACData: async () => {
    return apiFetch<{
      users: User[];
      roles: Role[];
      permissions: Permission[];
      auditLogs: AuditLog[];
    }>('/rbac?action=all');
  },

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

  getPermissions: async (search?: string) => {
    const url = search ? `/rbac?type=permissions&search=${encodeURIComponent(search)}` : '/rbac?type=permissions';
    return apiFetch<{ data: Record<string, Permission[]>; allPermissions: Permission[] }>(url);
  },

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

// Helper function untuk remove duplicates
const getUniqueArray = <T,>(array: T[]): T[] => {
  return [...new Set(array)];
};

// Helper untuk group by
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

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Debounced search
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

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
  const validateUserForm = (isEdit: boolean) => {
    if (!newUser.name.trim()) {
      return 'Name is required';
    }
    
    if (!validateEmail(newUser.email)) {
      return 'Invalid email format';
    }
    
    // Validasi nama tidak mengandung format email
    if (newUser.name.includes('@') && newUser.name.includes('.')) {
      return 'Name should not contain email format';
    }
    
    // Validasi email tidak mengandung karakter password hash
    if (newUser.email.includes('$2a$') || newUser.email.includes('$2b$')) {
      return 'Invalid email format';
    }
    
    if (!isEdit && (!newUser.password || newUser.password.length < 6)) {
      return 'Password must be at least 6 characters';
    }
    
    if (isEdit && newUser.password && newUser.password.length < 6) {
      return 'Password must be at least 6 characters if provided';
    }
    
    return null;
  };

  const addUser = async () => {
    const validationError = validateUserForm(false);
    if (validationError) {
      setError(validationError);
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
    const validationError = validateUserForm(true);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      const response = await rbacApi.updateUser(editingUser!, newUser);
      
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
    setShowPassword(false);
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
  const validateRoleForm = () => {
    if (!newRole.name.trim()) {
      return 'Role name is required';
    }
    return null;
  };

  const addRole = async () => {
    const validationError = validateRoleForm();
    if (validationError) {
      setError(validationError);
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
    const validationError = validateRoleForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      const response = await rbacApi.updateRole(editingRole!, newRole);
      
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
    setShowPassword(false);
    setError(null);
    setSuccess(null);
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

  // ==================== FILTERED DATA (MEMOIZED) ====================
  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      user.department?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      user.position?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [users, debouncedSearchTerm]);

  const filteredRoles = useMemo(() => {
    return roles.filter(role =>
      role.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [roles, debouncedSearchTerm]);

  const filteredPermissions = useMemo(() => {
    return permissions.filter(permission =>
      permission.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      permission.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      permission.category.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [permissions, debouncedSearchTerm]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log =>
      (log.userName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
       log.resourceName.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) &&
      (auditFilter.action === '' || log.action === auditFilter.action) &&
      (auditFilter.resourceType === '' || log.resourceType === auditFilter.resourceType) &&
      (auditFilter.dateFrom === '' || new Date(log.timestamp) >= new Date(auditFilter.dateFrom)) &&
      (auditFilter.dateTo === '' || new Date(log.timestamp) <= new Date(auditFilter.dateTo))
    );
  }, [auditLogs, debouncedSearchTerm, auditFilter]);

  // Group permissions by category
  const permissionsByCategory = useMemo(() => {
    return groupBy(permissions, p => p.category);
  }, [permissions]);

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
                    onChange={(e) => {
                      const value = e.target.value;
                      // Prevent entering email format in name
                      if (!(value.includes('@') && value.includes('.'))) {
                        setNewUser({ ...newUser, name: value });
                      }
                    }}
                    className={newUser.name.includes('@') && newUser.name.includes('.') ? 'border-red-500' : ''}
                  />
                  {newUser.name.includes('@') && newUser.name.includes('.') && (
                    <p className="text-xs text-red-500">Name should not contain email format</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter user email"
                    value={newUser.email}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Prevent entering password hash in email
                      if (!value.includes('$2a$') && !value.includes('$2b$')) {
                        setNewUser({ ...newUser, email: value });
                      }
                    }}
                    className={
                      (newUser.email.includes('$2a$') || newUser.email.includes('$2b$')) 
                        ? 'border-red-500' 
                        : ''
                    }
                  />
                  {(newUser.email.includes('$2a$') || newUser.email.includes('$2b$')) && (
                    <p className="text-xs text-red-500">Invalid email format</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {editingUser ? 'New Password (optional)' : 'Password *'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={editingUser ? "Leave empty to keep current password" : "Enter password (min 6 characters)"}
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {editingUser 
                      ? "Leave empty to keep current password" 
                      : "Password must be at least 6 characters"}
                  </p>
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
                        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No users found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map(user => {
                      const uniqueRoles = getUniqueArray(user.roles || []);
                      return (
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
                              {uniqueRoles.map(roleId => {
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
                              {uniqueRoles.length === 0 && (
                                <span className="text-gray-400 text-sm">No roles</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={user.status === 'active' ? 'default' : 'secondary'}
                              className={user.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                            >
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {user.lastLogin 
                              ? new Date(user.lastLogin).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Never'}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditUser(user)}
                                title="Edit user"
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
                                title="Delete user"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                  {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                    <div key={category} className="border-b last:border-b-0">
                      <div className="p-3 bg-gray-50 sticky top-0 z-10">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium capitalize">
                            {category.replace('_', ' ')} Permissions
                          </Label>
                          <Badge variant="outline" className={getCategoryColor(category)}>
                            {categoryPermissions.length}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {categoryPermissions.map(permission => (
                          <div key={permission.code} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                            <Checkbox
                              id={`perm-${permission.code}`}
                              checked={newRole.permissions.includes(permission.code)}
                              onCheckedChange={() => toggleRolePermission(permission.code)}
                            />
                            <Label htmlFor={`perm-${permission.code}`} className="text-sm flex-1 cursor-pointer">
                              <div className="font-medium">{permission.name}</div>
                              <div className="text-xs text-gray-500">{permission.description}</div>
                              <div className="text-xs text-gray-400">Code: {permission.code}</div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-500">
                  Selected: {newRole.permissions.length} permissions
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

          {/* Roles Table */}
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
                        <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No roles found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRoles.map(role => {
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
                          <TableCell>
                            <div className="max-w-[200px] truncate" title={role.description}>
                              {role.description || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[300px]">
                              {uniquePermissions.slice(0, 3).map(permissionCode => {
                                const permission = permissions.find(p => p.code === permissionCode);
                                return (
                                  <Badge 
                                    key={`${role.role_code}-${permissionCode}`} 
                                    variant="outline" 
                                    className="text-xs"
                                    title={permission?.description}
                                  >
                                    {permission?.name || permissionCode}
                                  </Badge>
                                );
                              })}
                              {uniquePermissions.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{uniquePermissions.length - 3} more
                                </Badge>
                              )}
                              {uniquePermissions.length === 0 && (
                                <span className="text-gray-400 text-sm">No permissions</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {role.userCount || 0} users
                              </Badge>
                              {role.userCount > 0 && (
                                <span className="text-xs text-gray-500">
                                  in system
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditRole(role)}
                                disabled={role.isSystemRole}
                                title={role.isSystemRole ? "System role cannot be edited" : "Edit role"}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteRole(role.role_code)}
                                disabled={role.isSystemRole || role.userCount > 0}
                                title={
                                  role.isSystemRole 
                                    ? "System role cannot be deleted" 
                                    : role.userCount > 0 
                                      ? "Role has assigned users" 
                                      : "Delete role"
                                }
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                        <h3 className="text-lg font-semibold capitalize">{category.replace('_', ' ')}</h3>
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
                          {categoryPermissions.map(permission => {
                            const assignedRoles = roles.filter(role => 
                              role.permissions.includes(permission.code)
                            );
                            return (
                              <TableRow key={permission.code}>
                                <TableCell className="font-medium">
                                  <div>
                                    {permission.name}
                                    <div className="text-xs text-gray-500">
                                      {permission.code}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="max-w-xs">
                                  <div className="truncate" title={permission.description}>
                                    {permission.description}
                                  </div>
                                </TableCell>
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
                                    {assignedRoles.slice(0, 2).map(role => (
                                      <Badge 
                                        key={`${permission.code}-${role.role_code}`} 
                                        variant="outline" 
                                        className="text-xs"
                                        title={role.description}
                                      >
                                        {role.name}
                                      </Badge>
                                    ))}
                                    {assignedRoles.length > 2 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{assignedRoles.length - 2} more
                                      </Badge>
                                    )}
                                    {assignedRoles.length === 0 && (
                                      <span className="text-gray-400 text-sm">Not assigned</span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
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
                <div className="flex items-end gap-2">
                  <Button variant="outline" onClick={() => setAuditFilter({action: '', resourceType: '', dateFrom: '', dateTo: ''})}>
                    <Filter className="h-4 w-4 mr-2" />
                    Reset Filters
                  </Button>
                </div>
              </div>

              {/* Audit Logs Table */}
              <div className="border rounded-lg overflow-hidden">
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
                        <TableRow key={log.id} className="hover:bg-gray-50">
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              {new Date(log.timestamp).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
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
                              <div className="font-medium capitalize">{log.resourceType.replace('_', ' ')}</div>
                              <div className="text-sm text-gray-500">{log.resourceName}</div>
                              <div className="text-xs text-gray-400">ID: {log.resourceId}</div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {log.oldValues && log.newValues ? (
                              <div className="text-xs space-y-1">
                                <div className="text-red-600 line-through truncate" title={JSON.stringify(log.oldValues)}>
                                  {JSON.stringify(log.oldValues)}
                                </div>
                                <div className="text-green-600 truncate" title={JSON.stringify(log.newValues)}>
                                  {JSON.stringify(log.newValues)}
                                </div>
                              </div>
                            ) : log.oldValues ? (
                              <div className="text-red-600 line-through text-xs truncate" title={JSON.stringify(log.oldValues)}>
                                Deleted: {JSON.stringify(log.oldValues)}
                              </div>
                            ) : log.newValues ? (
                              <div className="text-green-600 text-xs truncate" title={JSON.stringify(log.newValues)}>
                                Created: {JSON.stringify(log.newValues)}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">No changes recorded</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-[200px]">
                            <div className="truncate" title={log.notes}>
                              {log.notes}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}