import { Permission } from '@/lib/permissions/definitions';

export interface RoleData {
  id: string;
  name: string;
  description: string;
  status: RoleStatus;
  isAdmin: boolean;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface CreateRoleRequest {
  id: string;
  name: string;
  description: string;
  status: RoleStatus;
  isAdmin?: boolean;
  permissions: Permission[];
}

export interface UpdateRoleRequest extends Partial<Omit<CreateRoleRequest, 'id'>> {
  id: string;
}

export interface RoleListResponse {
  roles: RoleData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RoleResponse {
  role: RoleData;
}

export interface RoleListOptions {
  page?: number;
  limit?: number;
  status?: RoleStatus;
  sortBy?: 'name' | 'id' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export const ROLE_VALIDATION = {
  ID: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-z0-9-]+$/,
  },
  NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
  },
  DESCRIPTION: {
    MAX_LENGTH: 500,
  },
} as const;

export const ROLE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export type RoleStatus = typeof ROLE_STATUS[keyof typeof ROLE_STATUS];

export interface RoleWithCount extends RoleData {
  userCount?: number;
}

export interface RoleAssignment {
  roleId: string;
}

export interface PermissionAssignment extends RoleAssignment {
  permissions: Permission[];
}
export interface UserRoleAssignment extends RoleAssignment {
  userId: string;
}

export type RolePermissionUpdate = PermissionAssignment;
export type UserRoleUpdate = UserRoleAssignment; 