import { Trash2, AlertTriangle, X } from 'lucide-react';

const SPINNER = (
	<svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
		<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
		<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
	</svg>
);
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
		<div
			className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full -mr-2 [&::-webkit-scrollbar]:w-1"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div className="w-full max-w-4xl my-8 bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/8 rounded-2xl shadow-2xl shadow-black/30 max-h-[calc(100vh-4rem)] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full -mr-2 [&::-webkit-scrollbar]:w-1">
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

export function DeleteConfirmationModal({
	isOpen,
	isDeleting,
	onConfirm,
	onCancel,
}: DeleteConfirmationModalProps) {
	const t = useTranslations('admin.ADMIN_CLIENTS_PAGE');

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<div className="w-full max-w-sm bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/8 rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">

				<div className="p-6">
					{/* Icon + close row */}
					<div className="flex items-start justify-between mb-4">
						<div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 ring-1 ring-red-100 dark:ring-red-500/20 flex items-center justify-center shrink-0">
							<AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
						</div>
						<button
							type="button"
							onClick={onCancel}
							disabled={isDeleting}
							aria-label={t('CANCEL')}
							className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-white/8 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
						>
							<X className="w-4 h-4" />
						</button>
					</div>

					{/* Text */}
					<h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5">
						{t('DELETE_CLIENT')}
					</h3>
					<p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
						{t('DELETE_CONFIRMATION')}
					</p>

					{/* Actions */}
					<div className="flex items-center gap-2.5">
						<button
							type="button"
							disabled={isDeleting}
							onClick={onCancel}
							className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-all duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
						>
							{t('CANCEL')}
						</button>
						<button
							type="button"
							disabled={isDeleting}
							onClick={onConfirm}
							className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-500/20 transition-all duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
						>
							{isDeleting ? SPINNER : <Trash2 className="w-4 h-4" />}
							{t('DELETE')}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
