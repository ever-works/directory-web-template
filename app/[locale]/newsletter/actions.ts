'use server';

import { z } from 'zod';
import { validatedAction } from '@/lib/auth/middleware';
import {
	createNewsletterSubscription,
	getNewsletterSubscriptionByEmail,
	updateNewsletterSubscription,
	getNewsletterStats
} from '@/lib/db/queries';
import { EmailService } from '@/lib/mail';
import { getCachedConfig } from '@/lib/content';
import { getUnsubscribeEmailTemplate, getWelcomeEmailTemplate } from '@/lib/mail/templates';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface EmailConfig {
	provider: string;
	defaultFrom: string;
	domain: string;
	apiKeys: {
		resend: string;
		novu: string;
	};
	novu?: {
		templateId?: string;
		backendUrl?: string;
	};
}

interface NewsletterActionResult {
	success?: boolean;
	error?: string;
	email?: string;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const emailSchema = z.object({
	email: z
		.string()
		.email('Please enter a valid email address')
		.transform((email) => email.toLowerCase().trim())
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates email service configuration from app config
 */
const createEmailConfig = async (): Promise<EmailConfig> => {
	const config = await getCachedConfig();

	return {
		provider: config.mail?.provider || 'resend',
		defaultFrom: config.mail?.default_from || 'onboarding@resend.dev',
		domain: config.app_url || process.env.NEXT_PUBLIC_APP_URL || '',
		apiKeys: {
			resend: process.env.RESEND_API_KEY || '',
			novu: process.env.NOVU_API_KEY || ''
		},
		novu:
			config.mail?.provider === 'novu'
				? {
						templateId: config.mail?.template_id,
						backendUrl: config.mail?.backend_url
					}
				: undefined
	};
};

/**
 * Gets company name from config with fallback
 */
const getCompanyName = async (): Promise<string> => {
	const config = await getCachedConfig();
	return config.company_name || 'Ever Works';
};

/**
 * Sends email with error handling
 */
const sendEmailSafely = async (
	emailService: EmailService,
	emailConfig: EmailConfig,
	template: { subject: string; html: string; text: string },
	to: string
): Promise<void> => {
	try {
		await emailService.sendCustomEmail({
			from: emailConfig.defaultFrom,
			to,
			subject: template.subject,
			html: template.html,
			text: template.text
		});
	} catch (error) {
		console.error(`Failed to send email to ${to}:`, error);
		// Don't throw - email failure shouldn't break the subscription process
	}
};

/**
 * Validates if email is already subscribed
 */
const validateExistingSubscription = async (
	email: string,
	shouldBeActive: boolean = true
): Promise<{ isValid: boolean; error?: string }> => {
	const existingSubscription = await getNewsletterSubscriptionByEmail(email);

	if (shouldBeActive) {
		if (!existingSubscription || !existingSubscription.isActive) {
			return { isValid: false, error: 'Email is not subscribed to the newsletter' };
		}
	} else {
		if (existingSubscription?.isActive) {
			return { isValid: false, error: 'Email is already subscribed to the newsletter' };
		}
	}

	return { isValid: true };
};

// ============================================================================
// NEWSLETTER ACTIONS
// ============================================================================

/**
 * Subscribe user to newsletter
 */
export const subscribeToNewsletter = validatedAction(emailSchema, async (data): Promise<NewsletterActionResult> => {
	try {
		const { email } = data;
		console.log('email', email);
		// Validate subscription status
		const validation = await validateExistingSubscription(email, false);
		if (!validation.isValid) {
			return {
				error: validation.error,
				email
			};
		}

		// Create subscription in database
		const subscription = await createNewsletterSubscription(email, 'footer');
		if (!subscription) {
			return {
				error: 'Failed to create subscription. Please try again.',
				email
			};
		}

		// Send welcome email
		const [emailConfig, companyName] = await Promise.all([createEmailConfig(), getCompanyName()]);

		const emailService = new EmailService(emailConfig);
		const welcomeTemplate = getWelcomeEmailTemplate(email, companyName);
		await sendEmailSafely(emailService, emailConfig, welcomeTemplate, email);
		return { success: true };
	} catch (error) {
		console.error('Newsletter subscription error:', error);
		return {
			error: 'Failed to subscribe to newsletter. Please try again.',
			email: data.email
		};
	}
});

/**
 * Unsubscribe user from newsletter
 */
export const unsubscribeFromNewsletter = validatedAction(emailSchema, async (data): Promise<NewsletterActionResult> => {
	try {
		const { email } = data;

		// Validate subscription status
		const validation = await validateExistingSubscription(email, true);
		if (!validation.isValid) {
			return {
				error: validation.error,
				email
			};
		}

		// Update subscription status
		const updated = await updateNewsletterSubscription(email, { isActive: false });
		if (!updated) {
			return {
				error: 'Failed to unsubscribe. Please try again.',
				email
			};
		}

		// Send unsubscribe confirmation email
		const [emailConfig, companyName] = await Promise.all([createEmailConfig(), getCompanyName()]);

		const emailService = new EmailService(emailConfig);
		const unsubscribeTemplate = getUnsubscribeEmailTemplate(email, companyName);

		await sendEmailSafely(emailService, emailConfig, unsubscribeTemplate, email);

		return { success: true };
	} catch (error) {
		console.error('Newsletter unsubscribe error:', error);
		return {
			error: 'Failed to unsubscribe from newsletter. Please try again.',
			email: data.email
		};
	}
});

/**
 * Get newsletter statistics
 */
export const getNewsletterStatistics = async (): Promise<{
	success?: boolean;
	data?: { totalActive: number; recentSubscriptions: number };
	error?: string;
}> => {
	try {
		const stats = await getNewsletterStats();
		return { success: true, data: stats };
	} catch (error) {
		console.error('Failed to get newsletter statistics:', error);
		return { error: 'Failed to get newsletter statistics' };
	}
};
