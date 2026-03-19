import { Permission } from './definitions';

// Types for permission management UI
export interface PermissionState {
  [permission: string]: boolean;
}

export interface PermissionChanges {
  added: Permission[];
  removed: Permission[];
}

// Utility functions for permission state management
export function createPermissionState(currentPermissions: Permission[]): PermissionState {
  const state: PermissionState = {};
  currentPermissions.forEach(permission => {
    state[permission] = true;
  });
  return state;
}

export function getSelectedPermissions(permissionState: PermissionState): Permission[] {
  return Object.entries(permissionState)
    .filter(([, isSelected]) => isSelected)
    .map(([permission]) => permission as Permission);
}

export function calculatePermissionChanges(
  originalPermissions: Permission[],
  newPermissions: Permission[]
): PermissionChanges {
  const originalSet = new Set(originalPermissions);
  const newSet = new Set(newPermissions);

  const added = newPermissions.filter(permission => !originalSet.has(permission));
  const removed = originalPermissions.filter(permission => !newSet.has(permission));

  return { added, removed };
}

export function arePermissionsEqual(
  permissions1: Permission[],
  permissions2: Permission[]
): boolean {
  if (permissions1.length !== permissions2.length) {
    return false;
  }

  const set1 = new Set(permissions1);
  const set2 = new Set(permissions2);

  return permissions1.every(permission => set2.has(permission)) &&
         permissions2.every(permission => set1.has(permission));
}

export function filterPermissions(
  permissions: Permission[],
  searchTerm: string
): Permission[] {
  if (!searchTerm.trim()) {
    return permissions;
  }

  const search = searchTerm.toLowerCase();
  return permissions.filter(permission =>
    permission.toLowerCase().includes(search) ||
    permission.replace(':', ' ').toLowerCase().includes(search)
  );
}