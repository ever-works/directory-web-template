'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
	getCardBrandInfo, type PaymentMethodData
} from '@/hooks/use-payment-methods';

interface DeletePaymentMethodModalProps {
	paymentMethod: PaymentMethodData | null;
	isDefault?: boolean;
	isDeleting?: boolean;
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
}

export function DeletePaymentMethodModal({ isOpen, onClose, paymentMethod, isDefault, isDeleting, onConfirm }: DeletePaymentMethodModalProps) {
	const t = useTranslations('billing');

	if (!paymentMethod) return null;

	const { card } = paymentMethod;
	const brandInfo = getCardBrandInfo(card.brand);

	const handleConfirm = () => {
		onConfirm();
	};



	return (
		<Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
			<div className="p-6">
				{/* Payment method card preview */}
				<div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
					<div className="flex items-center space-x-3">
						<div className="w-10 h-6 bg-linear-to-r from-red-500 to-red-600 rounded-sm flex items-center justify-center text-white text-sm font-bold">
							💳
						</div>
						<div>
							<p className="font-medium text-gray-900 dark:text-gray-100">
								{card.brand} •••• {card.last4}
							</p>
							<p className="text-sm text-gray-600 dark:text-gray-400"> {brandInfo.text}</p>
						</div>
					</div>
				</div>

				<div className="mb-6">
					<p className="text-gray-700 dark:text-gray-300 mb-4">{t('CONFIRM_DELETE')}</p>

					{isDefault && (
						<div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
							<div className="flex items-start space-x-2">
								<AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
								<div>
									<p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
										{t('DEFAULT_CARD_WARNING')}
									</p>
									<p className="text-sm text-yellow-700 dark:text-yellow-300">
										{t('DEFAULT_CARD_WARNING_DESC')}
									</p>
								</div>
							</div>
						</div>
					)}

					<div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
						<h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
							{t('DELETE_CONSEQUENCES')}
						</h4>
						<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
							<li>• {t('DELETE_CONSEQUENCE_1')}</li>
							<li>• {t('DELETE_CONSEQUENCE_2')}</li>
							<li>• {t('DELETE_CONSEQUENCE_3')}</li>
						</ul>
					</div>
				</div>

				<div className="flex space-x-3">
					<Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={isDeleting}>
						{t('CANCEL')}
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={handleConfirm}
						disabled={isDeleting}
						className="flex-1 bg-red-600 hover:bg-red-700 text-white"
					>
						{isDeleting ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								{t('DELETING_CARD')}
							</>
						) : (
							t('DELETE_CARD_BUTTON')
						)}
					</Button>
				</div>
			</div>
		</Modal>
	);
}
