'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { PaymentElement, useStripe, useElements, Elements } from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { PaymentFormProps } from '../../types/payment-types';
import { Button } from '@heroui/react';
import { Loader2 } from 'lucide-react';

const ERROR_TRANSLATIONS: Record<string, string> = {
	incomplete: 'Please complete all required fields.',
	invalid: 'The card information is invalid.',
	declined: 'Card declined. Please try another payment method.',
	'insufficient funds': 'Insufficient funds on the card.',
	expired: 'The card has expired.',
	'issuing bank': 'Card declined by the bank.'
};

const getUserFriendlyErrorMessage = (originalMessage: string): string => {
	const lowerMsg = originalMessage.toLowerCase();
	// Check for known error patterns
	const key = Object.keys(ERROR_TRANSLATIONS).find((k) => lowerMsg.includes(k));
	return key ? ERROR_TRANSLATIONS[key] : originalMessage;
};

export function StripePaymentForm({ onSuccess, onError, clientSecret, successUrl, isSubscription }: PaymentFormProps) {
	const stripe = useStripe();
	const elements = useElements();
	const [status, setStatus] = useState<'idle' | 'loading' | 'processed' | 'error'>('idle');
	const [errorMessage, setErrorMessage] = useState('');

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!stripe || !elements || status !== 'idle' || !clientSecret) return;

		setStatus('loading');
		setErrorMessage('');

		// 1. Submit Elements (Validation)
		const { error: submitError } = await elements.submit();
		if (submitError) {
			setErrorMessage(submitError.message || 'Validation failed');
			setStatus('idle');
			return;
		}

		try {
			// 2. Confirm Setup or Payment
			let result: any;

			if (isSubscription) {
				// Check existing intent first
				const { setupIntent } = await stripe.retrieveSetupIntent(clientSecret);
				if (setupIntent?.status === 'succeeded') {
					// Already processed - this is a valid case if user refreshed the page
					setStatus('processed');
					onSuccess(setupIntent.payment_method as string);
					return;
				}
				// If status is not succeeded, proceed with normal confirmation flow

				result = await stripe.confirmSetup({
					elements,
					confirmParams: { return_url: successUrl },
					redirect: 'if_required'
				});
			} else {
				// Payment Intent Logic
				const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
				if (paymentIntent?.status === 'succeeded') {
					setStatus('processed');
					onSuccess(paymentIntent.id);
					return;
				}

				// Check if intent is in a valid state for confirmation
				if (paymentIntent?.status === 'canceled') {
					throw new Error('This payment has been canceled. Please start a new payment.');
				}

				result = await stripe.confirmPayment({
					elements,
					confirmParams: { return_url: successUrl },
					redirect: 'if_required'
				});
			}

			// 3. Handle Result
			if (result.error) {
				const userMsg = getUserFriendlyErrorMessage(result.error.message || 'Payment failed');
				setErrorMessage(userMsg);
				onError(new Error(userMsg));
				setStatus('idle');
			} else {
				const intent = result.setupIntent || result.paymentIntent;
				if (intent?.status === 'succeeded') {
					setStatus('processed');
					onSuccess(isSubscription ? intent.payment_method : intent.id);
				} else if (intent?.status === 'processing') {
					setStatus('loading'); // Keep loading UI
					setErrorMessage('Processing payment...');
				} else {
					// Requires action/confirmation handles automatically or falls here
					setStatus('idle');
				}
			}
		} catch (err: any) {
			console.error('Stripe Error:', err);
			const msg = 'An unexpected error occurred. Please try again.';
			setErrorMessage(msg);
			onError(new Error(msg));
			setStatus('idle');
		}
	};

	const isFormDisabled = !stripe || !elements || status !== 'idle';

	return (
		<form onSubmit={handleSubmit} className="w-full space-y-6">
			{/* Payment Elements */}
			<div className="p-1">
				<PaymentElement
					id="payment-element"
					options={{ layout: 'tabs', paymentMethodOrder: ['card', 'apple_pay', 'google_pay'] }}
				/>
			</div>

			{/* Error Message */}
			{errorMessage && (
				<div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-in fade-in slide-in-from-top-1">
					{errorMessage}
				</div>
			)}

			{/* Submit Button */}
			<Button
				type="submit"
				disabled={isFormDisabled}
				isLoading={status === 'loading'}
				className={`w-full font-semibold h-11 ${
					status === 'processed'
						? 'bg-green-600 hover:bg-green-700 text-white'
						: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
				}`}
				spinner={<Loader2 className="w-4 h-4 animate-spin" />}
			>
				{status === 'processed' ? 'Payment Successful' : 'Pay Now'}
			</Button>
		</form>
	);
}

interface StripeElementsWrapperProps extends PaymentFormProps {
	stripePublicKey: string;
	isSubscription: boolean;
	clientSecret?: string;
	isReady?: boolean;
	isError?: boolean;
}

export function StripeElementsWrapper({
	stripePublicKey,
	clientSecret,
	isReady,
	isError,
	...props
}: StripeElementsWrapperProps) {
	const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

	useEffect(() => {
		if (stripePublicKey) setStripePromise(loadStripe(stripePublicKey));
	}, [stripePublicKey]);

	const options = useMemo<StripeElementsOptions>(
		() => ({
			clientSecret,
			appearance: {
				theme: 'stripe',
				variables: { colorPrimary: '#3b82f6', borderRadius: '8px' }
			}
		}),
		[clientSecret]
	);

	if (isError) {
		return (
			<div className="flex flex-col items-center justify-center p-8 text-center">
				<p className="text-red-500 mb-4">Unable to load payment form.</p>
				<Button size="sm" variant="flat" onPress={() => window.location.reload()}>
					Retry
				</Button>
			</div>
		);
	}

	if (!isReady || !clientSecret) {
		return (
			<div className="flex flex-col items-center justify-center p-12 space-y-4">
				<Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
				<p className="text-sm text-gray-500">Securing connection...</p>
			</div>
		);
	}

	return (
		<Elements stripe={stripePromise} options={options}>
			<StripePaymentForm clientSecret={clientSecret} {...props} />
		</Elements>
	);
}

export default StripeElementsWrapper;
