'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, Tag, Eye, AlertTriangle, Settings } from 'lucide-react';
import { TagForm } from '@/components/admin/tags/tag-form';
import { TagData } from '@/lib/types/tag';
import { UniversalPagination } from '@/components/universal-pagination';
import { toast } from 'sonner';
import { useTags, useTagManagement } from '@/hooks/use-admin-tags';
import { useTranslations } from 'next-intl';
import { useTagsEnabled } from '@/hooks/use-tags-enabled';
import Link from 'next/link';
import { useNavigation } from '@/components/providers';
import { Container } from '@/components/ui/container';
import { cn } from '@/lib/utils';

export default function AdminTagsPage() {
	const t = useTranslations('admin.ADMIN_TAGS_PAGE');
	const { tagsEnabled } = useTagsEnabled();
	const { isInitialLoad } = useNavigation();
	const [currentPage, setCurrentPage] = useState(1);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
	const [selectedTag, setSelectedTag] = useState<TagData | undefined>();
	const [deletingTagId, setDeletingTagId] = useState<string | null>(null);

	const { data: tagsData, isLoading, error } = useTags(currentPage, 10);
	const { createTag, updateTag, deleteTag, isCreating, isUpdating } = useTagManagement();

	const handlePageChange = (newPage: number) => {
		setCurrentPage(newPage);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const handleCreateTag = async (data: { id: string; name: string; isActive: boolean }) => {
		try {
			await createTag(data);
			toast.success(t('TAG_CREATED_SUCCESS'));
			setIsModalOpen(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('TAG_CREATE_ERROR'));
		}
	};

	const handleUpdateTag = async (data: { id: string; name: string; isActive: boolean }) => {
		if (!selectedTag) return;
		try {
			await updateTag(selectedTag.id, data);
			toast.success(t('TAG_UPDATED_SUCCESS'));
			setIsModalOpen(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('TAG_UPDATE_ERROR'));
		}
	};

	const handleDeleteTag = async (tagId: string) => {
		if (!confirm(t('DELETE_CONFIRMATION'))) return;
		try {
			setDeletingTagId(tagId);
			await deleteTag(tagId);
			toast.success(t('TAG_DELETED_SUCCESS'));
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('TAG_DELETE_ERROR'));
		} finally {
			setDeletingTagId(null);
		}
	};

	const openCreateModal = () => {
		setFormMode('create');
		setSelectedTag(undefined);
		setIsModalOpen(true);
	};

	const openEditModal = (tag: TagData) => {
		setFormMode('edit');
		setSelectedTag(tag);
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setSelectedTag(undefined);
	};

	const handleFormSubmit = (data: { id: string; name: string; isActive: boolean }) => {
		if (formMode === 'create') {
			handleCreateTag(data);
		} else {
			handleUpdateTag(data);
		}
	};

	if (error) {
		return (
			<Container useGlobalWidth>
				<div className="flex flex-col items-center justify-center py-20 text-center">
					<div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4 ring-1 ring-red-200 dark:ring-red-500/20">
						<Tag className="w-6 h-6 text-red-500 dark:text-red-400" />
					</div>
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
						{t('ERROR_MESSAGE', { errorMessage: error.message })}
					</h3>
					<button
						type="button"
						onClick={() => window.location.reload()}
						className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200"
					>
						{t('RETRY')}
					</button>
				</div>
			</Container>
		);
	}

	const shouldShowSkeleton = isInitialLoad && isLoading;
	const totalTags = tagsData?.total || 0;
	const activeTags = tagsData?.tags?.filter((tag) => tag.isActive).length ?? 0;
	const activePercent = totalTags > 0 ? Math.round((activeTags / totalTags) * 100) : 0;

	if (shouldShowSkeleton) {
		return (
			<Container useGlobalWidth>
				{/* Header skeleton */}
				<div className="mb-8">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-white/8 animate-pulse shrink-0" />
							<div>
								<div className="h-5 w-36 bg-gray-200 dark:bg-white/8 rounded-lg animate-pulse mb-2" />
								<div className="h-3.5 w-48 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
							</div>
						</div>
						<div className="h-9 w-32 bg-gray-200 dark:bg-white/8 rounded-xl animate-pulse shrink-0" />
					</div>
					<div className="mt-5 h-px bg-gray-200 dark:bg-white/8 animate-pulse" />
				</div>

				{/* Stats skeleton */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
					{[0, 1].map((i) => (
						<div key={i} className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5">
							<div className="flex items-start justify-between mb-4">
								<div className="h-3 w-24 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
								<div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-white/8 animate-pulse" />
							</div>
							<div className="h-7 w-16 bg-gray-200 dark:bg-white/8 rounded animate-pulse mb-3" />
							<div className="h-3 w-20 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
						</div>
					))}
				</div>

				{/* Table skeleton */}
				<div className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl overflow-hidden">
					<div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/6 bg-gray-50/60 dark:bg-white/1.5 flex items-center justify-between">
						<div className="h-4 w-20 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
						<div className="h-3.5 w-16 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
					</div>
					<div className="divide-y divide-gray-50 dark:divide-white/4">
						{Array.from({ length: 6 }, (_, i) => (
							<div key={i} className="px-5 py-4 flex items-center justify-between">
								<div className="flex items-center gap-4">
									<div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-white/8 animate-pulse shrink-0" />
									<div>
										<div className="h-4 w-28 bg-gray-200 dark:bg-white/8 rounded animate-pulse mb-1.5" />
										<div className="h-3 w-16 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
									</div>
								</div>
								<div className="flex items-center gap-2">
									<div className="h-5 w-14 bg-gray-200 dark:bg-white/8 rounded-full animate-pulse" />
									<div className="h-7 w-7 bg-gray-200 dark:bg-white/8 rounded-lg animate-pulse" />
									<div className="h-7 w-7 bg-gray-200 dark:bg-white/8 rounded-lg animate-pulse" />
								</div>
							</div>
						))}
					</div>
				</div>
			</Container>
		);
	}

	return (
		<Container useGlobalWidth>
			{/* Warning Banner — Tags Disabled */}
			{!tagsEnabled && (
				<div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700/30">
					<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 shrink-0 mt-0.5">
						<AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
					</div>
					<div className="flex-1 min-w-0">
						<h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
							{t('WARNING_DISABLED_TITLE')}
						</h3>
						<p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
							{t('WARNING_DISABLED_MESSAGE')}
						</p>
						<Link
							href="/admin/settings"
							className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 text-xs font-medium rounded-md text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-700/30 transition-colors"
						>
							<Settings className="w-3 h-3" />
							{t('WARNING_DISABLED_ACTION')}
						</Link>
					</div>
				</div>
			)}

			{/* Page Header */}
			<div className="mb-8">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="w-11 h-11 rounded-xl bg-gray-900 dark:bg-gray-800 flex items-center justify-center shrink-0 shadow-sm">
							<Tag className="w-5 h-5 text-white" />
						</div>
						<div>
							<h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
								{t('TITLE')}
							</h1>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('SUBTITLE')}</p>
						</div>
					</div>
					<button
						type="button"
						onClick={openCreateModal}
						className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-950 shrink-0"
					>
						<Plus className="w-4 h-4" />
						{t('ADD_TAG')}
					</button>
				</div>
				<div className="mt-5 h-px bg-linear-to-r from-gray-200 via-gray-100 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent" />
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
				<div className="relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200">
					<div className="flex items-start justify-between mb-4 pt-0.5">
						<p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
							{t('TOTAL_TAGS_STAT')}
						</p>
						<div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
							<Tag className="w-4 h-4" />
						</div>
					</div>
					<p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-3">
						{totalTags}
					</p>
					<p className="text-xs text-gray-500 dark:text-gray-400">{t('TOTAL_TAGS')}</p>
				</div>

				<div className="relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200">
					<div className="flex items-start justify-between mb-4 pt-0.5">
						<p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
							{t('ACTIVE_TAGS_STAT')}
						</p>
						<div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
							<Eye className="w-4 h-4" />
						</div>
					</div>
					<p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-3">
						{activeTags}
					</p>
					<div className="h-1.5 w-full bg-gray-100 dark:bg-white/6 rounded-full mb-2.5 overflow-hidden">
						<div
							className="h-full bg-linear-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700"
							style={{ width: `${activePercent}%` }}
						/>
					</div>
					<div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
						<span className="text-emerald-600 dark:text-emerald-400 font-semibold">{activePercent}%</span>
						<span>{t('ACTIVE')}</span>
					</div>
				</div>
			</div>

			{/* Tags List */}
			<div className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl overflow-hidden">
				<div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/6 bg-gray-50/60 dark:bg-white/1.5 flex items-center justify-between">
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('TAGS_TABLE_TITLE')}</h3>
					<span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
						{t('TAGS_TOTAL_COUNT', { total: totalTags })}
					</span>
				</div>

				<div className="divide-y divide-gray-50 dark:divide-white/4">
					{!tagsData?.tags?.length ? (
						<div className="flex flex-col items-center justify-center px-6 py-20 text-center">
							<div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/6 flex items-center justify-center mb-4 ring-1 ring-gray-200 dark:ring-white/8">
								<Tag className="w-6 h-6 text-gray-400 dark:text-gray-500" />
							</div>
							<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
								{t('NO_TAGS_FOUND')}
							</h3>
							<p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed mb-6">
								{t('NO_TAGS_DESCRIPTION')}
							</p>
							<button
								type="button"
								onClick={openCreateModal}
								className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-950"
							>
								<Plus className="w-4 h-4" />
								{t('CREATE_TAG')}
							</button>
						</div>
					) : (
						tagsData.tags.map((tag) => (
							<div
								key={tag.id}
								className="group flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-5 py-4 hover:bg-gray-50/80 dark:hover:bg-white/2.5 transition-colors duration-150"
							>
								<div className="flex items-center gap-4 flex-1 min-w-0">
									<div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/8 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0">
										<Tag className="w-4 h-4" />
									</div>
									<div className="flex-1 min-w-0 space-y-1">
										<div className="flex items-center gap-2 flex-wrap">
											<h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
												{tag.name}
											</h4>
											<span className={cn(
												'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset',
												tag.isActive
													? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20'
													: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-400 dark:ring-white/8'
											)}>
												<span className="w-1 h-1 rounded-full bg-current opacity-75 shrink-0" />
												{tag.isActive ? t('ACTIVE') : t('INACTIVE')}
											</span>
										</div>
										<p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
											ID: {tag.id}
										</p>
									</div>
								</div>

								<div className="flex items-center gap-1.5 ml-14 md:ml-0 md:opacity-0 group-hover:opacity-100 transition-opacity duration-150">
									<button
										type="button"
										onClick={() => openEditModal(tag)}
										className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/6 transition-colors"
										title={t('TAG_UPDATED_SUCCESS')}
									>
										<Edit className="w-4 h-4" />
									</button>
									<button
										type="button"
										disabled={deletingTagId === tag.id}
										onClick={() => handleDeleteTag(tag.id)}
										className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
										title={t('TAG_DELETED_SUCCESS')}
									>
										<Trash2 className="w-4 h-4" />
									</button>
								</div>
							</div>
						))
					)}
				</div>

				{tagsData && tagsData.totalPages > 1 && (
					<div className="p-4 border-t border-gray-100 dark:border-white/6">
						<UniversalPagination
							page={currentPage}
							totalPages={tagsData.totalPages}
							onPageChange={handlePageChange}
						/>
					</div>
				)}
			</div>

			{/* Form Modal */}
			{isModalOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full -mr-2 [&::-webkit-scrollbar]:w-1"
					onClick={(e) => e.target === e.currentTarget && !(isCreating || isUpdating) && closeModal()}
				>
					<div className="w-full max-w-md my-8">
						<TagForm
							tag={selectedTag}
							mode={formMode}
							onSubmit={handleFormSubmit}
							onCancel={closeModal}
							isLoading={isCreating || isUpdating}
						/>
					</div>
				</div>
			)}
		</Container>
	);
}
