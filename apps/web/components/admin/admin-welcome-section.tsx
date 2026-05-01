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
        <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {t('DASHBOARD_TITLE')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-white/40">
                {t('WELCOME_MESSAGE', { adminName })
                    .split(adminName)
                    .map((part, i, arr) => (
                        <span key={i}>
                            {part}
                            {i < arr.length - 1 && (
                                <span className="font-semibold text-gray-700 dark:text-white/70">
                                    {adminName}
                                </span>
                            )}
                        </span>
                    ))}
            </p>
        </div>
    );
}

export function AdminWelcomeGradient({ title, subtitle, rightActions }: AdminWelcomeGradientProps) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-white/40">{subtitle}</p>
                )}
            </div>
            {rightActions && (
                <div className="flex shrink-0 items-center gap-2">{rightActions}</div>
            )}
        </div>
    );
}
