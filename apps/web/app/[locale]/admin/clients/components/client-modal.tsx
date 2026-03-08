import { Button } from '@heroui/react';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ClientForm } from '@/components/admin/clients/client-form';
import type { ClientProfileWithAuth } from '@/lib/db/queries';
import type { CreateClientRequest, UpdateClientRequest } from '@/lib/types/client';

interface ClientFormModalProps {
	isOpen: boolean;
	mode: 'create' | 'edit';
	selectedClient: ClientProfileWithAuth | null;
	isSubmitting: boolean;
	onSubmit: (data: CreateClientRequest | UpdateClientRequest) => Promise<void>;
	onClose: () => void;
}

/**
 * Client Form Modal Component
 * Handles client creation and editing modal
 * Following SRP: Only responsible for form modal display
 */
export function ClientFormModal({
	isOpen,
	mode,
	selectedClient,
	isSubmitting,
	onSubmit,
	onClose,
}: ClientFormModalProps) {
	if (!isOpen) return null;
	if (mode === 'edit' && !selectedClient) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
			<div className="w-full max-w-4xl my-8 bg-white dark:bg-gray-900 rounded-xl shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto">
				<ClientForm
					client={selectedClient || undefined}
					onSubmit={onSubmit}
					onCancel={onClose}
					isLoading={isSubmitting}
					mode={mode}
				/>
			</div>
		</div>
	);
}

interface DeleteConfirmationModalProps {
	isOpen: boolean;
	isDeleting: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

/**
 * Delete Confirmation Modal Component
 * Handles client deletion confirmation
 * Following SRP: Only responsible for delete confirmation UI
 */
export function DeleteConfirmationModal({
	isOpen,
	isDeleting,
	onConfirm,
	onCancel,
}: DeleteConfirmationModalProps) {
	const t = useTranslations('admin.ADMIN_CLIENTS_PAGE');

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6">
				<div className="text-center">
					<div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
						<Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
					</div>
					<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('DELETE_CLIENT')}</h3>
					<p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{t('DELETE_CONFIRMATION')}</p>
					<div className="flex justify-center space-x-3">
						<Button color="default" variant="bordered" onPress={onCancel} isDisabled={isDeleting}>
							{t('CANCEL')}
						</Button>
						<Button color="danger" onPress={onConfirm} isLoading={isDeleting} isDisabled={isDeleting}>
							{t('DELETE')}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
