import { getCachedConfig } from '../content';
import { EmailProviderFactory } from './factory';
import { getPasswordChangeConfirmationTemplate } from './templates';
import { coreConfig, emailConfig as globalEmailConfig } from '@/lib/config/config-service';

export interface EmailMessage {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<any>;
  getName(): string;
}

export interface EmailNovuConfig {
  templateId?: string;
  backendUrl?: string;
}

export interface EmailServiceConfig {
  provider: string;
  defaultFrom: string;
  apiKeys: Record<string, string>;
  domain: string;
  novu?: EmailNovuConfig;
}

export class EmailService {
  private provider: EmailProvider | null = null;
  private domain: string;
  private defaultFrom: string;
  private isAvailable: boolean = false;

  constructor(config: EmailServiceConfig) {
    try {
      // Check if required API keys are present
      const hasApiKey = Object.values(config.apiKeys).some(key => key && key.trim() !== '');

      if (!hasApiKey) {
        console.warn('⚠️  Email service: No API keys configured. Email features will be disabled.');
        this.isAvailable = false;
      } else {
        this.provider = EmailProviderFactory.createProvider(config);
        this.isAvailable = true;
      }

      this.domain = config.domain;
      this.defaultFrom = config.defaultFrom;
    } catch (error) {
      console.warn('⚠️  Email service initialization failed:', error instanceof Error ? error.message : 'Unknown error');
      this.isAvailable = false;
      this.domain = config.domain;
      this.defaultFrom = config.defaultFrom;
    }
  }

  /**
   * Check if email service is available
   */
  public isServiceAvailable(): boolean {
    return this.isAvailable && this.provider !== null;
  }

  /**
   * Ensure email service is available before sending
   */
  private ensureAvailable(): void {
    if (!this.isServiceAvailable()) {
      throw new Error('Email service is not available. Please configure email provider API keys.');
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<any> {
    this.ensureAvailable();
    // Use the new professional template instead of the simple one
    return this.sendVerificationEmailWithTemplate(email, token);
  }

  async sendNewsletterSubscriptionEmail(email: string): Promise<any> {
    this.ensureAvailable();
    return this.provider!.sendEmail({
      from: this.defaultFrom,
      to: email,
      subject: "Welcome to the newsletter",
      html: `<p>Welcome to the newsletter.</p>`,
    });
  }

  async sendNewsletterUnsubscriptionEmail(email: string): Promise<any> {
    this.ensureAvailable();
    return this.provider!.sendEmail({
      from: this.defaultFrom,
      to: email,
      subject: "Unsubscribe from the newsletter",
      html: `<p>You have been unsubscribed from the newsletter.</p>`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<any> {
    this.ensureAvailable();
    const resetLink = `${this.domain}/auth/new-password?token=${token}`;
    return this.provider!.sendEmail({
      from: this.defaultFrom,
      to: email,
      subject: "Reset your password",
      html: `<p>Click <a href="${resetLink}">here</a> to reset password.</p>`,
    });
  }

  async sendTwoFactorTokenEmail(email: string, token: string): Promise<any> {
    this.ensureAvailable();
    return this.provider!.sendEmail({
      from: this.defaultFrom,
      to: email,
      subject: "2FA Code",
      html: `<p>Your 2FA code: ${token}</p>`,
    });
  }

  async sendPasswordChangeConfirmationEmail(email: string, userName?: string, ipAddress?: string, userAgent?: string): Promise<any> {
    console.log("🎨 Generating email template...");

    const templateData = {
      customerName: userName,
      customerEmail: email,
      changeDate: new Date().toLocaleString(),
      ipAddress,
      userAgent,
      companyUrl: this.domain,
    };

    console.log("📝 Template data:", templateData);

    const template = getPasswordChangeConfirmationTemplate(templateData);

    console.log("📧 Template generated:", {
      subject: template.subject,
      hasHtml: !!template.html,
      hasText: !!template.text,
      htmlLength: template.html?.length,
      textLength: template.text?.length
    });

    const emailMessage = {
      from: this.defaultFrom,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    };

    this.ensureAvailable();

    console.log("📮 Sending email with provider:", this.provider!.getName());
    console.log("📬 Email message:", {
      from: emailMessage.from,
      to: emailMessage.to,
      subject: emailMessage.subject,
      hasHtml: !!emailMessage.html,
      hasText: !!emailMessage.text
    });

    try {
      const result = await this.provider!.sendEmail(emailMessage);
      console.log("✅ Provider send result:", result);
      return result;
    } catch (providerError) {
      console.error("❌ Provider send error:", providerError);
      throw providerError;
    }
  }

  async sendCustomEmail(message: EmailMessage): Promise<any> {
    this.ensureAvailable();
    return this.provider!.sendEmail(message);
  }

  async sendAccountCreatedEmail(
    userName: string,
    userEmail: string,
    companyName?: string
  ): Promise<any> {
    this.ensureAvailable();
    const { getAccountCreatedTemplate } = await import("./templates");
    const template = getAccountCreatedTemplate({
      userName,
      userEmail,
      companyName,
      companyUrl: this.domain,
    });

    return this.provider!.sendEmail({
      from: this.defaultFrom,
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendVerificationEmailWithTemplate(
    email: string,
    token: string,
    userName?: string
  ): Promise<any> {
    this.ensureAvailable();
    const { getEmailVerificationTemplate } = await import("./templates");
    const verificationLink = `${this.domain}/auth/new-verification?token=${token}`;
    const template = getEmailVerificationTemplate({
      userEmail: email,
      verificationLink,
      companyUrl: this.domain,
      userName,
    });

    return this.provider!.sendEmail({
      from: this.defaultFrom,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  getProviderName(): string {
    if (!this.isServiceAvailable()) {
      return 'none (not configured)';
    }
    return this.provider!.getName();
  }
}

const appUrl = coreConfig.APP_URL || 'https://demo.ever.works';

const emailConfig: EmailServiceConfig = {
	provider: globalEmailConfig.EMAIL_PROVIDER,
	defaultFrom: globalEmailConfig.EMAIL_FROM || 'info@ever.works',
	domain: appUrl,
	apiKeys: {
		resend: globalEmailConfig.resend.apiKey || '',
		novu: globalEmailConfig.novu.apiKey || '',
	},
};

async function mailService() {
  const config = await getCachedConfig();

  return new EmailService({
    ...emailConfig,
    provider: config.mail?.provider || emailConfig.provider,
    defaultFrom: config.mail?.default_from || emailConfig.defaultFrom,
    domain: config.app_url || emailConfig.domain,
    novu:
      config.mail?.provider === "novu"
        ? {
            templateId: config.mail?.template_id,
            backendUrl: config.mail?.backend_url,
          }
        : undefined,
  });
}

// Result type for email operations when service is unavailable
interface EmailSkippedResult {
  skipped: true;
  reason: string;
}

// Helper to check if email service is available and handle gracefully
async function tryEmailOperation<T>(
  operation: (service: EmailService) => Promise<T>,
  operationName: string
): Promise<T | EmailSkippedResult> {
  try {
    const service = await mailService();
    
    if (!service.isServiceAvailable()) {
      console.warn(`[EMAIL] ${operationName}: Skipped - email service not configured`);
      return { skipped: true, reason: 'Email service not configured' };
    }
    
    return await operation(service);
  } catch (error) {
    // If it's an availability error, return skipped result instead of throwing
    if (error instanceof Error && error.message.includes('not available')) {
      console.warn(`[EMAIL] ${operationName}: Skipped - ${error.message}`);
      return { skipped: true, reason: error.message };
    }
    // For other errors, log and rethrow
    console.error(`[EMAIL] ${operationName}: Error -`, error);
    throw error;
  }
}

export const sendVerificationEmail = async (email: string, token: string) => {
  return tryEmailOperation(
    (service) => service.sendVerificationEmail(email, token),
    'sendVerificationEmail'
  );
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  return tryEmailOperation(
    (service) => service.sendPasswordResetEmail(email, token),
    'sendPasswordResetEmail'
  );
};

export const sendNewsletterSubscriptionEmail = async (email: string) => {
  return tryEmailOperation(
    (service) => service.sendNewsletterSubscriptionEmail(email),
    'sendNewsletterSubscriptionEmail'
  );
};

export const sendNewsletterUnsubscriptionEmail = async (email: string) => {
  return tryEmailOperation(
    (service) => service.sendNewsletterUnsubscriptionEmail(email),
    'sendNewsletterUnsubscriptionEmail'
  );
};

export const sendTwoFactorTokenEmail = async (email: string, token: string) => {
  return tryEmailOperation(
    (service) => service.sendTwoFactorTokenEmail(email, token),
    'sendTwoFactorTokenEmail'
  );
};

export const sendPasswordChangeConfirmationEmail = async (
  email: string,
  userName?: string,
  ipAddress?: string,
  userAgent?: string
) => {
  return tryEmailOperation(
    (service) => service.sendPasswordChangeConfirmationEmail(email, userName, ipAddress, userAgent),
    'sendPasswordChangeConfirmationEmail'
  );
};

export const sendAccountCreatedEmail = async (
  userName: string,
  userEmail: string,
  companyName?: string
) => {
  return tryEmailOperation(
    (service) => service.sendAccountCreatedEmail(userName, userEmail, companyName),
    'sendAccountCreatedEmail'
  );
};

export const sendVerificationEmailWithTemplate = async (
  email: string,
  token: string,
  userName?: string
) => {
  return tryEmailOperation(
    (service) => service.sendVerificationEmailWithTemplate(email, token, userName),
    'sendVerificationEmailWithTemplate'
  );
};
