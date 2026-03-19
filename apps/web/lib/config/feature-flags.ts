/**
 * Feature Flags Configuration
 *
 * Determines which features are available based on system configuration.
 * Used by Ever Works Template to gracefully handle missing dependencies.
 *
 * @module feature-flags
 */

/**
 * Feature flag structure
 */
export interface FeatureFlags {
  /** User ratings and reviews functionality */
  ratings: boolean;
  /** User comments on items */
  comments: boolean;
  /** User favorite items collection */
  favorites: boolean;
  /** Admin-managed featured items display */
  featuredItems: boolean;
  /** User surveys and feedback collection */
  surveys: boolean;
}

/**
 * Get current feature availability flags
 *
 * Features are enabled when:
 * - DATABASE_URL environment variable is configured
 * - Database connection is available
 *
 * This allows the template to work gracefully without a database
 * for static content while disabling database-dependent features.
 *
 * @returns {FeatureFlags} Object containing boolean flags for each feature
 *
 * @example
 * ```typescript
 * const flags = getFeatureFlags();
 * if (flags.comments) {
 *   // Show comments section
 * }
 * ```
 */
export function getFeatureFlags(): FeatureFlags {
  // Check if database is configured
  // All current features depend on database availability
  const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

  return {
    ratings: isDatabaseConfigured,
    comments: isDatabaseConfigured,
    favorites: isDatabaseConfigured,
    featuredItems: isDatabaseConfigured,
    surveys: isDatabaseConfigured,
  };
}

/**
 * Check if a specific feature is enabled
 *
 * @param {keyof FeatureFlags} featureName - Name of the feature to check
 * @returns {boolean} True if feature is enabled
 *
 * @example
 * ```typescript
 * if (isFeatureEnabled('comments')) {
 *   // Render comments component
 * }
 * ```
 */
export function isFeatureEnabled(featureName: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[featureName];
}

/**
 * Get list of disabled features
 *
 * Useful for debugging and displaying information messages
 *
 * @returns {Array<keyof FeatureFlags>} Array of disabled feature names
 */
export function getDisabledFeatures(): Array<keyof FeatureFlags> {
  const flags = getFeatureFlags();
  return (Object.keys(flags) as Array<keyof FeatureFlags>).filter(
    (key) => !flags[key]
  );
}

/**
 * Get list of enabled features
 *
 * @returns {Array<keyof FeatureFlags>} Array of enabled feature names
 */
export function getEnabledFeatures(): Array<keyof FeatureFlags> {
  const flags = getFeatureFlags();
  return (Object.keys(flags) as Array<keyof FeatureFlags>).filter(
    (key) => flags[key]
  );
}

/**
 * Check if all features are enabled
 *
 * @returns {boolean} True if all features are available
 */
export function areAllFeaturesEnabled(): boolean {
  const flags = getFeatureFlags();
  return Object.values(flags).every((enabled) => enabled);
}
