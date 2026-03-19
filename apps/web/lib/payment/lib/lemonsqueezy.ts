// lib/lemonsqueezy.ts
import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import { initializeLemonsqueezyProvider } from '@/lib/auth';
import { paymentConfig, coreConfig } from '@/lib/config/config-service';

// Remove global initialization - will be called when needed
// initializeLemonsqueezyProvider();

export const validateEnvironment = () => {
	const requiredEnvVars = {
		LEMONSQUEEZY_STORE_ID: paymentConfig.lemonSqueezy.storeId,
		LEMONSQUEEZY_API_KEY: paymentConfig.lemonSqueezy.apiKey,
		NEXT_PUBLIC_APP_URL: coreConfig.APP_URL,
		NEXT_PUBLIC_SITE_URL: coreConfig.SITE_URL,
	};

	const optionalEnvVars = {
		LEMONSQUEEZY_VARIANT_ID: paymentConfig.lemonSqueezy.variantId,
	};

	const missingVars = Object.entries(requiredEnvVars)
		.filter(([, value]) => !value)
		.map(([key]) => key);

	if (missingVars.length > 0) {
		throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
	}

	return { ...requiredEnvVars, ...optionalEnvVars };
};

interface CheckoutParams {
  variantId?: number;
  email?: string;
  customPrice?: number;
  metadata?: Record<string, any>;
}

export async function createCustomCheckout(params: CheckoutParams): Promise<string> {
  try {
    // Initialize LemonSqueezy provider when needed
    initializeLemonsqueezyProvider();
    
    const { variantId, email, customPrice, metadata } = params;
    
    if (customPrice !== undefined && (customPrice < 0 || !Number.isInteger(customPrice))) {
      throw new Error('Custom price must be a non-negative integer in cents');
    }
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format');
    }
    
    const env = validateEnvironment();
    const finalProductId = variantId ?? Number(env.LEMONSQUEEZY_VARIANT_ID);
    if (!finalProductId) {
      throw new Error('Product ID is required. Please provide it as a parameter or set LEMONSQUEEZY_VARIANT_ID environment variable.');
    }
    
    const { data, error } = await createCheckout(
      Number(env.LEMONSQUEEZY_STORE_ID),
      finalProductId, 
      {
        customPrice,
        productOptions: {
          redirectUrl: `${env.NEXT_PUBLIC_SITE_URL}/pricing`,
        },
        checkoutOptions: { 
          embed: true,
          media: false,
          logo: false,
        },
        checkoutData: { 
          email,
          custom: metadata ?? {},
        },
        preview: false,
        testMode: coreConfig.NODE_ENV === 'development',
      }
    );

    if (error) {
      throw new Error(`Lemonsqueezy checkout error: ${error.message || 'Unknown error'}`);
    }

    if (!data?.data?.attributes?.url) {
      throw new Error('Invalid response from Lemonsqueezy: missing checkout URL');
    }

    return data.data.attributes.url;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'Lemon Squeezy Error') {
        throw new Error(`Lemonsqueezy SDK error: ${error.message}`);
      }
      
      throw new Error(`Failed to create checkout: ${error.message}`);
    }
    
    throw new Error('Failed to create checkout: Unknown error occurred');
  }
}
