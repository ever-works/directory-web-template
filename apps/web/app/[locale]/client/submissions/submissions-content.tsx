'use client';

import { useState, useCallback, useEffect } from 'react';
import { PageContainer } from '@/components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FiFileText, FiPlus, FiChevronLeft, FiChevronRight, FiTrash2 } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
	SubmissionList,
	SubmissionFilters,
	SubmissionStatsCards,
	DeleteSubmissionDialog,
	EditSubmissionModal,
	SubmissionDetailModal,
	toSubmission,
	Submission
} from '@/components/submissions';
import { useClientItems, useClientItemFilters } from '@/hooks';
import { ClientUpdateItemInput } from '@/lib/validations/client-item';
import { Button } from '@/components/ui/button';
import { BulkSubmitButton } from '@/components/submit/bulk-submit-button';

export function SubmissionsContent() {
	const t = useTranslations('client.submissions');

	// Filter state
	const { status, search, page, params, setStatus, setSearch, setPage, isSearching, nextPage, prevPage } =
		useClientItemFilters();

	// Data fetching
	const {
		items,
		stats,
		total: _total,
		totalPages,
		isLoading,
		isFetching,
		isStatsLoading,
		updateItem,
		deleteItem,
		isUpdating,
		isDeleting
	} = useClientItems(params);

	// Modal state
	const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [detailModalOpen, setDetailModalOpen] = useState(false);
	const [actionItemId, setActionItemId] = useState<string | null>(null);

	// Reset page when search changes
	useEffect(() => {
		if (page !== 1 && search) {
			setPage(1);
		}
	}, [search]); // eslint-disable-line react-hooks/exhaustive-deps

	// Handlers
	const handleView = useCallback(
		(id: string) => {
			const item = items.find((i) => i.id === id);
			if (item) {
				setSelectedSubmission(toSubmission(item));
				setDetailModalOpen(true);
			}
		},
		[items]
	);

	const handleEdit = useCallback(
		(id: string) => {
			const item = items.find((i) => i.id === id);
			if (item) {
				setSelectedSubmission(toSubmission(item));
				setActionItemId(id);
				setEditModalOpen(true);
			}
		},
		[items]
	);

	const handleDelete = useCallback(
		(id: string) => {
			const item = items.find((i) => i.id === id);
			if (item) {
				setSelectedSubmission(toSubmission(item));
				setActionItemId(id);
				setDeleteDialogOpen(true);
			}
		},
		[items]
	);

	const handleSaveEdit = useCallback(
		async (data: ClientUpdateItemInput) => {
			if (!actionItemId) return;
			const success = await updateItem(actionItemId, data);
			if (success) {
				setEditModalOpen(false);
				setActionItemId(null);
			}
		},
		[actionItemId, updateItem]
	);

	const handleConfirmDelete = useCallback(async () => {
		if (!actionItemId) return;
		const success = await deleteItem(actionItemId);
		if (success) {
			setDeleteDialogOpen(false);
			setActionItemId(null);
		}
	}, [actionItemId, deleteItem]);

	// Status counts for filters
	const statusCounts = {
		all: stats.total,
		approved: stats.approved,
		pending: stats.pending,
		rejected: stats.rejected
	};

	return (
		<div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50 dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#0a0a0a]">
			<PageContainer maxWidth="7xl" padding="default">
				<div className="space-y-8 py-8">
					{/* Page Header */}
					<div className="text-center space-y-4">
						<div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-theme-primary-100 to-theme-primary-200 dark:from-theme-primary-900/40 dark:to-theme-primary-800/40 rounded-2xl mb-4">
							<FiFileText className="w-8 h-8 text-theme-primary-600 dark:text-theme-primary-400" />
						</div>
						<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t('PAGE_TITLE')}</h1>
						<p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
							{t('PAGE_DESCRIPTION')}
						</p>
					</div>

					{/* Stats Cards */}
					<SubmissionStatsCards stats={stats} isLoading={isStatsLoading} />

					{/* Submissions List */}
					<Card className="hover:shadow-lg hover:shadow-theme-primary-500/10 border border-gray-200 dark:border-white/[0.06] transition-all duration-300 bg-white/95 dark:bg-[#141414]/95 backdrop-blur-xs">
						<CardHeader>
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
								<CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
									<FiFileText className="w-5 h-5 text-theme-primary-600 dark:text-theme-primary-400" />
									{t('YOUR_SUBMISSIONS')}
								</CardTitle>
								<div className="flex items-center gap-3">
									<Link
										href="/client/submissions/trash"
										className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-100 dark:bg-white/[0.05] hover:bg-gray-200 dark:hover:bg-white/[0.06] rounded-lg transition-all duration-300 font-medium"
									>
										<FiTrash2 className="w-4 h-4" />
										{t('TRASH')}
									</Link>
									<BulkSubmitButton />
									<Link
										href="/submit"
										className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-theme-primary-600 to-theme-primary-700 hover:from-theme-primary-700 hover:to-theme-primary-800 text-white rounded-lg transition-all duration-300 font-medium shadow-xs hover:shadow-md"
									>
										<FiPlus className="w-4 h-4" />
										{t('NEW_SUBMISSION')}
									</Link>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* Filters */}
							<SubmissionFilters
								status={status}
								search={search}
								onStatusChange={setStatus}
								onSearchChange={setSearch}
								isSearching={isSearching}
								disabled={isLoading}
								statusCounts={statusCounts}
							/>

							{/* List */}
							<SubmissionList
								items={items}
								isLoading={isLoading}
								onView={handleView}
								onEdit={handleEdit}
								onDelete={handleDelete}
								deletingId={isDeleting ? actionItemId : null}
								updatingId={isUpdating ? actionItemId : null}
								emptyStateTitle={t('EMPTY_STATE_TITLE')}
								emptyStateDescription={t('EMPTY_STATE_DESC')}
								emptyStateActionLabel={t('SUBMIT_FIRST_PROJECT')}
							/>

							{/* Pagination */}
							{totalPages > 1 && (
								<div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-white/[0.06]">
									<div className="text-sm text-gray-500 dark:text-gray-400">
										{t('SHOWING_PAGE', { page, totalPages })}
									</div>
									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={prevPage}
											disabled={page === 1 || isFetching}
										>
											<FiChevronLeft className="w-4 h-4" />
											{t('PREVIOUS')}
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={nextPage}
											disabled={page >= totalPages || isFetching}
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

			{/* Modals */}
			<SubmissionDetailModal
				submission={selectedSubmission}
				open={detailModalOpen}
				onOpenChange={setDetailModalOpen}
				onEdit={handleEdit}
				onDelete={handleDelete}
			/>

			<EditSubmissionModal
				submission={selectedSubmission}
				open={editModalOpen}
				onOpenChange={setEditModalOpen}
				onSave={handleSaveEdit}
				isLoading={isUpdating}
			/>

			<DeleteSubmissionDialog
				submission={selectedSubmission}
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleConfirmDelete}
			/>
		</div>
	);
}
