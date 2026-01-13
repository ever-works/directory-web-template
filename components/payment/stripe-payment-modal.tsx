'use client';

import { useCallback } from 'react';
import { CreditCard } from 'lucide-react';
import { StripeElementsWrapper } from '@/lib/payment/ui/stripe/stripe-elements';
import { Modal, ModalBody, ModalContent, ModalHeader } from '../ui/modal';

interface StripePaymentModalProps {
	/** Whether the modal is open */
	isOpen: boolean;
	/** Callback when modal is closed */
	onClose: () => void;
	/** Callback when payment succeeds */
	onSuccess: (paymentMethodId: string) => void;
	/** Callback when payment fails */
	onError: (error: Error) => void;
	/** Whether this is a subscription payment */
	isSubscription?: boolean;
	/** Plan name to display in header */
	planName?: string;
	/** Plan price to display */
	planPrice?: string;
	/** Amount in currency units (e.g., dollars, not cents) */
	amount?: number;
	/** Currency code (e.g., 'USD', 'EUR') */
	currency?: string;

	clientSecret?: string;
	isReady?: boolean;
	isError?: boolean;
}

/**
 * Modal wrapper for Stripe payment form
 * Uses the existing StripeElementsWrapper component for PCI compliance
 */
export function StripePaymentModal({
	isOpen,
	onClose,
	onSuccess,
	onError,
	isSubscription = true,
	planName,
	planPrice,
	amount = 0,
	currency = 'USD',
	isError,
	clientSecret,
	isReady
}: StripePaymentModalProps) {
	const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

	const handleSuccess = useCallback(
		(paymentMethodId: string) => {
			onSuccess(paymentMethodId);
		},
		[onSuccess]
	);

	const handleError = useCallback(
		(error: Error) => {
			onError(error);
		},
		[onError]
	);

	const successUrl =
		typeof window !== 'undefined' ? `${window.location.origin}/checkout/success` : '/checkout/success';

	if (!stripePublicKey) {
		console.error('Stripe publishable key is not configured');
		return null;
	}

	return (
		<Modal isOpen={isOpen} onClose={onClose} size="md">
			<ModalContent>
				<ModalHeader className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
							<CreditCard className="w-5 h-5 text-white" />
						</div>
						<div>
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white">Complete Payment</h3>
							{planName && (
								<p className="text-sm text-gray-500 dark:text-gray-400">
									{planName} {planPrice && `- ${planPrice}`}
								</p>
							)}
						</div>
					</div>
				</ModalHeader>
				<ModalBody className="">
					{/* Stripe Elements Form */}
					<StripeElementsWrapper
						stripePublicKey={stripePublicKey}
						isSubscription={isSubscription}
						onSuccess={handleSuccess}
						onError={handleError}
						successUrl={successUrl}
						amount={amount}
						currency={currency}
						clientSecret={clientSecret}
						isReady={isReady}
						isError={isError}
					/>
				</ModalBody>
			</ModalContent>
		</Modal>
	);
}

export default StripePaymentModal;
