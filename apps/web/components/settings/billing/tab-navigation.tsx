import { useTranslations } from 'next-intl';

interface BillingTab {
	id: 'overview' | 'payments' | 'subscriptions';
	labelKey: 'OVERVIEW' | 'PAYMENTS' | 'SUBSCRIPTIONS';
}

const billingTabs: BillingTab[] = [
	{ id: 'overview', labelKey: 'OVERVIEW' },
	{ id: 'payments', labelKey: 'PAYMENTS' },
	{ id: 'subscriptions', labelKey: 'SUBSCRIPTIONS' }
];

interface TabNavigationProps {
	activeTab: string;
	onTabChange: (tabId: string) => void;
	paymentsCount?: number;
	subscriptionsCount?: number;
}

/**
 * Underline tab bar matching the client dashboard pattern
 * (`components/dashboard/dashboard-content.tsx`): minimal neutral tabs with an
 * animated active underline and a small neutral count badge.
 */
export function TabNavigation({
	activeTab,
	onTabChange,
	paymentsCount = 0,
	subscriptionsCount = 0
}: TabNavigationProps) {
	const t = useTranslations('billing');

	const countFor = (id: BillingTab['id']) =>
		id === 'payments' ? paymentsCount : id === 'subscriptions' ? subscriptionsCount : undefined;

	return (
		<div
			role="tablist"
			aria-label={t('BILLING_SUBSCRIPTION_TITLE')}
			className="flex items-center gap-1 border-b border-neutral-200 dark:border-white/8 overflow-x-auto"
		>
			{billingTabs.map(({ id, labelKey }) => {
				const isActive = activeTab === id;
				const count = countFor(id);

				return (
					<button
						key={id}
						role="tab"
						id={`billing-tab-${id}`}
						aria-selected={isActive}
						aria-controls={`billing-tabpanel-${id}`}
						onClick={() => onTabChange(id)}
						className={`relative flex items-center gap-2 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors duration-150 ${
							isActive
								? 'text-neutral-900 dark:text-white'
								: 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
						}`}
					>
						<span>{t(labelKey)}</span>
						{count !== undefined && count > 0 && (
							<span
								className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-medium rounded-full ${
									isActive
										? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
										: 'bg-neutral-100 dark:bg-white/8 text-neutral-600 dark:text-neutral-400'
								}`}
							>
								{count}
							</span>
						)}
						{isActive && (
							<span
								className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-white rounded-full"
								aria-hidden="true"
							/>
						)}
					</button>
				);
			})}
		</div>
	);
}
