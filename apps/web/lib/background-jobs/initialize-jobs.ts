/**
 * Centralized background job initialization
 *
 * This module handles registration of all background jobs with BackgroundJobManager.
 * Uses dynamic imports to prevent webpack from bundling Node.js modules.
 */

// Singleton guard to prevent multiple initializations
let isInitialized = false;

export async function initializeBackgroundJobs(): Promise<void> {
	// Skip during build time
	if (process.env.NEXT_PHASE === 'phase-production-build') {
		return;
	}

	// Singleton guard - only initialize once per process
	if (isInitialized) {
		return;
	}

	isInitialized = true;
	// Lazy-load BackgroundJobManager to avoid static analysis issues
	const { getJobManager } = await import('@/lib/background-jobs');
	const manager = getJobManager();

	// Register repository sync job
	// Note: Uses dynamic import inside callback to prevent webpack from analyzing
	// the sync-service -> repository -> isomorphic-git chain at build time
	manager.scheduleJob(
		'repository-sync',
		'Repository Synchronization',
		async () => {
			// Dynamic import prevents webpack bundling of Node.js modules
			const { syncManager } = await import('@/lib/services/sync-service');

			// SyncManager handles:
			// - Timeout wrapper
			// - Retry logic
			// - Mutex lock
			// - Status tracking
			await syncManager.performSync();
		},
		5 * 60 * 1000 // 5 minutes interval
	);

	// Register subscription renewal reminder job
	// Runs daily to send renewal reminders to users with subscriptions expiring in 7 days
	manager.scheduleCronJob(
		'subscription-renewal-reminder',
		'Subscription Renewal Reminder',
		async () => {
			// Dynamic import to prevent bundling issues
			const { subscriptionRenewalReminderJob } = await import('@/lib/services/subscription-jobs');
			await subscriptionRenewalReminderJob();
		},
		'0 9 * * *' // Daily at 9:00 AM
	);

	// Register subscription expiration cleanup job
	// Runs daily at midnight to process and expire subscriptions past their end date
	manager.scheduleCronJob(
		'subscription-expired-cleanup',
		'Subscription Expiration Cleanup',
		async () => {
			// Dynamic import to prevent bundling issues
			const { subscriptionService } = await import('@/lib/services/subscription.service');
			await subscriptionService.processExpiredSubscriptions();
		},
		'0 0 * * *' // Daily at midnight
	);

	console.log('[BACKGROUND_JOBS] All background jobs registered with BackgroundJobManager');
}
