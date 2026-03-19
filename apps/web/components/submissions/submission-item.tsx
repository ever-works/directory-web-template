'use client';

import { useLocale, useTranslations } from 'next-intl';
import { FiActivity, FiClock, FiEye, FiEdit, FiTrash2, FiTrendingUp, FiCheck, FiX, FiLoader } from "react-icons/fi";
import { IconType } from "react-icons";
import { ClientSubmissionData } from "@/lib/types/client-item";

export interface Submission {
  id: string;
  title: string;
  description: string;
  status: "approved" | "pending" | "rejected";
  submittedAt: string | null;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  category: string;
  tags: string[];
  views: number;
  likes: number;
  source_url?: string;
}

interface StatusConfigItem {
  labelKey: string;
  icon: IconType;
  color: string;
  bgColor: string;
  borderColor: string;
}

const statusConfig: Record<string, StatusConfigItem> = {
  approved: {
    labelKey: "STATUS_APPROVED",
    icon: FiCheck,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  pending: {
    labelKey: "STATUS_PENDING",
    icon: FiClock,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  rejected: {
    labelKey: "STATUS_REJECTED",
    icon: FiX,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-200 dark:border-red-800",
  },
};

export interface SubmissionItemProps {
  submission: Submission;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  isDeleting?: boolean;
  isUpdating?: boolean;
  disabled?: boolean;
}

export function SubmissionItem({
  submission,
  onEdit,
  onDelete,
  onView,
  isDeleting = false,
  isUpdating = false,
  disabled = false,
}: SubmissionItemProps) {
  const t = useTranslations('client.submissions');
  const locale = useLocale();
  const status = statusConfig[submission.status];
  const StatusIcon = status.icon;
  const isLoading = isDeleting || isUpdating;
  const isDisabled = disabled || isLoading;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return t('INVALID_DATE');
      }
      return date.toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return t('INVALID_DATE');
    }
  };

  return (
    <div className={`group p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-theme-primary-300 dark:hover:border-theme-primary-600 hover:shadow-lg hover:shadow-theme-primary-500/10 transition-all duration-300 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xs ${isDisabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg group-hover:text-theme-primary-700 dark:group-hover:text-theme-primary-400 transition-colors">
                  {submission.title}
                </h3>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color} ${status.borderColor} border`}>
                  <StatusIcon className="w-3 h-3" />
                  {t(status.labelKey)}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 leading-relaxed line-clamp-2">{submission.description}</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {submission.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-700"
                  >
                    {tag}
                  </span>
                ))}
                {submission.tags.length > 5 && (
                  <span className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-700">
                    {t('MORE_TAGS', { count: submission.tags.length - 5 })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <FiActivity className="w-3 h-3" />
                  {submission.category}
                </span>
                {submission.submittedAt && (
                  <span className="flex items-center gap-1">
                    <FiClock className="w-3 h-3" />
                    {t('SUBMITTED')}: {formatDate(submission.submittedAt)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <FiEye className="w-3 h-3" />
                  {t('VIEWS_COUNT', { count: submission.views })}
                </span>
                {submission.status === "approved" && submission.likes > 0 && (
                  <span className="flex items-center gap-1">
                    <FiTrendingUp className="w-3 h-3" />
                    {t('LIKES_COUNT', { count: submission.likes })}
                  </span>
                )}
              </div>
              {submission.status === "rejected" && submission.rejectionReason && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
                  <strong>{t('REJECTION_REASON')}:</strong> {submission.rejectionReason}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button
                className="p-2 text-gray-400 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 transition-colors rounded-lg hover:bg-theme-primary-50 dark:hover:bg-theme-primary-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                title={t('VIEW_SUBMISSION')}
                onClick={onView ? () => onView(submission.id) : undefined}
                disabled={isDisabled}
              >
                <FiEye className="w-4 h-4" />
              </button>
              <button
                className="p-2 text-gray-400 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 transition-colors rounded-lg hover:bg-theme-primary-50 dark:hover:bg-theme-primary-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                title={t('EDIT_SUBMISSION')}
                onClick={onEdit ? () => onEdit(submission.id) : undefined}
                disabled={isDisabled}
              >
                {isUpdating ? (
                  <FiLoader className="w-4 h-4 animate-spin" />
                ) : (
                  <FiEdit className="w-4 h-4" />
                )}
              </button>
              <button
                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                title={t('DELETE_SUBMISSION')}
                onClick={onDelete ? () => onDelete(submission.id) : undefined}
                disabled={isDisabled}
              >
                {isDeleting ? (
                  <FiLoader className="w-4 h-4 animate-spin" />
                ) : (
                  <FiTrash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to convert ClientSubmissionData to Submission format
export function toSubmission(item: ClientSubmissionData): Submission {
  // Determine approved/rejected at based on status and reviewed_at
  const approvedAt = item.status === 'approved' ? item.reviewed_at : undefined;
  const rejectedAt = item.status === 'rejected' ? item.reviewed_at : undefined;

  return {
    id: item.id,
    title: item.name,
    description: item.description,
    status: (['approved', 'pending', 'rejected'].includes(item.status)
      ? item.status : 'pending') as Submission['status'],
    submittedAt: item.submitted_at || item.updated_at || null,
    approvedAt,
    rejectedAt,
    rejectionReason: item.review_notes,
    category: Array.isArray(item.category) ? item.category[0] || 'Uncategorized' : item.category || 'Uncategorized',
    tags: item.tags || [],
    views: item.views || 0,
    likes: item.likes || 0,
    source_url: item.source_url,
  };
}

// Skeleton component for loading state
export function SubmissionItemSkeleton() {
  return (
    <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-xs animate-pulse">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="flex gap-2 mb-3">
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-6 w-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>
              <div className="flex gap-6">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
