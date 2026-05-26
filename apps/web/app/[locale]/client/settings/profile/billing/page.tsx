'use client';
import { useState } from 'react';
import { PaymentCard } from '@/components/settings/billing/payment-card';
import { SubscriptionCard } from '@/components/settings/billing/subscription-card';
import { SubscriptionHistoryCard } from '@/components/settings/billing/subscription-history-card';
import { SubscriptionActions } from '@/components/settings/billing/subscription-actions';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { CreditCard, ChevronRight, Plus, Download, RefreshCw, Crown, Zap } from 'lucide-react';
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
import { exportPaymentsCsv } from '@/lib/utils/billing-csv';

// ─── Dashboard design-system tokens ─────────────────────────────────────────
// Mirrors `components/dashboard/styles.ts` so this page matches the rest of
// the client area (blocks, buttons, icons): neutral palette, white/3 dark
// card surface, monochrome icon tiles, neutral-900 / white primary CTA.

const CARD = 'bg-white dark:bg-white/3 rounded-xl p-5 border border-neutral-200 dark:border-white/8';
const SECTION_TITLE = 'text-sm font-semibold text-neutral-900 dark:text-white';
const ICON_TILE = 'p-2 bg-neutral-100 dark:bg-white/8 rounded-lg flex items-center justify-center shrink-0';
const ICON = 'h-4 w-4 text-neutral-500 dark:text-neutral-400';
const PRIMARY_CTA =
	'inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 transition-colors';
const OUTLINE_BTN =
	'flex items-center gap-1.5 h-8 px-3 text-xs border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/6';
const LINK_BTN =
	'inline-flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors disabled:opacity-50';

// ─── Days Remaining Bar ────────────────────────────────────────────────────

function DaysRemainingBar({ endDate }: { endDate: string }) {
	const t = useTranslations('billing');
	const end = new Date(endDate);
	const now = new Date();
	const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
	const totalDays = 30;
	const pct = Math.min(100, (daysLeft / totalDays) * 100);
	const isUrgent = daysLeft <= 7;
	const isMedium = daysLeft <= 14;

	return (
		<div className="space-y-1 min-w-[100px]">
			<div className="flex justify-between text-[10px] text-neutral-500 dark:text-neutral-400">
				<span>{t('DAYS_LEFT', { days: daysLeft })}</span>
				<span>{t('DAYS_TOTAL', { days: totalDays })}</span>
			</div>
			<div className="w-full h-1.5 bg-neutral-100 dark:bg-white/8 rounded-full overflow-hidden">
				<div
					className={`h-full rounded-full transition-all duration-500 ${
						isUrgent ? 'bg-red-500' : isMedium ? 'bg-amber-500' : 'bg-emerald-500'
					}`}
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}

// ─── Current Plan Card ─────────────────────────────────────────────────────

interface PlanCardProps {
	planName: string;
	hasActiveSubscription: boolean;
	currentPeriodEnd?: string;
	onUpgrade: () => void;
}

function PlanCard({ planName, hasActiveSubscription, currentPeriodEnd, onUpgrade }: PlanCardProps) {
	const t = useTranslations('billing');
	return (
		<div className={CARD}>
			<div className="flex items-center justify-between gap-4 flex-wrap">
				<div className="flex items-center gap-3">
					<div className={ICON_TILE}>
						{hasActiveSubscription ? <Crown className={ICON} /> : <Zap className={ICON} />}
					</div>
					<div>
						<div className="flex items-center gap-2">
							<span className="text-sm font-semibold text-neutral-900 dark:text-white">
								{planName}
							</span>
							<span
								className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
									hasActiveSubscription
										? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
										: 'bg-neutral-100 text-neutral-500 dark:bg-white/8 dark:text-neutral-400'
								}`}
							>
								{hasActiveSubscription ? t('ACTIVE') : t('FREE')}
							</span>
						</div>
						{currentPeriodEnd && hasActiveSubscription && (
							<p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
								{t('RENEWS_ON', {
									date: new Date(currentPeriodEnd).toLocaleDateString('en-US', {
										month: 'short',
										day: 'numeric',
										year: 'numeric'
									})
								})}
							</p>
						)}
						{!hasActiveSubscription && (
							<p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
								{t('UPGRADE_UNLOCK_FEATURES')}
							</p>
						)}
					</div>
				</div>

				<div className="flex items-center gap-4">
					{currentPeriodEnd && hasActiveSubscription && (
						<DaysRemainingBar endDate={currentPeriodEnd} />
					)}
					{!hasActiveSubscription && (
						<button onClick={onUpgrade} className={PRIMARY_CTA}>
							{t('UPGRADE')}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── Page ──────────────────────────────────────────────────────────────────

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
		hasSubscriptionHistory,
	} = useProviderPayment();

	const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'subscriptions'>('overview');
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilters, setStatusFilters] = useState<string[]>([]);

	const filteredPayments = payments.filter((payment) => {
		const term = searchTerm.toLowerCase();
		const matchesSearch =
			!term ||
			payment?.plan?.toLowerCase().includes(term) ||
			payment?.description?.toLowerCase().includes(term) ||
			payment?.status?.toLowerCase().includes(term) ||
			payment?.planId?.toLowerCase().includes(term) ||
			payment?.subscriptionId.toLowerCase().includes(term);
		const matchesStatus =
			statusFilters.length === 0 || statusFilters.includes((payment?.status || '').toLowerCase());
		return matchesSearch && matchesStatus;
	});

	if (!subscription && !loading) {
		return (
			<div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a]">
				<Container maxWidth="7xl" padding="default" useGlobalWidth>
					<div className="py-6">
						<div className="mb-6">
							<Link
								href="/client/settings"
								className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
							>
								<FiArrowLeft className="w-3.5 h-3.5" />
								{t('BACK_TO_SETTINGS')}
							</Link>
						</div>

						<div className="flex flex-col items-center justify-center py-16">
							<div className="max-w-sm text-center space-y-6">
								<div className="w-16 h-16 bg-neutral-100 dark:bg-white/8 rounded-2xl flex items-center justify-center mx-auto">
									<CreditCard className="w-8 h-8 text-neutral-500 dark:text-neutral-400" />
								</div>
								<div>
									<h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
										{t('WELCOME_TITLE')}
									</h2>
									<p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5">
										{t('FREE_PLAN_MESSAGE')}
									</p>
								</div>
								<div className="space-y-2.5">
									<Link
										href="/pricing"
										className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium rounded-lg hover:bg-neutral-700 dark:hover:bg-neutral-100 transition-colors"
									>
										<Plus className="w-4 h-4" />
										{t('UPGRADE_NOW')}
									</Link>
									<Link
										href="/pricing"
										className="w-full flex items-center justify-center px-5 py-2.5 bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 text-sm font-medium rounded-lg hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors"
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
				<div className="py-6 space-y-6">
					{/* Back link */}
					<div>
						<Link
							href="/client/settings"
							className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
						>
							<FiArrowLeft className="w-3.5 h-3.5" />
							{t('BACK_TO_SETTINGS')}
						</Link>
					</div>

					{/* Page header — avatar/icon + title on the left, actions on the right */}
					<header className="flex items-start justify-between gap-4">
						<div className="flex items-center gap-3 min-w-0">
							<div className={ICON_TILE}>
								<CreditCard className={ICON} />
							</div>
							<div className="min-w-0">
								<h1 className="text-base font-semibold text-neutral-900 dark:text-white tracking-tight truncate">
									{t('BILLING_SUBSCRIPTION_TITLE')}
								</h1>
								<p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
									{t('BILLING_SUBSCRIPTION_SUBTITLE')}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2 shrink-0">
							<Button
								onClick={refresh}
								variant="outline"
								size="sm"
								disabled={isRefreshing}
								className={OUTLINE_BTN}
								aria-label={t('REFRESH_ALL')}
							>
								<RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
								<span className="hidden sm:inline">
									{isRefreshing ? t('REFRESHING') : t('REFRESH_ALL')}
								</span>
							</Button>
							<button
								className={`${PRIMARY_CTA} disabled:opacity-50 disabled:cursor-not-allowed`}
								onClick={() => exportPaymentsCsv(payments)}
								disabled={payments.length === 0}
							>
								<Download className="h-3.5 w-3.5" />
								<span className="hidden sm:inline">{t('EXPORT')}</span>
							</button>
						</div>
					</header>

					{/* Loading state */}
					{loading && (
						<div className="flex items-center justify-center py-12">
							<div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-full shadow-sm">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-900 dark:border-white" />
								<span className="text-sm text-neutral-600 dark:text-neutral-400">{t('LOADING_BILLING_INFO')}</span>
							</div>
						</div>
					)}

					{!loading && (
						<div className="space-y-4">
							{/* Current plan — prominent card above stats */}
							<PlanCard
								planName={subscription?.currentSubscription?.planName || 'Free Plan'}
								hasActiveSubscription={subscription?.hasActiveSubscription || false}
								currentPeriodEnd={subscription?.currentSubscription?.currentPeriodEnd}
								onUpgrade={() => setActiveTab('subscriptions')}
							/>

							<BillingStats
								totalSpent={totalSpent}
								activePayments={activePayments}
								monthlyAverage={monthlyAverage}
								hasActiveSubscription={subscription?.hasActiveSubscription || false}
								totalPayments={totalPayments}
								currency={subscription?.currentSubscription?.currency || 'USD'}
								planName={subscription?.currentSubscription?.planName || 'Basic Plan'}
								currentPeriodEnd={subscription?.currentSubscription?.currentPeriodEnd || ''}
								onViewHistory={() => setActiveTab('payments')}
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
									<div className={CARD}>
										<div className="flex items-center justify-between mb-4">
											<h2 className={SECTION_TITLE}>{t('CURRENT_SUBSCRIPTION')}</h2>
											<button
												onClick={refreshSubscription}
												disabled={isRefreshingSubscription}
												className={LINK_BTN}
											>
												<RefreshCw className={`w-3 h-3 ${isRefreshingSubscription ? 'animate-spin' : ''}`} />
												{isRefreshingSubscription ? t('REFRESHING') : t('REFRESH')}
											</button>
										</div>

										{subscription?.hasActiveSubscription && subscription.currentSubscription ? (
											<>
												<SubscriptionCard subscription={subscription.currentSubscription} />
												<div className="mt-4 pt-4 border-t border-neutral-100 dark:border-white/[0.06]">
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
									<div className={CARD}>
										<h2 className={`${SECTION_TITLE} mb-4`}>{t('RECENT_ACTIVITY')}</h2>

										{!hasPaymentHistory ? (
											<OverviewEmptyState />
										) : (
											<div className="space-y-2">
												{payments.slice(0, 3).map((payment) => (
													<div
														key={payment.id}
														className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-white/[0.04] border border-neutral-100 dark:border-white/[0.06] hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors"
													>
														<div className="flex items-center gap-3">
															<div className={ICON_TILE}>
																<CreditCard className={ICON} />
															</div>
															<div>
																<p className="text-sm font-medium text-neutral-900 dark:text-white">
																	{payment.plan}
																</p>
																<div className="flex items-center gap-2 mt-0.5">
																	<p className="text-xs text-neutral-500 dark:text-neutral-400">
																		{payment.description}
																	</p>
																	<span
																		className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
																			payment.paymentProvider === PaymentProvider.LEMONSQUEEZY
																				? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
																				: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400'
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
															<p className="text-sm font-semibold text-neutral-900 dark:text-white">
																${payment.amount.toFixed(2)}
															</p>
															<p className="text-xs text-neutral-500 dark:text-neutral-400">
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
														className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
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
										selectedStatuses={statusFilters}
										onStatusChange={setStatusFilters}
										onExport={() => exportPaymentsCsv(filteredPayments)}
									/>
									{filteredPayments.length === 0 ? (
										<PaymentsEmptyState />
									) : (
										<div className={CARD}>
											<div className="space-y-3">
												{filteredPayments.map((payment) => (
													<PaymentCard key={payment.id} payment={payment} onChanged={refreshPayments} />
												))}
											</div>
										</div>
									)}
								</div>
							)}

							{activeTab === 'subscriptions' && (
								<div className={CARD}>
									<div className="flex items-center justify-between mb-4">
										<h2 className={SECTION_TITLE}>{t('SUBSCRIPTION_HISTORY')}</h2>
										<button
											onClick={refreshSubscription}
											disabled={isRefreshingSubscription}
											className={LINK_BTN}
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
