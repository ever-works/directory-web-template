import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import {
	CreateClientRequest,
	UpdateClientRequest,
	ClientDashboardResponse,
	ClientDashboardOptions,
	ClientStats,
	ClientResponse
} from '@/lib/types/client';
import { ClientProfileWithAuth } from '@/lib/db/queries';

// Query keys factory
const QUERY_KEYS = {
	clients: ['admin', 'clients'] as const,
	clientsDashboard: (params: ClientDashboardOptions) => [...QUERY_KEYS.clients, 'dashboard', params] as const,
	client: (id: string) => [...QUERY_KEYS.clients, 'detail', id] as const,
	clientsStats: () => [...QUERY_KEYS.clients, 'stats'] as const
} as const;

// API functions
const fetchClientsDashboard = async (params: ClientDashboardOptions = {}): Promise<ClientDashboardResponse> => {
	const searchParams = new URLSearchParams();

	// Pagination
	if (params.page) searchParams.set('page', params.page.toString());
	if (params.limit) searchParams.set('limit', params.limit.toString());

	// Filters
	if (params.search) searchParams.set('search', params.search);
	if (params.status) searchParams.set('status', params.status);
	if (params.plan) searchParams.set('plan', params.plan);
	if (params.accountType) searchParams.set('accountType', params.accountType);
	if (params.provider) searchParams.set('provider', params.provider);

	// Date filters
	if (params.createdAfter) searchParams.set('createdAfter', params.createdAfter);
	if (params.createdBefore) searchParams.set('createdBefore', params.createdBefore);
	if (params.updatedAfter) searchParams.set('updatedAfter', params.updatedAfter);
	if (params.updatedBefore) searchParams.set('updatedBefore', params.updatedBefore);

	// Sorting
	if (params.sortBy) searchParams.set('sortBy', params.sortBy);
	if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

	const response = await serverClient.get<ClientDashboardResponse>(
		`/api/admin/clients/dashboard?${searchParams.toString()}`
	);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	return response.data;
};

const fetchClient = async (id: string): Promise<ClientProfileWithAuth> => {
	const response = await serverClient.get<ClientResponse>(`/api/admin/clients/${encodeURIComponent(id)}`);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	if (!response.data.success) {
		throw new Error(response.data.error || 'Failed to fetch client');
	}

	return response.data.data;
};

const createClient = async (data: CreateClientRequest): Promise<ClientProfileWithAuth> => {
	const response = await serverClient.post<ClientResponse>('/api/admin/clients', data);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	if (!response.data.success) {
		throw new Error(response.data.error || 'Failed to create client');
	}

	return response.data.data;
};

const updateClient = async (id: string, data: UpdateClientRequest): Promise<ClientProfileWithAuth> => {
	const response = await serverClient.put<ClientResponse>(`/api/admin/clients/${encodeURIComponent(id)}`, data);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	if (!response.data.success) {
		throw new Error(response.data.error || 'Failed to update client');
	}

	return response.data.data;
};

const deleteClient = async (id: string): Promise<void> => {
	const response = await serverClient.delete(`/api/admin/clients/${encodeURIComponent(id)}`);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}
};

// Hook interfaces
export interface UseAdminClientsOptions {
	params?: ClientDashboardOptions;
	enabled?: boolean;
}

export interface UseAdminClientsReturn {
	// Data
	clients: ClientProfileWithAuth[];
	stats: ClientStats;
	total: number;
	page: number;
	totalPages: number;
	limit: number;

	// Loading states
	isLoading: boolean;
	isSubmitting: boolean;

	// Actions
	createClient: (data: CreateClientRequest) => Promise<boolean>;
	updateClient: (id: string, data: UpdateClientRequest) => Promise<boolean>;
	deleteClient: (id: string) => Promise<boolean>;

	// Utility
	refetch: () => void;
	refreshData: () => void;
}

// Main hook
export function useAdminClients(options: UseAdminClientsOptions = {}): UseAdminClientsReturn {
	const { params = {}, enabled = true } = options;
	const queryClient = useQueryClient();

	// Fetch clients dashboard
	const {
		data: dashboardData,
		isLoading,
		error: _error,
		refetch
	} = useQuery({
		queryKey: QUERY_KEYS.clientsDashboard(params),
		queryFn: () => fetchClientsDashboard(params),
		enabled,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 3,
		placeholderData: keepPreviousData
	});

	// Create client mutation
	const createClientMutation = useMutation({
		mutationFn: createClient,
		onSuccess: () => {
			toast.success('Client created successfully');
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clients });
		},
		onError: (error) => {
			toast.error(error.message || 'Failed to create client');
		}
	});

	// Update client mutation
	const updateClientMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateClientRequest }) => updateClient(id, data),
		onSuccess: () => {
			toast.success('Client updated successfully');
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clients });
		},
		onError: (error) => {
			toast.error(error.message || 'Failed to update client');
		}
	});

	// Delete client mutation
	const deleteClientMutation = useMutation({
		mutationFn: deleteClient,
		onSuccess: () => {
			toast.success('Client deleted successfully');
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clients });
		},
		onError: (error) => {
			toast.error(error.message || 'Failed to delete client');
		}
	});

	// Action handlers
	const handleCreateClient = useCallback(
		async (data: CreateClientRequest): Promise<boolean> => {
			try {
				await createClientMutation.mutateAsync(data);
				return true;
			} catch {
				return false;
			}
		},
		[createClientMutation]
	);

	const handleUpdateClient = useCallback(
		async (id: string, data: UpdateClientRequest): Promise<boolean> => {
			try {
				await updateClientMutation.mutateAsync({ id, data });
				return true;
			} catch {
				return false;
			}
		},
		[updateClientMutation]
	);

	const handleDeleteClient = useCallback(
		async (id: string): Promise<boolean> => {
			try {
				await deleteClientMutation.mutateAsync(id);
				return true;
			} catch {
				return false;
			}
		},
		[deleteClientMutation]
	);

	const refreshData = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clients });
	}, [queryClient]);

	return {
		// Data
		clients: dashboardData?.data.clients || [],
		stats: dashboardData?.data.stats || {
			overview: { total: 0, active: 0, inactive: 0, suspended: 0, trial: 0 },
			byProvider: {},
			byPlan: {},
			byAccountType: {},
			byStatus: {},
			activity: { newThisWeek: 0, newThisMonth: 0, activeThisWeek: 0, activeThisMonth: 0 },
			growth: { weeklyGrowth: 0, monthlyGrowth: 0 }
		},
		total: dashboardData?.data.pagination.total || 0,
		page: dashboardData?.data.pagination.page || 1,
		totalPages: dashboardData?.data.pagination.totalPages || 1,
		limit: dashboardData?.data.pagination.limit || 10,

		// Loading states
		isLoading,
		isSubmitting:
			createClientMutation.isPending || updateClientMutation.isPending || deleteClientMutation.isPending,

		// Actions
		createClient: handleCreateClient,
		updateClient: handleUpdateClient,
		deleteClient: handleDeleteClient,

		// Utility
		refetch,
		refreshData
	};
}

// Hook for single client
export interface UseClientOptions {
	id: string;
	enabled?: boolean;
}

export interface UseClientReturn {
	client: ClientProfileWithAuth | null;
	isLoading: boolean;
	error: Error | null;
	refetch: () => void;
}

export function useClient({ id, enabled = true }: UseClientOptions): UseClientReturn {
	const {
		data: client,
		isLoading,
		error,
		refetch
	} = useQuery({
		queryKey: QUERY_KEYS.client(id),
		queryFn: () => fetchClient(id),
		enabled: enabled && !!id,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		retry: 3
	});

	return {
		client: client || null,
		isLoading,
		error: error as Error | null,
		refetch
	};
}

// Hook for client mutations only
export interface UseClientMutationsReturn {
	createClient: (data: CreateClientRequest) => Promise<boolean>;
	updateClient: (id: string, data: UpdateClientRequest) => Promise<boolean>;
	deleteClient: (id: string) => Promise<boolean>;
	isSubmitting: boolean;
}

export function useClientMutations(): UseClientMutationsReturn {
	const queryClient = useQueryClient();

	// Create client mutation
	const createClientMutation = useMutation({
		mutationFn: createClient,
		onSuccess: () => {
			toast.success('Client created successfully');
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clients });
		},
		onError: (error) => {
			toast.error(error.message || 'Failed to create client');
		}
	});

	// Update client mutation
	const updateClientMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateClientRequest }) => updateClient(id, data),
		onSuccess: () => {
			toast.success('Client updated successfully');
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clients });
		},
		onError: (error) => {
			toast.error(error.message || 'Failed to update client');
		}
	});

	// Delete client mutation
	const deleteClientMutation = useMutation({
		mutationFn: deleteClient,
		onSuccess: () => {
			toast.success('Client deleted successfully');
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clients });
		},
		onError: (error) => {
			toast.error(error.message || 'Failed to delete client');
		}
	});

	const handleCreateClient = useCallback(
		async (data: CreateClientRequest): Promise<boolean> => {
			try {
				await createClientMutation.mutateAsync(data);
				return true;
			} catch {
				return false;
			}
		},
		[createClientMutation]
	);

	const handleUpdateClient = useCallback(
		async (id: string, data: UpdateClientRequest): Promise<boolean> => {
			try {
				await updateClientMutation.mutateAsync({ id, data });
				return true;
			} catch {
				return false;
			}
		},
		[updateClientMutation]
	);

	const handleDeleteClient = useCallback(
		async (id: string): Promise<boolean> => {
			try {
				await deleteClientMutation.mutateAsync(id);
				return true;
			} catch {
				return false;
			}
		},
		[deleteClientMutation]
	);

	return {
		createClient: handleCreateClient,
		updateClient: handleUpdateClient,
		deleteClient: handleDeleteClient,
		isSubmitting: createClientMutation.isPending || updateClientMutation.isPending || deleteClientMutation.isPending
	};
}

// Hook for client stats only
export interface UseClientStatsOptions {
	params?: Omit<ClientDashboardOptions, 'page' | 'limit'>;
	enabled?: boolean;
}

export interface UseClientStatsReturn {
	stats: ClientStats;
	isLoading: boolean;
	error: Error | null;
	refetch: () => void;
}

export function useClientStats(options: UseClientStatsOptions = {}): UseClientStatsReturn {
	const { params = {}, enabled = true } = options;

	const {
		data: dashboardData,
		isLoading,
		error,
		refetch
	} = useQuery({
		queryKey: QUERY_KEYS.clientsDashboard({ ...params, page: 1, limit: 1 }), // Only need stats
		queryFn: () => fetchClientsDashboard({ ...params, page: 1, limit: 1 }),
		enabled,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		retry: 3
	});

	return {
		stats: dashboardData?.data.stats || {
			overview: { total: 0, active: 0, inactive: 0, suspended: 0, trial: 0 },
			byProvider: {},
			byPlan: {},
			byAccountType: {},
			byStatus: {},
			activity: { newThisWeek: 0, newThisMonth: 0, activeThisWeek: 0, activeThisMonth: 0 },
			growth: { weeklyGrowth: 0, monthlyGrowth: 0 }
		},
		isLoading,
		error: error as Error | null,
		refetch
	};
}
