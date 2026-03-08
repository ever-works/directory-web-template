/**
 * Plan Expiration Utilities
 *
 * Centralized utilities for handling subscription plan expiration logic.
 * Used across backend and frontend for consistent behavior.
 */

import { PaymentPlan } from '@/lib/constants';

/**
 * Default configuration for expiration handling
 */
export const EXPIRATION_CONFIG = {
	/** Days before expiration to show warning */
	WARNING_DAYS: 7,
	/** Days of grace period after expiration (optional feature access) */
	GRACE_PERIOD_DAYS: 0
} as const;

/**
 * Check if a subscription has expired based on its end date
 *
 * @param endDate - The subscription end date
 * @param gracePeriodDays - Optional grace period in days (default: 0)
 * @returns true if the subscription is expired
 */
export function isPlanExpired(
	endDate: Date | string | null | undefined,
	gracePeriodDays: number = EXPIRATION_CONFIG.GRACE_PERIOD_DAYS
): boolean {
	if (!endDate) return false;

	const expirationDate = typeof endDate === 'string' ? new Date(endDate) : endDate;

	// Invalid date check
	if (isNaN(expirationDate.getTime())) return false;

	const now = new Date();
	const graceEndDate = new Date(expirationDate);
	graceEndDate.setDate(graceEndDate.getDate() + gracePeriodDays);

	return now > graceEndDate;
}

/**
 * Get the effective plan based on expiration status
 *
 * When a paid plan expires, the user falls back to FREE plan access.
 *
 * @param planId - The user's actual plan ID
 * @param endDate - The subscription end date
 * @param status - The subscription status
 * @returns The effective plan ID (may differ from planId if expired)
 */
export function getEffectivePlan(planId: string, endDate: Date | string | null | undefined, status?: string): string {
	// Free plan never expires
	if (planId === PaymentPlan.FREE) {
		return PaymentPlan.FREE;
	}

	// If status is explicitly expired or cancelled, return FREE
	if (status && ['expired', 'cancelled'].includes(status.toLowerCase())) {
		return PaymentPlan.FREE;
	}

	// Check if the subscription has expired based on end date
	if (isPlanExpired(endDate)) {
		return PaymentPlan.FREE;
	}

	return planId;
}

/**
 * Calculate days until subscription expires
 *
 * @param endDate - The subscription end date
 * @returns Number of days until expiration, or null if no end date
 *          Negative values indicate the plan has already expired
 *          Uses Math.floor to count full days remaining (e.g., 1 hour = 0 days = "expires today")
 */
export function getDaysUntilExpiration(endDate: Date | string | null | undefined): number | null {
	if (!endDate) return null;

	const expirationDate = typeof endDate === 'string' ? new Date(endDate) : endDate;

	// Invalid date check
	if (isNaN(expirationDate.getTime())) return null;

	const now = new Date();
	const diffTime = expirationDate.getTime() - now.getTime();
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

	return diffDays;
}

/**
 * Check if the subscription is within the warning period before expiration
 *
 * @param endDate - The subscription end date
 * @param warningDays - Days before expiration to trigger warning (default: 7)
 * @returns true if subscription expires within the warning period
 */
export function isInExpirationWarningPeriod(
	endDate: Date | string | null | undefined,
	warningDays: number = EXPIRATION_CONFIG.WARNING_DAYS
): boolean {
	const daysUntil = getDaysUntilExpiration(endDate);

	if (daysUntil === null) return false;

	// In warning period: expires within warningDays but hasn't expired yet
	return daysUntil > 0 && daysUntil <= warningDays;
}

/**
 * Check if the subscription is currently in grace period (expired but still has limited access)
 *
 * @param endDate - The subscription end date
 * @param gracePeriodDays - Days of grace period after expiration
 * @returns true if subscription is in grace period
 */
export function isInGracePeriod(
	endDate: Date | string | null | undefined,
	gracePeriodDays: number = EXPIRATION_CONFIG.GRACE_PERIOD_DAYS
): boolean {
	if (!endDate || gracePeriodDays <= 0) return false;

	const expirationDate = typeof endDate === 'string' ? new Date(endDate) : endDate;

	// Invalid date check
	if (isNaN(expirationDate.getTime())) return false;

	const now = new Date();
	const graceEndDate = new Date(expirationDate);
	graceEndDate.setDate(graceEndDate.getDate() + gracePeriodDays);

	// In grace period: past expiration but before grace period ends
	return now > expirationDate && now <= graceEndDate;
}

/**
 * Get comprehensive plan status information
 *
 * @param planId - The user's actual plan ID
 * @param endDate - The subscription end date
 * @param status - The subscription status
 * @returns Object with complete plan status information
 */
export function getPlanStatusInfo(
	planId: string,
	endDate: Date | string | null | undefined,
	status?: string
): {
	planId: string;
	effectivePlan: string;
	isExpired: boolean;
	isInWarningPeriod: boolean;
	isInGracePeriod: boolean;
	daysUntilExpiration: number | null;
	expiresAt: Date | null;
	canAccessPlanFeatures: boolean;
} {
	const expiresAt = endDate ? (typeof endDate === 'string' ? new Date(endDate) : endDate) : null;

	const effectivePlan = getEffectivePlan(planId, endDate, status);
	const isExpired = effectivePlan !== planId && planId !== PaymentPlan.FREE;
	const daysUntilExpiration = getDaysUntilExpiration(endDate);
	const inWarningPeriod = isInExpirationWarningPeriod(endDate);
	const inGracePeriod = isInGracePeriod(endDate);

	return {
		planId,
		effectivePlan,
		isExpired,
		isInWarningPeriod: inWarningPeriod,
		isInGracePeriod: inGracePeriod,
		daysUntilExpiration,
		expiresAt,
		// User can access plan features if not expired OR in grace period
		canAccessPlanFeatures: !isExpired || inGracePeriod
	};
}

/**
 * Format expiration message for UI display
 *
 * @param planName - Display name of the plan
 * @param daysUntil - Days until expiration (negative if already expired)
 * @param isExpired - Whether the plan is expired
 * @returns Formatted message string
 */
export function formatExpirationMessage(planName: string, daysUntil: number | null, isExpired: boolean): string | null {
	if (daysUntil === null) return null;

	if (isExpired) {
		return `Your ${planName} subscription has expired. Please renew to restore full access.`;
	}

	if (daysUntil === 0) {
		return `Your ${planName} subscription expires today.`;
	}

	if (daysUntil === 1) {
		return `Your ${planName} subscription expires tomorrow.`;
	}

	// Only show warning message for positive days (not expired)
	// This prevents nonsensical messages like "expires in -5 days"
	if (daysUntil > 0 && daysUntil <= EXPIRATION_CONFIG.WARNING_DAYS) {
		return `Your ${planName} subscription expires in ${daysUntil} days.`;
	}

	return null;
}
