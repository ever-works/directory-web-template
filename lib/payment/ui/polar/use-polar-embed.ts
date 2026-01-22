'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { PolarEmbedCheckout } from '@polar-sh/checkout/embed';

interface UsePolarEmbedProps {
	checkoutUrl: string | undefined;
	theme?: 'light' | 'dark';
	onSuccess?: (details: any) => void;
	onError?: (error: Error) => void;
	onClose?: () => void;
}

/**
 * Custom hook to manage the lifecycle of a Polar Embedded Checkout.
 *
 * Features:
 * - Handles asynchronous initialization and loading states.
 * - Prevents double-initialization during React Strict Mode via debouncing.
 * - Manages automatic cleanup of iframes and event listeners.
 *
 * @param props Configuration and callbacks for the Polar checkout.
 * @returns Object containing the current loading and error states.
 */
export function usePolarEmbed({ checkoutUrl, theme = 'light', onSuccess, onError, onClose }: UsePolarEmbedProps) {
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const checkoutRef = useRef<any>(null); // Ideally use PolarEmbedCheckout type if available globally
	const initializingRef = useRef(false);

	// Static refs for callbacks to prevent unnecessary re-initializations of the checkout
	const onSuccessRef = useRef(onSuccess);
	const onErrorRef = useRef(onError);
	const onCloseRef = useRef(onClose);

	// Sync refs with latest props
	useEffect(() => {
		onSuccessRef.current = onSuccess;
		onErrorRef.current = onError;
		onCloseRef.current = onClose;
	}, [onSuccess, onError, onClose]);

	/**
	 * Destroys the current checkout instance and resets internal flags.
	 */
	const destroyInstance = useCallback(() => {
		if (checkoutRef.current) {
			checkoutRef.current.close();
			checkoutRef.current = null;
		}
		initializingRef.current = false;
	}, []);

	useEffect(() => {
		// Guard: Don't run if URL isn't ready or we are already active/initializing
		if (!checkoutUrl || initializingRef.current || checkoutRef.current) return;

		let isMounted = true;
		let initTimer: ReturnType<typeof setTimeout>;

		const runInitialization = async () => {
			try {
				initializingRef.current = true;
				setIsLoading(true);
				setError(null);

				const instance = await PolarEmbedCheckout.create(checkoutUrl, theme);

				// Safety check: if unmounted during the async 'create' call, kill it
				if (!isMounted) {
					instance.close();
					return;
				}

				checkoutRef.current = instance;

				// Attach Event Listeners
				instance.addEventListener('loaded', () => {
					if (isMounted) setIsLoading(false);
				});

				instance.addEventListener('close', () => {
					if (onCloseRef.current) {
						onCloseRef.current();
					} else if (onErrorRef.current) {
						onErrorRef.current(new Error('Checkout closed prematurely'));
					}
				});

				instance.addEventListener('success', (event: any) => {
					onSuccessRef.current?.(event.detail);
				});
			} catch (err) {
				console.error('[PolarEmbed] Critical error during initialization:', err);
				if (isMounted) {
					setError('Failed to initialize secure checkout');
					onErrorRef.current?.(err as Error);
					setIsLoading(false);
				}
			} finally {
				// Reset initialization flag so the effect can potentially retry if checkoutUrl changes
				if (isMounted) initializingRef.current = false;
			}
		};

		// Debounce (50ms) to ensure React's Strict Mode remount cycle doesn't spawn ghost iframes
		initTimer = setTimeout(runInitialization, 50);

		return () => {
			isMounted = false;
			clearTimeout(initTimer);
			destroyInstance();
		};
	}, [checkoutUrl, theme, destroyInstance]);

	return { isLoading, error };
}
