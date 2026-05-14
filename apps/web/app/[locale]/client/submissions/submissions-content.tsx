'use client';

import { useState, useCallback, useEffect } from 'react';
import { PageContainer } from '@/components/ui/container';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

	const { status, search, page, params, setStatus, setSearch, setPage, isSearching, nextPage, prevPage } =
		useClientItemFilters();

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

	const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [detailModalOpen, setDetailModalOpen] = useState(false);
	const [actionItemId, setActionItemId] = useState<string | null>(null);

	useEffect(() => {
		if (page !== 1 && search) {
			setPage(1);
		}
	}, [search]); // eslint-disable-line react-hooks/exhaustive-deps

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

	const statusCounts = {
		all: stats.total,
		approved: stats.approved,
		pending: stats.pending,
		rejected: stats.rejected
	};

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a]">
			<PageContainer maxWidth="7xl" padding="default">
				<div className="py-8 space-y-6">
					{/* Page Header */}
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 bg-theme-primary-100 dark:bg-theme-primary-900/40 rounded-xl flex items-center justify-center">
								<FiFileText className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />
							</div>
							<div>
								<h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
									{t('PAGE_TITLE')}
								</h1>
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('PAGE_DESCRIPTION')}</p>
							</div>
						</div>

						{/* Actions */}
						<div className="flex items-center gap-2 shrink-0">
							<Link
								href="/client/submissions/trash"
								className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg hover:bg-gray-50 dark:hover:bg-white/8 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-150"
							>
								<FiTrash2 className="w-3.5 h-3.5" />
								<span className="hidden sm:inline">{t('TRASH')}</span>
							</Link>
							<BulkSubmitButton />
							<Link
								href="/submit"
								className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-primary-600 hover:bg-theme-primary-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
							>
								<FiPlus className="w-3.5 h-3.5" />
								<span className="hidden sm:inline">{t('NEW_SUBMISSION')}</span>
								<span className="sm:hidden">New</span>
							</Link>
						</div>
					</div>

					{/* Stats Cards */}
					<SubmissionStatsCards stats={stats} isLoading={isStatsLoading} />

					{/* Submissions List */}
					<Card className="border border-gray-200 dark:border-white/6 bg-white dark:bg-[#111111] shadow-sm">
						<CardHeader className="pb-0 pt-4 px-4">
							<div className="flex items-center justify-between">
								<h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
									<FiFileText className="w-4 h-4 text-theme-primary-500" />
									{t('YOUR_SUBMISSIONS')}
								</h2>
							</div>
						</CardHeader>
						<CardContent className="p-4 space-y-4">
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
								<div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/[0.05]">
									<p className="text-xs text-gray-500 dark:text-gray-400">
										{t('SHOWING_PAGE', { page, totalPages })}
									</p>
									<div className="flex items-center gap-1.5">
										<Button
											variant="outline"
											size="sm"
											onClick={prevPage}
											disabled={page === 1 || isFetching}
											className="h-7 px-2 text-xs"
										>
											<FiChevronLeft className="w-3.5 h-3.5" />
											{t('PREVIOUS')}
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={nextPage}
											disabled={page >= totalPages || isFetching}
											className="h-7 px-2 text-xs"
										>
											{t('NEXT')}
											<FiChevronRight className="w-3.5 h-3.5" />
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
