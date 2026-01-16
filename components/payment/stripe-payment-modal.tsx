'use client';

import { useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard } from 'lucide-react';
import { StripeElementsWrapper } from '@/lib/payment/ui/stripe/stripe-elements';
import { Modal, ModalBody, ModalContent, ModalHeader } from '../ui/modal';

import { PaymentProvider } from '@/lib/constants';

interface PaymentFormModalProps {
	/** Payment provider */
	provider: PaymentProvider;
	/** Checkout URL for LemonSqueezy */
	checkoutUrl?: string | null;
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
 * Uses StripeElementsWrapper for Stripe or Iframe for LemonSqueezy
 */
export function PaymentFormModal({
	provider,
	checkoutUrl,
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
}: PaymentFormModalProps) {
	const t = useTranslations('payment');
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

	useEffect(() => {
		if (provider === 'stripe' && !stripePublicKey) {
			console.error('Stripe publishable key is not configured');
			onError(new Error('Payment system is not configured. Please contact support.'));
			onClose();
		}
	}, [stripePublicKey, onError, onClose, provider]);

	if (provider === 'stripe' && !stripePublicKey) {
		return null;
	}

	return (
		<Modal isOpen={isOpen} onClose={onClose} size={provider === 'lemonsqueezy' ? '2xl' : 'md'}>
			<ModalContent>
				<ModalHeader className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
							<CreditCard className="w-5 h-5 text-white" />
						</div>
						<div>
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
								{t('COMPLETE_PAYMENT')}
							</h3>
							{planName && (
								<p className="text-sm text-gray-500 dark:text-gray-400">
									{planName} {planPrice && `- ${planPrice}`}
								</p>
							)}
						</div>
					</div>
				</ModalHeader>
				<ModalBody className="">
					{provider === 'lemonsqueezy' ? (
						<div className="w-full h-[600px] flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
							{checkoutUrl ? (
								<iframe
									src={checkoutUrl}
									className="w-full h-full border-0 dark:bg-gray-900"
									title="LemonSqueezy Checkout"
									allow="payment"
								/>
							) : (
								<div className="flex flex-col items-center gap-3 text-gray-500">
									<div className="w-8 h-8 border-2 border-theme-primary-500 border-t-transparent rounded-full animate-spin" />
									<p>Loading checkout...</p>
								</div>
							)}
						</div>
					) : (
						<StripeElementsWrapper
							stripePublicKey={stripePublicKey}
							isSubscription={isSubscription}
							onSuccess={handleSuccess}
							onError={handleError}
							successUrl={successUrl}
							amount={amount}
							currency={currency}
							clientSecret={clientSecret}
							isReady={clientSecret ? isReady : true} // Only check ready if we have a secret (embedded), otherwise hosted
							isError={isError}
						/>
					)}
				</ModalBody>
			</ModalContent>
		</Modal>
	);
}

export default PaymentFormModal;
