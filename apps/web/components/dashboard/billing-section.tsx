'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentMethodCard } from './payment-method-card';
import { EditPaymentMethodModal } from './edit-payment-method-modal';
import { usePaymentMethods, type PaymentMethodData } from '@/hooks/use-payment-methods';
import { AddPaymentMethodModal } from './add-payment-method-modal';
import { DeletePaymentMethodModal } from './delete-payment-method-modal';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface BillingSectionProps {
	className?: string;
}

interface ModalState {
	showAddModal: boolean;
	showEditModal: boolean;
	showDeleteModal: boolean;
	selectedPaymentMethod: PaymentMethodData | null;
}

interface LoadingState {
	settingDefaultId: string | null;
	deletingId: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INITIAL_MODAL_STATE: ModalState = {
	showAddModal: false,
	showEditModal: false,
	showDeleteModal: false,
	selectedPaymentMethod: null,
};

const INITIAL_LOADING_STATE: LoadingState = {
	settingDefaultId: null,
	deletingId: null,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Custom hook for managing modal states
 */
function useModalState() {
	const [modalState, setModalState] = useState<ModalState>(INITIAL_MODAL_STATE);

	const openAddModal = useCallback(() => {
		setModalState(prev => ({ ...prev, showAddModal: true }));
	}, []);

	const openEditModal = useCallback((paymentMethod: PaymentMethodData) => {
		setModalState(prev => ({
			...prev,
			showEditModal: true,
			selectedPaymentMethod: paymentMethod,
		}));
	}, []);

	const openDeleteModal = useCallback((paymentMethod: PaymentMethodData) => {
		setModalState(prev => ({
			...prev,
			showDeleteModal: true,
			selectedPaymentMethod: paymentMethod,
		}));
	}, []);

	const closeAllModals = useCallback(() => {
		setModalState(INITIAL_MODAL_STATE);
	}, []);

	const closeAddModal = useCallback(() => {
		setModalState(prev => ({ ...prev, showAddModal: false }));
	}, []);

	const closeEditModal = useCallback(() => {
		setModalState(prev => ({
			...prev,
			showEditModal: false,
			selectedPaymentMethod: null,
		}));
	}, []);

	const closeDeleteModal = useCallback(() => {
		setModalState(prev => ({
			...prev,
			showDeleteModal: false,
			selectedPaymentMethod: null,
		}));
	}, []);

	return {
		...modalState,
		openAddModal,
		openEditModal,
		openDeleteModal,
		closeAllModals,
		closeAddModal,
		closeEditModal,
		closeDeleteModal,
	};
}

/**
 * Custom hook for managing loading states
 */
function useLoadingState() {
	const [loadingState, setLoadingState] = useState<LoadingState>(INITIAL_LOADING_STATE);

	const setSettingDefault = useCallback((id: string | null) => {
		setLoadingState(prev => ({ ...prev, settingDefaultId: id }));
	}, []);

	const setDeleting = useCallback((id: string | null) => {
		setLoadingState(prev => ({ ...prev, deletingId: id }));
	}, []);

	return {
		...loadingState,
		setSettingDefault,
		setDeleting,
	};
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BillingSection({ className }: BillingSectionProps) {
	const t = useTranslations('billing');

	// Custom hooks for state management
	const modalState = useModalState();
	const loadingState = useLoadingState();

	// Payment methods hook
	const {
		paymentMethods,
		isLoading,
		error,
		refetch,
		deletePaymentMethod,
		isDeleting,
		setDefaultPaymentMethodAsync
	} = usePaymentMethods();

	// Memoized computed values
	const paymentMethodsCount = useMemo(() => paymentMethods.length, [paymentMethods.length]);
	const hasPaymentMethods = useMemo(() => paymentMethodsCount > 0, [paymentMethodsCount]);

	// Event handlers
	const handleEditPaymentMethod = useCallback((paymentMethod: PaymentMethodData) => {
		modalState.openEditModal(paymentMethod);
	}, [modalState]);

	const handleEditSuccess = useCallback(() => {
		modalState.closeEditModal();
		// Hook handles optimistic cache updates automatically
	}, [modalState]);

	const handleDeletePaymentMethod = useCallback((paymentMethodId: string) => {
		const method = paymentMethods.find(pm => pm.id === paymentMethodId);
		if (method) {
			modalState.openDeleteModal(method);
		}
	}, [paymentMethods, modalState]);

	const handleConfirmDelete = useCallback(() => {
		if (!modalState.selectedPaymentMethod) return;

		loadingState.setDeleting(modalState.selectedPaymentMethod.id);
		deletePaymentMethod(modalState.selectedPaymentMethod.id);
		modalState.closeDeleteModal();
		loadingState.setDeleting(null);
	}, [modalState, loadingState, deletePaymentMethod]);

	const handleSetDefaultPaymentMethod = useCallback(async (paymentMethodId: string) => {
		loadingState.setSettingDefault(paymentMethodId);
		try {
			await setDefaultPaymentMethodAsync(paymentMethodId);
		} catch (error) {
			console.error('Error setting default payment method:', error);
		} finally {
			loadingState.setSettingDefault(null);
		}
	}, [loadingState, setDefaultPaymentMethodAsync]);

	const handleAddSuccess = useCallback(() => {
		modalState.closeAddModal();
		refetch();
	}, [modalState, refetch]);


	if (isLoading) {
		return (
			<div
				className={`bg-white dark:bg-gray-900 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 ${className}`}
			>
				<div className="p-6 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center space-x-2">
						<CreditCard className="h-5 w-5 text-gray-600 dark:text-gray-400" />
						<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('TITLE')}</h2>
					</div>
				</div>
				<div className="p-6">
					<div className="animate-pulse space-y-4">
						<div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
						<div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
					</div>
				</div>
			</div>
		);
	}


	return (
		<>
			<div
				className={`bg-white dark:bg-gray-900 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 ${className}`}
			>
				<div className="p-6 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2">
							<CreditCard className="h-5 w-5 text-gray-600 dark:text-gray-400" />
							<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('TITLE')}</h2>
						</div>
						<Button
							onClick={modalState.openAddModal}
							size="sm"
							className="flex items-center space-x-2 bg-theme-primary-500 hover:bg-theme-primary-500"
						>
							<Plus className="h-4 w-4" />
							<span>{t('ADD_CARD')}</span>
						</Button>
					</div>
				</div>

				<div className="p-6">
					{error && (
						<div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
							<p className="text-red-800 dark:text-red-200 text-sm">{error.message}</p>
						</div>
					)}

					{!hasPaymentMethods ? (
						<div className="text-center py-12">
							<CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
								{t('NO_PAYMENT_METHODS')}
							</h3>
							<p className="text-gray-600 dark:text-gray-400 mb-4">{t('NO_PAYMENT_METHODS_DESC')}</p>
							<Button className='bg-theme-primary-500 hover:bg-theme-primary-500' onClick={modalState.openAddModal}>
								<Plus className="h-4 w-4 mr-2" />
								{t('ADD_FIRST_CARD')}
							</Button>
						</div>
					) : (
						<div className="space-y-4">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
									{t('PAYMENT_METHODS_REGISTERED')}
								</h3>
								<span className="text-sm text-gray-500 dark:text-gray-400">
									{t('CARDS_REGISTERED', {
										count: paymentMethodsCount,
										plural: paymentMethodsCount > 1 ? 's' : ''
									})}
								</span>
							</div>

							{paymentMethods.map((paymentMethod) => (
								<PaymentMethodCard
									key={paymentMethod.id}
									paymentMethod={paymentMethod}
									isDefault={paymentMethod.is_default || false}
									onEdit={handleEditPaymentMethod}
									onDelete={handleDeletePaymentMethod}
									onSetDefault={handleSetDefaultPaymentMethod}
									isDeleting={isDeleting}
									isSettingDefault={loadingState.settingDefaultId === paymentMethod.id}
								/>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Payment Method Modals */}
			<AddPaymentMethodModal
				isOpen={modalState.showAddModal}
				onClose={modalState.closeAddModal}
				onSuccess={handleAddSuccess}
			/>

			<EditPaymentMethodModal
				isOpen={modalState.showEditModal}
				onClose={modalState.closeEditModal}
				paymentMethod={modalState.selectedPaymentMethod}
				onEdit={handleEditSuccess}
			/>

			<DeletePaymentMethodModal
				isOpen={modalState.showDeleteModal}
				onClose={modalState.closeDeleteModal}
				paymentMethod={modalState.selectedPaymentMethod}
				onConfirm={handleConfirmDelete}
				isDefault={modalState.selectedPaymentMethod?.is_default}
				isDeleting={loadingState.deletingId === modalState.selectedPaymentMethod?.id}
			/>
		</>
	);
}
