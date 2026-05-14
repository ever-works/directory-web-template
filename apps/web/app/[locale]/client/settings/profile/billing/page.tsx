'use client';
import { useState } from 'react';
import { PaymentCard } from '@/components/settings/billing/payment-card';
import { SubscriptionCard } from '@/components/settings/billing/subscription-card';
import { SubscriptionHistoryCard } from '@/components/settings/billing/subscription-history-card';
import { SubscriptionActions } from '@/components/settings/billing/subscription-actions';
import { Container } from '@/components/ui/container';
import { CreditCard, ChevronRight, Plus, Download, RefreshCw } from 'lucide-react';
import { BillingStats } from '@/components/settings/billing/billing-stats';
import { TabNavigation } from '@/components/settings/billing/tab-navigation';
import { SearchAndFilters } from '@/components/settings/billing/search-and-filters';
import {
	SubscriptionEmptyState,
	PaymentsEmptyState,
	SubscriptionsEmptyState,
	OverviewEmptyState
} from '@/components/settings/billing/empty-state';
import { FiArrowLeft } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useProviderPayment } from '@/hooks/use-provider-payment';
import { PaymentProvider } from '@/lib/constants';

export default function BillingPage() {
	const t = useTranslations('billing');

	const {
		subscription,
		payments,
		loading,
		refresh,
		refreshSubscription,
		refreshPayments,
		isRefreshing,
		isRefreshingSubscription,
		isRefreshingPayments,
		totalSpent,
		activePayments,
		monthlyAverage,
		totalPayments,
		hasPaymentHistory,
		hasSubscriptionHistory
	} = useProviderPayment();

	const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'subscriptions'>('overview');
	const [searchTerm, setSearchTerm] = useState('');

	const filteredPayments = payments.filter(
		(payment) =>
			payment?.plan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment?.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment?.planId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment?.subscriptionId.toLowerCase().includes(searchTerm.toLowerCase())
	);

	if (!subscription && !loading) {
		return (
			<div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a]">
				<Container maxWidth="7xl" padding="default" useGlobalWidth>
					<div className="py-8">
						<div className="mb-6">
							<Link
								href="/client/settings"
								className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
							>
								<FiArrowLeft className="w-3.5 h-3.5" />
								{t('BACK_TO_SETTINGS')}
							</Link>
						</div>

						<div className="flex flex-col items-center justify-center py-16">
							<div className="max-w-sm text-center space-y-6">
								<div className="w-16 h-16 bg-theme-primary-100 dark:bg-theme-primary-900/30 rounded-2xl flex items-center justify-center mx-auto">
									<CreditCard className="w-8 h-8 text-theme-primary-600 dark:text-theme-primary-400" />
								</div>
								<div>
									<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
										{t('WELCOME_TITLE')}
									</h2>
									<p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
										{t('FREE_PLAN_MESSAGE')}
									</p>
								</div>
								<div className="space-y-2.5">
									<Link
										href="/pricing"
										className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-theme-primary-600 hover:bg-theme-primary-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
									>
										<Plus className="w-4 h-4" />
										{t('UPGRADE_NOW')}
									</Link>
									<Link
										href="/pricing"
										className="w-full flex items-center justify-center px-5 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-white/8 transition-colors"
									>
										{t('VIEW_PLANS')}
									</Link>
								</div>
							</div>
						</div>
					</div>
				</Container>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a]">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="py-8 space-y-6">
					{/* Header */}
					<div className="flex items-center justify-between">
						<Link
							href="/client/settings"
							className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
						>
							<FiArrowLeft className="w-3.5 h-3.5" />
							{t('BACK_TO_SETTINGS')}
						</Link>
						<div className="flex items-center gap-2">
							<button
								onClick={refresh}
								disabled={isRefreshing}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-lg hover:bg-gray-50 dark:hover:bg-white/8 transition-colors disabled:opacity-50"
							>
								<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
								{isRefreshing ? t('REFRESHING') : t('REFRESH_ALL')}
							</button>
							<button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-theme-primary-600 hover:bg-theme-primary-700 rounded-lg transition-colors">
								<Download className="w-3.5 h-3.5" />
								{t('EXPORT')}
							</button>
						</div>
					</div>

					{/* Page title */}
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 bg-theme-primary-100 dark:bg-theme-primary-900/40 rounded-xl flex items-center justify-center">
							<CreditCard className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />
						</div>
						<div>
							<h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
								{t('BILLING_SUBSCRIPTION_TITLE')}
							</h1>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
								{t('BILLING_SUBSCRIPTION_SUBTITLE')}
							</p>
						</div>
					</div>

					{/* Loading state */}
					{loading && (
						<div className="flex items-center justify-center py-12">
							<div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8 rounded-full shadow-sm">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-theme-primary-600" />
								<span className="text-sm text-gray-600 dark:text-gray-400">{t('LOADING_BILLING_INFO')}</span>
							</div>
						</div>
					)}

					{!loading && (
						<div className="space-y-4">
							<BillingStats
								totalSpent={totalSpent}
								activePayments={activePayments}
								monthlyAverage={monthlyAverage}
								hasActiveSubscription={subscription?.hasActiveSubscription || false}
								totalPayments={totalPayments}
								currency={subscription?.currentSubscription?.currency || 'USD'}
								planName={subscription?.currentSubscription?.planName || 'Basic Plan'}
								currentPeriodEnd={subscription?.currentSubscription?.currentPeriodEnd || ''}
							/>

							<TabNavigation
								activeTab={activeTab}
								paymentsCount={payments.length}
								subscriptionsCount={subscription?.subscriptionHistory?.length || 0}
								onTabChange={(tabId) => setActiveTab(tabId as 'overview' | 'payments' | 'subscriptions')}
							/>

							{activeTab === 'overview' && (
								<div className="space-y-4">
									{/* Current Subscription */}
									<div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/6 rounded-xl p-4 shadow-sm">
										<div className="flex items-center justify-between mb-4">
											<h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
												{t('CURRENT_SUBSCRIPTION')}
											</h2>
											<button
												onClick={refreshSubscription}
												disabled={isRefreshingSubscription}
												className="inline-flex items-center gap-1 text-xs text-theme-primary-600 dark:text-theme-primary-400 hover:underline disabled:opacity-50"
											>
												<RefreshCw className={`w-3 h-3 ${isRefreshingSubscription ? 'animate-spin' : ''}`} />
												{isRefreshingSubscription ? t('REFRESHING') : t('REFRESH')}
											</button>
										</div>

										{subscription?.hasActiveSubscription && subscription.currentSubscription ? (
											<>
												<SubscriptionCard subscription={subscription.currentSubscription} />
												<div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
													<SubscriptionActions
														subscriptionId={subscription.currentSubscription.subscriptionId}
														status={subscription.currentSubscription.status}
														planName={subscription.currentSubscription.planName}
														onActionComplete={refreshSubscription}
													/>
												</div>
											</>
										) : (
											<SubscriptionEmptyState />
										)}
									</div>

									{/* Recent Activity */}
									<div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/6 rounded-xl p-4 shadow-sm">
										<h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
											{t('RECENT_ACTIVITY')}
										</h2>

										{!hasPaymentHistory ? (
											<OverviewEmptyState />
										) : (
											<div className="space-y-2">
												{payments.slice(0, 3).map((payment) => (
													<div
														key={payment.id}
														className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
													>
														<div className="flex items-center gap-3">
															<div className="w-8 h-8 bg-theme-primary-100 dark:bg-theme-primary-900/30 rounded-lg flex items-center justify-center">
																<CreditCard className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />
															</div>
															<div>
																<p className="text-sm font-medium text-gray-900 dark:text-gray-100">
																	{payment.plan}
																</p>
																<div className="flex items-center gap-2 mt-0.5">
																	<p className="text-xs text-gray-500 dark:text-gray-400">
																		{payment.description}
																	</p>
																	<span
																		className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
																			payment.paymentProvider === PaymentProvider.LEMONSQUEEZY
																				? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300'
																				: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
																		}`}
																	>
																		{payment.paymentProvider === PaymentProvider.LEMONSQUEEZY
																			? PaymentProvider.LEMONSQUEEZY
																			: PaymentProvider.STRIPE}
																	</span>
																</div>
															</div>
														</div>
														<div className="text-right shrink-0">
															<p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
																${payment.amount.toFixed(2)}
															</p>
															<p className="text-xs text-gray-500 dark:text-gray-400">
																{new Date(payment.date).toLocaleDateString('en-US', {
																	month: 'short',
																	day: 'numeric',
																	year: 'numeric'
																})}
															</p>
														</div>
													</div>
												))}

												{payments.length > 3 && (
													<button
														className="w-full flex items-center justify-center gap-1 py-2 text-xs text-theme-primary-600 dark:text-theme-primary-400 hover:text-theme-primary-700 dark:hover:text-theme-primary-300 font-medium transition-colors"
														onClick={() => setActiveTab('payments')}
													>
														{t('VIEW_ALL_ACTIVITY')}
														<ChevronRight className="w-3.5 h-3.5" />
													</button>
												)}
											</div>
										)}
									</div>
								</div>
							)}

							{activeTab === 'payments' && (
								<div className="space-y-4">
									<SearchAndFilters
										searchTerm={searchTerm}
										onSearchChange={setSearchTerm}
										onRefresh={refreshPayments}
										isRefreshing={isRefreshingPayments}
										totalResults={filteredPayments.length}
									/>
									{filteredPayments.length === 0 ? (
										<PaymentsEmptyState />
									) : (
										<div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/6 rounded-xl p-4 shadow-sm">
											<div className="space-y-3">
												{filteredPayments.map((payment) => (
													<PaymentCard key={payment.id} payment={payment} />
												))}
											</div>
										</div>
									)}
								</div>
							)}

							{activeTab === 'subscriptions' && (
								<div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/6 rounded-xl p-4 shadow-sm">
									<div className="flex items-center justify-between mb-4">
										<h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
											{t('SUBSCRIPTION_HISTORY')}
										</h2>
										<button
											onClick={refreshSubscription}
											disabled={isRefreshingSubscription}
											className="inline-flex items-center gap-1 text-xs text-theme-primary-600 dark:text-theme-primary-400 hover:underline disabled:opacity-50"
										>
											<RefreshCw className={`w-3 h-3 ${isRefreshingSubscription ? 'animate-spin' : ''}`} />
											{isRefreshingSubscription ? t('REFRESHING') : t('REFRESH')}
										</button>
									</div>

									{!hasSubscriptionHistory ? (
										<SubscriptionsEmptyState />
									) : (
										<div className="space-y-3">
											{subscription?.subscriptionHistory?.map((sub) => (
												<SubscriptionHistoryCard key={sub.id} subscription={sub} />
											))}
										</div>
									)}
								</div>
							)}
						</div>
					)}
				</div>
			</Container>
		</div>
	);
}
