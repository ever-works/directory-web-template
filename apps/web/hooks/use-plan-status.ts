'use client';

/**
 * Plan Status Hook
 *
 * React hook for accessing user's plan with expiration awareness.
 * Fetches plan status from API and provides computed properties
 * for feature gating and UI warnings.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { PaymentPlan } from '@/lib/constants';
import { useMemo, useCallback } from 'react';

/**
 * Plan status response from API
 */
export interface PlanStatusData {
	planId: string;
	effectivePlan: string;
	isExpired: boolean;
	expiresAt: string | null;
	daysUntilExpiration: number | null;
	isInWarningPeriod: boolean;
	canAccessPlanFeatures: boolean;
	warningMessage: string | null;
	status: string | null;
}

/**
 * Extended plan status with loading and error states
 */
export interface PlanStatus extends Omit<PlanStatusData, 'expiresAt'> {
	expiresAt: Date | null;
	isLoading: boolean;
	error: string | null;
	refresh: () => Promise<void>;
}

// Query keys
export const planStatusQueryKeys = {
	all: ['plan-status'] as const,
	user: (userId: string) => [...planStatusQueryKeys.all, userId] as const
};

/**
 * Fetch plan status from API
 */
async function fetchPlanStatus(): Promise<PlanStatusData> {
	const response = await serverClient.get<{ success: boolean; data: PlanStatusData }>('/api/user/plan-status');

	if (apiUtils.isSuccess(response) && response.data.data) {
		return response.data.data;
	}

	throw new Error(apiUtils.getErrorMessage(response) || 'Failed to fetch plan status');
}

/**
 * Default plan status for unauthenticated users
 */
const DEFAULT_PLAN_STATUS: PlanStatusData = {
	planId: PaymentPlan.FREE,
	effectivePlan: PaymentPlan.FREE,
	isExpired: false,
	expiresAt: null,
	daysUntilExpiration: null,
	isInWarningPeriod: false,
	canAccessPlanFeatures: true,
	warningMessage: null,
	status: null
};

/**
 * Hook for accessing user's plan status with expiration awareness
 *
 * @returns PlanStatus object with plan info, expiration details, and loading state
 *
 * @example
 * ```tsx
 * const { effectivePlan, isExpired, warningMessage, isLoading } = usePlanStatus();
 *
 * if (isExpired) {
 *   return <ExpiredPlanBanner message={warningMessage} />;
 * }
 *
 * if (effectivePlan === 'free') {
 *   return <UpgradePrompt />;
 * }
 * ```
 */
export function usePlanStatus(): PlanStatus {
	const { user } = useCurrentUser();
	const queryClient = useQueryClient();

	const query = useQuery({
		queryKey: planStatusQueryKeys.all,
		queryFn: fetchPlanStatus,
		enabled: !!user,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 2,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)
	});

	const refresh = useCallback(async () => {
		await queryClient.invalidateQueries({ queryKey: planStatusQueryKeys.all });
	}, [queryClient]);

	// Memoize the result to avoid unnecessary re-renders
	const result = useMemo<PlanStatus>(() => {
		const data = query.data || DEFAULT_PLAN_STATUS;

		return {
			planId: data.planId,
			effectivePlan: data.effectivePlan,
			isExpired: data.isExpired,
			expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
			daysUntilExpiration: data.daysUntilExpiration,
			isInWarningPeriod: data.isInWarningPeriod,
			canAccessPlanFeatures: data.canAccessPlanFeatures,
			warningMessage: data.warningMessage,
			status: data.status,
			isLoading: query.isLoading,
			error: query.error instanceof Error ? query.error.message : null,
			refresh
		};
	}, [query.data, query.isLoading, query.error, refresh]);

	return result;
}

/**
 * Hook to check if user can access a specific plan level
 *
 * @param requiredPlan - Minimum plan required to access feature
 * @returns Object with access status and effective plan
 *
 * @example
 * ```tsx
 * const { hasAccess, effectivePlan, isLoading } = usePlanAccess('premium');
 *
 * if (!hasAccess) {
 *   return <UpgradeRequired plan="premium" />;
 * }
 * ```
 */
export function usePlanAccess(requiredPlan: string): {
	hasAccess: boolean;
	effectivePlan: string;
	isExpired: boolean;
	isLoading: boolean;
	reason: 'allowed' | 'insufficient_plan' | 'expired' | 'loading';
} {
	const { effectivePlan, isExpired, isLoading } = usePlanStatus();

	return useMemo(() => {
		if (isLoading) {
			return {
				hasAccess: false,
				effectivePlan,
				isExpired,
				isLoading: true,
				reason: 'loading' as const
			};
		}

		const planLevels: Record<string, number> = {
			[PaymentPlan.FREE]: 1,
			[PaymentPlan.STANDARD]: 2,
			[PaymentPlan.PREMIUM]: 3
		};

		const effectiveLevel = planLevels[effectivePlan] || 0;
		// Default to a high number to fail-safe by denying access for unknown plans
		const requiredLevel = planLevels[requiredPlan] || 999;
		const hasAccess = effectiveLevel >= requiredLevel;

		let reason: 'allowed' | 'insufficient_plan' | 'expired' = 'allowed';
		if (!hasAccess) {
			reason = isExpired ? 'expired' : 'insufficient_plan';
		}

		return {
			hasAccess,
			effectivePlan,
			isExpired,
			isLoading: false,
			reason
		};
	}, [effectivePlan, requiredPlan, isExpired, isLoading]);
}

/**
 * Utility hook to prefetch plan status
 * Useful for pre-loading data before navigation
 */
export function usePrefetchPlanStatus() {
	const queryClient = useQueryClient();
	const { user } = useCurrentUser();

	const prefetch = useCallback(() => {
		if (user) {
			queryClient.prefetchQuery({
				queryKey: planStatusQueryKeys.all,
				queryFn: fetchPlanStatus,
				staleTime: 5 * 60 * 1000
			});
		}
	}, [queryClient, user]);

	return { prefetch };
}
