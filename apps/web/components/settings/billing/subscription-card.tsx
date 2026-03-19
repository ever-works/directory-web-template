'use client';

import { Calendar, Clock, CheckCircle, AlertCircle, CreditCard } from 'lucide-react';
import { useAutoRenewal } from '@/hooks/use-auto-renewal';
import { useLocale } from 'next-intl';
import { formatCurrencyAmount } from '@/lib/utils/currency-format';

interface SubscriptionInfo {
	id: string;
	planId: string;
	planName: string;
	status: string;
	startDate: string;
	endDate: string;
	nextBillingDate: string;
	paymentProvider: string;
	subscriptionId: string;
	amount: number;
	currency: string;
	billingInterval: string;
	currentPeriodEnd?: string;
	currentPeriodStart?: string;
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
				color: 'text-emerald-600 dark:text-emerald-400',
				bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
				icon: CheckCircle,
				label: 'Active'
			};
		case 'trialing':
			return {
				color: 'text-blue-600 dark:text-blue-400',
				bgColor: 'bg-blue-50 dark:bg-blue-900/20',
				icon: Clock,
				label: 'Trial'
			};
		case 'past_due':
			return {
				color: 'text-orange-600 dark:text-orange-400',
				bgColor: 'bg-orange-50 dark:bg-orange-900/20',
				icon: AlertCircle,
				label: 'Past Due'
			};
		case 'cancelled':
			return {
				color: 'text-red-600 dark:text-red-400',
				bgColor: 'bg-red-50 dark:bg-red-900/20',
				icon: AlertCircle,
				label: 'Cancelled'
			};
		case 'expired':
			return {
				color: 'text-red-600 dark:text-red-400',
				bgColor: 'bg-red-50 dark:bg-red-900/20',
				icon: AlertCircle,
				label: 'Expired'
			};
		default:
			return {
				color: 'text-slate-600 dark:text-slate-400',
				bgColor: 'bg-slate-50 dark:bg-slate-900/20',
				icon: Clock,
				label: status
			};
	}
};

export function SubscriptionCard({ subscription }: { subscription: SubscriptionInfo }) {
	const locale = useLocale();
	const statusConfig = getStatusConfig(subscription.status);
	const StatusIcon = statusConfig.icon;

	// Use provider's subscription ID (e.g., Stripe's sub_xxx) for API lookup
	const subscriptionId = subscription.subscriptionId;

	const { autoRenewal, isLoading, isUpdating, enableAutoRenewal, disableAutoRenewal } = useAutoRenewal({
		subscriptionId,
		enabled: !!subscriptionId
	});

	const handleToggleAutoRenewal = () => {
		if (autoRenewal) {
			disableAutoRenewal();
		} else {
			enableAutoRenewal();
		}
	};

	return (
		<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-xs hover:shadow-md transition-all duration-200">
			{/* Header */}
			<div className="flex justify-between items-start mb-3">
				<div className="flex-1">
					<h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg mb-2">
						{subscription.planName}
					</h3>
					<span
						className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color} border border-slate-200 dark:border-slate-600`}
					>
						<StatusIcon className="w-3.5 h-3.5" />
						{statusConfig.label}
					</span>
				</div>

				<div className="text-right ml-3">
					<div className="text-xl font-bold text-slate-900 dark:text-slate-100">
						{formatCurrencyAmount(subscription.amount, subscription.currency, locale)}
					</div>
					<div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
						per {subscription.billingInterval}
					</div>
				</div>
			</div>

			{/* Key Info */}
			<div className="grid grid-cols-2 gap-3 mb-3">
				<div className="flex items-center gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
					<div className="w-7 h-7 bg-blue-500 dark:bg-blue-600 rounded-lg flex items-center justify-center">
						<Calendar className="w-3.5 h-3.5 text-white" />
					</div>
					<div className="text-sm text-slate-700 dark:text-slate-300 font-medium">
						Started: {formatDate(subscription.startDate)}
					</div>
				</div>

				<div className="flex items-center gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
					<div className="w-7 h-7 bg-emerald-500 dark:bg-emerald-600 rounded-lg flex items-center justify-center">
						<Clock className="w-3.5 h-3.5 text-white" />
					</div>
					<div className="text-sm text-slate-700 dark:text-slate-300 font-medium">
						Next:{' '}
						{subscription.currentPeriodEnd || subscription.endDate
							? formatDate(subscription.currentPeriodEnd || subscription.endDate)
							: '—'}
					</div>
				</div>
			</div>

			{/* Footer */}
			<div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-700">
				<div className="flex items-center gap-2">
					<div className="w-6 h-6 bg-slate-500 dark:bg-slate-600 rounded-lg flex items-center justify-center">
						<CreditCard className="w-3 h-3 text-white" />
					</div>
					<span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
						{subscription.paymentProvider} •{' '}
						{subscription.subscriptionId && typeof subscription.subscriptionId === 'string'
							? subscription.subscriptionId.slice(-8)
							: '—'}
					</span>
				</div>

				<button
					onClick={handleToggleAutoRenewal}
					disabled={isLoading || isUpdating}
					className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
						autoRenewal
							? 'bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 dark:hover:bg-orange-600'
							: 'bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600'
					}`}
				>
					{isLoading
						? 'Loading...'
						: isUpdating
							? 'Updating...'
							: autoRenewal
								? 'Disable Auto-Renewal'
								: 'Enable Auto-Renewal'}
				</button>
			</div>
		</div>
	);
}
