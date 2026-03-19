import { AdminNotificationEmailHtml } from '@/lib/mail/templates/admin-notification';
import { getSubmissionDecisionTemplate } from '@/lib/mail/templates/submission-decision';
import { EmailService } from '@/lib/mail';
import { coreConfig, emailConfig } from '@/lib/config/config-service';

/**
 * Helper to create email service config from ConfigService
 */
function getEmailServiceConfig() {
	return {
		provider: emailConfig.EMAIL_PROVIDER,
		defaultFrom: emailConfig.EMAIL_FROM || 'info@ever.works',
		domain: coreConfig.APP_URL || 'https://demo.ever.works',
		apiKeys: {
			resend: emailConfig.resend.apiKey || '',
			novu: emailConfig.novu.apiKey || '',
		},
	};
}

  export interface EmailNotificationData {
    to: string;
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    notificationType: string;
    timestamp: string;
  }

  export class EmailNotificationService {
    /**
     * Send admin notification email
     */
    static async sendAdminNotification(data: EmailNotificationData) {
      try {
        // Create a simple email service instance for notifications
        const emailService = new EmailService(getEmailServiceConfig());

        // Check if email service is available
        if (!emailService.isServiceAvailable()) {
          console.warn('[EmailNotification] Skipped - email service not configured');
          return {
            success: false,
            skipped: true,
            error: "Email service not configured",
          };
        }

        const template = AdminNotificationEmailHtml({
          title: data.title,
          message: data.message,
          actionUrl: data.actionUrl,
          actionText: data.actionText,
          notificationType: data.notificationType,
          timestamp: data.timestamp,
        });

        const result = await emailService.sendCustomEmail({
          from: emailConfig.EMAIL_FROM || 'info@ever.works',
          to: data.to,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });

        return {
          success: true,
          messageId: result.messageId,
        };
      } catch (error) {
        // If it's an availability error, return skipped result instead of failing
        if (error instanceof Error && error.message.includes('not available')) {
          console.warn('[EmailNotification] Skipped -', error.message);
          return {
            success: false,
            skipped: true,
            error: error.message,
          };
        }
        console.error("Error sending admin notification email:", error);
        return {
          success: false,
          error: "Failed to send email notification",
        };
      }
    }

    /**
     * Send item submission notification email
     */
    static async sendItemSubmissionEmail(
      adminEmail: string,
      itemName: string,
      submittedBy: string,
      actionUrl: string
    ) {
      return this.sendAdminNotification({
        to: adminEmail,
        title: "New Item Submission",
        message: `A new item "${itemName}" has been submitted by ${submittedBy} and requires review.`,
        actionUrl,
        actionText: "Review Item",
        notificationType: "item_submission",
        timestamp: new Date().toLocaleString(),
      });
    }

    /**
     * Send comment reported notification email
     */
    static async sendCommentReportedEmail(
      adminEmail: string,
      commentContent: string,
      reportedBy: string,
      actionUrl: string
    ) {
      return this.sendAdminNotification({
        to: adminEmail,
        title: "Comment Reported",
        message: `A comment has been reported by ${reportedBy} and requires review. Content: "${commentContent.substring(0, 100)}..."`,
        actionUrl,
        actionText: "Review Comment",
        notificationType: "comment_reported",
        timestamp: new Date().toLocaleString(),
      });
    }

    /**
     * Send user registration notification email
     */
    static async sendUserRegisteredEmail(
      adminEmail: string,
      userEmail: string,
      actionUrl: string
    ) {
      return this.sendAdminNotification({
        to: adminEmail,
        title: "New User Registration",
        message: `A new user has registered with email: ${userEmail}`,
        actionUrl,
        actionText: "View User",
        notificationType: "user_registered",
        timestamp: new Date().toLocaleString(),
      });
    }

    /**
     * Send payment failure notification email
     */
    static async sendPaymentFailedEmail(
      adminEmail: string,
      userEmail: string,
      amount: number,
      reason: string,
      actionUrl: string
    ) {
      return this.sendAdminNotification({
        to: adminEmail,
        title: "Payment Failure",
        message: `Payment failed for user ${userEmail} (${amount} USD). Reason: ${reason}`,
        actionUrl,
        actionText: "View User",
        notificationType: "payment_failed",
        timestamp: new Date().toLocaleString(),
      });
    }

    /**
     * Send system alert notification email
     */
    static async sendSystemAlertEmail(
      adminEmail: string,
      title: string,
      message: string,
      actionUrl?: string
    ) {
      return this.sendAdminNotification({
        to: adminEmail,
        title: `System Alert: ${title}`,
        message,
        actionUrl,
        actionText: actionUrl ? "View Details" : undefined,
        notificationType: "system_alert",
        timestamp: new Date().toLocaleString(),
      });
    }

    /**
     * Send bulk notifications to multiple admins
     */
    static async sendBulkAdminNotifications(
      adminEmails: string[],
      data: Omit<EmailNotificationData, "to">
    ) {
      const results = await Promise.allSettled(
        adminEmails.map(email =>
          this.sendAdminNotification({
            ...data,
            to: email,
          })
        )
      );

      const successful = results.filter(
        result => result.status === "fulfilled" && result.value.success
      ).length;

      const failed = results.length - successful;

      return {
        total: results.length,
        successful,
        failed,
        results: results.map((result, index) => ({
          email: adminEmails[index],
          result: result.status === "fulfilled" ? result.value : { success: false, error: "Failed" },
        })),
      };
    }

    /**
     * Send submission decision notification email to user
     */
    static async sendSubmissionDecisionEmail(
      userEmail: string,
      itemName: string,
      status: "approved" | "rejected",
      reviewNotes?: string
    ) {
      console.log('[EmailNotification] Starting sendSubmissionDecisionEmail');

      try {
        const emailService = new EmailService(getEmailServiceConfig());

        console.log('[EmailNotification] Email service initialized, checking availability...');
        const isAvailable = emailService.isServiceAvailable();
        console.log('[EmailNotification] Email service available:', isAvailable);

        if (!isAvailable) {
          console.warn("[EmailNotification] Skipped - email service not configured");
          return {
            success: false,
            skipped: true,
            error: "Email service not configured",
          };
        }

        console.log('[EmailNotification] Generating template...');
        const template = getSubmissionDecisionTemplate({
          itemName,
          status,
          reviewNotes,
        });
        console.log('[EmailNotification] Template generated:', {
          subject: template.subject,
          hasHtml: !!template.html,
          hasText: !!template.text
        });

        console.log('[EmailNotification] Calling sendCustomEmail...');
        const result = await emailService.sendCustomEmail({
          from: emailConfig.EMAIL_FROM || 'info@ever.works',
          to: userEmail,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });

        console.log('[EmailNotification] Email sent successfully:', result);

        // Check if result contains an error (Resend returns errors in result.error)
        if (result && typeof result === 'object' && 'error' in result && result.error) {
          const error = result.error as any;
          console.error('[EmailNotification] Provider returned error:', error);

          // Handle domain verification error specifically
          if (error.statusCode === 403 && error.message?.includes('domain is not verified')) {
            console.error('❌ [EmailNotification] DOMAIN NOT VERIFIED');
            console.error('   Fix: Use onboarding@resend.dev for testing, or verify your domain at https://resend.com/domains');
            return {
              success: false,
              error: `Domain not verified. Use EMAIL_FROM=onboarding@resend.dev for testing, or verify your domain at https://resend.com/domains`
            };
          }

          return {
            success: false,
            error: error.message || 'Email provider error'
          };
        }

        return {
          success: true,
          messageId: result.messageId || result.id,
        };
      } catch (error) {
        console.error('[EmailNotification] Error:', error);
        if (error instanceof Error && error.message.includes("not available")) {
          console.warn("[EmailNotification] Skipped -", error.message);
          return {
            success: false,
            skipped: true,
            error: error.message,
          };
        }
        console.error("Error sending submission decision email:", error);
        return {
          success: false,
          error: "Failed to send email notification",
        };
      }
    }

    // ===================== Moderation Notification Emails =====================

    /**
     * Send warning notification email to user
     */
    static async sendUserWarningEmail(
      userEmail: string,
      reason: string,
      warningCount: number
    ) {
      try {
        const emailService = new EmailService(getEmailServiceConfig());

        if (!emailService.isServiceAvailable()) {
          console.warn("[EmailNotification] Skipped - email service not configured");
          return { success: false, skipped: true, error: "Email service not configured" };
        }

        const siteName = coreConfig.SITE_NAME || 'Ever Works';
        const subject = `Warning Notice - ${siteName}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">Warning Notice</h2>
            <p>You have received a warning on your account.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p><strong>Total warnings:</strong> ${warningCount}</p>
            <p style="margin-top: 20px;">Please review our community guidelines to avoid future violations. Repeated violations may result in account suspension or ban.</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              If you believe this was a mistake, please contact our support team.
            </p>
          </div>
        `;

        const result = await emailService.sendCustomEmail({
          from: emailConfig.EMAIL_FROM || 'info@ever.works',
          to: userEmail,
          subject,
          html,
          text: `Warning Notice\n\nYou have received a warning on your account.\n\nReason: ${reason}\nTotal warnings: ${warningCount}\n\nPlease review our community guidelines to avoid future violations.`,
        });

        return { success: true, messageId: result.messageId };
      } catch (error) {
        console.error("Error sending user warning email:", error);
        return { success: false, error: "Failed to send email notification" };
      }
    }

    /**
     * Send suspension notification email to user
     */
    static async sendUserSuspensionEmail(
      userEmail: string,
      reason: string
    ) {
      try {
        const emailService = new EmailService(getEmailServiceConfig());

        if (!emailService.isServiceAvailable()) {
          console.warn("[EmailNotification] Skipped - email service not configured");
          return { success: false, skipped: true, error: "Email service not configured" };
        }

        const siteName = coreConfig.SITE_NAME || 'Ever Works';
        const subject = `Account Suspended - ${siteName}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444;">Account Suspended</h2>
            <p>Your account has been suspended due to a violation of our community guidelines.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p style="margin-top: 20px;">While suspended, you will not be able to:</p>
            <ul>
              <li>Submit new items</li>
              <li>Post comments</li>
              <li>Vote on content</li>
            </ul>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              If you believe this was a mistake, please contact our support team to appeal this decision.
            </p>
          </div>
        `;

        const result = await emailService.sendCustomEmail({
          from: emailConfig.EMAIL_FROM || 'info@ever.works',
          to: userEmail,
          subject,
          html,
          text: `Account Suspended\n\nYour account has been suspended due to a violation of our community guidelines.\n\nReason: ${reason}\n\nWhile suspended, you will not be able to submit new items, post comments, or vote on content.\n\nIf you believe this was a mistake, please contact our support team.`,
        });

        return { success: true, messageId: result.messageId };
      } catch (error) {
        console.error("Error sending user suspension email:", error);
        return { success: false, error: "Failed to send email notification" };
      }
    }

    /**
     * Send ban notification email to user
     */
    static async sendUserBanEmail(
      userEmail: string,
      reason: string
    ) {
      try {
        const emailService = new EmailService(getEmailServiceConfig());

        if (!emailService.isServiceAvailable()) {
          console.warn("[EmailNotification] Skipped - email service not configured");
          return { success: false, skipped: true, error: "Email service not configured" };
        }

        const siteName = coreConfig.SITE_NAME || 'Ever Works';
        const subject = `Account Banned - ${siteName}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Account Banned</h2>
            <p>Your account has been permanently banned due to serious violations of our community guidelines.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p style="margin-top: 20px;">This action is permanent and you will no longer be able to access your account or participate in our community.</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              If you believe this was made in error, you may contact our support team, but reinstatement is not guaranteed.
            </p>
          </div>
        `;

        const result = await emailService.sendCustomEmail({
          from: emailConfig.EMAIL_FROM || 'info@ever.works',
          to: userEmail,
          subject,
          html,
          text: `Account Banned\n\nYour account has been permanently banned due to serious violations of our community guidelines.\n\nReason: ${reason}\n\nThis action is permanent and you will no longer be able to access your account.\n\nIf you believe this was made in error, you may contact our support team.`,
        });

        return { success: true, messageId: result.messageId };
      } catch (error) {
        console.error("Error sending user ban email:", error);
        return { success: false, error: "Failed to send email notification" };
      }
    }

    /**
     * Send content removed notification email to user
     */
    static async sendContentRemovedEmail(
      userEmail: string,
      contentType: "item" | "comment",
      reason: string
    ) {
      try {
        const emailService = new EmailService(getEmailServiceConfig());

        if (!emailService.isServiceAvailable()) {
          console.warn("[EmailNotification] Skipped - email service not configured");
          return { success: false, skipped: true, error: "Email service not configured" };
        }

        const siteName = coreConfig.SITE_NAME || 'Ever Works';
        const contentLabel = contentType === "item" ? "submission" : "comment";
        const subject = `Content Removed - ${siteName}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6b7280;">Content Removed</h2>
            <p>Your ${contentLabel} has been removed from our platform.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p style="margin-top: 20px;">This action was taken because the content violated our community guidelines.</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              Please review our guidelines before posting again. Repeated violations may result in account restrictions.
            </p>
          </div>
        `;

        const result = await emailService.sendCustomEmail({
          from: emailConfig.EMAIL_FROM || 'info@ever.works',
          to: userEmail,
          subject,
          html,
          text: `Content Removed\n\nYour ${contentLabel} has been removed from our platform.\n\nReason: ${reason}\n\nPlease review our guidelines before posting again.`,
        });

        return { success: true, messageId: result.messageId };
      } catch (error) {
        console.error("Error sending content removed email:", error);
        return { success: false, error: "Failed to send email notification" };
      }
    }
  }
