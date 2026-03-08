import { useMemo } from 'react';
import { useFeatureFlags } from '@/hooks/use-feature-flags';
import { useLayoutTheme } from '@/components/context/LayoutThemeContext';
import type { FeatureFlags } from '@/lib/config/feature-flags';

/**
 * Extended result type including simulation state
 */
interface UseFeatureFlagsWithSimulationResult {
	/** Feature availability flags (adjusted for simulation mode) */
	features: FeatureFlags;
	/** Whether flags are currently loading (no cached data) */
	isPending: boolean;
	/** Current simulation mode setting */
	simulationMode: 'enabled' | 'disabled';
	/** Whether simulation mode is actively hiding features */
	isSimulationActive: boolean;
}

/**
 * Hook to access feature flags with client-side simulation mode support
 *
 * Wraps useFeatureFlags to add support for database simulation mode.
 * When simulation mode is "disabled", all database features are hidden
 * regardless of actual server configuration.
 *
 * This allows users to preview how the site appears without database features,
 * useful for demos and testing scenarios.
 *
 * @returns {UseFeatureFlagsWithSimulationResult} Feature flags with simulation state
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { features, isSimulationActive } = useFeatureFlagsWithSimulation();
 *
 *   if (!features.comments) {
 *     if (isSimulationActive) {
 *       return <Notice>Database features disabled in settings</Notice>;
 *     }
 *     return null; // Database not configured
 *   }
 *
 *   return <CommentsSection />;
 * }
 * ```
 */
export function useFeatureFlagsWithSimulation(): UseFeatureFlagsWithSimulationResult {
	const { features, isPending } = useFeatureFlags();
	const { databaseSimulationMode, isInitialized } = useLayoutTheme();

	const isSimulationActive = isInitialized && databaseSimulationMode === 'disabled';

	const effectiveFeatures = useMemo<FeatureFlags>(() => {
		// Wait for hydration to complete
		if (!isInitialized || isPending) {
			return features;
		}

		// If simulation mode is disabled, hide all database features
		if (isSimulationActive) {
			return {
				ratings: false,
				comments: false,
				favorites: false,
				featuredItems: false,
				surveys: false,
			};
		}

		// Otherwise, return actual server feature flags
		return features;
	}, [features, isSimulationActive, isInitialized, isPending]);

	return {
		features: effectiveFeatures,
		isPending,
		simulationMode: databaseSimulationMode,
		isSimulationActive,
	};
}

/**
 * Hook to check if a specific feature is enabled with simulation mode support
 *
 * @param {keyof FeatureFlags} featureName - Name of the feature to check
 * @returns {object} Object with enabled boolean, loading state, and simulation state
 *
 * @example
 * ```tsx
 * function FavoriteButton() {
 *   const { enabled, isSimulationActive } = useFeatureEnabledWithSimulation('favorites');
 *
 *   if (!enabled) {
 *     if (isSimulationActive) {
 *       return <Notice>Favorites disabled in settings</Notice>;
 *     }
 *     return null;
 *   }
 *
 *   return <button>Add to Favorites</button>;
 * }
 * ```
 */
export function useFeatureEnabledWithSimulation(featureName: keyof FeatureFlags): {
	enabled: boolean;
	isPending: boolean;
	isSimulationActive: boolean;
} {
	const { features, isPending, isSimulationActive } = useFeatureFlagsWithSimulation();

	return {
		enabled: features[featureName],
		isPending,
		isSimulationActive,
	};
}
