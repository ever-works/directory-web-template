'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@heroui/react';
import { FiCalendar, FiDollarSign, FiClock, FiPackage, FiEye } from 'react-icons/fi';
import { CreditCard, XCircle, RefreshCw } from 'lucide-react';
import type { SponsorAd } from '@/lib/db/schema';
import type { SponsorAdStatus } from '@/lib/types/sponsor-ad';
import { formatDateShort } from '@/utils/date';
import { formatCurrencyAmount } from '@/lib/utils/currency-format';
import { SPONSOR_STATUS_CONFIG, formatSlugToTitle } from './constants';

interface PricingConfig {
	enabled: boolean;
	weeklyPrice: number;
	monthlyPrice: number;
	currency: string;
}

export interface SponsorshipItemProps {
	sponsorAd: SponsorAd;
	pricingConfig: PricingConfig;
	onViewDetails?: (id: string) => void;
	onCancel?: (sponsorAd: SponsorAd) => void;
	onPayNow?: (sponsorAd: SponsorAd) => void;
	onRenew?: (sponsorAd: SponsorAd) => void;
	isActionDisabled?: boolean;
}

export function SponsorshipItem({
	sponsorAd,
	pricingConfig,
	onViewDetails,
	onCancel,
	onPayNow,
	onRenew,
	isActionDisabled = false,
}: SponsorshipItemProps) {
	const t = useTranslations('client.sponsorships');

	const statusConfig = SPONSOR_STATUS_CONFIG[sponsorAd.status as SponsorAdStatus] || SPONSOR_STATUS_CONFIG.pending;
	const status = sponsorAd.status as SponsorAdStatus;

	// Get price based on interval from current pricing config
	const price = sponsorAd.interval === 'weekly'
		? pricingConfig.weeklyPrice
		: pricingConfig.monthlyPrice;

	// Determine which actions are available based on status
	const canPayNow = status === 'pending_payment';
	const canCancel = status === 'pending_payment' || status === 'pending' || status === 'active';
	const canRenew = status === 'active' || status === 'expired';

	const hasActions = canPayNow || canCancel || canRenew;

	const handleViewDetails = () => {
		onViewDetails?.(sponsorAd.id);
	};

	return (
		<div className="p-3 bg-white dark:bg-white/3 rounded-lg border border-gray-200 dark:border-white/6 hover:border-gray-300 dark:hover:border-white/8 transition-colors">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				{/* Item Info */}
				<div className="flex items-center gap-2.5 min-w-0 flex-1">
					<div className="flex-shrink-0 w-7 h-7 bg-gray-100 dark:bg-white/5 rounded flex items-center justify-center">
						<FiPackage className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
					</div>
					<div className="min-w-0 flex-1">
						<h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
							{formatSlugToTitle(sponsorAd.itemSlug)}
						</h3>
						<div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
							<span className="inline-flex items-center gap-0.5">
								<FiClock className="w-3 h-3" />
								{t(`INTERVAL_${sponsorAd.interval?.toUpperCase()}`)}
							</span>
							<span className="inline-flex items-center gap-0.5">
								<FiDollarSign className="w-3 h-3" />
								{formatCurrencyAmount(price, pricingConfig.currency)}
							</span>
						</div>
					</div>
				</div>

				{/* Status, Dates & View Details */}
				<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
					{/* Dates */}
					<div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
						<FiCalendar className="w-3.5 h-3.5 flex-shrink-0" />
						<span className="whitespace-nowrap">
							{formatDateShort(sponsorAd.startDate)} - {formatDateShort(sponsorAd.endDate)}
						</span>
					</div>

					{/* Status Badge */}
					<span
						className={`
							inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap
							${statusConfig.bg} ${statusConfig.text}
						`}
					>
						{t(statusConfig.labelKey)}
					</span>

					{/* View Details Button */}
					{onViewDetails && (
						<button
							onClick={handleViewDetails}
							className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 rounded-lg transition-colors"
						>
							<FiEye className="w-3.5 h-3.5" />
							{t('VIEW_DETAILS')}
						</button>
					)}
				</div>
			</div>

			{/* Action Buttons */}
			{hasActions && (
				<div className="mt-3 pt-2 border-t border-gray-100 dark:border-white/6 flex flex-wrap items-center gap-1.5">
					{canPayNow && onPayNow && (
						<Button
							size="sm"
							color="default"
							variant="flat"
							onPress={() => onPayNow(sponsorAd)}
							isDisabled={isActionDisabled}
							className="text-xs h-7 px-2.5"
							startContent={<CreditCard className="w-3 h-3" />}
						>
							{t('PAY_NOW')}
						</Button>
					)}
					{canRenew && onRenew && (
						<Button
							size="sm"
							color="default"
							variant="flat"
							onPress={() => onRenew(sponsorAd)}
							isDisabled={isActionDisabled}
							className="text-xs h-7 px-2.5"
							startContent={<RefreshCw className="w-3 h-3" />}
						>
							{t('RENEW')}
						</Button>
					)}
					{canCancel && onCancel && (
						<Button
							size="sm"
							color="default"
							variant="light"
							onPress={() => onCancel(sponsorAd)}
							isDisabled={isActionDisabled}
							className="text-xs h-7 px-2.5"
							startContent={<XCircle className="w-3 h-3" />}
						>
							{t('CANCEL')}
						</Button>
					)}
				</div>
			)}

			{/* Rejection reason if rejected */}
			{sponsorAd.status === 'rejected' && sponsorAd.rejectionReason && (
				<div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50">
					<p className="text-sm text-red-700 dark:text-red-400">
						<span className="font-medium">{t('REJECTION_REASON')}:</span> {sponsorAd.rejectionReason}
					</p>
				</div>
			)}

			{/* Cancellation reason if cancelled */}
			{sponsorAd.status === 'cancelled' && sponsorAd.cancelReason && (
				<div className="mt-3 p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/6">
					<p className="text-sm text-gray-700 dark:text-gray-400">
						<span className="font-medium">{t('CANCEL_REASON')}:</span> {sponsorAd.cancelReason}
					</p>
				</div>
			)}
		</div>
	);
}

export function SponsorshipItemSkeleton() {
	return (
		<div className="p-4 bg-white dark:bg-white/3 rounded-lg border border-gray-200 dark:border-white/6 animate-pulse">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div className="flex items-start gap-3 flex-1">
					<div className="w-10 h-10 bg-gray-200 dark:bg-white/8 rounded-lg" />
					<div className="flex-1 space-y-2">
						<div className="h-5 w-48 bg-gray-200 dark:bg-white/8 rounded" />
						<div className="h-4 w-32 bg-gray-200 dark:bg-white/8 rounded" />
					</div>
				</div>
				<div className="flex items-center gap-4">
					<div className="h-4 w-40 bg-gray-200 dark:bg-white/8 rounded" />
					<div className="h-6 w-20 bg-gray-200 dark:bg-white/8 rounded-full" />
				</div>
			</div>
		</div>
	);
}
