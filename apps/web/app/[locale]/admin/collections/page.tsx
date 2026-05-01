'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardBody, Chip, useDisclosure } from '@heroui/react';
import { FolderPlus, Edit, Trash2, Layers, Link2, ListChecks, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Collection } from '@/types/collection';
import { useAdminCollections } from '@/hooks/use-admin-collections';
import { UniversalPagination } from '@/components/universal-pagination';
import { CollectionForm } from '@/components/admin/collections/collection-form';
import { AssignItemsModal } from '@/components/admin/collections/assign-items-modal';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import { CollectionsSkeleton } from '@/components/admin/collections/collections-skeleton';
import { useNavigation } from '@/components/providers';

export default function AdminCollectionsPage() {
	const t = useTranslations('common');
	const PageSize = 10;
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
	const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
	const formDisclosure = useDisclosure();
	const assignDisclosure = useDisclosure();
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
		fetchAssignedItems
	} = useAdminCollections({ page: currentPage, limit: PageSize, sortBy: 'name', includeInactive: true });

	// Fetch all collections for global stats (with high limit to get all)
	const { data: allCollectionsData } = useQuery({
		queryKey: ['admin', 'collections', 'stats'],
		queryFn: async () => {
			const response = await serverClient.get<{
				success: boolean;
				collections: Collection[];
				total: number;
			}>('/api/admin/collections?limit=1000&includeInactive=true');
			if (!apiUtils.isSuccess(response)) {
				throw new Error(apiUtils.getErrorMessage(response));
			}
			return response.data;
		},
		staleTime: 5 * 60 * 1000
	});

	// Calculate global stats from all collections
	const activeCollections = useMemo(() => {
		const allCollections = allCollectionsData?.collections || [];
		return allCollections.filter((c) => c.isActive !== false).length;
	}, [allCollectionsData]);

	const totalItemsInCollections = useMemo(() => {
		const allCollections = allCollectionsData?.collections || [];
		return allCollections.reduce((sum, col) => sum + (col.item_count || 0), 0);
	}, [allCollectionsData]);

	const openCreateForm = () => {
		setSelectedCollection(null);
		setFormMode('create');
		formDisclosure.onOpen();
	};

	const openEditForm = (collection: Collection) => {
		setSelectedCollection(collection);
		setFormMode('edit');
		formDisclosure.onOpen();
	};

	const handleFormSubmit = async (data: any) => {
		if (formMode === 'create') {
			const success = await createCollection(data);
			if (success) {
				formDisclosure.onClose();
				setSelectedCollection(null);
			}
		} else if (selectedCollection) {
			const success = await updateCollection(selectedCollection.id, data);
			if (success) {
				formDisclosure.onClose();
				setSelectedCollection(null);
			}
		}
	};

	const handleDelete = async (collection: Collection) => {
		const confirmDelete = confirm(t('DELETE_COLLECTION_CONFIRM', { name: collection.name }));
		if (!confirmDelete) return;
		await deleteCollection(collection.id);
	};

	const handleAssign = async (collection: Collection) => {
		// Prefer items already stored on the collection (from collections.yml)
		let assignedSlugs = Array.isArray(collection.items) && collection.items.length ? collection.items : [];

		// Fallback to fetch if not present
		if (assignedSlugs.length === 0) {
			const assigned = await fetchAssignedItems(collection.id);
			assignedSlugs = assigned.map((item) => item.slug);
		}

		setSelectedCollection(collection);
		setAssignInitialIds(assignedSlugs);
		assignDisclosure.onOpen();
	};

	const handleAssignSave = async (itemSlugs: string[]) => {
		if (!selectedCollection) return;
		await assignItems(selectedCollection.id, itemSlugs);
	};

	const { isInitialLoad } = useNavigation();
	const shouldShowSkeleton = isInitialLoad && isLoading;

	if (shouldShowSkeleton) {
		return <CollectionsSkeleton itemCount={PageSize} />;
	}

	return (
		<div className="p-6 max-w-7xl mx-auto">
			<div className="mb-8">
				<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
							{t('MANAGE_COLLECTIONS')}
						</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{t('MANAGE_COLLECTIONS_DESC')}</p>
					</div>
					<Button
						color="primary"
						size="md"
						onPress={openCreateForm}
						startContent={<FolderPlus size={16} />}
						className="bg-linear-to-r from-theme-primary to-theme-accent hover:from-theme-primary/90 hover:to-theme-accent/90 shadow-md shadow-theme-primary/20 hover:shadow-lg hover:shadow-theme-primary/25 transition-all duration-200 text-white font-medium rounded-xl shrink-0"
					>
						{t('ADD_COLLECTION')}
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<Card className="relative overflow-hidden border border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.03] shadow-sm rounded-2xl">
					<CardBody className="p-6">
						<div className="flex items-start justify-between mb-3">
							<p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
								{t('COLLECTION')}
							</p>
							<div className="w-9 h-9 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center ring-1 ring-blue-100 dark:ring-blue-500/20 shrink-0">
								<Layers className="w-[18px] h-[18px] text-blue-500 dark:text-blue-400" />
							</div>
						</div>
						<p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-3">{total}</p>
						<p className="text-xs text-gray-500 dark:text-gray-500">{t('TOTAL')}</p>
					</CardBody>
				</Card>

				<Card className="relative overflow-hidden border border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.03] shadow-sm rounded-2xl">
					<CardBody className="p-6">
						<div className="flex items-start justify-between mb-3">
							<p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
								{t('ACTIVE')}
							</p>
							<div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center ring-1 ring-emerald-100 dark:ring-emerald-500/20 shrink-0">
								<ListChecks className="w-[18px] h-[18px] text-emerald-500 dark:text-emerald-400" />
							</div>
						</div>
						<p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-3">
							{activeCollections}
						</p>
						<p className="text-xs text-gray-500 dark:text-gray-500">{t('ACTIVE')}</p>
					</CardBody>
				</Card>

				<Card className="relative overflow-hidden border border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.03] shadow-sm rounded-2xl">
					<CardBody className="p-6">
						<div className="flex items-start justify-between mb-3">
							<p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
								{t('ITEMS_ASSIGNED')}
							</p>
							<div className="w-9 h-9 bg-violet-50 dark:bg-violet-500/10 rounded-xl flex items-center justify-center ring-1 ring-violet-100 dark:ring-violet-500/20 shrink-0">
								<Link2 className="w-[18px] h-[18px] text-violet-500 dark:text-violet-400" />
							</div>
						</div>
						<p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-3">
							{totalItemsInCollections}
						</p>
						<p className="text-xs text-gray-500 dark:text-gray-500">{t('ITEMS_ASSIGNED')}</p>
					</CardBody>
				</Card>
			</div>

			<Card className="border border-gray-100 dark:border-white/5 shadow-sm bg-white dark:bg-white/[0.03] overflow-hidden rounded-2xl">
				<CardBody className="p-0">
					<div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/40 dark:bg-white/[0.015] flex items-center justify-between">
						<h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('COLLECTION')}</h3>
						<span className="text-sm text-gray-500 dark:text-gray-400">
							{collections.length} {t('OF')} {total}
						</span>
					</div>

					<div className="divide-y divide-gray-100/50 dark:divide-white/[0.03]">
						{collections.length === 0 ? (
							<div className="px-6 py-16 text-center">
								<div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-100/60 dark:bg-white/5 flex items-center justify-center ring-1 ring-gray-200/60 dark:ring-white/5">
									<Layers className="w-7 h-7 text-gray-400 dark:text-gray-500" />
								</div>
								<p className="text-base font-semibold text-gray-900 dark:text-white mb-1.5">{t('NO_COLLECTIONS_YET')}</p>
								<p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">{t('MANAGE_COLLECTIONS_DESC')}</p>
							</div>
						) : (
							collections.map((collection, index) => {
								const ICON_BG = [
									'bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500',
									'bg-pink-500','bg-indigo-500','bg-teal-500','bg-rose-500',
								];
								const iconBg = ICON_BG[index % ICON_BG.length];
								return (
									<div
										key={collection.id}
										className="group px-6 py-4 hover:bg-gray-50/60 dark:hover:bg-white/[0.025] transition-all duration-150"
									>
										<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
											<div className="flex items-start gap-4 flex-1 min-w-0">
												<div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-sm shrink-0`}>
													{collection.icon_url || collection.name.charAt(0).toUpperCase()}
												</div>
												<div className="flex-1 min-w-0 space-y-1">
													<div className="flex items-center gap-2">
														<h4 className="font-medium text-gray-900 dark:text-white truncate">
															{collection.name}
														</h4>
														<Chip
															size="sm"
															variant="flat"
															color={collection.isActive !== false ? 'success' : 'danger'}
														>
															{collection.isActive !== false ? t('ACTIVE') : t('INACTIVE')}
														</Chip>
														<Chip size="sm" variant="flat" color="primary">
															{t('COLLECTION_ITEMS', { count: collection.item_count || 0 })}
														</Chip>
													</div>
													<p className="text-xs text-gray-500">
														{t('SLUG_LABEL')} {collection.slug}
													</p>
													{collection.description && (
														<p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
															{collection.description}
														</p>
													)}
												</div>
											</div>

											<div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
												<Button
													size="sm"
													variant="flat"
													onPress={() => handleAssign(collection)}
													className="h-9 px-3"
												>
													<Link2 className="w-4 h-4 mr-1" /> {t('ASSIGN_ITEMS')}
												</Button>
												<Button
													size="sm"
													variant="flat"
													onPress={() => openEditForm(collection)}
													className="h-9 px-3"
												>
													<Edit className="w-4 h-4 mr-1" /> {t('EDIT')}
												</Button>
												<Button
													size="sm"
													color="danger"
													variant="flat"
													onPress={() => handleDelete(collection)}
													className="h-9 px-3"
													isDisabled={isSubmitting}
												>
													<Trash2 className="w-4 h-4 mr-1" /> {t('DELETE')}
												</Button>
											</div>
										</div>
									</div>
								);
							})
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
				</CardBody>
			</Card>

			{formDisclosure.isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
						onClick={!isSubmitting ? formDisclosure.onClose : undefined}
					/>
					<div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 dark:border-neutral-800/80 max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
						<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800/80 bg-gray-50/40 dark:bg-neutral-950">
							<h2 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
								{formMode === 'create' ? t('CREATE_COLLECTION') : t('EDIT_COLLECTION')}
							</h2>
							{!isSubmitting && (
								<button
									onClick={formDisclosure.onClose}
									className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
									aria-label="Close"
								>
									<X className="w-4 h-4" />
								</button>
							)}
						</div>
						<div className="overflow-y-auto max-h-[calc(90vh-4rem)]">
							<CollectionForm
								collection={selectedCollection || undefined}
								mode={formMode}
								isLoading={isSubmitting}
								onSubmit={handleFormSubmit}
								onCancel={formDisclosure.onClose}
							/>
						</div>
					</div>
				</div>
			)}

			<AssignItemsModal
				isOpen={assignDisclosure.isOpen}
				onClose={assignDisclosure.onClose}
				collectionName={selectedCollection?.name || t('THIS_COLLECTION')}
				initialSelected={assignInitialIds}
				onSave={handleAssignSave}
			/>
		</div>
	);
}
