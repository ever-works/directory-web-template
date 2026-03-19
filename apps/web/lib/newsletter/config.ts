// ============================================================================
// NEWSLETTER CONFIGURATION
// ============================================================================

export const NEWSLETTER_CONFIG = {
  // Default values
  DEFAULT_PROVIDER: "resend",
  DEFAULT_FROM: "onboarding@resend.dev",
  DEFAULT_COMPANY_NAME: "Ever Works",
  
  // Sources
  SOURCES: {
    FOOTER: "footer",
    POPUP: "popup",
    SIGNUP: "signup",
  } as const,
  
  // Error messages
  ERRORS: {
    INVALID_EMAIL: "Please enter a valid email address",
    ALREADY_SUBSCRIBED: "Email is already subscribed to the newsletter",
    NOT_SUBSCRIBED: "Email is not subscribed to the newsletter",
    SUBSCRIPTION_FAILED: "Failed to create subscription. Please try again.",
    UNSUBSCRIPTION_FAILED: "Failed to unsubscribe. Please try again.",
    EMAIL_SEND_FAILED: "Failed to send email. Please try again.",
    STATS_FAILED: "Failed to get newsletter statistics",
  } as const,
  
  // Success messages
  SUCCESS: {
    SUBSCRIBED: "Successfully subscribed to newsletter",
    UNSUBSCRIBED: "Successfully unsubscribed from newsletter",
  } as const,
} as const;

// ============================================================================
// TYPES
// ============================================================================

export type NewsletterSource = typeof NEWSLETTER_CONFIG.SOURCES[keyof typeof NEWSLETTER_CONFIG.SOURCES];

export interface EmailConfig {
  provider: string;
  defaultFrom: string;
  domain: string;
  apiKeys: {
    resend: string;
    novu: string;
  };
  novu?: {
    templateId?: string;
    backendUrl?: string;
  };
}

export interface NewsletterActionResult {
  success?: boolean;
  error?: string;
  email?: string;
}

export interface NewsletterStats {
  totalActive: number;
  recentSubscriptions: number;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

import { z } from "zod";

export const emailSchema = z.object({
  email: z
    .string()
    .email(NEWSLETTER_CONFIG.ERRORS.INVALID_EMAIL)
    .transform((email) => email.toLowerCase().trim()),
});

export const newsletterSubscriptionSchema = z.object({
  email: z
    .string()
    .email(NEWSLETTER_CONFIG.ERRORS.INVALID_EMAIL)
    .transform((email) => email.toLowerCase().trim()),
  source: z
    .enum([NEWSLETTER_CONFIG.SOURCES.FOOTER, NEWSLETTER_CONFIG.SOURCES.POPUP, NEWSLETTER_CONFIG.SOURCES.SIGNUP])
    .default(NEWSLETTER_CONFIG.SOURCES.FOOTER),
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

import { getCachedConfig } from "@/lib/content";
import { coreConfig, emailConfig as globalEmailConfig } from "@/lib/config/config-service";

/**
 * Creates email service configuration from app config
 */
export const createEmailConfig = async (): Promise<EmailConfig> => {
  const config = await getCachedConfig();

  return {
    provider: config.mail?.provider || NEWSLETTER_CONFIG.DEFAULT_PROVIDER,
    defaultFrom: config.mail?.default_from || NEWSLETTER_CONFIG.DEFAULT_FROM,
    domain: config.app_url || coreConfig.APP_URL || "",
    apiKeys: {
      resend: globalEmailConfig.resend.apiKey || "",
      novu: globalEmailConfig.novu.apiKey || "",
    },
    novu: config.mail?.provider === "novu"
      ? {
          templateId: config.mail?.template_id,
          backendUrl: config.mail?.backend_url,
        }
      : undefined,
  };
};

/**
 * Gets company name from config with fallback
 */
export const getCompanyName = async (): Promise<string> => {
  const config = await getCachedConfig();
  return config.company_name || NEWSLETTER_CONFIG.DEFAULT_COMPANY_NAME;
};

/**
 * Validates email format and normalizes it
 */
export const validateAndNormalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

export { isValidEmail as validateEmail } from '@/lib/utils/email-validation'; 