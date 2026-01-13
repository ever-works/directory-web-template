'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDebounceValue } from '@/hooks/use-debounced-value';
import { useSkeletonVisibility } from '@/hooks/use-skeleton-visibility';
import { useAdminSponsorAds } from '@/hooks/use-admin-sponsor-ads';
import { UniversalPagination } from '@/components/universal-pagination';
import { useTranslations } from 'next-intl';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import { AlertTriangle } from 'lucide-react';
import type { SponsorAd } from '@/lib/db/schema';
import type { SponsorAdStatus } from '@/lib/types/sponsor-ad';

// Components
import { PageHeader } from '@/components/admin/sponsorships/page-header';
import { SponsorStats } from '@/components/admin/sponsorships/sponsor-stats';
import { SponsorFilters } from '@/components/admin/sponsorships/sponsor-filters';
import { SponsorTable } from '@/components/admin/sponsorships/sponsor-table';
import { RejectModal } from '@/components/admin/sponsorships/reject-modal';
import { LoadingSkeleton } from '@/components/admin/sponsorships/loading-skeleton';

/**
 * Admin Sponsorships Page
 * Main orchestrator for the sponsorships management page
 */
export default function AdminSponsorshipsPage() {
	const t = useTranslations('admin.SPONSORSHIPS');

	// UI state
	const [searchTerm, setSearchTerm] = useState('');
	const [localStatusFilter, setLocalStatusFilter] = useState<SponsorAdStatus | undefined>(undefined);
	const [rejectModalOpen, setRejectModalOpen] = useState(false);
	const [forceApproveModalOpen, setForceApproveModalOpen] = useState(false);
	const [selectedSponsorAd, setSelectedSponsorAd] = useState<SponsorAd | null>(null);
	const [rejectionReason, setRejectionReason] = useState('');
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
	const [pendingApproveId, setPendingApproveId] = useState<string | null>(null);

	// Debounced search - only triggers API call after user stops typing
	const debouncedSearchTerm = useDebounceValue(searchTerm, 400);
	const isSearching = searchTerm !== debouncedSearchTerm && searchTerm.trim() !== '';

	// Data fetching hook
	const {
		sponsorAds,
		stats,
		isLoading,
		isSubmitting,
		currentPage,
		totalPages,
		totalItems,
		approveSponsorAd,
		rejectSponsorAd,
		cancelSponsorAd,
		deleteSponsorAd,
		setStatusFilter,
		setSearchTerm: setHookSearchTerm,
		setCurrentPage
	} = useAdminSponsorAds();

	// Calculate active filters
	const activeFilterCount = [searchTerm, localStatusFilter].filter(Boolean).length;

	// Check if skeleton should be shown (only on initial page load)
	const shouldShowSkeleton = useSkeletonVisibility(isLoading, sponsorAds.length > 0);

	// Sync debounced search term to hook (only when debounced value changes)
	useEffect(() => {
		setHookSearchTerm(debouncedSearchTerm);
		setCurrentPage(1); // Reset to page 1 when search changes (including when cleared)
	}, [debouncedSearchTerm, setHookSearchTerm, setCurrentPage]);

	// Handlers
	const handleSearchChange = useCallback((value: string) => {
		setSearchTerm(value);
	}, []);

	const handleStatusChange = useCallback(
		(value: SponsorAdStatus | undefined) => {
			setLocalStatusFilter(value);
			setStatusFilter(value);
		},
		[setStatusFilter]
	);

	const handleClearFilters = useCallback(() => {
		setSearchTerm('');
		setLocalStatusFilter(undefined);
		setHookSearchTerm('');
		setStatusFilter(undefined);
		setCurrentPage(1);
	}, [setHookSearchTerm, setStatusFilter, setCurrentPage]);

	const handleApprove = useCallback(
		async (id: string) => {
			const result = await approveSponsorAd(id);
			if (result.requiresForceApprove) {
				// Show confirmation modal for force approve
				setPendingApproveId(id);
				setForceApproveModalOpen(true);
			}
		},
		[approveSponsorAd]
	);

	const handleForceApprove = useCallback(async () => {
		if (!pendingApproveId) return;
		const result = await approveSponsorAd(pendingApproveId, true);
		if (result.success) {
			setForceApproveModalOpen(false);
			setPendingApproveId(null);
		}
	}, [pendingApproveId, approveSponsorAd]);

	const handleCloseForceApproveModal = useCallback(() => {
		setForceApproveModalOpen(false);
		setPendingApproveId(null);
	}, []);

	const handleOpenRejectModal = useCallback((sponsorAd: SponsorAd) => {
		setSelectedSponsorAd(sponsorAd);
		setRejectionReason('');
		setRejectModalOpen(true);
	}, []);

	const handleCloseRejectModal = useCallback(() => {
		setRejectModalOpen(false);
		setSelectedSponsorAd(null);
		setRejectionReason('');
	}, []);

	const handleRejectConfirm = useCallback(async () => {
		if (!selectedSponsorAd || rejectionReason.length < 10) return;
		const success = await rejectSponsorAd(selectedSponsorAd.id, rejectionReason);
		if (success) {
			handleCloseRejectModal();
		}
	}, [selectedSponsorAd, rejectionReason, rejectSponsorAd, handleCloseRejectModal]);

	const handleCancel = useCallback(
		async (id: string) => {
			if (!confirm(t('CONFIRM_CANCEL'))) return;
			await cancelSponsorAd(id);
		},
		[t, cancelSponsorAd]
	);

	const handleDelete = useCallback(
		async (id: string) => {
			if (confirmDeleteId !== id) {
				setConfirmDeleteId(id);
				return;
			}
			await deleteSponsorAd(id);
			setConfirmDeleteId(null);
		},
		[confirmDeleteId, deleteSponsorAd]
	);

	const handlePageChange = useCallback(
		(page: number) => {
			setCurrentPage(page);
			window.scrollTo({ top: 0, behavior: 'smooth' });
		},
		[setCurrentPage]
	);

	// Loading state - only show skeleton on initial page load
	if (shouldShowSkeleton) {
		return <LoadingSkeleton />;
	}

	return (
		<div className="p-6 max-w-7xl mx-auto">
			{/* Page Header */}
			<PageHeader />

			{/* Stats Cards */}
			<SponsorStats stats={stats} />

			{/* Filters */}
			<SponsorFilters
				searchTerm={searchTerm}
				statusFilter={localStatusFilter}
				onSearchChange={handleSearchChange}
				onStatusChange={handleStatusChange}
				onClearFilters={handleClearFilters}
				activeFilterCount={activeFilterCount}
				isSearching={isSearching}
			/>

			{/* Sponsor Ads Table */}
			<SponsorTable
				sponsorAds={sponsorAds}
				totalCount={totalItems}
				isLoading={isLoading}
				isSubmitting={isSubmitting}
				confirmDeleteId={confirmDeleteId}
				onApprove={handleApprove}
				onReject={handleOpenRejectModal}
				onCancel={handleCancel}
				onDelete={handleDelete}
			/>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex flex-col items-center mt-8 space-y-4">
					<UniversalPagination page={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
				</div>
			)}

			{/* Reject Modal */}
			<RejectModal
				isOpen={rejectModalOpen}
				sponsorAd={selectedSponsorAd}
				rejectionReason={rejectionReason}
				isSubmitting={isSubmitting}
				onReasonChange={setRejectionReason}
				onConfirm={handleRejectConfirm}
				onClose={handleCloseRejectModal}
			/>

			{/* Force Approve Modal */}
			<Modal isOpen={forceApproveModalOpen} onClose={handleCloseForceApproveModal} size="md">
				<ModalContent>
					<ModalHeader className="flex items-center gap-2">
						<AlertTriangle className="w-5 h-5 text-amber-500" />
						{t('FORCE_APPROVE_TITLE')}
					</ModalHeader>
					<ModalBody>
						<p className="text-gray-600 dark:text-gray-400">{t('FORCE_APPROVE_MESSAGE')}</p>
					</ModalBody>
					<ModalFooter>
						<Button variant="light" onPress={handleCloseForceApproveModal}>
							{t('CANCEL')}
						</Button>
						<Button color="warning" onPress={handleForceApprove} isLoading={isSubmitting}>
							{t('FORCE_APPROVE')}
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</div>
	);
}
