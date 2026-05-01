"use client";

import { useState } from "react";
import { Card, CardBody, Chip } from "@heroui/react";
import { Trash2, MessageSquare } from "lucide-react";
import { Button } from "@heroui/react";
import { UniversalPagination } from "@/components/universal-pagination";
import DeleteCommentDialog from "@/components/admin/comments/delete-comment-dialog";
import { useAdminComments, AdminCommentItem } from "@/hooks/use-admin-comments";
import { useAdminFilters } from "@/hooks/use-admin-filters";
import { AdminSearchBar, AdminActiveFilters } from "@/components/admin/shared";
import { useTranslations } from "next-intl";
import { useNavigation } from "@/components/providers";

export default function AdminCommentsPage() {
  const t = useTranslations('admin.ADMIN_COMMENTS_PAGE');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Unified filter state
  const {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    isSearching,
    hasActiveSearch,
    hasActiveFilters,
    clearAllFilters,
  } = useAdminFilters({
    onFiltersChange: () => setCurrentPage(1),
  });

  // Use custom hook with external search
  const {
    comments,
    isLoading,
    isFetching,
    isDeleting,
    totalPages,
    totalComments,
    deleteComment,
  } = useAdminComments({
    page: currentPage,
    limit: 10,
    search: debouncedSearchTerm || undefined,
  });

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Local state for delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [commentToDelete, setCommentToDelete] = useState<AdminCommentItem | null>(null);

  // Handler functions
  const handleDelete = async (id: string) => {
    await deleteComment(id);
  };

  const openDeleteDialog = (comment: AdminCommentItem) => {
    setCommentToDelete(comment);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setCommentToDelete(null);
  };

  const confirmDelete = async () => {
    if (!commentToDelete) return;
    await handleDelete(commentToDelete.id);
    closeDeleteDialog();
  };

  const { isInitialLoad } = useNavigation();
  const shouldShowSkeleton = isInitialLoad && isLoading;

  if (shouldShowSkeleton) {
    return (
      <div className="p-6 max-w-7xl mx-auto" aria-busy="true">
        <div className="mb-8">
          <div className="h-8 w-40 bg-gray-200 dark:bg-white/8 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-56 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
        </div>
        <div className="h-11 w-full bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse mb-6" />
        <Card className="border border-gray-100 dark:border-white/5 shadow-sm rounded-2xl">
          <CardBody className="p-0">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/40 dark:bg-white/[0.015]">
              <div className="h-5 w-28 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
            </div>
            <div className="divide-y divide-gray-100/50 dark:divide-white/[0.03]">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="px-6 py-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-white/8 rounded-full animate-pulse shrink-0" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-white/8 rounded animate-pulse mb-1.5" />
                      <div className="h-3 w-24 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
                    </div>
                    <div className="h-7 w-20 bg-gray-200 dark:bg-white/8 rounded-lg animate-pulse shrink-0" />
                  </div>
                  <div className="ml-11 space-y-1.5">
                    <div className="h-3.5 w-full bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                    <div className="h-3.5 w-4/5 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
              {t('TITLE')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-2">
              <span>{t('SUBTITLE')}</span>
              {!isLoading && totalComments > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-300 ring-1 ring-gray-200/60 dark:ring-white/8">
                  {totalComments} {t('TOTAL_COMMENTS')}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>



      {/* Modern SaaS-Style Filters */}
      <div className="mb-6">
        {/* Search Bar */}
        <AdminSearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          isSearching={isSearching || isFetching}
          placeholder={t('SEARCH_PLACEHOLDER')}
          className="mb-4"
        />

        {/* Active Filters */}
        {hasActiveSearch && (
          <AdminActiveFilters
            filters={[
              {
                id: 'search',
                type: 'search',
                label: t('SEARCH'),
                value: searchTerm.trim(),
              },
            ]}
            onRemove={() => setSearchTerm('')}
            onClearAll={clearAllFilters}
            clearAllThreshold={1}
          />
        )}

        {/* Results Summary */}
        {!isLoading && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              {t('SHOWING_COMMENTS', { count: comments.length, total: totalComments })}
              {hasActiveFilters && (
                <span className="ml-1">
                  {t('FILTERED')}
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Comments List */}
      <Card className="border border-gray-100 dark:border-white/5 shadow-sm bg-white dark:bg-white/[0.03] overflow-hidden rounded-2xl">
        <CardBody className="p-0">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/40 dark:bg-white/[0.015]">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('COMMENTS_TITLE')}</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {totalComments} {t('COMMENTS_TOTAL_COUNT')}
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-100/50 dark:divide-white/[0.03]">
            {comments.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-100/60 dark:bg-white/5 flex items-center justify-center ring-1 ring-gray-200/60 dark:ring-white/5">
                  <MessageSquare className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5">{t('NO_COMMENTS_FOUND')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                  {hasActiveFilters ? t('NO_COMMENTS_SEARCH_DESCRIPTION') : t('NO_COMMENTS_DESCRIPTION')}
                </p>
              </div>
            ) : (
              comments.map((comment) => {
                const avatarColors = [
                  'bg-gradient-to-br from-blue-500 to-indigo-600',
                  'bg-gradient-to-br from-emerald-500 to-teal-600',
                  'bg-gradient-to-br from-violet-500 to-purple-600',
                  'bg-gradient-to-br from-amber-500 to-orange-600',
                  'bg-gradient-to-br from-pink-500 to-rose-600',
                ];
                const colorIndex = (comment.user.name || comment.user.email || 'U').charCodeAt(0) % avatarColors.length;
                return (
                <div key={comment.id} className="px-6 py-5 hover:bg-gray-50/60 dark:hover:bg-white/[0.025] transition-all duration-150">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 ${avatarColors[colorIndex]} rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
                          {(comment.user.name || comment.user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {comment.user.name || comment.user.email || t('UNKNOWN_USER')}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : t('UNKNOWN_DATE')}
                          </p>
                        </div>
                        {comment.rating !== null && (
                          <Chip size="sm" variant="flat" color="warning" className="shrink-0">
                            {comment.rating}{t('RATING_LABEL')}
                          </Chip>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed bg-gray-50/60 dark:bg-white/[0.03] rounded-xl px-4 py-3 border border-gray-100 dark:border-white/5 mb-2">
                        {comment.content}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                        <MessageSquare className="w-3 h-3" />
                        <span>{t('ITEM_ID_LABEL')} {comment.itemId}</span>
                      </div>
                    </div>
                    <Button
                      isIconOnly
                      color="danger"
                      variant="light"
                      size="sm"
                      isDisabled={isDeleting === comment.id}
                      onPress={() => openDeleteDialog(comment)}
                      className="text-gray-400 hover:text-red-500 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </CardBody>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center mt-8 gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('SHOWING_RANGE', {
              start: ((currentPage - 1) * 10) + 1,
              end: Math.min(currentPage * 10, totalComments),
              total: totalComments,
            })}
          </p>
          <UniversalPagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {commentToDelete && (
        <DeleteCommentDialog
          comment={commentToDelete}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}


