'use client';

import { useState, useCallback, useEffect } from 'react';
import { PageContainer } from '@/components/ui/container';
import { Card, CardContent } from '@/components/ui/card';
import {
	FiFileText,
	FiPlus,
	FiChevronLeft,
	FiChevronRight,
	FiTrash2,
} from 'react-icons/fi';
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
	Submission,
	StatusTabs,
} from '@/components/submissions';
import { useClientItems, useClientItemFilters } from '@/hooks';
import { ClientUpdateItemInput } from '@/lib/validations/client-item';
import { Button } from '@/components/ui/button';
import { BulkSubmitButton } from '@/components/submit/bulk-submit-button';
import { cn } from '@/lib/utils';

export function SubmissionsContent() {
	const t = useTranslations('client.submissions');

	const {
		status,
		search,
		page,
		params,
		sortBy,
		sortOrder,
		hasActiveFilters,
		setStatus,
		setSearch,
		setPage,
		setSortBy,
		toggleSortOrder,
		resetFilters,
		isSearching,
		nextPage,
		prevPage,
	} = useClientItemFilters();

	const {
		items,
		stats,
		total,
		limit,
		totalPages,
		isLoading,
		isFetching,
		isStatsLoading,
		updateItem,
		deleteItem,
		isUpdating,
		isDeleting,
		error,
		refetch,
	} = useClientItems(params);

	const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [detailModalOpen, setDetailModalOpen] = useState(false);
	const [actionItemId, setActionItemId] = useState<string | null>(null);

	useEffect(() => {
		if (page !== 1 && search) setPage(1);
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
		rejected: stats.rejected,
	};

	const start = total === 0 ? 0 : (page - 1) * limit + 1;
	const end = Math.min(page * limit, total);

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
			<PageContainer maxWidth="7xl" padding="default">
				<div className="space-y-6 py-6 sm:py-8">
					{/* Page Header */}
					<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-theme-primary-100 dark:bg-theme-primary-900/40">
								<FiFileText
									className="h-5 w-5 text-theme-primary-600 dark:text-theme-primary-400"
									aria-hidden="true"
								/>
							</div>
							<div className="min-w-0">
								<h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100 sm:text-xl">
									{t('PAGE_TITLE')}
								</h1>
								<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
									{t('PAGE_DESCRIPTION')}
								</p>
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-2">
							<Link
								href="/client/submissions/trash"
								className={cn(
									'inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700',
									'transition-colors hover:bg-gray-50 hover:text-gray-900',
									'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500/40',
									'dark:border-white/8 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/8 dark:hover:text-gray-100'
								)}
							>
								<FiTrash2 className="h-3.5 w-3.5" aria-hidden="true" />
								<span className="hidden sm:inline">{t('TRASH')}</span>
							</Link>
							<BulkSubmitButton />
							<Link
								href="/submit"
								className={cn(
									'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold shadow-sm',
									'bg-theme-primary-600 text-white hover:bg-theme-primary-700',
									'dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100',
									'transition-colors',
									'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500/40'
								)}
							>
								<FiPlus className="h-3.5 w-3.5" aria-hidden="true" />
								<span className="hidden sm:inline">{t('NEW_SUBMISSION')}</span>
								<span className="sm:hidden">{t('NEW_SUBMISSION_SHORT')}</span>
							</Link>
						</div>
					</header>

					{/* Stats Cards */}
					<SubmissionStatsCards stats={stats} isLoading={isStatsLoading} />

					{/* Submissions card */}
					<Card className="overflow-hidden border-gray-200 bg-white dark:border-white/8 dark:bg-[#111111]">
						<div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 dark:border-white/8 sm:flex-row sm:items-center sm:justify-between">
							<StatusTabs
								status={status}
								statusCounts={statusCounts}
								disabled={isLoading}
								onStatusChange={setStatus}
							/>
							{total > 0 && (
								<p className="text-xs text-gray-500 dark:text-gray-400">
									{t('SHOWING_RESULTS', { start, end, total })}
								</p>
							)}
						</div>

						<CardContent className="p-4 pt-3">
							<div className="space-y-4">
								<SubmissionFilters
									status={status}
									search={search}
									sortBy={sortBy}
									sortOrder={sortOrder}
									onStatusChange={setStatus}
									onSearchChange={setSearch}
									onSortByChange={setSortBy}
									onSortOrderToggle={toggleSortOrder}
									isSearching={isSearching}
									disabled={isLoading}
									hideStatusTabs
									statusCounts={statusCounts}
									onReset={resetFilters}
									hasActiveFilters={hasActiveFilters}
								/>

								<div className="-mx-4">
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
										hasActiveFilters={hasActiveFilters}
										onClearFilters={resetFilters}
										error={error}
										onRetry={() => refetch()}
									/>
								</div>

								{totalPages > 1 && !isLoading && !error && items.length > 0 && (
									<div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3 dark:border-white/6">
										<p className="text-xs text-gray-500 dark:text-gray-400">
											{t('SHOWING_PAGE', { page, totalPages })}
										</p>
										<nav
											aria-label={t('PAGINATION_NAV')}
											className="flex items-center gap-1.5"
										>
											<Button
												variant="outline"
												size="sm"
												onClick={prevPage}
												disabled={page === 1 || isFetching}
												aria-label={t('PREVIOUS')}
												className="h-8 px-2 text-xs"
											>
												<FiChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
												<span className="hidden sm:inline">{t('PREVIOUS')}</span>
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={nextPage}
												disabled={page >= totalPages || isFetching}
												aria-label={t('NEXT')}
												className="h-8 px-2 text-xs"
											>
												<span className="hidden sm:inline">{t('NEXT')}</span>
												<FiChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
											</Button>
										</nav>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</PageContainer>

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
