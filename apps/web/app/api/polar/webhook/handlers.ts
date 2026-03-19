/**
 * Event handlers for Polar webhook events
 */

import { getEmailConfig } from '@/lib/config/server-config';
import {
	paymentEmailService,
	extractCustomerInfo,
	formatAmount,
	formatPaymentMethod,
	formatBillingDate
} from '@/lib/payment/services/payment-email.service';
import { WebhookSubscriptionService } from '@/lib/services/webhook-subscription.service';
import { sponsorAdService } from '@/lib/services/sponsor-ad.service';
import { PaymentProvider } from '@/lib/constants';
import { Logger } from '@/lib/logger';
import type { PolarWebhookData } from './types';
import {
	normalizeEmailConfig,
	createEmailData,
	extractSubscriptionInfo,
	extractNestedSubscriptionInfo,
	getSubscriptionFeatures,
	DEFAULT_CURRENCY,
	APP_URL
} from './utils';

const logger = Logger.create('PolarWebhook');
const webhookSubscriptionService = new WebhookSubscriptionService(PaymentProvider.POLAR);

/**
 * Handles successful payment events
 */
export async function handlePaymentSucceeded(data: PolarWebhookData): Promise<void> {
	try {
		// Try to send email, but don't fail if email config is incomplete
		try {
			const rawEmailConfig = await getEmailConfig();
			const emailConfig = normalizeEmailConfig(rawEmailConfig);
			const customerInfo = extractCustomerInfo(data);

			const baseEmailData = {
				customerName: customerInfo.customerName || data.customer?.name || '',
				customerEmail: customerInfo.customerEmail || data.customer?.email || '',
				amount: formatAmount(data.amount_due || data.amount || 0, data.currency || DEFAULT_CURRENCY),
				currency: data.currency || DEFAULT_CURRENCY,
				paymentMethod: formatPaymentMethod(data.payment_method),
				transactionId: data.id || '',
				receiptUrl: data.receipt_url
			};

			const emailData = createEmailData(baseEmailData, emailConfig);
			const emailResult = await paymentEmailService.sendPaymentSuccessEmail(emailData);

			if (emailResult.success) {
				logger.info('Payment success email sent', { transactionId: data.id });
			} else {
				logger.error('Failed to send payment success email', {
					transactionId: data.id,
					error: emailResult.error
				});
			}
		} catch (emailError) {
			// Don't fail the webhook if email sending fails
			logger.warn('Skipping email notification due to configuration error', {
				transactionId: data.id,
				error: emailError instanceof Error ? emailError.message : 'Unknown error'
			});
		}
	} catch (error) {
		logger.error('Error handling payment succeeded', {
			error: error instanceof Error ? error.message : 'Unknown error',
			dataId: data.id
		});
		throw error;
	}
}

/**
 * Handles failed payment events
 */
export async function handlePaymentFailed(data: PolarWebhookData): Promise<void> {
	try {
		// Try to send email, but don't fail if email config is incomplete
		try {
			const rawEmailConfig = await getEmailConfig();
			const emailConfig = normalizeEmailConfig(rawEmailConfig);
			const customerInfo = extractCustomerInfo(data);

			const baseEmailData = {
				customerName: customerInfo.customerName,
				customerEmail: customerInfo.customerEmail,
				amount: formatAmount(data.amount || 0, data.currency || DEFAULT_CURRENCY),
				currency: data.currency || DEFAULT_CURRENCY,
				paymentMethod: formatPaymentMethod(data.payment_method),
				transactionId: data.id || '',
				errorMessage: data.last_payment_error?.message || 'Payment declined',
				retryUrl: data.id ? `${APP_URL}/payment/retry?payment_intent=${data.id}` : `${APP_URL}/payment/retry`,
				updatePaymentUrl: `${APP_URL}/settings/payment-methods`
			};

			const emailData = createEmailData(baseEmailData, emailConfig);
			const emailResult = await paymentEmailService.sendPaymentFailedEmail(emailData);

			if (emailResult.success) {
				logger.info('Payment failed email sent', { transactionId: data.id });
			} else {
				logger.error('Failed to send payment failed email', {
					transactionId: data.id,
					error: emailResult.error
				});
			}
		} catch (emailError) {
			// Don't fail the webhook if email sending fails
			logger.warn('Skipping email notification due to configuration error', {
				transactionId: data.id,
				error: emailError instanceof Error ? emailError.message : 'Unknown error'
			});
		}
	} catch (error) {
		logger.error('Error handling payment failed', {
			error: error instanceof Error ? error.message : 'Unknown error',
			dataId: data.id
		});
		throw error;
	}
}

/**
 * Handles subscription created events
 */
export async function handleSubscriptionCreated(data: PolarWebhookData): Promise<void> {
	logger.info('Processing subscription created', { subscriptionId: data.id });

	// Check if this is a sponsor ad subscription
	if (isSponsorAdSubscription(data)) {
		logger.info('📢 Polar sponsor ad subscription detected', { subscriptionId: data.id });
		await handleSponsorAdActivation(data);
		return;
	}

	try {
		await webhookSubscriptionService.handleSubscriptionCreated(data);

		// Try to send email, but don't fail if email config is incomplete
		try {
			const customerInfo = extractCustomerInfo(data);
			const { planName, amount, billingPeriod } = extractSubscriptionInfo(data);
			const rawEmailConfig = await getEmailConfig();
			const emailConfig = normalizeEmailConfig(rawEmailConfig);

			const emailData = {
				customerName: customerInfo.customerName,
				customerEmail: customerInfo.customerEmail,
				planName,
				amount,
				currency: data.currency || DEFAULT_CURRENCY,
				billingPeriod,
				nextBillingDate: data.current_period_end ? formatBillingDate(data.current_period_end) : undefined,
				subscriptionId: data.id || '',
				manageSubscriptionUrl: `${APP_URL}/settings/subscription`,
				companyName: emailConfig.companyName,
				companyUrl: emailConfig.companyUrl,
				supportEmail: emailConfig.supportEmail || '',
				features: getSubscriptionFeatures(planName)
			};

			const emailResult = await paymentEmailService.sendNewSubscriptionEmail(emailData);

			if (emailResult.success) {
				logger.info('New subscription email sent', { subscriptionId: data.id });
			} else {
				logger.error('Failed to send new subscription email', {
					subscriptionId: data.id,
					error: emailResult.error
				});
			}
		} catch (emailError) {
			// Don't fail the webhook if email sending fails
			logger.warn('Skipping email notification due to configuration error', {
				subscriptionId: data.id,
				error: emailError instanceof Error ? emailError.message : 'Unknown error'
			});
		}
	} catch (error) {
		logger.error('Error handling subscription created', {
			error: error instanceof Error ? error.message : 'Unknown error',
			subscriptionId: data.id
		});
		throw error;
	}
}

/**
 * Handles subscription updated events
 */
export async function handleSubscriptionUpdated(data: PolarWebhookData): Promise<void> {
	logger.info('Processing subscription updated', { subscriptionId: data.id });

	try {
		await webhookSubscriptionService.handleSubscriptionUpdated(data);

		// Try to send email, but don't fail if email config is incomplete
		try {
			const customerInfo = extractCustomerInfo(data);
			const { planName, amount, billingPeriod } = extractSubscriptionInfo(data);
			const rawEmailConfig = await getEmailConfig();
			const emailConfig = normalizeEmailConfig(rawEmailConfig);

			const emailData = {
				customerName: customerInfo.customerName,
				customerEmail: customerInfo.customerEmail,
				planName,
				amount,
				currency: data.currency || DEFAULT_CURRENCY,
				billingPeriod,
				nextBillingDate: data.current_period_end ? formatBillingDate(data.current_period_end) : undefined,
				subscriptionId: data.id || '',
				manageSubscriptionUrl: `${APP_URL}/settings/subscription`,
				companyName: emailConfig.companyName,
				companyUrl: emailConfig.companyUrl,
				supportEmail: emailConfig.supportEmail || '',
				features: getSubscriptionFeatures(planName)
			};

			const emailResult = await paymentEmailService.sendUpdatedSubscriptionEmail(emailData);

			if (emailResult.success) {
				logger.info('Updated subscription email sent', { subscriptionId: data.id });
			} else {
				logger.error('Failed to send updated subscription email', {
					subscriptionId: data.id,
					error: emailResult.error
				});
			}
		} catch (emailError) {
			// Don't fail the webhook if email sending fails
			logger.warn('Skipping email notification due to configuration error', {
				subscriptionId: data.id,
				error: emailError instanceof Error ? emailError.message : 'Unknown error'
			});
		}
	} catch (error) {
		logger.error('Error handling subscription updated', {
			error: error instanceof Error ? error.message : 'Unknown error',
			subscriptionId: data.id
		});
		throw error;
	}
}

/**
 * Handles subscription cancelled events
 */
export async function handleSubscriptionCancelled(data: PolarWebhookData): Promise<void> {
	logger.info('Processing subscription cancelled', { subscriptionId: data.id });

	// Check if this is a sponsor ad subscription
	if (isSponsorAdSubscription(data)) {
		logger.info('📢 Polar sponsor ad subscription cancellation detected', { subscriptionId: data.id });
		await handleSponsorAdCancellation(data);
		return;
	}

	try {
		await webhookSubscriptionService.handleSubscriptionCancelled(data);

		// Try to send email, but don't fail if email config is incomplete
		try {
			const customerInfo = extractCustomerInfo(data);
			const { planName, amount, billingPeriod } = extractSubscriptionInfo(data);
			const rawEmailConfig = await getEmailConfig();
			const emailConfig = normalizeEmailConfig(rawEmailConfig);

			const emailData = {
				...createEmailData(
					{
						customerName: customerInfo.customerName,
						customerEmail: customerInfo.customerEmail,
						planName,
						amount,
						currency: data.currency || DEFAULT_CURRENCY,
						billingPeriod,
						subscriptionId: data.id || '',
						cancellationDate: data.canceled_at ? formatBillingDate(data.canceled_at) : undefined,
						cancellationReason: data.cancellation_details?.reason || 'Cancellation requested by user',
						reactivateUrl: data.id
							? `${APP_URL}/subscription/reactivate?subscription=${data.id}`
							: `${APP_URL}/subscription/reactivate`
					},
					emailConfig
				)
			};

			const emailResult = await paymentEmailService.sendCancelledSubscriptionEmail(emailData);

			if (emailResult.success) {
				logger.info('Cancelled subscription email sent', { subscriptionId: data.id });
			} else {
				logger.error('Failed to send cancelled subscription email', {
					subscriptionId: data.id,
					error: emailResult.error
				});
			}
		} catch (emailError) {
			// Don't fail the webhook if email sending fails
			logger.warn('Skipping email notification due to configuration error', {
				subscriptionId: data.id,
				error: emailError instanceof Error ? emailError.message : 'Unknown error'
			});
		}
	} catch (error) {
		logger.error('Error handling subscription cancelled', {
			error: error instanceof Error ? error.message : 'Unknown error',
			subscriptionId: data.id
		});
		throw error;
	}
}

/**
 * Handles subscription payment succeeded events
 */
export async function handleSubscriptionPaymentSucceeded(data: PolarWebhookData): Promise<void> {
	logger.info('Processing subscription payment succeeded', { invoiceId: data.id });

	// Check if this is a sponsor ad subscription (for renewals)
	if (isSponsorAdSubscription(data)) {
		logger.info('📢 Polar sponsor ad payment succeeded (renewal)', { invoiceId: data.id });
		await handleSponsorAdRenewal(data);
		return;
	}

	try {
		await webhookSubscriptionService.handleSubscriptionPaymentSucceeded(data);

		// Try to send email, but don't fail if email config is incomplete
		try {
			const customerInfo = extractCustomerInfo(data);
			const { planName, billingPeriod, subscription } = extractNestedSubscriptionInfo(data);
			const rawEmailConfig = await getEmailConfig();
			const emailConfig = normalizeEmailConfig(rawEmailConfig);

			const emailData = {
				...createEmailData(
					{
						customerName: customerInfo.customerName,
						customerEmail: customerInfo.customerEmail,
						amount: formatAmount(data.amount_paid || data.amount || 0, data.currency || DEFAULT_CURRENCY),
						currency: data.currency || DEFAULT_CURRENCY,
						paymentMethod: 'Credit Card',
						transactionId: data.id || '',
						planName,
						billingPeriod,
						nextBillingDate: subscription?.current_period_end
							? formatBillingDate(subscription.current_period_end)
							: undefined,
						receiptUrl: data.receipt_url
					},
					emailConfig
				)
			};

			const emailResult = await paymentEmailService.sendSubscriptionPaymentSuccessEmail(emailData);

			if (emailResult.success) {
				logger.info('Subscription payment success email sent', { invoiceId: data.id });
			} else {
				logger.error('Failed to send subscription payment success email', {
					invoiceId: data.id,
					error: emailResult.error
				});
			}
		} catch (emailError) {
			// Don't fail the webhook if email sending fails
			logger.warn('Skipping email notification due to configuration error', {
				invoiceId: data.id,
				error: emailError instanceof Error ? emailError.message : 'Unknown error'
			});
		}
	} catch (error) {
		logger.error('Error handling subscription payment succeeded', {
			error: error instanceof Error ? error.message : 'Unknown error',
			invoiceId: data.id
		});
		throw error;
	}
}

/**
 * Handles subscription payment failed events
 */
export async function handleSubscriptionPaymentFailed(data: PolarWebhookData): Promise<void> {
	logger.info('Processing subscription payment failed', { invoiceId: data.id });

	try {
		await webhookSubscriptionService.handleSubscriptionPaymentFailed(data);

		// Try to send email, but don't fail if email config is incomplete
		try {
			const customerInfo = extractCustomerInfo(data);
			const { planName, billingPeriod } = extractNestedSubscriptionInfo(data);
			const rawEmailConfig = await getEmailConfig();
			const emailConfig = normalizeEmailConfig(rawEmailConfig);

			const emailData = {
				...createEmailData(
					{
						customerName: customerInfo.customerName,
						customerEmail: customerInfo.customerEmail,
						amount: formatAmount(data.amount_due || data.amount || 0, data.currency || DEFAULT_CURRENCY),
						currency: data.currency || DEFAULT_CURRENCY,
						paymentMethod: 'Credit Card',
						transactionId: data.id || '',
						planName,
						billingPeriod,
						errorMessage: data.last_payment_error?.message || 'Payment declined',
						retryUrl: data.id
							? `${APP_URL}/subscription/retry?invoice=${data.id}`
							: `${APP_URL}/subscription/retry`,
						updatePaymentUrl: `${APP_URL}/settings/payment-methods`
					},
					emailConfig
				)
			};

			const emailResult = await paymentEmailService.sendSubscriptionPaymentFailedEmail(emailData);

			if (emailResult.success) {
				logger.info('Subscription payment failed email sent', { invoiceId: data.id });
			} else {
				logger.error('Failed to send subscription payment failed email', {
					invoiceId: data.id,
					error: emailResult.error
				});
			}
		} catch (emailError) {
			// Don't fail the webhook if email sending fails
			logger.warn('Skipping email notification due to configuration error', {
				invoiceId: data.id,
				error: emailError instanceof Error ? emailError.message : 'Unknown error'
			});
		}
	} catch (error) {
		logger.error('Error handling subscription payment failed', {
			error: error instanceof Error ? error.message : 'Unknown error',
			invoiceId: data.id
		});
		throw error;
	}
}

// ######################### Sponsor Ad Webhook Handlers #########################

/**
 * Check if subscription metadata indicates a sponsor ad
 * Polar uses metadata field for custom data
 */
function isSponsorAdSubscription(data: PolarWebhookData): boolean {
	const metadata = data.metadata;
	const subscriptionMetadata = data.subscription?.metadata;

	return metadata?.type === 'sponsor_ad' || subscriptionMetadata?.type === 'sponsor_ad';
}

/**
 * Get sponsor ad ID from subscription metadata
 */
function getSponsorAdId(data: PolarWebhookData): string | null {
	const metadata = data.metadata;
	const subscriptionMetadata = data.subscription?.metadata;

	return metadata?.sponsorAdId || subscriptionMetadata?.sponsorAdId || null;
}

/**
 * Handle sponsor ad subscription created/payment succeeded
 */
async function handleSponsorAdActivation(data: PolarWebhookData): Promise<void> {
	const sponsorAdId = getSponsorAdId(data);

	if (!sponsorAdId) {
		logger.error('Sponsor ad ID not found in Polar metadata', { dataId: data.id });
		return;
	}

	const subscriptionId = data.id || '';
	const customerId = data.customer_id || data.customer?.id || '';

	logger.info('Confirming payment for sponsor ad via Polar', { sponsorAdId });

	try {
		const confirmedAd = await sponsorAdService.confirmPayment(sponsorAdId, subscriptionId, customerId);

		if (confirmedAd) {
			logger.info('Sponsor ad payment confirmed, now pending admin review', { sponsorAdId });
		} else {
			logger.error('Failed to confirm sponsor ad payment', { sponsorAdId });
			throw new Error(`Failed to confirm sponsor ad payment for ${sponsorAdId}`);
		}
	} catch (error) {
		logger.error('Error confirming sponsor ad payment', {
			sponsorAdId,
			error: error instanceof Error ? error.message : 'Unknown error'
		});
		throw error;
	}
}

/**
 * Handle sponsor ad subscription cancelled
 */
async function handleSponsorAdCancellation(data: PolarWebhookData): Promise<void> {
	const sponsorAdId = getSponsorAdId(data);

	if (!sponsorAdId) {
		logger.error('Sponsor ad ID not found in Polar metadata', { dataId: data.id });
		return;
	}

	logger.info('Cancelling sponsor ad via Polar', { sponsorAdId });

	try {
		const cancelledAd = await sponsorAdService.cancelSponsorAd(sponsorAdId, 'Polar subscription cancelled');

		if (cancelledAd) {
			logger.info('Sponsor ad cancelled successfully', { sponsorAdId });
		} else {
			logger.error('Failed to cancel sponsor ad', { sponsorAdId });
			throw new Error(`Failed to cancel sponsor ad ${sponsorAdId}`);
		}
	} catch (error) {
		logger.error('Error cancelling sponsor ad', {
			sponsorAdId,
			error: error instanceof Error ? error.message : 'Unknown error'
		});
		throw error;
	}
}

/**
 * Handle sponsor ad subscription renewal
 */
async function handleSponsorAdRenewal(data: PolarWebhookData): Promise<void> {
	const sponsorAdId = getSponsorAdId(data);

	if (!sponsorAdId) {
		logger.error('Sponsor ad ID not found in Polar metadata', { dataId: data.id });
		return;
	}

	logger.info('Renewing sponsor ad via Polar', { sponsorAdId });

	try {
		const renewedAd = await sponsorAdService.renewSponsorAd(sponsorAdId);

		if (renewedAd) {
			logger.info('Sponsor ad renewed successfully', { sponsorAdId });
		} else {
			logger.error('Failed to renew sponsor ad', { sponsorAdId });
			throw new Error(`Failed to renew sponsor ad ${sponsorAdId}`);
		}
	} catch (error) {
		logger.error('Error renewing sponsor ad', {
			sponsorAdId,
			error: error instanceof Error ? error.message : 'Unknown error'
		});
		throw error;
	}
}
