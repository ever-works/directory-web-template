import { useState, useCallback, useMemo } from 'react';
import { useLemonSqueezyCheckoutWithRedirect, useLemonSqueezyEmbeddedCheckout } from '@/hooks/use-lemonsqueezy-queries';

export interface CheckoutButtonParams {
	defaultEmail?: string;
	defaultPrice?: number;
	variantId?: number;
	metadata?: Record<string, any>;
	embedded?: boolean;
	onPaymentSuccess?: (res?: any) => void;
	onClose?: () => void;
	dark?: boolean;
}

export interface CheckoutButtonState {
	customPrice: number | undefined;
	showForm: boolean;
	isLoading: boolean;
	error: Error | null;
	isError: boolean;
	checkoutUrl: string | null;
	isEmbedReady: boolean;
	isSuccess: boolean;
}

export interface CheckoutButtonActions {
	setCustomPrice: (price: number | undefined) => void;
	handleSubmit: (e: React.FormEvent) => Promise<void>;
	handleClick: () => Promise<void>;
	handlePriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	clearCheckout: () => void;
	handleSubmitWithParams: (params?: CheckoutButtonParams) => Promise<void>;
}

export interface UseCheckoutButtonReturn extends CheckoutButtonState, CheckoutButtonActions {}

/**
 * Custom hook that encapsulates all CheckoutButton logic
 */
export function useCheckoutButton(params?: CheckoutButtonParams): UseCheckoutButtonReturn {
	const {
		defaultEmail = '',
		defaultPrice,
		variantId,
		metadata = {},
		embedded = false,
		onPaymentSuccess,
		onClose,
		dark
	} = params || {};

	// Local state
	const [customPrice, setCustomPrice] = useState<number | undefined>(defaultPrice);
	const [showForm] = useState(!defaultEmail);

	// Hooks based on embedded mode
	const redirectHook = useLemonSqueezyCheckoutWithRedirect();
	const embeddedHook = useLemonSqueezyEmbeddedCheckout({
		onSuccess: onPaymentSuccess,
		onClose: onClose
	});

	const currentHook = embedded ? embeddedHook : redirectHook;
	const { isLoading, error, isError, isSuccess } = currentHook;

	// Extract embedded-specific state
	const checkoutUrl = embedded ? embeddedHook.checkoutUrl : null;
	const isEmbedReady = embedded ? embeddedHook.isEmbedReady : true;
	const memoizedMetadata = useMemo(
		() => ({
			...metadata,
			source: 'checkout-button'
		}),
		[metadata]
	);

	const createCheckoutParams = useCallback(
		() => ({
			customPrice,
			variantId,
			dark,
			metadata: {
				...memoizedMetadata,
				timestamp: new Date().toISOString()
			}
		}),
		[customPrice, variantId, memoizedMetadata, dark]
	);

	/**
	 * Execute checkout based on mode
	 */
	const executeCheckout = useCallback(
		async (params?: CheckoutButtonParams) => {
			try {
				const checkoutParams = params || createCheckoutParams();
				if (embedded) {
					await embeddedHook.createEmbeddedCheckout(checkoutParams);
				} else {
					await redirectHook.createCheckoutAndRedirect(checkoutParams);
				}
			} catch (err) {
				console.error('Checkout failed:', err);
				throw err;
			}
		},
		[embedded, embeddedHook, redirectHook, createCheckoutParams]
	);

	/**
	 * Handle form submission
	 */
	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			await executeCheckout();
		},
		[executeCheckout]
	);

	const handleSubmitWithParams = useCallback(
		async (params?: CheckoutButtonParams) => {
			await executeCheckout(params);
		},
		[executeCheckout]
	);

	/**
	 * Handle simple button click
	 */
	const handleClick = useCallback(async () => {
		await executeCheckout();
	}, [executeCheckout]);

	/**
	 * Handle price input change
	 */
	const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		if (value === '') {
			setCustomPrice(undefined);
		} else {
			const price = parseInt(value, 10);
			if (!isNaN(price) && price >= 0) {
				setCustomPrice(price);
			}
		}
	}, []);

	/**
	 * Clear checkout (for embedded mode)
	 */
	const clearCheckout = useCallback(() => {
		if (embedded && embeddedHook.clearCheckout) {
			embeddedHook.clearCheckout();
		}
	}, [embedded, embeddedHook]);

	return {
		// State
		customPrice,
		showForm,
		isLoading,
		error,
		isError,
		isSuccess,
		checkoutUrl,
		isEmbedReady,
		handleSubmitWithParams,

		// Actions
		setCustomPrice,
		handleSubmit,
		handleClick,
		handlePriceChange,
		clearCheckout
	};
}
