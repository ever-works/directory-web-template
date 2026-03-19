/**
 * Email templates for subscription events
 * Used to notify users about subscription changes
 */

interface SubscriptionEventData {
  customerName: string;
  customerEmail: string;
  planName: string;
  amount: string;
  currency: string;
  billingPeriod: string;
  nextBillingDate?: string;
  subscriptionId: string;
  companyName?: string;
  companyUrl?: string;
  supportEmail?: string;
  manageSubscriptionUrl?: string;
  features?: string[];
  // For updates
  previousPlan?: string;
  previousAmount?: string;
  // For cancellations
  cancellationDate?: string;
  cancellationReason?: string;
  reactivateUrl?: string;
}

// Template for new subscription
export const getNewSubscriptionTemplate = (data: SubscriptionEventData) => {
  const {
    customerName,
    customerEmail,
    planName,
    amount,
    currency,
    billingPeriod,
    nextBillingDate,
    subscriptionId,
    companyName = "Ever Works",
    companyUrl = "https://ever.works",
    supportEmail = "support@ever.works",
    manageSubscriptionUrl,
    features = []
  } = data;

  const currencySymbol = currency === 'eur' ? '€' : currency === 'usd' ? '$' : currency.toUpperCase();

  const subject = `🎉 Welcome! Your ${planName} subscription is active`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Subscription Activated</title>
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
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
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
        .welcome-icon {
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
        .subscription-details {
          background: #f0f9ff;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #8b5cf6;
        }
        .subscription-details h2 {
          margin: 0 0 15px 0;
          color: #5b21b6;
          font-size: 18px;
          font-weight: 600;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e0e7ff;
        }
        .detail-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .detail-label {
          font-weight: 500;
          color: #6d28d9;
        }
        .detail-value {
          font-weight: 600;
          color: #5b21b6;
        }
        .amount-highlight {
          color: #8b5cf6;
          font-size: 20px;
          font-weight: 700;
        }
        .features-section {
          background: #f7fee7;
          border: 1px solid #d9f99d;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .features-section h3 {
          margin: 0 0 15px 0;
          color: #365314;
          font-size: 16px;
        }
        .features-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .features-list li {
          padding: 8px 0;
          color: #365314;
          font-weight: 500;
        }
        .features-list li::before {
          content: "✅ ";
          margin-right: 8px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 20px 0;
          transition: all 0.3s ease;
        }
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
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
          color: #8b5cf6;
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
          <div class="welcome-icon">🎉</div>
          <h1>Welcome!</h1>
          <p>Your ${planName} subscription is now active</p>
        </div>
        
        <div class="content">
          <p>Hello <strong>${customerName}</strong>,</p>
          
          <p>Congratulations! Your <strong>${planName}</strong> subscription has been successfully activated.</p>
          
          <div class="subscription-details">
            <h2>📋 Your Subscription Details</h2>
            <div class="detail-row">
              <span class="detail-label">Plan:</span>
              <span class="detail-value">${planName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Price:</span>
              <span class="detail-value amount-highlight">${currencySymbol}${amount}/${billingPeriod}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email:</span>
              <span class="detail-value">${customerEmail}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Subscription ID:</span>
              <span class="detail-value">${subscriptionId}</span>
            </div>
            ${nextBillingDate ? `
            <div class="detail-row">
              <span class="detail-label">Next Billing:</span>
              <span class="detail-value">${nextBillingDate}</span>
            </div>
            ` : ''}
          </div>
          
          ${features.length > 0 ? `
          <div class="features-section">
            <h3>🚀 Included Features</h3>
            <ul class="features-list">
              ${features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
          
          ${manageSubscriptionUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${manageSubscriptionUrl}" class="cta-button">🔧 Manage My Subscription</a>
          </div>
          ` : ''}
          
          <p>You can now enjoy all the features of your plan. If you have any questions, our support team is at your disposal.</p>
          
          <p>Thank you for your trust!<br>
          The ${companyName} Team</p>
        </div>
        
        <div class="footer">
          <p><strong>${companyName}</strong></p>
          <p>
            <a href="${companyUrl}">Website</a> | 
            <a href="mailto:${supportEmail}">Support</a> | 
            <a href="${companyUrl}/privacy">Privacy Policy</a>
          </p>
          <p style="margin-top: 20px;">
            © ${new Date().getFullYear()} ${companyName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    New Subscription Activated - ${companyName}
    
    Hello ${customerName},
    
    Congratulations! Your ${planName} subscription has been successfully activated.
    
    Your Subscription Details:
    - Plan: ${planName}
    - Price: ${currencySymbol}${amount}/${billingPeriod}
    - Email: ${customerEmail}
    - Subscription ID: ${subscriptionId}
    ${nextBillingDate ? `- Next Billing: ${nextBillingDate}` : ''}
    
    ${features.length > 0 ? `
    Included Features:
    ${features.map(feature => `- ${feature}`).join('\n')}
    ` : ''}
    
    ${manageSubscriptionUrl ? `Manage My Subscription: ${manageSubscriptionUrl}` : ''}
    
    You can now enjoy all the features of your plan.
    
    Thank you for your trust!
    The ${companyName} Team
    
    ${companyUrl}
  `;

  return {
    subject,
    html,
    text
  };
};

// Template for subscription update
export const getUpdatedSubscriptionTemplate = (data: SubscriptionEventData) => {
  const {
    customerName,
    planName,
    amount,
    currency,
    billingPeriod,
    nextBillingDate,
    subscriptionId,
    previousPlan,
    previousAmount,
    companyName = "Ever Works",
    companyUrl = "https://ever.works",
    supportEmail = "support@ever.works",
    manageSubscriptionUrl,
  } = data;

  const currencySymbol = currency === 'eur' ? '€' : currency === 'usd' ? '$' : currency.toUpperCase();

  const subject = `🔄 Subscription Updated: ${planName}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Subscription Updated</title>
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
        .header p {
          margin: 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .update-icon {
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
        .comparison-section {
          background: #fffbeb;
          border: 1px solid #fed7aa;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .comparison-section h2 {
          margin: 0 0 15px 0;
          color: #92400e;
          font-size: 18px;
          font-weight: 600;
        }
        .comparison-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid #fed7aa;
        }
        .comparison-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .comparison-label {
          font-weight: 500;
          color: #92400e;
        }
        .comparison-values {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .old-value {
          color: #991b1b;
          text-decoration: line-through;
          opacity: 0.7;
        }
        .new-value {
          color: #059669;
          font-weight: 600;
        }
        .arrow {
          color: #f59e0b;
          font-weight: bold;
        }
        .subscription-details {
          background: #f0f9ff;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #f59e0b;
        }
        .subscription-details h2 {
          margin: 0 0 15px 0;
          color: #1e40af;
          font-size: 18px;
          font-weight: 600;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e0e7ff;
        }
        .detail-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .detail-label {
          font-weight: 500;
          color: #1e40af;
        }
        .detail-value {
          font-weight: 600;
          color: #1e40af;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 20px 0;
          transition: all 0.3s ease;
        }
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
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
          .comparison-row {
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
          }
          .comparison-values {
            width: 100%;
            justify-content: space-between;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="update-icon">🔄</div>
          <h1>Subscription Updated</h1>
          <p>Your plan has been successfully modified</p>
        </div>
        
        <div class="content">
          <p>Hello <strong>${customerName}</strong>,</p>
          
          <p>Your subscription has been successfully updated. Here is a summary of the changes:</p>
          
          ${previousPlan && previousAmount ? `
          <div class="comparison-section">
            <h2>📊 Plan Comparison</h2>
            <div class="comparison-row">
              <span class="comparison-label">Plan:</span>
              <div class="comparison-values">
                <span class="old-value">${previousPlan}</span>
                <span class="arrow">→</span>
                <span class="new-value">${planName}</span>
              </div>
            </div>
            <div class="comparison-row">
              <span class="comparison-label">Price:</span>
              <div class="comparison-values">
                <span class="old-value">${currencySymbol}${previousAmount}/${billingPeriod}</span>
                <span class="arrow">→</span>
                <span class="new-value">${currencySymbol}${amount}/${billingPeriod}</span>
              </div>
            </div>
          </div>
          ` : ''}
          
          <div class="subscription-details">
            <h2>📋 Current Details</h2>
            <div class="detail-row">
              <span class="detail-label">Plan:</span>
              <span class="detail-value">${planName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Price:</span>
              <span class="detail-value">${currencySymbol}${amount}/${billingPeriod}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Subscription ID:</span>
              <span class="detail-value">${subscriptionId}</span>
            </div>
            ${nextBillingDate ? `
            <div class="detail-row">
              <span class="detail-label">Next Billing:</span>
              <span class="detail-value">${nextBillingDate}</span>
            </div>
            ` : ''}
          </div>
          
          ${manageSubscriptionUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${manageSubscriptionUrl}" class="cta-button">🔧 Manage My Subscription</a>
          </div>
          ` : ''}
          
          <p>Your new features are now available. If you have any questions, contact our support team.</p>
          
          <p>Best regards,<br>
          The ${companyName} Team</p>
        </div>
        
        <div class="footer">
          <p><strong>${companyName}</strong></p>
          <p>
            <a href="${companyUrl}">Website</a> | 
            <a href="mailto:${supportEmail}">Support</a>
          </p>
          <p style="margin-top: 20px;">
            © ${new Date().getFullYear()} ${companyName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Subscription Updated - ${companyName}
    
    Hello ${customerName},
    
    Your subscription has been successfully updated.
    
    ${previousPlan && previousAmount ? `
    Changes:
    - Plan: ${previousPlan} → ${planName}
    - Price: ${currencySymbol}${previousAmount}/${billingPeriod} → ${currencySymbol}${amount}/${billingPeriod}
    ` : ''}
    
    Current Details:
    - Plan: ${planName}
    - Price: ${currencySymbol}${amount}/${billingPeriod}
    - Subscription ID: ${subscriptionId}
    ${nextBillingDate ? `- Next Billing: ${nextBillingDate}` : ''}
    
    ${manageSubscriptionUrl ? `Manage My Subscription: ${manageSubscriptionUrl}` : ''}
    
    Your new features are now available.
    
    Best regards,
    The ${companyName} Team
    
    ${companyUrl}
  `;

  return {
    subject,
    html,
    text
  };
};

// Template for subscription cancellation
export const getCancelledSubscriptionTemplate = (data: SubscriptionEventData) => {
  const {
    customerName,
    planName,
    amount,
    currency,
    billingPeriod,
    subscriptionId,
    cancellationDate,
    cancellationReason,
    reactivateUrl,
    companyName = "Ever Works",
    companyUrl = "https://ever.works",
    supportEmail = "support@ever.works"
  } = data;

  const currencySymbol = currency === 'eur' ? '€' : currency === 'usd' ? '$' : currency.toUpperCase();

  const subject = `😢 Subscription Cancelled: ${planName}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Subscription Cancelled</title>
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
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
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
        .cancel-icon {
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
        .cancellation-details {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #6b7280;
        }
        .cancellation-details h2 {
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
        .reactivate-section {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          text-align: center;
        }
        .reactivate-section h3 {
          margin: 0 0 10px 0;
          color: #1e40af;
          font-size: 18px;
        }
        .reactivate-section p {
          margin: 10px 0;
          color: #1e40af;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 20px 0;
          transition: all 0.3s ease;
        }
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
        }
        .feedback-section {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .feedback-section h3 {
          margin: 0 0 10px 0;
          color: #92400e;
          font-size: 16px;
        }
        .feedback-section p {
          margin: 5px 0;
          color: #92400e;
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
          color: #3b82f6;
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
          <div class="cancel-icon">😢</div>
          <h1>Subscription Cancelled</h1>
          <p>We're sorry to see you go</p>
        </div>
        
        <div class="content">
          <p>Hello <strong>${customerName}</strong>,</p>
          
          <p>We confirm that your <strong>${planName}</strong> subscription has been cancelled.</p>
          
          <div class="cancellation-details">
            <h2>📋 Cancellation Details</h2>
            <div class="detail-row">
              <span class="detail-label">Cancelled Plan:</span>
              <span class="detail-value">${planName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Plan Price:</span>
              <span class="detail-value">${currencySymbol}${amount}/${billingPeriod}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Subscription ID:</span>
              <span class="detail-value">${subscriptionId}</span>
            </div>
            ${cancellationDate ? `
            <div class="detail-row">
              <span class="detail-label">Cancellation Date:</span>
              <span class="detail-value">${cancellationDate}</span>
            </div>
            ` : ''}
            ${cancellationReason ? `
            <div class="detail-row">
              <span class="detail-label">Reason:</span>
              <span class="detail-value">${cancellationReason}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="reactivate-section">
            <h3>🔄 Changed Your Mind?</h3>
            <p>You can reactivate your subscription at any time.</p>
            ${reactivateUrl ? `
            <a href="${reactivateUrl}" class="cta-button">Reactivate My Subscription</a>
            ` : ''}
          </div>
          
          <div class="feedback-section">
            <h3>💬 We Value Your Feedback</h3>
            <p>We would love to know how we can improve our services. Please feel free to share your comments with us.</p>
          </div>
          
          <p>We hope to see you again soon. If you have any questions, our support team remains at your disposal.</p>
          
          <p>Best regards,<br>
          The ${companyName} Team</p>
        </div>
        
        <div class="footer">
          <p><strong>${companyName}</strong></p>
          <p>
            <a href="${companyUrl}">Website</a> | 
            <a href="mailto:${supportEmail}">Support</a>
          </p>
          <p style="margin-top: 20px;">
            © ${new Date().getFullYear()} ${companyName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Subscription Cancelled - ${companyName}
    
    Hello ${customerName},
    
    We confirm that your ${planName} subscription has been cancelled.
    
    Cancellation Details:
    - Cancelled Plan: ${planName}
    - Plan Price: ${currencySymbol}${amount}/${billingPeriod}
    - Subscription ID: ${subscriptionId}
    ${cancellationDate ? `- Cancellation Date: ${cancellationDate}` : ''}
    ${cancellationReason ? `- Reason: ${cancellationReason}` : ''}
    
    Changed Your Mind?
    You can reactivate your subscription at any time.
    ${reactivateUrl ? `Reactivate: ${reactivateUrl}` : ''}
    
    We value your feedback - we would love to know how we can improve our services.
    
    We hope to see you again soon.
    
    Best regards,
    The ${companyName} Team
    
    ${companyUrl}
  `;

  return {
    subject,
    html,
    text
  };
}; 