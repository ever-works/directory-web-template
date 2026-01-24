'use client';

import { useState, useCallback } from 'react';
import { useAdminFilters } from '@/hooks/use-admin-filters';
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
import { SponsorSearch } from '@/components/admin/sponsorships/sponsor-search';
import { SponsorTableFilters } from '@/components/admin/sponsorships/sponsor-table-filters';
import { SponsorTable } from '@/components/admin/sponsorships/sponsor-table';
import { RejectModal } from '@/components/admin/sponsorships/reject-modal';
import { LoadingSkeleton } from '@/components/admin/sponsorships/loading-skeleton';

/**
 * Admin Sponsorships Page
 * Main orchestrator for the sponsorships management page
 */
export default function AdminSponsorshipsPage() {
	const t = useTranslations('admin.SPONSORSHIPS');

	// Pagination state (managed separately for passing to hook)
	const [currentPage, setCurrentPage] = useState(1);

	// Unified filter state with debounced search
	const {
		searchTerm,
		setSearchTerm,
		debouncedSearchTerm,
		isSearching,
		statusFilter,
		setStatusFilter,
	} = useAdminFilters<SponsorAdStatus>({
		minSearchLength: 2,
		debounceDelay: 300,
		onFiltersChange: () => setCurrentPage(1),
	});

	// UI state for modals
	const [rejectModalOpen, setRejectModalOpen] = useState(false);
	const [forceApproveModalOpen, setForceApproveModalOpen] = useState(false);
	const [selectedSponsorAd, setSelectedSponsorAd] = useState<SponsorAd | null>(null);
	const [rejectionReason, setRejectionReason] = useState('');
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
	const [pendingApproveId, setPendingApproveId] = useState<string | null>(null);

	// Data fetching hook - pass filter values as parameters
	const {
		sponsorAds,
		stats,
		isLoading,
		isSubmitting,
		totalPages,
		approveSponsorAd,
		rejectSponsorAd,
		cancelSponsorAd,
		deleteSponsorAd,
	} = useAdminSponsorAds({
		page: currentPage,
		status: statusFilter || undefined, // Convert '' to undefined for API
		search: debouncedSearchTerm || undefined, // Convert '' to undefined for API
	});

	// Check if skeleton should be shown (only on initial page load)
	const shouldShowSkeleton = useSkeletonVisibility(isLoading, sponsorAds.length > 0);

	// Handlers
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

	const handlePageChange = useCallback((page: number) => {
		setCurrentPage(page);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}, []);

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

			{/* Search (standalone, above table) */}
			<SponsorSearch
				searchTerm={searchTerm}
				onSearchChange={setSearchTerm}
				isSearching={isSearching}
			/>

			{/* Sponsor Ads Table with status filters in header */}
			<SponsorTable
				sponsorAds={sponsorAds}
				isLoading={isLoading}
				isSubmitting={isSubmitting}
				confirmDeleteId={confirmDeleteId}
				onApprove={handleApprove}
				onReject={handleOpenRejectModal}
				onCancel={handleCancel}
				onDelete={handleDelete}
				headerControls={
					<SponsorTableFilters
						statusFilter={statusFilter}
						onStatusChange={setStatusFilter}
						stats={stats}
					/>
				}
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
