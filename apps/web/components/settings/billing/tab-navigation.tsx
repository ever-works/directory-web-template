import React from 'react';
import { History, BarChart3, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BillingTab {
	id: 'overview' | 'payments' | 'subscriptions';
	label: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	count?: number;
}

const billingTabs: BillingTab[] = [
	{
		id: 'overview',
		label: 'Overview',
		description: 'Billing summary and statistics',
		icon: BarChart3,
		count: undefined
	},
	{
		id: 'payments',
		label: 'Payment History',
		description: 'All your past payments and invoices',
		icon: CreditCard,
		count: undefined
	},
	{
		id: 'subscriptions',
		label: 'Subscription History',
		description: 'Current and past subscriptions',
		icon: History,
		count: undefined
	}
];

interface TabNavigationProps {
	activeTab: string;
	onTabChange: (tabId: string) => void;
	paymentsCount?: number;
	subscriptionsCount?: number;
}

export function TabNavigation({
	activeTab,
	onTabChange,
	paymentsCount = 0,
	subscriptionsCount = 0
}: TabNavigationProps) {
	// Update counts in tabs
	const tabsWithCounts = billingTabs.map((tab) => ({
		...tab,
		count: tab.id === 'payments' ? paymentsCount : tab.id === 'subscriptions' ? subscriptionsCount : undefined
	}));

	return (
		<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-xs my-6">
			{/* Desktop Navigation */}
			<div className="hidden lg:block">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-8">
						{tabsWithCounts.map((tab) => {
							const Icon = tab.icon;
							const isActive = activeTab === tab.id;

							return (
								<button
									key={tab.id}
									onClick={() => onTabChange(tab.id)}
									className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
										isActive
											? 'bg-theme-primary-50 dark:bg-slate-800 text-theme-primary-700 dark:text-theme-primary-500 border-b-2 border-theme-primary-500'
											: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/50'
									}`}
								>
									<div
										className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
											isActive
												? 'bg-theme-primary-100 dark:bg-theme-primary-10'
												: 'bg-slate-100 dark:bg-slate-700/50 group-hover:bg-slate-200 dark:group-hover:bg-slate-600/50'
										}`}
									>
										<Icon
											className={`w-4 h-4 ${
												isActive
													? 'text-theme-primary-600 dark:text-theme-primary-400'
													: 'text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
											}`}
										/>
									</div>

									<div className="text-left">
										<div className="flex items-center gap-2">
											<span className="font-medium">{tab.label}</span>
											{tab.count !== undefined && (
												<span
													className={cn(
														'inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 rounded-full dark:border dark:border-slate-500',
														isActive
															? 'bg-theme-primary-20 dark:bg-theme-primary-10 text-theme-primary-700 dark:text-theme-primary-500 border-b-2 border-theme-primary-500'
															: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/50'
													)}
												>
													{tab.count}
												</span>
											)}
										</div>
										<p className="text-xs text-slate-500 dark:text-slate-400">{tab.description}</p>
									</div>
								</button>
							);
						})}
					</div>

					<div className="text-sm text-slate-500 dark:text-slate-400">
						{tabsWithCounts.find((tab) => tab.id === activeTab)?.description}
					</div>
				</div>
			</div>

			{/* Mobile Navigation */}
			<div className="lg:hidden">
				<ResponsiveTabNavigation activeTab={activeTab} onTabChange={onTabChange} tabs={tabsWithCounts} />
			</div>
		</div>
	);
}

interface ResponsiveTabNavigationProps {
	activeTab: string;
	onTabChange: (tabId: string) => void;
	tabs: BillingTab[];
}

function ResponsiveTabNavigation({ activeTab, onTabChange, tabs }: ResponsiveTabNavigationProps) {
	const activeTabData = tabs.find((tab) => tab.id === activeTab);

	return (
		<div className="space-y-4">
			{/* Tab Grid */}
			<div className="grid grid-cols-3 gap-2">
				{tabs.map((tab) => {
					const Icon = tab.icon;
					const isActive = activeTab === tab.id;

					return (
						<button
							key={tab.id}
							onClick={() => onTabChange(tab.id)}
							className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 ${
								isActive
									? 'bg-theme-primary-50 dark:bg-theme-primary-900/20 border-2 border-theme-primary-200 dark:border-theme-primary-700/50'
									: 'bg-slate-50 dark:bg-slate-700/50 border-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-600/50'
							}`}
						>
							<div
								className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
									isActive
										? 'bg-theme-primary-100 dark:bg-theme-primary-800/50'
										: 'bg-white dark:bg-slate-600/50'
								}`}
							>
								<Icon
									className={`w-5 h-5 ${
										isActive
											? 'text-theme-primary-600 dark:text-theme-primary-400'
											: 'text-slate-500 dark:text-slate-400'
									}`}
								/>
							</div>

							<div className="text-center">
								<div className="flex items-center justify-center gap-1">
									<span
										className={`text-sm font-medium ${
											isActive
												? 'text-theme-primary-700 dark:text-theme-primary-300'
												: 'text-slate-700 dark:text-slate-300'
										}`}
									>
										{tab.label}
									</span>
									{tab.count !== undefined && (
										<span className="inline-flex items-center justify-center w-4 h-4 text-xs font-medium bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-400 rounded-full">
											{tab.count}
										</span>
									)}
								</div>
							</div>
						</button>
					);
				})}
			</div>

			{/* Active Tab Description */}
			{activeTabData && (
				<div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600/50">
					<div className="flex items-center gap-3 mb-2">
						<div className="w-8 h-8 bg-theme-primary-100 dark:bg-theme-primary-800/50 rounded-lg flex items-center justify-center">
							<activeTabData.icon className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />
						</div>
						<h3 className="font-medium text-slate-900 dark:text-slate-100">{activeTabData.label}</h3>
					</div>
					<p className="text-sm text-slate-600 dark:text-slate-400">{activeTabData.description}</p>
				</div>
			)}
		</div>
	);
}
