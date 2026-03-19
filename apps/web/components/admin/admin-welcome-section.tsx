import { LayoutDashboard } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

interface AdminWelcomeSectionProps {
  adminName: string;
}

export interface AdminWelcomeGradientProps {
  title: string;
  subtitle?: string;
  rightActions?: ReactNode;
}

export function AdminWelcomeSection({ adminName }: AdminWelcomeSectionProps) {
  const t = useTranslations('admin');
  
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('DASHBOARD_TITLE')}</h1>
      <p className="text-base text-gray-600 dark:text-gray-300">
        {t('WELCOME_MESSAGE', { adminName }).split(adminName).map((part, index, array) => (
          <span key={index}>
            {part}
            {index < array.length - 1 && (
              <span className="font-semibold text-theme-primary">{adminName}</span>
            )}
          </span>
        ))}
      </p>
    </div>
  );
}

export function AdminWelcomeGradient({ title, subtitle, rightActions }: AdminWelcomeGradientProps) {
  return (
    <div className="mb-8">
      <div className="bg-linear-to-r from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-linear-to-br from-theme-primary to-theme-accent rounded-xl flex items-center justify-center shadow-lg">
              <LayoutDashboard className="w-6 h-6 text-white" aria-hidden="true" focusable="false" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                {title}
              </h1>
              {subtitle && (
                <p className="text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          {rightActions}
        </div>
      </div>
    </div>
  );
}