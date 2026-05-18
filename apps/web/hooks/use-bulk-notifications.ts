'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiUtils, serverClient } from '@/lib/api/server-api-client';
import type { BulkRequest } from '@/lib/notifications/types';
import { CLIENT_NOTIFICATION_KEYS } from './use-notifications';

async function postBulk(body: BulkRequest): Promise<{ updatedCount: number }> {
	const response = await serverClient.post<{ updatedCount: number }>('/api/client/notifications/bulk', body);
	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response) || 'Failed bulk action');
	}
	return response.data;
}

async function deleteOne(id: string): Promise<{ id: string }> {
	const response = await serverClient.delete<{ id: string }>(`/api/client/notifications/${id}`);
	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response) || 'Failed delete');
	}
	return response.data;
}

export function useBulkNotifications() {
	const qc = useQueryClient();

	const bulk = useMutation({
		mutationFn: postBulk,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: CLIENT_NOTIFICATION_KEYS.all });
		}
	});

	const remove = useMutation({
		mutationFn: deleteOne,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: CLIENT_NOTIFICATION_KEYS.all });
		}
	});

	return {
		bulkAction: bulk.mutate,
		bulkAsync: bulk.mutateAsync,
		deleteOne: remove.mutate,
		isPending: bulk.isPending || remove.isPending
	};
}
