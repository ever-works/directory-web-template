export interface EmailVerificationData {
  userEmail: string;
  verificationLink: string;
  companyName?: string;
  companyUrl?: string;
  supportEmail?: string;
  userName?: string;
}

export const getEmailVerificationTemplate = (data: EmailVerificationData) => {
  const {
    userEmail,
    verificationLink,
    companyName = "Ever Works",
    companyUrl = "https://ever.works",
    supportEmail = "support@ever.works",
    userName
  } = data;

  const subject = `🔐 Verify your email address - ${companyName}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email Address</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f8fafc;
        }
        
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .header {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          padding: 40px 30px;
          text-align: center;
          color: white;
        }
        
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 10px;
          letter-spacing: -0.5px;
        }
        
        .header p {
          font-size: 16px;
          opacity: 0.9;
          font-weight: 400;
        }
        
        .verification-icon {
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
          padding: 40px 30px;
        }
        
        .verification-message {
          text-align: center;
          margin-bottom: 40px;
        }
        
        .verification-message h2 {
          font-size: 24px;
          color: #1f2937;
          margin-bottom: 16px;
          font-weight: 600;
        }
        
        .verification-message p {
          font-size: 16px;
          color: #6b7280;
          line-height: 1.7;
          margin-bottom: 8px;
        }
        
        .email-details {
          background-color: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 20px;
          margin: 30px 0;
        }
        
        .email-details h3 {
          font-size: 18px;
          color: #1e40af;
          margin-bottom: 15px;
          font-weight: 600;
          text-align: center;
        }
        
        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #dbeafe;
        }
        
        .detail-item:last-child {
          border-bottom: none;
        }
        
        .detail-label {
          font-weight: 500;
          color: #1e40af;
        }
        
        .detail-value {
          font-weight: 600;
          color: #1d4ed8;
        }
        
        .verification-steps {
          background-color: #f9fafb;
          border-radius: 8px;
          padding: 30px;
          margin: 30px 0;
        }
        
        .verification-steps h3 {
          font-size: 18px;
          color: #1f2937;
          margin-bottom: 20px;
          font-weight: 600;
          text-align: center;
        }
        
        .step-item {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
          padding: 12px;
          background-color: white;
          border-radius: 6px;
          border-left: 4px solid #3b82f6;
        }
        
        .step-number {
          width: 24px;
          height: 24px;
          background-color: #3b82f6;
          border-radius: 50%;
          margin-right: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: bold;
        }
        
        .step-text {
          font-size: 14px;
          color: #374151;
          font-weight: 500;
        }
        
        .cta-section {
          text-align: center;
          margin: 40px 0;
        }
        
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
          margin: 0 8px 8px 0;
        }
        
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 15px -3px rgba(59, 130, 246, 0.4);
        }
        
        .cta-button.secondary {
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
          box-shadow: 0 4px 6px -1px rgba(107, 114, 128, 0.3);
        }
        
        .cta-button.secondary:hover {
          box-shadow: 0 8px 15px -3px rgba(107, 114, 128, 0.4);
        }
        
        .footer {
          background-color: #f9fafb;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 8px;
        }
        
        .footer a {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
        }
        
        .footer a:hover {
          text-decoration: underline;
        }
        
        .security-note {
          background-color: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          text-align: center;
        }
        
        .security-note p {
          font-size: 14px;
          color: #92400e;
          margin: 0;
        }
        
        .link-fallback {
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          word-break: break-all;
        }
        
        .link-fallback p {
          font-size: 12px;
          color: #6b7280;
          margin: 0;
        }
        
        .link-fallback a {
          color: #3b82f6;
          text-decoration: none;
        }
        
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 8px;
          }
          
          .header {
            padding: 30px 20px;
          }
          
          .header h1 {
            font-size: 24px;
          }
          
          .content {
            padding: 30px 20px;
          }
          
          .verification-steps {
            padding: 20px;
          }
          
          .footer {
            padding: 20px;
          }
          
          .cta-button {
            display: block;
            margin: 8px 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="verification-icon">🔐</div>
          <h1>Verify Your Email</h1>
          <p>Complete your account setup</p>
        </div>
        
        <div class="content">
          <div class="verification-message">
            <h2>${userName ? `Hello ${userName}!` : 'Hello!'}</h2>
            <p>Thank you for signing up with ${companyName}!</p>
            <p>To complete your account setup and start using all our features, please verify your email address by clicking the button below.</p>
          </div>
          
          <div class="email-details">
            <h3>📧 Email to Verify</h3>
            <div class="detail-item">
              <span class="detail-label">Email Address:</span>
              <span class="detail-value">${userEmail}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Status:</span>
              <span class="detail-value">⏳ Pending Verification</span>
            </div>
          </div>
          
          <div class="verification-steps">
            <h3>🚀 What happens next:</h3>
            <div class="step-item">
              <div class="step-number">1</div>
              <div class="step-text">Click the "Verify Email" button below</div>
            </div>
            <div class="step-item">
              <div class="step-number">2</div>
              <div class="step-text">You'll be redirected to our secure verification page</div>
            </div>
            <div class="step-item">
              <div class="step-number">3</div>
              <div class="step-text">Your email will be verified and your account activated</div>
            </div>
            <div class="step-item">
              <div class="step-number">4</div>
              <div class="step-text">Start enjoying all our features!</div>
            </div>
          </div>
          
          <div class="cta-section">
            <a href="${verificationLink}" class="cta-button">
              Verify Email Address
            </a>
          </div>
          
          <div class="link-fallback">
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <a href="${verificationLink}">${verificationLink}</a>
          </div>
          
          <div class="security-note">
            <p>🔒 This verification link will expire in 24 hours for security reasons.</p>
          </div>
        </div>
        
        <div class="footer">
          <p>This email was sent to <strong>${userEmail}</strong></p>
          <p>If you didn't create an account with ${companyName}, you can safely ignore this email.</p>
          <p>If you have any questions, contact us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
          <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
          <p><a href="${companyUrl}">Visit our website</a> | <a href="${companyUrl}/privacy">Privacy Policy</a> | <a href="${companyUrl}/terms">Terms of Service</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Verify Your Email Address - ${companyName}

${userName ? `Hello ${userName}!` : 'Hello!'}

Thank you for signing up with ${companyName}!

To complete your account setup and start using all our features, please verify your email address.

Email to Verify: ${userEmail}
Status: Pending Verification

What happens next:
1. Click the verification link below
2. You'll be redirected to our secure verification page
3. Your email will be verified and your account activated
4. Start enjoying all our features!

Verify your email: ${verificationLink}

If the link doesn't work, copy and paste it into your browser:
${verificationLink}

Security Note: This verification link will expire in 24 hours for security reasons.

If you didn't create an account with ${companyName}, you can safely ignore this email.

If you have any questions, contact us at ${supportEmail}

© ${new Date().getFullYear()} ${companyName}. All rights reserved.
Visit our website: ${companyUrl}
  `;

  return {
    subject,
    html,
    text
  };
};
