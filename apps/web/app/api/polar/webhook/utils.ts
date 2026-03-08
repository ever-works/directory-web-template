/**
 * Utility functions for Polar webhook processing
 */

import { getEmailConfig } from '@/lib/config/server-config';
import { coreConfig, emailConfig } from '@/lib/config/config-service';
import { formatAmount, getPlanName, getBillingPeriod } from '@/lib/payment/services/payment-email.service';
import type { PolarWebhookData, PolarWebhookEvent, EmailConfig } from './types';

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_CURRENCY = 'usd';
export const DEFAULT_INTERVAL = 'month';
export const DEFAULT_PLAN_NAME = 'Premium Plan';

export const APP_URL = coreConfig.APP_URL || 'https://demo.ever.works';

export const PLAN_FEATURES: Record<string, string[]> = {
	'Free Plan': ['Access to basic features', 'Email support', 'Limited storage'],
	'Standard Plan': [
		'All advanced features',
		'Priority support',
		'Unlimited storage',
		'Third-party integrations',
		'Advanced analytics'
	],
	'Premium Plan': [
		'All Pro features',
		'Dedicated support',
		'Custom features',
		'Full API integration',
		'Custom training'
	]
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Normalizes email config to ensure all values are strings
 */
export function normalizeEmailConfig(config: Awaited<ReturnType<typeof getEmailConfig>>): EmailConfig {
	const supportEmail =
		typeof config.supportEmail === 'string' && config.supportEmail.trim() !== ''
			? config.supportEmail
			: emailConfig.EMAIL_SUPPORT || 'support@ever.works';

	return {
		companyName: typeof config.companyName === 'string' ? config.companyName : '',
		companyUrl: typeof config.companyUrl === 'string' ? config.companyUrl : '',
		supportEmail
	};
}

/**
 * Creates email data with secure configuration
 */
export function createEmailData<T extends Record<string, any>>(
	baseData: T,
	emailConfig: EmailConfig
): T & { companyName?: string; companyUrl?: string; supportEmail?: string } {
	return {
		...baseData,
		companyName: emailConfig.companyName,
		companyUrl: emailConfig.companyUrl,
		supportEmail: emailConfig.supportEmail
	};
}

/**
 * Extracts subscription information from Polar webhook data
 */
export function extractSubscriptionInfo(data: PolarWebhookData) {
	const productId = data.product?.id || data.product_id || '';
	const planName = productId ? getPlanName(productId) || DEFAULT_PLAN_NAME : DEFAULT_PLAN_NAME;
	const amount = formatAmount(data.price?.amount || data.amount || 0, data.currency || DEFAULT_CURRENCY);
	const billingPeriod = getBillingPeriod(data.price?.recurring?.interval || data.interval || DEFAULT_INTERVAL);

	return { productId, planName, amount, billingPeriod };
}

/**
 * Extracts subscription info from nested subscription object
 */
export function extractNestedSubscriptionInfo(data: PolarWebhookData) {
	const subscription = data.subscription;
	const productId = subscription?.product?.id || subscription?.product_id || data.product?.id || data.product_id;
	const planName = productId ? getPlanName(productId) || DEFAULT_PLAN_NAME : DEFAULT_PLAN_NAME;
	const billingPeriod = subscription
		? getBillingPeriod(subscription.price?.recurring?.interval || subscription.interval || DEFAULT_INTERVAL)
		: DEFAULT_INTERVAL;

	return { productId, planName, billingPeriod, subscription };
}

/**
 * Gets subscription features for a plan
 */
export function getSubscriptionFeatures(planName: string): string[] {
	return PLAN_FEATURES[planName] || PLAN_FEATURES['Standard Plan'];
}

/**
 * Validates webhook payload structure
 * Note: Some Polar events don't have an id at root level (e.g., customer.state_changed)
 */
export function validateWebhookPayload(body: unknown): body is PolarWebhookEvent {
	if (!body || typeof body !== 'object') {
		return false;
	}

	const event = body as Record<string, unknown>;

	// Must have type and data
	if (typeof event.type !== 'string' || event.data === null || typeof event.data !== 'object') {
		return false;
	}

	// id is optional - if present, must be a string
	// Some events have id in data instead of at root level
	if (event.id !== undefined && typeof event.id !== 'string') {
		return false;
	}

	return true;
}
