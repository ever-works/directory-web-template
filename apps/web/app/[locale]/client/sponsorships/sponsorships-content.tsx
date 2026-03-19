'use client';

import { useState, useCallback } from 'react';
import { PageContainer } from '@/components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FiDollarSign, FiPlus, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
	SponsorshipStatsCards,
	SponsorshipFilters,
	SponsorshipList,
	SponsorshipDetailModal,
	CancelDialog,
	RenewDialog,
	type SponsorshipStatusFilter,
	type SponsorshipIntervalFilter
} from '@/components/sponsorships';
import { useUserSponsorAds } from '@/hooks/use-user-sponsor-ads';
import { Button } from '@/components/ui/button';
import type { SponsorAdStatus } from '@/lib/types/sponsor-ad';
import type { SponsorAd } from '@/lib/db/schema';

interface PricingConfig {
	enabled: boolean;
	weeklyPrice: number;
	monthlyPrice: number;
	currency: string;
}

interface SponsorshipsContentProps {
	pricingConfig: PricingConfig;
}

export function SponsorshipsContent({ pricingConfig }: SponsorshipsContentProps) {
	const t = useTranslations('client.sponsorships');

	// Dialog state
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [renewDialogOpen, setRenewDialogOpen] = useState(false);
	const [selectedSponsorship, setSelectedSponsorship] = useState<SponsorAd | null>(null);
	const [cancelReason, setCancelReason] = useState('');

	// Modal state (from HEAD)
	const [selectedSponsorshipId, setSelectedSponsorshipId] = useState<string | null>(null);
	const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

	// Data fetching - hook manages all filter state internally
	const {
		sponsorAds,
		stats,
		totalPages,
		currentPage,
		isLoading,
		isFetching,
		isStatsLoading,
		isSearching,
		statusFilter,
		intervalFilter,
		search,
		setStatusFilter,
		setIntervalFilter,
		setSearch,
		setCurrentPage,
		nextPage,
		prevPage,
		refreshData,
		cancelSponsorAd,
		payNow,
		renewSponsorship,
		isCancelling,
		isPayingNow,
		isRenewing
	} = useUserSponsorAds();

	// Convert hook status filter to UI value
	const statusValue: SponsorshipStatusFilter = statusFilter || 'all';
	const intervalValue: SponsorshipIntervalFilter = intervalFilter || 'all';

	// Any action is in progress
	const isActionInProgress = isCancelling || isPayingNow || isRenewing;

	// Handle status change
	const handleStatusChange = useCallback(
		(newStatus: SponsorshipStatusFilter) => {
			const hookStatus: SponsorAdStatus | undefined = newStatus === 'all' ? undefined : newStatus;
			setStatusFilter(hookStatus);
			setCurrentPage(1);
		},
		[setStatusFilter, setCurrentPage]
	);

	// Handle interval change
	const handleIntervalChange = useCallback(
		(newInterval: SponsorshipIntervalFilter) => {
			const hookInterval = newInterval === 'all' ? undefined : newInterval;
			setIntervalFilter(hookInterval);
			setCurrentPage(1);
		},
		[setIntervalFilter, setCurrentPage]
	);

	// Handle search change
	const handleSearchChange = useCallback(
		(newSearch: string) => {
			setSearch(newSearch);
			setCurrentPage(1);
		},
		[setSearch, setCurrentPage]
	);

	// Handle view details (from HEAD)
	const handleViewDetails = useCallback((id: string) => {
		setSelectedSponsorshipId(id);
		setIsDetailModalOpen(true);
	}, []);

	// Handle modal close (from HEAD)
	const handleCloseModal = useCallback(() => {
		setIsDetailModalOpen(false);
		setSelectedSponsorshipId(null);
	}, []);

	// Handle action complete (refresh list after cancel, etc.) (from HEAD)
	const handleActionComplete = useCallback(() => {
		refreshData();
	}, [refreshData]);

	// Inline action handlers (from incoming)
	const handleCancelClick = useCallback((sponsorAd: SponsorAd) => {
		setSelectedSponsorship(sponsorAd);
		setCancelReason('');
		setCancelDialogOpen(true);
	}, []);

	const handlePayNowClick = useCallback(
		async (sponsorAd: SponsorAd) => {
			const result = await payNow(sponsorAd.id);
			if (result?.checkoutUrl) {
				window.location.href = result.checkoutUrl;
			}
		},
		[payNow]
	);

	const handleRenewClick = useCallback((sponsorAd: SponsorAd) => {
		setSelectedSponsorship(sponsorAd);
		setRenewDialogOpen(true);
	}, []);

	const handleCancelConfirm = useCallback(async () => {
		if (!selectedSponsorship) return;

		const success = await cancelSponsorAd(selectedSponsorship.id, cancelReason || undefined);
		if (success) {
			setCancelDialogOpen(false);
			setSelectedSponsorship(null);
			setCancelReason('');
		}
	}, [selectedSponsorship, cancelReason, cancelSponsorAd]);

	const handleRenewConfirm = useCallback(async () => {
		if (!selectedSponsorship) return;

		const result = await renewSponsorship(selectedSponsorship.id);
		if (result?.checkoutUrl) {
			window.location.href = result.checkoutUrl;
		}
	}, [selectedSponsorship, renewSponsorship]);

	const handleCancelDialogClose = useCallback(() => {
		if (!isCancelling) {
			setCancelDialogOpen(false);
			setSelectedSponsorship(null);
			setCancelReason('');
		}
	}, [isCancelling]);

	const handleRenewDialogClose = useCallback(() => {
		if (!isRenewing) {
			setRenewDialogOpen(false);
			setSelectedSponsorship(null);
		}
	}, [isRenewing]);

	return (
		<div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50 dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#0a0a0a]">
			<PageContainer maxWidth="7xl" padding="default">
				<div className="space-y-6 py-8">
					{/* Page Header */}
					<div className="text-center space-y-3">
						<div className="inline-flex items-center justify-center w-14 h-14 bg-linear-to-br from-theme-primary-100 to-theme-primary-200 dark:from-theme-primary-900/40 dark:to-theme-primary-800/40 rounded-xl mb-2">
							<FiDollarSign className="w-7 h-7 text-theme-primary-600 dark:text-theme-primary-400" />
						</div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('PAGE_TITLE')}</h1>
						<p className="text-gray-600 dark:text-gray-300 text-base max-w-xl mx-auto">
							{t('PAGE_DESCRIPTION')}
						</p>
					</div>

					{/* Stats Cards */}
					<SponsorshipStatsCards stats={stats} isLoading={isStatsLoading} />

					{/* Sponsorships List */}
					<Card className="hover:shadow-lg hover:shadow-theme-primary-500/10 border border-gray-200 dark:border-white/[0.06] transition-all duration-300 bg-white/95 dark:bg-[#141414]/95 backdrop-blur-xs">
						<CardHeader className="pb-4">
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
								<CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
									<FiDollarSign className="w-5 h-5 text-theme-primary-600 dark:text-theme-primary-400" />
									{t('YOUR_SPONSORSHIPS')}
								</CardTitle>
								<Link
									href="/sponsor"
									className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-theme-primary-600 to-theme-primary-700 hover:from-theme-primary-700 hover:to-theme-primary-800 text-white rounded-lg transition-all duration-300 font-medium shadow-xs hover:shadow-md text-sm"
								>
									<FiPlus className="w-4 h-4" />
									{t('NEW_SPONSORSHIP')}
								</Link>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Filters */}
							<SponsorshipFilters
								status={statusValue}
								interval={intervalValue}
								search={search}
								onStatusChange={handleStatusChange}
								onIntervalChange={handleIntervalChange}
								onSearchChange={handleSearchChange}
								isSearching={isSearching}
								disabled={isLoading}
							/>

							{/* List */}
							<SponsorshipList
								items={sponsorAds}
								pricingConfig={pricingConfig}
								isLoading={isLoading}
								emptyStateTitle={t('EMPTY_STATE_TITLE')}
								emptyStateDescription={t('EMPTY_STATE_DESC')}
								onViewDetails={handleViewDetails}
								onCancel={handleCancelClick}
								onPayNow={handlePayNowClick}
								onRenew={handleRenewClick}
								isActionDisabled={isActionInProgress}
							/>

							{/* Pagination */}
							{totalPages > 1 && (
								<div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-white/[0.06]">
									<div className="text-sm text-gray-500 dark:text-gray-400">
										{t('SHOWING_PAGE', { page: currentPage, totalPages })}
									</div>
									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={prevPage}
											disabled={currentPage === 1 || isFetching}
										>
											<FiChevronLeft className="w-4 h-4" />
											{t('PREVIOUS')}
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={nextPage}
											disabled={currentPage >= totalPages || isFetching}
										>
											{t('NEXT')}
											<FiChevronRight className="w-4 h-4" />
										</Button>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</PageContainer>

			{/* Sponsorship Detail Modal (from HEAD) */}
			<SponsorshipDetailModal
				isOpen={isDetailModalOpen}
				sponsorshipId={selectedSponsorshipId}
				onClose={handleCloseModal}
				onActionComplete={handleActionComplete}
			/>

			{/* Cancel Dialog (from incoming) */}
			<CancelDialog
				isOpen={cancelDialogOpen}
				sponsorAd={selectedSponsorship}
				cancelReason={cancelReason}
				isSubmitting={isCancelling}
				onReasonChange={setCancelReason}
				onConfirm={handleCancelConfirm}
				onClose={handleCancelDialogClose}
			/>

			{/* Renew Dialog (from incoming) */}
			<RenewDialog
				isOpen={renewDialogOpen}
				sponsorAd={selectedSponsorship}
				pricingConfig={pricingConfig}
				isSubmitting={isRenewing}
				onConfirm={handleRenewConfirm}
				onClose={handleRenewDialogClose}
			/>
		</div>
	);
}
