'use client';

import { useState, useCallback } from 'react';
import { useAdminFilters } from '@/hooks/use-admin-filters';
import { useSkeletonVisibility } from '@/hooks/use-skeleton-visibility';
import { useAdminCompanies } from '@/hooks/use-admin-companies';
import { useCompaniesEnabled } from '@/hooks/use-companies-enabled';
import { UniversalPagination } from '@/components/universal-pagination';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { Company } from '@/types/company';
import type { CreateCompanyInput, UpdateCompanyInput } from '@/lib/validations/company';

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
		hasActiveFilters,
	} = useAdminFilters<CompanyStatus>({
		minSearchLength: 2,
		debounceDelay: 300,
		onFiltersChange: () => setCurrentPage(1),
	});

	// Data fetching hook
	const {
		companies,
		stats,
		total,
		page,
		totalPages,
		isLoading,
		isSubmitting,
		createCompany,
		updateCompany,
		deleteCompany
	} = useAdminCompanies({
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
		<div className="p-6 max-w-7xl mx-auto">
			{/* Warning Banner - Companies Disabled */}
			{!companiesEnabled && (
				<div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 rounded-lg shadow-md">
					<div className="flex items-start">
						<div className="shrink-0">
							<svg
								className="h-6 w-6 text-yellow-400 dark:text-yellow-500"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
						</div>
						<div className="ml-3 flex-1">
							<h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
								{t('WARNING_DISABLED_TITLE')}
							</h3>
							<div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
								<p>{t('WARNING_DISABLED_MESSAGE')}</p>
							</div>
							<div className="mt-4">
								<Link
									href="/admin/settings"
									className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 dark:hover:bg-yellow-900/60 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
								>
									{t('WARNING_DISABLED_ACTION')}
									<svg
										className="ml-2 -mr-0.5 h-4 w-4"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
										aria-hidden="true"
									>
										<path
											fillRule="evenodd"
											d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
											clipRule="evenodd"
										/>
									</svg>
								</Link>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Page Header */}
			<PageHeader onAddCompany={handleAddCompany} />

			{/* Stats Cards */}
			<CompanyStats stats={stats} />

			{/* Search */}
			<CompanySearch
				searchTerm={searchTerm}
				onSearchChange={setSearchTerm}
				isSearching={isSearching}
			/>

			{/* Companies Table */}
			<CompaniesTable
				filters={
					<CompanyFilters
						statusFilter={statusFilter}
						onStatusChange={setStatusFilter}
						statusCounts={stats}
					/>
				}
				companies={companies}
				totalCount={total}
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
		</div>
	);
}
