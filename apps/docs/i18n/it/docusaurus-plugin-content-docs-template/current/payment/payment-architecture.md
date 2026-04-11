---
id: payment-architecture
title: Architettura dei pagamenti
sidebar_label: Architettura
sidebar_position: 6
---

# Architettura dei pagamenti

Il modello Ever Works implementa un sistema di pagamento indipendente dal fornitore che supporta quattro fornitori di pagamenti: **Stripe**, **LemonSqueezy**, **Polar** e **Solidgate**. L'architettura utilizza un modello factory con istanze del provider singleton, consentendo il cambio del provider di runtime.

## Posizioni delle fonti

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

## Diagramma del sistema

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

## Interfaccia del fornitore

Ogni fornitore di servizi di pagamento implementa lo stesso `PaymentProviderInterface` :

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

Questa interfaccia garantisce che il cambio di fornitore non richieda modifiche al codice chiamante.

## PaymentProviderFactory

La factory crea istanze del provider in base a una stringa del tipo di provider:

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

## Servizio di pagamento (facciata)

Il `PaymentService` racchiude una singola istanza del provider dietro un'API pulita. Delega ogni chiamata al fornitore sottostante:

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

### Definizioni del piano

Il servizio definisce inoltre le costanti del piano di pagamento:

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

##PaymentServiceManager

Il gestore gestisce il ciclo di vita del singleton e il cambio del provider di runtime. Persiste nel provider selezionato in `localStorage` :

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

### Sicurezza SSR

Il gestore gestisce il rendering lato server utilizzando per impostazione predefinita il provider predefinito configurato quando `localStorage` non è disponibile:

```ts
private getStoredProvider(): SupportedProvider {
  if (typeof window === 'undefined') return this.DEFAULT_PROVIDER;
  const stored = localStorage.getItem(this.STORAGE_KEY);
  return (stored as SupportedProvider) || this.DEFAULT_PROVIDER;
}
```

## PaymentProviderManager (livello di configurazione)

Il `PaymentProviderManager` fornisce un modello di accesso singleton alternativo con inizializzazione lazy per provider e convalida della configurazione:

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

### Funzioni utili

Il modulo di configurazione esporta funzioni di supporto per un rapido accesso ai provider:

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

## Gestore configurazione

La classe `ConfigManager` interna carica e convalida le variabili di ambiente per tutti i provider. La configurazione di ogni provider viene convalidata al primo accesso, non all'avvio:

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

La convalida viene attivata una volta per fornitore e genera errori descrittivi che elencano le variabili mancanti.

## Tipi condivisi

### Intento di pagamento

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

### Informazioni sull'abbonamento

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

###Configurazioneclient

```ts
interface ClientConfig {
  publicKey: string;
  paymentGateway: 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
  options?: Record<string, any>;
}
```

###Componenti dell'interfaccia utente

Ogni fornitore restituisce una serie di componenti dell'interfaccia utente per il rendering dei moduli di pagamento:

```ts
interface UIComponents {
  PaymentForm: React.ComponentType<PaymentFormProps>;
  logo: string;
  cardBrands: CardBrandIcon[];
  supportedPaymentMethods: string[];
  translations: Record<string, Record<string, string>>;
}
```

## Aggiunta di un nuovo fornitore

Per aggiungere un quinto gestore dei pagamenti, procedi nel seguente modo:

### 1. Creare la classe Provider

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

### 2. Registrarsi in Fabbrica

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

### 3. Aggiungi configurazione

```ts
// lib/payment/config/payment-provider-manager.ts
// Add to ConfigManager:
private static newproviderApiKey = process.env.NEWPROVIDER_API_KEY || '';

// Add validation method
private static validateNewProviderConfig(): void { /* ... */ }

// Add to PaymentProviderManager
static getNewProvider(): NewProvider { /* ... */ }
```

### 4. Crea percorso webhook

```ts
// app/api/newprovider/webhook/route.ts
export async function POST(request: NextRequest) {
  // Verify signature, parse events, delegate to WebhookSubscriptionService
}
```

### 5. Crea il componente dell'interfaccia utente

```tsx
// lib/payment/ui/newprovider/newprovider-elements.tsx
export default function NewProviderElements(props: PaymentFormProps) {
  // Render the provider's payment form
}
```

## Funzioni di utilità

Il modulo Tipi di pagamento include assistenti per la formattazione:

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
