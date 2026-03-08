/**
 * Analytics-related constants.
 * This file contains constants for analytics tracking, including
 * viewer identification and session tracking.
 */

// ============================================
// VIEWER TRACKING
// ============================================

/**
 * Cookie name for storing the anonymous viewer ID.
 * Used for tracking unique daily views without requiring authentication.
 */
export const VIEWER_COOKIE_NAME = 'ever_viewer_id';

/**
 * Cookie max age in seconds (365 days).
 * Long-lived to maintain consistent viewer identification across sessions.
 */
export const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
