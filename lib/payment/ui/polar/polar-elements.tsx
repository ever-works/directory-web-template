'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentFormProps } from '../../types/payment-types';

interface PolarPaymentFormProps extends Pick<PaymentFormProps, 'onSuccess' | 'onError' | 'successUrl'> {
	checkoutUrl: string | undefined;
}

export function PolarPaymentForm({ checkoutUrl }: PolarPaymentFormProps) {
	return (
		<div className="w-full h-[600px] flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
			<iframe
				src={checkoutUrl}
				className="w-full h-full border-0 dark:bg-gray-900"
				title="Polar Checkout"
				allow="payment"
			/>
		</div>
	);
}

interface PolarElementsWrapperProps extends PaymentFormProps {
	checkoutUrl?: string | null;
	isReady?: boolean;
	isError?: boolean;
}

export function PolarElementsWrapper({ checkoutUrl, isReady, isError, ...props }: PolarElementsWrapperProps) {
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
				<Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
				<p className="text-sm text-gray-500">Preparing secure checkout...</p>
			</div>
		);
	}

	return <PolarPaymentForm checkoutUrl={checkoutUrl} {...props} />;
}

export default PolarElementsWrapper;
