'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@heroui/react';
import { AlertTriangle, Trash2, Shield } from 'lucide-react';
import { RoleData } from '@/hooks/use-admin-roles';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';

interface DeleteRoleDialogProps {
  role: RoleData;
  isOpen: boolean;
  onConfirm: (hardDelete: boolean) => void;
  onCancel: () => void;
}

export function DeleteRoleDialog({ role, isOpen, onConfirm, onCancel }: DeleteRoleDialogProps) {
  const t = useTranslations('admin.DELETE_ROLE_DIALOG');
  const [isLoading, setIsLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      onConfirm(false); // Always soft delete
    } catch (error) {
      console.error('Error deleting role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      handleCancel();
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Defer to ensure element is mounted
    const id = window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-role-title"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="fixed inset-0 bg-black bg-opacity-60"
        onClick={handleCancel}
        aria-hidden="true"
      />
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-600 dark:text-red-400" aria-hidden="true" focusable="false" />
            </div>
            <h2 id="delete-role-title" className="text-lg font-semibold text-gray-900 dark:text-white">{t('TITLE')}</h2>
          </div>
          {!isLoading && (
            <button
              type="button"
              onClick={handleCancel}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-sm transition-colors"
              aria-label={t('CLOSE_DIALOG')}
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Role Info */}
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-linear-to-br from-theme-primary to-theme-accent rounded-lg flex items-center justify-center">
              <Shield size={20} className="text-white" aria-hidden="true" focusable="false" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {role.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {role.description}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>ID: {role.id}</span>
                <span>
                  {Array.isArray(role.permissions) ? role.permissions.length : 0} {t('PERMISSIONS')}
                </span>
                <span className={clsx(
                  'px-2 py-1 rounded-full',
                  role.isAdmin
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                )}>
                  {role.isAdmin ? t('ADMIN_ROLE') : t('CLIENT_ROLE')}
                </span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" aria-hidden="true" focusable="false" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium">{t('WARNING_TITLE')}</p>
                <p className="mt-1">
                  {t('WARNING_MESSAGE')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <Button
            variant="bordered"
            onPress={handleCancel}
            disabled={isLoading}
            type="button"
            aria-label={t('CANCEL_ROLE_DELETION')}
          >
            {t('CANCEL')}
          </Button>
          <Button
            color="danger"
            onPress={handleConfirm}
            isLoading={isLoading}
            startContent={!isLoading && <Trash2 size={16} aria-hidden="true" focusable="false" />}
            className={clsx(
              'bg-linear-to-r from-red-500 to-red-600',
              'hover:from-red-600 hover:to-red-700',
              'shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40',
              'transition-all duration-300 text-white font-medium'
            )}
            type="button"
            aria-label={isLoading ? t('DELETING_ROLE') : t('CONFIRM_ROLE_DELETION')}
          >
            {isLoading ? t('DELETING') : t('DELETE_ROLE')}
          </Button>
        </div>
      </div>
    </div>
  );
}