"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Spinner, Checkbox } from "@heroui/react";
import { MultiStepItemForm } from "@/components/admin/items/multi-step-item-form";
import { ItemRejectModal } from "@/components/admin/items/item-reject-modal";
import { ItemHistoryModal } from "@/components/admin/items/item-history-modal";
import { BulkActionBar } from "@/components/admin/items/bulk-action-bar";
import { BulkConfirmDialog } from "@/components/admin/items/bulk-confirm-dialog";
import { ItemListSorting, SortField, SortOrder } from "@/components/admin/items/item-list-sorting";
import { ItemActionsMenu } from "@/components/admin/items/item-actions-menu";
import { ItemData, CreateItemRequest, UpdateItemRequest, ITEM_STATUS_COLORS } from "@/lib/types/item";
import { UniversalPagination } from "@/components/universal-pagination";
import { Plus, Package, Clock, CheckCircle, XCircle, Star, Loader2, Folder, Tag as TagIcon, Hash, Link2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { slugify } from "@/lib/utils/slug";
import { useAdminItems } from "@/hooks/use-admin-items";
import { useAllCategories } from "@/hooks/use-admin-categories";
import { useAllTags } from "@/hooks/use-admin-tags";
import { useTranslations } from 'next-intl';
import { AdminSurveyCreationButton } from "@/components/surveys/admin-survey-creation-button";
import { ItemImportExport } from "@/components/admin/items/item-import-export";
import { useDebounceSearch } from "@/hooks/use-debounced-search";
import { Container } from "@/components/ui/container";
import {
  AdminSearchBar,
  AdminStatusTabs,
  AdminFilterPopover,
  AdminActiveFilters,
  type StatusTabOption,
  type FilterSection,
  type ActiveFilter,
} from "@/components/admin/shared";

export default function AdminItemsPage() {
  const t = useTranslations('admin.ADMIN_ITEMS_PAGE');
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const PageSize = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>("updated_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const hasLoadedOnce = useRef(false);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoriesFilter, setCategoriesFilter] = useState<string[]>([]);
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);

  const { debouncedValue: debouncedSearchTerm, isSearching } = useDebounceSearch({
    searchValue: searchTerm.trim().length >= 2 ? searchTerm.trim() : "",
    delay: 300,
    onSearch: () => {
      if (currentPage !== 1) setCurrentPage(1);
    },
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, categoriesFilter, tagsFilter, sortBy, sortOrder]);

  const { data: allCategories = [] } = useAllCategories();
  const { data: allTags = [] } = useAllTags();

  const {
    items,
    total: totalItems,
    totalPages,
    stats,
    isLoading,
    isFetching,
    isSubmitting,
    isApproving,
    isRejecting,
    isDeleting,
    pendingItemId,
    isBulkProcessing,
    bulkActionType,
    createItem,
    updateItem,
    deleteItem,
    reviewItem,
    bulkApprove,
    bulkReject,
    bulkDelete,
  } = useAdminItems({
    page: currentPage,
    limit: PageSize,
    search: debouncedSearchTerm || undefined,
    status: statusFilter || undefined,
    categories: categoriesFilter.length > 0 ? categoriesFilter : undefined,
    tags: tagsFilter.length > 0 ? tagsFilter : undefined,
    sortBy,
    sortOrder,
  });

  const hasActiveSearch = searchTerm.trim().length >= 2;
  const activeFilterCount = (hasActiveSearch ? 1 : 0) + (statusFilter ? 1 : 0) + categoriesFilter.length + tagsFilter.length;
  const hasActiveFilters = activeFilterCount > 0;
  const advancedFilterCount = categoriesFilter.length + tagsFilter.length;
  const hasNonStatusFilters = advancedFilterCount > 0 || hasActiveSearch;

  type ItemStatus = 'draft' | 'pending' | 'approved' | 'rejected';
  const statusOptions = useMemo<StatusTabOption<ItemStatus>[]>(() => {
    const totalCount = stats.draft + stats.pending + stats.approved + stats.rejected;
    return [
      { value: '', label: t('STATUS_ALL'), count: hasNonStatusFilters ? totalItems : totalCount },
      { value: 'approved', label: t('STATUS_APPROVED'), count: hasNonStatusFilters ? undefined : stats.approved },
      { value: 'pending', label: t('STATUS_PENDING'), count: hasNonStatusFilters ? undefined : stats.pending },
      { value: 'draft', label: t('STATUS_DRAFT'), count: hasNonStatusFilters ? undefined : stats.draft },
      { value: 'rejected', label: t('STATUS_REJECTED'), count: hasNonStatusFilters ? undefined : stats.rejected },
    ];
  }, [t, stats, totalItems, hasNonStatusFilters]);

  const filterSections = useMemo<FilterSection<string>[]>(() => [
    {
      id: 'categories',
      label: t('CATEGORY_LABEL'),
      type: 'checkbox',
      options: allCategories.map(cat => ({ id: cat.id, label: cat.name })),
      selectedValues: categoriesFilter,
      onChange: setCategoriesFilter,
      searchable: true,
      searchPlaceholder: t('FILTER_SEARCH_PLACEHOLDER'),
      emptyMessage: t('NO_CATEGORIES_AVAILABLE'),
      noResultsMessage: t('NO_RESULTS'),
    },
    {
      id: 'tags',
      label: t('TAGS_LABEL'),
      type: 'checkbox',
      options: allTags.map(tag => ({ id: tag.id, label: tag.name })),
      selectedValues: tagsFilter,
      onChange: setTagsFilter,
      searchable: true,
      searchPlaceholder: t('FILTER_SEARCH_PLACEHOLDER'),
      emptyMessage: t('NO_TAGS_AVAILABLE'),
      noResultsMessage: t('NO_RESULTS'),
    },
  ], [t, allCategories, allTags, categoriesFilter, tagsFilter]);

  const activeFiltersDisplay = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
    categoriesFilter.forEach(catId => {
      const category = allCategories.find(c => c.id === catId);
      filters.push({
        id: `category:${catId}`,
        type: 'category',
        label: t('CATEGORY_LABEL'),
        value: category?.name || catId,
        icon: <Folder className="w-3 h-3" />,
      });
    });
    tagsFilter.forEach(tagId => {
      const tag = allTags.find(t => t.id === tagId);
      filters.push({
        id: `tag:${tagId}`,
        type: 'tag',
        label: t('TAGS_LABEL'),
        value: tag?.name || tagId,
        icon: <TagIcon className="w-3 h-3" />,
      });
    });
    return filters;
  }, [categoriesFilter, tagsFilter, allCategories, allTags, t]);

  const handleRemoveFilter = useCallback((filter: ActiveFilter) => {
    if (filter.type === 'category') {
      const catId = filter.id.replace('category:', '');
      setCategoriesFilter(prev => prev.filter(c => c !== catId));
    } else if (filter.type === 'tag') {
      const tagId = filter.id.replace('tag:', '');
      setTagsFilter(prev => prev.filter(t => t !== tagId));
    }
  }, []);

  const handleClearAdvancedFilters = useCallback(() => {
    setCategoriesFilter([]);
    setTagsFilter([]);
  }, []);

  const handleClearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setCategoriesFilter([]);
    setTagsFilter([]);
    setCurrentPage(1);
  };

  const handleSortByChange = (newSortBy: SortField) => setSortBy(newSortBy);
  const handleSortOrderChange = (newSortOrder: SortOrder) => setSortOrder(newSortOrder);

  useEffect(() => {
    if (!isLoading) hasLoadedOnce.current = true;
  }, [isLoading]);

  const showSkeleton = isLoading && !hasLoadedOnce.current;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<ItemData | undefined>();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedItemForReject, setSelectedItemForReject] = useState<ItemData | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [duplicatingItemId, setDuplicatingItemId] = useState<string | null>(null);
  const isDuplicating = duplicatingItemId !== null;
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<ItemData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | 'delete' | null>(null);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === items.length ? new Set() : new Set(items.map((item) => item.id))
    );
  }, [items]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < items.length;
  const pendingSelectedCount = items.filter(
    (item) => selectedIds.has(item.id) && item.status === 'pending'
  ).length;

  const handleBulkApprove = useCallback(async () => {
    const result = await bulkApprove(Array.from(selectedIds));
    if (result) { clearSelection(); setBulkAction(null); }
  }, [selectedIds, bulkApprove, clearSelection]);

  const handleBulkReject = useCallback(async (reason: string) => {
    const result = await bulkReject(Array.from(selectedIds), reason);
    if (result) { clearSelection(); setBulkAction(null); }
  }, [selectedIds, bulkReject, clearSelection]);

  const handleBulkDelete = useCallback(async () => {
    const result = await bulkDelete(Array.from(selectedIds));
    if (result) { clearSelection(); setBulkAction(null); }
  }, [selectedIds, bulkDelete, clearSelection]);

  const handleCreateItem = async (data: CreateItemRequest) => {
    const success = await createItem(data);
    if (success) setIsModalOpen(false);
  };

  const handleUpdateItem = async (data: UpdateItemRequest) => {
    if (!selectedItem) return;
    const success = await updateItem(selectedItem.id, data);
    if (success) setIsModalOpen(false);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (isDeleting && pendingItemId === itemId) return;
    if (!confirm(t('CONFIRM_DELETE_ITEM'))) return;
    await deleteItem(itemId);
  };

  const handleApproveItem = async (itemId: string) => {
    if (isApproving && pendingItemId === itemId) return;
    await reviewItem(itemId, 'approved');
  };

  const openRejectModal = (item: ItemData) => {
    setSelectedItemForReject(item);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const closeRejectModal = () => {
    setRejectModalOpen(false);
    setSelectedItemForReject(null);
    setRejectionReason('');
  };

  const openHistoryModal = (item: ItemData) => {
    setSelectedItemForHistory(item);
    setHistoryModalOpen(true);
  };

  const closeHistoryModal = () => {
    setHistoryModalOpen(false);
    setSelectedItemForHistory(null);
  };

  const handleRejectConfirm = async () => {
    if (isRejecting || !selectedItemForReject || rejectionReason.length < 10) return;
    const success = await reviewItem(selectedItemForReject.id, 'rejected', rejectionReason);
    if (success) closeRejectModal();
  };

  const openCreateModal = () => {
    setFormMode('create');
    setSelectedItem(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (item: ItemData) => {
    setFormMode('edit');
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleDuplicateItem = async (item: ItemData) => {
    if (isDuplicating) return;
    setDuplicatingItemId(item.id);
    try {
      const duplicatedName = `${item.name} (Copy)`;
      const newId = crypto.randomUUID();
      const uniqueSlug = `${slugify(duplicatedName)}-${newId.slice(-8)}`;
      await createItem({
        id: newId,
        name: duplicatedName,
        slug: uniqueSlug,
        description: item.description,
        source_url: item.source_url,
        icon_url: item.icon_url,
        category: item.category,
        tags: item.tags,
        status: 'draft',
        featured: false,
      });
    } finally {
      setDuplicatingItemId(null);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(undefined);
  };

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  const formatDate = (dateValue: string | null | undefined): string => {
    if (!dateValue) return "—";
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "—";
      return date.toLocaleDateString();
    } catch {
      return "—";
    }
  };

  const handleOpenExternal = (rawUrl?: string) => {
    if (!rawUrl) return;
    try {
      const url = new URL(rawUrl);
      window.open(url.toString(), "_blank", "noopener,noreferrer");
    } catch {
      // Invalid URL — silently ignore
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormSubmit = (data: CreateItemRequest | UpdateItemRequest) => {
    if (formMode === 'create') handleCreateItem(data as CreateItemRequest);
    else handleUpdateItem(data as UpdateItemRequest);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return t('STATUS_DRAFT');
      case 'pending': return t('STATUS_PENDING');
      case 'approved': return t('STATUS_APPROVED');
      case 'rejected': return t('STATUS_REJECTED');
      default: return status;
    }
  };

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-400';
      case 'pending': return 'bg-yellow-400';
      case 'approved': return 'bg-green-400';
      case 'rejected': return 'bg-red-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    const color = ITEM_STATUS_COLORS[status as keyof typeof ITEM_STATUS_COLORS] || 'gray';
    const statusClasses = {
      gray: { bg: 'bg-gray-100 dark:bg-white/[0.02]', text: 'text-gray-800 dark:text-gray-400', border: 'border-gray-200 dark:border-white/6' },
      yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-700' },
      green: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-400', border: 'border-green-200 dark:border-green-700' },
      red: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-400', border: 'border-red-200 dark:border-red-700' },
    };
    return statusClasses[color as keyof typeof statusClasses] || statusClasses.gray;
  };

  if (showSkeleton) {
    return (
      <Container useGlobalWidth>
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-white/8 animate-pulse shrink-0" />
              <div>
                <div className="h-5 w-36 bg-gray-200 dark:bg-white/8 rounded-lg animate-pulse mb-2" />
                <div className="h-3.5 w-52 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-9 w-28 bg-gray-200 dark:bg-white/8 rounded-xl animate-pulse" />
              <div className="h-9 w-28 bg-gray-200 dark:bg-white/8 rounded-xl animate-pulse" />
            </div>
          </div>
          <div className="mt-5 h-px bg-gray-200 dark:bg-white/8 animate-pulse" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="h-3 w-20 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
                <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-white/8 animate-pulse" />
              </div>
              <div className="h-7 w-16 bg-gray-200 dark:bg-white/8 rounded animate-pulse mb-3" />
              <div className="h-3 w-24 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Search skeleton */}
        <div className="h-11 w-full rounded-xl bg-gray-200 dark:bg-white/8 animate-pulse mb-6" />

        {/* Table skeleton */}
        <div className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/6 bg-gray-50/60 dark:bg-white/1.5">
            <div className="h-4 w-24 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
          </div>
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 dark:border-white/6 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2.5">
                    <div className="h-5 w-48 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
                    <div className="h-3.5 w-80 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
                    <div className="flex gap-2">
                      <div className="h-5 w-20 rounded-md bg-gray-200 dark:bg-white/8 animate-pulse" />
                      <div className="h-5 w-16 rounded-md bg-gray-200 dark:bg-white/8 animate-pulse" />
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-white/8 animate-pulse ml-4" />
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
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gray-900 dark:bg-gray-800 flex items-center justify-center shrink-0 shadow-sm">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
                {t('TITLE')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('SUBTITLE')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <ItemImportExport />
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-950"
            >
              <Plus className="w-4 h-4" />
              {t('ADD_ITEM')}
            </button>
            <AdminSurveyCreationButton showLabel variant="default" size="default" />
          </div>
        </div>
        <div className="mt-5 h-px bg-linear-to-r from-gray-200 via-gray-100 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: t('TOTAL_ITEMS_STAT'), value: stats.total, icon: <Package className="w-4 h-4" />, iconClass: 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400', sub: t('TOTAL_ITEMS_STAT') },
          { label: t('PENDING_REVIEW'), value: stats.pending, icon: <Clock className="w-4 h-4" />, iconClass: 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400', sub: t('PENDING_REVIEW') },
          { label: t('APPROVED'), value: stats.approved, icon: <CheckCircle className="w-4 h-4" />, iconClass: 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400', sub: t('APPROVED') },
          { label: t('REJECTED'), value: stats.rejected, icon: <XCircle className="w-4 h-4" />, iconClass: 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400', sub: t('REJECTED') },
        ].map(({ label, value, icon, iconClass }) => (
          <div key={label} className="relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200">
            <div className="flex items-start justify-between mb-4 pt-0.5">
              <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
                {label}
              </p>
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm', iconClass)}>
                {icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-3">{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <AdminSearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          isSearching={isSearching}
          placeholder={t('SEARCH_PLACEHOLDER')}
        />
      </div>

      {/* Items Table */}
      <div className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl overflow-hidden">
        {/* Table Header with Filters and Sorting */}
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/6 bg-gray-50/60 dark:bg-white/1.5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {items.length > 0 && (
                <Checkbox
                  isSelected={isAllSelected}
                  isIndeterminate={isPartiallySelected}
                  onValueChange={toggleSelectAll}
                  aria-label={t('SELECT_ALL')}
                  color="primary"
                />
              )}
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('ITEMS_TABLE_TITLE')}
              </h3>
            </div>
            <div className="flex items-center gap-2.5">
              <AdminStatusTabs
                options={statusOptions}
                value={statusFilter as ItemStatus | ''}
                onChange={(status) => setStatusFilter(status)}
                showCounts={true}
              />
              <AdminFilterPopover
                sections={filterSections}
                activeCount={advancedFilterCount}
                onClearAll={handleClearAdvancedFilters}
                triggerLabel={t('FILTERS')}
              />
              <ItemListSorting
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortByChange={handleSortByChange}
                onSortOrderChange={handleSortOrderChange}
                isLoading={isFetching}
              />
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {activeFiltersDisplay.length > 0 && (
          <div className="px-5 py-3 border-b border-gray-100 dark:border-white/6 bg-gray-25 dark:bg-white/4">
            <AdminActiveFilters
              filters={activeFiltersDisplay}
              onRemove={handleRemoveFilter}
              onClearAll={handleClearAdvancedFilters}
            />
          </div>
        )}

        {/* Items List */}
        <div className={cn(
          "p-5 space-y-3 relative transition-opacity duration-200",
          isFetching && !isLoading && "opacity-60"
        )}>
          {isFetching && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="bg-white/90 dark:bg-[#0a0a0a]/90 rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('LOADING')}</span>
              </div>
            </div>
          )}

          {items.map((item) => {
            const statusColors = getStatusColor(item.status);
            const categories = Array.isArray(item.category) ? item.category : [item.category];
            const isDuplicatingThisItem = isDuplicating && duplicatingItemId === item.id;
            const isProcessingThisItem = (pendingItemId === item.id && (isApproving || isRejecting || isDeleting)) || isDuplicatingThisItem;
            const isSelected = selectedIds.has(item.id);

            return (
              <div
                key={item.id}
                className={cn(
                  "group relative rounded-xl border transition-all duration-200 overflow-hidden",
                  isSelected
                    ? "bg-blue-50/50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30"
                    : "bg-white dark:bg-white/[0.02] border-gray-200 dark:border-white/6 hover:border-gray-300 dark:hover:border-white/10 hover:shadow-sm"
                )}
              >
                {isProcessingThisItem && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-20 transition-opacity duration-300">
                    <div className="flex flex-col items-center gap-2">
                      <Spinner size="lg" color="primary" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {isApproving ? t('APPROVING') : isRejecting ? t('REJECTING') : isDuplicatingThisItem ? t('DUPLICATING') : t('DELETING')}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="shrink-0 mr-3 pt-0.5">
                      <Checkbox
                        isSelected={isSelected}
                        onValueChange={() => toggleSelection(item.id)}
                        aria-label={t('SELECT_ITEM', { name: item.name })}
                        color="primary"
                      />
                    </div>

                    <div className="flex-1 space-y-2.5">
                      <div className="flex items-start space-x-2.5">
                        {item.featured && (
                          <div className="shrink-0 mt-0.5">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {item.name || t('UNTITLED')}
                            </h4>
                            <span className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset shrink-0',
                              statusColors.bg, statusColors.text
                            )}>
                              <span className={cn('w-1 h-1 rounded-full shrink-0', getStatusDotColor(item.status))} />
                              {getStatusLabel(item.status)}
                            </span>
                          </div>

                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2.5 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>

                          <div className="flex flex-wrap gap-1.5 mb-2.5">
                            {categories.map((cat, index) => (
                              <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 ring-1 ring-inset ring-blue-100 dark:ring-blue-500/20">
                                <Folder className="w-2.5 h-2.5" />
                                {cat}
                              </span>
                            ))}
                            {item.tags.slice(0, 3).map((tag, index) => (
                              <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-700 dark:bg-white/6 dark:text-gray-300 ring-1 ring-inset ring-gray-200 dark:ring-white/8">
                                <TagIcon className="w-2.5 h-2.5" />
                                {tag}
                              </span>
                            ))}
                            {item.tags.length > 3 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-700 dark:bg-white/6 dark:text-gray-300 ring-1 ring-inset ring-gray-200 dark:ring-white/8">
                                <TagIcon className="w-2.5 h-2.5" />
                                {t('MORE_TAGS', { count: item.tags.length - 3 })}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400 dark:text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              {item.id}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Link2 className="w-3 h-3" />
                              {item.slug}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(item.updated_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center ml-3 shrink-0">
                      <ItemActionsMenu
                        item={item}
                        onViewSource={() => handleOpenExternal(item.source_url)}
                        onEdit={() => openEditModal(item)}
                        onDuplicate={() => handleDuplicateItem(item)}
                        onViewHistory={() => openHistoryModal(item)}
                        onCreateSurvey={() => router.push(`/${params.locale}/admin/surveys/create?itemId=${encodeURIComponent(item.id)}`)}
                        onApprove={() => handleApproveItem(item.id)}
                        onReject={() => openRejectModal(item)}
                        onDelete={() => handleDeleteItem(item.id)}
                        isProcessing={isProcessingThisItem}
                        isApproving={isApproving && pendingItemId === item.id}
                        isRejecting={isRejecting && pendingItemId === item.id}
                        isDeleting={isDeleting && pendingItemId === item.id}
                        isDuplicating={isDuplicatingThisItem}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/6 flex items-center justify-center mb-4 ring-1 ring-gray-200 dark:ring-white/8">
              <Package className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
              {hasActiveFilters ? t('NO_FILTER_RESULTS') : t('NO_ITEMS_FOUND')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed mb-6">
              {hasActiveSearch
                ? t('NO_ITEMS_FOUND_SEARCH_DESC', { term: searchTerm })
                : hasActiveFilters
                  ? t('NO_FILTER_RESULTS_DESCRIPTION')
                  : t('NO_ITEMS_DESCRIPTION')}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200"
              >
                {t('CLEAR_ALL')}
              </button>
            ) : (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                {t('CREATE_ITEM')}
              </button>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-white/6">
            <UniversalPagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Item Form Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="item-form-modal-title"
          tabIndex={-1}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto focus:outline-none scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full -mr-2 [&::-webkit-scrollbar]:w-1"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="max-w-4xl w-full bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/8 rounded-2xl shadow-2xl shadow-black/30"
              onClick={(e) => e.stopPropagation()}
            >
              <MultiStepItemForm
                item={selectedItem}
                mode={formMode}
                onSubmit={handleFormSubmit}
                onCancel={closeModal}
                isLoading={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      <ItemRejectModal
        isOpen={rejectModalOpen}
        item={selectedItemForReject}
        rejectionReason={rejectionReason}
        isSubmitting={isRejecting}
        onReasonChange={setRejectionReason}
        onConfirm={handleRejectConfirm}
        onClose={closeRejectModal}
      />

      {selectedItemForHistory && (
        <ItemHistoryModal
          isOpen={historyModalOpen}
          itemId={selectedItemForHistory.id}
          itemName={selectedItemForHistory.name}
          onClose={closeHistoryModal}
        />
      )}

      <BulkActionBar
        selectedIds={selectedIds}
        items={items}
        onApprove={() => setBulkAction('approve')}
        onReject={() => setBulkAction('reject')}
        onDelete={() => setBulkAction('delete')}
        onClear={clearSelection}
        isProcessing={isBulkProcessing}
        processingAction={bulkActionType}
      />

      <BulkConfirmDialog
        isOpen={bulkAction !== null}
        action={bulkAction}
        selectedCount={selectedIds.size}
        pendingCount={pendingSelectedCount}
        isProcessing={isBulkProcessing}
        onConfirm={(reason) => {
          if (bulkAction === 'approve') handleBulkApprove();
          else if (bulkAction === 'reject' && reason) handleBulkReject(reason);
          else if (bulkAction === 'delete') handleBulkDelete();
        }}
        onClose={() => setBulkAction(null)}
      />
    </Container>
  );
}
