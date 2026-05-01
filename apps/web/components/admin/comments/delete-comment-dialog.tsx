'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter
} from '@/components/ui/modal';
import { AlertTriangle, Trash2, MessageSquare, X, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Extracted className constants for better maintainability
const CLASSES = {
  // Header styles
  headerContainer: "flex items-center justify-between",
  headerLeft: "flex items-center gap-3",
  alertIcon: "w-10 h-10 bg-red-50/80 dark:bg-red-500/10 rounded-xl flex items-center justify-center ring-1 ring-red-100 dark:ring-red-500/20",
  headerText: "text-xl font-bold text-gray-900 dark:text-white tracking-tight",
  headerSubtext: "text-sm text-gray-500 dark:text-gray-400 mt-0.5",
  closeButton: "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors",
  
  // Warning message styles
  warningContainer: "bg-red-50/80 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl p-4",
  warningContent: "flex items-start gap-3",
  warningIcon: "h-5 w-5 text-red-500 mt-0.5 shrink-0",
  warningTitle: "font-semibold text-red-800 dark:text-red-200 mb-1",
  warningText: "text-sm text-red-600 dark:text-red-300",

  // Comment preview styles
  commentContainer: "bg-gray-50/60 dark:bg-neutral-800/40 rounded-xl border border-gray-100 dark:border-neutral-700/60 p-5",
  commentHeader: "flex items-start gap-4",
  userAvatar: "w-10 h-10 bg-gray-100 dark:bg-neutral-800 rounded-full flex items-center justify-center text-gray-600 dark:text-neutral-300 font-semibold text-sm shrink-0",
  commentContent: "flex-1 min-w-0",
  userInfo: "flex items-center gap-2 mb-1.5",
  userName: "font-semibold text-gray-900 dark:text-white",
  ratingBadge: "px-2 py-0.5 bg-gray-100 dark:bg-neutral-800/80 text-gray-600 dark:text-neutral-300 text-xs font-medium rounded-full",
  commentDate: "text-xs text-gray-400 dark:text-neutral-500 mb-3",
  commentText: "bg-white dark:bg-neutral-900/70 border border-gray-100 dark:border-neutral-700/50 rounded-xl p-4",
  commentBody: "text-gray-700 dark:text-gray-300 text-sm leading-relaxed",
  commentMeta: "mt-3 flex items-center gap-4 text-xs text-gray-400 dark:text-neutral-500",
  metaItem: "flex items-center gap-1",
  
  // Footer styles
  footerContainer: "flex gap-3 w-full",
  cancelButton: "flex-1",
  deleteButton: "flex-1 font-semibold transition-colors",
} as const;

interface AdminCommentUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface AdminCommentItem {
  id: string;
  content: string;
  rating: number | null;
  userId: string;
  itemId: string;
  createdAt: string | null;
  updatedAt: string | null;
  user: AdminCommentUser;
}

interface DeleteCommentDialogProps {
  comment: AdminCommentItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteCommentDialog({ 
  comment, 
  open, 
  onOpenChange, 
  onConfirm 
}: DeleteCommentDialogProps) {
  const t = useTranslations('admin.DELETE_COMMENT_DIALOG');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error('Error deleting comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={open} 
      onClose={() => onOpenChange(false)}
      size="lg"
    >
      <ModalContent>
        <ModalHeader>
          <div className={CLASSES.headerContainer}>
            <div className={CLASSES.headerLeft}>
              <div className={CLASSES.alertIcon}>
                <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400" />
              </div>
              <div>
                <h2 className={CLASSES.headerText}>{t('TITLE')}</h2>
                <p className={CLASSES.headerSubtext}>{t('SUBTITLE')}</p>
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
            {/* Warning Message */}
            <div className={CLASSES.warningContainer}>
              <div className={CLASSES.warningContent}>
                <AlertTriangle className={CLASSES.warningIcon} />
                <div>
                  <p className={CLASSES.warningTitle}>{t('WARNING_TITLE')}</p>
                  <p className={CLASSES.warningText}>
                    {t('WARNING_MESSAGE')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Comment Preview */}
            <div className={CLASSES.commentContainer}>
              <div className={CLASSES.commentHeader}>
                <div className={CLASSES.userAvatar}>
                  {(comment.user.name || comment.user.email || "U").charAt(0).toUpperCase()}
                </div>
                <div className={CLASSES.commentContent}>
                  <div className={CLASSES.userInfo}>
                    <p className={CLASSES.userName}>
                      {comment.user.name || comment.user.email || t('UNKNOWN_USER')}
                    </p>
                    {comment.rating !== null && (
                      <div className={CLASSES.ratingBadge}>
                        ⭐ {comment.rating}/5
                      </div>
                    )}
                  </div>
                  <p className={CLASSES.commentDate}>
                    {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : t('UNKNOWN_DATE')}
                  </p>
                  <div className={CLASSES.commentText}>
                    <p className={CLASSES.commentBody}>
                      {comment.content}
                    </p>
                  </div>
                  <div className={CLASSES.commentMeta}>
                    <span className={CLASSES.metaItem}>
                      <MessageSquare className="h-3 w-3" />
{t('ITEM_ID')}: {comment.itemId}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <div className={CLASSES.footerContainer}>
            <Button 
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className={CLASSES.cancelButton}
            >
{t('CANCEL')}
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirm}
              disabled={isLoading}
              className={CLASSES.deleteButton}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
{t('DELETING')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
{t('DELETE_COMMENT')}
                </>
              )}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
