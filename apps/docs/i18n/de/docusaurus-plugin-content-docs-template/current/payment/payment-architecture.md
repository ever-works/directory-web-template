---
id: payment-architecture
title: Zahlungsarchitektur
sidebar_label: Architektur
sidebar_position: 6
---

# Zahlungsarchitektur

Die Ever Works-Vorlage implementiert ein anbieterunabhängiges Zahlungssystem, das vier Zahlungsanbieter unterstützt: **Stripe**, **LemonSqueezy**, **Polar** und **Solidgate**. Die Architektur verwendet ein Factory-Muster mit Singleton-Provider-Instanzen, was den Wechsel des Laufzeit-Providers ermöglicht.

## Quellorte

```
lib/payment/lib/payment-provider-factory.ts     # Factory class
lib/payment/lib/payment-service.ts              # Service facade
lib/payment/lib/payment-service-manager.ts      # Singleton manager with provider switching
lib/payment/config/payment-provider-manager.ts  # Config validation & provider instantiation
lib/payment/types/payment-types.ts              # Shared interfaces and types
lib/payment/lib/providers/                      # Provider implementations
  stripe-provider.ts
  solidgate-provider.ts
  lemonsqueezy-provider.ts
  polar-provider.ts
```

## Systemdiagramm

```
+------------------+      +------------------------+
|  React Component | ---> |  PaymentServiceManager |
+------------------+      |  (singleton)           |
                          +------------------------+
                                    |
                          +------------------------+
                          |    PaymentService      |
                          |  (facade)              |
                          +------------------------+
                                    |
                          +------------------------+
                          | PaymentProviderFactory |
                          +------------------------+
                            /      |      |      \
                     Stripe  Solidgate  Lemon   Polar
                    Provider Provider  Squeezy Provider
                                      Provider
```

## Anbieterschnittstelle

Jeder Zahlungsanbieter implementiert das gleiche `PaymentProviderInterface` :

```ts
interface PaymentProviderInterface {
  // Payment operations
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent>;
  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
  createSetupIntent(user: User | null): Promise<SetupIntent>;

  // Customer management
  createCustomer(params: CreateCustomerParams): Promise<CustomerResult>;
  hasCustomerId(user: User | null): boolean;
  getCustomerId(user: User | null): Promise<string | null>;

  // Subscription management
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo>;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionInfo>;
  updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo>;

  // Webhooks
  handleWebhook(
    payload: any, signature: string, rawBody?: string,
    timestamp?: string, webhookId?: string
  ): Promise<WebhookResult>;

  // Refunds
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  // Client-side configuration
  getClientConfig(): ClientConfig;
  getUIComponents(): UIComponents;
}
```

Diese Schnittstelle stellt sicher, dass beim Anbieterwechsel keine Änderungen am Aufrufcode erforderlich sind.

## PaymentProviderFactory

Die Factory erstellt Anbieterinstanzen basierend auf einer Anbietertypzeichenfolge:

```ts
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';

export class PaymentProviderFactory {
  static createProvider(
    providerType: SupportedProvider,
    config: PaymentProviderConfig
  ): PaymentProviderInterface {
    switch (providerType) {
      case 'stripe':
        return new StripeProvider(config);
      case 'solidgate':
        return new SolidgateProvider(config);
      case 'lemonsqueezy':
        return new LemonSqueezyProvider(config);
      case 'polar':
        return new PolarProvider(config);
      default:
        throw new Error(`Unsupported payment provider: ${providerType}`);
    }
  }
}
```

## PaymentService (Fassade)

Der `PaymentService` umschließt eine einzelne Anbieterinstanz hinter einer sauberen API. Es delegiert jeden Anruf an den zugrunde liegenden Anbieter:

```ts
export class PaymentService {
  private provider: PaymentProviderInterface;

  constructor(config: PaymentServiceConfig) {
    this.provider = PaymentProviderFactory.createProvider(
      config.provider, config.config
    );
  }

  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(params);
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.createSubscription(params);
  }

  getUIComponents(): UIComponents {
    return this.provider.getUIComponents();
  }

  // ... all other interface methods delegated
}
```

### Plandefinitionen

Der Dienst definiert auch Zahlungsplankonstanten:

```ts
enum PaymentPlanId {
  FREE = "1",
  ONE_TIME = "2",
  SUBSCRIPTION = "3",
  PREMIUM = "4",
}

interface PaymentPlan {
  id: PaymentPlanId;
  amount: number;
  isSubscription: boolean;
  features: string[];
}
```

## PaymentServiceManager

Der Manager kümmert sich um den Singleton-Lebenszyklus und den Wechsel des Laufzeitanbieters. Es behält den ausgewählten Anbieter in `localStorage` bei:

```ts
export class PaymentServiceManager {
  private static instance: PaymentServiceManager;
  private currentService: PaymentService | null = null;
  private readonly STORAGE_KEY = 'everworks_template.payment_provider.selected';
  private readonly DEFAULT_PROVIDER: SupportedProvider;

  static getInstance(
    providerConfigs: Record<SupportedProvider, PaymentProviderConfig>,
    defaultProvider?: SupportedProvider
  ): PaymentServiceManager {
    if (!PaymentServiceManager.instance) {
      PaymentServiceManager.instance = new PaymentServiceManager(
        providerConfigs, defaultProvider
      );
    }
    return PaymentServiceManager.instance;
  }

  getPaymentService(): PaymentService {
    if (!this.currentService) {
      const provider = this.getStoredProvider();
      this.currentService = new PaymentService({
        provider,
        config: this.providerConfigs[provider],
      });
    }
    return this.currentService;
  }

  async switchProvider(newProvider: SupportedProvider): Promise<void> {
    if (this.getStoredProvider() !== newProvider) {
      this.setStoredProvider(newProvider);
      this.currentService = new PaymentService({
        provider: newProvider,
        config: this.providerConfigs[newProvider],
      });
    }
  }

  getCurrentProvider(): SupportedProvider { /* ... */ }
  getAvailableProviders(): SupportedProvider[] { /* ... */ }
}
```

### SSR-Sicherheit

Der Manager übernimmt das serverseitige Rendering, indem er standardmäßig auf den konfigurierten Standardanbieter zurückgreift, wenn `localStorage` nicht verfügbar ist:

```ts
private getStoredProvider(): SupportedProvider {
  if (typeof window === 'undefined') return this.DEFAULT_PROVIDER;
  const stored = localStorage.getItem(this.STORAGE_KEY);
  return (stored as SupportedProvider) || this.DEFAULT_PROVIDER;
}
```

## PaymentProviderManager (Konfigurationsebene)

Der `PaymentProviderManager` bietet ein alternatives Singleton-Zugriffsmuster mit verzögerter Initialisierung pro Anbieter und Konfigurationsvalidierung:

```ts
export class PaymentProviderManager {
  private static instances = new Map<string, any>();

  static getStripeProvider(): StripeProvider { /* ... */ }
  static getLemonsqueezyProvider(): LemonSqueezyProvider { /* ... */ }
  static getPolarProvider(): PolarProvider { /* ... */ }
  static getSolidgateProvider(): SolidgateProvider { /* ... */ }

  static reset(): void {
    this.instances.clear();
  }

  static isInitialized(providerName: string): boolean {
    return this.instances.has(providerName);
  }
}
```

### Komfortfunktionen

Das Konfigurationsmodul exportiert Hilfsfunktionen für den schnellen Zugriff auf Anbieter:

```ts
// Get or create (lazy init)
getOrCreateStripeProvider(): StripeProvider
getOrCreateLemonsqueezyProvider(): LemonSqueezyProvider
getOrCreatePolarProvider(): PolarProvider
getOrCreateSolidgateProvider(): SolidgateProvider

// Generic accessor
getOrCreateProvider(providerName: string): PaymentProviderInterface

// Reset all singletons
resetPaymentProviders(): void
```

## ConfigManager

Die interne `ConfigManager` -Klasse lädt und validiert Umgebungsvariablen für alle Anbieter. Die Konfiguration jedes Anbieters wird beim ersten Zugriff validiert, nicht beim Start:

```ts
// Solidgate config shape
{
  apiKey: process.env.SOLIDGATE_API_KEY,
  secretKey: process.env.SOLIDGATE_SECRET_KEY,
  webhookSecret: process.env.SOLIDGATE_WEBHOOK_SECRET,
  options: {
    publishableKey: process.env.NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY,
    merchantId: process.env.SOLIDGATE_MERCHANT_ID,
    apiBaseUrl: process.env.SOLIDGATE_API_BASE_URL || 'https://api.solidgate.com/v1',
  }
}
```

Die Validierung wird einmal pro Anbieter ausgelöst und löst beschreibende Fehler aus, in denen die fehlenden Variablen aufgeführt sind.

## Gemeinsam genutzte Typen

### Zahlungsabsicht

```ts
interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret?: string;
  customerId?: string;
}
```

### Abonnementinfo

```ts
interface SubscriptionInfo {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: number | null;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: number | null;
  trialEnd?: number | null;
  priceId: string;
}
```

### ClientConfig

```ts
interface ClientConfig {
  publicKey: string;
  paymentGateway: 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
  options?: Record<string, any>;
}
```

### UIComponents

Jeder Anbieter gibt eine Reihe von UI-Komponenten zum Rendern von Zahlungsformularen zurück:

```ts
interface UIComponents {
  PaymentForm: React.ComponentType<PaymentFormProps>;
  logo: string;
  cardBrands: CardBrandIcon[];
  supportedPaymentMethods: string[];
  translations: Record<string, Record<string, string>>;
}
```

## Einen neuen Anbieter hinzufügen

Um einen fünften Zahlungsanbieter hinzuzufügen, gehen Sie folgendermaßen vor:

### 1. Erstellen Sie die Provider-Klasse

```ts
// lib/payment/lib/providers/newprovider-provider.ts
export class NewProvider implements PaymentProviderInterface {
  constructor(config: PaymentProviderConfig) {
    // Initialize with API keys from config
  }

  // Implement all interface methods
  async createPaymentIntent(params) { /* ... */ }
  async createCustomer(params) { /* ... */ }
  // ... etc.
}
```

### 2. Registrieren Sie sich im Werk

```ts
// lib/payment/lib/payment-provider-factory.ts
export type SupportedProvider =
  'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar' | 'newprovider';

static createProvider(providerType, config) {
  switch (providerType) {
    // ... existing cases
    case 'newprovider':
      return new NewProvider(config);
  }
}
```

### 3. Konfiguration hinzufügen

```ts
// lib/payment/config/payment-provider-manager.ts
// Add to ConfigManager:
private static newproviderApiKey = process.env.NEWPROVIDER_API_KEY || '';

// Add validation method
private static validateNewProviderConfig(): void { /* ... */ }

// Add to PaymentProviderManager
static getNewProvider(): NewProvider { /* ... */ }
```

### 4. Webhook-Route erstellen

```ts
// app/api/newprovider/webhook/route.ts
export async function POST(request: NextRequest) {
  // Verify signature, parse events, delegate to WebhookSubscriptionService
}
```

### 5. UI-Komponente erstellen

```tsx
// lib/payment/ui/newprovider/newprovider-elements.tsx
export default function NewProviderElements(props: PaymentFormProps) {
  // Render the provider's payment form
}
```

## Utility-Funktionen

Das Modul Zahlungsarten enthält Formatierungshilfen:

```ts
// Convert cents to formatted currency string
formatCentsToCurrency(2999, 'USD', 'en-US')  // "$29.99"

// Convert between cents and decimals
convertCentsToDecimal(2999)     // 29.99
convertDecimalToCents(29.99)    // 2999

// Timestamp conversions
convertNumberToDate(1640995200)  // Date object
safeTimestampToDate(timestamp)   // Date | undefined (handles null/NaN)
```
