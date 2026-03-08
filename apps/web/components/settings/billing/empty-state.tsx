import { BarChart3, FileText, Zap, CreditCard, Calendar, AlertCircle, Plus } from 'lucide-react';

interface EmptyStateConfig {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  actionIcon?: React.ComponentType<{ className?: string }>;
  onAction?: () => void;
  additionalHelp?: {
    title: string;
    items: string[];
  };
}

const getEmptyStateConfig = (type: string): EmptyStateConfig => {
  switch (type) {
    case 'subscription':
      return {
        icon: CreditCard,
        title: 'No Active Subscription',
        description: 'You don\'t have any active subscriptions at the moment. Upgrade to a premium plan to unlock all features.',
        actionLabel: 'View Plans',
        actionIcon: Plus,
        additionalHelp: {
          title: 'Why upgrade?',
          items: [
            'Access to premium features',
            'Priority customer support',
            'Advanced analytics and insights',
            'Unlimited storage and bandwidth'
          ]
        }
      };
    
    case 'payments':
      return {
        icon: FileText,
        title: 'No Payment History',
        description: 'Your payment history will appear here once you make your first payment.',
        actionLabel: 'Make Payment',
        actionIcon: CreditCard,
        additionalHelp: {
          title: 'Payment methods accepted:',
          items: [
            'Credit and debit cards',
            'PayPal and digital wallets',
            'Bank transfers (for annual plans)',
            'Secure payment processing'
          ]
        }
      };
    
    case 'subscriptions':
      return {
        icon: Calendar,
        title: 'No Subscription History',
        description: 'Your subscription history will be displayed here once you subscribe to a plan.',
        actionLabel: 'Browse Plans',
        actionIcon: BarChart3,
        additionalHelp: {
          title: 'Available plans:',
          items: [
            'Free tier with basic features',
            'Pro plan for professionals',
            'Enterprise plan for teams',
            'Custom plans for large organizations'
          ]
        }
      };
    
    case 'overview':
      return {
        icon: BarChart3,
        title: 'No Billing Data Available',
        description: 'Your billing overview will be populated once you have payment or subscription activity.',
        actionLabel: 'Get Started',
        actionIcon: Zap,
        additionalHelp: {
          title: 'Getting started:',
          items: [
            'Choose a plan that fits your needs',
            'Complete your first payment',
            'Set up your billing preferences',
            'Monitor your usage and costs'
          ]
        }
      };
    
    default:
      return {
        icon: AlertCircle,
        title: 'No Data Available',
        description: 'There\'s no data to display at the moment.',
        additionalHelp: {
          title: 'What you can do:',
          items: [
            'Check your filters and search terms',
            'Try refreshing the page',
            'Contact support if the issue persists'
          ]
        }
      };
  }
};

interface EmptyStateProps {
  type: 'subscription' | 'payments' | 'subscriptions' | 'overview' | 'default';
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ type, onAction, className = '' }: EmptyStateProps) {
  const config = getEmptyStateConfig(type);
  const Icon = config.icon;
  const ActionIcon = config.actionIcon;

  return (
    <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 shadow-xs text-center ${className}`}>
      {/* Main Icon */}
      <div className="w-20 h-20 mx-auto mb-6 bg-linear-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center">
        <Icon className="w-10 h-10 text-slate-600 dark:text-slate-400" />
      </div>

      {/* Title and Description */}
      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
        {config.title}
      </h3>
      <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-md mx-auto">
        {config.description}
      </p>

      {/* Action Button */}
      {config.actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-theme-primary-600 to-theme-primary-700 text-white font-medium rounded-lg hover:from-theme-primary-700 hover:to-theme-primary-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 mb-8"
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          {config.actionLabel}
        </button>
      )}

      {/* Additional Help Section */}
      {config.additionalHelp && (
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6 border border-slate-200 dark:border-slate-600/50">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
            {config.additionalHelp.title}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {config.additionalHelp.items.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <div className="w-1.5 h-1.5 bg-theme-primary-500 rounded-full"></div>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Specialized wrapper components
export function SubscriptionEmptyState({ onAction, className }: { onAction?: () => void; className?: string }) {
  return <EmptyState type="subscription" onAction={onAction} className={className} />;
}

export function PaymentsEmptyState({ onAction, className }: { onAction?: () => void; className?: string }) {
  return <EmptyState type="payments" onAction={onAction} className={className} />;
}

export function SubscriptionsEmptyState({ onAction, className }: { onAction?: () => void; className?: string }) {
  return <EmptyState type="subscriptions" onAction={onAction} className={className} />;
}

export function OverviewEmptyState({ onAction, className }: { onAction?: () => void; className?: string }) {
  return <EmptyState type="overview" onAction={onAction} className={className} />;
}

// Enhanced empty state with multiple actions
interface EnhancedEmptyStateProps {
  type: 'subscription' | 'payments' | 'subscriptions' | 'overview' | 'default';
  actions?: Array<{
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  quickTips?: string[];
  className?: string;
}

export function EnhancedEmptyState({ type, actions, quickTips, className = '' }: EnhancedEmptyStateProps) {
  const config = getEmptyStateConfig(type);
  const Icon = config.icon;

  return (
    <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 shadow-xs ${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-linear-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center">
          <Icon className="w-8 h-8 text-slate-600 dark:text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {config.title}
        </h3>
        <p className="text-slate-600 dark:text-slate-300">
          {config.description}
        </p>
      </div>

      {/* Action Buttons */}
      {actions && actions.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          {actions.map((action, index) => {
            const ActionIcon = action.icon;
            const isPrimary = action.variant === 'primary' || index === 0;
            
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-all duration-200 ${
                  isPrimary
                    ? 'bg-linear-to-r from-theme-primary-600 to-theme-primary-700 text-white hover:from-theme-primary-700 hover:to-theme-primary-800 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                    : 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600/50 border border-slate-200 dark:border-slate-600/50'
                }`}
              >
                <ActionIcon className="w-4 h-4" />
                {action.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Quick Tips */}
      {quickTips && quickTips.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600/50">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-theme-primary-500" />
            Quick Tips
          </h4>
          <div className="space-y-2">
            {quickTips.map((tip, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="w-1.5 h-1.5 bg-theme-primary-500 rounded-full mt-2 shrink-0"></div>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Help */}
      {config.additionalHelp && (
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            {config.additionalHelp.title}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {config.additionalHelp.items.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <div className="w-1.5 h-1.5 bg-theme-primary-500 rounded-full"></div>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
