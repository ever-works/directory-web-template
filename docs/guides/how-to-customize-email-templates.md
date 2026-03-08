---
id: how-to-customize-email-templates
title: "How to Customize Email Templates"
sidebar_label: "Customize Email Templates"
sidebar_position: 9
---

# How to Customize Email Templates

This guide covers the email template system: template structure, variable injection, provider integration, customization, and testing.

## Prerequisites

- Understanding of HTML email best practices (inline styles, table-based layouts)
- Email provider configured (`RESEND_API_KEY` or `NOVU_API_KEY` in `.env.local`)
- Familiarity with the `lib/mail/` directory structure
- Development server running (`pnpm dev`)

---

## Architecture Overview

The email system is organized as follows:

```
lib/mail/
  index.ts                  # EmailService class -- main entry point
  factory.ts                # EmailProviderFactory (Resend, Novu)
  resend.ts                 # Resend provider implementation
  novu.ts                   # Novu provider implementation
  mock.ts                   # Mock provider for development
  templates/
    index.ts                # Barrel exports for all templates
    account-created.ts
    admin-notification.ts
    email-verification.ts
    newsletter-welcome.ts
    newsletter-regular.ts
    newsletter-unsubscribe.ts
    password-change-confirmation.ts
    payment-success.ts
    payment-failed.ts
    submission-decision.ts
    subscription-events.ts
    subscription-expired.ts
    subscription-renewal-reminder.ts
    example-usage.ts        # Template usage examples
```

---

## Email System Core Concepts

### EmailService

The `EmailService` class is the main entry point for sending emails:

```ts
import { EmailService } from '@/lib/mail';

const emailService = new EmailService({
  provider: 'resend',         // or 'novu'
  defaultFrom: 'info@example.com',
  domain: 'https://example.com',
  apiKeys: {
    resend: process.env.RESEND_API_KEY || '',
  },
});
```

### EmailProvider Interface

Every email provider implements this interface:

```ts
interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<any>;
  getName(): string;
}

interface EmailMessage {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}
```

### Template Structure

Each template is a function that accepts typed data and returns `{ subject, html, text }`:

```ts
interface TemplateOutput {
  subject: string;
  html: string;
  text: string;    // Plain-text fallback
}
```

---

## Step 1: Create a New Email Template

Create a new file in `lib/mail/templates/`:

```ts
// lib/mail/templates/welcome-back.ts

/**
 * Email template for welcome-back notifications
 * Sent when a user returns after a period of inactivity
 */

// Security: HTML escape function to prevent XSS
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Security: URL validation function
function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

interface WelcomeBackData {
  userName: string;
  lastLoginDate: string;
  newItemsCount: number;
  dashboardUrl: string;
  companyName?: string;
  companyUrl?: string;
  supportEmail?: string;
}

export const getWelcomeBackTemplate = (data: WelcomeBackData) => {
  const {
    userName,
    lastLoginDate,
    newItemsCount,
    dashboardUrl,
    companyName = 'Ever Works',
    companyUrl = 'https://ever.works',
    supportEmail = 'support@ever.works',
  } = data;

  // Security: Escape all user-provided data
  const safeName = escapeHtml(userName);
  const safeLastLogin = escapeHtml(lastLoginDate);
  const safeDashboardUrl = isValidUrl(dashboardUrl)
    ? dashboardUrl
    : '#';
  const safeCompanyName = escapeHtml(companyName);
  const safeCompanyUrl = isValidUrl(companyUrl) ? companyUrl : '#';

  const subject = `Welcome back, ${safeName}! See what's new`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                Welcome back, ${safeName}!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
                We noticed you have not visited since <strong>${safeLastLogin}</strong>.
                A lot has happened while you were away!
              </p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                There are <strong>${newItemsCount} new items</strong> waiting for you to explore.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #2563eb; border-radius: 6px;">
                    <a href="${safeDashboardUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      View Your Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                &copy; ${new Date().getFullYear()} <a href="${safeCompanyUrl}" style="color: #2563eb; text-decoration: none;">${safeCompanyName}</a>
              </p>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Need help? Contact us at <a href="mailto:${supportEmail}" style="color: #2563eb;">${supportEmail}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const text = `Welcome back, ${safeName}!\n\nWe noticed you haven't visited since ${safeLastLogin}. There are ${newItemsCount} new items waiting for you.\n\nVisit your dashboard: ${safeDashboardUrl}\n\n${safeCompanyName} - ${safeCompanyUrl}`;

  return { subject, html, text };
};
```

---

## Step 2: Export the Template

Add your template to the barrel export file:

```ts
// lib/mail/templates/index.ts

export { getWelcomeEmailTemplate } from './newsletter-welcome';
export { getUnsubscribeEmailTemplate } from './newsletter-unsubscribe';
export { getRegularNewsletterTemplate } from './newsletter-regular';
export { getPaymentSuccessTemplate } from './payment-success';
export { getPaymentFailedTemplate } from './payment-failed';
export { getPasswordChangeConfirmationTemplate } from './password-change-confirmation';
export { getAccountCreatedTemplate } from './account-created';
export { getEmailVerificationTemplate } from './email-verification';
export { getRenewalReminderTemplate } from './subscription-renewal-reminder';
export { getWelcomeBackTemplate } from './welcome-back';  // Add new export
```

---

## Step 3: Send the Email

Use the `EmailService` to send your templated email:

```ts
// lib/services/email-notification.service.ts (or a new service)

import { EmailService } from '@/lib/mail';
import { getWelcomeBackTemplate } from '@/lib/mail/templates';
import { emailConfig, coreConfig } from '@/lib/config/config-service';

export async function sendWelcomeBackEmail(
  userEmail: string,
  userName: string,
  lastLoginDate: string,
  newItemsCount: number,
) {
  const emailService = new EmailService({
    provider: emailConfig.EMAIL_PROVIDER,
    defaultFrom: emailConfig.EMAIL_FROM || 'info@ever.works',
    domain: coreConfig.APP_URL || 'https://demo.ever.works',
    apiKeys: {
      resend: emailConfig.resend.apiKey || '',
      novu: emailConfig.novu.apiKey || '',
    },
  });

  if (!emailService.isServiceAvailable()) {
    console.warn('[WelcomeBack] Email service not configured, skipping');
    return { success: false, skipped: true };
  }

  const template = getWelcomeBackTemplate({
    userName,
    lastLoginDate,
    newItemsCount,
    dashboardUrl: `${coreConfig.APP_URL}/dashboard`,
  });

  const result = await emailService.sendCustomEmail({
    from: emailConfig.EMAIL_FROM || 'info@ever.works',
    to: userEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  return { success: true, messageId: result.messageId };
}
```

---

## Step 4: Template Design Guidelines

### Security Requirements

Every template **must** include these security functions:

1. **`escapeHtml()`** -- Escape all user-provided strings to prevent XSS
2. **`isValidUrl()`** -- Validate all URLs before embedding them in links

```ts
// Always escape user data before inserting into HTML
const safeName = escapeHtml(data.userName);
const safeUrl = isValidUrl(data.url) ? data.url : '#';
```

### HTML Email Best Practices

| Practice | Reason |
|----------|--------|
| Use inline styles | Most email clients strip `<style>` tags |
| Use `<table>` for layout | Flexbox/grid not supported in many email clients |
| Include `role="presentation"` on layout tables | Accessibility |
| Provide a plain-text version | Required by spam filters, used by text-only clients |
| Set explicit widths | Email clients may render unpredictably without them |
| Use web-safe fonts | Custom fonts are not supported everywhere |
| Set background colors on `<td>` | `<div>` backgrounds may not render correctly |

### Responsive Email Pattern

```html
<!-- Outer wrapper: full width on mobile, 600px on desktop -->
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding: 20px;">
      <table width="600" cellpadding="0" cellspacing="0"
        style="max-width: 600px; width: 100%;">
        <!-- Content here -->
      </table>
    </td>
  </tr>
</table>
```

---

## Step 5: Customize Existing Templates

To modify an existing template, edit the corresponding file in `lib/mail/templates/`. Common customizations:

### Change Brand Colors

Replace the hex color values:

```ts
// Before
style="background-color: #2563eb;"  // Blue

// After
style="background-color: #059669;"  // Green
```

### Update Company Information

Templates use default values that can be overridden:

```ts
const {
  companyName = 'Ever Works',       // Change default
  companyUrl = 'https://ever.works', // Change default
  supportEmail = 'support@ever.works',
} = data;
```

### Add a Logo

```html
<tr>
  <td style="padding: 24px; text-align: center;">
    <img
      src="https://yourdomain.com/logo.png"
      alt="Company Logo"
      width="150"
      height="40"
      style="display: block; margin: 0 auto;"
    />
  </td>
</tr>
```

---

## Email Providers

### Resend

```bash
# .env.local
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=info@yourdomain.com
```

### Novu

```bash
# .env.local
EMAIL_PROVIDER=novu
NOVU_API_KEY=your-novu-api-key
EMAIL_FROM=info@yourdomain.com
```

### Development (Mock)

When no API keys are configured, emails are logged to the console instead of being sent. This is the default behavior for local development.

---

## Testing Email Templates

### 1. Preview the HTML Locally

Create a quick preview script:

```ts
// scripts/preview-email.ts

import { getWelcomeBackTemplate } from '../lib/mail/templates/welcome-back';
import fs from 'fs';

const template = getWelcomeBackTemplate({
  userName: 'John Doe',
  lastLoginDate: 'January 15, 2025',
  newItemsCount: 42,
  dashboardUrl: 'https://example.com/dashboard',
});

fs.writeFileSync('/tmp/email-preview.html', template.html);
console.log('Preview saved to /tmp/email-preview.html');
console.log('Subject:', template.subject);
```

Open the generated HTML file in a browser to preview.

### 2. Test with Mailtrap or Similar Service

Use a service like Mailtrap to capture emails in development:

```bash
# .env.local (for testing)
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_test_xxxxxxxx  # Resend test key sends to Mailtrap
```

### 3. Check Email Client Compatibility

Test your templates across email clients:
- Gmail (web, mobile)
- Outlook (desktop, web)
- Apple Mail
- Yahoo Mail

Use a service like Litmus or Email on Acid for comprehensive testing.

---

## Available Templates Reference

| Template | Function | Triggered When |
|----------|----------|----------------|
| Account Created | `getAccountCreatedTemplate()` | User registers |
| Email Verification | `getEmailVerificationTemplate()` | Email verification requested |
| Password Change | `getPasswordChangeConfirmationTemplate()` | Password updated |
| Payment Success | `getPaymentSuccessTemplate()` | Payment completed |
| Payment Failed | `getPaymentFailedTemplate()` | Payment failed |
| Newsletter Welcome | `getWelcomeEmailTemplate()` | Newsletter subscription |
| Newsletter Regular | `getRegularNewsletterTemplate()` | Newsletter broadcast |
| Newsletter Unsubscribe | `getUnsubscribeEmailTemplate()` | Unsubscribe confirmation |
| Subscription Events | `getNewSubscriptionTemplate()` | New subscription |
| Subscription Expired | `getSubscriptionExpiredTemplate()` | Subscription expired |
| Renewal Reminder | `getRenewalReminderTemplate()` | Renewal approaching |
| Submission Decision | `getSubmissionDecisionTemplate()` | Item approved/rejected |
| Admin Notification | `AdminNotificationEmailHtml()` | Admin events |

---

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Email not sent, no errors | Check `emailService.isServiceAvailable()`. If no API keys are configured, emails are silently skipped. |
| HTML renders differently across clients | Use table-based layouts and inline styles. Test across clients. |
| Images not displaying | Use absolute URLs for images. Some clients block remote images by default. |
| Emails going to spam | Ensure your sending domain has SPF, DKIM, and DMARC records configured. |
| Special characters broken | Always use `escapeHtml()` on user data and set `charset="utf-8"` in the template. |
| Plain-text version missing | Always generate a `text` version alongside `html`. Spam filters flag HTML-only emails. |

---

## Checklist

- [ ] Template file created in `lib/mail/templates/`
- [ ] Data interface defined with all required and optional fields
- [ ] `escapeHtml()` used on all user-provided strings
- [ ] `isValidUrl()` used on all URLs before embedding
- [ ] Both `html` and `text` versions generated
- [ ] Template exported from `lib/mail/templates/index.ts`
- [ ] Service function created to call the template and send via `EmailService`
- [ ] Template previewed in a browser
- [ ] Tested with actual email delivery (Resend/Novu)
- [ ] Responsive layout verified on mobile
- [ ] `pnpm tsc --noEmit` passes

---

## Related Guides

- [How to Add a New Feature](./how-to-add-a-new-feature.md)
- [How to Add an API Endpoint](./how-to-add-an-api-endpoint.md)
- [How to Add Translations](./how-to-add-translations.md)
