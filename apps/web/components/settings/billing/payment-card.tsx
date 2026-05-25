'use client';

import { CreditCard, Calendar, ExternalLink, Download, CheckCircle, Clock, AlertCircle, X, Edit3, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import { Link } from '@/i18n/navigation';
import { formatCurrencyAmount } from '@/lib/utils/currency-format';
import { useSubscriptionActions } from '@/hooks/use-lemonsqueezy-subscription';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SOCIAL_EMAIL || 'ever@ever.works';

interface PaymentHistoryItem {
	id: string;
	date: string;
	amount: number;
	currency: string;
	plan: string;
	planId: string;
	status: string;
	billingInterval: string;
	paymentProvider: string;
	subscriptionId: string;
	description: string;
	invoiceUrl?: string | null;
	invoiceNumber?: string | null;
}

const CARD = 'bg-white dark:bg-white/3 rounded-xl border border-neutral-200 dark:border-white/8 p-4';
const ICON_TILE = 'p-2 bg-neutral-100 dark:bg-white/8 rounded-lg flex items-center justify-center shrink-0';
const ICON = 'h-4 w-4 text-neutral-500 dark:text-neutral-400';
const OUTLINE_BTN =
	'inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors';
const LABEL = 'text-xs text-neutral-500 dark:text-neutral-400';

const formatDate = (date: string) =>
	new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

const getStatusConfig = (status: string) => {
	switch (status.toLowerCase()) {
		case 'paid':
			return {
				color: 'text-emerald-600 dark:text-emerald-400',
				bg: 'bg-emerald-50 dark:bg-emerald-500/10',
				border: 'border-emerald-200 dark:border-emerald-500/20',
				icon: CheckCircle,
				label: 'Paid'
			};
		case 'pending':
			return {
				color: 'text-neutral-500 dark:text-neutral-400',
				bg: 'bg-neutral-100 dark:bg-white/8',
				border: 'border-neutral-200 dark:border-white/10',
				icon: Clock,
				label: 'Pending'
			};
		case 'failed':
			return {
				color: 'text-red-600 dark:text-red-400',
				bg: 'bg-red-50 dark:bg-red-500/10',
				border: 'border-red-200 dark:border-red-500/20',
				icon: AlertCircle,
				label: 'Failed'
			};
		case 'draft':
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

export function PaymentCard({ payment, onChanged }: { payment: PaymentHistoryItem; onChanged?: () => void }) {
	const locale = useLocale();
	const [showDetails, setShowDetails] = useState(false);
	const { cancelSubscription } = useSubscriptionActions();
	const statusConfig = getStatusConfig(payment.status);
	const StatusIcon = statusConfig.icon;
	const isLemonSqueezy =
		!!payment.subscriptionId && payment.paymentProvider.toLowerCase() === 'lemonsqueezy';

	const handleCancelLemonSqueezy = async () => {
		if (!window.confirm('Cancel this subscription at the end of the current billing period?')) return;
		const toastId = toast.loading('Cancelling subscription…');
		try {
			await cancelSubscription.mutateAsync({ subscriptionId: payment.subscriptionId, cancelAtPeriodEnd: true });
			toast.success('Subscription will be cancelled at end of period', { id: toastId });
			onChanged?.();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to cancel subscription', { id: toastId });
		}
	};

	return (
		<div className={CARD}>
			{/* Main row */}
			<div className="flex items-start gap-3">
				<div className={ICON_TILE}>
					<CreditCard className={ICON} />
				</div>

				<div className="flex-1 min-w-0">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{payment.plan}</p>
							<p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">{payment.description}</p>
						</div>
						<p className="text-sm font-semibold text-neutral-900 dark:text-white shrink-0">
							{formatCurrencyAmount(payment.amount, payment.currency, locale)}
						</p>
					</div>

					{/* Badges row */}
					<div className="flex items-center gap-1.5 mt-2 flex-wrap">
						<span
							className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}
						>
							<StatusIcon className="h-3 w-3" />
							{statusConfig.label}
						</span>
						<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-white/8 border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400">
							{payment.paymentProvider.charAt(0).toUpperCase() + payment.paymentProvider.slice(1)}
						</span>
						<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-white/8 border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400">
							{payment.billingInterval.charAt(0).toUpperCase() + payment.billingInterval.slice(1)}
						</span>
					</div>

					{/* Meta row */}
					<div className="flex items-center gap-4 mt-2">
						<span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
							<Calendar className="h-3 w-3" />
							{formatDate(payment.date)}
						</span>
						{payment.invoiceNumber && (
							<span className="text-xs text-neutral-500 dark:text-neutral-400">
								Invoice {payment.invoiceNumber}
							</span>
						)}
					</div>
				</div>
			</div>

			{/* Footer */}
			<div className="mt-3 pt-3 border-t border-neutral-100 dark:border-white/[0.06] flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
					<span>
						ID:{' '}
						<code className="bg-neutral-100 dark:bg-white/4 px-1.5 py-0.5 rounded text-[10px] font-mono border border-neutral-200 dark:border-white/8">
							{payment.id.slice(-8)}
						</code>
					</span>
					{payment.subscriptionId && (
						<span>
							Sub:{' '}
							<code className="bg-neutral-100 dark:bg-white/4 px-1.5 py-0.5 rounded text-[10px] font-mono border border-neutral-200 dark:border-white/8">
								{payment.subscriptionId.slice(-8)}
							</code>
						</span>
					)}
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{payment.invoiceUrl && (
						<a
							href={payment.invoiceUrl}
							target="_blank"
							rel="noopener noreferrer"
							className={OUTLINE_BTN}
						>
							<ExternalLink className="h-3 w-3" />
							Invoice
						</a>
					)}
					{payment.invoiceUrl && (
						<a href={payment.invoiceUrl} download target="_blank" rel="noopener noreferrer" className={OUTLINE_BTN}>
							<Download className="h-3 w-3" />
							Download
						</a>
					)}
					{isLemonSqueezy && (
						<>
							<Link
								href="/pricing"
								className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
							>
								<Edit3 className="h-3 w-3" />
								Modify
							</Link>
							<button
								onClick={handleCancelLemonSqueezy}
								disabled={cancelSubscription.isPending}
								className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
							>
								{cancelSubscription.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
								Cancel
							</button>
						</>
					)}
					<button
						onClick={() => setShowDetails((v) => !v)}
						aria-expanded={showDetails}
						className="text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
					>
						{showDetails ? 'Hide' : 'Details'}
					</button>
					<a
						href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Billing question — payment ${payment.id}`)}`}
						className="text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
					>
						Support
					</a>
				</div>
			</div>

			{showDetails && (
				<dl className="mt-3 pt-3 border-t border-neutral-100 dark:border-white/[0.06] grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
					{[
						['Date', formatDate(payment.date)],
						['Amount', formatCurrencyAmount(payment.amount, payment.currency, locale)],
						['Status', statusConfig.label],
						['Provider', payment.paymentProvider],
						['Billing', payment.billingInterval],
						payment.invoiceNumber ? ['Invoice', payment.invoiceNumber] : null
					]
						.filter(Boolean)
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
