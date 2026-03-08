'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiUtils, serverClient } from '@/lib/api/server-api-client';
import { toast } from 'sonner';

/**
 * Types for Polar subscription actions
 */
export interface CancelPolarSubscriptionData {
	subscriptionId: string;
	cancelAtPeriodEnd?: boolean;
}

export interface ReactivatePolarSubscriptionData {
	subscriptionId: string;
}

export interface PolarSubscriptionResponse {
	success: boolean;
	data: {
		id: string;
		status: string;
		cancelAtPeriodEnd: boolean;
		currentPeriodEnd?: number | null;
		priceId?: string;
		customerId?: string;
	};
	message: string;
}

/**
 * Custom error class for Polar subscription errors
 */
class PolarSubscriptionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PolarSubscriptionError';
	}
}

/**
 * Hook for managing Polar subscription actions
 * Follows the same structure as other payment provider hooks
 */
export function usePolarSubscription() {
	const queryClient = useQueryClient();

	/**
	 * Invalidate relevant queries after subscription operations
	 */
	const invalidateQueries = async () => {
		await queryClient.invalidateQueries({
			queryKey: ['subscriptions']
		});
		await queryClient.invalidateQueries({
			queryKey: ['user-subscription']
		});
		await queryClient.invalidateQueries({
			queryKey: ['billing']
		});
	};

	/**
	 * Cancel Polar subscription mutation
	 */
	const cancelSubscription = useMutation({
		mutationKey: ['cancel-polar-subscription'],
		mutationFn: async (data: CancelPolarSubscriptionData): Promise<PolarSubscriptionResponse> => {
			if (!data.subscriptionId) {
				throw new PolarSubscriptionError('Subscription ID is required');
			}

			const payload = {
				cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? true
			};

			const response = await serverClient.post<PolarSubscriptionResponse>(
				`/api/polar/subscription/${data.subscriptionId}/cancel`,
				payload
			);

			if (!apiUtils.isSuccess(response)) {
				const errorMessage = apiUtils.getErrorMessage(response) || 'Failed to cancel subscription';
				throw new PolarSubscriptionError(errorMessage);
			}

			return response.data;
		},
		retry: (failureCount, error) => {
			// Don't retry authentication errors
			if (error instanceof PolarSubscriptionError && error.message.includes('Unauthorized')) {
				return false;
			}
			// Retry network errors up to 2 times
			return failureCount < 2;
		},
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
		onSuccess: async (data) => {
			try {
				await invalidateQueries();
				const message = data.message || 'Subscription cancelled successfully';
				toast.success(message);
			} catch (error) {
				console.warn('Failed to invalidate queries after Polar subscription cancellation:', error);
			}
		},
		onError: (error) => {
			console.error('Polar subscription cancellation error:', error);
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to cancel subscription';
			toast.error(errorMessage);
		}
	});

	/**
	 * Reactivate Polar subscription mutation
	 */
	const reactivateSubscription = useMutation({
		mutationKey: ['reactivate-polar-subscription'],
		mutationFn: async (data: ReactivatePolarSubscriptionData): Promise<PolarSubscriptionResponse> => {
			if (!data.subscriptionId) {
				throw new PolarSubscriptionError('Subscription ID is required');
			}

			const response = await serverClient.post<PolarSubscriptionResponse>(
				`/api/polar/subscription/${data.subscriptionId}/reactivate`,
				{}
			);

			if (!apiUtils.isSuccess(response)) {
				const errorMessage = apiUtils.getErrorMessage(response) || 'Failed to reactivate subscription';
				throw new PolarSubscriptionError(errorMessage);
			}

			return response.data;
		},
		retry: (failureCount, error) => {
			// Don't retry authentication errors
			if (error instanceof PolarSubscriptionError && error.message.includes('Unauthorized')) {
				return false;
			}
			// Retry network errors up to 2 times
			return failureCount < 2;
		},
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
		onSuccess: async (data) => {
			try {
				await invalidateQueries();
				const message = data.message || 'Subscription reactivated successfully';
				toast.success(message);
			} catch (error) {
				console.warn('Failed to invalidate queries after Polar subscription reactivation:', error);
			}
		},
		onError: (error) => {
			console.error('Polar subscription reactivation error:', error);
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to reactivate subscription';
			toast.error(errorMessage);
		}
	});

	/**
	 * Cancel subscription function
	 * @param subscriptionId - Polar subscription ID
	 * @param cancelAtPeriodEnd - Whether to cancel at period end (default: true)
	 */
	const cancel = async (
		subscriptionId: string,
		cancelAtPeriodEnd: boolean = true
	): Promise<PolarSubscriptionResponse> => {
		return cancelSubscription.mutateAsync({
			subscriptionId,
			cancelAtPeriodEnd
		});
	};

	/**
	 * Reactivate subscription function
	 * @param subscriptionId - Polar subscription ID
	 */
	const reactivate = async (subscriptionId: string): Promise<PolarSubscriptionResponse> => {
		return reactivateSubscription.mutateAsync({
			subscriptionId
		});
	};

	return {
		// Mutation functions
		cancel,
		cancelSubscription,
		reactivate,
		reactivateSubscription,

		// Loading states
		isCancelling: cancelSubscription.isPending,
		isReactivating: reactivateSubscription.isPending,
		isLoading: cancelSubscription.isPending || reactivateSubscription.isPending,

		// Error states
		error: cancelSubscription.error || reactivateSubscription.error,
		cancelError: cancelSubscription.error,
		reactivateError: reactivateSubscription.error,
		errorMessage: (cancelSubscription.error?.message || reactivateSubscription.error?.message) || null,
		isError: cancelSubscription.isError || reactivateSubscription.isError,

		// Success states
		isSuccess: cancelSubscription.isSuccess || reactivateSubscription.isSuccess,
		isCancelSuccess: cancelSubscription.isSuccess,
		isReactivateSuccess: reactivateSubscription.isSuccess,

		// Data
		data: cancelSubscription.data || reactivateSubscription.data,

		// Reset functions
		reset: cancelSubscription.reset,
		resetCancel: cancelSubscription.reset,
		resetReactivate: reactivateSubscription.reset
	};
}

/**
 * Hook for canceling a specific Polar subscription by ID
 * Simplified version for direct use in components
 */
export function useCancelPolarSubscription() {
	const { cancel, isCancelling, error, isSuccess, reset } = usePolarSubscription();

	return {
		cancelSubscription: cancel,
		isCancelling,
		error,
		isSuccess,
		reset
	};
}

