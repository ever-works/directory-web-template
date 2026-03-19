/**
 * Sponsorship Constants
 *
 * Shared constants and utility functions for sponsorship components.
 * Single source of truth for status configuration and formatting.
 */

import type { SponsorAdStatus } from '@/lib/types/sponsor-ad';

// ######################### Status Configuration #########################

export interface StatusConfig {
	bg: string;
	text: string;
	labelKey: string;
}

/**
 * Status badge styling and translation keys for sponsor ad statuses.
 * Used by sponsorship-item and sponsorship-detail-modal components.
 */
export const SPONSOR_STATUS_CONFIG: Record<SponsorAdStatus, StatusConfig> = {
	pending_payment: {
		bg: 'bg-yellow-100 dark:bg-yellow-900/30',
		text: 'text-yellow-700 dark:text-yellow-400',
		labelKey: 'STATUS_PENDING_PAYMENT',
	},
	pending: {
		bg: 'bg-blue-100 dark:bg-blue-900/30',
		text: 'text-blue-700 dark:text-blue-400',
		labelKey: 'STATUS_PENDING_REVIEW',
	},
	active: {
		bg: 'bg-green-100 dark:bg-green-900/30',
		text: 'text-green-700 dark:text-green-400',
		labelKey: 'STATUS_ACTIVE',
	},
	expired: {
		bg: 'bg-gray-100 dark:bg-gray-800',
		text: 'text-gray-700 dark:text-gray-400',
		labelKey: 'STATUS_EXPIRED',
	},
	rejected: {
		bg: 'bg-red-100 dark:bg-red-900/30',
		text: 'text-red-700 dark:text-red-400',
		labelKey: 'STATUS_REJECTED',
	},
	cancelled: {
		bg: 'bg-gray-100 dark:bg-gray-800',
		text: 'text-gray-700 dark:text-gray-400',
		labelKey: 'STATUS_CANCELLED',
	},
};

// ######################### Helper Functions #########################

/**
 * Converts a URL slug to a human-readable title.
 * Example: "my-item-slug" -> "My Item Slug"
 */
export function formatSlugToTitle(slug: string): string {
	return slug
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}
