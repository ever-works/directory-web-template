'use client';
import { apiUtils, serverClient } from '@/lib/api/server-api-client';
import { PaymentInterval, PaymentPlan } from '@/lib/constants';
import { PricingConfig, PricingPlans } from '@/lib/content';
import { getQueryClient } from '@/lib/query-client';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCurrencyContext } from '@/components/context/currency-provider';
import { getStripePriceConfig } from '@/lib/config/billing/stripe.config';

export interface SubscriptionFormProps {
	selectedPlan?: PricingPlans;
	onSuccess?: (subscriptionId: string) => void;
	onError?: (error: Error) => void;
}

export const isStripeConfigured = !!(
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
	process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID &&
	process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID
);

interface User {
	id: string;
	email: string;
	name: string;
	image: string;
}

export interface CheckoutSessionPayload {
	priceId: string;
	mode: 'subscription';
	trialPeriodDays: number;
	billingInterval: PaymentInterval;
	successUrl: string;
	cancelUrl: string;
	customerId: string;
	trialAmountId?: string;
	isAuthorizedTrialAmount?: boolean;
	metadata: {
		planId: string;
		planName: string;
		billingInterval: PaymentInterval;
		userId: string;
		email?: string;
		trialAmount?: number;
	};
}

interface CheckoutSessionResponse {
	id: string;
	url?: string;
}

interface CheckoutSessionApiResponse {
	data: CheckoutSessionResponse;
	status: number;
	message: string;
	isError?: string;
}

class CheckoutSessionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CheckoutSessionError';
	}
}

/**
 * Validates and maps plan.id to a valid plan name for billing configs
 * @param planId - The plan ID to validate
 * @returns The validated plan name ('free' | 'standard' | 'premium')
 * @throws CheckoutSessionError if planId is not a valid PaymentPlan
 */
function validateAndMapPlanName(planId: string): 'free' | 'standard' | 'premium' {
	const validPlans: Record<string, 'free' | 'standard' | 'premium'> = {
		[PaymentPlan.FREE]: 'free',
		[PaymentPlan.STANDARD]: 'standard',
		[PaymentPlan.PREMIUM]: 'premium'
	};

	const planName = validPlans[planId];
	if (!planName) {
		throw new CheckoutSessionError(
			`Invalid plan ID: "${planId}". Expected one of: ${Object.values(PaymentPlan).join(', ')}`
		);
	}

	return planName;
}

export const useCreateCheckoutSession = () => {
	const router = useRouter();
	const { currency } = useCurrencyContext();

	const invalidateQueries = async () => {
		const queryClient = getQueryClient();
		await queryClient.invalidateQueries({
			queryKey: ['subscriptions']
		});
		await queryClient.invalidateQueries({
			queryKey: ['user-subscription']
		});
	};

	const mutation = useMutation({
		mutationKey: ['create-checkout-session'],
		mutationFn: async ({
			plan,
			user,
			billingInterval
		}: {
			plan: PricingConfig;
			user: User | null;
			billingInterval: PaymentInterval;
		}): Promise<string> => {
			if (!user) {
				// Throw error first to immediately reject the promise
				throw new CheckoutSessionError(
					'Authentication required: User must be signed in to create a checkout session'
				);
			}

			// Get currency-aware price ID using multi-currency configs
			// Map plan.id to plan name for billing configs with explicit validation
			const planName = validateAndMapPlanName(plan.id);
			const interval = billingInterval === PaymentInterval.YEARLY ? 'yearly' : 'monthly';

			// Try to get currency-aware price ID
			const currencyPriceConfig = getStripePriceConfig(planName, currency, interval);

			// Use currency-aware price ID if available, otherwise fallback to plan's price ID
			let priceId: string | undefined;
			let trialAmountId: string | undefined;

			if (currencyPriceConfig?.priceId) {
				priceId = currencyPriceConfig.priceId;
				// Use currency-aware setup fee (trial amount) to avoid currency mismatch
				trialAmountId = currencyPriceConfig.setupFeeId;
			} else {
				// Fallback to plan's configured price ID
				priceId = billingInterval === PaymentInterval.YEARLY ? plan.annualPriceId : plan.stripePriceId;
				trialAmountId = plan.trialAmountId;
			}

			if (!priceId) {
				throw new CheckoutSessionError('Invalid price ID');
			}

			const payload: CheckoutSessionPayload = {
				priceId,
				mode: 'subscription',
				trialPeriodDays: plan.trialPeriodDays || 0,
				billingInterval,
				successUrl: `${window.location.origin}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
				cancelUrl: `${window.location.origin}/pricing?cancelled=true`,
				customerId: user.id,
				trialAmountId,
				isAuthorizedTrialAmount: plan.isAuthorizedTrialAmount,
				metadata: {
					planId: plan.id,
					planName: plan.name,
					billingInterval,
					userId: user.id,
					trialAmount: plan.trialAmount
				}
			};

			const response = await serverClient.post<CheckoutSessionApiResponse>('/api/stripe/checkout', payload);

			if (!apiUtils.isSuccess(response)) {
				throw new CheckoutSessionError(apiUtils.getErrorMessage(response));
			}

			// The API returns { data: { id, url }, status, message }
			// server-api-client wraps this in ApiResponse<T>, so response.data contains the full API response
			const apiResponse = response.data;

			let sessionData: CheckoutSessionResponse | null = null;

			if (apiResponse?.data) {
				// Standard API response: { data: { id, url }, status, message }
				sessionData = apiResponse.data;
			} else if ((apiResponse as any)?.id) {
				// Direct response: { id, url } - fallback case
				sessionData = apiResponse as unknown as CheckoutSessionResponse;
			}

			// Debug logging for troubleshooting (only in development)
			if (process.env.NODE_ENV === 'development') {
				console.log('Full API Response:', apiResponse);
				console.log('Extracted Session Data:', sessionData);
			}

			if (!sessionData?.id) {
				console.error('Missing session ID in response:', {
					apiResponse,
					sessionData,
					responseType: typeof apiResponse,
					responseKeys: apiResponse ? Object.keys(apiResponse) : 'no apiResponse'
				});
				throw new CheckoutSessionError(
					`No session ID returned from server. Response structure: ${JSON.stringify(apiResponse, null, 2)}`
				);
			}

			if (sessionData.url) {
				if (process.env.NODE_ENV === 'development') {
					console.log('Redirecting to Stripe checkout:', sessionData.url);
				}
				window.location.href = sessionData.url;
			}

			return sessionData.id;
		},
		retry: (failureCount, error) => {
			if (error instanceof CheckoutSessionError && error.message.includes('auth')) {
				return false;
			}
			return failureCount < 2;
		},
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
		onSuccess: async () => {
			try {
				await invalidateQueries();
			} catch (error) {
				console.warn('Failed to invalidate queries after checkout success:', error);
			}
		}
	});

	const createCheckoutSession = (plan: PricingConfig, user: User | null, billingInterval: PaymentInterval) => {
		return mutation.mutateAsync(
			{ plan, user, billingInterval },
			{
				onSuccess: (data) => {
					console.log('Checkout session created:', data);
				},
				onError: (error) => {
					console.error('Failed to create checkout session:', error);
					const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';

					// Redirect to signin if it's an authentication error
					if (error instanceof CheckoutSessionError && errorMessage.includes('signed in')) {
						router.push('/auth/signin');
					}
				}
			}
		);
	};

	return {
		createCheckoutSession,
		isLoading: mutation.isPending,
		error: mutation.error?.message || null,
		isError: mutation.isError,
		isSuccess: mutation.isSuccess,
		reset: mutation.reset,
		data: mutation.data,
		isPaused: mutation.isPaused,
		failureCount: mutation.failureCount,
		failureReason: mutation.failureReason,
		canRetry: mutation.failureCount < 2
	};
};

export const useCheckoutSessionCache = () => {
	const invalidateCheckoutCache = async () => {
		const queryClient = getQueryClient();

		await queryClient.invalidateQueries({
			queryKey: ['create-checkout-session']
		});
		await queryClient.invalidateQueries({
			queryKey: ['checkout-session']
		});
	};

	const clearCheckoutCache = async () => {
		const queryClient = getQueryClient();
		queryClient.removeQueries({
			queryKey: ['create-checkout-session']
		});
	};

	return {
		invalidateCheckoutCache,
		clearCheckoutCache
	};
};
