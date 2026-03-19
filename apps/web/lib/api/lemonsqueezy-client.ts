import { serverClient } from './server-api-client';
import { CreateCheckoutRequest, CreateCheckoutResponse } from '@/app/api/lemonsqueezy';

export interface LemonSqueezyCheckoutParams extends CreateCheckoutRequest {
	source?: string;
	timestamp?: string;
	dark?: boolean;
}

export interface LemonSqueezyCheckoutResult {
	checkoutUrl: string;
	email: string;
	customPrice?: number;
	variantId?: number;
	metadata?: Record<string, any>;
}

export class LemonSqueezyClient {
	async createCheckout(params: LemonSqueezyCheckoutParams): Promise<LemonSqueezyCheckoutResult> {
		const endpoint = '/api/lemonsqueezy/checkout';

		const enrichedParams = {
			...params,
			metadata: {
				...params.metadata,
				source: params.source || 'client',
				timestamp: params.timestamp || new Date().toISOString()
			}
		};

		const response = await serverClient.post<CreateCheckoutResponse>(endpoint, enrichedParams, {
			timeout: 15000,
			retries: 2,
			credentials: 'include' // Ensure cookies are sent for authentication
		});

		if (!response.success || !response.data) {
			throw new Error(response.error || 'Failed to create checkout session');
		}

		if (!response.data.success) {
			throw new Error(response.data.message || 'Checkout creation failed');
		}

		return {
			checkoutUrl: response.data.data.checkoutUrl,
			email: response.data.data.email,
			customPrice: response.data.data.customPrice,
			variantId: response.data.data.variantId,
			metadata: response.data.data.metadata
		};
	}

	async healthCheck(): Promise<{ status: 'ok' | 'error'; message: string }> {
		try {
			const response = await serverClient.get('/api/lemonsqueezy/checkout');

			if (response.success) {
				return { status: 'ok', message: 'LemonSqueezy API is healthy' };
			} else {
				return { status: 'error', message: response.error || 'Health check failed' };
			}
		} catch (error) {
			return {
				status: 'error',
				message: error instanceof Error ? error.message : 'Health check failed'
			};
		}
	}

	validateCheckoutParams(params: LemonSqueezyCheckoutParams): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (params.customPrice !== undefined) {
			if (params.customPrice < 0) {
				errors.push('Custom price must be non-negative');
			}
			if (!Number.isInteger(params.customPrice)) {
				errors.push('Custom price must be an integer');
			}
		}

		if (params.variantId !== undefined) {
			if (params.variantId <= 0) {
				errors.push('Variant ID must be positive');
			}
		}

		if (params.metadata && typeof params.metadata !== 'object') {
			errors.push('Metadata must be an object');
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}
}

export const lemonsqueezyClient = new LemonSqueezyClient();
