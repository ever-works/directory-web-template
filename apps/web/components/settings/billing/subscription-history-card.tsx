'use client';

import { Calendar, Clock, TrendingUp, XCircle, CheckCircle, AlertCircle, Crown } from 'lucide-react';
import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { formatCurrencyAmount } from '@/lib/utils/currency-format';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SOCIAL_EMAIL || 'ever@ever.works';

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

const CARD = 'bg-white dark:bg-white/3 rounded-xl border border-neutral-200 dark:border-white/8 p-4';
const ICON_TILE = 'p-2 bg-neutral-100 dark:bg-white/8 rounded-lg flex items-center justify-center shrink-0';
const ICON = 'h-4 w-4 text-neutral-500 dark:text-neutral-400';
const LABEL = 'text-xs text-neutral-500 dark:text-neutral-400';
const OUTLINE_BTN =
	'inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors';

const formatDate = (date: string) =>
	new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

const getStatusConfig = (status: string) => {
	switch (status.toLowerCase()) {
		case 'active':
			return {
				color: 'text-emerald-600 dark:text-emerald-400',
				bg: 'bg-emerald-50 dark:bg-emerald-500/10',
				border: 'border-emerald-200 dark:border-emerald-500/20',
				icon: CheckCircle,
				label: 'Active'
			};
		case 'cancelled':
			return {
				color: 'text-red-600 dark:text-red-400',
				bg: 'bg-red-50 dark:bg-red-500/10',
				border: 'border-red-200 dark:border-red-500/20',
				icon: XCircle,
				label: 'Cancelled'
			};
		case 'past_due':
			return {
				color: 'text-amber-600 dark:text-amber-400',
				bg: 'bg-amber-50 dark:bg-amber-500/10',
				border: 'border-amber-200 dark:border-amber-500/20',
				icon: AlertCircle,
				label: 'Past Due'
			};
		case 'trialing':
			return {
				color: 'text-neutral-500 dark:text-neutral-400',
				bg: 'bg-neutral-100 dark:bg-white/8',
				border: 'border-neutral-200 dark:border-white/10',
				icon: Clock,
				label: 'Trial'
			};
		case 'unpaid':
			return {
				color: 'text-red-600 dark:text-red-400',
				bg: 'bg-red-50 dark:bg-red-500/10',
				border: 'border-red-200 dark:border-red-500/20',
				icon: AlertCircle,
				label: 'Unpaid'
			};
		default:
			return {
				color: 'text-neutral-500 dark:text-neutral-400',
				bg: 'bg-neutral-50 dark:bg-white/4',
				border: 'border-neutral-200 dark:border-white/8',
				icon: Clock,
				label: status.charAt(0).toUpperCase() + status.slice(1)
			};
	}
};

const getPlanIcon = (planName: string) => {
	const lp = planName.toLowerCase();
	if (lp.includes('premium') || lp.includes('pro')) return Crown;
	if (lp.includes('enterprise') || lp.includes('business')) return TrendingUp;
	return Calendar;
};

export function SubscriptionHistoryCard({ subscription }: { subscription: SubscriptionHistoryItem }) {
	const locale = useLocale();
	const [showDetails, setShowDetails] = useState(false);
	const statusConfig = getStatusConfig(subscription.status);
	const StatusIcon = statusConfig.icon;
	const PlanIcon = getPlanIcon(subscription.planName);
	const isActive = subscription.status.toLowerCase() === 'active';
	const isCancelled = subscription.status.toLowerCase() === 'cancelled';

	return (
		<div className={CARD}>
			{/* Main row */}
			<div className="flex items-start gap-3">
				<div className={ICON_TILE}>
					<PlanIcon className={ICON} />
				</div>

				<div className="flex-1 min-w-0">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{subscription.planName}</p>

							{/* Badges */}
							<div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
								<span
									className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}
								>
									<StatusIcon className="h-3 w-3" />
									{statusConfig.label}
								</span>
								<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-white/8 border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400">
									{subscription.billingInterval.charAt(0).toUpperCase() + subscription.billingInterval.slice(1)}
								</span>
								{isActive && (
									<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
										<CheckCircle className="h-3 w-3" />
										Current
									</span>
								)}
							</div>
						</div>

						<div className="text-right shrink-0">
							<p className="text-sm font-semibold text-neutral-900 dark:text-white">
								{formatCurrencyAmount(subscription.amount, subscription.currency, locale)}
							</p>
							<p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">per {subscription.billingInterval}</p>
						</div>
					</div>

					{/* Timeline */}
					<div className="flex items-center gap-4 mt-2">
						<span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
							<Calendar className="h-3 w-3" />
							Started {formatDate(subscription.startDate)}
						</span>
						<span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
							<Clock className="h-3 w-3" />
							{subscription.endDate ? `Ended ${formatDate(subscription.endDate)}` : 'Ongoing'}
						</span>
					</div>
				</div>
			</div>

			{/* Cancellation notice */}
			{isCancelled && subscription.cancelledAt && (
				<div className="mt-3 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
					<XCircle className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
					<div>
						<p className="text-xs font-medium text-red-700 dark:text-red-400">
							Cancelled {formatDate(subscription.cancelledAt)}
						</p>
						{subscription.cancelReason && (
							<p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
								Reason: {subscription.cancelReason}
							</p>
						)}
					</div>
				</div>
			)}

			{/* Footer */}
			<div className="mt-3 pt-3 border-t border-neutral-100 dark:border-white/[0.06] flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
					<span>
						ID:{' '}
						<code className="bg-neutral-100 dark:bg-white/4 px-1.5 py-0.5 rounded text-[10px] font-mono border border-neutral-200 dark:border-white/8">
							{subscription.id.slice(-8)}
						</code>
					</span>
					<span>
						Plan:{' '}
						<code className="bg-neutral-100 dark:bg-white/4 px-1.5 py-0.5 rounded text-[10px] font-mono border border-neutral-200 dark:border-white/8">
							{subscription.planId.slice(-8)}
						</code>
					</span>
				</div>

				<div className="flex items-center gap-2">
					{isActive && (
						<Link
							href="/pricing"
							className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 transition-colors"
						>
							<TrendingUp className="h-3.5 w-3.5" />
							Manage
						</Link>
					)}
					<button onClick={() => setShowDetails((v) => !v)} aria-expanded={showDetails} className={OUTLINE_BTN}>
						<Calendar className="h-3 w-3" />
						{showDetails ? 'Hide' : 'Details'}
					</button>
					<a
						href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Subscription question — ${subscription.id}`)}`}
						className="text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
					>
						Support
					</a>
				</div>
			</div>

			{showDetails && (
				<dl className="mt-3 pt-3 border-t border-neutral-100 dark:border-white/[0.06] grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
					{[
						['Plan', subscription.planName],
						['Status', statusConfig.label],
						['Started', formatDate(subscription.startDate)],
						['Ends', formatDate(subscription.endDate)],
						subscription.cancelledAt ? ['Cancelled', formatDate(subscription.cancelledAt)] : null,
						subscription.cancelReason ? ['Reason', subscription.cancelReason] : null
					]
						.filter((entry): entry is [string, string] => entry !== null)
						.map(([label, value]) => (
							<div key={label} className="flex flex-col gap-0.5">
								<dt className={LABEL}>{label}</dt>
								<dd className="text-xs font-medium text-neutral-900 dark:text-white">{value}</dd>
							</div>
						))}
				</dl>
			)}
		</div>
	);
}
