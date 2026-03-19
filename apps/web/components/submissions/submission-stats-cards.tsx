'use client';

import { useTranslations } from 'next-intl';
import { FiFileText, FiCheck, FiClock, FiX } from 'react-icons/fi';
import { Card, CardContent } from '@/components/ui/card';
import { ClientItemStats } from '@/lib/types/client-item';

export interface SubmissionStatsCardsProps {
  stats: ClientItemStats;
  isLoading?: boolean;
}

interface StatCardConfig {
  key: keyof ClientItemStats;
  labelKey: string;
  icon: typeof FiFileText;
  colorClass: string;
  hoverShadow: string;
  iconBg: string;
}

const statCardsConfig: StatCardConfig[] = [
  {
    key: 'total',
    labelKey: 'TOTAL_SUBMISSIONS',
    icon: FiFileText,
    colorClass: 'text-blue-600 dark:text-blue-400',
    hoverShadow: 'hover:shadow-blue-500/10',
    iconBg: 'from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40',
  },
  {
    key: 'approved',
    labelKey: 'APPROVED',
    icon: FiCheck,
    colorClass: 'text-green-600 dark:text-green-400',
    hoverShadow: 'hover:shadow-green-500/10',
    iconBg: 'from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40',
  },
  {
    key: 'pending',
    labelKey: 'PENDING',
    icon: FiClock,
    colorClass: 'text-yellow-600 dark:text-yellow-400',
    hoverShadow: 'hover:shadow-yellow-500/10',
    iconBg: 'from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/40',
  },
  {
    key: 'rejected',
    labelKey: 'REJECTED',
    icon: FiX,
    colorClass: 'text-red-600 dark:text-red-400',
    hoverShadow: 'hover:shadow-red-500/10',
    iconBg: 'from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40',
  },
];

export function SubmissionStatsCards({ stats, isLoading = false }: SubmissionStatsCardsProps) {
  const t = useTranslations('client.submissions');

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {statCardsConfig.map((config) => {
        const Icon = config.icon;
        const value = stats[config.key];

        return (
          <Card
            key={config.key}
            className={`hover:shadow-lg ${config.hoverShadow} border border-gray-200 dark:border-gray-800 transition-all duration-300 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xs`}
          >
            <CardContent className="p-6">
              <div className="text-center">
                <div className={`flex items-center justify-center w-12 h-12 bg-linear-to-br ${config.iconBg} rounded-xl mb-3 mx-auto`}>
                  <Icon className={`w-6 h-6 ${config.colorClass}`} />
                </div>
                {isLoading ? (
                  <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-1 animate-pulse" />
                ) : (
                  <div className={`text-2xl font-bold ${config.key === 'total' ? 'text-gray-900 dark:text-gray-100' : config.colorClass}`}>
                    {value}
                  </div>
                )}
                <div className="text-sm text-gray-600 dark:text-gray-400">{t(config.labelKey)}</div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Skeleton version for loading state
export function SubmissionStatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card
          key={index}
          className="border border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xs"
        >
          <CardContent className="p-6">
            <div className="text-center animate-pulse">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl mb-3 mx-auto" />
              <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-2" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mx-auto" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
