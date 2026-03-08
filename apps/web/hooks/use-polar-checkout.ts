import { apiUtils, serverClient } from '@/lib/api/server-api-client';
import { PaymentInterval } from '@/lib/constants';
import { PricingConfig } from '@/lib/content';
import { getQueryClient } from '@/lib/query-client';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState } from 'react';

interface User {
	id: string;
	email: string;
	name: string;
	image: string;
}

export interface PolarCheckoutSessionPayload {
	productId: string;
	mode: 'one_time' | 'subscription';
	successUrl: string;
	cancelUrl: string;
	metadata?: {
		planId?: string;
		planName?: string;
		billingInterval?: PaymentInterval;
		userId?: string;
	};
}

interface PolarCheckoutSessionResponse {
	id: string;
	url?: string;
}

export interface UsePolarCheckoutParams {
	embedded?: boolean;
	onSuccess?: (data: PolarCheckoutSessionResponse) => void;
}

interface PolarCheckoutSessionApiResponse {
	data: PolarCheckoutSessionResponse;
	status: number;
	message: string;
}

class PolarCheckoutSessionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PolarCheckoutSessionError';
	}
}

export const usePolarCheckout = (params?: UsePolarCheckoutParams) => {
	const router = useRouter();
	const { embedded = false } = params || {};
	const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

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
		mutationKey: ['create-polar-checkout-session'],
		mutationFn: async ({
			plan,
			user,
			billingInterval,
			productId
		}: {
			plan?: PricingConfig;
			user: User | null;
			billingInterval?: PaymentInterval;
			productId?: string;
		}): Promise<PolarCheckoutSessionResponse> => {
			if (!user) {
				// Throw error first to immediately reject the promise
				throw new PolarCheckoutSessionError(
					'Authentication required: User must be signed in to create a checkout session'
				);
			}

			// Use provided productId (required for Polar)
			// Note: Polar uses productId instead of priceId
			if (!productId) {
				throw new PolarCheckoutSessionError('Product ID is required for Polar checkout');
			}

			const payload: PolarCheckoutSessionPayload = {
				productId: productId, // productId is guaranteed to be defined here
				mode: 'subscription', // Default to subscription, can be changed
				successUrl: `${window.location.origin}/pricing/success?checkout_id={CHECKOUT_SESSION_ID}`,
				cancelUrl: `${window.location.origin}/pricing?cancelled=true`,
				metadata: {
					planId: plan?.id,
					planName: plan?.name,
					billingInterval: billingInterval || PaymentInterval.MONTHLY,
					userId: user.id
				}
			};

			const response = await serverClient.post<PolarCheckoutSessionApiResponse>('/api/polar/checkout', payload);

			if (!apiUtils.isSuccess(response)) {
				throw new PolarCheckoutSessionError(apiUtils.getErrorMessage(response));
			}

			const apiResponse = response.data;

			let sessionData: PolarCheckoutSessionResponse | null = null;

			if (apiResponse?.data) {
				sessionData = apiResponse.data;
			} else if ((apiResponse as any)?.id) {
				sessionData = apiResponse as unknown as PolarCheckoutSessionResponse;
			}

			if (process.env.NODE_ENV === 'development') {
				console.log('Polar Checkout API Response:', apiResponse);
				console.log('Extracted Session Data:', sessionData);
			}

			if (!sessionData?.id) {
				console.error('Missing session ID in Polar response:', {
					apiResponse,
					sessionData
				});
				throw new PolarCheckoutSessionError(
					`No session ID returned from server. Response: ${JSON.stringify(apiResponse, null, 2)}`
				);
			}

			if (sessionData.url) {
				if (embedded) {
					if (process.env.NODE_ENV === 'development') {
						console.log('Setting Polar checkout URL for embed:', sessionData.url);
					}
					setCheckoutUrl(sessionData.url);
				} else {
					if (process.env.NODE_ENV === 'development') {
						console.log('Redirecting to Polar checkout:', sessionData.url);
					}
					window.location.href = sessionData.url;
				}
			} else {
				throw new PolarCheckoutSessionError('No checkout URL returned from server');
			}

			return sessionData;
		},
		retry: (failureCount, error) => {
			if (error instanceof PolarCheckoutSessionError && error.message.includes('auth')) {
				return false;
			}
			return failureCount < 2;
		},
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
		onSuccess: async () => {
			try {
				await invalidateQueries();
				if (!embedded) {
					toast.success('Redirecting to checkout...');
				}
				if (params?.onSuccess && mutation.data) {
					params.onSuccess(mutation.data);
				}
			} catch (error) {
				console.warn('Failed to invalidate queries after Polar checkout success:', error);
			}
		},
		onError: (error) => {
			console.error('Polar checkout error:', error);
			const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';
			toast.error(errorMessage);

			// Redirect to signin if it's an authentication error
			if (error instanceof PolarCheckoutSessionError && errorMessage.includes('signed in')) {
				router.push('/auth/signin');
			}
		}
	});

	const createCheckoutSession = (
		productId: string,
		user: User | null,
		plan?: PricingConfig,
		billingInterval?: PaymentInterval
	) => {
		return mutation.mutateAsync({
			productId,
			user,
			plan,
			billingInterval
		});
	};

	const clearCheckout = () => {
		setCheckoutUrl(null);
		mutation.reset();
	};

	return {
		createCheckoutSession,
		isLoading: mutation.isPending,
		error: mutation.error?.message || null,
		isError: mutation.isError,
		isSuccess: mutation.isSuccess,
		reset: clearCheckout,
		data: mutation.data,
		checkoutUrl
	};
};
