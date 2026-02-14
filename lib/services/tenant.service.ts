/**
 * Tenant Service
 * Manages multi-tenant organization operations including:
 * - Creating new tenants with owners
 * - Managing tenant members
 * - Handling invitations
 */

import { db } from '@/lib/db/drizzle';
import { tenants, users, roles, userRoles, tenantInvitations, clientProfiles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { sendInvitationEmail } from '@/lib/mail';
import { coreConfig } from '@/lib/config/config-service';

// ######################### Utility Functions #########################

/**
 * Generate a URL-friendly slug from a name
 */
export function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.substring(0, 50);
}

/**
 * Generate a unique slug by appending a random suffix if needed
 */
async function generateUniqueSlug(name: string): Promise<string> {
	const baseSlug = generateSlug(name);
	let slug = baseSlug;
	let attempts = 0;

	while (attempts < 10) {
		const existing = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).limit(1);

		if (existing.length === 0) {
			return slug;
		}

		// Add random suffix
		slug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;
		attempts++;
	}

	throw new Error('Failed to generate unique slug');
}

// ######################### Tenant Creation #########################

export interface CreateTenantOptions {
	name: string;
	description?: string;
	settings?: {
		allowSignup?: boolean;
		maxMembers?: number;
		features?: string[];
	};
}

export interface CreateTenantResult {
	tenant: {
		id: string;
		name: string;
		slug: string;
	};
	ownerRole: {
		id: string;
		name: string;
	};
}

/**
 * Create a new tenant (organization) with specified owner
 * - Creates the tenant with a unique slug
 * - Creates an 'owner' role for the tenant
 * - Assigns the owner role to the specified user
 * - Updates the user's tenantId to the new tenant
 */
export async function createTenantWithOwner(
	ownerId: string,
	options: CreateTenantOptions
): Promise<CreateTenantResult> {
	const { name, description, settings } = options;

	// Generate unique slug
	const slug = await generateUniqueSlug(name);
	const tenantId = crypto.randomUUID();
	const ownerRoleId = crypto.randomUUID();

	// Transaction to ensure atomicity
	const result = await db.transaction(async (tx) => {
		// 1. Create the tenant
		const [tenant] = await tx
			.insert(tenants)
			.values({
				id: tenantId,
				name,
				slug,
				ownerId,
				description,
				settings
			})
			.returning({ id: tenants.id, name: tenants.name, slug: tenants.slug });

		// 2. Create owner role for this tenant
		const [ownerRole] = await tx
			.insert(roles)
			.values({
				id: ownerRoleId,
				tenantId: tenant.id,
				name: 'owner',
				description: 'Organization owner with full access',
				isAdmin: true,
				status: 'active',
				created_by: ownerId
			})
			.returning({ id: roles.id, name: roles.name });

		// 3. Create member role for this tenant
		await tx.insert(roles).values({
			id: crypto.randomUUID(),
			tenantId: tenant.id,
			name: 'member',
			description: 'Organization member',
			isAdmin: false,
			status: 'active',
			created_by: ownerId
		});

		// 4. Assign owner role to the user
		await tx.insert(userRoles).values({
			tenantId: tenant.id,
			userId: ownerId,
			roleId: ownerRole.id
		});

		// 5. Update user's tenantId to the new tenant
		await tx.update(users).set({ tenantId: tenant.id }).where(eq(users.id, ownerId));

		return {
			tenant,
			ownerRole
		};
	});

	return result;
}

// ######################### Invitation Management #########################

export interface CreateInvitationOptions {
	tenantId: string;
	email: string;
	invitedBy: string;
	roleId?: string;
	expiresInDays?: number;
}

export interface InvitationResult {
	id: string;
	token: string;
	email: string;
	expiresAt: Date;
}

/**
 * Create an invitation to join a tenant
 */
export async function createInvitation(options: CreateInvitationOptions): Promise<InvitationResult> {
	const { tenantId, email, invitedBy, roleId, expiresInDays = 7 } = options;

	// Check if user is already a member
	const existingUser = await db
		.select({ id: users.id })
		.from(users)
		.where(and(eq(users.email, email), eq(users.tenantId, tenantId)))
		.limit(1);

	if (existingUser.length > 0) {
		throw new Error('User is already a member of this organization');
	}

	// Check for existing pending invitation
	const existingInvitation = await db
		.select({ id: tenantInvitations.id })
		.from(tenantInvitations)
		.where(
			and(
				eq(tenantInvitations.email, email),
				eq(tenantInvitations.tenantId, tenantId),
				eq(tenantInvitations.status, 'pending')
			)
		)
		.limit(1);

	if (existingInvitation.length > 0) {
		throw new Error('An invitation for this email is already pending');
	}

	// Generate token and expiration
	const token = crypto.randomBytes(32).toString('hex');
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + expiresInDays);

	// If no roleId specified, get the default 'member' role
	let finalRoleId = roleId;
	if (!finalRoleId) {
		const memberRole = await db
			.select({ id: roles.id })
			.from(roles)
			.where(and(eq(roles.tenantId, tenantId), eq(roles.name, 'member')))
			.limit(1);

		if (memberRole.length > 0) {
			finalRoleId = memberRole[0].id;
		}
	}

	// Create invitation
	const [invitation] = await db
		.insert(tenantInvitations)
		.values({
			tenantId,
			email,
			invitedBy,
			roleId: finalRoleId,
			token,
			expiresAt
		})
		.returning({
			id: tenantInvitations.id,
			token: tenantInvitations.token,
			email: tenantInvitations.email,
			expiresAt: tenantInvitations.expiresAt
		});

	// Send invitation email
	const inviter = await db
		.select({
			name: clientProfiles.displayName,
			email: users.email
		})
		.from(users)
		.leftJoin(clientProfiles, eq(users.id, clientProfiles.userId))
		.where(eq(users.id, invitedBy))
		.limit(1)
		.then((rows) => rows[0]);

	const tenant = await db
		.select({ name: tenants.name })
		.from(tenants)
		.where(eq(tenants.id, tenantId))
		.limit(1)
		.then((rows) => rows[0]);

	if (inviter && tenant) {
		const appUrl = coreConfig.APP_URL || 'https://demo.ever.works';
		const invitationLink = `${appUrl}/auth/invitation/${invitation.token}`;

		try {
			await sendInvitationEmail(email, inviter.name || inviter.email || 'Someone', tenant.name, invitationLink);
		} catch (error) {
			console.error('Failed to send invitation email:', error);
			// Don't fail the request if email fails, just log it
		}
	}

	return invitation;
}

/**
 * Accept an invitation and join a tenant
 */
export async function acceptInvitation(token: string, userId: string): Promise<boolean> {
	// Find the invitation
	const [invitation] = await db
		.select()
		.from(tenantInvitations)
		.where(and(eq(tenantInvitations.token, token), eq(tenantInvitations.status, 'pending')))
		.limit(1);

	if (!invitation) {
		throw new Error('Invalid or expired invitation');
	}

	// Check if expired
	if (invitation.expiresAt < new Date()) {
		await db.update(tenantInvitations).set({ status: 'expired' }).where(eq(tenantInvitations.id, invitation.id));
		throw new Error('Invitation has expired');
	}

	// Transaction to join the tenant
	await db.transaction(async (tx) => {
		// 1. Update user's tenantId
		await tx.update(users).set({ tenantId: invitation.tenantId }).where(eq(users.id, userId));

		// 2. Assign role if specified
		if (invitation.roleId) {
			await tx
				.insert(userRoles)
				.values({
					tenantId: invitation.tenantId,
					userId,
					roleId: invitation.roleId
				})
				.onConflictDoNothing();
		}

		// 3. Mark invitation as accepted
		await tx
			.update(tenantInvitations)
			.set({ status: 'accepted', acceptedAt: new Date() })
			.where(eq(tenantInvitations.id, invitation.id));
	});

	return true;
}

/**
 * Get invitation details by token
 */
export async function getInvitationByToken(token: string) {
	const [invitation] = await db
		.select({
			id: tenantInvitations.id,
			email: tenantInvitations.email,
			token: tenantInvitations.token,
			status: tenantInvitations.status,
			expiresAt: tenantInvitations.expiresAt,
			tenantName: tenants.name,
			inviterName: clientProfiles.displayName,
			inviterEmail: users.email
		})
		.from(tenantInvitations)
		.innerJoin(tenants, eq(tenantInvitations.tenantId, tenants.id))
		.leftJoin(users, eq(tenantInvitations.invitedBy, users.id))
		.leftJoin(clientProfiles, eq(users.id, clientProfiles.userId))
		.where(eq(tenantInvitations.token, token))
		.limit(1);

	return invitation;
}

// ######################### Member Management #########################

export interface TenantMember {
	id: string;
	email: string | null;
	tenantId: string;
	roles: string[];
	createdAt: Date;
}

/**
 * Get all members of a tenant
 */
export async function getTenantMembers(tenantId: string): Promise<TenantMember[]> {
	const members = await db
		.select({
			id: users.id,
			email: users.email,
			tenantId: users.tenantId,
			createdAt: users.createdAt
		})
		.from(users)
		.where(eq(users.tenantId, tenantId));

	// Get roles for each member
	const membersWithRoles: TenantMember[] = await Promise.all(
		members.map(async (member) => {
			const memberRoles = await db
				.select({ roleName: roles.name })
				.from(userRoles)
				.innerJoin(roles, eq(userRoles.roleId, roles.id))
				.where(and(eq(userRoles.userId, member.id), eq(userRoles.tenantId, tenantId)));

			return {
				...member,
				roles: memberRoles.map((r) => r.roleName)
			};
		})
	);

	return membersWithRoles;
}

/**
 * Remove a member from a tenant
 * Note: Cannot remove the owner
 */
export async function removeMember(tenantId: string, userId: string): Promise<boolean> {
	// Check if user is the owner
	const [tenant] = await db
		.select({ ownerId: tenants.ownerId })
		.from(tenants)
		.where(eq(tenants.id, tenantId))
		.limit(1);

	if (tenant?.ownerId === userId) {
		throw new Error('Cannot remove the organization owner');
	}

	// Transaction to remove member
	await db.transaction(async (tx) => {
		// 1. Remove all role assignments for this user in this tenant
		await tx.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.tenantId, tenantId)));

		// 2. Move user to default tenant
		await tx.update(users).set({ tenantId: 'default-tenant' }).where(eq(users.id, userId));
	});

	return true;
}

/**
 * Get pending invitations for a tenant
 */
export async function getPendingInvitations(tenantId: string) {
	return db
		.select({
			id: tenantInvitations.id,
			email: tenantInvitations.email,
			status: tenantInvitations.status,
			expiresAt: tenantInvitations.expiresAt,
			createdAt: tenantInvitations.createdAt
		})
		.from(tenantInvitations)
		.where(and(eq(tenantInvitations.tenantId, tenantId), eq(tenantInvitations.status, 'pending')));
}

/**
 * Cancel a pending invitation
 */
export async function cancelInvitation(invitationId: string, tenantId: string): Promise<boolean> {
	await db
		.update(tenantInvitations)
		.set({ status: 'cancelled' })
		.where(
			and(
				eq(tenantInvitations.id, invitationId),
				eq(tenantInvitations.tenantId, tenantId),
				eq(tenantInvitations.status, 'pending')
			)
		);

	return true;
}
