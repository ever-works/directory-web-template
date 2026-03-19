export const PERMISSIONS = {
  // Items management
  items: {
    read: 'items:read',
    create: 'items:create',
    update: 'items:update',
    delete: 'items:delete',
    review: 'items:review',
    approve: 'items:approve',
    reject: 'items:reject',
  },
  // Categories management
  categories: {
    read: 'categories:read',
    create: 'categories:create',
    update: 'categories:update',
    delete: 'categories:delete',
  },
  // Tags management
  tags: {
    read: 'tags:read',
    create: 'tags:create',
    update: 'tags:update',
    delete: 'tags:delete',
  },
  // Roles management
  roles: {
    read: 'roles:read',
    create: 'roles:create',
    update: 'roles:update',
    delete: 'roles:delete',
  },
  // Users management
  users: {
    read: 'users:read',
    create: 'users:create',
    update: 'users:update',
    delete: 'users:delete',
    assignRoles: 'users:assignRoles',
  },
  // Analytics
  analytics: {
    read: 'analytics:read',
    export: 'analytics:export',
  },
  // System
  system: {
    settings: 'system:settings',
  },
} as const;

type PermissionValues<T> = T extends Record<string, infer U>
  ? U extends Record<string, infer V>
    ? V extends string
      ? V
      : never
    : never
  : never;

export type Permission = PermissionValues<typeof PERMISSIONS>;

export function getAllPermissions(): Permission[] {
  const allPermissions = Object.values(PERMISSIONS).flatMap(resource => 
    Object.values(resource)
  );
  // Type assertion is safe here because PERMISSIONS is const and all values are valid permissions
  return allPermissions as Permission[];
}

export function getPermissionsForResource(resource: keyof typeof PERMISSIONS): Permission[] {
  const resourcePermissions = Object.values(PERMISSIONS[resource]);
  // Type assertion is safe here because PERMISSIONS[resource] contains only valid permissions
  return resourcePermissions as Permission[];
}

export function isValidPermission(permission: string): permission is Permission {
  const allPermissions = getAllPermissions();
  return allPermissions.includes(permission as Permission);
}

export const DEFAULT_ROLES = {
  SUPER_ADMIN: {
    id: 'super-admin',
    name: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: getAllPermissions(),
  },
  CONTENT_MANAGER: {
    id: 'content-manager',
    name: 'Content Manager',
    description: 'Manage content including items, categories, and tags',
    permissions: [
      ...getPermissionsForResource('items'),
      ...getPermissionsForResource('categories'),
      ...getPermissionsForResource('tags'),
    ],
  },
} as const; 