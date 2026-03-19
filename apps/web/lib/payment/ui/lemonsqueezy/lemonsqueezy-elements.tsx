'use client';

import { Button } from '@/components/ui/button';
import { PaymentFormProps } from '../../types/payment-types';

interface LemonSqueezyPaymentFormProps extends Pick<PaymentFormProps, 'onSuccess' | 'onError' | 'successUrl'> {
	checkoutUrl: string | undefined;
}

export function LemonSqueezyPaymentForm({ checkoutUrl }: LemonSqueezyPaymentFormProps) {
	return (
		<div className="w-full h-[600px] flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
			<iframe
				src={checkoutUrl}
				className="w-full h-full border-0 dark:bg-gray-900"
				title="LemonSqueezy Checkout"
				allow="payment"
			/>
		</div>
	);
}

interface LemonSqueezyElementsWrapperProps extends PaymentFormProps {
	checkoutUrl?: string | null;
	isReady?: boolean;
	isError?: boolean;
}

export function LemonSqueezyElementsWrapper({
	checkoutUrl,
	isReady: _isReady,
	isError,
	...props
}: LemonSqueezyElementsWrapperProps) {
	if (isError) {
		return (
			<div className="flex flex-col items-center justify-center p-8 text-center">
				<p className="text-red-500 mb-4">Unable to load payment form.</p>
				<Button size="sm" variant="outline" onClick={() => window.location.reload()}>
					Retry
				</Button>
			</div>
		);
	}

	if (!checkoutUrl) {
		return (
			<div className="flex flex-col items-center justify-center p-12 space-y-4">
				<div className="w-8 h-8 border-2 border-theme-primary-500 border-t-transparent rounded-full animate-spin" />
				<p className="text-sm text-gray-500">Loading checkout...</p>
			</div>
		);
	}

	return <LemonSqueezyPaymentForm checkoutUrl={checkoutUrl} {...props} />;
}

export default LemonSqueezyElementsWrapper;
