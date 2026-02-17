import bcrypt from 'bcryptjs';
import { seed } from 'drizzle-seed';
import { sql, eq } from 'drizzle-orm';

// Import schema tables
import {
	users,
	accounts,
	clientProfiles,
	roles,
	permissions,
	rolePermissions,
	userRoles,
	paymentProviders,
	paymentAccounts,
	subscriptions,
	subscriptionHistory,
	activityLogs,
	comments,
	votes,
	favorites,
	notifications,
	sessions,
	authenticators,
	verificationTokens,
	passwordResetTokens
} from './schema';
import type { NewAccount, NewPaymentProvider, NewPaymentAccount } from './schema';
import { getAllPermissions } from '../permissions/definitions';
import { PaymentProvider, PaymentPlan } from '../constants';
import { SubscriptionStatus, VoteType } from './schema';
import { isDemoMode } from '../utils';
import { getDatabaseUrl, getNodeEnv } from './config';

// Global database connection - will be initialized after environment loading
let db: ReturnType<typeof import('./drizzle').getDrizzleInstance>;

async function ensureDb() {
	// Quick sanity check similar to drizzle.ts behavior
	if (!getDatabaseUrl()) {
		throw new Error('DATABASE_URL is not set. Aborting seed to prevent accidental DummyDb operations.');
	}

	// Initialize database connection - use getDrizzleInstance() to get real instance, not Proxy
	const { getDrizzleInstance } = await import('./drizzle');
	db = getDrizzleInstance();
}

async function tableExists(name: string): Promise<boolean> {
	const res = await db.execute(
		sql`SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND lower(table_name) = lower(${name})
        LIMIT 1`
	);
	// postgres-js returns { rows: [...] }
	const rows = (res as { rows?: unknown[] }).rows ?? (Array.isArray(res) ? res : []);
	return rows.length > 0;
}

/**
 * Check if a table is empty
 */
async function isTableEmpty(tableName: string, table: unknown): Promise<boolean> {
	const exists = await tableExists(tableName);
	if (!exists) return true; // Table doesn't exist = treat as empty

	const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(table as never);
	return Number(count) === 0;
}

/**
 * Get table row count
 */
async function _getTableCount(tableName: string, table: unknown): Promise<number> {
	const exists = await tableExists(tableName);
	if (!exists) return 0;

	const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(table as never);
	return Number(count);
}

/**
 * Main seed function - exported for reuse by auto-initialization
 * Seeds database using drizzle-seed with per-table idempotency checks
 * Safe to run multiple times - only seeds tables that are empty
 *
 * NOTE: This function ONLY seeds data. Status management is handled by the caller (initialize.ts)
 */
export async function runSeed(): Promise<void> {
	await ensureDb();

	// Check if demo mode is enabled
	const isDemo = isDemoMode();

	if (isDemo) {
		console.log('[Seed] 🎭 Running in DEMO mode - will seed comprehensive test data');
	} else {
		console.log('[Seed] 🔒 Running in PRODUCTION mode - minimal essential seeding only');
	}

	console.log('[Seed] Checking existing data...');

	try {
		// Check each essential table individually
		const permissionsEmpty = await isTableEmpty('permissions', permissions);
		const rolesEmpty = await isTableEmpty('roles', roles);
		const usersEmpty = await isTableEmpty('users', users);
		const accountsEmpty = await isTableEmpty('accounts', accounts);
		const profilesEmpty = await isTableEmpty('client_profiles', clientProfiles);

		// Debug logging - show actual data in each table
		if (getNodeEnv() === 'development') {
			console.log('[Seed] Table status:');

			const permissionsData = await db.select().from(permissions);
			console.log(
				`  permissions: ${permissionsData.length} rows`,
				permissionsData.length <= 5 ? permissionsData : `[showing first 5]`,
				permissionsData.slice(0, 5)
			);

			const rolesData = await db.select().from(roles);
			console.log(`  roles: ${rolesData.length} rows`, rolesData);

			const usersData = await db.select().from(users);
			console.log(`  users: ${usersData.length} rows`, usersData);

			const accountsData = await db.select().from(accounts);
			console.log(
				`  accounts: ${accountsData.length} rows`,
				accountsData.length <= 5 ? accountsData : `[showing first 5]`,
				accountsData.slice(0, 5)
			);

			const profilesData = await db.select().from(clientProfiles);
			console.log(`  clientProfiles: ${profilesData.length} rows`, profilesData);
		}

		// Log what will be seeded (names only, for debug output)
		const tablesToSeedNames: string[] = [];
		if (permissionsEmpty) tablesToSeedNames.push('permissions');
		if (rolesEmpty) tablesToSeedNames.push('roles');
		if (usersEmpty) tablesToSeedNames.push('users');
		if (accountsEmpty) tablesToSeedNames.push('accounts');
		if (profilesEmpty) tablesToSeedNames.push('clientProfiles');

		if (tablesToSeedNames.length === 0) {
			console.log('[Seed] All tables have data - skipping seed');
			return;
		}

		console.log(`[Seed] Will seed: ${tablesToSeedNames.join(', ')}`);

		// Resolve admin credentials with environment-sensitive defaults
		const _isProd = getNodeEnv() === 'production';

		// Read seed config directly from process.env to avoid server-only issues in scripts
		const envAdminEmail = process.env.SEED_ADMIN_EMAIL;
		const envAdminPassword = process.env.SEED_ADMIN_PASSWORD;

		// Always use predefined defaults unless explicitly configured
		// This ensures consistent admin credentials across all environments (dev, build, production)
		const adminEmail = envAdminEmail || 'admin@demo.ever.works';
		const adminPassword = envAdminPassword || 'Passw0rd123!';

		// Warn if using defaults in production
		if (process.env.NODE_ENV === 'production' && (!envAdminEmail || !envAdminPassword)) {
			console.warn('');
			console.warn('⚠️  WARNING: Using default admin credentials in production!');
			console.warn('   Email: admin@demo.ever.works');
			console.warn('   Password: Passw0rd123!');
			console.warn('');
			console.warn('   Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD for secure credentials.');
			console.warn('');
		}

		const hashedPassword = await bcrypt.hash(adminPassword, 10);

		// Get all permissions
		const allPermissions = getAllPermissions();

		// Generate role IDs manually (roles table doesn't have $defaultFn)
		const roleAdminId = crypto.randomUUID();
		const roleClientId = crypto.randomUUID();

		// Generate user IDs manually (drizzle-seed doesn't use $defaultFn)
		const userAdminId = crypto.randomUUID();
		const userClient1Id = crypto.randomUUID();
		const userClient2Id = crypto.randomUUID();

		// Build schema object for drizzle-seed based on which tables are empty
		// NOTE: we intentionally exclude `accounts` here and seed it manually below to
		// avoid drizzle-seed `with` relation constraints.
		const schemaToSeed: {
			permissions?: typeof permissions;
			roles?: typeof roles;
			users?: typeof users;
		} = {};
		if (permissionsEmpty) schemaToSeed.permissions = permissions;
		if (rolesEmpty) schemaToSeed.roles = roles;
		if (usersEmpty) schemaToSeed.users = users;

		// NOTE: clientProfiles is seeded manually AFTER seed() to respect 1:1 unique constraint
		// Do NOT add clientProfiles to schemaToSeed - it causes duplicate key errors

		// Only call seed if there's something to seed
		if (Object.keys(schemaToSeed).length > 0) {
			// Use drizzle-seed refine API to provide PREDEFINED data via generator functions
			// Base options { count: 1 } just return a SeedPromise; real counts are per-table below
			await seed(db, schemaToSeed, { count: 1 }).refine((funcs) => ({
				// Permissions: 1 row per permission key from definitions
				...(permissionsEmpty && {
					permissions: {
						count: allPermissions.length,
						columns: {
							key: funcs.valuesFromArray({
								values: allPermissions,
								isUnique: true
							}),
							description: funcs.valuesFromArray({
								values: allPermissions.map((p) =>
									p
										.replace(':', ' ')
										.replace(/([a-z])([A-Z])/g, '$1 $2')
										.toLowerCase()
								),
								isUnique: true
							})
						}
					}
				}),

				// Roles: admin + client with fixed IDs/names
				...(rolesEmpty && {
					roles: {
						count: 2,
						columns: {
							id: funcs.valuesFromArray({
								values: [roleAdminId, roleClientId],
								isUnique: true
							}),
							name: funcs.valuesFromArray({
								values: ['admin', 'client'],
								isUnique: true
							}),
							description: funcs.valuesFromArray({
								values: ['Administrator', 'Client user'],
								isUnique: true
							}),
							isAdmin: funcs.valuesFromArray({
								values: [true, false]
							}),
							status: funcs.valuesFromArray({
								values: ['active', 'active']
							})
						}
					}
				}),

				// Users: 3 known emails, 2 with password
				...(usersEmpty && {
					users: {
						count: 3,
						columns: {
							id: funcs.valuesFromArray({
								values: [userAdminId, userClient1Id, userClient2Id],
								isUnique: true
							}),
							email: funcs.valuesFromArray({
								values: [adminEmail, 'client1@example.com', 'client2@example.com'],
								isUnique: true
							}),
							passwordHash: funcs.valuesFromArray({
								values: [hashedPassword, hashedPassword, undefined]
							})
						}
					}
				})
			}));

			console.log('[Seed] Completed seeding permissions, roles, users, and accounts with predefined data');
		}

		// Seed clientProfiles manually to ensure 1:1 mapping with users (unique constraint)
		// NOTE: we intentionally do NOT create a client_profile for the admin user
		// (adminEmail). Only client1 and client2 get profiles.
		if (profilesEmpty) {
			console.log('[Seed] Seeding clientProfiles manually...');

			// Look up the seeded client users by their known emails to avoid relying on implicit ordering
			const allUsersForProfiles = await db.select().from(users);
			const client1User = allUsersForProfiles.find((u) => u.email === 'client1@example.com');
			const client2User = allUsersForProfiles.find((u) => u.email === 'client2@example.com');

			if (client1User && client2User) {
				const profileValues = [
					{
						userId: client1User.id,
						email: 'client1@example.com',
						name: 'Client One'
					},
					{
						userId: client2User.id,
						email: 'client2@example.com',
						name: 'Client Two'
					}
				];

				await db.insert(clientProfiles).values(profileValues).onConflictDoNothing();
				console.log(`[Seed] Created ${profileValues.length} client profiles (excluding admin)`);
			} else {
				console.warn('[Seed] Skipping clientProfiles seeding - expected seed client users not found');
			}
		}

		// Seed accounts manually to avoid drizzle-seed relation constraints
		if (accountsEmpty) {
			console.log('[Seed] Seeding accounts manually...');

			// Fetch users by email to get stable IDs
			const allUsers = await db.select().from(users);
			const adminUser = allUsers.find((u) => u.email === adminEmail);
			const client1User = allUsers.find((u) => u.email === 'client1@example.com');
			const client2User = allUsers.find((u) => u.email === 'client2@example.com');

			if (adminUser && client1User && client2User) {
				const accountValues: NewAccount[] = [
					{
						userId: adminUser.id,
						type: 'email',
						provider: 'credentials',
						providerAccountId: adminEmail,
						email: adminEmail,
						passwordHash: hashedPassword
					},
					{
						userId: client1User.id,
						type: 'email',
						provider: 'credentials',
						providerAccountId: 'client1@example.com',
						email: 'client1@example.com',
						passwordHash: hashedPassword
					},
					{
						userId: client2User.id,
						type: 'oauth',
						provider: 'google',
						providerAccountId: 'google-oauth-123',
						email: null,
						passwordHash: null
					}
				];

				await db.insert(accounts).values(accountValues).onConflictDoNothing();
				console.log(`[Seed] Created ${accountValues.length} accounts`);
			} else {
				console.warn('[Seed] Skipping manual accounts seeding - expected seed users not found');
			}
		}

		// Optional: generate additional fake users, profiles, and accounts when users table is initially empty
		if (usersEmpty) {
			const fakeUserCount = parseInt(process.env.SEED_FAKE_USER_COUNT || '0', 10);

			if (!Number.isNaN(fakeUserCount) && fakeUserCount > 0) {
				const { faker } = await import('@faker-js/faker');

				console.log(`[Seed] Generating ${fakeUserCount} fake users with faker...`);

				const fakeUsersData = Array.from({ length: fakeUserCount }, () => {
					const email = faker.internet.email({ provider: 'demo.ever.works' });
					return {
						email,
						passwordHash: hashedPassword
					};
				});

				const insertedFakeUsers = await db.insert(users).values(fakeUsersData).returning();

				const fakeProfiles = insertedFakeUsers.map((user) => ({
					userId: user.id,
					email: user.email as string,
					name: faker.person.fullName()
				}));

				await db.insert(clientProfiles).values(fakeProfiles).onConflictDoNothing();

				const fakeAccounts: NewAccount[] = insertedFakeUsers.map((user) => ({
					userId: user.id,
					type: 'email',
					provider: 'credentials',
					providerAccountId: user.email as string,
					email: user.email as string,
					passwordHash: hashedPassword
				}));

				await db.insert(accounts).values(fakeAccounts).onConflictDoNothing();

				console.log(`[Seed] Added ${insertedFakeUsers.length} fake users (with profiles & accounts)`);
			}
		}

		// ============================================
		// MIGRATION: Fix auto-generated admin emails
		// One-time migration for existing deployments that have admin-*@auto.generated
		// ============================================
		const existingDemoAdmin = await db
			.select()
			.from(users)
			.where(eq(users.email, 'admin@demo.ever.works'))
			.limit(1);

		if (existingDemoAdmin.length === 0) {
			// No demo admin exists - check for auto-generated admin to migrate
			const autoGeneratedAdmin = await db
				.select()
				.from(users)
				.where(sql`email LIKE 'admin-%@auto.generated'`)
				.limit(1);

			if (autoGeneratedAdmin.length > 0) {
				console.log('[Seed] 🔄 Found auto-generated admin account, migrating to predefined credentials...');

				// Update the user's email and password
				await db
					.update(users)
					.set({
						email: 'admin@demo.ever.works',
						passwordHash: hashedPassword
					})
					.where(eq(users.id, autoGeneratedAdmin[0].id));

				// Update the associated account
				await db
					.update(accounts)
					.set({
						email: 'admin@demo.ever.works',
						providerAccountId: 'admin@demo.ever.works',
						passwordHash: hashedPassword
					})
					.where(eq(accounts.userId, autoGeneratedAdmin[0].id));

				console.log('[Seed] ✓ Migrated auto-generated admin to admin@demo.ever.works with default password');
			}
		}

		// ============================================
		// DEMO MODE: Seed additional tables
		// ============================================
		if (isDemo) {
			console.log('[Seed] 🎭 Demo mode: seeding additional tables...');

			// Import faker dynamically for demo mode
			const { faker } = await import('@faker-js/faker');

			// ============================================
			// Step 2: Payment/Subscription Tables
			// ============================================

			// Seed Payment Providers (Stripe & LemonSqueezy)
			const providersEmpty = await isTableEmpty('paymentProviders', paymentProviders);
			if (providersEmpty) {
				console.log('[Seed] 💳 Seeding payment providers...');

				const providerValues: NewPaymentProvider[] = [
					{
						name: PaymentProvider.STRIPE,
						isActive: true
					},
					{
						name: PaymentProvider.LEMONSQUEEZY,
						isActive: true
					}
				];

				await db.insert(paymentProviders).values(providerValues).onConflictDoNothing();
				console.log(`[Seed] ✓ Created ${providerValues.length} payment providers`);
			}

			// Get seeded providers
			const allProviders = await db.select().from(paymentProviders);
			const stripeProvider = allProviders.find((p) => p.name === PaymentProvider.STRIPE);
			const lemonSqueezyProvider = allProviders.find((p) => p.name === PaymentProvider.LEMONSQUEEZY);

			// Seed Payment Accounts (for users with paid plans)
			const paymentAccountsEmpty = await isTableEmpty('paymentAccounts', paymentAccounts);
			if (paymentAccountsEmpty && stripeProvider && lemonSqueezyProvider) {
				console.log('[Seed] 💳 Seeding payment accounts...');

				// Get all users for payment accounts
				const allUsersForPayment = await db.select().from(users);

				// Create payment accounts for 70% of users (mix of Stripe and LemonSqueezy)
				const usersWithPayment = allUsersForPayment.filter(() => faker.datatype.boolean(0.7));

				const paymentAccountValues: NewPaymentAccount[] = usersWithPayment.map((user) => {
					const useStripe = faker.datatype.boolean(0.7); // 70% Stripe, 30% LemonSqueezy
					const provider = useStripe ? stripeProvider : lemonSqueezyProvider;

					return {
						userId: user.id,
						providerId: provider.id,
						customerId: useStripe
							? `cus_${faker.string.alphanumeric(14).toUpperCase()}`
							: `cus_${faker.string.alphanumeric(32)}`,
						accountId: faker.datatype.boolean(0.5) ? faker.string.alphanumeric(16) : undefined,
						lastUsed: faker.datatype.boolean(0.8) ? faker.date.recent({ days: 30 }) : undefined
					};
				});

				await db.insert(paymentAccounts).values(paymentAccountValues).onConflictDoNothing();
				console.log(`[Seed] ✓ Created ${paymentAccountValues.length} payment accounts`);
			}

			// Seed Subscriptions
			const subscriptionsEmpty = await isTableEmpty('subscriptions', subscriptions);
			if (subscriptionsEmpty) {
				console.log('[Seed] 💳 Seeding subscriptions...');

				// Get all users for subscriptions
				const allUsersForSubscriptions = await db.select().from(users);

				// Create subscriptions for all users
				// Distribution: 60% free, 30% standard, 10% premium
				const subscriptionValues = allUsersForSubscriptions.map((user) => {
					const planRandom = faker.number.float({ min: 0, max: 1, fractionDigits: 2 });
					let plan: PaymentPlan;
					let status: string;
					let provider: string;

					if (planRandom < 0.6) {
						// 60% free plan
						plan = PaymentPlan.FREE;
						status = SubscriptionStatus.ACTIVE;
						provider = PaymentProvider.STRIPE; // Default provider for free
					} else if (planRandom < 0.9) {
						// 30% standard plan
						plan = PaymentPlan.STANDARD;
						// 80% active, 15% cancelled, 5% expired
						const statusRandom = faker.number.float({ min: 0, max: 1, fractionDigits: 2 });
						if (statusRandom < 0.8) status = SubscriptionStatus.ACTIVE;
						else if (statusRandom < 0.95) status = SubscriptionStatus.CANCELLED;
						else status = SubscriptionStatus.EXPIRED;
						provider = faker.datatype.boolean(0.7) ? PaymentProvider.STRIPE : PaymentProvider.LEMONSQUEEZY;
					} else {
						// 10% premium plan
						plan = PaymentPlan.PREMIUM;
						// 85% active, 10% cancelled, 5% paused
						const statusRandom = faker.number.float({ min: 0, max: 1, fractionDigits: 2 });
						if (statusRandom < 0.85) status = SubscriptionStatus.ACTIVE;
						else if (statusRandom < 0.95) status = SubscriptionStatus.CANCELLED;
						else status = SubscriptionStatus.PAUSED;
						provider = faker.datatype.boolean(0.7) ? PaymentProvider.STRIPE : PaymentProvider.LEMONSQUEEZY;
					}

					const startDate = faker.date.past({ years: 2 });
					const isActive = status === SubscriptionStatus.ACTIVE;

					return {
						userId: user.id,
						planId: plan,
						status,
						startDate,
						endDate: isActive ? undefined : faker.date.between({ from: startDate, to: new Date() }),
						paymentProvider: provider,
						subscriptionId:
							plan !== PaymentPlan.FREE
								? provider === PaymentProvider.STRIPE
									? `sub_${faker.string.alphanumeric(14).toUpperCase()}`
									: `sub_${faker.string.alphanumeric(32)}`
								: undefined,
						customerId:
							plan !== PaymentPlan.FREE
								? provider === PaymentProvider.STRIPE
									? `cus_${faker.string.alphanumeric(14).toUpperCase()}`
									: `cus_${faker.string.alphanumeric(32)}`
								: undefined,
						priceId:
							plan !== PaymentPlan.FREE
								? provider === PaymentProvider.STRIPE
									? `price_${faker.string.alphanumeric(14).toUpperCase()}`
									: `price_${faker.string.alphanumeric(32)}`
								: undefined,
						amountPaid: plan === PaymentPlan.FREE ? 0 : plan === PaymentPlan.STANDARD ? 1000 : 2000, // in cents
						currency: 'usd'
					};
				});

				const insertedSubscriptions = await db.insert(subscriptions).values(subscriptionValues).returning();
				console.log(`[Seed] ✓ Created ${insertedSubscriptions.length} subscriptions`);

				// Seed Subscription History
				const subscriptionHistoryEmpty = await isTableEmpty('subscriptionHistory', subscriptionHistory);
				if (subscriptionHistoryEmpty) {
					console.log('[Seed] 💳 Seeding subscription history...');

					// Create 1-3 history entries for each subscription
					const historyValues = insertedSubscriptions.flatMap((sub) => {
						const numEntries = faker.number.int({ min: 1, max: 3 });
						return Array.from({ length: numEntries }, (_, index) => ({
							subscriptionId: sub.id,
							action:
								index === 0
									? 'created'
									: faker.helpers.arrayElement([
											'upgraded',
											'downgraded',
											'renewed',
											'cancelled',
											'paused',
											'resumed'
										]),
							previousStatus:
								index === 0
									? undefined
									: faker.helpers.arrayElement([
											SubscriptionStatus.ACTIVE,
											SubscriptionStatus.PENDING
										]),
							newStatus:
								index === numEntries - 1
									? sub.status
									: faker.helpers.arrayElement([
											SubscriptionStatus.ACTIVE,
											SubscriptionStatus.CANCELLED
										]),
							previousPlan:
								index === 0
									? undefined
									: faker.helpers.arrayElement([PaymentPlan.FREE, PaymentPlan.STANDARD]),
							newPlan: sub.planId,
							reason: faker.helpers.arrayElement([
								undefined,
								'User requested',
								'Payment failed',
								'Trial ended',
								'Upgrade'
							]),
							metadata: faker.datatype.boolean(0.3)
								? JSON.stringify({ source: faker.helpers.arrayElement(['web', 'mobile', 'api']) })
								: undefined,
							createdAt: faker.date.between({ from: sub.startDate, to: new Date() })
						}));
					});

					await db.insert(subscriptionHistory).values(historyValues).onConflictDoNothing();
					console.log(`[Seed] ✓ Created ${historyValues.length} subscription history entries`);
				}
			}

			// ============================================
			// Step 3: Activity/Engagement Tables
			// ============================================

			// Sample item slugs for comments, votes, and favorites
			const sampleItemSlugs = [
				'toggl-track',
				'clockify',
				'harvest',
				'timely',
				'rescuetime',
				'everhour',
				'hubstaff',
				'timeneye',
				'timesheets',
				'trackingtime',
				'toggl-plan',
				'monday',
				'asana',
				'clickup',
				'notion'
			];

			// Seed Activity Logs
			const activityLogsEmpty = await isTableEmpty('activityLogs', activityLogs);
			if (activityLogsEmpty) {
				console.log('[Seed] 📊 Seeding activity logs...');

				// Get all users and client profiles
				const allUsersForActivity = await db.select().from(users);
				const allProfilesForActivity = await db.select().from(clientProfiles);

				const activityActions = [
					'SIGN_UP',
					'SIGN_IN',
					'SIGN_OUT',
					'UPDATE_PROFILE',
					'UPDATE_PASSWORD',
					'VERIFY_EMAIL',
					'RESET_PASSWORD',
					'ADD_COMMENT',
					'VOTE_ITEM',
					'ADD_FAVORITE',
					'REMOVE_FAVORITE',
					'UPDATE_SUBSCRIPTION',
					'SUBMIT_ITEM'
				];

				// Create 3-10 activity logs per user
				const activityLogValues = allUsersForActivity.flatMap((user) => {
					const numLogs = faker.number.int({ min: 3, max: 10 });
					const userProfile = allProfilesForActivity.find((p) => p.userId === user.id);

					return Array.from({ length: numLogs }, () => {
						const action = faker.helpers.arrayElement(activityActions);
						const useUserId = [
							'SIGN_UP',
							'SIGN_IN',
							'SIGN_OUT',
							'UPDATE_PASSWORD',
							'VERIFY_EMAIL',
							'RESET_PASSWORD'
						].includes(action);

						return {
							userId: useUserId ? user.id : undefined,
							clientId: !useUserId && userProfile ? userProfile.id : undefined,
							action,
							timestamp: faker.date.recent({ days: 90 }),
							ipAddress: faker.datatype.boolean(0.8) ? faker.internet.ipv4() : undefined
						};
					});
				});

				await db.insert(activityLogs).values(activityLogValues).onConflictDoNothing();
				console.log(`[Seed] ✓ Created ${activityLogValues.length} activity logs`);
			}

			// Seed Comments
			const commentsEmpty = await isTableEmpty('comments', comments);
			if (commentsEmpty) {
				console.log('[Seed] 💬 Seeding comments...');

				// Get all client profiles for comments
				const allProfilesForComments = await db.select().from(clientProfiles);

				// Create 0-5 comments per profile (not all users comment)
				const commentValues = allProfilesForComments.flatMap((profile) => {
					const shouldComment = faker.datatype.boolean(0.4); // 40% of users comment
					if (!shouldComment) return [];

					const numComments = faker.number.int({ min: 1, max: 5 });
					return Array.from({ length: numComments }, () => ({
						userId: profile.id,
						itemId: faker.helpers.arrayElement(sampleItemSlugs),
						content: faker.lorem.sentences(faker.number.int({ min: 1, max: 5 })),
						rating: faker.number.int({ min: 1, max: 5 }),
						createdAt: faker.date.recent({ days: 180 }),
						editedAt: faker.datatype.boolean(0.2) ? faker.date.recent({ days: 60 }) : undefined
					}));
				});

				if (commentValues.length > 0) {
					await db.insert(comments).values(commentValues).onConflictDoNothing();
					console.log(`[Seed] ✓ Created ${commentValues.length} comments`);
				}
			}

			// Seed Votes
			const votesEmpty = await isTableEmpty('votes', votes);
			if (votesEmpty) {
				console.log('[Seed] 👍 Seeding votes...');

				// Get all client profiles for votes
				const allProfilesForVotes = await db.select().from(clientProfiles);

				// Create 0-10 votes per profile (users vote on different items)
				const voteValues = allProfilesForVotes.flatMap((profile) => {
					const numVotes = faker.number.int({ min: 0, max: 10 });
					const votedItems = new Set<string>(); // Track to avoid duplicate votes on same item

					return Array.from({ length: numVotes }, () => {
						let itemId;
						do {
							itemId = faker.helpers.arrayElement(sampleItemSlugs);
						} while (votedItems.has(itemId) && votedItems.size < sampleItemSlugs.length);

						votedItems.add(itemId);

						return {
							userId: profile.id,
							itemId,
							voteType: faker.datatype.boolean(0.8) ? VoteType.UPVOTE : VoteType.DOWNVOTE, // 80% upvotes
							createdAt: faker.date.recent({ days: 180 })
						};
					}).filter((vote) => vote.itemId); // Filter out any undefined itemIds
				});

				if (voteValues.length > 0) {
					await db.insert(votes).values(voteValues).onConflictDoNothing();
					console.log(`[Seed] ✓ Created ${voteValues.length} votes`);
				}
			}

			// Seed Favorites
			const favoritesEmpty = await isTableEmpty('favorites', favorites);
			if (favoritesEmpty) {
				console.log('[Seed] ⭐ Seeding favorites...');

				// Get all users for favorites
				const allUsersForFavorites = await db.select().from(users);

				// Create 0-8 favorites per user
				const favoriteValues = allUsersForFavorites.flatMap((user) => {
					const numFavorites = faker.number.int({ min: 0, max: 8 });
					const favoritedItems = new Set<string>(); // Track to avoid duplicate favorites

					return Array.from({ length: numFavorites }, () => {
						let itemSlug;
						do {
							itemSlug = faker.helpers.arrayElement(sampleItemSlugs);
						} while (favoritedItems.has(itemSlug) && favoritedItems.size < sampleItemSlugs.length);

						favoritedItems.add(itemSlug);

						return {
							userId: user.id,
							itemSlug,
							itemName: itemSlug
								.split('-')
								.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
								.join(' '),
							itemIconUrl: `https://demo.ever.works/icons/${itemSlug}.png`,
							itemCategory: faker.helpers.arrayElement([
								'Time Tracking',
								'Project Management',
								'Productivity',
								'Analytics'
							]),
							createdAt: faker.date.recent({ days: 180 })
						};
					}).filter((fav) => fav.itemSlug); // Filter out any undefined slugs
				});

				if (favoriteValues.length > 0) {
					await db.insert(favorites).values(favoriteValues).onConflictDoNothing();
					console.log(`[Seed] ✓ Created ${favoriteValues.length} favorites`);
				}
			}

			// Seed Notifications
			const notificationsEmpty = await isTableEmpty('notifications', notifications);
			if (notificationsEmpty) {
				console.log('[Seed] 🔔 Seeding notifications...');

				// Get all users for notifications
				const allUsersForNotifications = await db.select().from(users);

				// Create 1-10 notifications per user
				const notificationTypes = [
					'item_submission',
					'comment_reported',
					'user_registered',
					'payment_failed',
					'system_alert'
				] as const;

				const notificationValues = allUsersForNotifications.flatMap((user) => {
					const numNotifications = faker.number.int({ min: 1, max: 10 });

					return Array.from({ length: numNotifications }, () => {
						const type = faker.helpers.arrayElement(notificationTypes);
						const isRead = faker.datatype.boolean(0.6); // 60% read
						const createdAt = faker.date.recent({ days: 90 });

						let title: string;
						let message: string;

						switch (type) {
							case 'item_submission':
								title = 'New Item Submitted';
								message = `A new time tracking tool "${faker.helpers.arrayElement(sampleItemSlugs)}" has been submitted for review.`;
								break;
							case 'comment_reported':
								title = 'Comment Reported';
								message = 'A comment has been reported by users and needs moderation.';
								break;
							case 'user_registered':
								title = 'Welcome!';
								message = 'Welcome to Ever Works! Start exploring time tracking tools.';
								break;
							case 'payment_failed':
								title = 'Payment Failed';
								message = 'Your recent payment failed. Please update your payment method.';
								break;
							case 'system_alert':
								title = 'System Maintenance';
								message =
									'Scheduled maintenance will occur on ' +
									faker.date.future({ years: 0.1 }).toLocaleDateString();
								break;
						}

						return {
							userId: user.id,
							type,
							title,
							message,
							data: faker.datatype.boolean(0.3)
								? JSON.stringify({ itemSlug: faker.helpers.arrayElement(sampleItemSlugs) })
								: undefined,
							isRead,
							readAt: isRead ? faker.date.between({ from: createdAt, to: new Date() }) : undefined,
							createdAt
						};
					});
				});

				await db.insert(notifications).values(notificationValues).onConflictDoNothing();
				console.log(`[Seed] ✓ Created ${notificationValues.length} notifications`);
			}

			// ============================================
			// Step 4: Auth/Session Tables
			// ============================================

			// Seed Sessions (active user sessions)
			const sessionsEmpty = await isTableEmpty('sessions', sessions);
			if (sessionsEmpty) {
				console.log('[Seed] 🔐 Seeding sessions...');

				// Get all users for sessions
				const allUsersForSessions = await db.select().from(users);

				// Create 0-2 sessions per user (30% of users have active sessions)
				const sessionValues = allUsersForSessions.flatMap((user) => {
					const shouldHaveSession = faker.datatype.boolean(0.3); // 30% have active sessions
					if (!shouldHaveSession) return [];

					const numSessions = faker.number.int({ min: 1, max: 2 }); // 1-2 active sessions
					return Array.from({ length: numSessions }, () => ({
						sessionToken: faker.string.alphanumeric(64),
						userId: user.id,
						expires: faker.date.future({ years: 0.1 }) // Expires within next ~1 month
					}));
				});

				if (sessionValues.length > 0) {
					await db.insert(sessions).values(sessionValues).onConflictDoNothing();
					console.log(`[Seed] ✓ Created ${sessionValues.length} sessions`);
				}
			}

			// Seed Authenticators (WebAuthn/passkey devices)
			const authenticatorsEmpty = await isTableEmpty('authenticators', authenticators);
			if (authenticatorsEmpty) {
				console.log('[Seed] 🔑 Seeding authenticators...');

				// Get all users for authenticators
				const allUsersForAuthenticators = await db.select().from(users);

				// Create 0-2 authenticators for 20% of users (not everyone uses WebAuthn)
				const authenticatorValues = allUsersForAuthenticators.flatMap((user) => {
					const shouldHaveAuthenticator = faker.datatype.boolean(0.2); // 20% use WebAuthn
					if (!shouldHaveAuthenticator) return [];

					const numAuthenticators = faker.number.int({ min: 1, max: 2 }); // 1-2 devices
					return Array.from({ length: numAuthenticators }, () => {
						const deviceTypes = ['platform', 'cross-platform'] as const;
						const deviceType = faker.helpers.arrayElement(deviceTypes);

						return {
							credentialID: faker.string.alphanumeric(32),
							userId: user.id,
							providerAccountId: `webauthn_${faker.string.alphanumeric(16)}`,
							credentialPublicKey: faker.string.alphanumeric(128),
							counter: faker.number.int({ min: 0, max: 100 }),
							credentialDeviceType: deviceType,
							credentialBackedUp: faker.datatype.boolean(0.7), // 70% backed up
							transports: faker.helpers.arrayElement([
								'usb',
								'nfc',
								'ble',
								'internal',
								'usb,nfc',
								'usb,ble',
								'internal'
							])
						};
					});
				});

				if (authenticatorValues.length > 0) {
					await db.insert(authenticators).values(authenticatorValues).onConflictDoNothing();
					console.log(`[Seed] ✓ Created ${authenticatorValues.length} authenticators`);
				}
			}

			// Seed Verification Tokens (for email verification)
			const verificationTokensEmpty = await isTableEmpty('verificationTokens', verificationTokens);
			if (verificationTokensEmpty) {
				console.log('[Seed] ✉️ Seeding verification tokens...');

				// Get all users for verification tokens
				const allUsersForVerification = await db.select().from(users);

				// Create verification tokens for 10% of users (recently registered or changed email)
				const verificationTokenValues = allUsersForVerification
					.filter((user) => user.email && faker.datatype.boolean(0.1)) // 10% have pending verification, must have email
					.map((user) => ({
						identifier: user.id,
						email: user.email as string,
						token: faker.string.alphanumeric(32),
						expires: faker.date.future({ years: 0.01 }) // Expires within ~3-4 days
					}));

				if (verificationTokenValues.length > 0) {
					await db.insert(verificationTokens).values(verificationTokenValues).onConflictDoNothing();
					console.log(`[Seed] ✓ Created ${verificationTokenValues.length} verification tokens`);
				}
			}

			// Seed Password Reset Tokens (for password reset requests)
			const passwordResetTokensEmpty = await isTableEmpty('passwordResetTokens', passwordResetTokens);
			if (passwordResetTokensEmpty) {
				console.log('[Seed] 🔒 Seeding password reset tokens...');

				// Get all users for password reset tokens
				const allUsersForPasswordReset = await db.select().from(users);

				// Create password reset tokens for 5% of users (recently requested password reset)
				const passwordResetTokenValues = allUsersForPasswordReset
					.filter((user) => user.email && faker.datatype.boolean(0.05)) // 5% have pending reset, must have email
					.map((user) => ({
						email: user.email as string,
						token: faker.string.alphanumeric(32),
						expires: faker.date.future({ years: 0.002 }) // Expires within ~18 hours
					}));

				if (passwordResetTokenValues.length > 0) {
					await db.insert(passwordResetTokens).values(passwordResetTokenValues).onConflictDoNothing();
					console.log(`[Seed] ✓ Created ${passwordResetTokenValues.length} password reset tokens`);
				}
			}

			console.log('[Seed] ✅ Demo mode seeding complete!');
		}

		// Seed junction tables separately (role_permissions, user_roles)
		// These need to be queried after seed() completes

		// Check if tables exist before seeding junction tables
		const hasRolePermissions = await tableExists('role_permissions');
		const hasUserRoles = await tableExists('user_roles');

		if (hasRolePermissions) {
			console.log('[Seed] Seeding role-permissions...');

			// Get admin role and all permissions
			const adminRoles = await db.select().from(roles).where(eq(roles.name, 'admin')).limit(1);
			const allPerms = await db.select().from(permissions);

			if (adminRoles.length > 0) {
				const adminRolePermissions = allPerms.map((perm) => ({
					roleId: adminRoles[0].id,
					permissionId: perm.id
				}));

				try {
					await db.insert(rolePermissions).values(adminRolePermissions).onConflictDoNothing();
					console.log(`[Seed] Assigned ${allPerms.length} permissions to admin role`);
				} catch (rpError) {
					// Ignore duplicate errors
					if (rpError && typeof rpError === 'object' && 'code' in rpError && rpError.code === '23505') {
						console.log('[Seed] Role-permissions already exist - skipping');
					} else {
						console.warn('[Seed] Error seeding role-permissions:', rpError);
					}
				}
			}
		}

		if (hasUserRoles) {
			console.log('[Seed] Seeding user-roles...');

			// Get specific seeded users and roles to avoid relying on implicit ordering
			const allUsersForRoles = await db.select().from(users);
			const adminUserForRoles = allUsersForRoles.find((u) => u.email === adminEmail);
			const client1UserForRoles = allUsersForRoles.find((u) => u.email === 'client1@example.com');
			const client2UserForRoles = allUsersForRoles.find((u) => u.email === 'client2@example.com');

			const adminRoles = await db.select().from(roles).where(eq(roles.name, 'admin')).limit(1);
			const clientRoles = await db.select().from(roles).where(eq(roles.name, 'client')).limit(1);

			if (
				adminUserForRoles &&
				client1UserForRoles &&
				client2UserForRoles &&
				adminRoles.length > 0 &&
				clientRoles.length > 0
			) {
				try {
					await db
						.insert(userRoles)
						.values([
							{ userId: adminUserForRoles.id, roleId: adminRoles[0].id }, // Admin user → admin role
							{ userId: client1UserForRoles.id, roleId: clientRoles[0].id }, // Client1 → client role
							{ userId: client2UserForRoles.id, roleId: clientRoles[0].id } // Client2 → client role
						])
						.onConflictDoNothing();

					console.log('[Seed] Assigned roles to seeded users');
				} catch (urError) {
					// Ignore duplicate errors
					if (urError && typeof urError === 'object' && 'code' in urError && urError.code === '23505') {
						console.log('[Seed] User-roles already exist - skipping');
					} else {
						console.warn('[Seed] Error seeding user-roles:', urError);
					}
				}
			} else {
				console.warn('[Seed] Skipping user-roles seeding - expected seed users or roles not found');
			}
		}

		// Basic verification counts (skip if tables don't exist yet)
		try {
			const [{ count: usersCount }] = await db.select({ count: sql<number>`count(*)` }).from(users);
			const [{ count: profilesCount }] = await db.select({ count: sql<number>`count(*)` }).from(clientProfiles);
			const [{ count: rolesCount }] = await db.select({ count: sql<number>`count(*)` }).from(roles);
			const [{ count: permsCount }] = await db.select({ count: sql<number>`count(*)` }).from(permissions);

			console.log('Seed complete:', {
				users: Number(usersCount),
				profiles: Number(profilesCount),
				roles: Number(rolesCount),
				permissions: Number(permsCount)
			});
		} catch {
			// Tables may not exist yet (schema not migrated) - skip verification but seeding succeeded
			console.log('Seed complete (verification skipped - tables may not exist yet)');
		}
	} catch (seedError) {
		// Re-throw the error - caller (initialize.ts) will handle status management
		throw seedError;
	}
}
