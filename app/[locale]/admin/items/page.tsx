"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useDebounceSearch } from "@/hooks/use-debounced-search";
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

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoriesFilter, setCategoriesFilter] = useState<string[]>([]);
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);

  // Debounced search (min 2 trimmed characters to trigger, 300ms delay)
  const { debouncedValue: debouncedSearchTerm, isSearching } = useDebounceSearch({
    searchValue: searchTerm.trim().length >= 2 ? searchTerm.trim() : "",
    delay: 300,
    onSearch: () => {
      // Reset to page 1 on new search
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    },
  });

  // Reset page when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, categoriesFilter, tagsFilter, sortBy, sortOrder]);

  // Fetch categories and tags for filter dropdowns
  const { data: allCategories = [] } = useAllCategories();
  const { data: allTags = [] } = useAllTags();

  // Use custom hook with filter and sort params
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

// Check if search is active (>= 2 chars after trimming, matching query behavior)
  const hasActiveSearch = searchTerm.trim().length >= 2;
  // Calculate active filter count (only count search when >= 2 chars, matching query behavior)
  const activeFilterCount = (hasActiveSearch ? 1 : 0) + (statusFilter ? 1 : 0) + categoriesFilter.length + tagsFilter.length;
  const hasActiveFilters = activeFilterCount > 0;
  // Count for advanced filters only (categories + tags)
  const advancedFilterCount = categoriesFilter.length + tagsFilter.length;
  // Check if non-status filters are active (categories, tags, or search)
  const hasNonStatusFilters = advancedFilterCount > 0 || hasActiveSearch;

  // Status tab options for AdminStatusTabs (no icons to prevent 2-line wrapping)
  // When category/tag/search filters are active, use totalItems for "All" and hide individual counts
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

  // Filter sections for AdminFilterPopover (categories and tags)
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

  // Build active filters for chip display
  const activeFiltersDisplay = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];

    // Add category chips
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

    // Add tag chips
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

  // Handle removing individual filters from chips
  const handleRemoveFilter = useCallback((filter: ActiveFilter) => {
    if (filter.type === 'category') {
      const catId = filter.id.replace('category:', '');
      setCategoriesFilter(prev => prev.filter(c => c !== catId));
    } else if (filter.type === 'tag') {
      const tagId = filter.id.replace('tag:', '');
      setTagsFilter(prev => prev.filter(t => t !== tagId));
    }
  }, []);

  // Clear advanced filters only (categories + tags)
  const handleClearAdvancedFilters = useCallback(() => {
    setCategoriesFilter([]);
    setTagsFilter([]);
  }, []);

  // Clear all filters (including search)
  const handleClearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setCategoriesFilter([]);
    setTagsFilter([]);
    setCurrentPage(1);
  };

  // Sort handlers
  const handleSortByChange = (newSortBy: SortField) => {
    setSortBy(newSortBy);
  };

  const handleSortOrderChange = (newSortOrder: SortOrder) => {
    setSortOrder(newSortOrder);
  };

  // Track if we've loaded data at least once
  useEffect(() => {
    if (!isLoading) {
      hasLoadedOnce.current = true;
    }
  }, [isLoading]);

  // Only show skeleton on initial load, not on sort/page changes
  const showSkeleton = isLoading && !hasLoadedOnce.current;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<ItemData | undefined>();

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedItemForReject, setSelectedItemForReject] = useState<ItemData | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Duplicate state - derive isDuplicating from duplicatingItemId to prevent race conditions
  const [duplicatingItemId, setDuplicatingItemId] = useState<string | null>(null);
  const isDuplicating = duplicatingItemId !== null;

  // History modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<ItemData | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | 'delete' | null>(null);

  // Clear selection when page changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage]);

  // Selection handlers
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === items.length) {
        return new Set();
      }
      return new Set(items.map((item) => item.id));
    });
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Calculate selection states for "Select All" checkbox
  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < items.length;
  const pendingSelectedCount = items.filter(
    (item) => selectedIds.has(item.id) && item.status === 'pending'
  ).length;

  // Bulk action handlers
  const handleBulkApprove = useCallback(async () => {
    const ids = Array.from(selectedIds);
    const result = await bulkApprove(ids);
    if (result) {
      clearSelection();
      setBulkAction(null);
    }
  }, [selectedIds, bulkApprove, clearSelection]);

  const handleBulkReject = useCallback(async (reason: string) => {
    const ids = Array.from(selectedIds);
    const result = await bulkReject(ids, reason);
    if (result) {
      clearSelection();
      setBulkAction(null);
    }
  }, [selectedIds, bulkReject, clearSelection]);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    const result = await bulkDelete(ids);
    if (result) {
      clearSelection();
      setBulkAction(null);
    }
  }, [selectedIds, bulkDelete, clearSelection]);

  const handleCreateItem = async (data: CreateItemRequest) => {
    const success = await createItem(data);
    if (success) {
      setIsModalOpen(false);
    }
  };

  const handleUpdateItem = async (data: UpdateItemRequest) => {
    if (!selectedItem) return;

    const success = await updateItem(selectedItem.id, data);
    if (success) {
      setIsModalOpen(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    // Prevent multiple clicks while deleting
    if (isDeleting && pendingItemId === itemId) return;

    if (!confirm(t('CONFIRM_DELETE_ITEM'))) {
      return;
    }

    await deleteItem(itemId);
  };

  const handleApproveItem = async (itemId: string) => {
    // Prevent multiple clicks while approving
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
    // Prevent multiple clicks while rejecting
    if (isRejecting) return;
    if (!selectedItemForReject || rejectionReason.length < 10) return;

    const success = await reviewItem(selectedItemForReject.id, 'rejected', rejectionReason);
    if (success) {
      closeRejectModal();
    }
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
    // Block all duplications while one is in progress to prevent race conditions
    if (isDuplicating) return;

    setDuplicatingItemId(item.id);

    try {
      const duplicatedName = `${item.name} (Copy)`;
      const newId = crypto.randomUUID();
      // Use last 8 chars of UUID to ensure slug uniqueness across multiple duplications
      const uniqueSlug = `${slugify(duplicatedName)}-${newId.slice(-8)}`;

      const duplicateData: CreateItemRequest = {
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
      };

      await createItem(duplicateData);
    } finally {
      setDuplicatingItemId(null);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(undefined);
  };

  // Modal accessibility: Escape key handler and focus management (Feedback 4)
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    // Add escape key listener
    document.addEventListener("keydown", handleKeyDown);

    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  // Format date with fallback for missing/invalid values (Feedback 2)
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

  // Secure external link handler
  const handleOpenExternal = (rawUrl?: string) => {
    if (!rawUrl) return;
    try {
      const url = new URL(rawUrl);
      window.open(url.toString(), "_blank", "noopener,noreferrer");
    } catch {
      // Invalid URL, silently ignore
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormSubmit = (data: CreateItemRequest | UpdateItemRequest) => {
    if (formMode === 'create') {
      handleCreateItem(data as CreateItemRequest);
    } else {
      handleUpdateItem(data as UpdateItemRequest);
    }
  };

  // Compact status labels for cleaner UI
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return t('STATUS_DRAFT');
      case 'pending':
        return t('STATUS_PENDING');
      case 'approved':
        return t('STATUS_APPROVED');
      case 'rejected':
        return t('STATUS_REJECTED');
      default:
        return status;
    }
  };

  // Status dot color classes
  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-400';
      case 'pending':
        return 'bg-yellow-400';
      case 'approved':
        return 'bg-green-400';
      case 'rejected':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    const color = ITEM_STATUS_COLORS[status as keyof typeof ITEM_STATUS_COLORS] || 'gray';
    
    const statusClasses = {
      gray: {
        bg: 'bg-gray-100 dark:bg-gray-900/20',
        text: 'text-gray-800 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-700',
      },
      yellow: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/20',
        text: 'text-yellow-800 dark:text-yellow-400',
        border: 'border-yellow-200 dark:border-yellow-700',
      },
      green: {
        bg: 'bg-green-100 dark:bg-green-900/20',
        text: 'text-green-800 dark:text-green-400',
        border: 'border-green-200 dark:border-green-700',
      },
      red: {
        bg: 'bg-red-100 dark:bg-red-900/20',
        text: 'text-red-800 dark:text-red-400',
        border: 'border-red-200 dark:border-red-700',
      },
    };
    
    return statusClasses[color as keyof typeof statusClasses] || statusClasses.gray;
  };

  if (showSkeleton) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="bg-linear-to-r from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div>
                  <Skeleton className="h-8 w-48 mb-2" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
              <Skeleton className="h-12 w-32" />
            </div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="w-12 h-12 rounded-xl" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Items Skeleton */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="bg-linear-to-r from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-linear-to-br from-theme-primary to-theme-accent rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  {t('TITLE')}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {t('SUBTITLE')}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                color="primary"
                size="lg"
                onPress={openCreateModal}
                startContent={<Plus size={18} />}
                className="bg-linear-to-r from-theme-primary to-theme-accent hover:from-theme-primary/90 hover:to-theme-accent/90 shadow-lg shadow-theme-primary/25 hover:shadow-xl hover:shadow-theme-primary/40 transition-all duration-300 text-white font-medium"
              >
                {t('ADD_ITEM')}
              </Button>
              <AdminSurveyCreationButton 
                showLabel
                variant="default"
                size="lg"
                className="bg-linear-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg shadow-yellow-500/25 hover:shadow-xl hover:shadow-yellow-500/40 transition-all duration-300 text-white font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                  {t('TOTAL_ITEMS_STAT')}
                </p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 group-hover:scale-105 transition-transform">
                  {stats.total}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-linear-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                  {t('PENDING_REVIEW')}
                </p>
                <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-300 group-hover:scale-105 transition-transform">
                  {stats.pending}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                  {t('APPROVED')}
                </p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300 group-hover:scale-105 transition-transform">
                  {stats.approved}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-linear-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                  {t('REJECTED')}
                </p>
                <p className="text-3xl font-bold text-red-700 dark:text-red-300 group-hover:scale-105 transition-transform">
                  {stats.rejected}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <XCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
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
      <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-xs">
        <CardContent className="p-0">
          {/* Table Header with Filters and Sorting */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                {/* Select All Checkbox */}
                {items.length > 0 && (
                  <Checkbox
                    isSelected={isAllSelected}
                    isIndeterminate={isPartiallySelected}
                    onValueChange={toggleSelectAll}
                    aria-label={t('SELECT_ALL')}
                    color="primary"
                  />
                )}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('ITEMS_TABLE_TITLE')}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {/* Status Tabs */}
                <AdminStatusTabs
                  options={statusOptions}
                  value={statusFilter as ItemStatus | ''}
                  onChange={(status) => setStatusFilter(status)}
                  showCounts={true}
                />
                {/* Filter Popover */}
                <AdminFilterPopover
                  sections={filterSections}
                  activeCount={advancedFilterCount}
                  onClearAll={handleClearAdvancedFilters}
                  triggerLabel={t('FILTERS')}
                />
                {/* Sorting */}
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
            <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-25 dark:bg-gray-850">
              <AdminActiveFilters
                filters={activeFiltersDisplay}
                onRemove={handleRemoveFilter}
                onClearAll={handleClearAdvancedFilters}
              />
            </div>
          )}

          {/* Items List */}
          <div className={cn(
            "p-6 space-y-4 relative transition-opacity duration-200",
            isFetching && !isLoading && "opacity-60"
          )}>
            {/* Loading overlay for tab/filter changes */}
            {isFetching && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="bg-white/90 dark:bg-gray-900/90 rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-theme-primary" />
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
                    "group relative rounded-xl border transition-all duration-300 overflow-hidden",
                    isSelected
                      ? "bg-theme-primary/5 dark:bg-theme-primary/10 border-theme-primary/30"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-theme-primary/30 hover:shadow-lg"
                  )}
                >
                  {/* Loading overlay */}
                  {isProcessingThisItem && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-20 transition-opacity duration-300">
                      <div className="flex flex-col items-center gap-2">
                        <Spinner size="lg" color="primary" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {isApproving ? t('APPROVING') : isRejecting ? t('REJECTING') : isDuplicatingThisItem ? t('DUPLICATING') : t('DELETING')}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      {/* Checkbox for selection */}
                      <div className="shrink-0 mr-4 pt-1">
                        <Checkbox
                          isSelected={isSelected}
                          onValueChange={() => toggleSelection(item.id)}
                          aria-label={t('SELECT_ITEM', { name: item.name })}
                          color="primary"
                        />
                      </div>

                      {/* Left Section: Item Info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start space-x-3">
                          {/* Featured Badge */}
                          {item.featured && (
                            <div className="shrink-0">
                              <Star className="w-5 h-5 text-yellow-500 fill-current" />
                            </div>
                          )}
                          
                          {/* Item Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                {item.name || t('UNTITLED')}
                              </h4>
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(item.status)}`} />
                                {getStatusLabel(item.status)}
                              </span>
                            </div>
                            
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                              {item.description}
                            </p>
                            
                            {/* Categories and Tags */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {categories.map((cat, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                                >
                                  <Folder className="w-3 h-3" />
                                  {cat}
                                </span>
                              ))}
                              {item.tags.slice(0, 3).map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                >
                                  <TagIcon className="w-3 h-3" />
                                  {tag}
                                </span>
                              ))}
                              {item.tags.length > 3 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                  <TagIcon className="w-3 h-3" />
                                  {t('MORE_TAGS', { count: item.tags.length - 3 })}
                                </span>
                              )}
                            </div>
                            
                            {/* Meta Info */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
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

                      {/* Right Section: Actions Menu */}
                      <div className="flex items-center ml-4">
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
            <div className="px-6 py-16 text-center">
              <div className="max-w-sm mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 bg-linear-to-br from-theme-primary/10 to-theme-accent/10 rounded-full flex items-center justify-center">
                  <Package className="w-8 h-8 text-theme-primary opacity-60" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {hasActiveFilters ? t('NO_FILTER_RESULTS') : t('NO_ITEMS_FOUND')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  {hasActiveSearch
                    ? t('NO_ITEMS_FOUND_SEARCH_DESC', { term: searchTerm })
                    : hasActiveFilters
                      ? t('NO_FILTER_RESULTS_DESCRIPTION')
                      : t('NO_ITEMS_DESCRIPTION')
                  }
                </p>
                {hasActiveFilters ? (
                  <Button
                    color="primary"
                    onPress={handleClearAllFilters}
                    className="bg-linear-to-r from-theme-primary to-theme-accent hover:from-theme-primary/90 hover:to-theme-accent/90"
                  >
                    {t('CLEAR_ALL')}
                  </Button>
                ) : (
                  <Button
                    color="primary"
                    onPress={openCreateModal}
                    startContent={<Plus size={16} />}
                    className="bg-linear-to-r from-theme-primary to-theme-accent hover:from-theme-primary/90 hover:to-theme-accent/90"
                  >
                    {t('CREATE_ITEM')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <UniversalPagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Item Form Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="item-form-modal-title"
          tabIndex={-1}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto focus:outline-none"
          onClick={(e) => {
            // Close modal when clicking backdrop
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
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

      {/* Reject Item Modal */}
      <ItemRejectModal
        isOpen={rejectModalOpen}
        item={selectedItemForReject}
        rejectionReason={rejectionReason}
        isSubmitting={isRejecting}
        onReasonChange={setRejectionReason}
        onConfirm={handleRejectConfirm}
        onClose={closeRejectModal}
      />

      {/* Item History Modal */}
      {selectedItemForHistory && (
        <ItemHistoryModal
          isOpen={historyModalOpen}
          itemId={selectedItemForHistory.id}
          itemName={selectedItemForHistory.name}
          onClose={closeHistoryModal}
        />
      )}

      {/* Bulk Action Bar */}
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

      {/* Bulk Confirm Dialog */}
      <BulkConfirmDialog
        isOpen={bulkAction !== null}
        action={bulkAction}
        selectedCount={selectedIds.size}
        pendingCount={pendingSelectedCount}
        isProcessing={isBulkProcessing}
        onConfirm={(reason) => {
          if (bulkAction === 'approve') {
            handleBulkApprove();
          } else if (bulkAction === 'reject' && reason) {
            handleBulkReject(reason);
          } else if (bulkAction === 'delete') {
            handleBulkDelete();
          }
        }}
        onClose={() => setBulkAction(null)}
      />
    </div>
  );
} 