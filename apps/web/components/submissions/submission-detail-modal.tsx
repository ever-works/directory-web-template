'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter
} from '@/components/ui/modal';
import {
  Eye,
  X,
  Calendar,
  Tag,
  Activity,
  TrendingUp,
  Check,
  Clock,
  XCircle,
  Edit,
  Trash2,
} from 'lucide-react';
import { Submission } from './submission-item';

const CLASSES = {
  headerContainer: "flex items-center justify-between",
  headerLeft: "flex items-center gap-3",
  viewIcon: "w-10 h-10 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg",
  headerText: "text-xl font-bold text-gray-900 dark:text-white",
  headerSubtext: "text-sm text-gray-600 dark:text-gray-400",
  closeButton: "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1",
  section: "space-y-2",
  sectionTitle: "text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider",
  statusBadge: {
    approved: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
    pending: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
    rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
  },
  metaItem: "flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400",
  tagsList: "flex flex-wrap gap-2",
  tag: "inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm border border-gray-200 dark:border-gray-700",
  statsCard: "p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center",
  statsValue: "text-2xl font-bold text-gray-900 dark:text-white",
  statsLabel: "text-sm text-gray-500 dark:text-gray-400",
  rejectionBox: "p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg",
  footerContainer: "flex gap-3 w-full",
} as const;

const statusIcons = {
  approved: Check,
  pending: Clock,
  rejected: XCircle,
};

const statusLabelKeys = {
  approved: 'STATUS_APPROVED',
  pending: 'STATUS_PENDING',
  rejected: 'STATUS_REJECTED',
};

export interface SubmissionDetailModalProps {
  submission: Submission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function SubmissionDetailModal({
  submission,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: SubmissionDetailModalProps) {
  const t = useTranslations('client.submissions');
  const locale = useLocale();

  if (!submission) return null;

  const StatusIcon = statusIcons[submission.status];
  const statusLabel = t(statusLabelKeys[submission.status]);
  const statusClass = CLASSES.statusBadge[submission.status];

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return t('NA');
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return t('INVALID_DATE');
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return t('INVALID_DATE');
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      size="2xl"
    >
      <ModalContent>
        <ModalHeader>
          <div className={CLASSES.headerContainer}>
            <div className={CLASSES.headerLeft}>
              <div className={CLASSES.viewIcon}>
                <Eye className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className={CLASSES.headerText}>{t('SUBMISSION_DETAILS')}</h2>
                <p className={CLASSES.headerSubtext}>{t('VIEW_SUBMISSION_INFO')}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className={CLASSES.closeButton}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-6">
            {/* Title & Status */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {submission.title}
                </h3>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusClass}`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusLabel}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className={CLASSES.section}>
              <h4 className={CLASSES.sectionTitle}>{t('DESCRIPTION')}</h4>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {submission.description}
              </p>
            </div>

            {/* Engagement Stats (only for approved) */}
            {submission.status === 'approved' && (
              <div className="grid grid-cols-2 gap-4">
                <div className={CLASSES.statsCard}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Eye className="w-5 h-5 text-blue-500" />
                    <span className={CLASSES.statsValue}>{submission.views}</span>
                  </div>
                  <span className={CLASSES.statsLabel}>{t('VIEWS')}</span>
                </div>
                <div className={CLASSES.statsCard}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className={CLASSES.statsValue}>{submission.likes}</span>
                  </div>
                  <span className={CLASSES.statsLabel}>{t('LIKES')}</span>
                </div>
              </div>
            )}

            {/* Rejection Reason */}
            {submission.status === 'rejected' && submission.rejectionReason && (
              <div className={CLASSES.rejectionBox}>
                <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">{t('REJECTION_REASON')}</h4>
                <p className="text-sm text-red-700 dark:text-red-300">{submission.rejectionReason}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div className={CLASSES.metaItem}>
                <Activity className="w-4 h-4 text-gray-400" />
                <span>{t('CATEGORY')}: <strong>{submission.category}</strong></span>
              </div>
              {submission.submittedAt && (
                <div className={CLASSES.metaItem}>
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{t('SUBMITTED')}: <strong>{formatDate(submission.submittedAt)}</strong></span>
                </div>
              )}
              {submission.approvedAt && (
                <div className={CLASSES.metaItem}>
                  <Check className="w-4 h-4 text-green-500" />
                  <span>{t('APPROVED_ON')}: <strong>{formatDate(submission.approvedAt)}</strong></span>
                </div>
              )}
              {submission.rejectedAt && (
                <div className={CLASSES.metaItem}>
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span>{t('REJECTED_ON')}: <strong>{formatDate(submission.rejectedAt)}</strong></span>
                </div>
              )}
            </div>

            {/* Tags */}
            {submission.tags.length > 0 && (
              <div className={CLASSES.section}>
                <h4 className={CLASSES.sectionTitle}>{t('TAGS')}</h4>
                <div className={CLASSES.tagsList}>
                  {submission.tags.map((tag) => (
                    <span key={tag} className={CLASSES.tag}>
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          <div className={CLASSES.footerContainer}>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {t('CLOSE')}
            </Button>
            {onEdit && (
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(submission.id);
                }}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                {t('EDIT')}
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  onOpenChange(false);
                  onDelete(submission.id);
                }}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('DELETE')}
              </Button>
            )}
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
