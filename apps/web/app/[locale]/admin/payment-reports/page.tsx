'use client';

import { useMemo, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, Loader2, Receipt, TrendingUp, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/container';
import { UniversalPagination } from '@/components/universal-pagination';
import { useAdminPaymentReports } from '@/hooks/use-admin-payment-reports';
import { SubscriptionStatus } from '@/lib/db/schema';
import { PaymentPlan, PaymentProvider } from '@/lib/constants/payment';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

const INPUT_BASE = cn(
	'w-full h-9 px-3 text-xs rounded-lg',
	'bg-white dark:bg-white/5',
	'border border-gray-200 dark:border-white/8',
	'text-gray-900 dark:text-white',
	'focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/20',
	'transition-all duration-150 disabled:opacity-50 appearance-none'
);

function formatAmount(amount: number, currency: string): string {
	const value = (amount ?? 0) / 100;
	try {
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: (currency || 'usd').toUpperCase()
		}).format(value);
	} catch {
		return `${value.toFixed(2)} ${(currency || 'usd').toUpperCase()}`;
	}
}

export default function AdminPaymentReportsPage() {
	const t = useTranslations('admin.ADMIN_PAYMENT_REPORTS_PAGE');

	const [page, setPage] = useState(1);
	const [from, setFrom] = useState('');
	const [to, setTo] = useState('');
	const [planId, setPlanId] = useState('');
	const [status, setStatus] = useState('');
	const [provider, setProvider] = useState('');

	const resetToFirstPage = () => setPage(1);

	const { records, summary, isLoading, isExporting, totalRecords, totalPages, exportReport } = useAdminPaymentReports(
		{
			page,
			limit: PAGE_SIZE,
			from: from || undefined,
			to: to || undefined,
			planId: planId || undefined,
			status: status || undefined,
			provider: provider || undefined
		}
	);

	const hasActiveFilters = Boolean(from || to || planId || status || provider);

	const primaryTotal = useMemo(() => {
		if (!summary?.totalsByCurrency?.length) return null;
		return [...summary.totalsByCurrency].sort((a, b) => b.amount - a.amount)[0];
	}, [summary]);

	const clearFilters = () => {
		setFrom('');
		setTo('');
		setPlanId('');
		setStatus('');
		setProvider('');
		resetToFirstPage();
	};

	const handleExport = (format: 'csv' | 'xlsx') =>
		exportReport(format, t('EXPORT_FAILED'), t('EXPORT_SUCCESS', { format: format.toUpperCase() }));

	const formatDate = (value: string | null) =>
		value
			? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
			: '—';

	return (
		<Container useGlobalWidth>
			{/* Page header */}
			<div className="mb-8">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="w-11 h-11 rounded-xl bg-gray-900 dark:bg-gray-800 flex items-center justify-center shrink-0 shadow-sm">
							<BarChart3 className="w-5 h-5 text-white" />
						</div>
						<div>
							<h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
								{t('TITLE')}
							</h1>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('SUBTITLE')}</p>
						</div>
					</div>
					<div className="flex items-center gap-2 self-start">
						<button
							type="button"
							data-testid="payment-report-export-csv"
							onClick={() => handleExport('csv')}
							disabled={isExporting !== null}
							className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-colors disabled:opacity-50"
						>
							{isExporting === 'csv' ? (
								<Loader2 className="w-3.5 h-3.5 animate-spin" />
							) : (
								<Download className="w-3.5 h-3.5" />
							)}
							{t('EXPORT_CSV')}
						</button>
						<button
							type="button"
							data-testid="payment-report-export-xlsx"
							onClick={() => handleExport('xlsx')}
							disabled={isExporting !== null}
							className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/8 transition-colors disabled:opacity-50"
						>
							{isExporting === 'xlsx' ? (
								<Loader2 className="w-3.5 h-3.5 animate-spin" />
							) : (
								<FileSpreadsheet className="w-3.5 h-3.5" />
							)}
							{t('EXPORT_XLSX')}
						</button>
					</div>
				</div>
				<div className="mt-5 h-px bg-linear-to-r from-gray-200 via-gray-100 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent" />
			</div>

			{/* Summary cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
				{[
					{
						label: t('TOTAL_REVENUE'),
						value: primaryTotal
							? formatAmount(primaryTotal.amount, primaryTotal.currency)
							: formatAmount(0, 'usd'),
						Icon: TrendingUp
					},
					{ label: t('TRANSACTIONS'), value: String(summary?.transactions ?? 0), Icon: Receipt },
					{ label: t('PLANS'), value: String(summary?.byPlan?.length ?? 0), Icon: Users },
					{ label: t('PROVIDERS'), value: String(summary?.byProvider?.length ?? 0), Icon: BarChart3 }
				].map((card) => (
					<div
						key={card.label}
						className="relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200"
					>
						<div className="flex items-start justify-between mb-4 pt-0.5">
							<p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
								{card.label}
							</p>
							<div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
								<card.Icon className="w-4 h-4" />
							</div>
						</div>
						<p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
							{card.value}
						</p>
					</div>
				))}
			</div>

			{/* Report */}
			<div className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl overflow-hidden">
				<div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/6 bg-gray-50/60 dark:bg-white/1.5">
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('TABLE_TITLE')}</h3>
				</div>

				{/* Filters */}
				<div className="px-5 py-4 border-b border-gray-50 dark:border-white/4">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
						<div>
							<label
								htmlFor="payment-report-from"
								className="block text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-1"
							>
								{t('FROM')}
							</label>
							<input
								id="payment-report-from"
								type="date"
								value={from}
								onChange={(event) => {
									setFrom(event.target.value);
									resetToFirstPage();
								}}
								className={INPUT_BASE}
							/>
						</div>
						<div>
							<label
								htmlFor="payment-report-to"
								className="block text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-1"
							>
								{t('TO')}
							</label>
							<input
								id="payment-report-to"
								type="date"
								value={to}
								onChange={(event) => {
									setTo(event.target.value);
									resetToFirstPage();
								}}
								className={INPUT_BASE}
							/>
						</div>
						<div>
							<label
								htmlFor="payment-report-plan"
								className="block text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-1"
							>
								{t('PLAN')}
							</label>
							<select
								id="payment-report-plan"
								value={planId}
								onChange={(event) => {
									setPlanId(event.target.value);
									resetToFirstPage();
								}}
								className={INPUT_BASE}
							>
								<option value="">{t('ALL')}</option>
								{Object.values(PaymentPlan).map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</select>
						</div>
						<div>
							<label
								htmlFor="payment-report-status"
								className="block text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-1"
							>
								{t('STATUS')}
							</label>
							<select
								id="payment-report-status"
								value={status}
								onChange={(event) => {
									setStatus(event.target.value);
									resetToFirstPage();
								}}
								className={INPUT_BASE}
							>
								<option value="">{t('ALL')}</option>
								{Object.values(SubscriptionStatus).map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</select>
						</div>
						<div>
							<label
								htmlFor="payment-report-provider"
								className="block text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-1"
							>
								{t('PROVIDER')}
							</label>
							<select
								id="payment-report-provider"
								value={provider}
								onChange={(event) => {
									setProvider(event.target.value);
									resetToFirstPage();
								}}
								className={INPUT_BASE}
							>
								<option value="">{t('ALL')}</option>
								{Object.values(PaymentProvider).map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</select>
						</div>
					</div>
					<div className="flex items-center justify-between gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
						<span>
							{t('SHOWING_RECORDS', { count: records.length, total: totalRecords || records.length })}
						</span>
						{hasActiveFilters && (
							<button
								type="button"
								onClick={clearFilters}
								className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white underline underline-offset-2"
							>
								{t('CLEAR_FILTERS')}
							</button>
						)}
					</div>
				</div>

				{/* Records */}
				{isLoading ? (
					<div className="divide-y divide-gray-50 dark:divide-white/4">
						{[0, 1, 2].map((index) => (
							<div key={index} className="px-5 py-5">
								<div className="h-4 w-48 bg-gray-200 dark:bg-white/8 rounded animate-pulse mb-2" />
								<div className="h-3 w-full bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
							</div>
						))}
					</div>
				) : records.length === 0 ? (
					<div className="flex flex-col items-center justify-center px-6 py-20 text-center">
						<div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/6 flex items-center justify-center mb-4 ring-1 ring-gray-200 dark:ring-white/8">
							<Receipt className="w-6 h-6 text-gray-400 dark:text-gray-500" />
						</div>
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
							{t('NO_RECORDS_FOUND')}
						</h3>
						<p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
							{hasActiveFilters ? t('NO_RECORDS_FILTERED_DESCRIPTION') : t('NO_RECORDS_DESCRIPTION')}
						</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-left text-xs" data-testid="payment-report-table">
							<thead className="bg-gray-50/60 dark:bg-white/1.5 text-gray-500 dark:text-gray-400">
								<tr>
									<th scope="col" className="px-5 py-2.5 font-semibold">
										{t('COLUMN_DATE')}
									</th>
									<th scope="col" className="px-5 py-2.5 font-semibold">
										{t('COLUMN_CUSTOMER')}
									</th>
									<th scope="col" className="px-5 py-2.5 font-semibold">
										{t('COLUMN_PLAN')}
									</th>
									<th scope="col" className="px-5 py-2.5 font-semibold">
										{t('COLUMN_PROVIDER')}
									</th>
									<th scope="col" className="px-5 py-2.5 font-semibold">
										{t('COLUMN_STATUS')}
									</th>
									<th scope="col" className="px-5 py-2.5 font-semibold text-right">
										{t('COLUMN_AMOUNT')}
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-50 dark:divide-white/4">
								{records.map((record) => (
									<tr
										key={record.id}
										data-testid="payment-report-row"
										className="hover:bg-gray-50/80 dark:hover:bg-white/2.5 transition-colors duration-150"
									>
										<td className="px-5 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
											{formatDate(record.createdAt)}
										</td>
										<td className="px-5 py-3 max-w-[220px] truncate text-gray-900 dark:text-white">
											{record.userEmail || record.userId}
										</td>
										<td className="px-5 py-3 capitalize text-gray-700 dark:text-gray-300">
											{record.planId}
										</td>
										<td className="px-5 py-3 capitalize text-gray-700 dark:text-gray-300">
											{record.paymentProvider}
										</td>
										<td className="px-5 py-3 capitalize text-gray-700 dark:text-gray-300">
											{record.status}
										</td>
										<td className="px-5 py-3 text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
											{formatAmount(
												record.amountPaid || record.amount || 0,
												record.currency || 'usd'
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{/* Breakdown */}
				{summary && summary.byPlan.length > 0 && (
					<div className="px-5 py-4 border-t border-gray-100 dark:border-white/6 grid grid-cols-1 sm:grid-cols-3 gap-4">
						{[
							{ title: t('BY_PLAN'), rows: summary.byPlan.map((row) => ({ label: row.planId, ...row })) },
							{
								title: t('BY_PROVIDER'),
								rows: summary.byProvider.map((row) => ({ label: row.provider, ...row }))
							},
							{
								title: t('BY_STATUS'),
								rows: summary.byStatus.map((row) => ({ label: row.status, ...row }))
							}
						].map((group) => (
							<div key={group.title}>
								<p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-2">
									{group.title}
								</p>
								<ul className="space-y-1">
									{group.rows.map((row) => (
										<li
											key={`${group.title}-${row.label}`}
											className="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-300"
										>
											<span className="capitalize truncate">{row.label}</span>
											<span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
												{formatAmount(row.amount, primaryTotal?.currency || 'usd')} ·{' '}
												{row.transactions}
											</span>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				)}

				{totalPages > 1 && (
					<div className="p-4 border-t border-gray-100 dark:border-white/6">
						<UniversalPagination page={page} totalPages={totalPages} onPageChange={setPage} />
					</div>
				)}
			</div>
		</Container>
	);
}
