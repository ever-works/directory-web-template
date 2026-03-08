'use client';
import { useState } from 'react';
import { PaymentCard } from '@/components/settings/billing/payment-card';
import { SubscriptionCard } from '@/components/settings/billing/subscription-card';
import { SubscriptionHistoryCard } from '@/components/settings/billing/subscription-history-card';
import { SubscriptionActions } from '@/components/settings/billing/subscription-actions';
import { Container } from '@/components/ui/container';
import { CreditCard, ChevronRight, Plus, Download, Zap } from 'lucide-react';
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
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useProviderPayment } from '@/hooks/use-provider-payment';
import { PaymentProvider } from '@/lib/constants';

export default function BillingPage() {
	const t = useTranslations('billing');

	// Use the unified provider payment hook
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

	if (!subscription && !loading) {
		return (
			<Container maxWidth="7xl" padding="default">
				<div className="text-center py-16">
					<div className="max-w-md mx-auto">
						<div className="w-24 h-24 bg-gradient-to-br from-theme-primary-100 to-theme-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
							<CreditCard className="w-12 h-12 text-theme-primary-600" />
						</div>
						<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
							{t('WELCOME_TITLE')}
						</h2>
						<p className="text-gray-600 dark:text-gray-300 mb-8">{t('FREE_PLAN_MESSAGE')}</p>
						<div className="space-y-3">
							<button className="w-full bg-linear-to-r from-theme-primary-600 to-theme-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-theme-primary-700 hover:to-theme-primary-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
								<Plus className="w-5 h-5 inline mr-2" />
								{t('UPGRADE_NOW')}
							</button>
							<button className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors">
								{t('VIEW_PLANS')}
							</button>
						</div>
					</div>
				</div>
			</Container>
		);
	}

	// Filter payments based on search
	const filteredPayments = payments.filter(
		(payment) =>
			payment?.plan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment?.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment?.planId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment?.subscriptionId.toLowerCase().includes(searchTerm.toLowerCase())
	);

	// Statistics are now provided by useProviderPayment hook

	return (
		<Container maxWidth="7xl" padding="default">
			{/* Header Section */}

			<div className="mb-8 pb-16">
				<div className="space-y-8 flex justify-between">
					<Link
						href="/client/settings"
						className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
					>
						<FiArrowLeft className="w-4 h-4" />
						{t('BACK_TO_SETTINGS')}
					</Link>
					<div className="flex items-center gap-3">
						{/* Provider indicator */}

						<button
							onClick={refresh}
							disabled={isRefreshing}
							className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 dark:text-slate-100"
						>
							<Zap className="w-4 h-4" />
							{isRefreshing ? t('REFRESHING') : t('REFRESH_ALL')}
						</button>

						<button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-theme-primary-600 rounded-lg hover:bg-theme-primary-700 transition-colors">
							<Download className="w-4 h-4" />
							{t('EXPORT')}
						</button>
					</div>
				</div>
				<div className="flex flex-col items-center justify-center">
					<div className="space-y-4 text-center">
						<h1 className="text-3xl font-bold text-gray-600 dark:text-gray-100 mb-2">
							{t('BILLING_SUBSCRIPTION_TITLE')}
						</h1>
						<p className="text-gray-600 dark:text-gray-400 text-center">
							{t('BILLING_SUBSCRIPTION_SUBTITLE')}
						</p>
					</div>
				</div>
			</div>

			{/* Loading State */}
			{loading && (
				<div className="text-center py-16 dark:bg-slate-800 dark:text-slate-100">
					<div className="inline-flex items-center gap-3 px-6 py-3 bg-theme-primary-50 border border-theme-primary-200 rounded-full">
						<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-theme-primary-600"></div>
						<span className="text-theme-primary-700 font-medium">{t('LOADING_BILLING_INFO')}</span>
					</div>
				</div>
			)}

			{!loading && (
				<div className="mt-10">
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

					{/* Navigation Tabs */}
					<TabNavigation
						activeTab={activeTab}
						paymentsCount={payments.length}
						subscriptionsCount={subscription?.subscriptionHistory?.length || 0}
						onTabChange={(tabId) => setActiveTab(tabId as 'overview' | 'payments' | 'subscriptions')}
					/>

					{/* Tab Content */}
					{activeTab === 'overview' && (
						<div className="space-y-8">
							{/* Current Subscription Section */}
							<div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 shadow-sm">
								<div className="flex items-center justify-between mb-3">
									<h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
										{t('CURRENT_SUBSCRIPTION')}
									</h2>
									<button
										onClick={refreshSubscription}
										disabled={isRefreshingSubscription}
										className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 underline disabled:opacity-50"
									>
										{isRefreshingSubscription ? t('REFRESHING') : t('REFRESH')}
									</button>
								</div>

								{subscription?.hasActiveSubscription && subscription.currentSubscription ? (
									<>
										<SubscriptionCard subscription={subscription.currentSubscription} />

										{/* Subscription Actions */}
										<div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
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
							<div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
								<h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-6">
									{t('RECENT_ACTIVITY')}
								</h2>

								{!hasPaymentHistory ? (
									<OverviewEmptyState />
								) : (
									<div className="space-y-4">
										{payments.slice(0, 3).map((payment) => (
											<div
												key={payment.id}
												className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 transition-colors shadow-sm border border-gray-200 dark:border-slate-700"
											>
												<div className="flex items-center gap-4">
													<div className="w-10 h-10 bg-theme-primary-100 dark:bg-theme-primary-10 rounded-lg flex items-center justify-center">
														<CreditCard className="w-5 h-5 text-theme-primary-600 dark:text-theme-primary-700" />
													</div>
													<div>
														<p className="font-medium text-gray-900 dark:text-slate-100">
															{payment.plan}
														</p>
														<p className="text-sm text-gray-500 dark:text-slate-400">
															{payment.description}
														</p>
														{/* Show payment provider */}
														<div className="flex items-center gap-2 mt-1">
															<span
																className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
																	payment.paymentProvider ===
																	PaymentProvider.LEMONSQUEEZY
																		? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
																		: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
																}`}
															>
																{payment.paymentProvider ===
																PaymentProvider.LEMONSQUEEZY
																	? PaymentProvider.LEMONSQUEEZY
																	: PaymentProvider.STRIPE}
															</span>
														</div>
													</div>
												</div>
												<div className="text-right">
													<p className="font-semibold text-gray-900 dark:text-slate-100">
														${payment.amount.toFixed(2)}
													</p>
													<p className="text-sm text-gray-500 dark:text-slate-400">
														{new Date(payment.date).toLocaleDateString('en-US', {
															month: 'long',
															day: 'numeric',
															year: 'numeric'
														})}
													</p>
												</div>
											</div>
										))}

										{payments.length > 3 && (
											<button className="w-full text-center py-3 text-theme-primary-600 hover:text-theme-primary-700 font-medium transition-colors">
												{t('VIEW_ALL_ACTIVITY')}
												<ChevronRight className="w-4 h-4 inline ml-2" />
											</button>
										)}
									</div>
								)}
							</div>
						</div>
					)}

					{activeTab === 'payments' && (
						<div className="space-y-6">
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
								<div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
									<div className="space-y-4">
										{filteredPayments.map((payment) => (
											<PaymentCard key={payment.id} payment={payment} />
										))}
									</div>
								</div>
							)}
						</div>
					)}

					{activeTab === 'subscriptions' && (
						<div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
							<div className="flex items-center justify-between mb-6">
								<h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
									{t('SUBSCRIPTION_HISTORY')}
								</h2>
								<button
									onClick={refreshSubscription}
									disabled={isRefreshingSubscription}
									className="inline-flex items-center gap-2 px-3 py-2 text-sm text-theme-primary-600 hover:text-theme-primary-700 underline disabled:opacity-50"
								>
									{isRefreshingSubscription ? t('REFRESHING') : t('REFRESH')}
								</button>
							</div>

							{!hasSubscriptionHistory ? (
								<SubscriptionsEmptyState />
							) : (
								<div className="space-y-4">
									{subscription?.subscriptionHistory?.map((sub) => (
										<SubscriptionHistoryCard key={sub.id} subscription={sub} />
									))}
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</Container>
	);
}
