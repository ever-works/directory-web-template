// Types for Lemonsqueezy checkout API

export interface CreateCheckoutRequest {
  customPrice?: number;
  variantId?: number;
  metadata?: Record<string, any>;
}

export interface CreateCheckoutResponse {
  success: boolean;
  data: {
    email: string;
    checkoutUrl: string;
    customPrice?: number;
    variantId?: number;
    metadata?: Record<string, any>;
  };
  message: string;
}

export interface CreateCheckoutError {
  error: string;
  message: string;
}

export interface CheckoutQueryParams {
  email: string;
  customPrice?: string;
  variantId?: string;
  metadata?: string;
}

// HTTP Status codes for the API
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error types for better error handling
export const ERROR_TYPES = {
  VALIDATION_ERROR: 'Validation Error',
  CONFIGURATION_ERROR: 'Configuration Error',
  PAYMENT_SERVICE_ERROR: 'Payment Service Error',
  INTERNAL_ERROR: 'Internal Server Error',
} as const;

// Validation error messages
export const VALIDATION_MESSAGES = {
  INVALID_EMAIL_FORMAT: 'Invalid email format',
  INVALID_PRICE: 'Custom price must be a non-negative integer in cents',
  INVALID_VARIANT_ID: 'Variant ID must be a positive integer',
  INVALID_METADATA: 'Metadata must be valid JSON',
} as const;
