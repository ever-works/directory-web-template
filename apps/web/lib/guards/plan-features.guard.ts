/**
 * Plan Features Guard
 *
 * Centralized configuration for feature access control based on subscription plans.
 * Add features and their allowed plans here to restrict functionality.
 *
 * @example
 * ```ts
 * // Check if user can access a feature
 * const canAccess = canAccessFeature('upload_video', userPlan);
 *
 * // Get feature limit
 * const limit = getFeatureLimit('max_images', userPlan);
 *
 * // Guard a function
 * const guard = createPlanGuard(userPlan);
 * guard.requireFeature('verified_badge'); // throws if not allowed
 * ```
 */

import { PaymentPlan } from '@/lib/constants';

// ============================================
// PLAN HIERARCHY
// ============================================

/**
 * Plan hierarchy levels (higher = more access)
 */
export const PLAN_LEVELS: Record<string, number> = {
	[PaymentPlan.FREE]: 1,
	[PaymentPlan.STANDARD]: 2,
	[PaymentPlan.PREMIUM]: 3
};

/**
 * Get plan level number
 */
export function getPlanLevel(plan: string): number {
	return PLAN_LEVELS[plan] || 0;
}

/**
 * Check if a plan meets minimum requirement
 */
export function planMeetsRequirement(userPlan: string, requiredPlan: string): boolean {
	return getPlanLevel(userPlan) >= getPlanLevel(requiredPlan);
}

// ============================================
// FEATURE DEFINITIONS
// ============================================

/**
 * All available features in the system.
 * Add new features here as needed.
 */
export const FEATURES = {
	// Submission Features
	SUBMIT_PRODUCT: 'submit_product',
	EXTENDED_DESCRIPTION: 'extended_description',
	UNLIMITED_DESCRIPTION: 'unlimited_description',
	UPLOAD_IMAGES: 'upload_images',
	UPLOAD_VIDEO: 'upload_video',
	VERIFIED_BADGE: 'verified_badge',
	SPONSORED_BADGE: 'sponsored_badge',

	// Review & Priority
	PRIORITY_REVIEW: 'priority_review',
	INSTANT_REVIEW: 'instant_review',

	// Visibility & Placement
	SEARCH_VISIBILITY: 'search_visibility',
	CATEGORY_PLACEMENT: 'category_placement',
	SPONSORED_POSITION: 'sponsored_position',
	HOMEPAGE_FEATURED: 'homepage_featured',
	NEWSLETTER_MENTION: 'newsletter_mention',

	// Statistics & Analytics
	VIEW_STATISTICS: 'view_statistics',
	ADVANCED_ANALYTICS: 'advanced_analytics',

	// Support
	EMAIL_SUPPORT: 'email_support',
	PRIORITY_EMAIL_SUPPORT: 'priority_email_support',
	PHONE_SUPPORT: 'phone_support',

	// Social & Marketing
	SOCIAL_SHARING: 'social_sharing',
	LEARN_MORE_BUTTON: 'learn_more_button',

	// Modifications
	FREE_MODIFICATIONS: 'free_modifications',

	// Submissions
	UNLIMITED_SUBMISSIONS: 'unlimited_submissions'
} as const;

export type Feature = (typeof FEATURES)[keyof typeof FEATURES];

// ============================================
// FEATURE ACCESS MATRIX
// ============================================

/**
 * Define which plans can access each feature.
 * You can specify:
 * - A single plan: Only that plan has access
 * - An array of plans: Only those plans have access
 * - 'all': All plans have access
 * - A minimum plan string: That plan and above have access (use minPlan helper)
 */
type FeatureAccess = PaymentPlan | PaymentPlan[] | 'all' | { minPlan: PaymentPlan };

/**
 * Feature access configuration.
 * Add or modify features and their access rules here.
 */
export const FEATURE_ACCESS: Record<Feature, FeatureAccess> = {
	// Submission Features
	[FEATURES.SUBMIT_PRODUCT]: 'all',
	[FEATURES.EXTENDED_DESCRIPTION]: { minPlan: PaymentPlan.STANDARD },
	[FEATURES.UNLIMITED_DESCRIPTION]: PaymentPlan.PREMIUM,
	[FEATURES.UPLOAD_IMAGES]: 'all',
	[FEATURES.UPLOAD_VIDEO]: PaymentPlan.PREMIUM,
	[FEATURES.VERIFIED_BADGE]: { minPlan: PaymentPlan.STANDARD },
	[FEATURES.SPONSORED_BADGE]: PaymentPlan.PREMIUM,

	// Review & Priority
	[FEATURES.PRIORITY_REVIEW]: { minPlan: PaymentPlan.STANDARD },
	[FEATURES.INSTANT_REVIEW]: PaymentPlan.PREMIUM,

	// Visibility & Placement
	[FEATURES.SEARCH_VISIBILITY]: 'all',
	[FEATURES.CATEGORY_PLACEMENT]: 'all',
	[FEATURES.SPONSORED_POSITION]: PaymentPlan.PREMIUM,
	[FEATURES.HOMEPAGE_FEATURED]: PaymentPlan.PREMIUM,
	[FEATURES.NEWSLETTER_MENTION]: PaymentPlan.PREMIUM,

	// Statistics & Analytics
	[FEATURES.VIEW_STATISTICS]: { minPlan: PaymentPlan.STANDARD },
	[FEATURES.ADVANCED_ANALYTICS]: PaymentPlan.PREMIUM,

	// Support
	[FEATURES.EMAIL_SUPPORT]: 'all',
	[FEATURES.PRIORITY_EMAIL_SUPPORT]: { minPlan: PaymentPlan.STANDARD },
	[FEATURES.PHONE_SUPPORT]: PaymentPlan.PREMIUM,

	// Social & Marketing
	[FEATURES.SOCIAL_SHARING]: { minPlan: PaymentPlan.STANDARD },
	[FEATURES.LEARN_MORE_BUTTON]: PaymentPlan.PREMIUM,

	// Modifications
	[FEATURES.FREE_MODIFICATIONS]: { minPlan: PaymentPlan.STANDARD },

	// Submissions
	[FEATURES.UNLIMITED_SUBMISSIONS]: PaymentPlan.PREMIUM
};

// ============================================
// FEATURE LIMITS
// ============================================

/**
 * Numeric limits for features that have quantity restrictions.
 * null = unlimited
 */
type FeatureLimits = {
	max_images: number | null;
	max_description_words: number | null;
	max_submissions: number | null;
	review_days: number;
	free_modification_days: number;
};

export const PLAN_LIMITS: Record<PaymentPlan, FeatureLimits> = {
	[PaymentPlan.FREE]: {
		max_images: 1,
		max_description_words: 200,
		max_submissions: 1,
		review_days: 7,
		free_modification_days: 0
	},
	[PaymentPlan.STANDARD]: {
		max_images: 5,
		max_description_words: 500,
		max_submissions: 10,
		review_days: 3,
		free_modification_days: 30
	},
	[PaymentPlan.PREMIUM]: {
		max_images: null, // unlimited
		max_description_words: null, // unlimited
		max_submissions: null, // unlimited
		review_days: 1,
		free_modification_days: 365
	}
};

// ============================================
// ACCESS CHECK FUNCTIONS
// ============================================

/**
 * Check if a plan has access to a feature
 */
export function canAccessFeature(feature: Feature, userPlan: string): boolean {
	const access = FEATURE_ACCESS[feature];

	if (!access) {
		console.warn(`[PlanGuard] Unknown feature: ${feature}`);
		return false;
	}

	// All plans have access
	if (access === 'all') {
		return true;
	}

	// Single plan
	if (typeof access === 'string') {
		return userPlan === access;
	}

	// Array of plans
	if (Array.isArray(access)) {
		return access.includes(userPlan as PaymentPlan);
	}

	// Minimum plan requirement
	if (typeof access === 'object' && 'minPlan' in access) {
		return planMeetsRequirement(userPlan, access.minPlan);
	}

	return false;
}

/**
 * Get the limit value for a feature
 */
export function getFeatureLimit<K extends keyof FeatureLimits>(limitName: K, userPlan: string): FeatureLimits[K] {
	const planKey = userPlan as PaymentPlan;
	const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS[PaymentPlan.FREE];
	return limits[limitName];
}

/**
 * Check if a value is within the plan's limit
 */
export function isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean {
	const limit = getFeatureLimit(limitName, userPlan);
	if (limit === null) return true; // unlimited
	return value <= limit;
}

/**
 * Get all features accessible by a plan
 */
export function getAccessibleFeatures(userPlan: string): Feature[] {
	return (Object.keys(FEATURE_ACCESS) as Feature[]).filter((feature) => canAccessFeature(feature, userPlan));
}

/**
 * Get the minimum plan required for a feature
 */
export function getMinimumPlanForFeature(feature: Feature): PaymentPlan {
	const access = FEATURE_ACCESS[feature];

	if (access === 'all') {
		return PaymentPlan.FREE;
	}

	if (typeof access === 'string') {
		return access;
	}

	if (Array.isArray(access)) {
		// Return the lowest level plan in the array
		return access.reduce((lowest, plan) => {
			return getPlanLevel(plan) < getPlanLevel(lowest) ? plan : lowest;
		}, access[0]);
	}

	if (typeof access === 'object' && 'minPlan' in access) {
		return access.minPlan;
	}

	return PaymentPlan.PREMIUM; // Default to highest if unknown
}

// ============================================
// PLAN GUARD CLASS
// ============================================

export class PlanGuardError extends Error {
	constructor(
		message: string,
		public readonly feature: Feature,
		public readonly userPlan: string,
		public readonly requiredPlan: PaymentPlan
	) {
		super(message);
		this.name = 'PlanGuardError';
	}
}

/**
 * Create a plan guard instance for a user's plan.
 * Provides methods to check and enforce feature access.
 */
export function createPlanGuard(userPlan: string) {
	return {
		/**
		 * Check if user can access a feature
		 */
		canAccess(feature: Feature): boolean {
			return canAccessFeature(feature, userPlan);
		},

		/**
		 * Require access to a feature, throw error if not allowed
		 */
		requireFeature(feature: Feature): void {
			if (!canAccessFeature(feature, userPlan)) {
				const requiredPlan = getMinimumPlanForFeature(feature);
				throw new PlanGuardError(
					`Feature "${feature}" requires ${requiredPlan} plan or higher`,
					feature,
					userPlan,
					requiredPlan
				);
			}
		},

		/**
		 * Get limit for a feature
		 */
		getLimit<K extends keyof FeatureLimits>(limitName: K): FeatureLimits[K] {
			return getFeatureLimit(limitName, userPlan);
		},

		/**
		 * Check if value is within limit
		 */
		isWithinLimit(limitName: keyof FeatureLimits, value: number): boolean {
			return isWithinLimit(limitName, value, userPlan);
		},

		/**
		 * Require value to be within limit, throw error if not
		 */
		requireWithinLimit(limitName: keyof FeatureLimits, value: number): void {
			const limit = getFeatureLimit(limitName, userPlan);
			if (limit !== null && value > limit) {
				throw new Error(`Limit exceeded: ${limitName} (max: ${limit}, got: ${value})`);
			}
		},

		/**
		 * Get all accessible features
		 */
		getAccessibleFeatures(): Feature[] {
			return getAccessibleFeatures(userPlan);
		},

		/**
		 * Get current plan
		 */
		getPlan(): string {
			return userPlan;
		},

		/**
		 * Get plan level
		 */
		getPlanLevel(): number {
			return getPlanLevel(userPlan);
		}
	};
}

// ============================================
// REACT HOOK HELPER (for client-side)
// ============================================

/**
 * Type for the plan guard result used in React hooks
 */
export interface PlanGuardResult {
	canAccess: (feature: Feature) => boolean;
	getLimit: <K extends keyof FeatureLimits>(limitName: K) => FeatureLimits[K];
	isWithinLimit: (limitName: keyof FeatureLimits, value: number) => boolean;
	accessibleFeatures: Feature[];
}

/**
 * Create guard result for React hooks
 */
export function createPlanGuardResult(userPlan: string): PlanGuardResult {
	return {
		canAccess: (feature: Feature) => canAccessFeature(feature, userPlan),
		getLimit: <K extends keyof FeatureLimits>(limitName: K) => getFeatureLimit(limitName, userPlan),
		isWithinLimit: (limitName: keyof FeatureLimits, value: number) => isWithinLimit(limitName, value, userPlan),
		accessibleFeatures: getAccessibleFeatures(userPlan)
	};
}
