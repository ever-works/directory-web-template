'use client';

import {
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useState,
	type ComponentType,
} from 'react';
import {
	Edit,
	FolderPlus,
	Layers,
	Link2,
	ListChecks,
	Loader2,
	Search,
	Trash2,
	X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
	Collection,
	CreateCollectionRequest,
	UpdateCollectionRequest,
} from '@/types/collection';
import { Container } from '@/components/ui/container';
import { useAdminCollections } from '@/hooks/use-admin-collections';
import { UniversalPagination } from '@/components/universal-pagination';
import { CollectionForm } from '@/components/admin/collections/collection-form';
import { AssignItemsModal } from '@/components/admin/collections/assign-items-modal';
import { CollectionsSkeleton } from '@/components/admin/collections/collections-skeleton';
import { useNavigation } from '@/components/providers';

// ─── Avatar helpers ───────────────────────────────────────────────────────────

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

const URL_PATTERN = /^(?:https?:\/\/|\/|data:image\/)/i;

function isLikelyUrl(value?: string): value is string {
	return !!value && URL_PATTERN.test(value.trim());
}

function isLikelyEmoji(value?: string): value is string {
	if (!value) return false;
	const trimmed = value.trim();
	// Single grapheme cluster (emoji glyphs ≤ ~4 code points), no whitespace,
	// and not a URL — good enough heuristic without `Intl.Segmenter`.
	return trimmed.length > 0 && trimmed.length <= 6 && !/\s/.test(trimmed) && !isLikelyUrl(trimmed);
}

function CollectionAvatar({ collection, gradient }: { collection: Collection; gradient: string }) {
	const [imgError, setImgError] = useState(false);
	// Reset error state if the URL changes between renders.
	useEffect(() => {
		setImgError(false);
	}, [collection.icon_url]);

	const baseClass = 'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden';

	if (isLikelyUrl(collection.icon_url) && !imgError) {
		return (
			<div className={cn(baseClass, 'border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5')}>
				<img
					src={collection.icon_url.trim()}
					alt=""
					className="w-full h-full object-cover"
					onError={() => setImgError(true)}
				/>
			</div>
		);
	}

	if (isLikelyEmoji(collection.icon_url)) {
		return (
			<div
				className={cn(
					baseClass,
					'text-xl leading-none bg-gray-50 dark:bg-white/6 border border-gray-100 dark:border-white/8'
				)}
				aria-hidden="true"
			>
				<span>{collection.icon_url!.trim()}</span>
			</div>
		);
	}

	return (
		<div className={cn(baseClass, gradient, 'text-white font-semibold text-sm shadow-sm')} aria-hidden="true">
			{collection.name.charAt(0).toUpperCase()}
		</div>
	);
}

// ─── Stat card (monochrome neutral) ───────────────────────────────────────────

interface StatCardProps {
	label: string;
	value: number | string;
	helper?: React.ReactNode;
	icon: ComponentType<{ className?: string }>;
	loading?: boolean;
}

function StatCard({ label, value, helper, icon: Icon, loading }: StatCardProps) {
	return (
		<div className="relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:border-gray-200 dark:hover:border-white/10 transition-colors duration-200">
			<div className="flex items-start justify-between mb-3 pt-0.5">
				<p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
					{label}
				</p>
				<div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/6 text-gray-500 dark:text-gray-400 ring-1 ring-gray-200 dark:ring-white/8">
					<Icon className="w-4 h-4" />
				</div>
			</div>
			<p className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight leading-none mb-2 tabular-nums">
				{loading ? <span className="inline-block w-10 h-6 rounded bg-gray-100 dark:bg-white/6 animate-pulse" /> : value}
			</p>
			{helper ? <div className="text-xs text-gray-500 dark:text-gray-400">{helper}</div> : null}
		</div>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'active';

export default function AdminCollectionsPage() {
	const t = useTranslations('common');
	const PageSize = 10;
	const [currentPage, setCurrentPage] = useState(1);
	const [searchInput, setSearchInput] = useState('');
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
	const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
	const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
	const [formIsOpen, setFormIsOpen] = useState(false);
	const [assignIsOpen, setAssignIsOpen] = useState(false);
	const [assignInitialIds, setAssignInitialIds] = useState<string[]>([]);

	// Deferred so the input stays responsive while the query fires.
	const deferredSearch = useDeferredValue(searchInput.trim());

	// Reset to page 1 whenever filters change so we don't request a page that
	// no longer exists for the new result set.
	useEffect(() => {
		setCurrentPage(1);
	}, [deferredSearch, statusFilter]);

	// Paginated, filtered list driving the table.
	const {
		collections,
		total,
		totalPages,
		isLoading,
		isFetching,
		isSubmitting,
		createCollection,
		updateCollection,
		deleteCollection,
		assignItems,
		fetchAssignedItems,
	} = useAdminCollections({
		page: currentPage,
		limit: PageSize,
		sortBy: 'name',
		search: deferredSearch || undefined,
		includeInactive: statusFilter === 'all',
	});

	// Dataset-wide stats — fetched once, cached by React Query so the list
	// pagination above doesn't refetch it. Limit 1000 is the API max and is
	// generous for typical deployments (<100 collections).
	const stats = useAdminCollections({
		page: 1,
		limit: 1000,
		sortBy: 'name',
		includeInactive: true,
	});

	const totalAll = stats.total;
	const activeAll = useMemo(
		() => stats.collections.filter((c) => c.isActive !== false).length,
		[stats.collections]
	);
	const totalItemsAll = useMemo(
		() => stats.collections.reduce((sum, c) => sum + (c.item_count || 0), 0),
		[stats.collections]
	);
	const activePercent = totalAll > 0 ? Math.round((activeAll / totalAll) * 100) : 0;

	const hasActiveFilters = deferredSearch.length > 0 || statusFilter !== 'all';

	const openCreateForm = useCallback(() => {
		setSelectedCollection(null);
		setFormMode('create');
		setFormIsOpen(true);
	}, []);

	const openEditForm = useCallback((collection: Collection) => {
		setSelectedCollection(collection);
		setFormMode('edit');
		setFormIsOpen(true);
	}, []);

	const closeForm = useCallback(() => {
		setFormIsOpen(false);
		setSelectedCollection(null);
	}, []);

	const handleFormSubmit = useCallback(
		async (data: CreateCollectionRequest | UpdateCollectionRequest) => {
			if (formMode === 'create') {
				const success = await createCollection(data as CreateCollectionRequest);
				if (success) closeForm();
			} else if (selectedCollection) {
				const success = await updateCollection(selectedCollection.id, data as UpdateCollectionRequest);
				if (success) closeForm();
			}
		},
		[closeForm, createCollection, formMode, selectedCollection, updateCollection]
	);

	const handleDelete = useCallback(
		async (collection: Collection) => {
			const confirmDelete = confirm(t('DELETE_COLLECTION_CONFIRM', { name: collection.name }));
			if (!confirmDelete) return;
			await deleteCollection(collection.id);
		},
		[deleteCollection, t]
	);

	const handleAssign = useCallback(
		async (collection: Collection) => {
			let assignedSlugs =
				Array.isArray(collection.items) && collection.items.length ? collection.items : [];
			if (assignedSlugs.length === 0) {
				const assigned = await fetchAssignedItems(collection.id);
				assignedSlugs = assigned.map((item) => item.slug);
			}
			setSelectedCollection(collection);
			setAssignInitialIds(assignedSlugs);
			setAssignIsOpen(true);
		},
		[fetchAssignedItems]
	);

	const handleAssignSave = useCallback(
		async (itemSlugs: string[]) => {
			if (!selectedCollection) return;
			await assignItems(selectedCollection.id, itemSlugs);
		},
		[assignItems, selectedCollection]
	);

	const { isInitialLoad } = useNavigation();
	if (isInitialLoad && isLoading) return <CollectionsSkeleton itemCount={PageSize} />;

	const showRefetchIndicator = isFetching && !isLoading;

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
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
								{t('MANAGE_COLLECTIONS_DESC')}
							</p>
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

			{/* Stats — monochrome KPIs, numbers across the full dataset */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<StatCard
					label={t('TOTAL')}
					value={totalAll}
					icon={Layers}
					loading={stats.isLoading}
					helper={<span>{t('COLLECTION')}</span>}
				/>
				<StatCard
					label={t('ACTIVE')}
					value={activeAll}
					icon={ListChecks}
					loading={stats.isLoading}
					helper={
						<div className="flex items-center gap-2">
							<div className="h-1.5 w-24 bg-gray-100 dark:bg-white/6 rounded-full overflow-hidden">
								<div
									className="h-full bg-gray-700 dark:bg-white/60 rounded-full transition-all duration-500"
									style={{ width: `${activePercent}%` }}
								/>
							</div>
							<span className="tabular-nums">{activePercent}%</span>
						</div>
					}
				/>
				<StatCard
					label={t('ITEMS_ASSIGNED')}
					value={totalItemsAll}
					icon={Link2}
					loading={stats.isLoading}
					helper={<span>{t('ITEMS_ASSIGNED')}</span>}
				/>
			</div>

			{/* Collections List */}
			<div className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl overflow-hidden">
				{/* Toolbar: search + status filter + count */}
				<div className="px-4 py-3 border-b border-gray-100 dark:border-white/6 bg-gray-50/60 dark:bg-white/1.5">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="relative flex-1 sm:max-w-sm">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
							<input
								type="text"
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								placeholder="Search collections…"
								className={cn(
									'w-full h-9 pl-9 pr-9 text-sm rounded-xl',
									'bg-white dark:bg-white/3 border border-gray-200 dark:border-white/8',
									'text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
									'focus:outline-none focus:ring-2 focus:ring-gray-900/15 dark:focus:ring-white/15 focus:border-gray-400 dark:focus:border-white/20',
									'transition-colors duration-150'
								)}
								aria-label="Search collections"
							/>
							{searchInput ? (
								<button
									type="button"
									onClick={() => setSearchInput('')}
									aria-label="Clear search"
									className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							) : null}
						</div>

						<div className="flex items-center gap-2 shrink-0">
							<div
								role="group"
								aria-label="Status filter"
								className="inline-flex items-center bg-gray-100 dark:bg-white/6 rounded-xl p-0.5"
							>
								<button
									type="button"
									onClick={() => setStatusFilter('all')}
									aria-pressed={statusFilter === 'all'}
									className={cn(
										'px-3 h-8 text-xs font-medium rounded-lg transition-colors',
										statusFilter === 'all'
											? 'bg-white dark:bg-white/12 text-gray-900 dark:text-white shadow-sm'
											: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
									)}
								>
									All
								</button>
								<button
									type="button"
									onClick={() => setStatusFilter('active')}
									aria-pressed={statusFilter === 'active'}
									className={cn(
										'px-3 h-8 text-xs font-medium rounded-lg transition-colors',
										statusFilter === 'active'
											? 'bg-white dark:bg-white/12 text-gray-900 dark:text-white shadow-sm'
											: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
									)}
								>
									{t('ACTIVE')}
								</button>
							</div>

							<span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap inline-flex items-center gap-1.5">
								{showRefetchIndicator ? (
									<Loader2 className="w-3 h-3 animate-spin text-gray-400" aria-hidden="true" />
								) : null}
								<span>
									{collections.length} <span className="text-gray-400 dark:text-gray-500">/</span> {total}
								</span>
							</span>
						</div>
					</div>
				</div>

				<div className="divide-y divide-gray-50 dark:divide-white/4">
					{collections.length === 0 ? (
						<EmptyState hasFilters={hasActiveFilters} onCreate={openCreateForm} onClearFilters={() => {
							setSearchInput('');
							setStatusFilter('all');
						}} />
					) : (
						collections.map((collection, index) => (
							<CollectionRow
								key={collection.id}
								collection={collection}
								gradient={ICON_GRADIENTS[index % ICON_GRADIENTS.length]}
								isSubmitting={isSubmitting}
								onAssign={handleAssign}
								onEdit={openEditForm}
								onDelete={handleDelete}
							/>
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

// ─── Row + empty state ────────────────────────────────────────────────────────

interface CollectionRowProps {
	collection: Collection;
	gradient: string;
	isSubmitting: boolean;
	onAssign: (collection: Collection) => void;
	onEdit: (collection: Collection) => void;
	onDelete: (collection: Collection) => void;
}

function CollectionRow({ collection, gradient, isSubmitting, onAssign, onEdit, onDelete }: CollectionRowProps) {
	const t = useTranslations('common');
	const isActive = collection.isActive !== false;

	return (
		<div className="group flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-5 py-4 hover:bg-gray-50/80 dark:hover:bg-white/2.5 transition-colors duration-150">
			{/* Info */}
			<div className="flex items-start gap-4 flex-1 min-w-0">
				<CollectionAvatar collection={collection} gradient={gradient} />
				<div className="flex-1 min-w-0 space-y-1">
					<div className="flex items-center gap-2 flex-wrap">
						<h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
							{collection.name}
						</h4>
						<span
							className={cn(
								'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset',
								isActive
									? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20'
									: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-400 dark:ring-white/8'
							)}
						>
							<span className="w-1 h-1 rounded-full bg-current opacity-75 shrink-0" />
							{isActive ? t('ACTIVE') : t('INACTIVE')}
						</span>
						<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ring-1 ring-inset bg-gray-50 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-300 dark:ring-white/8 tabular-nums">
							{t('COLLECTION_ITEMS', { count: collection.item_count || 0 })}
						</span>
					</div>
					<p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate">/{collection.slug}</p>
					{collection.description && (
						<p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
							{collection.description}
						</p>
					)}
				</div>
			</div>

			{/* Actions — always visible so they're discoverable without hovering */}
			<div className="flex items-center gap-1.5 ml-14 md:ml-0 shrink-0">
				<button
					type="button"
					onClick={() => onAssign(collection)}
					className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 hover:text-gray-900 dark:hover:text-white transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
				>
					<Link2 className="w-3.5 h-3.5" />
					<span className="hidden sm:inline">{t('ASSIGN_ITEMS')}</span>
				</button>
				<button
					type="button"
					onClick={() => onEdit(collection)}
					className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 hover:text-gray-900 dark:hover:text-white transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
				>
					<Edit className="w-3.5 h-3.5" />
					<span className="hidden sm:inline">{t('EDIT')}</span>
				</button>
				<button
					type="button"
					disabled={isSubmitting}
					onClick={() => onDelete(collection)}
					aria-label={`Delete ${collection.name}`}
					className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-transparent text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200 dark:hover:border-red-500/20 transition-colors duration-150 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
				>
					<Trash2 className="w-3.5 h-3.5" />
				</button>
			</div>
		</div>
	);
}

interface EmptyStateProps {
	hasFilters: boolean;
	onCreate: () => void;
	onClearFilters: () => void;
}

function EmptyState({ hasFilters, onCreate, onClearFilters }: EmptyStateProps) {
	const t = useTranslations('common');

	if (hasFilters) {
		return (
			<div className="flex flex-col items-center justify-center px-6 py-16 text-center">
				<div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/6 flex items-center justify-center mb-4 ring-1 ring-gray-200 dark:ring-white/8">
					<Search className="w-6 h-6 text-gray-400 dark:text-gray-500" />
				</div>
				<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">No matches</h3>
				<p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed mb-6">
					Try a different search or clear the filters to see all collections.
				</p>
				<button
					type="button"
					onClick={onClearFilters}
					className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
				>
					<X className="w-4 h-4" />
					Clear filters
				</button>
			</div>
		);
	}

	return (
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
				onClick={onCreate}
				className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-950"
			>
				<FolderPlus className="w-4 h-4" />
				{t('ADD_COLLECTION')}
			</button>
		</div>
	);
}
