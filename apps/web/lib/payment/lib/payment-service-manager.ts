import { PaymentService } from './payment-service';
import { SupportedProvider, PaymentProviderConfig } from '../types/payment-types';
import { PaymentProvider } from '@/lib/constants';

/**
 * Singleton holder for the active {@link PaymentService} + the user's
 * selected payment provider (persisted to `localStorage`).
 *
 * Lifecycle gotchas:
 *
 * - **First-instance-wins.** `getInstance(providerConfigs, defaultProvider)`
 *   caches the singleton on the first call. Subsequent calls with
 *   different `providerConfigs` or `defaultProvider` arguments are
 *   silently ignored — you get the original instance back. Tests that
 *   need fresh configs must clear the singleton (currently no public
 *   reset; reach into the class internals or restart the page).
 *
 * - **SSR returns DEFAULT_PROVIDER, hydration may switch.** Without
 *   a `window`, `getStoredProvider` returns the default. The first
 *   client render then reads `localStorage` and may pick a different
 *   provider — components that render provider-aware UI server-side
 *   will hydrate-mismatch if not wrapped in a Suspense / `useEffect`
 *   guard.
 *
 * - **`switchProvider` mutates `localStorage` AND reconstructs the
 *   service.** Inflight requests through the old `PaymentService`
 *   continue with the old provider; only new calls hit the new one.
 *
 * - **No-op when already on the target provider.** `switchProvider`
 *   short-circuits if `getStoredProvider() === newProvider` to avoid
 *   reconstructing the service unnecessarily — that means passing the
 *   same provider twice does NOT force a refresh of the config (use
 *   the test-only reset if you need that).
 */
export class PaymentServiceManager {
  private static instance: PaymentServiceManager;
  private currentService: PaymentService | null = null;
  private readonly STORAGE_KEY = 'everworks_template.payment_provider.selected';
  private readonly DEFAULT_PROVIDER: SupportedProvider;
  private providerConfigs: Record<SupportedProvider, PaymentProviderConfig>;

  private constructor(providerConfigs: Record<SupportedProvider, PaymentProviderConfig>, defaultProvider: SupportedProvider = PaymentProvider.STRIPE) {
    this.providerConfigs = providerConfigs;
    this.DEFAULT_PROVIDER = defaultProvider;
  }

  /**
   * Get the singleton instance of PaymentServiceManager
   * @param providerConfigs - Configuration for all payment providers
   * @param defaultProvider - Optional default provider to use (defaults to PaymentProvider.STRIPE for backward compatibility)
   */
  static getInstance(
    providerConfigs: Record<SupportedProvider, PaymentProviderConfig>,
    defaultProvider?: SupportedProvider
  ): PaymentServiceManager {
    if (!PaymentServiceManager.instance) {
      PaymentServiceManager.instance = new PaymentServiceManager(providerConfigs, defaultProvider);
    }
    return PaymentServiceManager.instance;
  }

  /**
   * Get the stored provider from localStorage
   */
  private getStoredProvider(): SupportedProvider {
    if (typeof window === 'undefined') return this.DEFAULT_PROVIDER; // Default for SSR
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return (stored as SupportedProvider) || this.DEFAULT_PROVIDER;
  }

  /**
   * Store the provider in localStorage
   */
  private setStoredProvider(provider: SupportedProvider): void {
    if (typeof window === 'undefined') return; // Skip for SSR
    localStorage.setItem(this.STORAGE_KEY, provider);
  }

  /**
   * Get the current payment service instance
   */
  getPaymentService(): PaymentService {
    if (!this.currentService) {
      const provider = this.getStoredProvider();
      this.currentService = new PaymentService({
        provider,
        config: this.providerConfigs[provider]
      });
    }
    return this.currentService;
  }

  /**
   * Switch to a different payment provider
   */
  async switchProvider(newProvider: SupportedProvider): Promise<void> {
    if (this.getStoredProvider() !== newProvider) {
      this.setStoredProvider(newProvider);
      this.currentService = new PaymentService({
        provider: newProvider,
        config: this.providerConfigs[newProvider]
      });
    }
  }

  /**
   * Get the current provider
   */
  getCurrentProvider(): SupportedProvider {
    return this.getStoredProvider();
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): SupportedProvider[] {
    return Object.keys(this.providerConfigs) as SupportedProvider[];
  }
} 