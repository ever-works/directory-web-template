import { LucideIcon, Database, Activity, FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const VARIANT_CONFIG = {
  default: {
    card: 'border-gray-100 dark:border-white/6 bg-gray-50/40 dark:bg-white/2',
    iconWrap: 'bg-gray-100 dark:bg-white/8',
    iconColor: 'text-gray-400 dark:text-gray-500',
    title: 'text-gray-800 dark:text-gray-200',
    description: 'text-gray-500 dark:text-gray-400',
    button: 'bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 shadow-sm',
  },
  info: {
    card: 'border-blue-100/60 dark:border-blue-800/30 bg-blue-50/30 dark:bg-blue-500/5',
    iconWrap: 'bg-blue-100 dark:bg-blue-500/15',
    iconColor: 'text-blue-500 dark:text-blue-400',
    title: 'text-blue-900 dark:text-blue-100',
    description: 'text-blue-600/80 dark:text-blue-300/80',
    button: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200 dark:shadow-none',
  },
  warning: {
    card: 'border-amber-100/60 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-500/5',
    iconWrap: 'bg-amber-100 dark:bg-amber-500/15',
    iconColor: 'text-amber-500 dark:text-amber-400',
    title: 'text-amber-900 dark:text-amber-100',
    description: 'text-amber-600/80 dark:text-amber-300/80',
    button: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200 dark:shadow-none',
  },
} as const;

export interface AdminEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'info' | 'warning';
  className?: string;
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default',
  className = '',
}: AdminEmptyStateProps) {
  const cfg = VARIANT_CONFIG[variant];

  return (
    <Card className={cn(cfg.card, className)}>
      <CardContent className="flex flex-col items-center text-center px-6 py-10">
        {/* Icon */}
        <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mb-4', cfg.iconWrap)}>
          <Icon aria-hidden="true" focusable="false" className={cn('h-6 w-6', cfg.iconColor)} />
        </div>

        {/* Text */}
        <h3 className={cn('text-sm font-semibold mb-1.5', cfg.title)}>{title}</h3>
        <p className={cn('text-sm leading-relaxed max-w-xs', cfg.description)}>{description}</p>

        {/* Action */}
        {actionLabel && onAction && (
          <Button
            onClick={onAction}
            size="sm"
            className={cn('mt-5 text-xs font-semibold rounded-xl px-4 h-8 transition-all duration-200', cfg.button)}
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Pre-configured variants
export function AdminNoDataEmptyState({
  title = 'No Data Available',
  description = "There's no data to display at the moment.",
  actionLabel,
  onAction,
  variant = 'info',
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'info' | 'warning';
}) {
  return (
    <AdminEmptyState
      icon={Database}
      title={title}
      description={description}
      actionLabel={actionLabel}
      onAction={onAction}
      variant={variant}
    />
  );
}

export function AdminNoActivityEmptyState({
  actionLabel = 'Refresh Data',
  onAction,
}: {
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <AdminEmptyState
      icon={Activity}
      title="No Recent Activity"
      description="There hasn't been any activity recently. Check back later or refresh to see the latest updates."
      actionLabel={actionLabel}
      onAction={onAction}
      variant="info"
    />
  );
}

export function AdminNoSubmissionsEmptyState({
  actionLabel = 'View All Submissions',
  onAction,
}: {
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <AdminEmptyState
      icon={FileText}
      title="No Submissions"
      description="There are no submissions to review. All items have been processed."
      actionLabel={actionLabel}
      onAction={onAction}
      variant="default"
    />
  );
}

export function AdminNoUsersEmptyState({
  actionLabel = 'Invite Users',
  onAction,
}: {
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <AdminEmptyState
      icon={Users}
      title="No Users Found"
      description="There are no users registered yet. Start by inviting team members."
      actionLabel={actionLabel}
      onAction={onAction}
      variant="warning"
    />
  );
}
