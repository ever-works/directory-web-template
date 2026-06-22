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

  const subject = `Verify your email – ${companyName}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Verify your email &#8211; ${companyName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;-webkit-font-smoothing:antialiased;mso-line-height-rule:exactly;">

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:48px 16px 56px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;">

          <!-- Brand -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <a href="${companyUrl}" style="display:inline-block;text-decoration:none;">
                <img src="${companyUrl}/logo-dark.png" alt="${companyName}" height="36" style="display:block;height:36px;width:auto;max-width:160px;border:0;outline:none;" />
              </a>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">

                <!-- Top accent bar -->
                <tr>
                  <td style="height:3px;background-color:#2563eb;border-radius:12px 12px 0 0;font-size:0;line-height:0;">&nbsp;</td>
                </tr>

                <!-- Main content -->
                <tr>
                  <td style="padding:44px 44px 36px;">

                    <!-- Mail icon -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:44px;height:44px;background-color:#eff6ff;border-radius:10px;border:1px solid #dbeafe;text-align:center;vertical-align:middle;font-size:20px;padding:0;margin-bottom:24px;" width="44" height="44">
                          &#9993;
                        </td>
                      </tr>
                    </table>

                    <div style="height:22px;line-height:22px;font-size:22px;">&nbsp;</div>

                    <!-- Heading -->
                    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#09090b;letter-spacing:-0.4px;line-height:1.3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                      Confirm your email address
                    </h1>

                    <!-- Body text -->
                    <p style="margin:0 0 32px;font-size:15px;color:#52525b;line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                      ${userName ? `Hi ${userName},<br><br>` : ""}We received a request to verify <strong style="color:#3f3f46;font-weight:600;">${userEmail}</strong>. Click the button below to confirm this address and activate your ${companyName} account.
                    </p>

                    <!-- CTA button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="border-radius:8px;background-color:#2563eb;">
                          <a href="${verificationLink}"
                             style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;letter-spacing:0.1px;">
                            Verify email address &nbsp;&rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Expiry note -->
                    <p style="margin:28px 0 0;font-size:13px;color:#a1a1aa;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                      This link expires in <span style="color:#71717a;font-weight:500;">1 hour</span>. If you didn&#8217;t request this, you can safely ignore this email &#8212; your account won&#8217;t be affected.
                    </p>

                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding:0 44px;font-size:0;line-height:0;">
                    <div style="height:1px;background-color:#f4f4f5;">&nbsp;</div>
                  </td>
                </tr>

                <!-- Fallback URL -->
                <tr>
                  <td style="padding:20px 44px 36px;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#a1a1aa;letter-spacing:0.6px;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                      Button not working?
                    </p>
                    <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;word-break:break-all;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                      Copy and paste this URL into your browser:<br>
                      <a href="${verificationLink}" style="color:#2563eb;text-decoration:none;">${verificationLink}</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:28px 0 0;">
              <p style="margin:0 0 6px;font-size:12px;color:#a1a1aa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                Sent to ${userEmail}
              </p>
              <p style="margin:0;font-size:12px;color:#a1a1aa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                <a href="${companyUrl}" style="color:#a1a1aa;text-decoration:none;">${companyName}</a>
                &nbsp;&middot;&nbsp;
                <a href="${companyUrl}/privacy" style="color:#a1a1aa;text-decoration:underline;">Privacy</a>
                &nbsp;&middot;&nbsp;
                <a href="mailto:${supportEmail}" style="color:#a1a1aa;text-decoration:underline;">Support</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

  const text = `Verify your email – ${companyName}

${userName ? `Hi ${userName},\n\n` : ""}We received a request to verify ${userEmail}. Click the link below to confirm this address and activate your ${companyName} account.

${verificationLink}

This link expires in 1 hour. If you didn't request this, you can safely ignore this email.

—
${companyName}
${companyUrl}
Support: ${supportEmail}`;

  return { subject, html, text };
};
