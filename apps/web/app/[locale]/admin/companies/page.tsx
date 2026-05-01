'use client';

import { useState, useCallback } from 'react';
import { useAdminFilters } from '@/hooks/use-admin-filters';
import { useSkeletonVisibility } from '@/hooks/use-skeleton-visibility';
import { useAdminCompanies } from '@/hooks/use-admin-companies';
import { useCompaniesEnabled } from '@/hooks/use-companies-enabled';
import { UniversalPagination } from '@/components/universal-pagination';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { Company } from '@/types/company';
import type { CreateCompanyInput, UpdateCompanyInput } from '@/lib/validations/company';
import { Container } from '@/components/ui/container';

// Components
import { PageHeader } from '@/components/admin/companies/page-header';
import { CompanyStats } from '@/components/admin/companies/company-stats';
import { CompanySearch } from '@/components/admin/companies/company-search';
import { CompanyFilters } from '@/components/admin/companies/company-filters';
import { CompaniesTable } from '@/components/admin/companies/companies-table';
import { LoadingSkeleton } from '@/components/admin/companies/loading-skeleton';
import { CompanyModal, DeleteConfirmationModal } from '@/components/admin/companies/company-modal';

/**
 * Companies Page Component
 * Main orchestrator for the companies management page
 */
export default function CompaniesPage() {
	const t = useTranslations('admin.ADMIN_COMPANIES_PAGE');
	const { companiesEnabled } = useCompaniesEnabled();

	// UI state
	const [currentPage, setCurrentPage] = useState(1);
	const [limit] = useState(10);
	const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

	// Unified filter state management
	type CompanyStatus = 'active' | 'inactive';

	const {
		searchTerm,
		setSearchTerm,
		debouncedSearchTerm,
		isSearching,
		statusFilter,
		setStatusFilter,
		hasActiveFilters
	} = useAdminFilters<CompanyStatus>({
		minSearchLength: 2,
		debounceDelay: 300,
		onFiltersChange: () => setCurrentPage(1)
	});

	// Data fetching hook
	const { companies, stats, page, totalPages, isLoading, isSubmitting, createCompany, updateCompany, deleteCompany } =
		useAdminCompanies({
			params: {
				page: currentPage,
				limit,
				search: debouncedSearchTerm,
				status: statusFilter || undefined,
				sortBy: 'createdAt',
				sortOrder: 'desc'
			}
		});

	// Check if skeleton should be shown (only on initial page load)
	const shouldShowSkeleton = useSkeletonVisibility(isLoading, companies.length > 0);

	// Handlers
	const handleAddCompany = useCallback(() => {
		setIsCreateModalOpen(true);
	}, []);

	const handleCreateCompany = useCallback(
		async (data: CreateCompanyInput | UpdateCompanyInput) => {
			const success = await createCompany(data as CreateCompanyInput);
			if (success) {
				setIsCreateModalOpen(false);
				// Reset to page 1 to see the new company
				setCurrentPage(1);
			}
		},
		[createCompany]
	);

	const handleCloseCreateModal = useCallback(() => {
		setIsCreateModalOpen(false);
	}, []);

	const handleEditCompany = useCallback((company: Company) => {
		setSelectedCompany(company);
		setIsEditModalOpen(true);
	}, []);

	const handleUpdateCompany = useCallback(
		async (data: CreateCompanyInput | UpdateCompanyInput) => {
			const updateData = data as UpdateCompanyInput;
			const success = await updateCompany(updateData.id, updateData);
			if (success) {
				setIsEditModalOpen(false);
				setSelectedCompany(null);
			}
		},
		[updateCompany]
	);

	const handleCloseEditModal = useCallback(() => {
		setIsEditModalOpen(false);
		setSelectedCompany(null);
	}, []);

	const handleDeleteClick = useCallback(
		(companyId: string) => {
			const company = companies.find((c) => c.id === companyId);
			if (company) {
				setCompanyToDelete(company);
				setIsDeleteModalOpen(true);
			}
		},
		[companies]
	);

	const handleConfirmDelete = useCallback(async () => {
		if (!companyToDelete) return;
		const success = await deleteCompany(companyToDelete.id);
		if (success) {
			setIsDeleteModalOpen(false);
			setCompanyToDelete(null);
		}
	}, [companyToDelete, deleteCompany]);

	const handleCancelDelete = useCallback(() => {
		setIsDeleteModalOpen(false);
		setCompanyToDelete(null);
	}, []);

	const handlePageChange = useCallback((page: number) => {
		setCurrentPage(page);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}, []);

	// Loading state - only show skeleton on initial page load
	if (shouldShowSkeleton) {
		return <LoadingSkeleton />;
	}

	return (
		<Container useGlobalWidth>
			{/* Warning Banner - Companies Disabled */}
			{!companiesEnabled && (
				<div className="mb-6 flex items-start gap-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-5 py-4 rounded-xl">
					<AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
					<div className="flex-1 min-w-0">
						<p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-0.5">
							{t('WARNING_DISABLED_TITLE')}
						</p>
						<p className="text-sm text-amber-700 dark:text-amber-400/80">
							{t('WARNING_DISABLED_MESSAGE')}
						</p>
						<Link
							href="/admin/settings"
							className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
						>
							{t('WARNING_DISABLED_ACTION')}
							<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
						</Link>
					</div>
				</div>
			)}

			{/* Page Header */}
			<PageHeader onAddCompany={handleAddCompany} />

			{/* Stats Cards */}
			<CompanyStats stats={stats} />

			{/* Search */}
			<CompanySearch searchTerm={searchTerm} onSearchChange={setSearchTerm} isSearching={isSearching} />

			{/* Companies Table */}
			<CompaniesTable
				filters={
					<CompanyFilters statusFilter={statusFilter} onStatusChange={setStatusFilter} statusCounts={stats} />
				}
				companies={companies}
				isLoading={isLoading}
				deletingCompanyId={companyToDelete?.id || null}
				onEdit={handleEditCompany}
				onDelete={handleDeleteClick}
				onCreateFirst={handleAddCompany}
				hasActiveFilters={hasActiveFilters}
			/>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex flex-col items-center mt-8 space-y-4">
					<UniversalPagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
				</div>
			)}

			{/* Create Company Modal */}
			<CompanyModal
				isOpen={isCreateModalOpen}
				mode="create"
				isSubmitting={isSubmitting}
				onSubmit={handleCreateCompany}
				onClose={handleCloseCreateModal}
			/>

			{/* Edit Company Modal */}
			<CompanyModal
				isOpen={isEditModalOpen}
				mode="edit"
				company={selectedCompany}
				isSubmitting={isSubmitting}
				onSubmit={handleUpdateCompany}
				onClose={handleCloseEditModal}
			/>

			{/* Delete Confirmation Modal */}
			<DeleteConfirmationModal
				isOpen={isDeleteModalOpen}
				companyName={companyToDelete?.name}
				isDeleting={isSubmitting}
				onConfirm={handleConfirmDelete}
				onCancel={handleCancelDelete}
			/>
		</Container>
	);
}
