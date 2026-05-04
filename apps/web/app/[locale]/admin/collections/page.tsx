'use client';

import { useMemo, useState } from 'react';
import { FolderPlus, Edit, Trash2, Layers, Link2, ListChecks } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Collection } from '@/types/collection';
import { Container } from '@/components/ui/container';
import { useAdminCollections } from '@/hooks/use-admin-collections';
import { UniversalPagination } from '@/components/universal-pagination';
import { CollectionForm } from '@/components/admin/collections/collection-form';
import { AssignItemsModal } from '@/components/admin/collections/assign-items-modal';
import { CollectionsSkeleton } from '@/components/admin/collections/collections-skeleton';
import { useNavigation } from '@/components/providers';

const ICON_GRADIENTS = [
	'bg-linear-to-br from-blue-500 to-blue-600',
	'bg-linear-to-br from-violet-500 to-violet-600',
	'bg-linear-to-br from-emerald-500 to-emerald-600',
	'bg-linear-to-br from-amber-500 to-amber-600',
	'bg-linear-to-br from-pink-500 to-pink-600',
	'bg-linear-to-br from-indigo-500 to-indigo-600',
	'bg-linear-to-br from-teal-500 to-teal-600',
	'bg-linear-to-br from-rose-500 to-rose-600',
];

export default function AdminCollectionsPage() {
	const t = useTranslations('common');
	const PageSize = 10;
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
	const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
	const [formIsOpen, setFormIsOpen] = useState(false);
	const [assignIsOpen, setAssignIsOpen] = useState(false);
	const [assignInitialIds, setAssignInitialIds] = useState<string[]>([]);

	const {
		collections,
		total,
		totalPages,
		isLoading,
		isSubmitting,
		createCollection,
		updateCollection,
		deleteCollection,
		assignItems,
		fetchAssignedItems,
	} = useAdminCollections({ page: currentPage, limit: PageSize, sortBy: 'name', includeInactive: true });

	const activeCollections = useMemo(
		() => collections.filter((c) => c.isActive !== false).length,
		[collections]
	);

	const totalItemsInCollections = useMemo(
		() => collections.reduce((sum, col) => sum + (col.item_count || 0), 0),
		[collections]
	);

	const openCreateForm = () => {
		setSelectedCollection(null);
		setFormMode('create');
		setFormIsOpen(true);
	};

	const openEditForm = (collection: Collection) => {
		setSelectedCollection(collection);
		setFormMode('edit');
		setFormIsOpen(true);
	};

	const closeForm = () => {
		setFormIsOpen(false);
		setSelectedCollection(null);
	};

	const handleFormSubmit = async (data: any) => {
		if (formMode === 'create') {
			const success = await createCollection(data);
			if (success) closeForm();
		} else if (selectedCollection) {
			const success = await updateCollection(selectedCollection.id, data);
			if (success) closeForm();
		}
	};

	const handleDelete = async (collection: Collection) => {
		const confirmDelete = confirm(t('DELETE_COLLECTION_CONFIRM', { name: collection.name }));
		if (!confirmDelete) return;
		await deleteCollection(collection.id);
	};

	const handleAssign = async (collection: Collection) => {
		let assignedSlugs = Array.isArray(collection.items) && collection.items.length ? collection.items : [];
		if (assignedSlugs.length === 0) {
			const assigned = await fetchAssignedItems(collection.id);
			assignedSlugs = assigned.map((item) => item.slug);
		}
		setSelectedCollection(collection);
		setAssignInitialIds(assignedSlugs);
		setAssignIsOpen(true);
	};

	const handleAssignSave = async (itemSlugs: string[]) => {
		if (!selectedCollection) return;
		await assignItems(selectedCollection.id, itemSlugs);
	};

	const { isInitialLoad } = useNavigation();
	if (isInitialLoad && isLoading) return <CollectionsSkeleton itemCount={PageSize} />;

	const activePercent = total > 0 ? Math.round((activeCollections / total) * 100) : 0;

	return (
		<Container useGlobalWidth>

			{/* Page Header */}
			<div className="mb-8">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="w-11 h-11 rounded-xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/25 dark:shadow-violet-500/15">
							<Layers className="w-5 h-5 text-white" />
						</div>
						<div>
							<h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
								{t('MANAGE_COLLECTIONS')}
							</h1>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('MANAGE_COLLECTIONS_DESC')}</p>
						</div>
					</div>
					<button
						type="button"
						onClick={openCreateForm}
						className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-950 shrink-0"
					>
						<FolderPlus className="w-4 h-4" />
						{t('ADD_COLLECTION')}
					</button>
				</div>
				<div className="mt-5 h-px bg-linear-to-r from-gray-200 via-gray-100 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent" />
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

				{/* Total */}
				<div className="relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200">
					<div className="absolute top-0 inset-x-0 h-0.5 rounded-t-2xl bg-linear-to-r from-blue-500 to-blue-400" />
					<div className="flex items-start justify-between mb-4 pt-0.5">
						<p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
							{t('TOTAL')}
						</p>
						<div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
							<Layers className="w-4 h-4" />
						</div>
					</div>
					<p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-3">{total}</p>
					<p className="text-xs text-gray-500 dark:text-gray-400">{t('COLLECTION')}</p>
				</div>

				{/* Active — with progress bar */}
				<div className="relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200">
					<div className="absolute top-0 inset-x-0 h-0.5 rounded-t-2xl bg-linear-to-r from-emerald-500 to-emerald-400" />
					<div className="flex items-start justify-between mb-4 pt-0.5">
						<p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
							{t('ACTIVE')}
						</p>
						<div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
							<ListChecks className="w-4 h-4" />
						</div>
					</div>
					<p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-3">{activeCollections}</p>
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

				{/* Items Assigned */}
				<div className="relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200">
					<div className="absolute top-0 inset-x-0 h-0.5 rounded-t-2xl bg-linear-to-r from-violet-500 to-violet-400" />
					<div className="flex items-start justify-between mb-4 pt-0.5">
						<p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
							{t('ITEMS_ASSIGNED')}
						</p>
						<div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
							<Link2 className="w-4 h-4" />
						</div>
					</div>
					<p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-3">{totalItemsInCollections}</p>
					<p className="text-xs text-gray-500 dark:text-gray-400">{t('ITEMS_ASSIGNED')}</p>
				</div>
			</div>

			{/* Collections List */}
			<div className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl overflow-hidden">

				{/* Card header */}
				<div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/6 bg-gray-50/60 dark:bg-white/1.5 flex items-center justify-between">
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('COLLECTION')}</h3>
					<span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
						{collections.length} {t('OF')} {total}
					</span>
				</div>

				<div className="divide-y divide-gray-50 dark:divide-white/4">
					{collections.length === 0 ? (
						<div className="flex flex-col items-center justify-center px-6 py-20 text-center">
							<div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/6 flex items-center justify-center mb-4 ring-1 ring-gray-200 dark:ring-white/8">
								<Layers className="w-6 h-6 text-gray-400 dark:text-gray-500" />
							</div>
							<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">{t('NO_COLLECTIONS_YET')}</h3>
							<p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed mb-6">
								{t('MANAGE_COLLECTIONS_DESC')}
							</p>
							<button
								type="button"
								onClick={openCreateForm}
								className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-950"
							>
								<FolderPlus className="w-4 h-4" />
								{t('ADD_COLLECTION')}
							</button>
						</div>
					) : (
						collections.map((collection, index) => (
							<div
								key={collection.id}
								className="group flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-5 py-4 hover:bg-gray-50/80 dark:hover:bg-white/2.5 transition-colors duration-150"
							>
								{/* Info */}
								<div className="flex items-start gap-4 flex-1 min-w-0">
									<div className={cn(
										'w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-sm shrink-0',
										ICON_GRADIENTS[index % ICON_GRADIENTS.length]
									)}>
										{collection.icon_url || collection.name.charAt(0).toUpperCase()}
									</div>
									<div className="flex-1 min-w-0 space-y-1">
										<div className="flex items-center gap-2 flex-wrap">
											<h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
												{collection.name}
											</h4>
											<span className={cn(
												'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset',
												collection.isActive !== false
													? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20'
													: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-400 dark:ring-white/8'
											)}>
												<span className="w-1 h-1 rounded-full bg-current opacity-75 shrink-0" />
												{collection.isActive !== false ? t('ACTIVE') : t('INACTIVE')}
											</span>
											<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20">
												{t('COLLECTION_ITEMS', { count: collection.item_count || 0 })}
											</span>
										</div>
										<p className="text-xs text-gray-400 dark:text-gray-500">/{collection.slug}</p>
										{collection.description && (
											<p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
												{collection.description}
											</p>
										)}
									</div>
								</div>

								{/* Actions */}
								<div className="flex items-center gap-1.5 ml-14 md:ml-0 md:opacity-0 group-hover:opacity-100 transition-opacity duration-150">
									<button
										type="button"
										onClick={() => handleAssign(collection)}
										className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
									>
										<Link2 className="w-3.5 h-3.5" />
										{t('ASSIGN_ITEMS')}
									</button>
									<button
										type="button"
										onClick={() => openEditForm(collection)}
										className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
									>
										<Edit className="w-3.5 h-3.5" />
										{t('EDIT')}
									</button>
									<button
										type="button"
										disabled={isSubmitting}
										onClick={() => handleDelete(collection)}
										className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-transparent text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200 dark:hover:border-red-500/20 transition-all duration-150 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
									>
										<Trash2 className="w-3.5 h-3.5" />
										{t('DELETE')}
									</button>
								</div>
							</div>
						))
					)}
				</div>

				{totalPages > 1 && (
					<div className="p-4 border-t border-gray-100 dark:border-white/6">
						<UniversalPagination
							page={currentPage}
							totalPages={totalPages}
							onPageChange={(page) => {
								setCurrentPage(page);
								window.scrollTo({ top: 0, behavior: 'smooth' });
							}}
						/>
					</div>
				)}
			</div>

			{/* Create / Edit modal */}
			{formIsOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full -mr-2 [&::-webkit-scrollbar]:w-1"
					onClick={(e) => e.target === e.currentTarget && !isSubmitting && closeForm()}
				>
					<div className="w-full max-w-2xl my-8 bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/8 rounded-2xl shadow-2xl shadow-black/30 max-h-[calc(100vh-4rem)] overflow-y-auto">
						<CollectionForm
							collection={selectedCollection || undefined}
							mode={formMode}
							isLoading={isSubmitting}
							onSubmit={handleFormSubmit}
							onCancel={closeForm}
						/>
					</div>
				</div>
			)}

			<AssignItemsModal
				isOpen={assignIsOpen}
				onClose={() => setAssignIsOpen(false)}
				collectionName={selectedCollection?.name || t('THIS_COLLECTION')}
				initialSelected={assignInitialIds}
				onSave={handleAssignSave}
			/>
		</Container>
	);
}
