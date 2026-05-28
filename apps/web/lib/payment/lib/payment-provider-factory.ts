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
	 * Create an instance of a payment provider based on the type.
	 *
	 * Unlike the email-provider factory (which silently falls back to a
	 * mock on unknown providers), this one **throws** — payment is too
	 * load-bearing to silently route through a no-op. A misconfigured
	 * `providerType` env var should fail loudly at boot, not silently
	 * disable checkout.
	 *
	 * @param providerType - One of 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar'.
	 * @param config - Provider-specific configuration. Note: the
	 *   `lemonsqueezy` and `polar` branches double-cast `config` through
	 *   `unknown` because `PaymentProviderConfig` is shaped for Stripe;
	 *   the cast is intentional and load-bearing until the type is
	 *   normalised.
	 * @returns Instance of the payment provider.
	 * @throws Error when `providerType` is not in the supported set.
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
