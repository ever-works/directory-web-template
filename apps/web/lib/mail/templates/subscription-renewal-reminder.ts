/**
 * Email template for subscription renewal reminder
 * Sent to users before their subscription renews (typically 7 days before)
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
// Security: URL validation function (returns normalized URL or null)
function isValidUrl(url: string): string | null {
	try {
		const parsedUrl = new URL(url);
		return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:' ? parsedUrl.href : null;
	} catch {
		return null;
	}
}

interface RenewalReminderData {
	customerName: string;
	customerEmail?: string; // Optional: not used in template, but may be useful for logging or future use
	planName: string;
	amount: string;
	currency: string;
	billingPeriod: string;
	renewalDate: string;
	subscriptionId: string;
	companyName?: string;
	companyUrl?: string;
	supportEmail?: string;
	manageSubscriptionUrl?: string;
	disableAutoRenewalUrl?: string;
}

export const getRenewalReminderTemplate = (data: RenewalReminderData) => {
	const {
		customerName,
		planName,
		amount,
		currency,
		billingPeriod,
		renewalDate,
		subscriptionId,
		companyName = 'Ever Works',
		companyUrl = 'https://ever.works',
		supportEmail = 'support@ever.works',
		manageSubscriptionUrl,
		disableAutoRenewalUrl
	} = data;

	// Security: Escape all user-provided data
	const safeCustomerName = escapeHtml(customerName);
	const safePlanName = escapeHtml(planName);
	const safeAmount = escapeHtml(amount);
	const safeCurrency = escapeHtml(currency);
	const safeBillingPeriod = escapeHtml(billingPeriod);
	const safeRenewalDate = escapeHtml(renewalDate);
	const safeSubscriptionId = escapeHtml(subscriptionId);
	const safeCompanyName = escapeHtml(companyName);
	const safeSupportEmail = escapeHtml(supportEmail);

	// Security: Validate URLs
	const validCompanyUrl = isValidUrl(companyUrl) || 'https://ever.works';
	const safeCompanyUrl = escapeHtml(validCompanyUrl);
	const validManageSubscriptionUrl = manageSubscriptionUrl && isValidUrl(manageSubscriptionUrl);
	const safeManageSubscriptionUrl = validManageSubscriptionUrl ? escapeHtml(validManageSubscriptionUrl) : null;
	const validDisableAutoRenewalUrl = disableAutoRenewalUrl && isValidUrl(disableAutoRenewalUrl);
	const safeDisableAutoRenewalUrl = validDisableAutoRenewalUrl ? escapeHtml(validDisableAutoRenewalUrl) : null;

	const currencySymbol = safeCurrency === 'eur' ? '€' : safeCurrency === 'usd' ? '$' : safeCurrency.toUpperCase();

	const subject = `Your ${safePlanName} subscription renews on ${safeRenewalDate}`;

	const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Subscription Renewal Reminder</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          margin-top: 20px;
          margin-bottom: 20px;
          border: 1px solid #e0e0e0;
        }
        .header {
          background-color: #333;
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .header p {
          margin: 10px 0 0 0;
          font-size: 14px;
          opacity: 0.8;
        }
        .content {
          padding: 30px;
        }
        .renewal-details {
          background: #f9f9f9;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
          border: 1px solid #e0e0e0;
        }
        .renewal-details h2 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 16px;
          font-weight: 600;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e0e0e0;
        }
        .detail-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .detail-label {
          color: #666;
        }
        .detail-value {
          font-weight: 600;
          color: #333;
        }
        .info-box {
          background: #f9f9f9;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
        }
        .info-box p {
          margin: 0;
          color: #555;
          font-size: 14px;
        }
        .button-group {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          margin: 25px 0;
        }
        .cta-button {
          display: inline-block;
          background: #333;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
        }
        .secondary-button {
          display: inline-block;
          background: #f5f5f5;
          color: #333;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          border: 1px solid #e0e0e0;
        }
        .footer {
          background: #f9f9f9;
          padding: 25px 30px;
          text-align: center;
          border-top: 1px solid #e0e0e0;
        }
        .footer p {
          margin: 5px 0;
          color: #666;
          font-size: 13px;
        }
        .footer a {
          color: #333;
          text-decoration: none;
        }
        .footer a:hover {
          text-decoration: underline;
        }
        @media (max-width: 600px) {
          .email-container {
            margin: 0;
            border-radius: 0;
          }
          .header, .content, .footer {
            padding: 20px;
          }
          .detail-row {
            flex-direction: column;
            gap: 5px;
          }
          .button-group {
            flex-direction: column;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Renewal Reminder</h1>
          <p>Your subscription renews soon</p>
        </div>
        
        <div class="content">
          <p>Hello <strong>${safeCustomerName}</strong>,</p>
          
          <p>This is a friendly reminder that your <strong>${safePlanName}</strong> subscription will automatically renew on <strong>${safeRenewalDate}</strong>.</p>
          
          <div class="renewal-details">
            <h2>Renewal Details</h2>
            <div class="detail-row">
              <span class="detail-label">Plan:</span>
              <span class="detail-value">${safePlanName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Renewal Amount:</span>
              <span class="detail-value">${currencySymbol}${safeAmount}/${safeBillingPeriod}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Renewal Date:</span>
              <span class="detail-value">${safeRenewalDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Subscription ID:</span>
              <span class="detail-value">${safeSubscriptionId}</span>
            </div>
          </div>
          
          <div class="info-box">
            <p>No action is needed if you'd like to continue your subscription. Your payment method on file will be charged automatically.</p>
          </div>
          
          <div class="button-group">
            ${safeManageSubscriptionUrl ? `<a href="${safeManageSubscriptionUrl}" class="cta-button">Manage Subscription</a>` : ''}
            ${safeDisableAutoRenewalUrl ? `<a href="${safeDisableAutoRenewalUrl}" class="secondary-button">Cancel Auto-Renewal</a>` : ''}
          </div>
          
          <p>If you have any questions or need to update your payment method, please contact our support team.</p>
          
          <p>Thank you for being a valued customer!<br>
          The ${safeCompanyName} Team</p>
        </div>
        
        <div class="footer">
          <p><strong>${safeCompanyName}</strong></p>
          <p>
            <a href="${safeCompanyUrl}">Website</a> | 
            <a href="mailto:${safeSupportEmail}">Support</a> | 
            <a href="${safeCompanyUrl}/privacy">Privacy Policy</a>
          </p>
          <p style="margin-top: 15px;">
            © ${new Date().getFullYear()} ${safeCompanyName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

	const text = `
Subscription Renewal Reminder - ${safeCompanyName}

Hello ${safeCustomerName},

This is a friendly reminder that your ${safePlanName} subscription will automatically renew on ${safeRenewalDate}.

Renewal Details:
- Plan: ${safePlanName}
- Renewal Amount: ${currencySymbol}${safeAmount}/${safeBillingPeriod}
- Renewal Date: ${safeRenewalDate}
- Subscription ID: ${safeSubscriptionId}

No action is needed if you'd like to continue your subscription. Your payment method on file will be charged automatically.

${safeManageSubscriptionUrl ? `Manage Subscription: ${safeManageSubscriptionUrl}` : ''}
${safeDisableAutoRenewalUrl ? `Cancel Auto-Renewal: ${safeDisableAutoRenewalUrl}` : ''}

If you have any questions, please contact our support team.

Thank you for being a valued customer!
The ${safeCompanyName} Team

${safeCompanyUrl}
  `;

	return {
		subject,
		html,
		text
	};
};

// Template for successful renewal notification
export const getRenewalSuccessTemplate = (data: {
	customerName: string;
	planName: string;
	amount: string;
	currency: string;
	billingPeriod: string;
	nextRenewalDate: string;
	invoiceUrl?: string;
	companyName?: string;
	companyUrl?: string;
	supportEmail?: string;
	manageSubscriptionUrl?: string;
}) => {
	const {
		customerName,
		planName,
		amount,
		currency,
		billingPeriod,
		nextRenewalDate,
		invoiceUrl,
		companyName = 'Ever Works',
		companyUrl = 'https://ever.works',
		supportEmail = 'support@ever.works',
		manageSubscriptionUrl
	} = data;

	// Security: Escape all user-provided data
	const safeCustomerName = escapeHtml(customerName);
	const safePlanName = escapeHtml(planName);
	const safeAmount = escapeHtml(amount);
	const safeCurrency = escapeHtml(currency);
	const safeBillingPeriod = escapeHtml(billingPeriod);
	const safeNextRenewalDate = escapeHtml(nextRenewalDate);
	const safeCompanyName = escapeHtml(companyName);
	const safeSupportEmail = escapeHtml(supportEmail);

	// Security: Validate URLs
	const validCompanyUrl = isValidUrl(companyUrl) || 'https://ever.works';
	const safeCompanyUrl = escapeHtml(validCompanyUrl);
	const validInvoiceUrl = invoiceUrl && isValidUrl(invoiceUrl);
	const safeInvoiceUrl = validInvoiceUrl ? escapeHtml(validInvoiceUrl) : null;
	const validManageSubscriptionUrl = manageSubscriptionUrl && isValidUrl(manageSubscriptionUrl);
	const safeManageSubscriptionUrl = validManageSubscriptionUrl ? escapeHtml(validManageSubscriptionUrl) : null;

	const currencySymbol = safeCurrency === 'eur' ? '€' : safeCurrency === 'usd' ? '$' : safeCurrency.toUpperCase();

	const subject = `Your ${safePlanName} subscription has been renewed`;

	const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Subscription Renewed</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          margin-top: 20px;
          margin-bottom: 20px;
          border: 1px solid #e0e0e0;
        }
        .header {
          background-color: #333;
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content {
          padding: 30px;
        }
        .payment-details {
          background: #f9f9f9;
          border-radius: 6px;
          padding: 20px;
          margin: 20px 0;
          border: 1px solid #e0e0e0;
        }
        .payment-details h2 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 16px;
          font-weight: 600;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e0e0e0;
        }
        .detail-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .detail-label {
          color: #666;
        }
        .detail-value {
          font-weight: 600;
          color: #333;
        }
        .button-group {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          margin: 25px 0;
        }
        .cta-button {
          display: inline-block;
          background: #333;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
        }
        .footer {
          background: #f9f9f9;
          padding: 25px 30px;
          text-align: center;
          border-top: 1px solid #e0e0e0;
        }
        .footer p {
          margin: 5px 0;
          color: #666;
          font-size: 13px;
        }
        .footer a {
          color: #333;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Subscription Renewed</h1>
        </div>
        
        <div class="content">
          <p>Hello <strong>${safeCustomerName}</strong>,</p>
          
          <p>Your <strong>${safePlanName}</strong> subscription has been successfully renewed.</p>
          
          <div class="payment-details">
            <h2>Payment Confirmation</h2>
            <div class="detail-row">
              <span class="detail-label">Plan:</span>
              <span class="detail-value">${safePlanName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount Charged:</span>
              <span class="detail-value">${currencySymbol}${safeAmount}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Billing Period:</span>
              <span class="detail-value">${safeBillingPeriod}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Next Renewal:</span>
              <span class="detail-value">${safeNextRenewalDate}</span>
            </div>
          </div>
          
          <div class="button-group">
            ${safeInvoiceUrl ? `<a href="${safeInvoiceUrl}" class="cta-button">View Invoice</a>` : ''}
            ${safeManageSubscriptionUrl ? `<a href="${safeManageSubscriptionUrl}" class="cta-button">Manage Subscription</a>` : ''}
          </div>
          
          <p>Thank you for your continued support!<br>
          The ${safeCompanyName} Team</p>
        </div>
        
        <div class="footer">
          <p><strong>${safeCompanyName}</strong></p>
          <p>
            <a href="${safeCompanyUrl}">Website</a> | 
            <a href="mailto:${safeSupportEmail}">Support</a>
          </p>
          <p style="margin-top: 15px;">
            © ${new Date().getFullYear()} ${safeCompanyName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

	const text = `
Subscription Renewed - ${safeCompanyName}

Hello ${safeCustomerName},

Your ${safePlanName} subscription has been successfully renewed.

Payment Confirmation:
- Plan: ${safePlanName}
- Amount Charged: ${currencySymbol}${safeAmount}
- Billing Period: ${safeBillingPeriod}
- Next Renewal: ${safeNextRenewalDate}

${safeInvoiceUrl ? `View Invoice: ${safeInvoiceUrl}` : ''}
${safeManageSubscriptionUrl ? `Manage Subscription: ${safeManageSubscriptionUrl}` : ''}

Thank you for your continued support!
The ${safeCompanyName} Team

${safeCompanyUrl}
  `;

	return {
		subject,
		html,
		text
	};
};
