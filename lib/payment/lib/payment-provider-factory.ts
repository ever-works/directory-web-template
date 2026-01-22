import { PaymentProviderInterface, PaymentProviderConfig } from '../types/payment-types';
import { StripeProvider } from './providers/stripe-provider';
import { LemonSqueezyProvider, LemonSqueezyConfig } from './providers/lemonsqueezy-provider';
import { PolarProvider, PolarConfig } from './providers/polar-provider';
import { SolidgateProvider } from './providers/solidgate-provider';

// Supported provider types
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';

/**
 * Factory to create instances of payment providers
 */
export class PaymentProviderFactory {
	/**
	 * Create an instance of a payment provider based on the type
	 * @param providerType - Type of provider ('stripe', 'solidgate', or 'lemonsqueezy')
	 * @param config - Configuration of the provider
	 * @returns Instance of the payment provider
	 */
	static createProvider(providerType: SupportedProvider, config: PaymentProviderConfig): PaymentProviderInterface {
		switch (providerType) {
			case 'stripe':
				return new StripeProvider(config);
			case 'solidgate':
				return new SolidgateProvider(config);
			case 'lemonsqueezy':
				return new LemonSqueezyProvider(config as unknown as LemonSqueezyConfig);
			case 'polar':
				return new PolarProvider(config as unknown as PolarConfig);
			default:
				throw new Error(`Unsupported payment provider: ${providerType}`);
		}
	}
}
