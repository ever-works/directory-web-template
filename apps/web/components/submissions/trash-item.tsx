'use client';

import { FiRefreshCw, FiClock, FiLoader, FiTrash2 } from 'react-icons/fi';
import { ClientSubmissionData } from '@/lib/types/client-item';
import { useLocale, useTranslations } from 'next-intl';

export interface TrashItemProps {
  item: ClientSubmissionData;
  onRestore: (id: string) => void;
  restoringItemId?: string | null;
  disabled?: boolean;
}

export function TrashItem({
  item,
  onRestore,
  restoringItemId = null,
  disabled = false,
}: TrashItemProps) {
  const t = useTranslations('client.submissions');
  const locale = useLocale();
  const isRestoring = restoringItemId === item.id;
  const isDisabled = disabled || isRestoring;

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return t('UNKNOWN_DATE');
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return t('INVALID_DATE');
      }
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return t('INVALID_DATE');
    }
  };

  return (
    <div
      className={`group p-6 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-300 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xs ${
        isDisabled ? 'opacity-60 pointer-events-none' : 'hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Trash icon indicator */}
        <div className="shrink-0 flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <FiTrash2 className="w-6 h-6 text-gray-400 dark:text-gray-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Title */}
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-lg mb-1 line-through decoration-gray-400">
                {item.name}
              </h3>

              {/* Description */}
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 leading-relaxed line-clamp-2">
                {item.description}
              </p>

              {/* Deleted date */}
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <FiClock className="w-3 h-3" />
                <span>{t('DELETED_ON', { date: formatDate(item.deleted_at) })}</span>
              </div>
            </div>

            {/* Restore button */}
            <div className="ml-4">
              <button
                onClick={() => onRestore(item.id)}
                disabled={isDisabled}
                className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary-50 dark:bg-theme-primary-900/20 text-theme-primary-600 dark:text-theme-primary-400 rounded-lg hover:bg-theme-primary-100 dark:hover:bg-theme-primary-900/40 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRestoring ? (
                  <>
                    <FiLoader className="w-4 h-4 animate-spin" />
                    {t('RESTORING')}
                  </>
                ) : (
                  <>
                    <FiRefreshCw className="w-4 h-4" />
                    {t('RESTORE')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton component for loading state
export function TrashItemSkeleton() {
  return (
    <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-xs animate-pulse">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="ml-4">
              <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
