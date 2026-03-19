/**
 * Barrel export for all database query modules
 *
 * This file provides a single entry point for importing query functions
 * organized by domain following Single Responsibility Principle (SRP)
 *
 * Updated: 2025-12-21
 */

// Activity queries
export * from './activity.queries';

// Authentication queries
export * from './auth.queries';

// Client queries
export * from './client.queries';

// Comment queries
export * from './comment.queries';

// Dashboard queries
export * from './dashboard.queries';

// Company queries
export * from './company.queries';

// Newsletter queries
export * from './newsletter.queries';

// Payment queries
export * from './payment.queries';

// Report queries
export * from './report.queries';

// Subscription queries
export * from './subscription.queries';

// Survey queries
export * from './survey.queries';

// User queries
export * from './user.queries';

// Vote queries
export * from './vote.queries';

// Location index queries
export * from './location-index.queries';

// Engagement queries (views, votes, favorites, comments aggregation)
export * from './engagement.queries';

// Shared types and utilities
export * from './types';
export * from './utils';
