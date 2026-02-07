import { db } from '@/lib/db/drizzle';
import { roles, permissions, rolePermissions } from '@/lib/db/schema';
import { eq, desc, asc, sql, isNull, and, SQL, inArray } from 'drizzle-orm';
import { RoleData, CreateRoleRequest, UpdateRoleRequest, RoleStatus, RoleListOptions } from '@/lib/types/role';
import { Permission } from '@/lib/permissions/definitions';

export class RoleDbService {
	// Helper method to get permissions for a role
	private async getRolePermissions(roleId: string): Promise<Permission[]> {
		const rolePerms = await db
			.select({ permissionKey: permissions.key })
			.from(rolePermissions)
			.innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
			.where(eq(rolePermissions.roleId, roleId));

		return rolePerms.map((rp) => rp.permissionKey as Permission);
	}

	// Helper method to get roles with their permissions
	private async getRolesWithPermissions(tenantId: string, roleIds?: string[]): Promise<RoleData[]> {
		// Get roles
		let roleQuery = db
			.select()
			.from(roles)
			.where(and(isNull(roles.deletedAt), eq(roles.tenantId, tenantId)));

		if (roleIds && roleIds.length > 0) {
			roleQuery = db
				.select()
				.from(roles)
				.where(and(isNull(roles.deletedAt), eq(roles.tenantId, tenantId), inArray(roles.id, roleIds)));
		}

		const rolesResult = await roleQuery;

		// Get permissions for all roles in a single query
		const allRoleIds = roleIds && roleIds.length > 0 ? roleIds : rolesResult.map((r) => r.id);
		let rolePermissionsResult: { roleId: string; permissionKey: string }[] = [];

		if (allRoleIds.length > 0) {
			rolePermissionsResult = await db
				.select({
					roleId: rolePermissions.roleId,
					permissionKey: permissions.key
				})
				.from(rolePermissions)
				.innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
				.where(inArray(rolePermissions.roleId, allRoleIds));
		}

		// Group permissions by role
		const permissionsByRole = rolePermissionsResult.reduce(
			(acc, rp) => {
				if (!acc[rp.roleId]) {
					acc[rp.roleId] = [];
				}
				acc[rp.roleId].push(rp.permissionKey as Permission);
				return acc;
			},
			{} as Record<string, Permission[]>
		);

		// Map roles with their permissions
		return rolesResult.map((role) => this.mapDbToRoleData(role, permissionsByRole[role.id] || []));
	}
	public async findBy(
		tenantId: string,
		key: keyof typeof roles.$inferSelect,
		value: string
	): Promise<RoleData | null> {
		// Create a mapping of valid column keys to their corresponding column objects
		const columnMap = {
			id: roles.id,
			name: roles.name,
			description: roles.description,
			isAdmin: roles.isAdmin,
			status: roles.status,
			created_by: roles.created_by,
			createdAt: roles.createdAt,
			updatedAt: roles.updatedAt,
			deletedAt: roles.deletedAt,
			tenantId: roles.tenantId
		} as const;

		// Get the column object for the specified key
		const column = columnMap[key];
		if (!column) {
			throw new Error(`Invalid column key: ${String(key)}`);
		}

		const rolesResult = await db
			.select()
			.from(roles)
			.where(and(eq(column, value), eq(roles.tenantId, tenantId)));
		if (rolesResult.length === 0) {
			return null;
		}
		const role = rolesResult[0];
		const permissions = await this.getRolePermissions(role.id);
		return this.mapDbToRoleData(role, permissions);
	}

	// Helper method to update role permissions
	private async updateRolePermissions(roleId: string, tenantId: string, newPermissions: Permission[]): Promise<void> {
		await db.transaction(async (tx) => {
			if (newPermissions.length === 0) {
				await tx
					.delete(rolePermissions)
					.where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.tenantId, tenantId)));
				return;
			}

			const permissionRecords = await tx
				.select({ id: permissions.id, key: permissions.key })
				.from(permissions)
				.where(inArray(permissions.key, newPermissions));

			const missingKeys = newPermissions.filter((key) => !permissionRecords.some((record) => record.key === key));

			if (missingKeys.length > 0) {
				throw new Error(`Unknown permission keys: ${missingKeys.join(', ')}`);
			}

			await tx
				.delete(rolePermissions)
				.where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.tenantId, tenantId)));

			await tx.insert(rolePermissions).values(
				permissionRecords.map((perm) => ({
					roleId,
					tenantId,
					permissionId: perm.id
				}))
			);
		});
	}

	async readRoles(tenantId: string): Promise<RoleData[]> {
		try {
			return await this.getRolesWithPermissions(tenantId);
		} catch (error) {
			console.error('Error reading roles from database:', error);
			throw new Error('Failed to retrieve roles');
		}
	}

	async findById(id: string, tenantId: string): Promise<RoleData | null> {
		try {
			const rolesWithPermissions = await this.getRolesWithPermissions(tenantId, [id]);
			return rolesWithPermissions.length > 0 ? rolesWithPermissions[0] : null;
		} catch (error) {
			console.error('Error finding role by ID:', error);
			throw new Error('Failed to retrieve role');
		}
	}

	async createRole(data: CreateRoleRequest, tenantId: string): Promise<RoleData> {
		try {
			// Check for duplicate ID
			if (await this.exists(data.id, tenantId)) {
				throw new Error(`Role with ID '${data.id}' already exists`);
			}

			return await db.transaction(async (tx) => {
				const roleData = {
					id: data.id,
					name: data.name,
					description: data.description,
					status: data.status || 'active',
					isAdmin: data.isAdmin || false,
					created_by: 'system',
					tenantId
				};

				// Insert role
				const result = await tx.insert(roles).values(roleData).returning();
				const newRole = result[0];

				// Insert permissions if provided - using atomic transaction
				if (data.permissions && data.permissions.length > 0) {
					const permissionRecords = await tx
						.select({ id: permissions.id, key: permissions.key })
						.from(permissions)
						.where(inArray(permissions.key, data.permissions));

					const missingKeys = data.permissions.filter(
						(key) => !permissionRecords.some((record) => record.key === key)
					);

					if (missingKeys.length > 0) {
						throw new Error(`Unknown permission keys: ${missingKeys.join(', ')}`);
					}

					await tx.insert(rolePermissions).values(
						permissionRecords.map((perm) => ({
							roleId: newRole.id,
							tenantId,
							permissionId: perm.id
						}))
					);
				}

				// Return role data with permissions
				const createdPermissions = data.permissions || [];
				return this.mapDbToRoleData(newRole, createdPermissions);
			});
		} catch (error) {
			console.error('Error creating role:', error);
			throw error;
		}
	}

	async updateRole(id: string, data: UpdateRoleRequest, tenantId: string): Promise<RoleData> {
		try {
			const updateData: Record<string, unknown> = {};

			if (data.name !== undefined) updateData.name = data.name;
			if (data.description !== undefined) updateData.description = data.description;
			if (data.status !== undefined) updateData.status = data.status;
			if (data.isAdmin !== undefined) updateData.isAdmin = data.isAdmin;

			let roleRecord;

			// Only update the roles table if there are actual role fields to update
			if (Object.keys(updateData).length > 0) {
				// Add updatedAt timestamp when role fields are being modified
				updateData.updatedAt = new Date();

				const result = await db
					.update(roles)
					.set(updateData)
					.where(and(eq(roles.id, id), eq(roles.tenantId, tenantId)))
					.returning();

				if (result.length === 0) {
					throw new Error(`Role with ID '${id}' not found`);
				}
				roleRecord = result[0];
			} else {
				// If no role fields to update, just get the existing role
				const existingRoles = await db
					.select()
					.from(roles)
					.where(and(eq(roles.id, id), eq(roles.tenantId, tenantId)));
				if (existingRoles.length === 0) {
					throw new Error(`Role with ID '${id}' not found`);
				}
				roleRecord = existingRoles[0];
			}

			// Update permissions if provided
			if (data.permissions !== undefined) {
				await this.updateRolePermissions(id, tenantId, data.permissions);
			}

			// Get updated permissions to return complete role data
			const updatedPermissions = await this.getRolePermissions(id);
			return this.mapDbToRoleData(roleRecord, updatedPermissions);
		} catch (error) {
			console.error('Error updating role:', error);
			throw error;
		}
	}

	async deleteRole(id: string, tenantId: string): Promise<void> {
		try {
			await db
				.update(roles)
				.set({ deletedAt: new Date() })
				.where(and(eq(roles.id, id), eq(roles.tenantId, tenantId)));
		} catch (error) {
			console.error('Error deleting role:', error);
			throw new Error('Failed to delete role');
		}
	}

	async hardDeleteRole(id: string, tenantId: string): Promise<void> {
		try {
			await db.delete(roles).where(and(eq(roles.id, id), eq(roles.tenantId, tenantId)));
		} catch (error) {
			console.error('Error hard deleting role:', error);
			throw new Error('Failed to hard delete role');
		}
	}

	async findRoles(
		tenantId: string,
		options: RoleListOptions = {}
	): Promise<{
		roles: RoleData[];
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	}> {
		try {
			const { page = 1, limit = 10, status, sortBy = 'name', sortOrder = 'asc' } = options;

			// Build the base query with conditional filters
			const filters: SQL[] = [isNull(roles.deletedAt), eq(roles.tenantId, tenantId)]; // Always exclude deleted roles
			if (status) {
				filters.push(eq(roles.status, status));
			}

			// Get total count with same filters
			const countQuery = db
				.select({ count: sql<number>`count(*)` })
				.from(roles)
				.where(and(...filters));
			const countResult = await countQuery;
			const total = countResult[0]?.count ?? 0;

			// Apply sorting and pagination
			const sortFieldMap = {
				name: roles.name,
				id: roles.id,
				created_at: roles.createdAt
			};
			const sortField = sortFieldMap[sortBy] || roles.name;
			const orderFn = sortOrder === 'desc' ? desc : asc;

			const query = db
				.select()
				.from(roles)
				.where(and(...filters));

			const result = await query
				.orderBy(orderFn(sortField))
				.limit(limit)
				.offset((page - 1) * limit);

			// Get permissions for the returned roles
			const roleIds = result.map((role) => role.id);
			let rolePermissionsResult: { roleId: string; permissionKey: string }[] = [];

			if (roleIds.length > 0) {
				rolePermissionsResult = await db
					.select({
						roleId: rolePermissions.roleId,
						permissionKey: permissions.key
					})
					.from(rolePermissions)
					.innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
					.where(inArray(rolePermissions.roleId, roleIds));
			}

			// Group permissions by role
			const permissionsByRole = rolePermissionsResult.reduce(
				(acc, rp) => {
					if (!acc[rp.roleId]) {
						acc[rp.roleId] = [];
					}
					acc[rp.roleId].push(rp.permissionKey as Permission);
					return acc;
				},
				{} as Record<string, Permission[]>
			);

			return {
				roles: result.map((role) => this.mapDbToRoleData(role, permissionsByRole[role.id] || [])),
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit)
			};
		} catch (error) {
			console.error('Error finding roles:', error);

			// Provide more specific error messages for debugging
			if (error && typeof error === 'object' && 'code' in error) {
				const dbError = error as { code: string; message?: string };
				if (dbError.code === 'CONNECT_TIMEOUT') {
					throw new Error('Database connection timeout - please check your database connection');
				} else if (dbError.code === 'ECONNREFUSED') {
					throw new Error('Database connection refused - please ensure PostgreSQL is running');
				}
			}

			throw new Error(`Failed to retrieve roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	async exists(id: string, tenantId: string, options: { includeDeleted?: boolean } = {}): Promise<boolean> {
		try {
			const conditions: SQL[] = [eq(roles.id, id), eq(roles.tenantId, tenantId)];
			if (!options.includeDeleted) {
				conditions.push(isNull(roles.deletedAt));
			}

			const result = await db
				.select()
				.from(roles)
				.where(and(...conditions));
			return result.length > 0;
		} catch (error) {
			console.error('Error checking role existence:', error);
			return false;
		}
	}

	private mapDbToRoleData(dbRole: typeof roles.$inferSelect, rolePermissions: Permission[] = []): RoleData {
		return {
			id: dbRole.id,
			name: dbRole.name,
			description: dbRole.description || '',
			status: (dbRole.status as RoleStatus) || 'active',
			isAdmin: dbRole.isAdmin || false,
			permissions: rolePermissions,
			created_at: dbRole.createdAt.toISOString(),
			updated_at: dbRole.updatedAt.toISOString(),
			created_by: dbRole.created_by || 'system'
		};
	}
}
