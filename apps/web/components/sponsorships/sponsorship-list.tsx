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
			<div className="flex flex-col items-center justify-center py-12 px-4">
				<div className="w-16 h-16 bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mb-4">
					<FiDollarSign className="w-8 h-8 text-gray-400 dark:text-gray-500" />
				</div>
				<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
					{emptyStateTitle || t('EMPTY_STATE_TITLE')}
				</h3>
				<p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
					{emptyStateDescription || t('EMPTY_STATE_DESC')}
				</p>
				<Link
					href="/sponsor"
					className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-theme-primary-600 to-theme-primary-700 hover:from-theme-primary-700 hover:to-theme-primary-800 text-white rounded-lg transition-all duration-300 font-medium shadow-xs hover:shadow-md"
				>
					<FiDollarSign className="w-4 h-4" />
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
