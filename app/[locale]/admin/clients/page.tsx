'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounceSearch } from '@/hooks/use-debounced-search';
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
import { ClientFilters } from './components/client-filters';
import { ClientsTable } from './components/clients-table';
import { ClientFormModal, DeleteConfirmationModal } from './components/client-modal';
import { LoadingSkeleton } from './components/loading-skeleton';

// Hooks & Utils
import { useClientFilters } from './hooks/use-client-filters';
import { calculateActiveFilterCount } from './utils/client-helpers';

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
	const isInitialLoad = useRef(true);

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

	// Filters hook
	const {
		filters,
		searchTerm,
		statusFilter,
		planFilter,
		accountTypeFilter,
		providerFilter,
		datePreset,
		customDateFrom,
		customDateTo,
		dateFilterType,
		createdAfter,
		createdBefore,
		updatedAfter,
		updatedBefore,
		setSearchTerm,
		setStatusFilter,
		setPlanFilter,
		setAccountTypeFilter,
		setProviderFilter,
		setDatePreset,
		setCustomDateFrom,
		setCustomDateTo,
		setDateFilterType,
		clearFilters
	} = useClientFilters();

	// Debounced search
	const { debouncedValue: debouncedSearchTerm, isSearching } = useDebounceSearch({
		searchValue: searchTerm,
		delay: 300,
		onSearch: () => {
			if (!isInitialLoad.current && currentPage !== 1) {
				setCurrentPage(1);
			}
		}
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

	// Calculate active filters
	const activeFilterCount = calculateActiveFilterCount(filters);
	const hasActiveFilters = activeFilterCount > 0;

	// Check if skeleton should be shown (only on initial page load)
	const shouldShowSkeleton = useSkeletonVisibility(isLoading, clients.length > 0);

	// Mark initial load complete
	useEffect(() => {
		if (!isLoading && loadingStates.initial) {
			setLoadingStates((prev) => ({ ...prev, initial: false }));
		}
	}, [isLoading, loadingStates.initial]);

	// Reset initial load flag
	useEffect(() => {
		isInitialLoad.current = false;
	}, []);

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
		<div className="p-6 max-w-7xl mx-auto">
			{/* Page Header */}
			<PageHeader onAddClient={openCreateForm} />

			{/* Stats Cards */}
			<ClientStats stats={stats} />

			{/* Filters */}
			<ClientFilters
				searchTerm={searchTerm}
				statusFilter={statusFilter}
				planFilter={planFilter}
				accountTypeFilter={accountTypeFilter}
				providerFilter={providerFilter}
				datePreset={datePreset}
				customDateFrom={customDateFrom}
				customDateTo={customDateTo}
				dateFilterType={dateFilterType}
				onSearchChange={setSearchTerm}
				onStatusChange={setStatusFilter}
				onPlanChange={setPlanFilter}
				onAccountTypeChange={setAccountTypeFilter}
				onProviderChange={setProviderFilter}
				onDatePresetChange={setDatePreset}
				onCustomDateFromChange={setCustomDateFrom}
				onCustomDateToChange={setCustomDateTo}
				onDateFilterTypeChange={setDateFilterType}
				onClearFilters={clearFilters}
				activeFilterCount={activeFilterCount}
				isSearching={isSearching}
			/>

			{/* Clients Table */}
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
				hasActiveFilters={hasActiveFilters}
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
		</div>
	);
}
