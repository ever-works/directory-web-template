/**
 * Subscription Background Jobs
 * Contains reusable job functions for subscription management
 */

import { subscriptionService } from '@/lib/services/subscription.service';
import * as queries from '@/lib/db/queries';
import { EmailService, EmailServiceConfig } from '@/lib/mail';
import { getRenewalReminderTemplate } from '@/lib/mail/templates/subscription-renewal-reminder';
import { getCachedConfig } from '@/lib/content';

/**
 * Create email service helper
 */
async function getEmailService(): Promise<EmailService> {
	const config = await getCachedConfig();
	const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ever.works';

	const emailConfig: EmailServiceConfig = {
		provider: config.mail?.provider || process.env.EMAIL_PROVIDER || 'resend',
		defaultFrom: config.mail?.default_from || process.env.EMAIL_FROM || 'info@ever.works',
		domain: config.app_url || appUrl,
		apiKeys: {
			resend: process.env.RESEND_API_KEY || '',
			novu: process.env.NOVU_API_KEY || ''
		}
	};

	return new EmailService(emailConfig);
}

/**
 * Job Result interface for consistent reporting
 */
export interface JobResult {
	success: boolean;
	processed: number;
	successful: number;
	failed: number;
	errors: string[];
	duration: string;
}

/**
 * Subscription Renewal Reminder Job
 * Finds subscriptions expiring in 7 days and sends reminder emails
 * Should be run daily (e.g., via cron or background job manager)
 */
export async function subscriptionRenewalReminderJob(): Promise<JobResult> {
	const startTime = Date.now();
	const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ever.works';
	const results = {
		success: true,
		processed: 0,
		successful: 0,
		failed: 0,
		errors: [] as string[]
	};

	try {
		// Get subscriptions due for renewal reminder (7 days look-ahead)
		const subscriptionsDueForReminder = await subscriptionService.getSubscriptionsDueForRenewalReminder(7);

		console.log(
			`[SubscriptionJob] Found ${subscriptionsDueForReminder.length} subscriptions due for renewal reminder`
		);

		// Get email service once for all emails
		const emailService = await getEmailService();
		const isEmailAvailable = emailService.isServiceAvailable();

		if (!isEmailAvailable) {
			console.warn('[SubscriptionJob] Email service not available, skipping job');
			return {
				...results,
				success: false,
				errors: ['Email service not available'],
				duration: `${Date.now() - startTime}ms`
			};
		}

		for (const subscription of subscriptionsDueForReminder) {
			results.processed++;

			try {
				// Get user details
				const subscriptionWithUser = await queries.getSubscriptionWithUser(subscription.id);
				if (!subscriptionWithUser?.user) {
					console.warn(`[SubscriptionJob] No user found for subscription ${subscription.id}`);
					results.failed++;
					results.errors.push(`No user for subscription ${subscription.id}`);
					continue;
				}

				const user = subscriptionWithUser.user;
				const userEmail = user.email;

				if (!userEmail) {
					console.warn(`[SubscriptionJob] No email for user ${user.id}`);
					results.failed++;
					results.errors.push(`No email for user ${user.id}`);
					continue;
				}

				// Prepare email data
				const renewalDate = subscription.endDate
					? new Date(subscription.endDate).toLocaleDateString('en-US', {
							weekday: 'long',
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						})
					: 'upcoming';

				const amount = subscription.amount ? (subscription.amount / 100).toFixed(2) : '0.00';

				const emailTemplate = getRenewalReminderTemplate({
					customerName: 'Valued Customer',
					customerEmail: userEmail,
					planName: subscriptionService.getPlanDisplayName(subscription.planId),
					amount,
					currency: subscription.currency || 'usd',
					billingPeriod: subscription.interval || 'month',
					renewalDate,
					subscriptionId: subscription.subscriptionId || subscription.id,
					manageSubscriptionUrl: `${appUrl}/settings/subscription`,
					disableAutoRenewalUrl: `${appUrl}/settings/subscription?action=disable-auto-renewal`
				});

				// Send email
				await emailService.sendCustomEmail({
					from: process.env.EMAIL_FROM || 'info@ever.works',
					to: userEmail,
					subject: emailTemplate.subject,
					html: emailTemplate.html,
					text: emailTemplate.text
				});

				try {
					// Mark reminder as sent
					await subscriptionService.markRenewalReminderSent(subscription.id);
					console.log(
						`[SubscriptionJob] Sent renewal reminder to ${userEmail} for subscription ${subscription.id}`
					);
				} catch (markError) {
					console.error(
						`[SubscriptionJob] Failed to mark reminder as sent for subscription ${subscription.id}:`,
						markError
					);
					results.errors.push(
						`Email sent but failed to mark for ${subscription.id}: ${markError instanceof Error ? markError.message : 'Unknown error'}`
					);
				}

				results.successful++;
			} catch (emailError) {
				console.error(
					`[SubscriptionJob] Failed to send reminder for subscription ${subscription.id}:`,
					emailError
				);
				results.failed++;
				results.errors.push(
					`Failed for ${subscription.id}: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`
				);
			}
		}

		const duration = Date.now() - startTime;
		console.log(`[SubscriptionJob] Renewal reminders completed in ${duration}ms`, results);

		return {
			...results,
			duration: `${duration}ms`
		};
	} catch (error) {
		console.error('[SubscriptionJob] Renewal reminder job failed:', error);
		return {
			...results,
			success: false,
			errors: [...results.errors, error instanceof Error ? error.message : 'Unknown error'],
			duration: `${Date.now() - startTime}ms`
		};
	}
}

/**
 * Subscription Expired Cleanup Job
 * Finds and handles subscriptions that have expired
 * Should be run daily
 */
export async function subscriptionExpiredCleanupJob(): Promise<JobResult> {
	const startTime = Date.now();
	const results = {
		success: true,
		processed: 0,
		successful: 0,
		failed: 0,
		errors: [] as string[]
	};

	try {
		// Get subscriptions to cancel (auto-renewal disabled and past end date)
		const subscriptionsToCancel = await queries.getSubscriptionsToCancel();

		console.log(`[SubscriptionJob] Found ${subscriptionsToCancel.length} expired subscriptions to cancel`);

		for (const subscription of subscriptionsToCancel) {
			results.processed++;

			try {
				await subscriptionService.cancelSubscription(
					subscription.id,
					'Subscription expired with auto-renewal disabled',
					false // immediate cancellation
				);

				console.log(`[SubscriptionJob] Cancelled expired subscription ${subscription.id}`);
				results.successful++;
			} catch (error) {
				console.error(`[SubscriptionJob] Failed to cancel subscription ${subscription.id}:`, error);
				results.failed++;
				results.errors.push(
					`Failed to cancel ${subscription.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
				);
			}
		}

		const duration = Date.now() - startTime;
		console.log(`[SubscriptionJob] Expired cleanup completed in ${duration}ms`, results);

		return {
			...results,
			duration: `${duration}ms`
		};
	} catch (error) {
		console.error('[SubscriptionJob] Expired cleanup job failed:', error);
		return {
			...results,
			success: false,
			errors: [...results.errors, error instanceof Error ? error.message : 'Unknown error'],
			duration: `${Date.now() - startTime}ms`
		};
	}
}
