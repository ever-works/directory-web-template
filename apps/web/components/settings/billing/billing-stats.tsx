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
	Loader2,
	ArrowUpRight
} from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { toast } from 'sonner';
import { useLocale } from 'next-intl';
import { formatCurrencyAmount } from '@/lib/utils/currency-format';

const CARD = 'bg-white dark:bg-white/3 rounded-xl border border-neutral-200 dark:border-white/8';
const LABEL = 'text-xs font-medium text-neutral-500 dark:text-neutral-400';
const VALUE = 'text-xl font-semibold text-neutral-900 dark:text-white tracking-tight';
const DESC = 'mt-1 text-xs text-neutral-400 dark:text-neutral-500';
const ICON_TILE = 'p-2 bg-neutral-100 dark:bg-white/8 rounded-lg shrink-0';
const ICON = 'h-4 w-4 text-neutral-500 dark:text-neutral-400';
const PANEL = `${CARD} p-5`;
const OUTLINE_BTN =
	'inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors';
const PRIMARY_BTN =
	'inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

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
	onViewHistory?: () => void;
}

interface StatTileProps {
	label: string;
	value: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	badge?: { label: string; color: string };
}

function StatTile({ label, value, description, icon: Icon, badge }: StatTileProps) {
	return (
		<div className={`${CARD} p-5`}>
			<div className="flex items-start justify-between mb-3">
				<span className={LABEL}>{label}</span>
				<div className={ICON_TILE} aria-hidden="true">
					<Icon className={ICON} />
				</div>
			</div>
			<p className={VALUE}>{value}</p>
			<div className="flex items-center justify-between mt-1 gap-2">
				<p className={DESC}>{description}</p>
				{badge && (
					<span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${badge.color}`}>
						{badge.label}
					</span>
				)}
			</div>
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
			return { color: 'text-red-600 dark:text-red-400', icon: Clock, label: 'Renewing Soon', urgency: 'high' };
		} else if (daysUntilRenewal <= 30) {
			return { color: 'text-amber-600 dark:text-amber-400', icon: Calendar, label: 'Upcoming Renewal', urgency: 'medium' };
		}
		return { color: 'text-emerald-600 dark:text-emerald-400', icon: Calendar, label: 'Active', urgency: 'low' };
	};

	const renewalStatus = getRenewalStatus();

	const handleManagePlan = useCallback(async () => {
		const toastId = toast.loading('Opening billing portal...', { duration: Infinity });
		try {
			const result = await createBillingPortalSession.mutateAsync();
			const portalUrl = result?.data?.url;
			if (!portalUrl) throw new Error('Portal URL not available in response');
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
			{/* KPI grid */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				<StatTile
					label="Total Spent"
					value={formatCurrencyAmount(totalSpent, currency, locale)}
					description={totalPayments > 0 ? `${totalPayments} transaction${totalPayments !== 1 ? 's' : ''}` : 'No transactions yet'}
					icon={DollarSign}
				/>
				<StatTile
					label="Active Payments"
					value={String(activePayments)}
					description={activePayments > 0 ? 'Successfully processed' : 'No active payments'}
					icon={CreditCard}
					badge={activePayments > 0 ? { label: 'Live', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' } : undefined}
				/>
				<StatTile
					label="Monthly Average"
					value={formatCurrencyAmount(monthlyAverage, currency, locale)}
					description={totalPayments > 0 ? 'Based on all payments' : 'No data yet'}
					icon={BarChart3}
				/>
				<StatTile
					label="Plan Status"
					value={hasActiveSubscription ? 'Active' : 'Free'}
					description={planName}
					icon={Crown}
					badge={
						hasActiveSubscription
							? { label: 'Pro', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' }
							: { label: 'Free', color: 'bg-neutral-100 text-neutral-500 dark:bg-white/8 dark:text-neutral-400' }
					}
				/>
			</div>

			{/* Additional Metrics Row — only rendered when optional props are passed */}
			{(lastMonthSpent !== undefined || growthRate !== undefined || renewalStatus) && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					{lastMonthSpent !== undefined && (
						<div className={PANEL}>
							<div className="flex items-center justify-between mb-3">
								<span className="text-xs font-semibold text-neutral-900 dark:text-white">Monthly Comparison</span>
								<Calendar className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
							</div>
							<div className="space-y-2 text-xs">
								<div className="flex justify-between items-center">
									<span className={LABEL}>This month</span>
									<span className="font-semibold text-neutral-900 dark:text-white">
										{formatCurrencyAmount(totalSpent, currency, locale)}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className={LABEL}>Last month</span>
									<span className="font-semibold text-neutral-900 dark:text-white">
										{formatCurrencyAmount(lastMonthSpent, currency, locale)}
									</span>
								</div>
								<div className="pt-2 border-t border-neutral-100 dark:border-white/[0.06] flex justify-between items-center">
									<span className={LABEL}>Change</span>
									<span
										className={`font-semibold ${
											lastMonthSpent > totalSpent
												? 'text-emerald-600 dark:text-emerald-400'
												: 'text-red-600 dark:text-red-400'
										}`}
									>
										{lastMonthSpent > totalSpent ? '↓' : '↑'}{' '}
										{formatCurrencyAmount(Math.abs(lastMonthSpent - totalSpent), currency, locale)}
									</span>
								</div>
							</div>
						</div>
					)}

					{growthRate !== undefined && (
						<div className={PANEL}>
							<div className="flex items-center justify-between mb-3">
								<span className="text-xs font-semibold text-neutral-900 dark:text-white">Growth Rate</span>
								<TrendingUp className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
							</div>
							<div className="space-y-2 text-xs">
								<div className="flex justify-between items-center">
									<span className={LABEL}>Monthly growth</span>
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
									<p className={DESC}>
										{growthRate > 0
											? 'Spending increasing month over month'
											: growthRate < 0
												? 'Spending decreased vs last month'
												: 'Spending is consistent'}
									</p>
								</div>
							</div>
						</div>
					)}

					{renewalStatus && (
						<div className={PANEL}>
							<div className="flex items-center justify-between mb-3">
								<span className="text-xs font-semibold text-neutral-900 dark:text-white">Renewal Status</span>
								<renewalStatus.icon className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
							</div>
							<div className="space-y-2 text-xs">
								<div className="flex justify-between items-center">
									<span className={LABEL}>Status</span>
									<span className={`font-semibold ${renewalStatus.color}`}>{renewalStatus.label}</span>
								</div>
								{nextBillingDate && (
									<div className="flex justify-between items-center">
										<span className={LABEL}>Next billing</span>
										<span className="font-semibold text-neutral-900 dark:text-white">
											{new Date(nextBillingDate).toLocaleDateString()}
										</span>
									</div>
								)}
								{currentPeriodEnd && (
									<div className="flex justify-between items-center">
										<span className={LABEL}>Period ends</span>
										<span className="font-semibold text-neutral-900 dark:text-white">
											{new Date(currentPeriodEnd).toLocaleDateString()}
										</span>
									</div>
								)}
								{daysUntilRenewal && (
									<div className="pt-2 border-t border-neutral-100 dark:border-white/[0.06] flex justify-between items-center">
										<span className={LABEL}>Days left</span>
										<span
											className={`font-semibold ${
												renewalStatus.urgency === 'high'
													? 'text-red-600 dark:text-red-400'
													: renewalStatus.urgency === 'medium'
														? 'text-amber-600 dark:text-amber-400'
														: 'text-emerald-600 dark:text-emerald-400'
											}`}
										>
											{daysUntilRenewal}d
										</span>
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			)}

			{/* Quick Actions bar */}
			<div className={`${PANEL} flex items-center justify-between gap-4 flex-wrap`}>
				<div className="flex items-center gap-3">
					<div className={ICON_TILE}>
						<Zap className={ICON} />
					</div>
					<div>
						<p className="text-xs font-semibold text-neutral-900 dark:text-white">Quick Actions</p>
						<p className={DESC}>Manage your billing and subscription</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button onClick={onViewHistory} className={OUTLINE_BTN}>
						<ArrowUpRight className="h-3.5 w-3.5" />
						View History
					</button>
					<button onClick={handleManagePlan} disabled={isCreateBillingPortalSessionPending} className={PRIMARY_BTN}>
						{isCreateBillingPortalSessionPending ? (
							<>
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
								Opening…
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
	);
}

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

	const ROW =
		'flex items-center justify-between p-3 bg-neutral-50 dark:bg-white/[0.04] rounded-lg border border-neutral-100 dark:border-white/[0.06]';

	return (
		<div className="space-y-4">
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

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
				<div className={PANEL}>
					<div className="flex items-center justify-between mb-3">
						<span className="text-xs font-semibold text-neutral-900 dark:text-white">Payment Trends</span>
						<TrendingUp className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
					</div>
					<div className="space-y-2">
						<div className={ROW}>
							<span className={LABEL}>Average transaction</span>
							<span className="text-xs font-semibold text-neutral-900 dark:text-white">
								{totalPayments > 0 ? formatCurrencyAmount(totalSpent / totalPayments, currency, locale) : 'N/A'}
							</span>
						</div>
						<div className={ROW}>
							<span className={LABEL}>Success rate</span>
							<span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
								{totalPayments > 0 ? Math.round((activePayments / totalPayments) * 100) : 0}%
							</span>
						</div>
						<div className={ROW}>
							<span className={LABEL}>Total transactions</span>
							<span className="text-xs font-semibold text-neutral-900 dark:text-white">{totalPayments}</span>
						</div>
					</div>
				</div>

				<div className={PANEL}>
					<div className="flex items-center justify-between mb-3">
						<span className="text-xs font-semibold text-neutral-900 dark:text-white">Subscription Insights</span>
						<Users className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
					</div>
					<div className="space-y-2">
						<div className={ROW}>
							<span className={LABEL}>Plan type</span>
							<span className="text-xs font-semibold text-neutral-900 dark:text-white">
								{hasActiveSubscription ? 'Premium' : 'Free'}
							</span>
						</div>
						<div className={ROW}>
							<span className={LABEL}>Status</span>
							<span
								className={`text-xs font-semibold ${
									hasActiveSubscription
										? 'text-emerald-600 dark:text-emerald-400'
										: 'text-neutral-500 dark:text-neutral-400'
								}`}
							>
								{hasActiveSubscription ? 'Active' : 'Inactive'}
							</span>
						</div>
						<div className={ROW}>
							<span className={LABEL}>Monthly cost</span>
							<span className="text-xs font-semibold text-neutral-900 dark:text-white">
								{hasActiveSubscription ? formatCurrencyAmount(monthlyAverage, currency, locale) : 'Free'}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
