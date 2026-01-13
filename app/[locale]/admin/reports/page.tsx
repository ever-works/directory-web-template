'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectItem } from '@/components/ui/select';
import {
	Flag,
	Search,
	Eye,
	Filter,
	X,
	User,
	Calendar,
	FileText,
	AlertTriangle,
	CheckCircle,
	Clock
} from 'lucide-react';
import { UniversalPagination } from '@/components/universal-pagination';
import { useAdminReports, type AdminReportItem } from '@/hooks/use-admin-reports';
import { ReportStatus, ReportContentType, ReportReason } from '@/lib/db/schema';
import type { ReportStatusValues, ReportContentTypeValues, ReportReasonValues } from '@/lib/db/schema';
import ReportReviewDialog from '@/components/admin/reports/report-review-dialog';
import { useTranslations } from 'next-intl';
import { useNavigation } from '@/components/providers';

// Extracted className constants for better maintainability
const CLASSES = {
	// Page layout
	pageContainer: 'p-6 max-w-7xl mx-auto',

	// Header styles
	headerWrapper: 'mb-8',
	headerCard:
		'bg-gradient-to-r from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg p-6',
	headerContent: 'flex flex-col sm:flex-row sm:items-center justify-between gap-4',
	headerLeft: 'flex items-center space-x-4',
	headerIcon:
		'w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg',
	headerTitle:
		'text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent',
	headerSubtitle: 'text-gray-600 dark:text-gray-400 mt-1 flex items-center space-x-2',
	pendingBadge:
		'text-sm px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full font-medium',

	// Stats cards
	statsGrid: 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-6',
	statCard: 'rounded-xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 group p-5',
	statCardTotal: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
	statCardPending: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20',
	statCardResolved: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
	statCardItems: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
	statContent: 'flex items-center justify-between',
	statLabel: 'text-sm font-medium',
	statValue: 'text-3xl font-bold group-hover:scale-105 transition-transform',
	statIcon: 'w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform',

	// Filters
	filtersContainer: 'mb-6 space-y-4',
	searchContainer: 'relative',
	searchIcon: 'absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400',
	searchInput:
		'w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400',
	searchSpinner: 'absolute right-4 top-1/2 transform -translate-y-1/2',
	spinnerIcon: 'w-4 h-4 border-2 border-theme-primary border-t-transparent rounded-full animate-spin',
	filterRow: 'flex flex-wrap gap-3 items-center',
	filterLabel: 'flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400',
	resultsSummary: 'flex items-center justify-between text-sm text-gray-600 dark:text-gray-400',

	// Report cards
	reportsContainer: 'space-y-4',
	reportCard:
		'group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-theme-primary/30 hover:shadow-lg transition-all duration-300 p-5',
	reportHeader: 'flex items-center justify-between mb-3',
	reportBadges: 'flex items-center gap-2 flex-wrap',
	reportDate: 'text-sm text-gray-500 dark:text-gray-400',
	reportContentId: 'font-medium text-gray-900 dark:text-white mb-2',
	reportDetails: 'text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4',
	reportFooter: 'flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700',
	reportReporter: 'flex items-center gap-2',
	reportReporterIcon: 'w-4 h-4 text-gray-400',
	reportReporterText: 'text-sm text-gray-600 dark:text-gray-400',

	// Empty state
	emptyContainer: 'py-16 text-center',
	emptyIconWrapper:
		'w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-theme-primary/10 to-theme-accent/10 rounded-full flex items-center justify-center',
	emptyIcon: 'w-8 h-8 text-theme-primary opacity-60',
	emptyTitle: 'text-lg font-medium text-gray-900 dark:text-white mb-2',
	emptyDescription: 'text-gray-500 dark:text-gray-400',

	// Pagination
	paginationWrapper: 'mt-8 space-y-6',
	paginationInfo:
		'bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-6 py-4 shadow-sm',
	paginationContent: 'flex flex-col sm:flex-row sm:items-center justify-between gap-2',
	paginationDot: 'w-2 h-2 bg-theme-primary rounded-full',
	paginationText: 'text-sm font-medium text-gray-600 dark:text-gray-400',
	paginationMeta: 'flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-500',
	paginationCenter: 'flex justify-center',

	// Loading skeleton
	loadingSkeleton: 'bg-gray-200 dark:bg-gray-700 rounded animate-pulse'
} as const;

// Status badge styles
const STATUS_STYLES: Record<ReportStatusValues, { bg: string; text: string; icon: typeof Clock }> = {
	pending: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', icon: Clock },
	reviewed: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: Eye },
	resolved: {
		bg: 'bg-green-100 dark:bg-green-900/30',
		text: 'text-green-700 dark:text-green-300',
		icon: CheckCircle
	},
	dismissed: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', icon: X }
};

// Reason badge styles
const REASON_STYLES: Record<ReportReasonValues, { bg: string; text: string }> = {
	spam: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
	harassment: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
	inappropriate: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
	other: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' }
};

export default function AdminReportsPage() {
	const t = useTranslations('admin.ADMIN_REPORTS_PAGE');

	const {
		reports,
		stats,
		isLoading,
		isLoadingStats,
		isFiltering,
		isUpdating,
		currentPage,
		totalPages,
		totalReports,
		searchTerm,
		statusFilter,
		contentTypeFilter,
		reasonFilter,
		updateReport,
		handlePageChange,
		handleSearch,
		setStatusFilter,
		setContentTypeFilter,
		setReasonFilter,
		clearFilters
	} = useAdminReports({
		page: 1,
		limit: 10
	});

	const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
	const [reportToReview, setReportToReview] = useState<AdminReportItem | null>(null);

	const openReviewDialog = (report: AdminReportItem) => {
		setReportToReview(report);
		setReviewDialogOpen(true);
	};

	const closeReviewDialog = () => {
		setReviewDialogOpen(false);
		setReportToReview(null);
	};

	// Sync reportToReview with fresh data from reports array after query refresh
	useEffect(() => {
		if (reportToReview) {
			const freshReport = reports.find((r) => r.id === reportToReview.id);
			if (freshReport && freshReport !== reportToReview) {
				setReportToReview(freshReport);
			}
		}
	}, [reports, reportToReview]);

	const hasActiveFilters = searchTerm || statusFilter || contentTypeFilter || reasonFilter;

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	};

	// Check if skeleton should be shown (only on initial page load)
	const { isInitialLoad } = useNavigation();
	const shouldShowSkeleton = isInitialLoad && isLoading;

	// Loading state
	if (shouldShowSkeleton) {
		return (
			<div className={CLASSES.pageContainer}>
				{/* Loading Header */}
				<div className={CLASSES.headerWrapper}>
					<div className={CLASSES.headerCard}>
						<div className={CLASSES.headerContent}>
							<div className={CLASSES.headerLeft}>
								<div className={`w-12 h-12 ${CLASSES.loadingSkeleton} rounded-xl`}></div>
								<div>
									<div className={`h-8 w-48 ${CLASSES.loadingSkeleton} mb-2`}></div>
									<div className={`h-4 w-64 ${CLASSES.loadingSkeleton}`}></div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Loading Stats */}
				<div className={CLASSES.statsGrid}>
					{Array.from({ length: 4 }, (_, i) => (
						<div key={i} className={`${CLASSES.statCard} bg-gray-50 dark:bg-gray-800`}>
							<div className={`h-4 w-20 ${CLASSES.loadingSkeleton} mb-2`}></div>
							<div className={`h-8 w-16 ${CLASSES.loadingSkeleton}`}></div>
						</div>
					))}
				</div>

				{/* Loading Cards */}
				<div className={CLASSES.reportsContainer}>
					{Array.from({ length: 3 }, (_, i) => (
						<div key={i} className={CLASSES.reportCard}>
							<div className="flex items-center gap-2 mb-3">
								<div className={`h-6 w-20 ${CLASSES.loadingSkeleton} rounded-full`}></div>
								<div className={`h-6 w-16 ${CLASSES.loadingSkeleton} rounded-full`}></div>
							</div>
							<div className={`h-5 w-48 ${CLASSES.loadingSkeleton} mb-2`}></div>
							<div className={`h-4 w-full ${CLASSES.loadingSkeleton} mb-4`}></div>
							<div className="flex justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
								<div className={`h-4 w-32 ${CLASSES.loadingSkeleton}`}></div>
								<div className={`h-8 w-20 ${CLASSES.loadingSkeleton} rounded-lg`}></div>
							</div>
						</div>
					))}
				</div>

				<div className="mt-8 text-center">
					<div className="inline-flex items-center space-x-2 text-gray-500 dark:text-gray-400">
						<div className={CLASSES.spinnerIcon}></div>
						<span className="text-sm font-medium">{t('LOADING_REPORTS')}</span>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={CLASSES.pageContainer}>
			{/* Header */}
			<div className={CLASSES.headerWrapper}>
				<div className={CLASSES.headerCard}>
					<div className={CLASSES.headerContent}>
						<div className={CLASSES.headerLeft}>
							<div className={CLASSES.headerIcon}>
								<Flag className="w-6 h-6 text-white" />
							</div>
							<div>
								<h1 className={CLASSES.headerTitle}>{t('TITLE')}</h1>
								<p className={CLASSES.headerSubtitle}>
									<span>{t('SUBTITLE')}</span>
									<span className="hidden sm:inline">•</span>
									<span className={CLASSES.pendingBadge}>
										{stats?.pendingCount || 0} {t('PENDING')}
									</span>
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Stats Cards */}
			{!isLoadingStats && stats && (
				<div className={CLASSES.statsGrid}>
					<div className={`${CLASSES.statCard} ${CLASSES.statCardTotal}`}>
						<div className={CLASSES.statContent}>
							<div>
								<p className={`${CLASSES.statLabel} text-blue-600 dark:text-blue-400`}>
									{t('TOTAL_REPORTS')}
								</p>
								<p className={`${CLASSES.statValue} text-blue-700 dark:text-blue-300`}>{stats.total}</p>
							</div>
							<div className={`${CLASSES.statIcon} bg-blue-500/20`}>
								<Flag className="w-6 h-6 text-blue-600 dark:text-blue-400" />
							</div>
						</div>
					</div>
					<div className={`${CLASSES.statCard} ${CLASSES.statCardPending}`}>
						<div className={CLASSES.statContent}>
							<div>
								<p className={`${CLASSES.statLabel} text-orange-600 dark:text-orange-400`}>
									{t('PENDING')}
								</p>
								<p className={`${CLASSES.statValue} text-orange-700 dark:text-orange-300`}>
									{stats.pendingCount}
								</p>
							</div>
							<div className={`${CLASSES.statIcon} bg-orange-500/20`}>
								<AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
							</div>
						</div>
					</div>
					<div className={`${CLASSES.statCard} ${CLASSES.statCardResolved}`}>
						<div className={CLASSES.statContent}>
							<div>
								<p className={`${CLASSES.statLabel} text-green-600 dark:text-green-400`}>
									{t('RESOLVED')}
								</p>
								<p className={`${CLASSES.statValue} text-green-700 dark:text-green-300`}>
									{stats.resolvedCount}
								</p>
							</div>
							<div className={`${CLASSES.statIcon} bg-green-500/20`}>
								<CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
							</div>
						</div>
					</div>
					<div className={`${CLASSES.statCard} ${CLASSES.statCardItems}`}>
						<div className={CLASSES.statContent}>
							<div>
								<p className={`${CLASSES.statLabel} text-purple-600 dark:text-purple-400`}>
									{t('BY_ITEMS')}
								</p>
								<p className={`${CLASSES.statValue} text-purple-700 dark:text-purple-300`}>
									{stats.byContentType?.item || 0}
								</p>
							</div>
							<div className={`${CLASSES.statIcon} bg-purple-500/20`}>
								<FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Filters */}
			<div className={CLASSES.filtersContainer}>
				{/* Search Bar */}
				<div className={CLASSES.searchContainer}>
					<Search className={CLASSES.searchIcon} />
					<input
						type="text"
						placeholder={t('SEARCH_PLACEHOLDER')}
						value={searchTerm}
						onChange={(e) => handleSearch(e.target.value)}
						aria-label={t('SEARCH_PLACEHOLDER')}
						role="searchbox"
						className={CLASSES.searchInput}
					/>
					{isFiltering && (
						<div className={CLASSES.searchSpinner}>
							<div className={CLASSES.spinnerIcon}></div>
						</div>
					)}
				</div>

				{/* Filter Dropdowns */}
				<div className={CLASSES.filterRow}>
					<div className={CLASSES.filterLabel}>
						<Filter className="w-4 h-4" />
						<span>{t('FILTERS')}</span>
					</div>

					<Select
						placeholder={t('STATUS')}
						selectedKeys={statusFilter ? [statusFilter] : []}
						onSelectionChange={(keys) => {
							const value = keys[0] as ReportStatusValues | undefined;
							setStatusFilter(value);
						}}
						className="w-36"
					>
						{Object.values(ReportStatus).map((status) => (
							<SelectItem key={status} value={status}>
								{t(`STATUS_LABELS.${status}`)}
							</SelectItem>
						))}
					</Select>

					<Select
						placeholder={t('CONTENT_TYPE')}
						selectedKeys={contentTypeFilter ? [contentTypeFilter] : []}
						onSelectionChange={(keys) => {
							const value = keys[0] as ReportContentTypeValues | undefined;
							setContentTypeFilter(value);
						}}
						className="w-36"
					>
						{Object.values(ReportContentType).map((type) => (
							<SelectItem key={type} value={type}>
								{t(`CONTENT_TYPES.${type}`)}
							</SelectItem>
						))}
					</Select>

					<Select
						placeholder={t('REASON')}
						selectedKeys={reasonFilter ? [reasonFilter] : []}
						onSelectionChange={(keys) => {
							const value = keys[0] as ReportReasonValues | undefined;
							setReasonFilter(value);
						}}
						className="w-40"
					>
						{Object.values(ReportReason).map((reason) => (
							<SelectItem key={reason} value={reason}>
								{t(`REASONS.${reason}`)}
							</SelectItem>
						))}
					</Select>

					{hasActiveFilters && (
						<Button
							variant="ghost"
							size="sm"
							onClick={clearFilters}
							className="text-red-600 hover:text-red-700 hover:bg-red-50"
						>
							<X className="w-4 h-4 mr-1" />
							{t('CLEAR_ALL')}
						</Button>
					)}
				</div>

				{/* Results Summary */}
				<div className={CLASSES.resultsSummary}>
					<span>
						{t('SHOWING_REPORTS', { count: reports.length, total: totalReports })}
						{hasActiveFilters && <span className="ml-1">{t('FILTERED')}</span>}
					</span>
				</div>
			</div>

			{/* Reports List - Card Based */}
			{reports.length === 0 ? (
				<div className={CLASSES.emptyContainer}>
					<div className={CLASSES.emptyIconWrapper}>
						<Flag className={CLASSES.emptyIcon} />
					</div>
					<h3 className={CLASSES.emptyTitle}>{t('NO_REPORTS_FOUND')}</h3>
					<p className={CLASSES.emptyDescription}>
						{hasActiveFilters ? t('NO_REPORTS_SEARCH_DESCRIPTION') : t('NO_REPORTS_DESCRIPTION')}
					</p>
				</div>
			) : (
				<div className={CLASSES.reportsContainer}>
					{reports.map((report) => {
						const statusStyle = STATUS_STYLES[report.status];
						const reasonStyle = REASON_STYLES[report.reason];
						const StatusIcon = statusStyle.icon;

						return (
							<div key={report.id} className={CLASSES.reportCard}>
								{/* Header: Badges + Date */}
								<div className={CLASSES.reportHeader}>
									<div className={CLASSES.reportBadges}>
										{/* Status Badge */}
										<span
											className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
										>
											<StatusIcon className="w-3 h-3" />
											{t(`STATUS_LABELS.${report.status}`)}
										</span>
										{/* Content Type Badge */}
										<span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
											{t(`CONTENT_TYPES.${report.contentType}`)}
										</span>
										{/* Reason Badge */}
										<span
											className={`px-2.5 py-1 rounded-full text-xs font-medium ${reasonStyle.bg} ${reasonStyle.text}`}
										>
											{t(`REASONS.${report.reason}`)}
										</span>
									</div>
									<div className={CLASSES.reportDate}>
										<Calendar className="w-3.5 h-3.5 inline mr-1" />
										{formatDate(report.createdAt)}
									</div>
								</div>

								{/* Content ID */}
								<p className={CLASSES.reportContentId}>{report.contentId}</p>

								{/* Details Preview */}
								{report.details && <p className={CLASSES.reportDetails}>{report.details}</p>}

								{/* Footer: Reporter + Action */}
								<div className={CLASSES.reportFooter}>
									<div className={CLASSES.reportReporter}>
										<User className={CLASSES.reportReporterIcon} />
										<span className={CLASSES.reportReporterText}>
											{report.reporter?.name || report.reporter?.email || t('UNKNOWN')}
										</span>
									</div>
									<Button
										size="sm"
										disabled={isUpdating === report.id}
										onClick={() => openReviewDialog(report)}
										className="bg-theme-primary hover:bg-theme-primary/90 text-white"
									>
										<Eye className="w-4 h-4 mr-1" />
										{t('REVIEW')}
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Pagination */}
			{totalReports > 0 && (
				<div className={CLASSES.paginationWrapper}>
					<div className={CLASSES.paginationInfo}>
						<div className={CLASSES.paginationContent}>
							<div className="flex items-center space-x-2">
								<div className={CLASSES.paginationDot}></div>
								<span className={CLASSES.paginationText}>
									{t('SHOWING_RANGE', {
										start: (currentPage - 1) * 10 + 1,
										end: Math.min(currentPage * 10, totalReports),
										total: totalReports
									})}
								</span>
							</div>
							<div className={CLASSES.paginationMeta}>
								<span>{t('PAGE_OF', { current: currentPage, total: totalPages })}</span>
								<span>•</span>
								<span>10 {t('PER_PAGE')}</span>
							</div>
						</div>
					</div>

					<div className={CLASSES.paginationCenter}>
						<UniversalPagination
							page={currentPage}
							totalPages={totalPages}
							onPageChange={handlePageChange}
							className="shadow-lg"
						/>
					</div>
				</div>
			)}

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
		</div>
	);
}
