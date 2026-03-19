import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import type { Company } from '@/types/company';

// Types

export interface CompanyStats {
	total: number;
	active: number;
	inactive: number;
}

export interface CompaniesListOptions {
	page?: number;
	limit?: number;
	search?: string;
	status?: 'active' | 'inactive';
	sortBy?: 'name' | 'createdAt' | 'updatedAt';
	sortOrder?: 'asc' | 'desc';
}

export interface CompaniesListResponse {
	success: boolean;
	data: {
		companies: Company[];
	};
	meta: {
		page: number;
		totalPages: number;
		total: number;
		limit: number;
		activeCount: number;
		inactiveCount: number;
	};
}

export interface CompanyResponse {
	success: boolean;
	data: Company;
}

export interface CreateCompanyRequest {
	name: string;
	website?: string;
	domain?: string;
	slug?: string;
	status?: 'active' | 'inactive';
}

export interface UpdateCompanyRequest extends Partial<CreateCompanyRequest> {
	id: string;
}

// Query keys factory
const QUERY_KEYS = {
	companies: ['admin', 'companies'] as const,
	companiesList: (params: CompaniesListOptions) => [...QUERY_KEYS.companies, 'list', params] as const,
	company: (id: string) => [...QUERY_KEYS.companies, 'detail', id] as const
} as const;

// API functions
const fetchCompaniesList = async (params: CompaniesListOptions = {}): Promise<CompaniesListResponse> => {
	const url = apiUtils.buildUrl('/api/admin/companies', {
		page: params.page,
		limit: params.limit,
		q: params.search,
		status: params.status,
		sortBy: params.sortBy,
		sortOrder: params.sortOrder
	});

	const response = await serverClient.get<CompaniesListResponse>(url);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	return response.data;
};

const fetchCompany = async (id: string): Promise<Company> => {
	const response = await serverClient.get<CompanyResponse>(`/api/admin/companies/${encodeURIComponent(id)}`);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	if (!response.data.success) {
		throw new Error('Failed to fetch company');
	}

	return response.data.data;
};

const createCompany = async (data: CreateCompanyRequest): Promise<Company> => {
	const response = await serverClient.post<CompanyResponse>('/api/admin/companies', data);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	if (!response.data.success) {
		throw new Error('Failed to create company');
	}

	return response.data.data;
};

const updateCompany = async (id: string, data: UpdateCompanyRequest): Promise<Company> => {
	const response = await serverClient.put<CompanyResponse>(`/api/admin/companies/${encodeURIComponent(id)}`, data);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}

	if (!response.data.success) {
		throw new Error('Failed to update company');
	}

	return response.data.data;
};

const deleteCompany = async (id: string): Promise<void> => {
	const response = await serverClient.delete(`/api/admin/companies/${encodeURIComponent(id)}`);

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response));
	}
};

// Hook interfaces
export interface UseAdminCompaniesOptions {
	params?: CompaniesListOptions;
	enabled?: boolean;
}

export interface UseAdminCompaniesReturn {
	// Data
	companies: Company[];
	stats: CompanyStats;
	total: number;
	page: number;
	totalPages: number;
	limit: number;

	// Loading states
	isLoading: boolean;
	isSubmitting: boolean;

	// Actions
	createCompany: (data: CreateCompanyRequest) => Promise<boolean>;
	updateCompany: (id: string, data: UpdateCompanyRequest) => Promise<boolean>;
	deleteCompany: (id: string) => Promise<boolean>;

	// Utility
	refetch: () => void;
	refreshData: () => void;
}

// Main hook
export function useAdminCompanies(options: UseAdminCompaniesOptions = {}): UseAdminCompaniesReturn {
	const { params = {}, enabled = true } = options;
	const queryClient = useQueryClient();

	// Fetch companies list
	const {
		data: listData,
		isLoading,
		refetch
	} = useQuery({
		queryKey: QUERY_KEYS.companiesList(params),
		queryFn: () => fetchCompaniesList(params),
		enabled,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 3,
		placeholderData: keepPreviousData
	});

	// Create company mutation
	const createCompanyMutation = useMutation({
		mutationFn: createCompany,
		onSuccess: () => {
			toast.success('Company created successfully');
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
		},
		onError: (error) => {
			toast.error(error.message || 'Failed to create company');
		}
	});

	// Update company mutation
	const updateCompanyMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateCompanyRequest }) => updateCompany(id, data),
		onSuccess: () => {
			toast.success('Company updated successfully');
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
		},
		onError: (error) => {
			toast.error(error.message || 'Failed to update company');
		}
	});

	// Delete company mutation
	const deleteCompanyMutation = useMutation({
		mutationFn: deleteCompany,
		onSuccess: () => {
			toast.success('Company deleted successfully');
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
		},
		onError: (error) => {
			toast.error(error.message || 'Failed to delete company');
		}
	});

	// Action handlers
	const handleCreateCompany = useCallback(
		async (data: CreateCompanyRequest): Promise<boolean> => {
			try {
				await createCompanyMutation.mutateAsync(data);
				return true;
			} catch {
				return false;
			}
		},
		[createCompanyMutation]
	);

	const handleUpdateCompany = useCallback(
		async (id: string, data: UpdateCompanyRequest): Promise<boolean> => {
			try {
				await updateCompanyMutation.mutateAsync({ id, data });
				return true;
			} catch {
				return false;
			}
		},
		[updateCompanyMutation]
	);

	const handleDeleteCompany = useCallback(
		async (id: string): Promise<boolean> => {
			try {
				await deleteCompanyMutation.mutateAsync(id);
				return true;
			} catch {
				return false;
			}
		},
		[deleteCompanyMutation]
	);

	const refreshData = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
	}, [queryClient]);

	// Get stats from API (global counts, not page-level)
	const companies = listData?.data.companies || [];
	const stats: CompanyStats = {
		total: listData?.meta.total || 0,
		active: listData?.meta.activeCount || 0,
		inactive: listData?.meta.inactiveCount || 0
	};

	return {
		// Data
		companies,
		stats,
		total: listData?.meta.total || 0,
		page: listData?.meta.page || 1,
		totalPages: listData?.meta.totalPages || 1,
		limit: listData?.meta.limit || 10,

		// Loading states
		isLoading,
		isSubmitting:
			createCompanyMutation.isPending || updateCompanyMutation.isPending || deleteCompanyMutation.isPending,

		// Actions
		createCompany: handleCreateCompany,
		updateCompany: handleUpdateCompany,
		deleteCompany: handleDeleteCompany,

		// Utility
		refetch,
		refreshData
	};
}

// Hook for single company
export interface UseCompanyOptions {
	id: string;
	enabled?: boolean;
}

export interface UseCompanyReturn {
	company: Company | null;
	isLoading: boolean;
	error: Error | null;
	refetch: () => void;
}

export function useCompany({ id, enabled = true }: UseCompanyOptions): UseCompanyReturn {
	const {
		data: company,
		isLoading,
		error,
		refetch
	} = useQuery({
		queryKey: QUERY_KEYS.company(id),
		queryFn: () => fetchCompany(id),
		enabled: enabled && !!id,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		retry: 3
	});

	return {
		company: company || null,
		isLoading,
		error: error as Error | null,
		refetch
	};
}
