'use client';

import React, { useCallback } from 'react';
import {
	TrendingUp,
	TrendingDown,
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
	currentPeriodEnd
}: BillingStatsProps) {
	const { createBillingPortalSession, isCreateBillingPortalSessionPending } = useSubscription();
	const locale = useLocale();

	const getTrendIcon = (value: number, threshold: number): React.ReactElement | null => {
		if (value > threshold) {
			return <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
		} else if (value < threshold) {
			return <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />;
		}
		return null;
	};

	const getRenewalStatus = () => {
		if (!daysUntilRenewal) return null;

		if (daysUntilRenewal <= 7) {
			return {
				color: 'text-red-600 dark:text-red-400',
				bgColor: 'bg-red-50 dark:bg-red-900/20',
				borderColor: 'border-red-200 dark:border-red-700/50',
				icon: Clock,
				label: 'Renewing Soon',
				urgency: 'high'
			};
		} else if (daysUntilRenewal <= 30) {
			return {
				color: 'text-orange-600 dark:text-orange-400',
				bgColor: 'bg-orange-50 dark:bg-orange-900/20',
				borderColor: 'border-orange-200 dark:border-orange-700/50',
				icon: Calendar,
				label: 'Upcoming Renewal',
				urgency: 'medium'
			};
		} else {
			return {
				color: 'text-emerald-600 dark:text-emerald-400',
				bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
				borderColor: 'border-emerald-200 dark:border-emerald-700/50',
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
		<div className="space-y-6">
			{/* Main Stats Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{/* Total Spent */}
				<div className="bg-linear-to-br from-theme-primary-20 dark:from-theme-primary-20 to-theme-primary-10 dark:to-theme-primary-20 border border-theme-primary-200 dark:border-theme-primary-300 rounded-xl p-6 hover:shadow-lg transition-all duration-300 group bg-theme-primary-10 dark:bg-theme-primary-10">
					<div className="flex items-center justify-between mb-4">
						<div className="w-12 h-12 bg-theme-primary-20 dark:bg-theme-primary-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-theme-primary-200 dark:border-theme-primary-500">
							<DollarSign className="w-6 h-6 text-theme-primary-600 dark:text-theme-primary-700" />
						</div>
						{getTrendIcon(totalSpent, 100)}
					</div>
					<h3 className="text-2xl font-bold text-theme-primary-900 dark:text-theme-primary-100 mb-1 group-hover:text-theme-primary-800 dark:group-hover:text-white transition-colors">
						{formatCurrencyAmount(totalSpent, currency, locale)}
					</h3>
					<p className="text-theme-primary-700 dark:text-theme-primary-300 text-sm font-medium">
						Total Spent
					</p>
					<div className="mt-2 text-xs text-theme-primary-600 dark:text-theme-primary-400">
						{totalPayments > 0 ? `${totalPayments} transactions` : 'No transactions yet'}
					</div>
				</div>

				<div className="bg-linear-to-br from-emerald-50 dark:from-emerald-900/20 to-teal-50 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-xl p-6 hover:shadow-lg transition-all duration-300 group">
					<div className="flex items-center justify-between mb-4">
						<div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-800/50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-emerald-200 dark:border-emerald-600/50">
							<CreditCard className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
						</div>
						{getTrendIcon(activePayments, 1)}
					</div>
					<h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mb-1 group-hover:text-emerald-800 dark:group-hover:text-white transition-colors">
						{activePayments}
					</h3>
					<p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">Active Payments</p>
					<div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
						{activePayments > 0 ? 'Successfully processed' : 'No active payments'}
					</div>
				</div>

				{/* Monthly Average */}
				<div className="bg-linear-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-200 dark:border-purple-700/50 rounded-xl p-6 hover:shadow-lg transition-all duration-300 group">
					<div className="flex items-center justify-between mb-4">
						<div className="w-12 h-12 bg-purple-100 dark:bg-purple-800/50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-purple-200 dark:border-purple-600/50">
							<BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
						</div>
						{getTrendIcon(monthlyAverage, 50)}
					</div>
					<h3 className="text-2xl font-bold text-purple-900 dark:text-purple-100 mb-1 group-hover:text-purple-800 dark:group-hover:text-white transition-colors">
						{formatCurrencyAmount(monthlyAverage, currency, locale)}
					</h3>
					<p className="text-purple-700 dark:text-purple-300 text-sm font-medium">Monthly Average</p>
					<div className="mt-2 text-xs text-purple-600 dark:text-purple-400">
						{totalPayments > 0 ? 'Based on all payments' : 'Calculated from transactions'}
					</div>
				</div>

				{/* Plan Status */}
				<div className="bg-linear-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-700/50 rounded-xl p-6 hover:shadow-lg transition-all duration-300 group">
					<div className="flex items-center justify-between mb-4">
						<div className="w-12 h-12 bg-orange-100 dark:bg-orange-800/50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-orange-200 dark:border-orange-600/50">
							<Crown className="w-6 h-6 text-orange-600 dark:text-orange-400" />
						</div>
						<div
							className={`w-3 h-3 rounded-full ${hasActiveSubscription ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-400'}`}
						></div>
					</div>
					<h3
						className={`text-2xl font-bold mb-1 group-hover:opacity-80 transition-opacity ${
							hasActiveSubscription
								? 'text-orange-900 dark:text-orange-100'
								: 'text-slate-700 dark:text-slate-300'
						}`}
					>
						{hasActiveSubscription ? 'Active' : 'Free'}
					</h3>
					<p
						className={`text-sm font-medium ${
							hasActiveSubscription
								? 'text-orange-700 dark:text-orange-300'
								: 'text-slate-600 dark:text-slate-400'
						}`}
					>
						{hasActiveSubscription ? planName : 'Basic Plan'}
					</p>
					<div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
						{hasActiveSubscription ? 'Full access enabled' : 'Upgrade for more features'}
					</div>
				</div>
			</div>

			{/* Additional Metrics Row */}
			{(lastMonthSpent !== undefined || growthRate !== undefined || renewalStatus) && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{/* Monthly Comparison */}
					{lastMonthSpent !== undefined && (
						<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-xs">
							<div className="flex items-center justify-between mb-4">
								<h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
									Monthly Comparison
								</h4>
								<Calendar className="w-5 h-5 text-slate-400" />
							</div>
							<div className="space-y-3">
								<div className="flex justify-between items-center">
									<span className="text-slate-600 dark:text-slate-300">This Month:</span>
									<span className="font-semibold text-slate-900 dark:text-slate-100">
										{formatCurrencyAmount(totalSpent, currency, locale)}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-slate-600 dark:text-slate-300">Last Month:</span>
									<span className="font-semibold text-slate-900 dark:text-slate-100">
										{formatCurrencyAmount(lastMonthSpent || 0, currency, locale)}
									</span>
								</div>
								<div className="pt-2 border-t border-slate-200 dark:border-slate-700">
									<div className="flex justify-between items-center">
										<span className="text-slate-600 dark:text-slate-300">Change:</span>
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
						<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-xs">
							<div className="flex items-center justify-between mb-4">
								<h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
									Growth Rate
								</h4>
								<TrendingUp className="w-5 h-5 text-slate-400" />
							</div>
							<div className="space-y-3">
								<div className="flex justify-between items-center">
									<span className="text-slate-600 dark:text-slate-300">Monthly Growth:</span>
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
								<div className="pt-2 border-t border-slate-200 dark:border-slate-700">
									<div className="text-sm text-slate-500 dark:text-slate-400">
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
						<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-xs">
							<div className="flex items-center justify-between mb-4">
								<h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
									Renewal Status
								</h4>
								<renewalStatus.icon className="w-5 h-5 text-slate-400" />
							</div>
							<div className="space-y-3">
								<div className="flex justify-between items-center">
									<span className="text-slate-600 dark:text-slate-300">Status:</span>
									<span className={`font-semibold ${renewalStatus.color}`}>
										{renewalStatus.label}
									</span>
								</div>
								{nextBillingDate && (
									<div className="flex justify-between items-center">
										<span className="text-slate-600 dark:text-slate-300">Next Billing:</span>
										<span className="font-semibold text-slate-900 dark:text-slate-100">
											{new Date(nextBillingDate).toLocaleDateString()}
										</span>
									</div>
								)}
								{currentPeriodEnd && (
									<div className="flex justify-between items-center">
										<span className="text-slate-600 dark:text-slate-300">Period Ends:</span>
										<span className="font-semibold text-slate-900 dark:text-slate-100">
											{new Date(currentPeriodEnd).toLocaleDateString()}
										</span>
									</div>
								)}
								{daysUntilRenewal && (
									<div className="pt-2 border-t border-slate-200 dark:border-slate-700">
										<div className="flex justify-between items-center">
											<span className="text-slate-600 dark:text-slate-300">Days Left:</span>
											<span
												className={`font-semibold ${
													renewalStatus.urgency === 'high'
														? 'text-red-600 dark:text-red-400'
														: renewalStatus.urgency === 'medium'
															? 'text-orange-600 dark:text-orange-400'
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
			<div className="bg-linear-to-r from-slate-50 to-theme-primary-50 dark:from-slate-800 dark:to-theme-primary-900/20 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-theme-primary-100 dark:bg-theme-primary-10 rounded-lg flex items-center justify-center border border-theme-primary-200 dark:border-transparent">
							<Zap className="w-5 h-5 text-theme-primary-600 dark:text-theme-primary-400" />
						</div>
						<div>
							<h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Quick Actions</h4>
							<p className="text-sm text-slate-600 dark:text-slate-300">
								Manage your billing and subscription
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600/50 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600/50 hover:border-slate-400 dark:hover:border-slate-500/50 transition-colors">
							<Calendar className="w-4 h-4" />
							View History
						</button>

						<button
							onClick={handleManagePlan}
							disabled={isCreateBillingPortalSessionPending}
							className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-linear-to-r from-theme-primary-600 to-theme-primary-700 rounded-lg hover:from-theme-primary-700 hover:to-theme-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-theme-primary-600 disabled:hover:to-theme-primary-700"
						>
							{isCreateBillingPortalSessionPending ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									Opening...
								</>
							) : (
								<>
									<CreditCard className="w-4 h-4" />
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

	return (
		<div className="space-y-6">
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
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Payment Trends */}
				<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-xs">
					<div className="flex items-center justify-between mb-4">
						<h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Payment Trends</h4>
						<TrendingUp className="w-5 h-5 text-slate-400" />
					</div>
					<div className="space-y-4">
						<div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600/50">
							<span className="text-slate-600 dark:text-slate-300">Average Transaction:</span>
							<span className="font-semibold text-slate-900 dark:text-slate-100">
								{totalPayments > 0
									? formatCurrencyAmount(
											totalPayments > 0 ? totalSpent / totalPayments : 0,
											currency,
											locale
										)
									: 'N/A'}
							</span>
						</div>
						<div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600/50">
							<span className="text-slate-600 dark:text-slate-300">Success Rate:</span>
							<span className="font-semibold text-emerald-600 dark:text-emerald-400">
								{totalPayments > 0 ? Math.round((activePayments / totalPayments) * 100) : 0}%
							</span>
						</div>
						<div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600/50">
							<span className="text-slate-600 dark:text-slate-300">Total Transactions:</span>
							<span className="font-semibold text-slate-900 dark:text-slate-100">{totalPayments}</span>
						</div>
					</div>
				</div>

				{/* Subscription Insights */}
				<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-xs">
					<div className="flex items-center justify-between mb-4">
						<h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
							Subscription Insights
						</h4>
						<Users className="w-5 h-5 text-slate-400" />
					</div>
					<div className="space-y-4">
						<div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600/50">
							<span className="text-slate-600 dark:text-slate-300">Plan Type:</span>
							<span className="font-semibold text-slate-900 dark:text-slate-100">
								{hasActiveSubscription ? 'Premium' : 'Free'}
							</span>
						</div>
						<div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600/50">
							<span className="text-slate-600 dark:text-slate-300">Status:</span>
							<span
								className={`font-semibold ${
									hasActiveSubscription
										? 'text-emerald-600 dark:text-emerald-400'
										: 'text-slate-600 dark:text-slate-400'
								}`}
							>
								{hasActiveSubscription ? 'Active' : 'Inactive'}
							</span>
						</div>
						<div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600/50">
							<span className="text-slate-600 dark:text-slate-300">Monthly Cost:</span>
							<span className="font-semibold text-slate-900 dark:text-slate-100">
								{hasActiveSubscription
									? formatCurrencyAmount(monthlyAverage, currency, locale)
									: 'Free'}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
