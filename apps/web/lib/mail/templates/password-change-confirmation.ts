export interface PasswordChangeData {
  customerName?: string;
  customerEmail: string;
  changeDate: string;
  ipAddress?: string;
  userAgent?: string;
  companyName?: string;
  companyUrl?: string;
  supportEmail?: string;
  securityUrl?: string;
}

export const getPasswordChangeConfirmationTemplate = (data: PasswordChangeData) => {
  const {
    customerName,
    customerEmail,
    changeDate,
    ipAddress,
    userAgent,
    companyName = "Ever Works",
    companyUrl = "https://ever.works",
    supportEmail = "support@ever.works",
    securityUrl = `${companyUrl}/settings/security`
  } = data;

  const subject = `Password Changed Successfully - ${companyName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Changed Successfully</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #ffffff; margin: 0; padding: 20px;">

      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #ddd; padding: 0;">

        <!-- Header -->
        <div style="padding: 30px; text-align: center; border-bottom: 1px solid #ddd;">
          <h1 style="margin: 0; font-size: 24px; color: #333;">Password Changed Successfully</h1>
          <p style="margin: 10px 0 0 0; color: #666;">Your account security has been updated</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">

          <p style="margin: 0 0 20px 0; font-size: 16px;">
            Hello${customerName ? ` ${customerName}` : ''},
          </p>

          <p style="margin: 0 0 25px 0; font-size: 16px; color: #666;">
            We're writing to confirm that your password has been successfully changed for your ${companyName} account.
          </p>

          <!-- Details Box -->
          <div style="border: 1px solid #ddd; padding: 20px; margin: 25px 0;">
            <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333;">Change Details</h3>

            <p style="margin: 5px 0; font-size: 14px;">
              <strong>Account Email:</strong> ${customerEmail}
            </p>
            <p style="margin: 5px 0; font-size: 14px;">
              <strong>Date & Time:</strong> ${changeDate}
            </p>
            ${ipAddress ? `
            <p style="margin: 5px 0; font-size: 14px;">
              <strong>IP Address:</strong> ${ipAddress}
            </p>
            ` : ''}
            ${userAgent ? `
            <p style="margin: 5px 0; font-size: 14px;">
              <strong>Device:</strong> ${userAgent}
            </p>
            ` : ''}
          </div>

          <!-- Security Notice -->
          <div style="border: 1px solid #ddd; padding: 20px; margin: 25px 0;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">Didn't make this change?</h3>
            <p style="margin: 0; font-size: 14px; color: #666;">
              If you didn't change your password, please contact our support team immediately at
              <a href="mailto:${supportEmail}" style="color: #333; text-decoration: underline;">${supportEmail}</a>
            </p>
          </div>

          <!-- Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${securityUrl}" style="display: inline-block; background-color: #333; color: white; text-decoration: none; padding: 12px 24px; border: 1px solid #333;">
              Review Security Settings
            </a>
          </div>

          <!-- Recommendations -->
          <div style="margin: 25px 0;">
            <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333;">Security Recommendations:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #666;">
              <li>Use a unique password for your ${companyName} account</li>
              <li>Enable two-factor authentication</li>
              <li>Regularly review your account activity</li>
            </ul>
          </div>

        </div>

        <!-- Footer -->
        <div style="padding: 20px; text-align: center; border-top: 1px solid #ddd;">
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #666;">
            This email was sent to <strong>${customerEmail}</strong>
          </p>
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #666;">
            Need help? Contact us at <a href="mailto:${supportEmail}" style="color: #333; text-decoration: underline;">${supportEmail}</a>
          </p>
          <p style="margin: 0; font-size: 12px; color: #666;">
            © 2025 <a href="${companyUrl}" style="color: #333; text-decoration: underline;">${companyName}</a>. All rights reserved.
          </p>
        </div>

      </div>

    </body>
    </html>
  `;

  const text = `
Password Changed Successfully - ${companyName}

Hello${customerName ? ` ${customerName}` : ''},

We're writing to confirm that your password has been successfully changed for your ${companyName} account.

Change Details:
- Account Email: ${customerEmail}
- Date & Time: ${changeDate}
${ipAddress ? `- IP Address: ${ipAddress}` : ''}
${userAgent ? `- Device: ${userAgent}` : ''}

IMPORTANT: If you didn't make this change, please contact our support team immediately at ${supportEmail}.

Security Recommendations:
- Use a unique password for your ${companyName} account
- Enable two-factor authentication
- Regularly review your account activity

Review your security settings: ${securityUrl}

Need help? Contact us at ${supportEmail}

© 2025 ${companyName}. All rights reserved.
${companyUrl}
  `;

  return {
    subject,
    html,
    text
  };
};
