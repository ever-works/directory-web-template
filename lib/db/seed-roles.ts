import { db } from './drizzle';
import { permissions, roles, rolePermissions, type Permission, type Role } from './schema';
import { getTenantId } from '../auth/tenant';
import { eq } from 'drizzle-orm';

/**
 * Seed initial permissions
 */
export async function seedPermissions() {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const initialPermissions = [
		{ key: 'read:own', description: 'Can read own data' },
		{ key: 'write:own', description: 'Can write own data' },
		{ key: 'admin:all', description: 'Full administrative access' },
		{ key: 'client:manage', description: 'Can manage client-specific operations' },
		{ key: 'user:read', description: 'Can read user data' },
		{ key: 'user:write', description: 'Can write user data' }
	];

	const now = new Date();
	await db
		.insert(permissions)
		.values(
			initialPermissions.map((p) => ({
				key: p.key,
				description: p.description,
				tenantId,
				createdAt: now,
				updatedAt: now
			}))
		)
		.onConflictDoUpdate({
			target: permissions.key,
			set: {
				description: permissions.description,
				updatedAt: now
			}
		});

	console.log('✅ Permissions seeded successfully');
}

/**
 * Link roles to permissions
 */
export async function linkRolesToPermissions() {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	// Get existing roles
	const existingRoles: Role[] = await db.select().from(roles).where(eq(roles.tenantId, tenantId));
	const roleById = new Map(existingRoles.map((r) => [r.id, r]));
	const requiredRoles = ['admin', 'client'];
	const missing = requiredRoles.filter((r) => !roleById.has(r) || roleById.get(r)?.status !== 'active');
	if (missing.length) {
		throw new Error(`Missing or inactive required roles: ${missing.join(', ')}`);
	}

	// Get permissions
	const allPermissions: Permission[] = await db.select().from(permissions);
	const permByKey = new Map(allPermissions.map((p) => [p.key, p]));

	// Create role-permission mappings
	const rolePermissionMappings = [
		// Admin role gets all permissions
		...allPermissions.map((permission: Permission) => ({
			roleName: 'admin',
			permissionKey: permission.key
		})),
		// Client role gets basic permissions
		{
			roleName: 'client',
			permissionKey: 'read:own'
		},
		{
			roleName: 'client',
			permissionKey: 'write:own'
		},
		{
			roleName: 'client',
			permissionKey: 'client:manage'
		}
	];

	const values = rolePermissionMappings
		.map((m) => {
			const role = roleById.get(m.roleName);
			const perm = permByKey.get(m.permissionKey);
			return role && perm ? { roleId: role.id, permissionId: perm.id, createdAt: new Date(), tenantId } : null;
		})
		.filter(Boolean) as Array<{ roleId: string; permissionId: string; createdAt: Date; tenantId: string }>;

	if (values.length) {
		await db.insert(rolePermissions).values(values).onConflictDoNothing();
	}

	console.log('✅ Role-permission mappings created successfully');
}

/**
 * Main seed function
 */
export async function seedRolesAndPermissions() {
	try {
		await db.transaction(async () => {
			await seedPermissions();
			await linkRolesToPermissions();
		});
		console.log('✅ Role and permission seeding completed');
	} catch (error) {
		console.error('❌ Error seeding roles and permissions:', error);
		throw error;
	}
}

// Run if called directly
if (require.main === module) {
	seedRolesAndPermissions()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error(error);
			process.exit(1);
		});
}
