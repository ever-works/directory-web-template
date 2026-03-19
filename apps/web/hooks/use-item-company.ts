import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { serverClient } from '@/lib/api/server-api-client';
import type { Company } from '@/types/company';

// Types
export interface ItemCompanyAssignment {
	itemSlug: string;
	companyId: string;
	company?: Company;
}

export interface AssignCompanyRequest {
	itemSlug: string;
	companyId: string;
}

export interface ItemCompanyResponse {
	success: boolean;
	data: Company | null;
}

export interface AssignCompanyResponse {
	success: boolean;
	data: {
		itemSlug: string;
		companyId: string;
		createdAt: string;
		updatedAt: string;
	};
	created: boolean;
}

export interface RemoveCompanyResponse {
	success: boolean;
	deleted: boolean;
}

// Query keys factory
const QUERY_KEYS = {
	itemCompany: (itemSlug: string) => ['item-company', itemSlug] as const,
} as const;

// API functions
async function fetchItemCompany(itemSlug: string): Promise<Company | null> {
	const normalizedSlug = itemSlug.toLowerCase().trim();
	const response = await serverClient.get<ItemCompanyResponse>(`/api/items/${normalizedSlug}/company`);

	if (!response.success || !response.data) {
		throw new Error(response.error || 'Failed to fetch item company');
	}

	return response.data.data || null;
}

async function assignCompany(itemSlug: string, companyId: string): Promise<AssignCompanyResponse> {
	const normalizedSlug = itemSlug.toLowerCase().trim();
	const response = await serverClient.post<AssignCompanyResponse>(`/api/items/${normalizedSlug}/company`, {
		companyId,
	});

	if (!response.success || !response.data) {
		throw new Error(response.error || 'Failed to assign company');
	}

	return response.data;
}

async function removeCompany(itemSlug: string): Promise<RemoveCompanyResponse> {
	const normalizedSlug = itemSlug.toLowerCase().trim();
	const response = await serverClient.delete<RemoveCompanyResponse>(`/api/items/${normalizedSlug}/company`);

	if (!response.success || !response.data) {
		throw new Error(response.error || 'Failed to remove company');
	}

	return response.data;
}

// Hook options
export interface UseItemCompanyOptions {
	itemSlug: string;
	enabled?: boolean;
}

// Hook return type
export interface UseItemCompanyReturn {
	company: Company | null;
	isLoading: boolean;
	isAssigning: boolean;
	isRemoving: boolean;
	assignCompany: (companyId: string) => Promise<boolean>;
	removeCompany: () => Promise<boolean>;
	refetch: () => void;
}

/**
 * Hook for managing item-company associations
 * Provides functionality to assign and remove companies from items
 */
export function useItemCompany({ itemSlug, enabled = true }: UseItemCompanyOptions): UseItemCompanyReturn {
	const queryClient = useQueryClient();

	// Fetch current company assignment
	const {
		data: company,
		isLoading,
		refetch,
	} = useQuery({
		queryKey: QUERY_KEYS.itemCompany(itemSlug),
		queryFn: () => fetchItemCompany(itemSlug),
		enabled: enabled && !!itemSlug,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 2,
	});

	// Assign company mutation
	const assignMutation = useMutation({
		mutationFn: (companyId: string) => assignCompany(itemSlug, companyId),
		onSuccess: (response) => {
			if (response.created) {
				toast.success('Company assigned to item successfully');
			} else {
				toast.info('Company assignment already exists');
			}
			// Invalidate queries to refresh data
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.itemCompany(itemSlug) });
		},
		onError: (error: any) => {
			const errorMessage = error.response?.data?.error || error.message || 'Failed to assign company';

			if (error.response?.status === 409) {
				toast.error(errorMessage);
			} else {
				toast.error('Failed to assign company to item');
			}
		},
	});

	// Remove company mutation
	const removeMutation = useMutation({
		mutationFn: () => removeCompany(itemSlug),
		onSuccess: (response) => {
			if (response.deleted) {
				toast.success('Company removed from item successfully');
			} else {
				toast.info('No company assignment to remove');
			}
			// Invalidate queries to refresh data
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.itemCompany(itemSlug) });
		},
		onError: (error: any) => {
			const errorMessage = error.response?.data?.error || error.message || 'Failed to remove company';
			toast.error(errorMessage);
		},
	});

	// Action handlers
	const handleAssignCompany = async (companyId: string): Promise<boolean> => {
		try {
			await assignMutation.mutateAsync(companyId);
			return true;
		} catch {
			return false;
		}
	};

	const handleRemoveCompany = async (): Promise<boolean> => {
		try {
			await removeMutation.mutateAsync();
			return true;
		} catch {
			return false;
		}
	};

	return {
		company: company || null,
		isLoading,
		isAssigning: assignMutation.isPending,
		isRemoving: removeMutation.isPending,
		assignCompany: handleAssignCompany,
		removeCompany: handleRemoveCompany,
		refetch,
	};
}
