import { LemonSqueezyProvider, StripeProvider, PolarProvider, SolidgateProvider } from '..';
import { PaymentProviderInterface } from '../types/payment-types';
import { paymentConfig, coreConfig } from '@/lib/config/config-service';

// Centralized configuration for all providers
interface ProviderConfig {
	stripe: {
		apiKey: string;
		webhookSecret: string;
		publishableKey: string;
		apiVersion: string;
	};
	lemonsqueezy: {
		apiKey: string;
		webhookSecret: string;
		options: {
			[key: string]: any;
		};
	};
	solidgate: {
		apiKey: string;
		webhookSecret: string;
		secretKey: string;
		options: {
			[key: string]: any;
		};
	};
	polar: {
		apiKey: string;
		webhookSecret: string;
		options: {
			organizationId?: string;
			appUrl?: string;
			[key: string]: any;
		};
	};
}

const appUrl = coreConfig.APP_URL;

// Environment variables validation and configuration
// Uses ConfigService for validated configuration
class ConfigManager {
	private static config: ProviderConfig | null = null;
	private static initializedProviders: Set<string> = new Set();

	// Stripe configuration (from ConfigService)
	private static stripeApiKey: string = paymentConfig.stripe.secretKey || '';
	private static stripeWebhookSecret: string = paymentConfig.stripe.webhookSecret || '';
	private static stripePublishableKey: string = paymentConfig.stripe.publishableKey || '';
	private static stripeApiVersion: string = '2023-10-16';

	// LemonSqueezy configuration (from ConfigService)
	private static lemonsqueezyApiKey: string = paymentConfig.lemonSqueezy.apiKey || '';
	private static lemonsqueezyWebhookSecret: string = paymentConfig.lemonSqueezy.webhookSecret || '';
	private static lemonsqueezyStoreId: string = paymentConfig.lemonSqueezy.storeId || '';
	private static lemonsqueezyTestMode: boolean = paymentConfig.lemonSqueezy.testMode;
	private static lemonsqueezyApiVersion: string = '2023-10-16';
	private static lemonsqueezyAppUrl: string = appUrl;
	private static lemonsqueezySiteUrl: string = coreConfig.SITE_URL || 'https://ever.works';

	// Polar configuration (from ConfigService)
	private static polarApiKey: string = paymentConfig.polar.accessToken || '';
	private static polarWebhookSecret: string = paymentConfig.polar.webhookSecret || '';
	private static polarOrganizationId: string = paymentConfig.polar.organizationId || '';
	private static polarAppUrl: string = appUrl;
	private static polarSandbox: boolean = paymentConfig.polar.sandbox;

	// Solidgate configuration
	private static solidgateApiKey: string = process.env.SOLIDGATE_API_KEY || '';
	private static solidgateSecretKey: string = process.env.SOLIDGATE_SECRET_KEY || '';
	private static solidgateWebhookSecret: string = process.env.SOLIDGATE_WEBHOOK_SECRET || '';
	private static solidgatePublishableKey: string = process.env.NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY || '';
	private static solidgateMerchantId: string = process.env.SOLIDGATE_MERCHANT_ID || '';
	private static solidgateApiBaseUrl: string = process.env.SOLIDGATE_API_BASE_URL || 'https://api.solidgate.com/v1';

	private static ensureConfig(): ProviderConfig {
		if (!this.config) {
			this.config = {
				stripe: {
					apiKey: this.stripeApiKey || '',
					webhookSecret: this.stripeWebhookSecret || '',
					publishableKey: this.stripePublishableKey || '',
					apiVersion: this.stripeApiVersion || '2023-10-16'
				},
				lemonsqueezy: {
					apiKey: this.lemonsqueezyApiKey || '',
					webhookSecret: this.lemonsqueezyWebhookSecret || '',
					options: {
						storeId: this.lemonsqueezyStoreId || '',
						testMode: this.lemonsqueezyTestMode,
						apiVersion: this.lemonsqueezyApiVersion,
						appUrl: this.lemonsqueezyAppUrl || '',
						siteUrl: this.lemonsqueezySiteUrl || ''
					}
				},
				polar: {
					apiKey: this.polarApiKey || '',
					webhookSecret: this.polarWebhookSecret || '',
					options: {
						organizationId: this.polarOrganizationId || '',
						appUrl: this.polarAppUrl || '',
						sandbox: this.polarSandbox
					}
				},
				solidgate: {
					apiKey: this.solidgateApiKey || '',
					webhookSecret: this.solidgateWebhookSecret || '',
					secretKey: this.solidgateSecretKey || '',
					options: {
						publishableKey: this.solidgatePublishableKey || '',
						merchantId: this.solidgateMerchantId || '',
						apiBaseUrl: this.solidgateApiBaseUrl || ''
					}
				}
			};
			console.log('✅ ConfigManager initialized with default values');
		}
		return this.config;
	}

	public static getConfig(): ProviderConfig {
		return this.ensureConfig();
	}

	public static getStripeConfig() {
		if (!this.initializedProviders.has('stripe')) {
			this.validateStripeConfig();
			this.initializedProviders.add('stripe');
		}
		return this.ensureConfig().stripe;
	}

	public static getLemonsqueezyConfig() {
		if (!this.initializedProviders.has('lemonsqueezy')) {
			this.validateLemonsqueezyConfig();
			this.initializedProviders.add('lemonsqueezy');
		}
		return this.ensureConfig().lemonsqueezy;
	}

	public static getPolarConfig() {
		if (!this.initializedProviders.has('polar')) {
			this.validatePolarConfig();
			this.initializedProviders.add('polar');
		}
		return this.ensureConfig().polar;
	}

	public static getSolidgateConfig() {
		if (!this.initializedProviders.has('solidgate')) {
			this.validateSolidgateConfig();
			this.initializedProviders.add('solidgate');
		}
		return this.ensureConfig().solidgate;
	}

	private static validateStripeConfig(): void {
		const stripeApiKey = this.stripeApiKey;
		const stripeWebhookSecret = this.stripeWebhookSecret;
		const stripePublishableKey = this.stripePublishableKey;
		const stripeApiVersion = this.stripeApiVersion;

		if (!stripeApiKey || !stripeWebhookSecret || !stripePublishableKey) {
			throw new Error(
				'Stripe configuration is incomplete. Required: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
			);
		}

		// Set validated Stripe configuration
		this.ensureConfig().stripe = {
			apiKey: stripeApiKey,
			webhookSecret: stripeWebhookSecret,
			publishableKey: stripePublishableKey,
			apiVersion: stripeApiVersion
		};

		console.log('✅ Stripe configuration validated successfully');
	}

	private static validateLemonsqueezyConfig(): void {
		const lemonsqueezyApiKey = this.lemonsqueezyApiKey;
		const lemonsqueezyStoreId = this.lemonsqueezyStoreId;
		const lemonsqueezyTestMode = this.lemonsqueezyTestMode;
		const lemonsqueezyWebhookSecret = this.lemonsqueezyWebhookSecret;
		const lemonsqueezyApiVersion = this.lemonsqueezyApiVersion;
		const lemonsqueezyAppUrl = this.lemonsqueezyAppUrl;
		const lemonsqueezySiteUrl = this.lemonsqueezySiteUrl;

		if (!lemonsqueezyApiKey) {
			throw new Error('Lemonsqueezy configuration is incomplete. Required: LEMONSQUEEZY_API_KEY');
		}

		this.ensureConfig().lemonsqueezy = {
			apiKey: lemonsqueezyApiKey,
			webhookSecret: lemonsqueezyWebhookSecret || '',
			options: {
				storeId: lemonsqueezyStoreId || '',
				testMode: lemonsqueezyTestMode,
				apiVersion: lemonsqueezyApiVersion,
				appUrl: lemonsqueezyAppUrl,
				siteUrl: lemonsqueezySiteUrl
			}
		};

		console.log('✅ LemonSqueezy configuration validated successfully');
	}

	private static validatePolarConfig(): void {
		const polarApiKey = this.polarApiKey;
		const polarWebhookSecret = this.polarWebhookSecret;
		const polarOrganizationId = this.polarOrganizationId;
		const polarAppUrl = this.polarAppUrl;

		if (!polarApiKey || !polarOrganizationId) {
			throw new Error('Polar configuration is incomplete. Required: POLAR_ACCESS_TOKEN, POLAR_ORGANIZATION_ID');
		}

		this.ensureConfig().polar = {
			apiKey: polarApiKey,
			webhookSecret: polarWebhookSecret || '',
			options: {
				organizationId: polarOrganizationId,
				appUrl: polarAppUrl,
				sandbox: this.polarSandbox
			}
		};

		console.log('✅ Polar configuration validated successfully');
	}

	private static validateSolidgateConfig(): void {
		const solidgateApiKey = this.solidgateApiKey;
		const solidgateSecretKey = this.solidgateSecretKey;
		const solidgateWebhookSecret = this.solidgateWebhookSecret;
		const solidgatePublishableKey = this.solidgatePublishableKey;
		const solidgateMerchantId = this.solidgateMerchantId;
		const solidgateApiBaseUrl = this.solidgateApiBaseUrl;

		if (!solidgateApiKey || !solidgateMerchantId) {
			throw new Error(
				'Solidgate configuration is incomplete. Required: SOLIDGATE_API_KEY, SOLIDGATE_MERCHANT_ID'
			);
		}

		this.ensureConfig().solidgate = {
			apiKey: solidgateApiKey,
			webhookSecret: solidgateWebhookSecret || '',
			secretKey: solidgateSecretKey,
			options: {
				publishableKey: solidgatePublishableKey || '',
				merchantId: solidgateMerchantId || '',
				apiBaseUrl: solidgateApiBaseUrl
			}
		};

		console.log('✅ Solidgate configuration validated successfully');
	}
}

export class PaymentProviderManager {
	private static instances = new Map<string, any>();
	private static isInitializing = new Map<string, boolean>();

	private constructor() {}

	public static getProvider<T>(providerName: string, config: any, ProviderClass: new (config: any) => T): T {
		if (!this.instances.has(providerName) && !this.isInitializing.get(providerName)) {
			this.isInitializing.set(providerName, true);

			try {
				const instance = new ProviderClass(config);
				this.instances.set(providerName, instance);
				this.isInitializing.set(providerName, false);
				return instance;
			} catch (error) {
				this.isInitializing.set(providerName, false);
				throw new Error(
					`Failed to initialize ${providerName} provider: ${error instanceof Error ? error.message : 'Unknown error'}`
				);
			}
		}

		const instance = this.instances.get(providerName);
		if (!instance) {
			throw new Error(`Failed to initialize ${providerName} provider`);
		}

		return instance;
	}

	public static getStripeProvider(): StripeProvider {
		const stripeConfig = ConfigManager.getStripeConfig();
		return this.getProvider('stripe', stripeConfig, StripeProvider);
	}

	public static getLemonsqueezyProvider(): LemonSqueezyProvider {
		const lemonsqueezyConfig = ConfigManager.getLemonsqueezyConfig();
		return this.getProvider('lemonsqueezy', lemonsqueezyConfig, LemonSqueezyProvider);
	}

	public static getPolarProvider(): PolarProvider {
		const polarConfig = ConfigManager.getPolarConfig();
		return this.getProvider('polar', polarConfig, PolarProvider);
	}

	public static getSolidgateProvider(): SolidgateProvider {
		const solidgateConfig = ConfigManager.getSolidgateConfig();
		return this.getProvider('solidgate', solidgateConfig, SolidgateProvider);
	}

	public static reset(): void {
		this.instances.clear();
		this.isInitializing.clear();
	}

	public static isInitialized(providerName: string): boolean {
		return this.instances.has(providerName);
	}
}

export function initializeStripeProvider(): StripeProvider {
	return PaymentProviderManager.getStripeProvider();
}

export function initializeLemonsqueezyProvider(): LemonSqueezyProvider {
	return PaymentProviderManager.getLemonsqueezyProvider();
}

export function getStripeProvider(): StripeProvider | null {
	return PaymentProviderManager.isInitialized('stripe') ? PaymentProviderManager.getStripeProvider() : null;
}

export function getLemonsqueezyProvider(): LemonSqueezyProvider | null {
	return PaymentProviderManager.isInitialized('lemonsqueezy')
		? PaymentProviderManager.getLemonsqueezyProvider()
		: null;
}

export function resetPaymentProviders(): void {
	PaymentProviderManager.reset();
}

export function getOrCreateStripeProvider(): StripeProvider {
	return getStripeProvider() || initializeStripeProvider();
}

export function getOrCreateLemonsqueezyProvider(): LemonSqueezyProvider {
	return getLemonsqueezyProvider() || initializeLemonsqueezyProvider();
}

export function initializePolarProvider(): PolarProvider {
	return PaymentProviderManager.getPolarProvider();
}

export function getPolarProvider(): PolarProvider | null {
	return PaymentProviderManager.isInitialized('polar') ? PaymentProviderManager.getPolarProvider() : null;
}

export function getOrCreatePolarProvider(): PolarProvider {
	return getPolarProvider() || initializePolarProvider();
}

export function initializeSolidgateProvider(): SolidgateProvider {
	return PaymentProviderManager.getSolidgateProvider();
}

export function getSolidgateProvider(): SolidgateProvider | null {
	return PaymentProviderManager.isInitialized('solidgate') ? PaymentProviderManager.getSolidgateProvider() : null;
}

export function getOrCreateSolidgateProvider(): SolidgateProvider {
	return getSolidgateProvider() || initializeSolidgateProvider();
}

/**
 * Generic function to get or create a payment provider instance by provider name
 * Supports all payment providers: stripe, lemonsqueezy, polar, solidgate
 * @param providerName - The name of the payment provider (e.g., 'stripe', 'lemonsqueezy', 'polar', 'solidgate')
 * @returns The payment provider instance
 * @throws Error if the provider is not supported
 */
export function getOrCreateProvider(providerName: string): PaymentProviderInterface {
	const normalizedName = providerName.toLowerCase();

	switch (normalizedName) {
		case 'stripe':
			return getOrCreateStripeProvider();
		case 'lemonsqueezy':
			return getOrCreateLemonsqueezyProvider();
		case 'polar':
			return getOrCreatePolarProvider();
		case 'solidgate':
			return getOrCreateSolidgateProvider();
		default:
			throw new Error(`Unsupported payment provider: ${providerName}`);
	}
}
