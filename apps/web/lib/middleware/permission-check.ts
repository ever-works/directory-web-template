import { Permission, PERMISSIONS } from '@/lib/permissions/definitions';

// Get all valid permissions as a Set for O(1) lookup
const VALID_PERMISSIONS = new Set(
  Object.values(PERMISSIONS).flatMap(resource => Object.values(resource))
);

export interface UserPermissions {
  userId: string;
  roles: string[];
  permissions: Permission[];
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(userPermissions: UserPermissions, permission: Permission): boolean {
  return userPermissions.permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(userPermissions: UserPermissions, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userPermissions, permission));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(userPermissions: UserPermissions, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userPermissions, permission));
}

/**
 * Check if user has permission for a specific resource and action
 */
import { isValidPermission } from '@/lib/permissions/definitions';

export function hasResourcePermission(
  userPermissions: UserPermissions, 
  resource: string, 
  action: string
): boolean {
  const permission = `${resource}:${action}`;
  
  if (!isValidPermission(permission)) {
    console.warn(`Invalid permission: ${permission}`);
    return false;
  }
  
  return hasPermission(userPermissions, permission);
}

/**
 * Get all permissions for a specific resource
 */
export function getResourcePermissions(userPermissions: UserPermissions, resource: string): Permission[] {
  return userPermissions.permissions.filter(permission => 
    permission.startsWith(`${resource}:`)
  );
}

/**
 * Check if user can manage a specific resource (create, update, delete)
 */
export function canManageResource(userPermissions: UserPermissions, resource: string): boolean {
  const managePermissions = ['create', 'update', 'delete'].map(action => 
    `${resource}:${action}` as Permission
  );
  return hasAnyPermission(userPermissions, managePermissions);
}

/**
 * Check if user can review items
 */
export function canReviewItems(userPermissions: UserPermissions): boolean {
  return hasAnyPermission(userPermissions, [
    'items:review',
    'items:approve',
    'items:reject'
  ]);
}

/**
 * Check if user can manage users
 */
export function canManageUsers(userPermissions: UserPermissions): boolean {
  return hasAnyPermission(userPermissions, [
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'users:assignRoles'
  ]);
}

/**
 * Check if user can manage roles
 */
export function canManageRoles(userPermissions: UserPermissions): boolean {
  return hasAnyPermission(userPermissions, [
    'roles:read',
    'roles:create',
    'roles:update',
    'roles:delete'
  ]);
}

/**
 * Check if user can view analytics
 */
export function canViewAnalytics(userPermissions: UserPermissions): boolean {
  return hasPermission(userPermissions, 'analytics:read');
}

/**
 * Check if user is a super admin (has all permissions)
 */
export function isSuperAdmin(userPermissions: UserPermissions): boolean {
  // Check if user has the super-admin role (most secure approach)
  if (userPermissions.roles.includes('super-admin')) {
    return true;
  }
  
  // Fallback: Check if user has ALL system permissions
  // This ensures no partial permissions can grant super admin access
  const allPermissions: Permission[] = [
    'items:read', 'items:create', 'items:update', 'items:delete', 'items:review', 'items:approve', 'items:reject',
    'categories:read', 'categories:create', 'categories:update', 'categories:delete',
    'tags:read', 'tags:create', 'tags:update', 'tags:delete',
    'roles:read', 'roles:create', 'roles:update', 'roles:delete',
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:assignRoles',
    'analytics:read', 'analytics:export',
    'system:settings'
  ];
  
  return hasAllPermissions(userPermissions, allPermissions);
}

/**
 * Get a summary of user permissions grouped by resource
 */
export function getPermissionSummary(userPermissions: UserPermissions): Record<string, string[]> {
  const summary: Record<string, string[]> = {};
  
  userPermissions.permissions.forEach(permission => {
    const parts = permission.split(':');
    if (parts.length !== 2) {
      console.warn(`Invalid permission format: ${permission}`);
      return;
    }
    
    const [resource, action] = parts;
    if (!resource || !action) {
      console.warn(`Invalid permission format: ${permission}`);
      return;
    }
    
    if (!summary[resource]) {
      summary[resource] = [];
    }
    summary[resource].push(action);
  });
  
  return summary;
}

/**
 * Validate if a permission string is valid
 */
export function validatePermission(permission: string): boolean {
  return VALID_PERMISSIONS.has(permission as Permission);
}

/**
 * Parse a permission string into resource and action
 */
export function parsePermission(permission: string): { resource: string; action: string } | null {
  if (!validatePermission(permission)) {
    return null;
  }
  
  const [resource, action] = permission.split(':');
  return { resource, action };
} 