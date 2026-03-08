import { LucideIcon, Database, Activity, FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Design system constants
const VARIANT_STYLES = {
  default: {
    card: 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50',
    icon: 'text-gray-400 dark:text-gray-500',
    title: 'text-gray-900 dark:text-gray-100',
    description: 'text-gray-600 dark:text-gray-400',
    button: 'bg-gray-600 hover:bg-gray-700 text-white'
  },
  info: {
    card: 'border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/20',
    icon: 'text-blue-400 dark:text-blue-500',
    title: 'text-blue-900 dark:text-blue-100',
    description: 'text-blue-700 dark:text-blue-300',
    button: 'bg-blue-600 hover:bg-blue-700 text-white'
  },
  warning: {
    card: 'border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/20',
    icon: 'text-amber-400 dark:text-amber-500',
    title: 'text-amber-900 dark:text-amber-100',
    description: 'text-amber-700 dark:text-amber-300',
    button: 'bg-amber-600 hover:bg-amber-700 text-white'
  }
} as const;

const ICON_CONTAINER_STYLES = "flex justify-center mb-4";
const ICON_STYLES = "h-16 w-16";
const TITLE_STYLES = "text-lg font-semibold";
const DESCRIPTION_STYLES = "text-sm mb-6";

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
  className = ''
}: AdminEmptyStateProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <Card className={`${styles.card} ${className}`}>
      <CardHeader className="text-center">
        <div className={ICON_CONTAINER_STYLES}>
          <Icon aria-hidden="true" focusable="false" className={`${ICON_STYLES} ${styles.icon}`} />
        </div>
        <CardTitle className={`${TITLE_STYLES} ${styles.title}`}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className={`${DESCRIPTION_STYLES} ${styles.description}`}>
          {description}
        </p>
        {actionLabel && onAction && (
          <Button
            onClick={onAction}
            className={styles.button}
            size="sm"
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}



// Pre-configured empty states for common scenarios
export function AdminNoDataEmptyState({
  title = "No Data Available",
  description = "There's no data to display at the moment.",
  actionLabel,
  onAction,
  variant = 'info'
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
  actionLabel = "Refresh Data",
  onAction
}: {
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <AdminEmptyState
      icon={Activity}
      title="No Recent Activity"
      description="There hasn't been any activity in the system recently. Check back later or refresh to see the latest updates."
      actionLabel={actionLabel}
      onAction={onAction}
      variant="info"
    />
  );
}

export function AdminNoSubmissionsEmptyState({
  actionLabel = "View All Submissions",
  onAction
}: {
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <AdminEmptyState
      icon={FileText}
      title="No Submissions"
      description="There are no submissions to review at the moment. All items have been processed."
      actionLabel={actionLabel}
      onAction={onAction}
      variant="default"
    />
  );
}

export function AdminNoUsersEmptyState({
  actionLabel = "Invite Users",
  onAction
}: {
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <AdminEmptyState
      icon={Users}
      title="No Users Found"
      description="There are no users registered in the system yet. Start by inviting team members."
      actionLabel={actionLabel}
      onAction={onAction}
      variant="warning"
    />
  );
}
