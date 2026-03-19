'use client';

import { Container } from '@/components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FiTrash2, FiArrowLeft, FiInbox } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { TrashItem, TrashItemSkeleton } from '@/components/submissions/trash-item';
import { useDeletedClientItems } from '@/hooks/use-deleted-client-items';
import { useTranslations } from 'next-intl';

export default function TrashPage() {
	const t = useTranslations('client.submissions');
	const { items, isLoading, restoreItem, restoringItemId, total } = useDeletedClientItems();

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#0a0a0a]">
			<Container maxWidth="7xl" padding="default">
				<div className="space-y-8 py-8">
					{/* Header */}
					<div className="flex items-center gap-4">
						<Link
							href="/client/settings/profile/submissions"
							className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 transition-colors font-medium"
						>
							<FiArrowLeft className="w-4 h-4" />
							{t('BACK_TO_SUBMISSIONS')}
						</Link>
					</div>

					{/* Page Header */}
					<div className="text-center space-y-4">
						<div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/[0.05] dark:to-white/[0.08] rounded-2xl mb-4">
							<FiTrash2 className="w-8 h-8 text-gray-500 dark:text-gray-400" />
						</div>
						<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t('TRASH_TITLE')}</h1>
						<p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
							{t('TRASH_DESCRIPTION')}
						</p>
					</div>

					{/* Trash Items List */}
					<Card className="border border-gray-200 dark:border-white/[0.06] bg-white/95 dark:bg-[#141414]/95 backdrop-blur-sm">
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
											href="/client/settings/profile/submissions"
											className="inline-flex items-center gap-2 px-6 py-3 bg-theme-primary-600 hover:bg-theme-primary-700 text-white rounded-lg font-medium transition-colors"
										>
											<FiArrowLeft className="w-4 h-4" />
											{t('BACK_TO_SUBMISSIONS')}
										</Link>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</Container>
		</div>
	);
}
