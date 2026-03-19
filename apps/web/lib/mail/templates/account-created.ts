export interface AccountCreatedData {
  userName: string;
  userEmail: string;
  companyName?: string;
  companyUrl?: string;
  supportEmail?: string;
  loginUrl?: string;
  dashboardUrl?: string;
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://demo.ever.works");

export const getAccountCreatedTemplate = (data: AccountCreatedData) => {
  const {
    userName,
    userEmail,
    companyName = "Ever Works",
    companyUrl = "https://ever.works",
    supportEmail = "support@ever.works",
    loginUrl = `${appUrl || ''}/auth/signin`,
    dashboardUrl = `${appUrl || ''}/client/dashboard`
  } = data;

  const subject = `🎉 Welcome to ${companyName}! Your account has been created`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Created - Welcome!</title>
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
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
          padding: 40px 30px;
        }
        
        .welcome-message {
          text-align: center;
          margin-bottom: 40px;
        }
        
        .welcome-message h2 {
          font-size: 24px;
          color: #1f2937;
          margin-bottom: 16px;
          font-weight: 600;
        }
        
        .welcome-message p {
          font-size: 16px;
          color: #6b7280;
          line-height: 1.7;
          margin-bottom: 8px;
        }
        
        .account-details {
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 20px;
          margin: 30px 0;
        }
        
        .account-details h3 {
          font-size: 18px;
          color: #166534;
          margin-bottom: 15px;
          font-weight: 600;
          text-align: center;
        }
        
        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #dcfce7;
        }
        
        .detail-item:last-child {
          border-bottom: none;
        }
        
        .detail-label {
          font-weight: 500;
          color: #166534;
        }
        
        .detail-value {
          font-weight: 600;
          color: #15803d;
        }
        
        .features {
          background-color: #f9fafb;
          border-radius: 8px;
          padding: 30px;
          margin: 30px 0;
        }
        
        .features h3 {
          font-size: 18px;
          color: #1f2937;
          margin-bottom: 20px;
          font-weight: 600;
          text-align: center;
        }
        
        .feature-item {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
          padding: 12px;
          background-color: white;
          border-radius: 6px;
          border-left: 4px solid #10b981;
        }
        
        .feature-icon {
          width: 24px;
          height: 24px;
          background-color: #10b981;
          border-radius: 50%;
          margin-right: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: bold;
        }
        
        .feature-text {
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
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);
          margin: 0 8px 8px 0;
        }
        
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 15px -3px rgba(16, 185, 129, 0.4);
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
          color: #10b981;
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
          
          .features {
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
          <div class="welcome-icon">🎉</div>
          <h1>Welcome to ${companyName}!</h1>
          <p>Your account has been successfully created</p>
        </div>
        
        <div class="content">
          <div class="welcome-message">
            <h2>Hello ${userName}!</h2>
            <p>Thank you for joining ${companyName}. We're excited to have you as part of our community!</p>
            <p>Your account is now ready and you can start exploring all the features we have to offer.</p>
          </div>
          
          <div class="account-details">
            <h3>📋 Your Account Details</h3>
            <div class="detail-item">
              <span class="detail-label">Name:</span>
              <span class="detail-value">${userName}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Email:</span>
              <span class="detail-value">${userEmail}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Status:</span>
              <span class="detail-value">✅ Active</span>
            </div>
          </div>
          
          <div class="features">
            <h3>🚀 What you can do now:</h3>
            <div class="feature-item">
              <div class="feature-icon">👤</div>
              <div class="feature-text">Complete your profile setup</div>
            </div>
            <div class="feature-item">
              <div class="feature-icon">🔧</div>
              <div class="feature-text">Explore our features and tools</div>
            </div>
            <div class="feature-item">
              <div class="feature-icon">📊</div>
              <div class="feature-text">Access your personalized dashboard</div>
            </div>
            <div class="feature-item">
              <div class="feature-icon">💬</div>
              <div class="feature-text">Connect with our community</div>
            </div>
          </div>
          
          <div class="cta-section">
            <a href="${dashboardUrl}" class="cta-button">
              Go to Dashboard
            </a>
            <a href="${loginUrl}" class="cta-button secondary">
              Sign In
            </a>
          </div>
          
          <div class="security-note">
            <p>🔒 Your account is secure. Keep your login credentials safe and don't share them with anyone.</p>
          </div>
        </div>
        
        <div class="footer">
          <p>This email was sent to <strong>${userEmail}</strong></p>
          <p>If you have any questions, feel free to contact us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
          <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
          <p><a href="${companyUrl}">Visit our website</a> | <a href="${companyUrl}/privacy">Privacy Policy</a> | <a href="${companyUrl}/terms">Terms of Service</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to ${companyName}!

Hello ${userName},

Thank you for joining ${companyName}. We're excited to have you as part of our community!

Your account has been successfully created with the following details:
- Name: ${userName}
- Email: ${userEmail}
- Status: Active

What you can do now:
- Complete your profile setup
- Explore our features and tools
- Access your personalized dashboard
- Connect with our community

Get started:
Dashboard: ${dashboardUrl}
Sign In: ${loginUrl}

Security Note: Your account is secure. Keep your login credentials safe and don't share them with anyone.

If you have any questions, feel free to contact us at ${supportEmail}

© ${new Date().getFullYear()} ${companyName}. All rights reserved.
Visit our website: ${companyUrl}
  `;

  return {
    subject,
    html,
    text
  };
};
