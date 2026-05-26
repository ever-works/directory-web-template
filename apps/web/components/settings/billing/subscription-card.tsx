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

const ICON_TILE = 'p-1.5 bg-neutral-100 dark:bg-white/8 rounded-md flex items-center justify-center shrink-0';
const ICON_SM = 'h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400';
const LABEL = 'text-xs text-neutral-500 dark:text-neutral-400';

const formatDate = (date: string) =>
	new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

const getStatusConfig = (status: string) => {
	switch (status.toLowerCase()) {
		case 'active':
			return {
				color: 'text-emerald-600 dark:text-emerald-400',
				bg: 'bg-emerald-50 dark:bg-emerald-500/10',
				icon: CheckCircle,
				label: 'Active'
			};
		case 'trialing':
			return {
				color: 'text-blue-600 dark:text-blue-400',
				bg: 'bg-blue-50 dark:bg-blue-500/10',
				icon: Clock,
				label: 'Trial'
			};
		case 'past_due':
			return {
				color: 'text-amber-600 dark:text-amber-400',
				bg: 'bg-amber-50 dark:bg-amber-500/10',
				icon: AlertCircle,
				label: 'Past Due'
			};
		case 'cancelled':
		case 'expired':
			return {
				color: 'text-red-600 dark:text-red-400',
				bg: 'bg-red-50 dark:bg-red-500/10',
				icon: AlertCircle,
				label: status === 'cancelled' ? 'Cancelled' : 'Expired'
			};
		default:
			return {
				color: 'text-neutral-500 dark:text-neutral-400',
				bg: 'bg-neutral-50 dark:bg-white/4',
				icon: Clock,
				label: status
			};
	}
};

export function SubscriptionCard({ subscription }: { subscription: SubscriptionInfo }) {
	const locale = useLocale();
	const statusConfig = getStatusConfig(subscription.status);
	const StatusIcon = statusConfig.icon;

	const subscriptionId = subscription.subscriptionId;
	const { autoRenewal, isLoading, isUpdating, enableAutoRenewal, disableAutoRenewal } = useAutoRenewal({
		subscriptionId,
		enabled: !!subscriptionId
	});

	const handleToggleAutoRenewal = () => {
		if (autoRenewal) disableAutoRenewal();
		else enableAutoRenewal();
	};

	const isWorking = isLoading || isUpdating;

	return (
		<div className="space-y-3">
			{/* Plan header */}
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-sm font-semibold text-neutral-900 dark:text-white">{subscription.planName}</p>
					<span
						className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-neutral-200 dark:border-white/10 ${statusConfig.bg} ${statusConfig.color}`}
					>
						<StatusIcon className="h-3 w-3" />
						{statusConfig.label}
					</span>
				</div>
				<div className="text-right shrink-0">
					<p className="text-sm font-semibold text-neutral-900 dark:text-white">
						{formatCurrencyAmount(subscription.amount, subscription.currency, locale)}
					</p>
					<p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">per {subscription.billingInterval}</p>
				</div>
			</div>

			{/* Dates grid */}
			<div className="grid grid-cols-2 gap-2">
				<div className="flex items-center gap-2 p-2.5 bg-neutral-50 dark:bg-white/4 rounded-lg border border-neutral-100 dark:border-white/[0.06]">
					<div className={ICON_TILE}>
						<Calendar className={ICON_SM} />
					</div>
					<div>
						<p className="text-[10px] text-neutral-500 dark:text-neutral-400">Started</p>
						<p className="text-xs font-medium text-neutral-900 dark:text-white">{formatDate(subscription.startDate)}</p>
					</div>
				</div>
				<div className="flex items-center gap-2 p-2.5 bg-neutral-50 dark:bg-white/4 rounded-lg border border-neutral-100 dark:border-white/[0.06]">
					<div className={ICON_TILE}>
						<Clock className={ICON_SM} />
					</div>
					<div>
						<p className="text-[10px] text-neutral-500 dark:text-neutral-400">Next billing</p>
						<p className="text-xs font-medium text-neutral-900 dark:text-white">
							{subscription.currentPeriodEnd || subscription.endDate
								? formatDate(subscription.currentPeriodEnd || subscription.endDate)
								: '—'}
						</p>
					</div>
				</div>
			</div>

			{/* Footer */}
			<div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-white/[0.06]">
				<div className="flex items-center gap-2">
					<div className={ICON_TILE}>
						<CreditCard className={ICON_SM} />
					</div>
					<span className={LABEL}>
						{subscription.paymentProvider}
						{subscription.subscriptionId
							? ` · ${subscription.subscriptionId.slice(-6)}`
							: ''}
					</span>
				</div>

				<button
					onClick={handleToggleAutoRenewal}
					disabled={isWorking}
					className={`inline-flex items-center h-8 px-3 text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
						autoRenewal
							? 'border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/6'
							: 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100'
					}`}
				>
					{isLoading
						? 'Loading…'
						: isUpdating
							? 'Saving…'
							: autoRenewal
								? 'Disable Auto-Renewal'
								: 'Enable Auto-Renewal'}
				</button>
			</div>
		</div>
	);
}
