'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardBody, Chip, useDisclosure } from '@heroui/react';
import { FolderPlus, Edit, Trash2, Layers, Link2, ListChecks } from 'lucide-react';
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
				<div className="bg-linear-to-r from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg p-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div className="flex items-center space-x-4">
							<div className="w-12 h-12 bg-linear-to-br from-theme-primary to-theme-accent rounded-xl flex items-center justify-center shadow-lg">
								<Layers className="w-6 h-6 text-white" />
							</div>
							<div>
								<h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
									{t('MANAGE_COLLECTIONS')}
								</h1>
								<p className="text-gray-600 dark:text-gray-400 mt-1 flex items-center space-x-2">
									<span>{t('MANAGE_COLLECTIONS_DESC')}</span>
									<span className="hidden sm:inline">•</span>
									<span className="text-sm px-2 py-1 bg-theme-primary/10 text-theme-primary rounded-full font-medium">
										{total} {t('TOTAL')}
									</span>
								</p>
							</div>
						</div>
						<Button
							color="primary"
							size="lg"
							onPress={openCreateForm}
							startContent={<FolderPlus size={18} />}
							className="bg-linear-to-r from-theme-primary to-theme-accent hover:from-theme-primary/90 hover:to-theme-accent/90 shadow-lg shadow-theme-primary/25 hover:shadow-xl hover:shadow-theme-primary/40 transition-all duration-300 text-white font-medium"
						>
							{t('ADD_COLLECTION')}
						</Button>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
				<Card className="border-0 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 shadow-lg">
					<CardBody className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
									{t('COLLECTION')}
								</p>
								<p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{total}</p>
							</div>
							<div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
								<Layers className="w-6 h-6 text-white" />
							</div>
						</div>
					</CardBody>
				</Card>

				<Card className="border-0 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 shadow-lg">
					<CardBody className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
									{t('ACTIVE')}
								</p>
								<p className="text-3xl font-bold text-green-700 dark:text-green-300">
									{activeCollections}
								</p>
							</div>
							<div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
								<ListChecks className="w-6 h-6 text-white" />
							</div>
						</div>
					</CardBody>
				</Card>

				<Card className="border-0 bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 shadow-lg">
					<CardBody className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">
									{t('ITEMS_ASSIGNED')}
								</p>
								<p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
									{totalItemsInCollections}
								</p>
							</div>
							<div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
								<Link2 className="w-6 h-6 text-white" />
							</div>
						</div>
					</CardBody>
				</Card>
			</div>

			<Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-xs">
				<CardBody className="p-0">
					<div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('COLLECTION')}</h3>
						<span className="text-sm text-gray-600 dark:text-gray-400">
							{collections.length} {t('OF')} {total}
						</span>
					</div>

					<div className="divide-y divide-gray-100 dark:divide-gray-800">
						{collections.length === 0 ? (
							<div className="p-6 text-center text-gray-500">{t('NO_COLLECTIONS_YET')}</div>
						) : (
							collections.map((collection) => (
								<div
									key={collection.id}
									className="group px-6 py-4 hover:bg-linear-to-r hover:from-theme-primary/5 hover:to-theme-accent/5 dark:hover:from-theme-primary/10 dark:hover:to-theme-accent/10 transition-all"
								>
									<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
										<div className="flex items-start gap-4 flex-1 min-w-0">
											<div className="w-10 h-10 border rounded-lg flex items-center justify-center text-white font-semibold shadow-md">
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
							))
						)}
					</div>

					{totalPages > 1 && (
						<div className="p-4 border-t border-gray-100 dark:border-gray-800">
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
						className="absolute inset-0 bg-black/50 backdrop-blur-sm"
						onClick={!isSubmitting ? formDisclosure.onClose : undefined}
					/>
					<div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
						<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
								{formMode === 'create' ? t('CREATE_COLLECTION') : t('EDIT_COLLECTION')}
							</h2>
							{!isSubmitting && (
								<button
									onClick={formDisclosure.onClose}
									className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-sm transition-colors"
								>
									<svg
										className="w-5 h-5 text-gray-500 dark:text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
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
