import Stripe from 'stripe';

/**
 * Helper function to get user's Stripe customer ID
 * Uses Stripe's search API with fallback to list and filter
 */
export async function getUserStripeCustomerId(userId: string, stripe: Stripe): Promise<string | null> {
	try {
		// Replace with your actual database query for better performance
		// const user = await db.user.findUnique({
		//   where: { id: userId },
		//   select: { stripeCustomerId: true }
		// });
		// return user?.stripeCustomerId || null;

		// Use Stripe's search API to find customer by metadata
		try {
			const searchResults = await stripe.customers.search({
				query: `metadata['userId']:'${userId}'`,
				limit: 1
			});

			return searchResults.data.length > 0 ? searchResults.data[0].id : null;
		} catch (searchError) {
			// Fallback: list all customers and filter (less efficient but works)
			console.warn('Search API failed, falling back to list and filter:', searchError);

			const customers = await stripe.customers.list({
				limit: 100 // Adjust based on your needs
			});

			const matchingCustomer = customers.data.find((customer) => customer.metadata?.userId === userId);

			return matchingCustomer ? matchingCustomer.id : null;
		}
	} catch (error) {
		console.error('Error fetching user Stripe customer ID:', error);
		return null;
	}
}

/**
 * Helper function to save user's Stripe customer ID to database
 */
export async function saveUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
	try {
		// Replace with your actual database update
		// await db.user.update({
		//   where: { id: userId },
		//   data: { stripeCustomerId }
		// });

		console.log(`Mock: Saving Stripe customer ID ${stripeCustomerId} for user ${userId}`);
	} catch (error) {
		console.error('Error saving user Stripe customer ID:', error);
		throw error;
	}
}

/**
 * Helper function to verify payment method ownership
 */
export async function verifyPaymentMethodOwnership(
	paymentMethodId: string,
	userId: string,
	stripe: Stripe
): Promise<{ isOwner: boolean; customer?: Stripe.Customer; paymentMethod?: Stripe.PaymentMethod }> {
	try {
		// Get the payment method
		const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

		if (!paymentMethod.customer) {
			return { isOwner: false };
		}

		// Get the customer
		const customer = await stripe.customers.retrieve(paymentMethod.customer as string);

		if (typeof customer === 'string' || customer.deleted) {
			return { isOwner: false };
		}

		// Check if this customer belongs to the current user
		const isOwner = customer.metadata?.userId === userId;

		return {
			isOwner,
			customer: isOwner ? customer : undefined,
			paymentMethod: isOwner ? paymentMethod : undefined
		};
	} catch (error) {
		console.error('Error verifying payment method ownership:', error);
		return { isOwner: false };
	}
}

/**
 * Helper function to format payment method for API response
 */
export function formatPaymentMethodResponse(paymentMethod: Stripe.PaymentMethod, isDefault = false) {
	return {
		id: paymentMethod.id,
		type: paymentMethod.type,
		card: paymentMethod.card
			? {
					brand: paymentMethod.card.brand,
					last4: paymentMethod.card.last4,
					exp_month: paymentMethod.card.exp_month,
					exp_year: paymentMethod.card.exp_year,
					funding: paymentMethod.card.funding,
					country: paymentMethod.card.country,
					fingerprint: paymentMethod.card.fingerprint
				}
			: null,
		billing_details: paymentMethod.billing_details,
		created: paymentMethod.created,
		metadata: paymentMethod.metadata,
		is_default: isDefault
	};
}

/**
 * Helper function to handle default payment method reassignment
 */
export async function handleDefaultPaymentMethodDeletion(
	customerId: string,
	deletedPaymentMethodId: string,
	stripe: Stripe
): Promise<{ newDefaultId: string | null; affectedSubscriptions: number }> {
	try {
		// Get other payment methods
		const otherPaymentMethods = await stripe.paymentMethods.list({
			customer: customerId,
			type: 'card'
		});

		const remainingMethods = otherPaymentMethods.data.filter((pm) => pm.id !== deletedPaymentMethodId);

		let newDefaultId: string | null = null;

		if (remainingMethods.length > 0) {
			// Set the first remaining method as default
			newDefaultId = remainingMethods[0].id;
			await stripe.customers.update(customerId, {
				invoice_settings: {
					default_payment_method: newDefaultId
				}
			});
		} else {
			// Remove default payment method if no other methods exist
			await stripe.customers.update(customerId, {
				invoice_settings: {
					default_payment_method: undefined
				}
			});
		}

		// Check for affected subscriptions
		const subscriptions = await stripe.subscriptions.list({
			customer: customerId,
			status: 'active'
		});

		const affectedSubscriptions = subscriptions.data.filter(
			(sub) => sub.default_payment_method === deletedPaymentMethodId
		).length;

		return { newDefaultId, affectedSubscriptions };
	} catch (error) {
		console.error('Error handling default payment method deletion:', error);
		throw error;
	}
}

/**
 * Helper function to create standard API error response
 */
export function createErrorResponse(
	error: unknown,
	defaultMessage = 'An error occurred'
): { success: false; error: string; status: number } {
	if (error instanceof Stripe.errors.StripeError) {
		let status = 400;

		switch (error.code) {
			case 'resource_missing':
				status = 404;
				break;
			case 'authentication_required':
				status = 401;
				break;
			case 'rate_limit':
				status = 429;
				break;
		}

		return {
			success: false,
			error: error.message,
			status
		};
	}

	return {
		success: false,
		error: defaultMessage,
		status: 500
	};
}
