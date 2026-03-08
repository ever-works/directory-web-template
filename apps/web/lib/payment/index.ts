import { StripeElementsWrapper } from './ui/stripe/stripe-elements';
import type { PaymentFormProps } from './types/payment-types';

// Export the main payment form component
export const PaymentForm = StripeElementsWrapper;

// Export types
export type { PaymentFormProps };

// Export other components and utilities as needed
export * from './hooks/use-payment';
export * from './lib/payment-provider-factory';
export * from './lib/payment-service';

// Export services
export { PaymentService } from './lib/payment-service';
export { PaymentServiceManager } from './lib/payment-service-manager';
export { PaymentProviderFactory } from './lib/payment-provider-factory';

// Export providers
export * from './lib/providers/stripe-provider';
export * from './lib/providers/solidgate-provider';
export * from './lib/providers/lemonsqueezy-provider';
export * from './lib/providers/polar-provider';

// Export configurations
export { createProviderConfigs } from './config/provider-configs';

// Export React hooks
export { usePayment, PaymentProvider } from './hooks/use-payment';
 