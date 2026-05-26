import { BarChart3, FileText, Zap, CreditCard, Calendar, AlertCircle, Plus } from 'lucide-react';

interface EmptyStateConfig {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	description: string;
	actionLabel?: string;
	actionIcon?: React.ComponentType<{ className?: string }>;
	onAction?: () => void;
	helpItems?: string[];
}

const getConfig = (type: string): EmptyStateConfig => {
	switch (type) {
		case 'subscription':
			return {
				icon: CreditCard,
				title: 'No Active Subscription',
				description: "You don't have an active subscription. Upgrade to unlock all features.",
				actionLabel: 'View Plans',
				actionIcon: Plus,
				helpItems: [
					'Access to premium features',
					'Priority customer support',
					'Advanced analytics',
					'Unlimited storage'
				]
			};
		case 'payments':
			return {
				icon: FileText,
				title: 'No Payment History',
				description: 'Your payment history will appear here once you make your first payment.',
				actionLabel: 'Make Payment',
				actionIcon: CreditCard,
				helpItems: [
					'Credit and debit cards',
					'PayPal and digital wallets',
					'Bank transfers (annual plans)',
					'Secure payment processing'
				]
			};
		case 'subscriptions':
			return {
				icon: Calendar,
				title: 'No Subscription History',
				description: 'Your subscription history will appear here once you subscribe to a plan.',
				actionLabel: 'Browse Plans',
				actionIcon: BarChart3,
				helpItems: ['Free tier with basic features', 'Pro plan for professionals', 'Enterprise plan for teams', 'Custom plans available']
			};
		case 'overview':
			return {
				icon: BarChart3,
				title: 'No Billing Data',
				description: 'Your billing overview will be populated once you have payment activity.',
				actionLabel: 'Get Started',
				actionIcon: Zap,
				helpItems: ['Choose a plan that fits your needs', 'Complete your first payment', 'Set up billing preferences', 'Monitor usage and costs']
			};
		default:
			return {
				icon: AlertCircle,
				title: 'No Data Available',
				description: "There's no data to display at the moment.",
				helpItems: ['Check your filters and search terms', 'Try refreshing the page', 'Contact support if the issue persists']
			};
	}
};

interface EmptyStateProps {
	type: 'subscription' | 'payments' | 'subscriptions' | 'overview' | 'default';
	onAction?: () => void;
	className?: string;
}

export function EmptyState({ type, onAction, className = '' }: EmptyStateProps) {
	const config = getConfig(type);
	const Icon = config.icon;
	const ActionIcon = config.actionIcon;

	return (
		<div className={`text-center py-8 ${className}`}>
			{/* Icon */}
			<div className="w-12 h-12 mx-auto mb-4 bg-neutral-100 dark:bg-white/8 rounded-xl flex items-center justify-center">
				<Icon className="w-6 h-6 text-neutral-500 dark:text-neutral-400" />
			</div>

			{/* Text */}
			<p className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">{config.title}</p>
			<p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto mb-5">{config.description}</p>

			{/* Action */}
			{config.actionLabel && onAction && (
				<button
					onClick={onAction}
					className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 transition-colors mb-5"
				>
					{ActionIcon && <ActionIcon className="h-3.5 w-3.5" />}
					{config.actionLabel}
				</button>
			)}

			{/* Help list */}
			{config.helpItems && (
				<div className="bg-neutral-50 dark:bg-white/4 rounded-lg p-4 border border-neutral-100 dark:border-white/[0.06] text-left max-w-sm mx-auto">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{config.helpItems.map((item, i) => (
							<div key={i} className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
								<span className="w-1 h-1 bg-neutral-400 dark:bg-neutral-500 rounded-full shrink-0" />
								{item}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

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
	const config = getConfig(type);
	const Icon = config.icon;

	return (
		<div className={`text-center py-8 ${className}`}>
			<div className="w-12 h-12 mx-auto mb-4 bg-neutral-100 dark:bg-white/8 rounded-xl flex items-center justify-center">
				<Icon className="w-6 h-6 text-neutral-500 dark:text-neutral-400" />
			</div>
			<p className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">{config.title}</p>
			<p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto mb-5">{config.description}</p>

			{actions && actions.length > 0 && (
				<div className="flex flex-wrap gap-2 justify-center mb-5">
					{actions.map((action, i) => {
						const ActionIcon = action.icon;
						const isPrimary = action.variant === 'primary' || i === 0;
						return (
							<button
								key={i}
								onClick={action.onClick}
								className={`inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md transition-colors ${
									isPrimary
										? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100'
										: 'border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/6'
								}`}
							>
								<ActionIcon className="h-3.5 w-3.5" />
								{action.label}
							</button>
						);
					})}
				</div>
			)}

			{quickTips && quickTips.length > 0 && (
				<div className="bg-neutral-50 dark:bg-white/4 rounded-lg p-4 border border-neutral-100 dark:border-white/[0.06] text-left max-w-sm mx-auto mb-4">
					<div className="flex items-center gap-1.5 mb-2">
						<Zap className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
						<p className="text-xs font-semibold text-neutral-900 dark:text-white">Quick Tips</p>
					</div>
					<div className="space-y-1.5">
						{quickTips.map((tip, i) => (
							<div key={i} className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-400">
								<span className="w-1 h-1 bg-neutral-400 dark:bg-neutral-500 rounded-full mt-1.5 shrink-0" />
								{tip}
							</div>
						))}
					</div>
				</div>
			)}

			{config.helpItems && (
				<div className="bg-neutral-50 dark:bg-white/4 rounded-lg p-4 border border-neutral-100 dark:border-white/[0.06] text-left max-w-sm mx-auto">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{config.helpItems.map((item, i) => (
							<div key={i} className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
								<span className="w-1 h-1 bg-neutral-400 dark:bg-neutral-500 rounded-full shrink-0" />
								{item}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
