'use client';

import { useTranslations } from 'next-intl';
import { FiDollarSign } from 'react-icons/fi';
import { SponsorshipItem, SponsorshipItemSkeleton } from './sponsorship-item';
import type { SponsorAd } from '@/lib/db/schema';
import { Link } from '@/i18n/navigation';

interface PricingConfig {
	enabled: boolean;
	weeklyPrice: number;
	monthlyPrice: number;
	currency: string;
}

export interface SponsorshipListProps {
	items: SponsorAd[];
	pricingConfig: PricingConfig;
	isLoading?: boolean;
	skeletonCount?: number;
	emptyStateTitle?: string;
	emptyStateDescription?: string;
	onViewDetails?: (id: string) => void;
	onCancel?: (sponsorAd: SponsorAd) => void;
	onPayNow?: (sponsorAd: SponsorAd) => void;
	onRenew?: (sponsorAd: SponsorAd) => void;
	isActionDisabled?: boolean;
}

export function SponsorshipList({
	items,
	pricingConfig,
	isLoading = false,
	skeletonCount = 3,
	emptyStateTitle,
	emptyStateDescription,
	onViewDetails,
	onCancel,
	onPayNow,
	onRenew,
	isActionDisabled = false,
}: SponsorshipListProps) {
	const t = useTranslations('client.sponsorships');

	// Loading state
	if (isLoading) {
		return (
			<div className="space-y-3">
				{Array.from({ length: skeletonCount }).map((_, index) => (
					<SponsorshipItemSkeleton key={index} />
				))}
			</div>
		);
	}

	// Empty state
	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-8 px-4">
				<div className="w-8 h-8 bg-gray-100 dark:bg-white/5 rounded-lg flex items-center justify-center mb-3">
					<FiDollarSign className="w-4 h-4 text-gray-400 dark:text-gray-500" />
				</div>
				<h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
					{emptyStateTitle || t('EMPTY_STATE_TITLE')}
				</h3>
				<p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-sm mb-4">
					{emptyStateDescription || t('EMPTY_STATE_DESC')}
				</p>
				<Link
					href="/sponsor"
					className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 text-white dark:text-gray-900 rounded-lg transition-all duration-300 font-medium text-xs"
				>
					<FiDollarSign className="w-3.5 h-3.5" />
					{t('CREATE_FIRST_SPONSORSHIP')}
				</Link>
			</div>
		);
	}

	// List of items
	return (
		<div className="space-y-3">
			{items.map((item) => (
				<SponsorshipItem
					key={item.id}
					sponsorAd={item}
					pricingConfig={pricingConfig}
					onViewDetails={onViewDetails}
					onCancel={onCancel}
					onPayNow={onPayNow}
					onRenew={onRenew}
					isActionDisabled={isActionDisabled}
				/>
			))}
		</div>
	);
}
