import { and, eq } from 'drizzle-orm';
import { db } from '../drizzle';
import {
	paymentProviders,
	paymentAccounts,
	users,
	type OldPaymentProvider,
	type NewPaymentProvider,
	type PaymentAccount,
	type NewPaymentAccount
} from '../schema';

// ===================== Payment Provider Queries =====================

/**
 * Get payment provider by ID
 * @param id - Provider ID
 * @returns Payment provider or null if not found
 */
export async function getPaymentProvider(id: string): Promise<OldPaymentProvider | null> {
	const result = await db.select().from(paymentProviders).where(eq(paymentProviders.id, id)).limit(1);

	return result[0] || null;
}

/**
 * Get payment provider by name
 * @param name - Provider name (e.g., 'stripe', 'lemonsqueezy')
 * @returns Payment provider or null if not found
 */
export async function getPaymentProviderByName(name: string): Promise<OldPaymentProvider | null> {
	const result = await db.select().from(paymentProviders).where(eq(paymentProviders.name, name)).limit(1);

	return result[0] || null;
}

/**
 * Get all active payment providers
 * @returns Array of active payment providers ordered by name
 */
export async function getActivePaymentProviders(): Promise<OldPaymentProvider[]> {
	const result = await db
		.select()
		.from(paymentProviders)
		.where(eq(paymentProviders.isActive, true))
		.orderBy(paymentProviders.name);

	return result;
}

/**
 * Create a new payment provider
 * @param data - Payment provider data
 * @returns Created payment provider
 */
export async function createPaymentProvider(data: NewPaymentProvider): Promise<OldPaymentProvider> {
	const result = await db.insert(paymentProviders).values(data).returning();

	return result[0];
}

/**
 * Update payment provider
 * @param id - Provider ID
 * @param data - Partial payment provider data to update
 * @returns Updated payment provider or null if not found
 */
export async function updatePaymentProvider(
	id: string,
	data: Partial<NewPaymentProvider>
): Promise<OldPaymentProvider | null> {
	const result = await db.update(paymentProviders).set(data).where(eq(paymentProviders.id, id)).returning();

	return result[0] || null;
}

/**
 * Deactivate payment provider
 * @param id - Provider ID
 * @returns Deactivated payment provider or null if not found
 */
export async function deactivatePaymentProvider(id: string): Promise<OldPaymentProvider | null> {
	const result = await db
		.update(paymentProviders)
		.set({ isActive: false })
		.where(eq(paymentProviders.id, id))
		.returning();

	if (result.length === 0) {
		console.warn(`No payment provider found with ID ${id} to deactivate`);
		return null;
	}

	return result[0];
}

// ===================== Payment Account Queries =====================

/**
 * Get payment account by user ID and provider ID
 * @param userId - User ID
 * @param providerId - Payment provider ID
 * @returns Payment account with active provider or null if not found
 */
export async function getPaymentAccountByUserId(
	userId: string,
	providerId: string,
	tenantId: string
): Promise<PaymentAccount | null> {
	const result = await db
		.select({
			id: paymentAccounts.id,
			tenantId: paymentAccounts.tenantId,
			userId: paymentAccounts.userId,
			providerId: paymentAccounts.providerId,
			customerId: paymentAccounts.customerId,
			accountId: paymentAccounts.accountId,
			createdAt: paymentAccounts.createdAt,
			updatedAt: paymentAccounts.updatedAt,
			lastUsed: paymentAccounts.lastUsed
		})
		.from(paymentAccounts)
		.innerJoin(paymentProviders, eq(paymentAccounts.providerId, paymentProviders.id))
		.innerJoin(users, eq(paymentAccounts.userId, users.id))
		.where(
			and(
				eq(paymentAccounts.userId, userId),
				eq(paymentAccounts.providerId, providerId),
				eq(paymentProviders.isActive, true),
				eq(paymentAccounts.tenantId, tenantId)
			)
		)
		.limit(1);

	return result[0] || null;
}

/**
 * Get payment account by customer ID and provider ID
 * @param customerId - Customer ID from payment provider
 * @param providerId - Payment provider ID
 * @returns Payment account or null if not found
 */
export async function getPaymentAccountByCustomerId(
	customerId: string,
	providerId: string,
	tenantId: string
): Promise<PaymentAccount | null> {
	const result = await db
		.select()
		.from(paymentAccounts)
		.where(
			and(
				eq(paymentAccounts.customerId, customerId),
				eq(paymentAccounts.providerId, providerId),
				eq(paymentAccounts.tenantId, tenantId)
			)
		)
		.limit(1);

	return result[0] || null;
}

/**
 * Create a new payment account
 * @param data - Payment account data
 * @returns Created payment account
 */
export async function createPaymentAccount(data: NewPaymentAccount): Promise<PaymentAccount> {
	const result = await db
		.insert(paymentAccounts)
		.values({
			...data,
			lastUsed: new Date()
		})
		.returning();

	return result[0];
}

/**
 * Update payment account last used timestamp
 * @param accountId - Payment account ID
 */
export async function updatePaymentAccountLastUsed(accountId: string, tenantId: string): Promise<void> {
	await db
		.update(paymentAccounts)
		.set({ lastUsed: new Date() })
		.where(and(eq(paymentAccounts.id, accountId), eq(paymentAccounts.tenantId, tenantId)));
}

/**
 * Get user payment account by provider name
 * @param userId - User ID
 * @param providerName - Provider name (e.g., 'stripe', 'lemonsqueezy')
 * @returns Payment account or null if not found
 */
export async function getUserPaymentAccountByProvider(
	userId: string,
	providerName: string,
	tenantId: string
): Promise<PaymentAccount | null> {
	try {
		// Get the provider
		const provider = await getPaymentProviderByName(providerName);
		if (!provider) {
			return null; // Provider does not exist
		}

		// Get the PaymentAccount for this user and provider
		const paymentAccount = await getPaymentAccountByUserId(userId, provider.id, tenantId);

		return paymentAccount;
	} catch (error) {
		console.error(`Error checking PaymentAccount:`, error);
		return null;
	}
}

// ===================== Payment Account Management =====================

/**
 * Ensure payment account exists for user and provider
 * Creates provider and account if they don't exist, updates lastUsed if they do
 * @param providerName - Name of the provider (e.g., 'stripe', 'lemonsqueezy')
 * @param userId - User ID
 * @param customerId - Customer ID at the provider
 * @param accountId - Account ID at the provider (optional)
 * @returns Payment account with complete data
 */
export async function ensurePaymentAccount(
	providerName: string,
	userId: string,
	customerId: string,
	tenantId: string,
	accountId?: string
): Promise<PaymentAccount> {
	try {
		// 1. Check if the provider exists, if not create it
		let provider = await getPaymentProviderByName(providerName);

		if (!provider) {
			console.log(`Provider ${providerName} does not exist, creating...`);

			const newProviderData: NewPaymentProvider = {
				name: providerName,
				isActive: true
			};

			provider = await createPaymentProvider(newProviderData);
			console.log(`Provider ${providerName} created with ID: ${provider.id}`);
		} else {
			console.log(`Provider ${providerName} found with ID: ${provider.id}`);
		}

		// 2. Check if PaymentAccount already exists for this user and provider
		const paymentAccount = await getPaymentAccountByUserId(userId, provider.id, tenantId);

		if (paymentAccount) {
			console.log(`Existing PaymentAccount found for user ${userId} and provider ${providerName}`);

			// Update lastUsed and return existing account
			await updatePaymentAccountLastUsed(paymentAccount.id, tenantId);
			return paymentAccount;
		}

		// 3. Create a new PaymentAccount
		console.log(`Creating a new PaymentAccount for user ${userId} and provider ${providerName}`);

		const newPaymentAccountData: NewPaymentAccount = {
			userId,
			providerId: provider.id,
			customerId,
			accountId: accountId || null,
			tenantId
		};

		const createdAccount = await createPaymentAccount(newPaymentAccountData);
		console.log(`PaymentAccount created with ID: ${createdAccount.id}`);

		return createdAccount;
	} catch (error) {
		console.error(`Error during PaymentAccount creation/validation:`, error);
		throw new Error(
			`Unable to create/validate PaymentAccount: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * Get or create a payment account with automatic provider management
 * Alias for ensurePaymentAccount
 * @param providerName - Name of the provider
 * @param userId - User ID
 * @param customerId - Customer ID at the provider
 * @param accountId - Account ID at the provider (optional)
 * @returns Payment account with complete data
 */
export async function getOrCreatePaymentAccount(
	providerName: string,
	userId: string,
	customerId: string,
	tenantId: string,
	accountId?: string
): Promise<PaymentAccount> {
	return ensurePaymentAccount(providerName, userId, customerId, tenantId, accountId);
}

/**
 * Setup user payment account with enhanced error handling and update logic
 * @param providerName - Name of the provider
 * @param userId - User ID
 * @param customerId - Customer ID at the provider
 * @param accountId - Account ID at the provider (optional)
 * @returns Payment account with complete data
 */
export async function setupUserPaymentAccount(
	providerName: string,
	userId: string,
	customerId: string,
	tenantId: string,
	accountId?: string
): Promise<PaymentAccount> {
	try {
		let provider = await getPaymentProviderByName(providerName);
		if (!provider) {
			const newProviderData: NewPaymentProvider = {
				name: providerName,
				isActive: true
			};

			provider = await createPaymentProvider(newProviderData);
			console.log(`✅ Provider ${providerName} created with ID: ${provider.id}`);
		} else {
			console.log(`✅ Provider ${providerName} found with ID: ${provider.id}`);
		}

		// Check if payment account already exists for this user and provider
		const existingAccount = await getUserPaymentAccountByProvider(userId, providerName, tenantId);

		if (existingAccount) {
			console.log(`✅ Payment account already exists for user ${userId} and provider ${providerName}`);
			// Update the existing account with new customerId if different
			if (existingAccount.customerId !== customerId) {
				console.log(`🔄 Updating customer ID from ${existingAccount.customerId} to ${customerId}`);
				// Update the payment account directly in the database
				await db
					.update(paymentAccounts)
					.set({
						customerId,
						accountId: accountId || existingAccount.accountId,
						lastUsed: new Date(),
						updatedAt: new Date()
					})
					.where(and(eq(paymentAccounts.id, existingAccount.id), eq(paymentAccounts.tenantId, tenantId)));

				return (await getUserPaymentAccountByProvider(userId, providerName, tenantId)) as PaymentAccount;
			}
			// Update last used timestamp
			await updatePaymentAccountLastUsed(existingAccount.id, tenantId);
			return existingAccount;
		}

		// Create new payment account
		const newPaymentAccountData: NewPaymentAccount = {
			userId,
			providerId: provider.id,
			customerId,
			accountId: accountId || null,
			tenantId
		};

		console.log(`🆕 Creating new payment account for user ${userId} and provider ${providerName}`);
		const createdAccount = await createPaymentAccount(newPaymentAccountData);
		return createdAccount;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		const fullError = `Unable to configure PaymentAccount for ${providerName} - ${errorMessage}`;

		console.error(`💥 Error details:`, {
			providerName,
			userId,
			customerId,
			accountId,
			error: errorMessage,
			stack: error instanceof Error ? error.stack : undefined
		});

		throw new Error(fullError);
	}
}

/**
 * Create or get payment account
 * Alias for setupUserPaymentAccount
 * @param providerName - Name of the provider
 * @param userId - User ID
 * @param customerId - Customer ID at the provider
 * @param accountId - Account ID at the provider (optional)
 * @returns Payment account with complete data
 */
export async function createOrGetPaymentAccount(
	providerName: string,
	userId: string,
	customerId: string,
	tenantId: string,
	accountId?: string
): Promise<PaymentAccount> {
	return setupUserPaymentAccount(providerName, userId, customerId, tenantId, accountId);
}
