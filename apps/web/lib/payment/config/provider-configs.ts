import { SupportedProvider, PaymentProviderConfig } from '../types/payment-types';

/**
 * Creates payment provider configurations
 * @param stripeConfig? - Stripe configuration with publishable key and webhook secret
 * @param solidgateConfig - Solidgate configuration with API key and webhook secret
 * @param lemonsqueezyConfig - LemonSqueezy configuration with API key and webhook secret
 * @returns Record of provider configurations
 */
export const createProviderConfigs = (
  stripeConfig?: { 
    apiKey: string;
    webhookSecret: string;
    options?: {
      apiVersion?: string;
      [key: string]: any;
    };
  },
  solidgateConfig?: { 
    apiKey: string; 
    webhookSecret: string;
    options?: {
      [key: string]: any;
    };
  },
  lemonsqueezyConfig?: { 
    apiKey: string; 
    webhookSecret: string;
    options?: {
      storeId?: string;
      testMode?: boolean;
      [key: string]: any;
    };
  },
  polarConfig?: { 
    apiKey: string; 
    webhookSecret: string;
    options?: {
      organizationId?: string;
      appUrl?: string;
      [key: string]: any;
    };
  }
): Record<SupportedProvider, PaymentProviderConfig> => ({
  stripe: {
    apiKey: stripeConfig?.apiKey || '',
    webhookSecret: stripeConfig?.webhookSecret || '',
    options: {
      apiVersion: stripeConfig?.options?.apiVersion || '2023-10-16',
      ...stripeConfig?.options
    }
  },
  solidgate: {
    apiKey: solidgateConfig?.apiKey || '',
    webhookSecret: solidgateConfig?.webhookSecret || '',
    options: solidgateConfig?.options || {}
  },
  lemonsqueezy: {
    apiKey: lemonsqueezyConfig?.apiKey || '',
    webhookSecret: lemonsqueezyConfig?.webhookSecret || '',
    options: lemonsqueezyConfig?.options || {}
  },
  polar: {
    apiKey: polarConfig?.apiKey || '',
    webhookSecret: polarConfig?.webhookSecret || '',
    options: polarConfig?.options || {}
  }
}); 


