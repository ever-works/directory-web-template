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
  alertIcon: "w-10 h-10 bg-linear-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg",
  headerText: "text-xl font-bold text-gray-900 dark:text-white",
  headerSubtext: "text-sm text-gray-600 dark:text-gray-400",
  closeButton: "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1",
  
  // Warning message styles
  warningContainer: "bg-linear-to-r from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4",
  warningContent: "flex items-start gap-3",
  warningIcon: "h-5 w-5 text-red-500 mt-0.5 shrink-0",
  warningTitle: "font-medium text-red-800 dark:text-red-200 mb-1",
  warningText: "text-sm text-red-700 dark:text-red-300",
  
  // Comment preview styles
  commentContainer: "bg-linear-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-xs",
  commentHeader: "flex items-start gap-4",
  userAvatar: "w-12 h-12 bg-linear-to-br from-theme-primary to-theme-accent rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg shrink-0",
  commentContent: "flex-1 min-w-0",
  userInfo: "flex items-center gap-2 mb-2",
  userName: "font-semibold text-gray-900 dark:text-white",
  ratingBadge: "px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded-full",
  commentDate: "text-sm text-gray-500 dark:text-gray-400 mb-3",
  commentText: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-xs",
  commentBody: "text-gray-700 dark:text-gray-300 leading-relaxed",
  commentMeta: "mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400",
  metaItem: "flex items-center gap-1",
  
  // Footer styles
  footerContainer: "flex gap-3 w-full",
  cancelButton: "flex-1",
  deleteButton: "flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200",
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
                <AlertTriangle className="h-5 w-5 text-white" />
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
