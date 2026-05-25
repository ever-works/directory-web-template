'use client';

import React, { useCallback } from 'react';
import {
	TrendingUp,
	DollarSign,
	Calendar,
	CreditCard,
	Users,
	Clock,
	BarChart3,
	Zap,
	Crown,
	Loader2
} from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { toast } from 'sonner';
import { useLocale } from 'next-intl';
import { formatCurrencyAmount } from '@/lib/utils/currency-format';

// Dashboard design-system tokens (mirrors `components/dashboard/styles.ts` and
// `stats-card.tsx`): neutral palette, white/3 dark surface, monochrome icon
// tiles. Keeps the billing KPIs visually identical to the client dashboard.
const STAT_CARD = 'bg-white dark:bg-white/3 rounded-xl p-5 border border-neutral-200 dark:border-white/8';
const STAT_LABEL = 'text-xs font-medium text-neutral-500 dark:text-neutral-400';
const STAT_VALUE = 'text-xl font-semibold text-neutral-900 dark:text-white tracking-tight';
const STAT_DESC = 'mt-1.5 text-xs text-neutral-400 dark:text-neutral-500';
const STAT_ICON_TILE = 'p-2 bg-neutral-100 dark:bg-white/8 rounded-lg';
const STAT_ICON = 'h-4 w-4 text-neutral-500 dark:text-neutral-400';
const PANEL = 'bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl p-5';

interface BillingStatsProps {
	planName: string;
	totalSpent: number;
	activePayments: number;
	monthlyAverage: number;
	hasActiveSubscription: boolean;
	totalPayments: number;
	currency?: string;
	lastMonthSpent?: number;
	growthRate?: number;
	nextBillingDate?: string;
	daysUntilRenewal?: number;
	currentPeriodEnd?: string;
	/** Switches the billing page to the Payment History tab. */
	onViewHistory?: () => void;
}

interface StatTileProps {
	label: string;
	value: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
}

function StatTile({ label, value, description, icon: Icon }: StatTileProps) {
	return (
		<div className={STAT_CARD}>
			<div className="flex items-start justify-between mb-3">
				<h3 className={STAT_LABEL}>{label}</h3>
				<div className={STAT_ICON_TILE} aria-hidden="true">
					<Icon className={STAT_ICON} />
				</div>
			</div>
			<p className={STAT_VALUE}>{value}</p>
			<p className={STAT_DESC}>{description}</p>
		</div>
	);
}

export function BillingStats({
	planName,
	totalSpent,
	activePayments,
	monthlyAverage,
	hasActiveSubscription,
	totalPayments,
	currency = 'USD',
	lastMonthSpent,
	growthRate,
	nextBillingDate,
	daysUntilRenewal,
	currentPeriodEnd,
	onViewHistory
}: BillingStatsProps) {
	const { createBillingPortalSession, isCreateBillingPortalSessionPending } = useSubscription();
	const locale = useLocale();

	const getRenewalStatus = () => {
		if (!daysUntilRenewal) return null;

		if (daysUntilRenewal <= 7) {
			return {
				color: 'text-red-600 dark:text-red-400',
				icon: Clock,
				label: 'Renewing Soon',
				urgency: 'high'
			};
		} else if (daysUntilRenewal <= 30) {
			return {
				color: 'text-amber-600 dark:text-amber-400',
				icon: Calendar,
				label: 'Upcoming Renewal',
				urgency: 'medium'
			};
		} else {
			return {
				color: 'text-emerald-600 dark:text-emerald-400',
				icon: Calendar,
				label: 'Active',
				urgency: 'low'
			};
		}
	};

	const renewalStatus = getRenewalStatus();

	const handleManagePlan = useCallback(async () => {
		const toastId = toast.loading('Opening billing portal...', { duration: Infinity });
		try {
			const result = await createBillingPortalSession.mutateAsync();
			const portalUrl = result?.data?.url;
			if (!portalUrl) {
				throw new Error('Portal URL not available in response');
			}
			toast.success('Redirecting to billing portal...', { id: toastId, duration: 2000 });
			window.location.href = portalUrl;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message.replace(/^HTTP \d+:\s*/, '') : 'Failed to open billing portal';
			toast.error(errorMessage, { id: toastId, duration: 5000 });
		}
	}, [createBillingPortalSession]);

	return (
		<div className="space-y-4">
			{/* Main KPI grid — mirrors the dashboard StatsCard grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<StatTile
					label="Total Spent"
					value={formatCurrencyAmount(totalSpent, currency, locale)}
					description={totalPayments > 0 ? `${totalPayments} transactions` : 'No transactions yet'}
					icon={DollarSign}
				/>
				<StatTile
					label="Active Payments"
					value={String(activePayments)}
					description={activePayments > 0 ? 'Successfully processed' : 'No active payments'}
					icon={CreditCard}
				/>
				<StatTile
					label="Monthly Average"
					value={formatCurrencyAmount(monthlyAverage, currency, locale)}
					description={totalPayments > 0 ? 'Based on all payments' : 'Calculated from transactions'}
					icon={BarChart3}
				/>
				<StatTile
					label="Plan Status"
					value={hasActiveSubscription ? 'Active' : 'Free'}
					description={hasActiveSubscription ? planName : 'Basic Plan'}
					icon={Crown}
				/>
			</div>

			{/* Additional Metrics Row */}
			{(lastMonthSpent !== undefined || growthRate !== undefined || renewalStatus) && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{/* Monthly Comparison */}
					{lastMonthSpent !== undefined && (
						<div className={PANEL}>
							<div className="flex items-center justify-between mb-4">
								<h4 className="text-sm font-semibold text-neutral-900 dark:text-white">Monthly Comparison</h4>
								<Calendar className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
							</div>
							<div className="space-y-3 text-sm">
								<div className="flex justify-between items-center">
									<span className="text-neutral-500 dark:text-neutral-400">This Month:</span>
									<span className="font-semibold text-neutral-900 dark:text-white">
										{formatCurrencyAmount(totalSpent, currency, locale)}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-neutral-500 dark:text-neutral-400">Last Month:</span>
									<span className="font-semibold text-neutral-900 dark:text-white">
										{formatCurrencyAmount(lastMonthSpent || 0, currency, locale)}
									</span>
								</div>
								<div className="pt-2 border-t border-neutral-100 dark:border-white/[0.06]">
									<div className="flex justify-between items-center">
										<span className="text-neutral-500 dark:text-neutral-400">Change:</span>
										<span
											className={`font-semibold ${
												lastMonthSpent && lastMonthSpent > totalSpent
													? 'text-emerald-600 dark:text-emerald-400'
													: 'text-red-600 dark:text-red-400'
											}`}
										>
											{lastMonthSpent && lastMonthSpent > totalSpent ? '↓' : '↑'}{' '}
											{formatCurrencyAmount(
												Math.abs((lastMonthSpent || 0) - totalSpent),
												currency,
												locale
											)}
										</span>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Growth Rate */}
					{growthRate !== undefined && (
						<div className={PANEL}>
							<div className="flex items-center justify-between mb-4">
								<h4 className="text-sm font-semibold text-neutral-900 dark:text-white">Growth Rate</h4>
								<TrendingUp className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
							</div>
							<div className="space-y-3 text-sm">
								<div className="flex justify-between items-center">
									<span className="text-neutral-500 dark:text-neutral-400">Monthly Growth:</span>
									<span
										className={`font-semibold ${
											growthRate > 0
												? 'text-emerald-600 dark:text-emerald-400'
												: 'text-red-600 dark:text-red-400'
										}`}
									>
										{growthRate > 0 ? '+' : ''}
										{growthRate.toFixed(1)}%
									</span>
								</div>
								<div className="pt-2 border-t border-neutral-100 dark:border-white/[0.06]">
									<div className="text-xs text-neutral-500 dark:text-neutral-400">
										{growthRate > 0
											? 'Your spending is increasing month over month'
											: growthRate < 0
												? 'Your spending has decreased compared to last month'
												: 'Your spending remains consistent'}
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Renewal Status */}
					{renewalStatus && (
						<div className={PANEL}>
							<div className="flex items-center justify-between mb-4">
								<h4 className="text-sm font-semibold text-neutral-900 dark:text-white">Renewal Status</h4>
								<renewalStatus.icon className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
							</div>
							<div className="space-y-3 text-sm">
								<div className="flex justify-between items-center">
									<span className="text-neutral-500 dark:text-neutral-400">Status:</span>
									<span className={`font-semibold ${renewalStatus.color}`}>{renewalStatus.label}</span>
								</div>
								{nextBillingDate && (
									<div className="flex justify-between items-center">
										<span className="text-neutral-500 dark:text-neutral-400">Next Billing:</span>
										<span className="font-semibold text-neutral-900 dark:text-white">
											{new Date(nextBillingDate).toLocaleDateString()}
										</span>
									</div>
								)}
								{currentPeriodEnd && (
									<div className="flex justify-between items-center">
										<span className="text-neutral-500 dark:text-neutral-400">Period Ends:</span>
										<span className="font-semibold text-neutral-900 dark:text-white">
											{new Date(currentPeriodEnd).toLocaleDateString()}
										</span>
									</div>
								)}
								{daysUntilRenewal && (
									<div className="pt-2 border-t border-neutral-100 dark:border-white/[0.06]">
										<div className="flex justify-between items-center">
											<span className="text-neutral-500 dark:text-neutral-400">Days Left:</span>
											<span
												className={`font-semibold ${
													renewalStatus.urgency === 'high'
														? 'text-red-600 dark:text-red-400'
														: renewalStatus.urgency === 'medium'
															? 'text-amber-600 dark:text-amber-400'
															: 'text-emerald-600 dark:text-emerald-400'
												}`}
											>
												{daysUntilRenewal} days
											</span>
										</div>
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			)}

			{/* Quick Actions */}
			<div className={PANEL}>
				<div className="flex items-center justify-between gap-4 flex-wrap">
					<div className="flex items-center gap-3">
						<div className={STAT_ICON_TILE}>
							<Zap className={STAT_ICON} />
						</div>
						<div>
							<h4 className="text-sm font-semibold text-neutral-900 dark:text-white">Quick Actions</h4>
							<p className="text-xs text-neutral-500 dark:text-neutral-400">
								Manage your billing and subscription
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							onClick={onViewHistory}
							className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors"
						>
							<Calendar className="h-3.5 w-3.5" />
							View History
						</button>

						<button
							onClick={handleManagePlan}
							disabled={isCreateBillingPortalSessionPending}
							className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isCreateBillingPortalSessionPending ? (
								<>
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
									Opening...
								</>
							) : (
								<>
									<CreditCard className="h-3.5 w-3.5" />
									Manage Plan
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

// Enhanced version with more detailed metrics
export function DetailedBillingStats({
	planName,
	totalSpent,
	activePayments,
	monthlyAverage,
	hasActiveSubscription,
	totalPayments,
	currency = 'USD',
	lastMonthSpent,
	growthRate,
	nextBillingDate,
	daysUntilRenewal,
	currentPeriodEnd
}: BillingStatsProps) {
	const locale = useLocale();

	const ROW = 'flex items-center justify-between p-3 bg-neutral-50 dark:bg-white/[0.04] rounded-lg border border-neutral-100 dark:border-white/[0.06]';

	return (
		<div className="space-y-4">
			{/* Main Stats Grid */}
			<BillingStats
				planName={planName}
				totalSpent={totalSpent}
				activePayments={activePayments}
				monthlyAverage={monthlyAverage}
				hasActiveSubscription={hasActiveSubscription}
				totalPayments={totalPayments}
				currency={currency}
				lastMonthSpent={lastMonthSpent}
				growthRate={growthRate}
				nextBillingDate={nextBillingDate}
				daysUntilRenewal={daysUntilRenewal}
				currentPeriodEnd={currentPeriodEnd}
			/>

			{/* Additional Insights */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				{/* Payment Trends */}
				<div className={PANEL}>
					<div className="flex items-center justify-between mb-4">
						<h4 className="text-sm font-semibold text-neutral-900 dark:text-white">Payment Trends</h4>
						<TrendingUp className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
					</div>
					<div className="space-y-3 text-sm">
						<div className={ROW}>
							<span className="text-neutral-500 dark:text-neutral-400">Average Transaction:</span>
							<span className="font-semibold text-neutral-900 dark:text-white">
								{totalPayments > 0
									? formatCurrencyAmount(totalSpent / totalPayments, currency, locale)
									: 'N/A'}
							</span>
						</div>
						<div className={ROW}>
							<span className="text-neutral-500 dark:text-neutral-400">Success Rate:</span>
							<span className="font-semibold text-emerald-600 dark:text-emerald-400">
								{totalPayments > 0 ? Math.round((activePayments / totalPayments) * 100) : 0}%
							</span>
						</div>
						<div className={ROW}>
							<span className="text-neutral-500 dark:text-neutral-400">Total Transactions:</span>
							<span className="font-semibold text-neutral-900 dark:text-white">{totalPayments}</span>
						</div>
					</div>
				</div>

				{/* Subscription Insights */}
				<div className={PANEL}>
					<div className="flex items-center justify-between mb-4">
						<h4 className="text-sm font-semibold text-neutral-900 dark:text-white">Subscription Insights</h4>
						<Users className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
					</div>
					<div className="space-y-3 text-sm">
						<div className={ROW}>
							<span className="text-neutral-500 dark:text-neutral-400">Plan Type:</span>
							<span className="font-semibold text-neutral-900 dark:text-white">
								{hasActiveSubscription ? 'Premium' : 'Free'}
							</span>
						</div>
						<div className={ROW}>
							<span className="text-neutral-500 dark:text-neutral-400">Status:</span>
							<span
								className={`font-semibold ${
									hasActiveSubscription
										? 'text-emerald-600 dark:text-emerald-400'
										: 'text-neutral-500 dark:text-neutral-400'
								}`}
							>
								{hasActiveSubscription ? 'Active' : 'Inactive'}
							</span>
						</div>
						<div className={ROW}>
							<span className="text-neutral-500 dark:text-neutral-400">Monthly Cost:</span>
							<span className="font-semibold text-neutral-900 dark:text-white">
								{hasActiveSubscription ? formatCurrencyAmount(monthlyAverage, currency, locale) : 'Free'}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
