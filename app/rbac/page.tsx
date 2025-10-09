'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Edit, Trash2, User, Shield, Save, X, History, Filter, Download, Upload, Users, Key, Clock } from 'lucide-react';

// ==================== TYPES ====================
type PermissionCategory = 'transactions' | 'cash_advance' | 'reimburse' | 'projects' | 'settings' | 'reports';

type Permission = {
  id: string;
  name: string;
  description: string;
  category: PermissionCategory;
  module: string;
  action: string;
  createdAt: string;
};

type Role = {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // permission IDs
  isSystemRole: boolean;
  createdAt: string;
  createdBy: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  roles: string[]; // role IDs
  department?: string;
  position?: string;
  status: 'active' | 'inactive';
  lastLogin?: string;
  createdAt: string;
};

type AuditAction = 'create' | 'update' | 'delete' | 'assign' | 'revoke' | 'approve' | 'reject';

type AuditLog = {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  resourceType: 'user' | 'role' | 'permission' | 'user_role';
  resourceId: string;
  resourceName: string;
  oldValues?: any;
  newValues?: any;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
};

// ==================== MOCK DATA ====================
const mockPermissions: Permission[] = [
  // Transactions Permissions
  {
    id: 'salesorder_create',
    name: 'Create Sales Order',
    description: 'Membuat sales order baru',
    category: 'transactions',
    module: 'sales',
    action: 'create',
    createdAt: '2024-01-01'
  },
  {
    id: 'salesorder_view',
    name: 'View Sales Order',
    description: 'Melihat sales order',
    category: 'transactions',
    module: 'sales',
    action: 'view',
    createdAt: '2024-01-01'
  },
  {
    id: 'purchaseorder_create',
    name: 'Create Purchase Order',
    description: 'Membuat purchase order baru',
    category: 'transactions',
    module: 'purchase',
    action: 'create',
    createdAt: '2024-01-01'
  },
  {
    id: 'purchaseorder_approve_spv',
    name: 'Approve PO (Supervisor)',
    description: 'Menyetujui purchase order level supervisor',
    category: 'transactions',
    module: 'purchase',
    action: 'approve_spv',
    createdAt: '2024-01-01'
  },
  {
    id: 'purchaseorder_approve_finance',
    name: 'Approve PO (Finance)',
    description: 'Menyetujui purchase order level finance',
    category: 'transactions',
    module: 'purchase',
    action: 'approve_finance',
    createdAt: '2024-01-01'
  },

  // Cash Advance Permissions
  {
    id: 'ca_create',
    name: 'Create Cash Advance',
    description: 'Membuat pengajuan cash advance',
    category: 'cash_advance',
    module: 'cash_advance',
    action: 'create',
    createdAt: '2024-01-01'
  },
  {
    id: 'ca_view',
    name: 'View Cash Advance',
    description: 'Melihat data cash advance',
    category: 'cash_advance',
    module: 'cash_advance',
    action: 'view',
    createdAt: '2024-01-01'
  },
  {
    id: 'ca_approve_spv',
    name: 'Approve CA (Supervisor)',
    description: 'Menyetujui cash advance level supervisor',
    category: 'cash_advance',
    module: 'cash_advance',
    action: 'approve_spv',
    createdAt: '2024-01-01'
  },
  {
    id: 'ca_approve_finance',
    name: 'Approve CA (Finance)',
    description: 'Menyetujui cash advance level finance',
    category: 'cash_advance',
    module: 'cash_advance',
    action: 'approve_finance',
    createdAt: '2024-01-01'
  },

  // Settings Permissions
  {
    id: 'rbac_view',
    name: 'View RBAC',
    description: 'Melihat pengaturan role dan permission',
    category: 'settings',
    module: 'rbac',
    action: 'view',
    createdAt: '2024-01-01'
  },
  {
    id: 'rbac_manage',
    name: 'Manage RBAC',
    description: 'Mengelola user, role, dan permission',
    category: 'settings',
    module: 'rbac',
    action: 'manage',
    createdAt: '2024-01-01'
  },
  {
    id: 'audit_view',
    name: 'View Audit Logs',
    description: 'Melihat log aktivitas sistem',
    category: 'settings',
    module: 'audit',
    action: 'view',
    createdAt: '2024-01-01'
  }
];

const mockRoles: Role[] = [
  {
    id: 'super_admin',
    name: 'Super Administrator',
    description: 'Full access to all system features and settings',
    permissions: mockPermissions.map(p => p.id),
    isSystemRole: true,
    createdAt: '2024-01-01',
    createdBy: 'system'
  },
  {
    id: 'finance_manager',
    name: 'Finance Manager',
    description: 'Manage financial transactions and approvals',
    permissions: [
      'purchaseorder_approve_finance',
      'ca_approve_finance', 
      'purchaseorder_view',
      'ca_view',
      'rbac_view',
      'audit_view'
    ],
    isSystemRole: false,
    createdAt: '2024-01-15',
    createdBy: 'admin'
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    description: 'Approve transactions at supervisor level',
    permissions: [
      'purchaseorder_approve_spv',
      'ca_approve_spv',
      'purchaseorder_view',
      'ca_view'
    ],
    isSystemRole: false,
    createdAt: '2024-01-15',
    createdBy: 'admin'
  },
  {
    id: 'sales_officer',
    name: 'Sales Officer',
    description: 'Handle sales transactions and orders',
    permissions: [
      'salesorder_create',
      'salesorder_view',
      'purchaseorder_create',
      'purchaseorder_view'
    ],
    isSystemRole: false,
    createdAt: '2024-01-20',
    createdBy: 'admin'
  }
];

const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin System',
    email: 'admin@company.com',
    roles: ['super_admin'],
    position: 'System Administrator',
    status: 'active',
    lastLogin: '2024-01-23 14:30',
    createdAt: '2024-01-01'
  },
  {
    id: '2',
    name: 'Budi Santoso',
    email: 'budi.finance@company.com',
    roles: ['finance_manager'],
    department: 'Finance',
    position: 'Finance Manager',
    status: 'active',
    lastLogin: '2024-01-23 09:15',
    createdAt: '2024-01-15'
  },
  {
    id: '3',
    name: 'Sari Dewi',
    email: 'sari.supervisor@company.com',
    roles: ['supervisor'],
    department: 'Operations',
    position: 'Supervisor',
    status: 'active',
    lastLogin: '2024-01-23 11:20',
    createdAt: '2024-01-15'
  },
  {
    id: '4',
    name: 'Ahmad Wijaya',
    email: 'ahmad.sales@company.com',
    roles: ['sales_officer'],
    department: 'Sales',
    position: 'Sales Officer',
    status: 'active',
    lastLogin: '2024-01-23 08:45',
    createdAt: '2024-01-20'
  }
];

const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    userId: '1',
    userName: 'Admin System',
    action: 'create',
    resourceType: 'user',
    resourceId: '4',
    resourceName: 'Ahmad Wijaya',
    timestamp: '2024-01-20 10:30:00',
    notes: 'Created new user account'
  },
  {
    id: '2',
    userId: '1',
    userName: 'Admin System',
    action: 'assign',
    resourceType: 'user_role',
    resourceId: '4',
    resourceName: 'Ahmad Wijaya - sales_officer',
    oldValues: { roles: [] },
    newValues: { roles: ['sales_officer'] },
    timestamp: '2024-01-20 10:35:00',
    notes: 'Assigned sales_officer role to user'
  },
  {
    id: '3',
    userId: '1',
    userName: 'Admin System',
    action: 'update',
    resourceType: 'role',
    resourceId: 'finance_manager',
    resourceName: 'Finance Manager',
    oldValues: { permissions: ['purchaseorder_approve_finance', 'ca_approve_finance'] },
    newValues: { permissions: ['purchaseorder_approve_finance', 'ca_approve_finance', 'audit_view'] },
    timestamp: '2024-01-18 14:20:00',
    notes: 'Added audit_view permission to role'
  }
];

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

// ==================== MAIN COMPONENT ====================
export default function RBACPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'permissions' | 'audit'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  
  // User state
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [newUser, setNewUser] = useState<Partial<User>>({ 
    name: '', 
    email: '', 
    roles: [], 
    department: '',
    position: '',
    status: 'active' 
  });
  const [editingUser, setEditingUser] = useState<string | null>(null);
  
  // Role state
  const [roles, setRoles] = useState<Role[]>(mockRoles);
  const [newRole, setNewRole] = useState<Partial<Role>>({ 
    name: '', 
    description: '', 
    permissions: [] 
  });
  const [editingRole, setEditingRole] = useState<string | null>(null);
  
  // Permission state
  const [permissions] = useState<Permission[]>(mockPermissions);
  const [auditLogs] = useState<AuditLog[]>(mockAuditLogs);
  
  // Audit log filters
  const [auditFilter, setAuditFilter] = useState({
    action: '' as AuditAction | '',
    resourceType: '' as AuditLog['resourceType'] | '',
    dateFrom: '',
    dateTo: ''
  });

  // ==================== USER FUNCTIONS ====================
  const addUser = () => {
    if (newUser.name && newUser.email) {
      const user: User = {
        id: `user-${Date.now()}`,
        name: newUser.name,
        email: newUser.email,
        roles: newUser.roles || [],
        department: newUser.department,
        position: newUser.position,
        status: newUser.status || 'active',
        createdAt: new Date().toISOString().split('T')[0]
      };
      setUsers([...users, user]);
      resetForms();
    }
  };

  const updateUser = () => {
    if (editingUser && newUser.name && newUser.email) {
      setUsers(users.map(user => 
        user.id === editingUser 
          ? { 
              ...user, 
              name: newUser.name || user.name,
              email: newUser.email || user.email,
              roles: newUser.roles || user.roles,
              department: newUser.department,
              position: newUser.position,
              status: newUser.status || user.status
            }
          : user
      ));
      resetForms();
    }
  };

  const deleteUser = (id: string) => {
    setUsers(users.filter(user => user.id !== id));
  };

  const startEditUser = (user: User) => {
    setEditingUser(user.id);
    setNewUser({
      name: user.name,
      email: user.email,
      roles: user.roles,
      department: user.department,
      position: user.position,
      status: user.status
    });
  };

  const toggleUserRole = (roleId: string) => {
    setNewUser(prev => ({
      ...prev,
      roles: prev.roles?.includes(roleId)
        ? prev.roles.filter(r => r !== roleId)
        : [...(prev.roles || []), roleId]
    }));
  };

  // ==================== ROLE FUNCTIONS ====================
  const addRole = () => {
    if (newRole.name) {
      const role: Role = {
        id: newRole.name.toLowerCase().replace(/\s+/g, '_'),
        name: newRole.name,
        description: newRole.description || '',
        permissions: newRole.permissions || [],
        isSystemRole: false,
        createdAt: new Date().toISOString().split('T')[0],
        createdBy: 'current_user'
      };
      setRoles([...roles, role]);
      resetForms();
    }
  };

  const updateRole = () => {
    if (editingRole && newRole.name) {
      setRoles(roles.map(role => 
        role.id === editingRole 
          ? { 
              ...role, 
              name: newRole.name || role.name,
              description: newRole.description || role.description,
              permissions: newRole.permissions || role.permissions
            }
          : role
      ));
      resetForms();
    }
  };

  const deleteRole = (id: string) => {
    setUsers(users.map(user => ({
      ...user,
      roles: user.roles.filter(role => role !== id)
    })));
    setRoles(roles.filter(role => role.id !== id));
  };

  const startEditRole = (role: Role) => {
    setEditingRole(role.id);
    setNewRole({
      name: role.name,
      description: role.description,
      permissions: role.permissions
    });
  };

  const toggleRolePermission = (permissionId: string) => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions?.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...(prev.permissions || []), permissionId]
    }));
  };

  // ==================== HELPER FUNCTIONS ====================
  const resetForms = () => {
    setEditingUser(null);
    setEditingRole(null);
    setNewUser({ name: '', email: '', roles: [], department: '', position: '', status: 'active' });
    setNewRole({ name: '', description: '', permissions: [] });
  };

  const getRoleName = (roleId: string) => {
    return roles.find(r => r.id === roleId)?.name || roleId;
  };

  const getPermissionName = (permissionId: string) => {
    return permissions.find(p => p.id === permissionId)?.name || permissionId;
  };

  const getCategoryColor = (category: PermissionCategory) => {
    const colors = {
      transactions: 'bg-blue-100 text-blue-800',
      cash_advance: 'bg-green-100 text-green-800',
      reimburse: 'bg-purple-100 text-purple-800',
      projects: 'bg-orange-100 text-orange-800',
      settings: 'bg-red-100 text-red-800',
      reports: 'bg-indigo-100 text-indigo-800'
    };
    return colors[category];
  };

  // ==================== FILTERED DATA ====================
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Role-Based Access Control</h1>
          <p className="text-gray-600 mt-2">Manage users, roles, and permissions for your finance application</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit Logs
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
                {editingUser ? 'Update user information and roles' : 'Create a new user account'}
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
                <Label>Roles</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {roles.map(role => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`user-role-${role.id}`}
                        checked={newUser.roles?.includes(role.id)}
                        onCheckedChange={() => toggleUserRole(role.id)}
                        disabled={role.isSystemRole && role.id === 'super_admin'}
                      />
                      <Label htmlFor={`user-role-${role.id}`} className="text-sm flex items-center gap-2">
                        {role.name}
                        {role.isSystemRole && (
                          <Badge variant="secondary" className="text-xs">System</Badge>
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
                  {filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          {user.position && (
                            <div className="text-xs text-gray-400">{user.position}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{user.department || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map(roleId => {
                            const role = roles.find(r => r.id === roleId);
                            return role ? (
                              <Badge key={roleId} variant="secondary" className="text-xs">
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
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
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
                            onClick={() => deleteUser(user.id)}
                            disabled={user.roles.includes('super_admin')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`perm-${permission.id}`}
                              checked={newRole.permissions?.includes(permission.id)}
                              onCheckedChange={() => toggleRolePermission(permission.id)}
                            />
                            <Label htmlFor={`perm-${permission.id}`} className="text-sm flex-1">
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
                  {filteredRoles.map(role => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {role.name}
                          {role.isSystemRole && (
                            <Badge variant="secondary" className="text-xs">System</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{role.description}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[300px]">
                          {role.permissions.slice(0, 3).map(permissionId => (
                            <Badge key={permissionId} variant="outline" className="text-xs">
                              {getPermissionName(permissionId)}
                            </Badge>
                          ))}
                          {role.permissions.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{role.permissions.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {users.filter(user => user.roles.includes(role.id)).length} users
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
                            onClick={() => deleteRole(role.id)}
                            disabled={role.isSystemRole}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
                        <Badge variant="secondary" className={getCategoryColor(category as PermissionCategory)}>
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
                            <TableRow key={permission.id}>
                              <TableCell className="font-medium">{permission.name}</TableCell>
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
                                    .filter(role => role.permissions.includes(permission.id))
                                    .slice(0, 2)
                                    .map(role => (
                                      <Badge key={role.id} variant="outline" className="text-xs">
                                        {role.name}
                                      </Badge>
                                    ))}
                                  {roles.filter(role => role.permissions.includes(permission.id)).length > 2 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{roles.filter(role => role.permissions.includes(permission.id)).length - 2} more
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
        {/* // ==================== AUDIT LOGS TAB - PERBAIKAN ==================== */}
        <TabsContent value="audit">
        <Card>
            <CardHeader>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>Track all changes made to users, roles, and permissions</CardDescription>
            </CardHeader>
            <CardContent>
            {/* Audit Filters - PERBAIKAN DI SINI */}
            <div className="flex flex-wrap gap-4 mb-6 p-4 border rounded-lg">
                <div className="space-y-2">
                <Label className="text-sm">Action Type</Label>
                <Select 
                    value={auditFilter.action} 
                    onValueChange={(v: AuditAction | 'all') => setAuditFilter({...auditFilter, action: v === 'all' ? '' : v})}
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
                    onValueChange={(v: AuditLog['resourceType'] | 'all') => setAuditFilter({...auditFilter, resourceType: v === 'all' ? '' : v})}
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
                {filteredAuditLogs.map(log => (
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
                        ) : (
                        <span className="text-gray-400 text-sm">No changes recorded</span>
                        )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                        {log.notes}
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>

            {filteredAuditLogs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No audit logs found matching your criteria</p>
                </div>
            )}
            </CardContent>
        </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}