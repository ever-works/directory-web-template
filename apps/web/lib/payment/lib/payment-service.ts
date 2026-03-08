import { User } from '@supabase/auth-js';
import {
  PaymentProviderInterface,
  PaymentIntent,
  PaymentVerificationResult,
  WebhookResult,
  CreatePaymentParams,
  ClientConfig,
  PaymentProviderConfig,
  CreateCustomerParams,
  CustomerResult,
  CreateSubscriptionParams,
  SubscriptionInfo,
  UpdateSubscriptionParams,
  UIComponents,
  SetupIntent
} from '../types/payment-types';
import { PaymentProviderFactory, SupportedProvider } from './payment-provider-factory';

interface PaymentServiceConfig {
  provider: SupportedProvider;
  config: PaymentProviderConfig;
}

export enum PaymentPlanId {
  FREE = "1",
  ONE_TIME = "2",
  SUBSCRIPTION = "3",
  PREMIUM = "4",
}

export interface PaymentPlan {
  id: PaymentPlanId;
  amount: number;
  isSubscription: boolean;
  features: string[];
}

/**
 * Payment service that uses the appropriate provider based on the configuration
 */
export class PaymentService {
  private provider: PaymentProviderInterface;

  /**
   * Create an instance of the payment service
   * @param config - Service configuration
   */
  constructor(config: PaymentServiceConfig) {
    this.provider = PaymentProviderFactory.createProvider(config.provider, config.config);
  }

  /**
   * Check if the user has a customer ID
   */
  hasCustomerId(user: User | null): boolean {
    return this.provider.hasCustomerId(user);
  }

  async getCustomerId(user: User | null): Promise<string | null> {
    return this.provider.getCustomerId(user);
  }

  /**
   * Create a setup intent
   */
  async createSetupIntent(user: User | null): Promise<SetupIntent> {
    return this.provider.createSetupIntent(user);
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(params);
  }

  /**
   * Confirm a payment
   */
  async confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent> {
    return this.provider.confirmPayment(paymentId, paymentMethodId);
  }

  /**
   * Verify the status of a payment
   */
  async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
    return this.provider.verifyPayment(paymentId);
  }

  /**
   * Create a customer
   */
  async createCustomer(params: CreateCustomerParams): Promise<CustomerResult> {
    return this.provider.createCustomer(params);
  }

  /**
   * Create a subscription
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.createSubscription(params);
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<SubscriptionInfo> {
    return this.provider.cancelSubscription(subscriptionId, cancelAtPeriodEnd);
  }

  /**
   * Update a subscription
   */
  async updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.updateSubscription(params);
  }

  /**
   * Handle a payment webhook
   */
  async handleWebhook(payload: any, signature: string, rawBody?: string, timestamp?: string, webhookId?: string): Promise<WebhookResult> {
    return this.provider.handleWebhook(payload, signature, rawBody, timestamp, webhookId);
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, amount?: number): Promise<any> {
    return this.provider.refundPayment(paymentId, amount);
  }

  /**
   * Get the client configuration for frontend integration
   */
  getClientConfig(): ClientConfig {
    return this.provider.getClientConfig();
  }

  /**
   * Get the UI components for the active provider
   * This method allows obtaining the specific UI components
   * without having to write conditional logic in the interface components
   */
  getUIComponents(): UIComponents {
    return this.provider.getUIComponents();
  }
} 