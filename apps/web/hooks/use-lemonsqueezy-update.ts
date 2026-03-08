import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UpdateSubscriptionRequest } from '@/app/api/lemonsqueezy/update/route';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

export interface UpdateSubscriptionOptions {
	onSuccess?: (data: any) => void;
	onError?: (error: Error) => void;
	onSettled?: () => void;
}

export interface UseUpdateSubscriptionReturn {
	updateSubscription: (params: UpdateSubscriptionRequest) => Promise<any>;
	isUpdating: boolean;
	isSuccess: boolean;
	isError: boolean;
	error: Error | null;
	data: any;
	reset: () => void;
}

export function useUpdateSubscription(options: UpdateSubscriptionOptions = {}): UseUpdateSubscriptionReturn {
	const [ data, setData ] = useState<any>(null);
	const [ error, setError ] = useState<Error | null>(null);
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (params: UpdateSubscriptionRequest) => {
			const response = await serverClient.post('/api/lemonsqueezy/update', params);

			if (apiUtils.isSuccess(response)) {
				throw new Error(response.error || 'Update failed');
			}

			return response.data;
		},
		onSuccess: (data) => {
			setData(data);
			setError(null);
			options.onSuccess?.(data);
			queryClient.invalidateQueries({ queryKey: [ 'lemonsqueezy', 'subscriptions' ] });
			queryClient.invalidateQueries({ queryKey: [ 'lemonsqueezy', 'checkouts' ] });
		},
		onError: (error: Error) => {
			setError(error);
			setData(null);
			options.onError?.(error);
		},
		onSettled: () => {
			options.onSettled?.();
		},
	});

	const updateSubscription = useCallback(async (params: UpdateSubscriptionRequest) => {
		return mutation.mutateAsync(params);
	}, [ mutation ]);

	const reset = useCallback(() => {
		mutation.reset();
		setData(null);
		setError(null);
	}, [ mutation ]);

	return {
		updateSubscription,
		isUpdating: mutation.isPending,
		isSuccess: mutation.isSuccess,
		isError: mutation.isError,
		error: error || mutation.error,
		data,
		reset,
	};
}

export const subscriptionUpdateUtils = {
	cancelAtPeriodEnd: (subscriptionId: string) => ({
		subscriptionId,
		cancelAtPeriodEnd: true,
	}),

	reactivate: (subscriptionId: string) => ({
		subscriptionId,
		cancelAtPeriodEnd: false,
	}),

	changePlan: (subscriptionId: string, newPriceId: string) => ({
		subscriptionId,
		priceId: newPriceId,
	}),

	pause: (subscriptionId: string) => ({
		subscriptionId,
		status: 'paused' as const,
	}),

	resume: (subscriptionId: string) => ({
		subscriptionId,
		status: 'active' as const,
	}),
};
