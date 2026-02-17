/**
 * Email template for subscription expiration
 * Sent when a user's paid subscription expires
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

// Security: URL validation function (returns normalized URL or null)
function isValidUrl(url: string): string | null {
	try {
		const parsedUrl = new URL(url);
		return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:' ? parsedUrl.href : null;
	} catch {
		return null;
	}
}

interface SubscriptionExpiredData {
	customerName: string;
	customerEmail: string;
	planName: string;
	amount: string;
	currency: string;
	billingPeriod: string;
	subscriptionId: string;
	expirationDate: string;
	companyName?: string;
	companyUrl?: string;
	supportEmail?: string;
	renewUrl?: string;
	features?: string[];
}

/**
 * Template for subscription expiration notification
 */
export const getSubscriptionExpiredTemplate = (data: SubscriptionExpiredData) => {
	const {
		customerName,
		planName,
		amount,
		currency,
		billingPeriod,
		subscriptionId,
		expirationDate,
		companyName = 'Ever Works',
		companyUrl = 'https://ever.works',
		supportEmail = 'support@ever.works',
		renewUrl,
		features = []
	} = data;

	// Security: Escape all user-provided data
	const safeCustomerName = escapeHtml(customerName);
	const safePlanName = escapeHtml(planName);
	const safeAmount = escapeHtml(amount);
	const safeCurrency = escapeHtml(currency);
	const safeBillingPeriod = escapeHtml(billingPeriod);
	const safeSubscriptionId = escapeHtml(subscriptionId);
	const safeExpirationDate = escapeHtml(expirationDate);
	const safeCompanyName = escapeHtml(companyName);
	const safeSupportEmail = escapeHtml(supportEmail);
	const safeFeatures = features.map((feature) => escapeHtml(feature));

	// Security: Validate URLs
	const validCompanyUrl = isValidUrl(companyUrl) || 'https://ever.works';
	const safeCompanyUrl = escapeHtml(validCompanyUrl);
	const validRenewUrl = renewUrl ? isValidUrl(renewUrl) : null;
	const safeRenewUrl = validRenewUrl ? escapeHtml(validRenewUrl) : null;

	const currencySymbol = safeCurrency === 'eur' ? '€' : safeCurrency === 'usd' ? '$' : safeCurrency.toUpperCase();

	const subject = `⚠️ Your ${safePlanName} subscription has expired`;

	const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Subscription Expired</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f8fafc;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          margin-top: 20px;
          margin-bottom: 20px;
        }
        .header {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 10px;
        }
        .header p {
          margin: 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .expired-icon {
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          font-size: 30px;
        }
        .content {
          padding: 30px;
        }
        .alert-box {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          text-align: center;
        }
        .alert-box h2 {
          margin: 0 0 10px 0;
          color: #991b1b;
          font-size: 20px;
          font-weight: 600;
        }
        .alert-box p {
          margin: 0;
          color: #b91c1c;
        }
        .subscription-details {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #dc2626;
        }
        .subscription-details h2 {
          margin: 0 0 15px 0;
          color: #374151;
          font-size: 18px;
          font-weight: 600;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        .detail-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .detail-label {
          font-weight: 500;
          color: #4b5563;
        }
        .detail-value {
          font-weight: 600;
          color: #374151;
        }
        .features-lost {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .features-lost h3 {
          margin: 0 0 15px 0;
          color: #92400e;
          font-size: 16px;
        }
        .features-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .features-list li {
          padding: 8px 0;
          color: #92400e;
          font-weight: 500;
        }
        .features-list li::before {
          content: "🔒 ";
          margin-right: 8px;
        }
        .renew-section {
          background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
          border: 1px solid #93c5fd;
          border-radius: 8px;
          padding: 25px;
          margin: 25px 0;
          text-align: center;
        }
        .renew-section h3 {
          margin: 0 0 10px 0;
          color: #1e40af;
          font-size: 20px;
        }
        .renew-section p {
          margin: 10px 0 20px 0;
          color: #1e40af;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          padding: 14px 35px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.3s ease;
        }
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
        }
        .footer {
          background: #f8fafc;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          margin: 5px 0;
          color: #6b7280;
          font-size: 14px;
        }
        .footer a {
          color: #dc2626;
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
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="expired-icon">⚠️</div>
          <h1>Subscription Expired</h1>
          <p>Your ${safePlanName} subscription has ended</p>
        </div>
        
        <div class="content">
          <p>Hello <strong>${safeCustomerName}</strong>,</p>
          
          <div class="alert-box">
            <h2>Your Subscription Has Expired</h2>
            <p>Your access to ${safePlanName} features has ended on ${safeExpirationDate}.</p>
          </div>
          
          <p>Your <strong>${safePlanName}</strong> subscription has expired. You have been moved to the <strong>Free</strong> plan with limited features.</p>
          
          <div class="subscription-details">
            <h2>📋 Expired Subscription Details</h2>
            <div class="detail-row">
              <span class="detail-label">Plan:</span>
              <span class="detail-value">${safePlanName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Previous Price:</span>
              <span class="detail-value">${currencySymbol}${safeAmount}/${safeBillingPeriod}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Expiration Date:</span>
              <span class="detail-value">${safeExpirationDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Subscription ID:</span>
              <span class="detail-value">${safeSubscriptionId}</span>
            </div>
          </div>
          
          ${
				safeFeatures.length > 0
					? `
          <div class="features-lost">
            <h3>Features No Longer Available</h3>
            <ul class="features-list">
              ${safeFeatures.map((feature) => `<li>${feature}</li>`).join('')}
            </ul>
          </div>
          `
					: ''
			}
          
          <div class="renew-section">
            <h3>🚀 Ready to Get Back on Track?</h3>
            <p>Renew your subscription now to restore access to all your premium features.</p>
            ${
				safeRenewUrl
					? `
            <a href="${safeRenewUrl}" class="cta-button">💳 Renew Subscription</a>
            `
					: `
            <a href="${safeCompanyUrl}/pricing" class="cta-button">💳 View Plans</a>
            `
			}
          </div>
          
          <p>If you have any questions or need assistance, our support team is here to help.</p>
          
          <p>Best regards,<br>
          The ${safeCompanyName} Team</p>
        </div>
        
        <div class="footer">
          <p><strong>${safeCompanyName}</strong></p>
          <p>
            <a href="${safeCompanyUrl}">Website</a> | 
            <a href="mailto:${safeSupportEmail}">Support</a> | 
            <a href="${safeCompanyUrl}/privacy">Privacy Policy</a>
          </p>
          <p style="margin-top: 20px;">
            © ${new Date().getFullYear()} ${safeCompanyName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

	const text = `
    Subscription Expired - ${safeCompanyName}
    
    Hello ${safeCustomerName},
    
    Your ${safePlanName} subscription has expired.
    
    Your access to ${safePlanName} features has ended on ${safeExpirationDate}.
    You have been moved to the Free plan with limited features.
    
    Expired Subscription Details:
    - Plan: ${safePlanName}
    - Previous Price: ${currencySymbol}${safeAmount}/${safeBillingPeriod}
    - Expiration Date: ${safeExpirationDate}
    - Subscription ID: ${safeSubscriptionId}
    
    ${
		safeFeatures.length > 0
			? `
    Features No Longer Available:
    ${safeFeatures.map((feature) => `- ${feature}`).join('\n')}
    `
			: ''
	}
    
    Ready to Get Back on Track?
    Renew your subscription now to restore access to all your premium features.
    
    ${safeRenewUrl ? `Renew Subscription: ${safeRenewUrl}` : `View Plans: ${safeCompanyUrl}/pricing`}
    
    If you have any questions or need assistance, our support team is here to help.
    
    Best regards,
    The ${safeCompanyName} Team
    
    ${safeCompanyUrl}
  `;

	return {
		subject,
		html,
		text
	};
};

/**
 * Template for subscription expiring soon warning
 */
export const getSubscriptionExpiringWarningTemplate = (
	data: SubscriptionExpiredData & { daysUntilExpiration: number }
) => {
	const {
		customerName,
		planName,
		amount,
		currency,
		billingPeriod,
		subscriptionId,
		expirationDate,
		daysUntilExpiration,
		companyName = 'Ever Works',
		companyUrl = 'https://ever.works',
		supportEmail = 'support@ever.works',
		renewUrl
	} = data;

	// Security: Escape all user-provided data
	const safeCustomerName = escapeHtml(customerName);
	const safePlanName = escapeHtml(planName);
	const _safeAmount = escapeHtml(amount);
	const safeCurrency = escapeHtml(currency);
	const _safeBillingPeriod = escapeHtml(billingPeriod);
	const _safeSubscriptionId = escapeHtml(subscriptionId);
	const safeExpirationDate = escapeHtml(expirationDate);
	const safeCompanyName = escapeHtml(companyName);
	const safeSupportEmail = escapeHtml(supportEmail);

	// Security: Validate URLs
	const validCompanyUrl = isValidUrl(companyUrl) || 'https://ever.works';
	const safeCompanyUrl = escapeHtml(validCompanyUrl);
	const validRenewUrl = renewUrl ? isValidUrl(renewUrl) : null;
	const safeRenewUrl = validRenewUrl ? escapeHtml(validRenewUrl) : null;

	const _currencySymbol = safeCurrency === 'eur' ? '€' : safeCurrency === 'usd' ? '$' : safeCurrency.toUpperCase();
	const urgencyText =
		daysUntilExpiration <= 1
			? 'expires today'
			: daysUntilExpiration <= 3
				? 'expires soon'
				: `expires in ${daysUntilExpiration} days`;

	const subject = `⏰ Your ${safePlanName} subscription ${urgencyText}`;

	const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Subscription Expiring Soon</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f8fafc;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          margin-top: 20px;
          margin-bottom: 20px;
        }
        .header {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 10px;
        }
        .warning-icon {
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          font-size: 30px;
        }
        .content {
          padding: 30px;
        }
        .countdown-box {
          background: #fffbeb;
          border: 2px solid #f59e0b;
          border-radius: 12px;
          padding: 25px;
          margin: 20px 0;
          text-align: center;
        }
        .countdown-number {
          font-size: 48px;
          font-weight: 700;
          color: #d97706;
          display: block;
        }
        .countdown-label {
          font-size: 16px;
          color: #92400e;
          font-weight: 500;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          padding: 14px 35px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
        }
        .footer {
          background: #f8fafc;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          margin: 5px 0;
          color: #6b7280;
          font-size: 14px;
        }
        .footer a {
          color: #f59e0b;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="warning-icon">⏰</div>
          <h1>Subscription Expiring Soon</h1>
        </div>
        
        <div class="content">
          <p>Hello <strong>${safeCustomerName}</strong>,</p>
          
          <div class="countdown-box">
            <span class="countdown-number">${daysUntilExpiration}</span>
            <span class="countdown-label">${daysUntilExpiration === 1 ? 'day' : 'days'} remaining</span>
          </div>
          
          <p>Your <strong>${safePlanName}</strong> subscription will expire on <strong>${safeExpirationDate}</strong>.</p>
          
          <p>To continue enjoying your premium features without interruption, please renew your subscription before it expires.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            ${
				safeRenewUrl
					? `
            <a href="${safeRenewUrl}" class="cta-button">🔄 Renew Now</a>
            `
					: `
            <a href="${safeCompanyUrl}/pricing" class="cta-button">🔄 Renew Now</a>
            `
			}
          </div>
          
          <p>Best regards,<br>
          The ${safeCompanyName} Team</p>
        </div>
        
        <div class="footer">
          <p><strong>${safeCompanyName}</strong></p>
          <p>
            <a href="${safeCompanyUrl}">Website</a> | 
            <a href="mailto:${safeSupportEmail}">Support</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

	const text = `
    Subscription Expiring Soon - ${safeCompanyName}
    
    Hello ${safeCustomerName},
    
    Your ${safePlanName} subscription will expire in ${daysUntilExpiration} ${daysUntilExpiration === 1 ? 'day' : 'days'} on ${safeExpirationDate}.
    
    To continue enjoying your premium features without interruption, please renew your subscription before it expires.
    
    ${safeRenewUrl ? `Renew Now: ${safeRenewUrl}` : `Renew Now: ${safeCompanyUrl}/pricing`}
    
    Best regards,
    The ${safeCompanyName} Team
    
    ${safeCompanyUrl}
  `;

	return {
		subject,
		html,
		text
	};
};
