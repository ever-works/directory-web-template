'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Modal, ModalContent } from '@/components/ui/modal';
import { AlertTriangle, Trash2, Loader2, Info } from 'lucide-react';
import { Submission } from './submission-item';

export interface DeleteSubmissionDialogProps {
  submission: Submission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function DeleteSubmissionDialog({
  submission,
  open,
  onOpenChange,
  onConfirm
}: DeleteSubmissionDialogProps) {
  const t = useTranslations('client.submissions');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      // Parent handles closing via setDeleteDialogOpen on success
    } catch (error) {
      console.error('Error deleting submission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!submission) return null;

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      size="sm"
      hideCloseButton
    >
      <ModalContent>
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('DELETE_SUBMISSION_TITLE')}
            </h2>
          </div>

          {/* Confirmation text */}
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('DELETE_CONFIRM_MESSAGE')}
          </p>

          {/* Item preview card */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3 mb-4">
            <p className="font-semibold text-gray-900 dark:text-white">
              {submission.title}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {submission.description}
            </p>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-5">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('RESTORE_INFO')}
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              {t('CANCEL')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('DELETING')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('DELETE')}
                </>
              )}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
