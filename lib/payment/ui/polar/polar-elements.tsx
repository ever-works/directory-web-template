import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentFormProps } from '../../types/payment-types';
import { PolarPaymentForm } from './polar-payment-form';

interface PolarElementsWrapperProps extends PaymentFormProps {
	checkoutUrl?: string | null;
	isReady?: boolean;
	isError?: boolean;
	onClose?: () => void;
}

export function PolarElementsWrapper({ checkoutUrl, isReady, isError, ...props }: PolarElementsWrapperProps) {
	if (isError) {
		return (
			<div className="flex flex-col items-center justify-center p-8 text-center text-red-500">
				<p className="mb-4">Unable to load payment form.</p>
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
				<p className="text-sm text-muted-foreground">Preparing secure checkout...</p>
			</div>
		);
	}

	return <PolarPaymentForm checkoutUrl={checkoutUrl} {...props} />;
}

export default PolarElementsWrapper;
