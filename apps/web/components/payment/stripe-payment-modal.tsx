'use client';

import { useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard } from 'lucide-react';
import { StripeElementsWrapper } from '@/lib/payment/ui/stripe/stripe-elements';
import { PolarElementsWrapper } from '@/lib/payment/ui/polar/polar-elements';
import { LemonSqueezyElementsWrapper } from '@/lib/payment/ui/lemonsqueezy/lemonsqueezy-elements';
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
	theme?: 'light' | 'dark';
	isDismissable?: boolean;
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
	isReady,
	theme,
	isDismissable = true
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
		if (provider === PaymentProvider.STRIPE && !stripePublicKey) {
			console.error('Stripe publishable key is not configured');
			onError(new Error('Payment system is not configured. Please contact support.'));
			onClose();
		}
	}, [stripePublicKey, onError, onClose, provider]);

	if (provider === PaymentProvider.STRIPE && !stripePublicKey) {
		return null;
	}

	const renderPaymentContent = () => {
		const commonProps = {
			onSuccess: handleSuccess,
			onError: handleError,
			successUrl,
			isSubscription,
			amount,
			currency,
			isReady: true,
			theme
		};

		switch (provider) {
			case PaymentProvider.POLAR:
				return <PolarElementsWrapper {...commonProps} checkoutUrl={checkoutUrl} onClose={onClose} />;
			case PaymentProvider.LEMONSQUEEZY:
				return <LemonSqueezyElementsWrapper {...commonProps} checkoutUrl={checkoutUrl} />;
			case PaymentProvider.STRIPE:
				return (
					<StripeElementsWrapper
						{...commonProps}
						stripePublicKey={stripePublicKey}
						clientSecret={clientSecret}
						isReady={clientSecret ? isReady : true}
						isError={isError}
					/>
				);
			default:
				console.warn(`Unknown payment provider: ${provider}`);
				return null;
		}
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			isDismissable={isDismissable}
			size={provider === PaymentProvider.LEMONSQUEEZY || provider === PaymentProvider.POLAR ? '2xl' : 'md'}
		>
			<ModalContent>
				<ModalHeader className="flex items-center justify-between border-b border-gray-200 dark:border-white/6 px-4 py-3">
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
				<ModalBody className="">{renderPaymentContent()}</ModalBody>
			</ModalContent>
		</Modal>
	);
}

export default PaymentFormModal;
