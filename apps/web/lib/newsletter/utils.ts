// ============================================================================
// NEWSLETTER UTILITIES
// ============================================================================

import { EmailService } from "@/lib/mail";
import { getNewsletterSubscriptionByEmail } from "@/lib/db/queries";
import { EmailConfig, NewsletterSource } from "./config";

// ============================================================================
// EMAIL UTILITIES
// ============================================================================

/**
 * Sends email with comprehensive error handling
 */
export const sendEmailSafely = async (
  emailService: EmailService,
  emailConfig: EmailConfig,
  template: { subject: string; html: string; text: string },
  to: string,
  context: string = "newsletter"
): Promise<{ success: boolean; error?: string }> => {
  try {
    await emailService.sendCustomEmail({
      from: emailConfig.defaultFrom,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    
    console.log(`✅ ${context} email sent successfully to ${to}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Failed to send ${context} email to ${to}:`, errorMessage);
    
    return { 
      success: false, 
      error: `Failed to send ${context} email: ${errorMessage}` 
    };
  }
};

/**
 * Creates email service instance with configuration
 */
export const createEmailService = async (): Promise<{
  service: EmailService;
  config: EmailConfig;
}> => {
  const { createEmailConfig } = await import("./config");
  const config = await createEmailConfig();
  const service = new EmailService(config);
  
  return { service, config };
};

// ============================================================================
// SUBSCRIPTION VALIDATION
// ============================================================================

/**
 * Validates subscription status for an email
 */
export const validateSubscriptionStatus = async (
  email: string,
  shouldBeActive: boolean = true
): Promise<{ isValid: boolean; error?: string; subscription?: any }> => {
  try {
    const existingSubscription = await getNewsletterSubscriptionByEmail(email);
    
    if (shouldBeActive) {
      if (!existingSubscription || !existingSubscription.isActive) {
        return { 
          isValid: false, 
          error: "Email is not subscribed to the newsletter" 
        };
      }
    } else {
      if (existingSubscription?.isActive) {
        return { 
          isValid: false, 
          error: "Email is already subscribed to the newsletter" 
        };
      }
    }
    
    return { isValid: true, subscription: existingSubscription };
  } catch (error) {
    console.error("Error validating subscription status:", error);
    return { 
      isValid: false, 
      error: "Failed to validate subscription status" 
    };
  }
};

/**
 * Checks if email can be subscribed (not already active)
 */
export const canSubscribe = async (email: string): Promise<{ canSubscribe: boolean; error?: string }> => {
  const validation = await validateSubscriptionStatus(email, false);
  return {
    canSubscribe: validation.isValid,
    error: validation.error,
  };
};

/**
 * Checks if email can be unsubscribed (currently active)
 */
export const canUnsubscribe = async (email: string): Promise<{ canUnsubscribe: boolean; error?: string }> => {
  const validation = await validateSubscriptionStatus(email, true);
  return {
    canUnsubscribe: validation.isValid,
    error: validation.error,
  };
};

// ============================================================================
// LOGGING & MONITORING
// ============================================================================

/**
 * Logs newsletter activity for monitoring
 */
export const logNewsletterActivity = (
  action: "subscribe" | "unsubscribe" | "email_sent" | "email_failed",
  email: string,
  source: NewsletterSource = "footer",
  details?: Record<string, any>
): void => {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    action,
    email,
    source,
    ...details,
  };
  
  console.log(`📧 Newsletter Activity:`, logData);
  
  // In production, you might want to send this to a logging service
  // like Sentry, LogRocket, or your own analytics
};

/**
 * Tracks newsletter metrics
 */
export const trackNewsletterMetric = (
  metric: "subscription" | "unsubscription" | "email_sent" | "email_failed",
  email: string,
  source: NewsletterSource = "footer"
): void => {
  logNewsletterActivity(
    metric === "subscription" ? "subscribe" : 
    metric === "unsubscription" ? "unsubscribe" : 
    metric === "email_sent" ? "email_sent" : "email_failed",
    email,
    source
  );
};

// ============================================================================
// TEMPLATE UTILITIES
// ============================================================================

/**
 * Gets template with company name
 */
export const getTemplateWithCompany = async (
  templateFunction: (email: string, companyName: string) => any,
  email: string
): Promise<any> => {
  const { getCompanyName } = await import("./config");
  const companyName = await getCompanyName();
  return templateFunction(email, companyName);
};

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Creates standardized error response
 */
export const createErrorResponse = (
  error: string,
  email?: string,
  context?: string
): { error: string; email?: string; context?: string } => {
  return {
    error,
    email,
    context,
  };
};

/**
 * Creates standardized success response
 */
export const createSuccessResponse = (
  email?: string,
  context?: string
): { success: true; email?: string; context?: string } => {
  return {
    success: true,
    email,
    context,
  };
}; 