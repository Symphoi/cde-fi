// hooks/usePermissions.js
"use client";

import { useState, useEffect } from 'react';

export function usePermissions() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Ambil dari localStorage (sesuai login form lo)
    const userData = localStorage.getItem('user');
    
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setPermissions(parsedUser.permissions || []);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    
    setLoading(false);
  }, []);

  // Check single permission
  const hasPermission = (requiredPermission) => {
    if (!requiredPermission || loading) return false;
    return permissions.some(p => p.permission_code === requiredPermission);
  };

  // Check multiple permissions (OR logic)
  const hasAnyPermission = (requiredPermissions = []) => {
    if (!requiredPermissions.length || loading) return true;
    return permissions.some(p => requiredPermissions.includes(p.permission_code));
  };

  // Check multiple permissions (AND logic)
  const hasAllPermissions = (requiredPermissions = []) => {
    if (!requiredPermissions.length || loading) return true;
    return requiredPermissions.every(rp => 
      permissions.some(p => p.permission_code === rp)
    );
  };

  return { 
    permissions, 
    user, 
    loading, 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions 
  };
}