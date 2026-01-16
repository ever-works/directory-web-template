import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { lemonsqueezyClient, LemonSqueezyCheckoutParams } from '@/lib/api/lemonsqueezy-client';
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';
import { toast } from 'sonner';

declare global {
	interface Window {
		LemonSqueezy?: {
			Checkout?: {
				open?: (opts: { checkoutUrl: string }) => void;
			};
			Setup?: (opts: { eventHandler: (event: any) => void }) => void;
		};
		createLemonSqueezyAffiliate?: any;
	}
}

export const lemonsqueezyKeys = {
	all: ['lemonsqueezy'] as const,
	health: () => [...lemonsqueezyKeys.all, 'health'] as const,
	variants: () => [...lemonsqueezyKeys.all, 'variants'] as const,
	checkout: () => [...lemonsqueezyKeys.all, 'checkout'] as const
} as const;

export function useLemonSqueezyHealth() {
	return useQuery({
		queryKey: lemonsqueezyKeys.health(),
		queryFn: () => lemonsqueezyClient.healthCheck(),
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 2,
		retryDelay: 1000
	});
}

export function useCreateLemonSqueezyCheckout() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (params: LemonSqueezyCheckoutParams) => lemonsqueezyClient.createCheckout(params),

		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({
				queryKey: lemonsqueezyKeys.checkout()
			});

			queryClient.setQueryData(lemonsqueezyKeys.checkout(), { ...data });

			console.log('✅ Checkout created successfully:', data);
		},

		onError: (error, variables) => {
			console.error('❌ Checkout creation failed:', error);
		}
	});
}

export interface UseLemonSqueezyEmbeddedCheckoutParams {
	onSuccess?: (event: any) => void;
	onClose?: () => void;
}

export function useLemonSqueezyEmbeddedCheckout({ onSuccess, onClose }: UseLemonSqueezyEmbeddedCheckoutParams = {}) {
	const t = useTranslations('payment');
	const createCheckoutMutation = useCreateLemonSqueezyCheckout();
	const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
	const [isEmbedReady, setIsEmbedReady] = useState(false);

	// Use refs to keep callbacks fresh in the event handler closure
	const onSuccessRef = useRef(onSuccess);
	const onCloseRef = useRef(onClose);

	useEffect(() => {
		onSuccessRef.current = onSuccess;
	}, [onSuccess]);

	useEffect(() => {
		onCloseRef.current = onClose;
	}, [onClose]);

	useEffect(() => {
		let retryCount = 0;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		const MAX_RETRIES = 20; // 10 seconds total

		const initializeLemonSqueezy = () => {
			if (typeof window !== 'undefined' && (window as any).LemonSqueezy?.Setup) {
				console.log('🍋 Initializing LemonSqueezy...');
				try {
					(window as any).LemonSqueezy.Setup({
						eventHandler: (event: any) => {
							if (event.event === 'Checkout.Success') {
								setCheckoutUrl(null);
								onSuccessRef.current?.(event);
							} else if (event.event === 'Checkout.Closed') {
								toast.info(t('CHECKOUT_CLOSED'));
								setCheckoutUrl(null);
								onCloseRef.current?.();
							}
						}
					});
					setIsEmbedReady(true);
				} catch (error) {
					console.error('❌ Failed to initialize LemonSqueezy:', error);
				}
			} else {
				if (retryCount >= MAX_RETRIES) {
					console.warn('⚠️ LemonSqueezy SDK failed to load within timeout');
					return;
				}
				retryCount++;
				console.log(`⏳ Waiting for LemonSqueezy SDK... (${retryCount}/${MAX_RETRIES})`);
				timeoutId = setTimeout(initializeLemonSqueezy, 500);
			}
		};

		initializeLemonSqueezy();

		// Cleanup: clear any pending timeout on unmount
		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	}, []);

	const createEmbeddedCheckout = useCallback(
		async (params: LemonSqueezyCheckoutParams) => {
			try {
				const result = await createCheckoutMutation.mutateAsync(params);
				setCheckoutUrl(result.checkoutUrl);
				return result;
			} catch (error: any) {
				toast.error(t('CREATE_CHECKOUT_FAILED', { message: error.message }));
				throw error;
			}
		},
		[createCheckoutMutation]
	);

	const clearCheckout = useCallback(() => {
		setCheckoutUrl(null);
	}, []);

	return {
		createEmbeddedCheckout,
		checkoutUrl,
		isEmbedReady,
		clearCheckout,
		isLoading: createCheckoutMutation.isPending,
		error: createCheckoutMutation.error,
		isSuccess: createCheckoutMutation.isSuccess,
		isError: createCheckoutMutation.isError
	};
}

export function useLemonSqueezyCheckoutWithRedirect() {
	const t = useTranslations('payment');
	const createCheckoutMutation = useCreateLemonSqueezyCheckout();
	const createCheckoutAndRedirect = useCallback(
		async (params: LemonSqueezyCheckoutParams) => {
			try {
				const result = await createCheckoutMutation.mutateAsync(params);

				if (typeof window === 'undefined') {
					console.warn('Not in browser environment, cannot open checkout');
					return;
				}

				if (result.checkoutUrl) {
					const success = openCheckoutInNewTab({
						url: result.checkoutUrl,
						windowFeatures: 'noopener,noreferrer',
						fallbackToRedirect: true,
						windowName: '_self'
					});

					if (!success) {
						throw new Error('Failed to open checkout in new tab');
					}
				} else {
					throw new Error('No checkout URL received');
				}
			} catch (error) {
				console.error('Failed to create checkout and open:', error);

				if (typeof window !== 'undefined') {
					toast.error(t('UNABLE_TO_OPEN_CHECKOUT'));
				}
			}
		},
		[createCheckoutMutation]
	);

	return {
		createCheckoutAndRedirect,
		isLoading: createCheckoutMutation.isPending,
		error: createCheckoutMutation.error,
		isError: createCheckoutMutation.isError,
		isSuccess: createCheckoutMutation.isSuccess
	};
}
