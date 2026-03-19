'use client';

/**
 * Plan Guard Hook
 *
 * React hook for checking feature access based on user's subscription plan.
 * Uses the plan guard configuration to determine feature availability.
 *
 * @example
 * ```tsx
 * const { canAccess, getLimit, requireUpgrade } = usePlanGuard();
 *
 * // Check feature access
 * if (!canAccess(FEATURES.UPLOAD_VIDEO)) {
 *   return <UpgradePrompt feature="video upload" />;
 * }
 *
 * // Get limits
 * const maxImages = getLimit('max_images'); // 1, 5, or null (unlimited)
 *
 * // Show upgrade prompt
 * if (requireUpgrade(FEATURES.VERIFIED_BADGE)) {
 *   return <UpgradeBadge plan={requireUpgrade(FEATURES.VERIFIED_BADGE)} />;
 * }
 * ```
 */

import { useMemo } from 'react';
import { usePlanStatus } from '@/hooks/use-plan-status';
import {
	Feature,
	canAccessFeature,
	getFeatureLimit,
	isWithinLimit as isWithinLimitHelper,
	getAccessibleFeatures,
	getMinimumPlanForFeature,
	PLAN_LIMITS
} from '@/lib/guards/plan-features.guard';
import { PaymentPlan } from '@/lib/constants';

// Re-export FEATURES for convenience
export { FEATURES } from '@/lib/guards/plan-features.guard';
export type { Feature } from '@/lib/guards/plan-features.guard';

type FeatureLimits = (typeof PLAN_LIMITS)[PaymentPlan];

export interface UsePlanGuardResult {
	/**
	 * Check if user can access a feature
	 */
	canAccess: (feature: Feature) => boolean;

	/**
	 * Get the limit value for a feature (e.g., max_images)
	 */
	getLimit: <K extends keyof FeatureLimits>(limitName: K) => FeatureLimits[K];

	/**
	 * Check if a value is within the plan's limit
	 */
	isWithinLimit: (limitName: keyof FeatureLimits, value: number) => boolean;

	/**
	 * Get all features accessible with current plan
	 */
	accessibleFeatures: Feature[];

	/**
	 * Get the minimum plan required to access a feature (null if already accessible)
	 */
	requireUpgrade: (feature: Feature) => PaymentPlan | null;

	/**
	 * Current effective plan
	 */
	effectivePlan: string;

	/**
	 * Whether plan status is still loading
	 */
	isLoading: boolean;

	/**
	 * Whether plan is expired
	 */
	isExpired: boolean;
}

/**
 * Hook for checking feature access based on user's subscription plan
 */
export function usePlanGuard(): UsePlanGuardResult {
	const { effectivePlan, isLoading, isExpired } = usePlanStatus();

	return useMemo(() => {
		const canAccess = (feature: Feature): boolean => {
			return canAccessFeature(feature, effectivePlan);
		};

		const getLimit = <K extends keyof FeatureLimits>(limitName: K): FeatureLimits[K] => {
			return getFeatureLimit(limitName, effectivePlan);
		};

		const checkWithinLimit = (limitName: keyof FeatureLimits, value: number): boolean => {
			return isWithinLimitHelper(limitName, value, effectivePlan);
		};

		const requireUpgrade = (feature: Feature): PaymentPlan | null => {
			if (canAccessFeature(feature, effectivePlan)) {
				return null; // No upgrade needed
			}
			return getMinimumPlanForFeature(feature);
		};

		return {
			canAccess,
			getLimit,
			isWithinLimit: checkWithinLimit,
			accessibleFeatures: getAccessibleFeatures(effectivePlan),
			requireUpgrade,
			effectivePlan,
			isLoading,
			isExpired
		};
	}, [effectivePlan, isLoading, isExpired]);
}

/**
 * Hook for checking access to a specific feature
 *
 * @example
 * ```tsx
 * const { hasAccess, requiredPlan } = useFeatureAccess(FEATURES.UPLOAD_VIDEO);
 *
 * if (!hasAccess) {
 *   return <UpgradeRequired plan={requiredPlan} />;
 * }
 * ```
 */
export function useFeatureAccess(feature: Feature): {
	hasAccess: boolean;
	requiredPlan: PaymentPlan | null;
	isLoading: boolean;
} {
	const { canAccess, requireUpgrade, isLoading } = usePlanGuard();

	return useMemo(
		() => ({
			hasAccess: canAccess(feature),
			requiredPlan: requireUpgrade(feature),
			isLoading
		}),
		[canAccess, requireUpgrade, feature, isLoading]
	);
}

/**
 * Hook for checking feature limits
 *
 * @example
 * ```tsx
 * const { limit, isUnlimited, remaining } = useFeatureLimit('max_images', currentImageCount);
 *
 * if (!isUnlimited && remaining <= 0) {
 *   return <LimitReached />;
 * }
 * ```
 */
export function useFeatureLimit(
	limitName: keyof FeatureLimits,
	currentValue: number = 0
): {
	limit: number | null;
	isUnlimited: boolean;
	remaining: number | null;
	isWithinLimit: boolean;
	isLoading: boolean;
} {
	const { effectivePlan, isLoading } = usePlanStatus();

	return useMemo(() => {
		const limit = getFeatureLimit(limitName, effectivePlan);
		const isUnlimited = limit === null;
		const remaining = isUnlimited ? null : Math.max(0, (limit as number) - currentValue);

		return {
			limit,
			isUnlimited,
			remaining,
			isWithinLimit: isWithinLimitHelper(limitName, currentValue, effectivePlan),
			isLoading
		};
	}, [limitName, currentValue, effectivePlan, isLoading]);
}
