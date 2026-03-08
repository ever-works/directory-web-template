import { Permission, getPermissionsForResource } from './definitions';

// Permission group definitions for UI organization
export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  icon: string;
  permissions: Permission[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'content',
    name: 'Content Management',
    description: 'Manage items, categories, and tags',
    icon: 'FileText',
    permissions: [
      ...getPermissionsForResource('items'),
      ...getPermissionsForResource('categories'),
      ...getPermissionsForResource('tags'),
    ],
  },
  {
    id: 'users',
    name: 'User Management',
    description: 'Manage users and their roles',
    icon: 'Users',
    permissions: [
      ...getPermissionsForResource('users'),
      ...getPermissionsForResource('roles'),
    ],
  },
  {
    id: 'system',
    name: 'System & Analytics',
    description: 'System settings and analytics access',
    icon: 'Settings',
    permissions: [
      ...getPermissionsForResource('analytics'),
      ...getPermissionsForResource('system'),
    ],
  },
];

// Utility functions
export function getPermissionGroup(permission: Permission): PermissionGroup | undefined {
  return PERMISSION_GROUPS.find(group =>
    group.permissions.includes(permission)
  );
}

export function getPermissionsByGroup(groupId: string): Permission[] {
  const group = PERMISSION_GROUPS.find(g => g.id === groupId);
  return group?.permissions || [];
}

export function formatPermissionName(permission: Permission): string {
  const [resource, action] = permission.split(':');
  const actionName = action.charAt(0).toUpperCase() + action.slice(1);
  const resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);
  return `${actionName} ${resourceName}`;
}

export function formatPermissionDescription(permission: Permission): string {
  const [resource, action] = permission.split(':');

  const actionDescriptions: Record<string, string> = {
    read: 'View and access',
    create: 'Create new',
    update: 'Edit existing',
    delete: 'Remove',
    review: 'Review and moderate',
    approve: 'Approve submissions',
    reject: 'Reject submissions',
    assignRoles: 'Assign roles to',
    export: 'Export data from',
    settings: 'Manage settings for',
  };

  const resourceDescriptions: Record<string, string> = {
    items: 'items and submissions',
    categories: 'categories',
    tags: 'tags',
    users: 'users',
    roles: 'roles and permissions',
    analytics: 'analytics and reports',
    system: 'system configuration',
  };

  const actionDesc = actionDescriptions[action] || action;
  const resourceDesc = resourceDescriptions[resource] || resource;

  return `${actionDesc} ${resourceDesc}`;
}