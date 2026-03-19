'use client';

import { useTranslations } from 'next-intl';
import { FiFileText, FiPlus } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { SubmissionItem, SubmissionItemSkeleton, toSubmission } from './submission-item';
import { ClientSubmissionData } from '@/lib/types/client-item';

export interface SubmissionListProps {
  items: ClientSubmissionData[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  deletingId?: string | null;
  updatingId?: string | null;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateActionLabel?: string;
  emptyStateActionHref?: string;
  skeletonCount?: number;
}

export function SubmissionList({
  items,
  isLoading = false,
  onEdit,
  onDelete,
  onView,
  deletingId,
  updatingId,
  emptyStateTitle,
  emptyStateDescription,
  emptyStateActionLabel,
  emptyStateActionHref = '/submit',
  skeletonCount = 3,
}: SubmissionListProps) {
  const t = useTranslations('client.submissions');

  const title = emptyStateTitle || t('NO_SUBMISSIONS_TITLE');
  const description = emptyStateDescription || t('NO_SUBMISSIONS_DESC');
  const actionLabel = emptyStateActionLabel || t('SUBMIT_FIRST_PROJECT');

  // Show skeleton loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <SubmissionItemSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Show empty state
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
          <FiFileText className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {description}
        </p>
        {emptyStateActionHref && (
          <Link
            href={emptyStateActionHref}
            className="inline-flex items-center gap-2 px-6 py-3 bg-theme-primary-600 hover:bg-theme-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            {actionLabel}
          </Link>
        )}
      </div>
    );
  }

  // Show items list
  return (
    <div className="space-y-4">
      {items.map((item) => {
        const submission = toSubmission(item);
        return (
          <SubmissionItem
            key={item.id}
            submission={submission}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
            isDeleting={deletingId === item.id}
            isUpdating={updatingId === item.id}
            disabled={!!deletingId || !!updatingId}
          />
        );
      })}
    </div>
  );
}

// Wrapper component with pagination info
export interface SubmissionListWithPaginationProps extends SubmissionListProps {
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export function SubmissionListWithInfo({
  items,
  total,
  page,
  totalPages,
  limit,
  ...props
}: SubmissionListWithPaginationProps) {
  const t = useTranslations('client.submissions');
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="space-y-4">
      {/* Results info */}
      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            {t('SHOWING_RESULTS', { start, end, total })}
          </span>
          {totalPages > 1 && (
            <span>
              {t('PAGE_INFO', { page, totalPages })}
            </span>
          )}
        </div>
      )}

      {/* List */}
      <SubmissionList items={items} {...props} />
    </div>
  );
}
