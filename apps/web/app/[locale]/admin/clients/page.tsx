'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSkeletonVisibility } from '@/hooks/use-skeleton-visibility';
import { useDisclosure } from '@heroui/react';
import { toast } from 'sonner';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAdminClients } from '@/hooks/use-admin-clients';
import { useTranslations } from 'next-intl';
import type { CreateClientRequest, UpdateClientRequest } from '@/lib/types/client';
import type { ClientProfileWithAuth } from '@/lib/db/queries';
import type { ClientsLoadingState } from '@/types/loading';
import { UniversalPagination } from '@/components/universal-pagination';

// Components
import { PageHeader } from './components/page-header';
import { ClientStats } from './components/client-stats';
import { ClientSearch, ClientFilterBar, ClientActiveFilters } from './components/client-filters';
import { ClientsTable } from './components/clients-table';
import { ClientFormModal, DeleteConfirmationModal } from './components/client-modal';
import { LoadingSkeleton } from './components/loading-skeleton';

// Hooks
import { useClientFilters } from './hooks/use-client-filters';
import { Container } from '@/components/ui/container';

/**
 * Clients Page Component
 * Main orchestrator for the clients management page
 * Following SOLID Principles:
 * - SRP: Only responsible for orchestrating child components
 * - OCP: Open for extension (new components) without modifying existing logic
 * - DIP: Depends on abstractions (hooks, components) not concrete implementations
 */
export default function ClientsPage() {
	const t = useTranslations('admin.ADMIN_CLIENTS_PAGE');
	const router = useRouter();
	const params = useParams<{ locale: string }>();
	const searchParams = useSearchParams();

	// UI state
	const [selectedClient, setSelectedClient] = useState<ClientProfileWithAuth | null>(null);
	const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
	const [navigatingClientId, setNavigatingClientId] = useState<string | null>(null);
	const [clientToDelete, setClientToDelete] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [limit] = useState(10);

	// Loading states
	const [loadingStates, setLoadingStates] = useState<ClientsLoadingState>({
		initial: true,
		searching: false,
		filtering: false,
		paginating: false,
		submitting: false,
		deleting: null as string | null
	});

	// Modals
	const { isOpen, onOpen, onClose } = useDisclosure();
	const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

	// Filters hook with page reset callback
	const {
		searchTerm,
		setSearchTerm,
		debouncedSearchTerm,
		isSearching,
		hasActiveSearch,
		statusFilter,
		setStatusFilter,
		planFilter,
		accountTypeFilter,
		providerFilter,
		setPlanFilter,
		setAccountTypeFilter,
		setProviderFilter,
		datePreset,
		customDateFrom,
		customDateTo,
		dateFilterType,
		setDatePreset,
		setCustomDateFrom,
		setCustomDateTo,
		setDateFilterType,
		createdAfter,
		createdBefore,
		updatedAfter,
		updatedBefore,
		clearFilters,
		hasActiveFiltersIncludingDate
	} = useClientFilters({
		onFiltersChange: () => setCurrentPage(1)
	});

	// Data fetching hook
	const {
		clients,
		stats,
		total: totalCount,
		page,
		totalPages,
		isLoading,
		isSubmitting,
		createClient,
		updateClient,
		deleteClient
	} = useAdminClients({
		params: {
			page: currentPage,
			limit,
			search: debouncedSearchTerm,
			status: statusFilter as 'active' | 'inactive' | 'suspended' | 'trial' | undefined,
			plan: planFilter as 'free' | 'standard' | 'premium' | undefined,
			accountType: accountTypeFilter as 'individual' | 'business' | 'enterprise' | undefined,
			provider: providerFilter,
			createdAfter,
			createdBefore,
			updatedAfter,
			updatedBefore,
			sortBy: 'createdAt',
			sortOrder: 'desc'
		}
	});

	// Check if skeleton should be shown (only on initial page load)
	const shouldShowSkeleton = useSkeletonVisibility(isLoading, clients.length > 0);

	// Mark initial load complete
	useEffect(() => {
		if (!isLoading && loadingStates.initial) {
			setLoadingStates((prev) => ({ ...prev, initial: false }));
		}
	}, [isLoading, loadingStates.initial]);

	// URL param handlers
	const clearEditParam = useCallback(() => {
		if (typeof window === 'undefined') return;
		const url = new URL(window.location.href);
		url.searchParams.delete('edit');
		const nextHref = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '');
		router.replace(nextHref);
	}, [router]);

	const closeForm = useCallback(() => {
		onClose();
		clearEditParam();
		setSelectedClient(null);
	}, [onClose, clearEditParam]);

	// CRUD Handlers
	const handleCreate = useCallback(
		async (data: CreateClientRequest) => {
			const success = await createClient(data);
			if (success) {
				closeForm();
			}
		},
		[createClient, closeForm]
	);

	const handleUpdate = useCallback(
		async (data: UpdateClientRequest) => {
			const success = await updateClient(data.id, data);
			if (success) {
				closeForm();
			}
		},
		[updateClient, closeForm]
	);

	const handleDelete = useCallback(
		async (clientId: string) => {
			setClientToDelete(clientId);
			onDeleteOpen();
		},
		[onDeleteOpen]
	);

	const confirmDelete = useCallback(async () => {
		if (!clientToDelete) return;
		setLoadingStates((prev) => ({ ...prev, deleting: clientToDelete }));
		try {
			const success = await deleteClient(clientToDelete);
			if (success) {
				setClientToDelete(null);
				onDeleteClose();
			}
		} finally {
			setLoadingStates((prev) => ({ ...prev, deleting: null }));
		}
	}, [clientToDelete, deleteClient, onDeleteClose]);

	const cancelDelete = useCallback(() => {
		setClientToDelete(null);
		onDeleteClose();
	}, [onDeleteClose]);

	// Form handlers
	const openCreateForm = useCallback(() => {
		setSelectedClient(null);
		setFormMode('create');
		onOpen();
	}, [onOpen]);

	const openEditForm = useCallback(
		(client: ClientProfileWithAuth) => {
			setSelectedClient(client);
			setFormMode('edit');
			onOpen();
		},
		[onOpen]
	);

	const handleFormSubmit = useCallback(
		async (data: CreateClientRequest | UpdateClientRequest) => {
			if (formMode === 'create') {
				await handleCreate(data as CreateClientRequest);
			} else {
				await handleUpdate(data as UpdateClientRequest);
			}
		},
		[formMode, handleCreate, handleUpdate]
	);

	// View client details
	const viewClientDetails = useCallback(
		(clientId: string) => {
			setNavigatingClientId(clientId);
			const locale = (params?.locale ?? 'en').toString();
			const safeLocale = encodeURIComponent(locale);
			const safeId = encodeURIComponent(clientId);
			router.push(`/${safeLocale}/admin/clients/${safeId}`);
		},
		[params, router]
	);

	// Pagination
	const handlePageChange = useCallback((page: number) => {
		setCurrentPage(page);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}, []);

	// Handle edit URL parameter
	useEffect(() => {
		const editId = searchParams.get('edit');
		if (editId) {
			const existing = clients.find((c) => c.id === editId);
			if (existing) {
				setSelectedClient(existing);
				setFormMode('edit');
				onOpen();
				return;
			}

			if (!isLoading) {
				toast.error(t('CLIENT_NOT_FOUND'));
			}
		}
		// Note: Don't close the modal here - it should only be closed explicitly
		// by user action or when edit param is removed after being set
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParams, clients, isLoading]);

	// Loading state - only show skeleton on initial page load
	if (shouldShowSkeleton) {
		return <LoadingSkeleton />;
	}

	return (
		<Container useGlobalWidth>
			{/* Page Header */}
			<PageHeader onAddClient={openCreateForm} />

			{/* Stats Cards */}
			<ClientStats stats={stats} />

			{/* Search */}
			<ClientSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} isSearching={isSearching} />

			{/* Clients Table with Filters in Header */}
			<ClientsTable
				clients={clients}
				totalCount={totalCount}
				isLoading={isLoading}
				navigatingClientId={navigatingClientId}
				deletingClientId={loadingStates.deleting}
				onView={viewClientDetails}
				onEdit={openEditForm}
				onDelete={handleDelete}
				onCreateFirst={openCreateForm}
				hasActiveFilters={hasActiveFiltersIncludingDate}
				filterBar={
					<ClientFilterBar
						statusFilter={statusFilter}
						onStatusChange={setStatusFilter}
						planFilter={planFilter}
						accountTypeFilter={accountTypeFilter}
						providerFilter={providerFilter}
						onPlanChange={setPlanFilter}
						onAccountTypeChange={setAccountTypeFilter}
						onProviderChange={setProviderFilter}
						datePreset={datePreset}
						customDateFrom={customDateFrom}
						customDateTo={customDateTo}
						dateFilterType={dateFilterType}
						onDatePresetChange={setDatePreset}
						onCustomDateFromChange={setCustomDateFrom}
						onCustomDateToChange={setCustomDateTo}
						onDateFilterTypeChange={setDateFilterType}
						onClearFilters={clearFilters}
						totalCount={totalCount}
						stats={stats}
					/>
				}
				activeFilters={
					<ClientActiveFilters
						searchTerm={searchTerm}
						onSearchChange={setSearchTerm}
						hasActiveSearch={hasActiveSearch}
						planFilter={planFilter}
						accountTypeFilter={accountTypeFilter}
						providerFilter={providerFilter}
						onPlanChange={setPlanFilter}
						onAccountTypeChange={setAccountTypeFilter}
						onProviderChange={setProviderFilter}
						datePreset={datePreset}
						customDateFrom={customDateFrom}
						customDateTo={customDateTo}
						dateFilterType={dateFilterType}
						onDatePresetChange={setDatePreset}
						onCustomDateFromChange={setCustomDateFrom}
						onCustomDateToChange={setCustomDateTo}
						onDateFilterTypeChange={setDateFilterType}
						onClearFilters={clearFilters}
					/>
				}
			/>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex flex-col items-center mt-8 space-y-4">
					<UniversalPagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
				</div>
			)}

			{/* Client Form Modal */}
			<ClientFormModal
				isOpen={isOpen}
				mode={formMode}
				selectedClient={selectedClient}
				isSubmitting={isSubmitting}
				onSubmit={handleFormSubmit}
				onClose={closeForm}
			/>

			{/* Delete Confirmation Modal */}
			<DeleteConfirmationModal
				isOpen={isDeleteOpen}
				isDeleting={loadingStates.deleting !== null}
				onConfirm={confirmDelete}
				onCancel={cancelDelete}
			/>
		</Container>
	);
}
