'use client';

import { Calendar, Clock, TrendingUp, XCircle, CheckCircle, AlertCircle, Crown } from 'lucide-react';
import { useLocale } from 'next-intl';
import { formatCurrencyAmount } from '@/lib/utils/currency-format';

interface SubscriptionHistoryItem {
	id: string;
	planId: string;
	planName: string;
	status: string;
	startDate: string;
	endDate: string;
	cancelledAt?: string;
	cancelReason?: string;
	amount: number;
	currency: string;
	billingInterval: string;
}

const formatDate = (date: string) =>
	new Date(date).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});

const getStatusConfig = (status: string) => {
	switch (status.toLowerCase()) {
		case 'active':
			return {
				color: 'text-emerald-600 dark:text-emerald-500',
				bgColor: 'bg-emerald-50 dark:bg-emerald-700/50',
				borderColor: 'border-emerald-200 dark:border-emerald-500',
				icon: CheckCircle,
				label: 'Active'
			};
		case 'cancelled':
			return {
				color: 'text-red-600 dark:text-red-500',
				bgColor: 'bg-red-50 dark:bg-red-700/50',
				borderColor: 'border-red-200 dark:border-red-500',
				icon: XCircle,
				label: 'Cancelled'
			};
		case 'past_due':
			return {
				color: 'text-orange-600 dark:text-orange-500',
				bgColor: 'bg-orange-50 dark:bg-orange-700/50',
				borderColor: 'border-orange-200 dark:border-orange-500',
				icon: AlertCircle,
				label: 'Past Due'
			};
		case 'trialing':
			return {
				color: 'text-theme-primary-600 dark:text-theme-primary-300',
				bgColor: 'bg-theme-primary-50 dark:bg-theme-primary-20',
				borderColor: 'border-theme-primary-200 dark:border-theme-primary-500',
				icon: Clock,
				label: 'Trial'
			};
		case 'unpaid':
			return {
				color: 'text-red-600 dark:text-red-500',
				bgColor: 'bg-red-50 dark:bg-red-700/50',
				borderColor: 'border-red-200 dark:border-red-500',
				icon: AlertCircle,
				label: 'Unpaid'
			};
		default:
			return {
				color: 'text-slate-600 dark:text-slate-300',
				bgColor: 'bg-slate-50 dark:bg-slate-700/50',
				borderColor: 'border-slate-200 dark:border-slate-500',
				icon: Clock,
				label: status.charAt(0).toUpperCase() + status.slice(1)
			};
	}
};

const getPlanIcon = (planName: string) => {
	const lowerPlan = planName.toLowerCase();
	if (lowerPlan.includes('premium') || lowerPlan.includes('pro')) {
		return Crown;
	}
	if (lowerPlan.includes('enterprise') || lowerPlan.includes('business')) {
		return TrendingUp;
	}
	return Calendar;
};

export function SubscriptionHistoryCard({ subscription }: { subscription: SubscriptionHistoryItem }) {
	const locale = useLocale();
	const statusConfig = getStatusConfig(subscription.status);
	const StatusIcon = statusConfig.icon;
	const PlanIcon = getPlanIcon(subscription.planName);

	const isActive = subscription.status.toLowerCase() === 'active';
	const isCancelled = subscription.status.toLowerCase() === 'cancelled';
	const isTrialing = subscription.status.toLowerCase() === 'trialing';

	return (
		<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-300 group">
			<div className="flex items-start justify-between">
				{/* Left Section - Subscription Details */}
				<div className="flex-1">
					<div className="flex items-center gap-4 mb-4">
						<div
							className={`w-12 h-12 rounded-xl flex items-center justify-center ${
								isActive
									? 'bg-emerald-100'
									: isCancelled
										? 'bg-red-100 dark:bg-red-700/50'
										: isTrialing
											? 'bg-theme-primary-100 dark:bg-theme-primary-20'
											: 'bg-slate-100 dark:bg-slate-700/50'
							} group-hover:scale-105 transition-transform duration-300 dark:bg-theme-primary-20`}
						>
							<PlanIcon
								className={`w-6 h-6 ${
									isActive
										? 'text-emerald-600'
										: isCancelled
											? 'text-red-600'
											: isTrialing
												? 'text-theme-primary-600'
												: 'text-slate-600 dark:text-slate-300'
								}`}
							/>
						</div>

						<div className="flex-1">
							<h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 dark:group-hover:text-slate-100 transition-colors">
								{subscription.planName}
							</h3>

							<div className="flex items-center gap-3">
								<span
									className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} dark:border-slate-500`}
								>
									<StatusIcon className="w-3 h-3" />
									{statusConfig.label}
								</span>

								<span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-full">
									{subscription.billingInterval.charAt(0).toUpperCase() +
										subscription.billingInterval.slice(1)}
								</span>

								{isActive && (
									<span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
										<CheckCircle className="w-3 h-3" />
										Current
									</span>
								)}

								{isTrialing && (
									<span className="inline-flex items-center gap-1 px-2 py-1 bg-theme-primary-100 dark:bg-theme-primary-20 text-theme-primary-700 dark:text-theme-primary-300 text-xs font-medium rounded-full">
										<Clock className="w-3 h-3" />
										Trial Period
									</span>
								)}
							</div>
						</div>
					</div>

					{/* Timeline Details */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
						<div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
							<Calendar className="w-4 h-4 text-slate-400 dark:text-slate-300" />
							<span>
								<span className="font-medium">Started:</span> {formatDate(subscription.startDate)}
							</span>
						</div>

						<div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
							<Clock className="w-4 h-4 text-slate-400 dark:text-slate-300" />
							<span>
								<span className="font-medium">Ended:</span>{' '}
								{subscription.endDate ? formatDate(subscription.endDate) : 'Ongoing'}
							</span>
						</div>
					</div>

					{/* Cancellation Details */}
					{isCancelled && subscription.cancelledAt && (
						<div className="bg-red-50 dark:bg-red-700/50 border border-red-200 dark:border-red-500 rounded-lg p-4 mb-4">
							<div className="flex items-start gap-3">
								<XCircle className="w-5 h-5 text-red-600 dark:text-red-500 mt-0.5" />
								<div className="flex-1">
									<div className="text-sm font-medium text-red-800 dark:text-red-500 mb-1">
										Cancelled on {formatDate(subscription.cancelledAt)}
									</div>
									{subscription.cancelReason && (
										<div className="text-sm text-red-700">
											<span className="font-medium">Reason:</span> {subscription.cancelReason}
										</div>
									)}
								</div>
							</div>
						</div>
					)}
				</div>

				<div className="text-right ml-6">
					<div className="text-2xl font-bold text-slate-900 mb-1 group-hover:text-slate-800 transition-colors dark:text-slate-100 dark:group-hover:text-slate-100">
						{formatCurrencyAmount(subscription.amount, subscription.currency, locale)}
					</div>

					<div className="text-sm text-slate-600 dark:text-slate-300 mb-3">
						per {subscription.billingInterval}
					</div>

					{/* Action Buttons */}
					<div className="flex flex-col gap-2">
						<button className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 dark:bg-slate-700/50 rounded-lg hover:bg-slate-200 transition-colors dark:text-slate-300">
							<Calendar className="w-3 h-3" />
							View Details
						</button>

						{isActive && (
							<button className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-linear-to-r from-theme-primary-600 to-theme-primary-700 rounded-lg hover:from-theme-primary-700 hover:to-theme-primary-800 transition-all duration-200 dark:text-slate-300 dark:bg-theme-primary-20">
								<TrendingUp className="w-3 h-3" />
								Manage
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Footer Section */}
			<div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
				<div className="flex items-center justify-between text-sm">
					<div className="flex items-center gap-4 text-slate-600 dark:text-slate-300">
						<span className="font-medium">Subscription ID:</span>
						<code className="bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-sm text-xs font-mono">
							{subscription.id.slice(-8)}
						</code>

						<span className="font-medium">Plan ID:</span>
						<code className="bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-sm text-xs font-mono">
							{subscription.planId.slice(-8)}
						</code>
					</div>

					<div className="flex items-center gap-2">
						<button className="text-slate-600 hover:text-slate-800 font-medium text-sm underline dark:text-slate-300">
							View History
						</button>

						<button className="text-slate-600 hover:text-slate-800 font-medium text-sm underline dark:text-slate-300">
							Contact Support
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
