'use client';

import { useState, useCallback } from 'react';
import { PageContainer } from '@/components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FiTrash2, FiArrowLeft, FiInbox, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { TrashItem, TrashItemSkeleton } from '@/components/submissions/trash-item';
import { useDeletedClientItems } from '@/hooks/use-deleted-client-items';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function TrashContent() {
	const t = useTranslations('client.submissions');

	// Pagination state
	const [page, setPage] = useState(1);

	const { items, isLoading, isFetching, restoreItem, restoringItemId, total, totalPages } = useDeletedClientItems({
		page
	});

	// Pagination handlers
	const nextPage = useCallback(() => {
		if (page < totalPages) {
			setPage(page + 1);
		}
	}, [page, totalPages]);

	const prevPage = useCallback(() => {
		if (page > 1) {
			setPage(page - 1);
		}
	}, [page]);

	return (
		<div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50 dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#0a0a0a]">
			<PageContainer maxWidth="7xl" padding="default">
				<div className="space-y-8 py-8">
					{/* Header */}
					<div className="flex items-center gap-4">
						<Link
							href="/client/submissions"
							className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
						>
							<FiArrowLeft className="w-4 h-4" />
							{t('BACK_TO_SUBMISSIONS')}
						</Link>
					</div>

					{/* Page Header */}
					<div className="text-center space-y-4">
						<div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-gray-100 to-gray-200 dark:from-[#0a0a0a] dark:to-[#0a0a0a] rounded-2xl mb-4">
							<FiTrash2 className="w-8 h-8 text-gray-500 dark:text-gray-400" />
						</div>
						<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t('TRASH_TITLE')}</h1>
						<p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
							{t('TRASH_DESCRIPTION')}
						</p>
					</div>

					{/* Trash Items List */}
					<Card className="border border-gray-200 dark:border-white/[0.06] bg-white/95 dark:bg-[#141414]/95 backdrop-blur-xs">
						<CardHeader>
							<CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
								<FiTrash2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
								{t('DELETED_ITEMS')} {total > 0 && `(${total})`}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{isLoading ? (
									// Loading state
									<>
										<TrashItemSkeleton />
										<TrashItemSkeleton />
										<TrashItemSkeleton />
									</>
								) : items.length > 0 ? (
									// Items list
									items.map((item) => (
										<TrashItem
											key={item.id}
											item={item}
											onRestore={restoreItem}
											restoringItemId={restoringItemId}
										/>
									))
								) : (
									// Empty state
									<div className="text-center py-12">
										<div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-white/[0.05] rounded-full mb-4">
											<FiInbox className="w-8 h-8 text-gray-400" />
										</div>
										<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
											{t('TRASH_EMPTY')}
										</h3>
										<p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
											{t('TRASH_EMPTY_DESC')}
										</p>
										<Link
											href="/client/submissions"
											className="inline-flex items-center gap-2 px-6 py-3 bg-theme-primary-600 hover:bg-theme-primary-700 text-white rounded-lg font-medium transition-colors"
										>
											<FiArrowLeft className="w-4 h-4" />
											{t('BACK_TO_SUBMISSIONS')}
										</Link>
									</div>
								)}
							</div>

							{/* Pagination */}
							{totalPages > 1 && (
								<div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200 dark:border-white/[0.06]">
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
		</div>
	);
}
