'use client';

import { useTranslations } from 'next-intl';
import { FiSearch, FiX, FiLoader } from 'react-icons/fi';
import { ClientStatusFilter, CLIENT_STATUS_FILTERS } from '@/lib/types/client-item';

export interface SubmissionFiltersProps {
  status: ClientStatusFilter;
  search: string;
  onStatusChange: (status: ClientStatusFilter) => void;
  onSearchChange: (search: string) => void;
  isSearching?: boolean;
  disabled?: boolean;
  statusCounts?: {
    all: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}

export function SubmissionFilters({
  status,
  search,
  onStatusChange,
  onSearchChange,
  isSearching = false,
  disabled = false,
  statusCounts,
}: SubmissionFiltersProps) {
  const t = useTranslations('client.submissions');
  const tStatus = useTranslations('admin.ITEM_FORM');

  const handleClearSearch = () => {
    onSearchChange('');
  };

  return (
    <div className="space-y-4">
      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {CLIENT_STATUS_FILTERS.map((filter) => {
          const isActive = status === filter.value;
          const count = statusCounts?.[filter.value as keyof typeof statusCounts];

          return (
            <button
              key={filter.value}
              onClick={() => onStatusChange(filter.value)}
              disabled={disabled}
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-theme-primary-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {tStatus(`STATUS_OPTIONS.${filter.labelKey}`)}
              {count !== undefined && (
                <span
                  className={`
                    inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold
                    ${isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }
                  `}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <FiLoader className="w-5 h-5 text-gray-400 animate-spin" />
          ) : (
            <FiSearch className="w-5 h-5 text-gray-400" />
          )}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('SEARCH_PLACEHOLDER')}
          disabled={disabled}
          className={`
            w-full pl-10 pr-10 py-3
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-lg
            text-gray-900 dark:text-gray-100
            placeholder-gray-500 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent
            transition-all duration-200
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
        {search && !disabled && (
          <button
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function SubmissionFiltersCompact({
  status,
  search,
  onStatusChange,
  onSearchChange,
  isSearching = false,
  disabled = false,
}: Omit<SubmissionFiltersProps, 'statusCounts'>) {
  const t = useTranslations('client.submissions');
  const tStatus = useTranslations('admin.ITEM_FORM');

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Status Select */}
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as ClientStatusFilter)}
        disabled={disabled}
        className={`
          px-4 py-2.5
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          rounded-lg
          text-gray-900 dark:text-gray-100
          focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {CLIENT_STATUS_FILTERS.map((filter) => (
          <option key={filter.value} value={filter.value}>
            {tStatus(`STATUS_OPTIONS.${filter.labelKey}`)}
          </option>
        ))}
      </select>

      {/* Search Input */}
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <FiLoader className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <FiSearch className="w-4 h-4 text-gray-400" />
          )}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('SEARCH_PLACEHOLDER_SHORT')}
          disabled={disabled}
          className={`
            w-full pl-9 pr-9 py-2.5
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-lg
            text-gray-900 dark:text-gray-100
            placeholder-gray-500 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent
            transition-all duration-200
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
        {search && !disabled && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
