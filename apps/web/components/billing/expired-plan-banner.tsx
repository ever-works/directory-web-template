'use client';

/**
 * Expired Plan Banner Component
 *
 * Displays warning or expired state banners for subscription expiration.
 * Two main states:
 * 1. Warning: Subscription expires soon
 * 2. Expired: Subscription has expired
 */

import { useState, useMemo } from 'react';
import { AlertTriangle, Clock, X, CreditCard, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentPlan, PAYMENT_PLAN_NAMES } from '@/lib/constants';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { usePlanStatus } from '@/hooks/use-plan-status';

export interface ExpiredPlanBannerProps {
	/** Display name of the plan (e.g., "Premium Plan") */
	planName: string;
	/** Expiration date */
	expiresAt: Date | null;
	/** Whether the plan has already expired */
	isExpired: boolean;
	/** Days until expiration (negative if already expired) */
	daysUntilExpiration: number | null;
	/** Custom warning message (optional, will use default if not provided) */
	warningMessage?: string | null;
	/** Callback when renew button is clicked */
	onRenewClick?: () => void;
	/** Whether to allow dismissing the banner */
	dismissible?: boolean;
	/** Additional CSS classes */
	className?: string;
	/** Compact mode for inline use */
	compact?: boolean;
}

/**
 * Format expiration date for display
 */
function formatExpirationDate(date: Date | null): string {
	if (!date) return '';

	return date.toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

/**
 * Get urgency level based on days until expiration
 */
function getUrgencyLevel(daysUntil: number | null, isExpired: boolean): 'low' | 'medium' | 'high' | 'critical' {
	if (isExpired) return 'critical';
	if (daysUntil === null) return 'low';
	if (daysUntil <= 1) return 'critical';
	if (daysUntil <= 3) return 'high';
	if (daysUntil <= 7) return 'medium';
	return 'low';
}

export function ExpiredPlanBanner({
	planName,
	expiresAt,
	isExpired,
	daysUntilExpiration,
	warningMessage,
	onRenewClick,
	dismissible = true,
	className,
	compact = false
}: ExpiredPlanBannerProps) {
	const t = useTranslations('billing');
	const tCommon = useTranslations('common');
	const [isDismissed, setIsDismissed] = useState(false);

	const urgency = useMemo(() => getUrgencyLevel(daysUntilExpiration, isExpired), [daysUntilExpiration, isExpired]);

	// Don't render if dismissed or no warning needed
	if (isDismissed || (!isExpired && urgency === 'low')) {
		return null;
	}

	// Generate default message if not provided
	const message =
		warningMessage ||
		(isExpired
			? t('EXPIRED_MESSAGE', { planName })
			: daysUntilExpiration === 0
				? t('EXPIRES_TODAY', { planName })
				: daysUntilExpiration === 1
					? t('EXPIRES_TOMORROW', { planName })
					: t('EXPIRES_IN_DAYS', { planName, days: daysUntilExpiration ?? 0 }));

	// Styling based on urgency
	const urgencyStyles = {
		low: {
			container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50',
			icon: 'text-blue-500 dark:text-blue-400',
			text: 'text-blue-800 dark:text-blue-200',
			button: 'bg-blue-600 hover:bg-blue-700 text-white'
		},
		medium: {
			container: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50',
			icon: 'text-amber-500 dark:text-amber-400',
			text: 'text-amber-800 dark:text-amber-200',
			button: 'bg-amber-600 hover:bg-amber-700 text-white'
		},
		high: {
			container: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700/50',
			icon: 'text-orange-500 dark:text-orange-400',
			text: 'text-orange-800 dark:text-orange-200',
			button: 'bg-orange-600 hover:bg-orange-700 text-white'
		},
		critical: {
			container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50',
			icon: 'text-red-500 dark:text-red-400',
			text: 'text-red-800 dark:text-red-200',
			button: 'bg-red-600 hover:bg-red-700 text-white'
		}
	};

	const styles = urgencyStyles[urgency];
	const Icon = isExpired ? AlertTriangle : Clock;

	if (compact) {
		return (
			<div
				className={cn(
					'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm',
					styles.container,
					className
				)}
			>
				<Icon className={cn('w-4 h-4 shrink-0', styles.icon)} />
				<span className={cn('font-medium', styles.text)}>
					{isExpired ? t('EXPIRED_LABEL') : t('EXPIRES_IN_DAYS_LABEL', { days: daysUntilExpiration ?? 0 })}
				</span>
				{onRenewClick && (
					<button
						onClick={onRenewClick}
						className={cn('px-2 py-0.5 rounded text-xs font-medium transition-colors', styles.button)}
					>
						{t('RENEW')}
					</button>
				)}
			</div>
		);
	}

	return (
		<div
			className={cn('relative rounded-lg border p-4 shadow-sm', styles.container, className)}
			role="alert"
			aria-live="polite"
		>
			<div className="flex items-start gap-3">
				{/* Icon */}
				<div
					className={cn(
						'shrink-0 p-2 rounded-full',
						isExpired ? 'bg-red-100 dark:bg-red-800/30' : 'bg-amber-100 dark:bg-amber-800/30'
					)}
				>
					<Icon className={cn('w-5 h-5', styles.icon)} />
				</div>

				{/* Content */}
				<div className="flex-1 min-w-0">
					<h4 className={cn('font-semibold', styles.text)}>
						{isExpired ? t('SUBSCRIPTION_EXPIRED') : t('SUBSCRIPTION_EXPIRING_SOON')}
					</h4>
					<p className={cn('mt-1 text-sm', styles.text, 'opacity-90')}>{message}</p>

					{/* Expiration date */}
					{expiresAt && (
						<p className={cn('mt-1 text-xs', styles.text, 'opacity-70')}>
							{isExpired ? t('EXPIRED_ON') : t('EXPIRES')}: {formatExpirationDate(expiresAt)}
						</p>
					)}

					{/* Actions */}
					<div className="mt-3 flex items-center gap-3">
						{onRenewClick ? (
							<button
								onClick={onRenewClick}
								className={cn(
									'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm',
									styles.button
								)}
							>
								{isExpired ? (
									<>
										<RefreshCw className="w-4 h-4" />
										{t('RENEW_SUBSCRIPTION')}
									</>
								) : (
									<>
										<CreditCard className="w-4 h-4" />
										{t('MANAGE_SUBSCRIPTION')}
									</>
								)}
							</button>
						) : (
							<Link
								href="/client/settings/profile/billing"
								className={cn(
									'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm',
									styles.button
								)}
							>
								{isExpired ? (
									<>
										<RefreshCw className="w-4 h-4" />
										{t('RENEW_SUBSCRIPTION')}
									</>
								) : (
									<>
										<CreditCard className="w-4 h-4" />
										{t('MANAGE_SUBSCRIPTION')}
									</>
								)}
							</Link>
						)}
					</div>
				</div>

				{/* Dismiss button */}
				{dismissible && !isExpired && (
					<button
						onClick={() => setIsDismissed(true)}
						className={cn(
							'shrink-0 p-1 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10',
							styles.text,
							'opacity-60 hover:opacity-100'
						)}
						aria-label={tCommon('CLOSE')}
					>
						<X className="w-4 h-4" />
					</button>
				)}
			</div>
		</div>
	);
}

/**
 * Wrapper component that automatically uses plan status hook
 */
export function AutoExpiredPlanBanner({
	className,
	compact,
	onRenewClick
}: Pick<ExpiredPlanBannerProps, 'className' | 'compact' | 'onRenewClick'>) {
	const planStatus = usePlanStatus();

	// Don't render if no warning needed
	if (!planStatus.isExpired && !planStatus.isInWarningPeriod) {
		return null;
	}

	// Get plan display name
	const planName = PAYMENT_PLAN_NAMES[planStatus.planId as PaymentPlan] || 'Subscription';

	return (
		<ExpiredPlanBanner
			planName={planName}
			expiresAt={planStatus.expiresAt}
			isExpired={planStatus.isExpired}
			daysUntilExpiration={planStatus.daysUntilExpiration}
			warningMessage={planStatus.warningMessage}
			onRenewClick={onRenewClick}
			className={className}
			compact={compact}
		/>
	);
}
