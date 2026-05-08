'use client';

import { useState, useEffect, useMemo } from 'react';
import {
	Flag, Eye, X, User, Calendar, FileText,
	AlertTriangle, CheckCircle, Clock, LayoutGrid, List
} from 'lucide-react';
import { UniversalPagination } from '@/components/universal-pagination';
import { useAdminReports, type AdminReportItem } from '@/hooks/use-admin-reports';
import { useAdminFilters } from '@/hooks/use-admin-filters';
import { ReportContentType, ReportReason } from '@/lib/db/schema';
import type { ReportStatusValues, ReportContentTypeValues, ReportReasonValues } from '@/lib/db/schema';
import ReportReviewDialog from '@/components/admin/reports/report-review-dialog';
import {
	AdminSearchBar,
	AdminStatusTabs,
	AdminFilterPopover,
	AdminActiveFilters,
	type StatusTabOption,
	type FilterSection,
	type ActiveFilter
} from '@/components/admin/shared';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/container';
import { cn } from '@/lib/utils';

type ReportStatusFilter = ReportStatusValues | '';

const STATUS_BADGE: Record<ReportStatusValues, { classes: string; Icon: typeof Clock }> = {
	pending:   { classes: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20', Icon: Clock },
	reviewed:  { classes: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20', Icon: Eye },
	resolved:  { classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20', Icon: CheckCircle },
	dismissed: { classes: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-400 dark:ring-white/8', Icon: X }
};

const REASON_BADGE: Record<ReportReasonValues, string> = {
	spam:          'bg-yellow-50 text-yellow-700 ring-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:ring-yellow-500/20',
	harassment:    'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20',
	inappropriate: 'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-500/20',
	other:         'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-400 dark:ring-white/8'
};

export default function AdminReportsPage() {
	const t = useTranslations('admin.ADMIN_REPORTS_PAGE');
	const [currentPage, setCurrentPage] = useState(1);

	const {
		searchTerm, setSearchTerm, debouncedSearchTerm, isSearching,
		hasActiveSearch, statusFilter, setStatusFilter,
		multiFilters, setMultiFilter, hasActiveFilters, clearAllFilters
	} = useAdminFilters<ReportStatusFilter>({
		minSearchLength: 2,
		debounceDelay: 300,
		initialMultiFilters: { contentType: [], reason: [] },
		onFiltersChange: () => setCurrentPage(1)
	});

	const { reports, stats, isLoading, isLoadingStats, isUpdating, totalPages, totalReports, updateReport } =
		useAdminReports({
			page: currentPage,
			limit: 10,
			search: debouncedSearchTerm || undefined,
			status: (statusFilter || undefined) as ReportStatusValues | undefined,
			contentType: (multiFilters.contentType?.[0] as ReportContentTypeValues) || undefined,
			reason: (multiFilters.reason?.[0] as ReportReasonValues) || undefined
		});

	const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
	const [reportToReview, setReportToReview] = useState<AdminReportItem | null>(null);

	const openReviewDialog = (report: AdminReportItem) => { setReportToReview(report); setReviewDialogOpen(true); };
	const closeReviewDialog = () => { setReviewDialogOpen(false); setReportToReview(null); };

	useEffect(() => {
		if (reportToReview) {
			const fresh = reports.find((r) => r.id === reportToReview.id);
			if (fresh && fresh !== reportToReview) setReportToReview(fresh);
		}
	}, [reports, reportToReview]);

	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

	const [hasLoaded, setHasLoaded] = useState(false);
	useEffect(() => { if (!isLoading) setHasLoaded(true); }, [isLoading]);
	const shouldShowSkeleton = !hasLoaded && isLoading;

	const displayReports = reports;
	const displayStats   = stats;

	const statusOptions: StatusTabOption<ReportStatusFilter>[] = useMemo(() => [
		{ value: '',          label: t('STATUS_ALL'),                count: displayStats?.total              ?? 0 },
		{ value: 'pending',   label: t('STATUS_LABELS.pending'),     count: displayStats?.byStatus?.pending  ?? 0 },
		{ value: 'reviewed',  label: t('STATUS_LABELS.reviewed'),    count: displayStats?.byStatus?.reviewed ?? 0 },
		{ value: 'resolved',  label: t('STATUS_LABELS.resolved'),    count: displayStats?.byStatus?.resolved ?? 0 },
		{ value: 'dismissed', label: t('STATUS_LABELS.dismissed'),   count: displayStats?.byStatus?.dismissed ?? 0 }
	], [displayStats, t]);

	const filterSections: FilterSection<string>[] = useMemo(() => [
		{
			id: 'contentType', label: t('CONTENT_TYPE'), type: 'radio' as const,
			options: Object.values(ReportContentType).map((type) => ({
				id: type, label: t(`CONTENT_TYPES.${type}`), count: displayStats?.byContentType?.[type] || 0
			})),
			selectedValues: multiFilters.contentType?.slice(0, 1) || [],
			onChange: (vals: string[]) => setMultiFilter('contentType', vals)
		},
		{
			id: 'reason', label: t('REASON'), type: 'radio' as const,
			options: Object.values(ReportReason).map((reason) => ({
				id: reason, label: t(`REASONS.${reason}`), count: displayStats?.byReason?.[reason] || 0
			})),
			selectedValues: multiFilters.reason?.slice(0, 1) || [],
			onChange: (vals: string[]) => setMultiFilter('reason', vals)
		}
	], [displayStats, multiFilters, setMultiFilter, t]);

	const advancedFilterCount = (multiFilters.contentType?.length || 0) + (multiFilters.reason?.length || 0);

	const activeFilters: ActiveFilter[] = useMemo(() => {
		const filters: ActiveFilter[] = [];
		if (hasActiveSearch)
			filters.push({ id: 'search', type: 'search', label: t('SEARCH_PLACEHOLDER').replace('...', ''), value: searchTerm.trim() });
		if (statusFilter)
			filters.push({ id: `status:${statusFilter}`, type: 'status', label: t('STATUS'), value: t(`STATUS_LABELS.${statusFilter}`) });
		(multiFilters.contentType || []).forEach((type) =>
			filters.push({ id: `contentType:${type}`, type: 'contentType', label: t('CONTENT_TYPE'), value: t(`CONTENT_TYPES.${type}`) }));
		(multiFilters.reason || []).forEach((reason) =>
			filters.push({ id: `reason:${reason}`, type: 'reason', label: t('REASON'), value: t(`REASONS.${reason}`) }));
		return filters;
	}, [hasActiveSearch, searchTerm, statusFilter, multiFilters, t]);

	const handleRemoveFilter = (filter: ActiveFilter) => {
		switch (filter.type) {
			case 'search':      setSearchTerm(''); break;
			case 'status':      setStatusFilter(''); break;
			case 'contentType': setMultiFilter('contentType', []); break;
			case 'reason':      setMultiFilter('reason', []); break;
		}
	};

	const formatDate = (dateString: string) =>
		new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

	if (shouldShowSkeleton) {
		return (
			<Container useGlobalWidth>
				<div className="mb-8">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-white/8 animate-pulse shrink-0" />
							<div>
								<div className="h-5 w-40 bg-gray-200 dark:bg-white/8 rounded-lg animate-pulse mb-2" />
								<div className="h-3.5 w-56 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
							</div>
						</div>
					</div>
					<div className="mt-5 h-px bg-gray-200 dark:bg-white/8 animate-pulse" />
				</div>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
					{[0, 1, 2, 3].map((i) => (
						<div key={i} className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5">
							<div className="flex items-start justify-between mb-4">
								<div className="h-3 w-20 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
								<div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-white/8 animate-pulse" />
							</div>
							<div className="h-7 w-14 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
						</div>
					))}
				</div>
				<div className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl overflow-hidden">
					{[0, 1, 2].map((i) => (
						<div key={i} className="px-5 py-5 border-b border-gray-50 dark:border-white/4">
							<div className="flex gap-2 mb-3">
								<div className="h-5 w-20 bg-gray-200 dark:bg-white/8 rounded-full animate-pulse" />
								<div className="h-5 w-16 bg-gray-200 dark:bg-white/8 rounded-full animate-pulse" />
							</div>
							<div className="h-4 w-48 bg-gray-200 dark:bg-white/8 rounded animate-pulse mb-2" />
							<div className="h-3 w-full bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
						</div>
					))}
				</div>
			</Container>
		);
	}

	return (
		<Container useGlobalWidth>
			{/* Page Header */}
			<div className="mb-8">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="w-11 h-11 rounded-xl bg-gray-900 dark:bg-gray-800 flex items-center justify-center shrink-0 shadow-sm">
							<Flag className="w-5 h-5 text-white" />
						</div>
						<div>
							<h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
								{t('TITLE')}
							</h1>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
								<span>{t('SUBTITLE')}</span>
								{(displayStats?.pendingCount || 0) > 0 && (
									<>
										<span className="text-gray-300 dark:text-gray-600">·</span>
										<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20">
											<span className="w-1 h-1 rounded-full bg-current opacity-75 shrink-0 animate-pulse" />
											{displayStats?.pendingCount} {t('PENDING')}
										</span>
									</>
								)}
							</p>
						</div>
					</div>
				</div>
				<div className="mt-5 h-px bg-linear-to-r from-gray-200 via-gray-100 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent" />
			</div>

			{/* Stats */}
			{!isLoadingStats && displayStats && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
					<div className="relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200">
						<div className="flex items-start justify-between mb-4 pt-0.5">
							<p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
								{t('TOTAL_REPORTS')}
							</p>
							<div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
								<Flag className="w-4 h-4" />
							</div>
						</div>
						<p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
							{displayStats.total}
						</p>
					</div>

					<div className="relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200">
						<div className="flex items-start justify-between mb-4 pt-0.5">
							<p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
								{t('PENDING')}
							</p>
							<div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
								<AlertTriangle className="w-4 h-4" />
							</div>
						</div>
						<p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
							{displayStats.pendingCount}
						</p>
					</div>

					<div className="relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200">
						<div className="flex items-start justify-between mb-4 pt-0.5">
							<p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
								{t('RESOLVED')}
							</p>
							<div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
								<CheckCircle className="w-4 h-4" />
							</div>
						</div>
						<p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
							{displayStats.resolvedCount}
						</p>
					</div>

					<div className="relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200">
						<div className="flex items-start justify-between mb-4 pt-0.5">
							<p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
								{t('BY_ITEMS')}
							</p>
							<div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400">
								<FileText className="w-4 h-4" />
							</div>
						</div>
						<p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
							{displayStats.byContentType?.item || 0}
						</p>
					</div>
				</div>
			)}

			{/* Reports Table */}
			<div className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl overflow-hidden">
				{/* Table Header */}
				<div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/6 bg-gray-50/60 dark:bg-white/1.5">
					<div className="flex items-center justify-between gap-4 flex-wrap">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
							{t('REPORTS_TABLE_TITLE')}
						</h3>
						<div className="flex items-center gap-3">
							<AdminStatusTabs<ReportStatusFilter>
								options={statusOptions}
								value={statusFilter}
								onChange={setStatusFilter}
							/>
							<AdminFilterPopover
								sections={filterSections}
								activeCount={advancedFilterCount}
								onClearAll={() => { setMultiFilter('contentType', []); setMultiFilter('reason', []); }}
							/>
							<div className="flex items-center gap-1 p-0.5 rounded-lg bg-gray-100 dark:bg-white/6">
								<button type="button" onClick={() => setViewMode('grid')} title="Grid view"
									className={cn('p-1.5 rounded-md transition-colors', viewMode === 'grid' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300')}>
									<LayoutGrid className="w-3.5 h-3.5" />
								</button>
								<button type="button" onClick={() => setViewMode('list')} title="List view"
									className={cn('p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300')}>
									<List className="w-3.5 h-3.5" />
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Search & Active Filters */}
				<div className="px-5 py-4 space-y-3 border-b border-gray-50 dark:border-white/4">
					<AdminSearchBar
						value={searchTerm}
						onChange={setSearchTerm}
						isSearching={isSearching}
						placeholder={t('SEARCH_PLACEHOLDER')}
						ariaLabel={t('SEARCH_PLACEHOLDER')}
					/>
					{activeFilters.length > 0 && (
						<AdminActiveFilters
							filters={activeFilters}
							onRemove={handleRemoveFilter}
							onClearAll={clearAllFilters}
						/>
					)}
					<div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
						<span>
							{t('SHOWING_REPORTS', { count: displayReports.length, total: totalReports || displayReports.length })}
							{hasActiveFilters && <span className="ml-1">{t('FILTERED')}</span>}
						</span>
					</div>
				</div>

				{/* Reports List / Grid */}
				{displayReports.length === 0 ? (
					<div className="flex flex-col items-center justify-center px-6 py-20 text-center">
						<div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/6 flex items-center justify-center mb-4 ring-1 ring-gray-200 dark:ring-white/8">
							<Flag className="w-6 h-6 text-gray-400 dark:text-gray-500" />
						</div>
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
							{t('NO_REPORTS_FOUND')}
						</h3>
						<p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
							{hasActiveFilters ? t('NO_REPORTS_SEARCH_DESCRIPTION') : t('NO_REPORTS_DESCRIPTION')}
						</p>
					</div>
				) : viewMode === 'grid' ? (
					<div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{displayReports.map((report) => {
							const statusStyle = STATUS_BADGE[report.status];
							const StatusIcon = statusStyle.Icon;
							return (
								<div key={report.id} className="group relative flex flex-col gap-3 p-4 rounded-xl border border-gray-100 dark:border-white/6 bg-white dark:bg-white/2 hover:border-gray-200 dark:hover:border-white/10 hover:shadow-sm transition-all duration-200">
									<div className="flex items-start justify-between gap-2">
										<div className="flex items-center gap-1.5 flex-wrap">
											<span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset', statusStyle.classes)}>
												<StatusIcon className="w-2.5 h-2.5" />
												{t(`STATUS_LABELS.${report.status}`)}
											</span>
											<span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset', REASON_BADGE[report.reason])}>
												{t(`REASONS.${report.reason}`)}
											</span>
										</div>
										<span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 flex items-center gap-1">
											<Calendar className="w-2.5 h-2.5" />
											{formatDate(report.createdAt)}
										</span>
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-1">
											{report.contentId}
										</p>
										{report.details ? (
											<p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{report.details}</p>
										) : (
											<p className="text-xs text-gray-400 dark:text-gray-600 italic">No details provided</p>
										)}
									</div>
									<div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-white/4">
										<span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 truncate min-w-0">
											<User className="w-3 h-3 shrink-0" />
											<span className="truncate">{report.reporter?.name || report.reporter?.email || t('UNKNOWN')}</span>
										</span>
										<button
											type="button"
											disabled={isUpdating === report.id}
											onClick={() => openReviewDialog(report)}
											className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200 shrink-0 disabled:opacity-50"
										>
											<Eye className="w-3 h-3" />
											{t('REVIEW')}
										</button>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div className="divide-y divide-gray-50 dark:divide-white/4">
						{displayReports.map((report) => {
							const statusStyle = STATUS_BADGE[report.status];
							const StatusIcon = statusStyle.Icon;
							return (
								<div key={report.id} className="px-5 py-4 hover:bg-gray-50/80 dark:hover:bg-white/2.5 transition-colors duration-150">
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-1.5 flex-wrap mb-2">
												<span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset', statusStyle.classes)}>
													<StatusIcon className="w-2.5 h-2.5" />
													{t(`STATUS_LABELS.${report.status}`)}
												</span>
												<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20">
													{t(`CONTENT_TYPES.${report.contentType}`)}
												</span>
												<span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset', REASON_BADGE[report.reason])}>
													{t(`REASONS.${report.reason}`)}
												</span>
											</div>
											<p className="text-sm font-medium text-gray-900 dark:text-white truncate mb-1">{report.contentId}</p>
											{report.details && (
												<p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">{report.details}</p>
											)}
											<div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
												<span className="flex items-center gap-1">
													<User className="w-3 h-3" />
													{report.reporter?.name || report.reporter?.email || t('UNKNOWN')}
												</span>
												<span>·</span>
												<span className="flex items-center gap-1">
													<Calendar className="w-3 h-3" />
													{formatDate(report.createdAt)}
												</span>
											</div>
										</div>
										<button
											type="button"
											disabled={isUpdating === report.id}
											onClick={() => openReviewDialog(report)}
											className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200 shrink-0 disabled:opacity-50"
										>
											<Eye className="w-3.5 h-3.5" />
											{t('REVIEW')}
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="p-4 border-t border-gray-100 dark:border-white/6">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
							<span className="text-xs text-gray-500 dark:text-gray-400">
								{t('SHOWING_RANGE', {
									start: (currentPage - 1) * 10 + 1,
									end: Math.min(currentPage * 10, totalReports),
									total: totalReports
								})}
							</span>
							<span className="text-xs text-gray-400 dark:text-gray-500">
								{t('PAGE_OF', { current: currentPage, total: totalPages })} · 10 {t('PER_PAGE')}
							</span>
						</div>
						<UniversalPagination
							page={currentPage}
							totalPages={totalPages}
							onPageChange={setCurrentPage}
						/>
					</div>
				)}
			</div>

			{/* Review Dialog */}
			{reportToReview && (
				<ReportReviewDialog
					report={reportToReview}
					open={reviewDialogOpen}
					onOpenChange={setReviewDialogOpen}
					onUpdate={updateReport}
					onClose={closeReviewDialog}
				/>
			)}
		</Container>
	);
}
