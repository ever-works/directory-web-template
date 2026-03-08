/**
 * Guards Module
 *
 * Centralized exports for all guard utilities.
 */

// Plan Features Guard
export {
	// Constants
	FEATURES,
	PLAN_LEVELS,
	FEATURE_ACCESS,
	PLAN_LIMITS,

	// Types
	type Feature,

	// Functions
	canAccessFeature,
	getFeatureLimit,
	isWithinLimit,
	getAccessibleFeatures,
	getMinimumPlanForFeature,
	getPlanLevel,
	planMeetsRequirement,

	// Guard factory
	createPlanGuard,
	createPlanGuardResult,
	PlanGuardError,

	// Types for results
	type PlanGuardResult
} from './plan-features.guard';
