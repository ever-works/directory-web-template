'use client';

import { useState, useCallback, useRef } from 'react';
import { PaymentFormProps } from '../../types/payment-types';
import Payment, { SdkMessage, ClientSdkInstance } from '@solidgate/react-sdk';

// Wrapper with Solidgate Payment SDK
interface SolidgateElementsWrapperProps extends PaymentFormProps {
	solidgatePublicKey: string;
	merchantId: string;
	paymentIntent: string;
	signature: string;
}

// Solidgate payment form component using the React SDK
export function SolidgatePaymentForm({
	onSuccess,
	onError,
	amount,
	currency,
	isSubscription,
	merchantId,
	paymentIntent,
	signature,
	successUrl,
	cancelUrl,
	metadata
}: SolidgateElementsWrapperProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const sdkInstanceRef = useRef<ClientSdkInstance | null>(null);

	const handlePaymentSuccess = useCallback(
		(paymentId: string) => {
			setIsLoading(false);
			onSuccess(paymentId);
		},
		[onSuccess]
	);

	const handlePaymentError = useCallback(
		(error: Error) => {
			setIsLoading(false);
			setErrorMessage(error.message);
			onError(error);
		},
		[onError]
	);

	const merchantData = {
		merchant: merchantId,
		signature: signature,
		paymentIntent: paymentIntent
	};

	// Handle success callback from SDK
	const handleSuccess = useCallback(
		(data: any) => {
			setIsLoading(false);
			// Extract payment ID from response
			const paymentId = data?.paymentId || data?.id || data?.payment_id || paymentIntent;
			handlePaymentSuccess(paymentId);
		},
		[paymentIntent, handlePaymentSuccess]
	);

	// Handle error callback from SDK
	const handleError = useCallback(
		(error: any) => {
			setIsLoading(false);
			// Extract error message from various possible formats
			const errorMsg =
				error?.message ||
				error?.error ||
				error?.data?.message ||
				error?.data?.error ||
				typeof error === 'string'
					? error
					: 'Payment processing failed';
			setErrorMessage(errorMsg);
			handlePaymentError(new Error(errorMsg));
		},
		[handlePaymentError]
	);

	// Handle SDK messages if the SDK provides message callbacks
	const handleMessage = useCallback((message: SdkMessage) => {
		// Handle different message types from SDK
		// The exact structure depends on the SDK implementation
		if (message) {
			// Process SDK message
			// This is a placeholder - adjust based on actual SDK message structure
		}
	}, []);

	return (
		<div className="solidgate-payment-form space-y-4">
			{errorMessage && (
				<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
					<p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
				</div>
			)}

			<div className="payment-form-container">
				<Payment merchantData={merchantData} onSuccess={handleSuccess} onError={handleError} />
			</div>

			{isLoading && (
				<div className="flex items-center justify-center p-4">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
					<span className="ml-2 text-sm text-muted-foreground">Processing payment...</span>
				</div>
			)}
		</div>
	);
}

// Wrapper component that provides the Solidgate SDK context
export default function SolidgateElementsWrapper(props: SolidgateElementsWrapperProps) {
	return <SolidgatePaymentForm {...props} />;
}
