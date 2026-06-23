export interface EmailVerificationData {
  userEmail: string;
  verificationLink: string;
  companyName?: string;
  companyUrl?: string;
  supportEmail?: string;
  userName?: string;
  /**
   * Absolute URL to a PNG/JPG logo (SVG is unreliable in email clients).
   * When omitted we fall back to a styled text wordmark, which renders
   * identically across every client and never breaks — important because
   * `localhost` asset URLs are unreachable from a recipient's inbox.
   */
  logoUrl?: string;
}

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

/**
 * An image logo only "works" in an inbox when it is served from a public,
 * absolute `https` URL. Dev/localhost hosts are unreachable from the
 * recipient's mail client and SVGs are stripped by Gmail & Outlook, so in
 * those cases we deliberately fall back to a text wordmark instead of
 * shipping a broken image.
 */
function resolveLogoUrl(logoUrl: string | undefined, companyUrl: string): string | null {
  const isUsable = (url: string) =>
    /^https:\/\//i.test(url) &&
    !/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(url) &&
    !/\.svg(\?|$)/i.test(url);

  if (logoUrl && isUsable(logoUrl)) return logoUrl;

  const derived = `${companyUrl.replace(/\/+$/, "")}/logo-dark.png`;
  if (isUsable(derived)) return derived;

  return null;
}

export const getEmailVerificationTemplate = (data: EmailVerificationData) => {
  const {
    userEmail,
    verificationLink,
    companyName = "Ever Works",
    companyUrl = "https://ever.works",
    supportEmail = "support@ever.works",
    userName,
    logoUrl,
  } = data;

  const subject = `Verify your email – ${companyName}`;

  const resolvedLogo = resolveLogoUrl(logoUrl, companyUrl);

  const brandMarkup = resolvedLogo
    ? `<img src="${resolvedLogo}" alt="${companyName}" height="32" style="display:block;height:32px;width:auto;max-width:180px;border:0;outline:none;text-decoration:none;" />`
    : `<span style="font-size:19px;font-weight:700;color:#18181b;letter-spacing:-0.4px;font-family:${FONT_STACK};">${companyName}</span>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Verify your email &#8211; ${companyName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;-webkit-font-smoothing:antialiased;mso-line-height-rule:exactly;word-spacing:normal;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f4f4f5;">
    Confirm ${userEmail} to activate your ${companyName} account. This link expires in 1 hour.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 16px 56px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:512px;">

          <!-- Brand -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <a href="${companyUrl}" style="display:inline-block;text-decoration:none;">
                ${brandMarkup}
              </a>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:14px;border:1px solid #e4e4e7;box-shadow:0 1px 2px rgba(16,24,40,0.04);overflow:hidden;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">

                <!-- Top accent bar -->
                <tr>
                  <td style="height:4px;background-color:#2563eb;font-size:0;line-height:0;">&nbsp;</td>
                </tr>

                <!-- Main content -->
                <tr>
                  <td style="padding:40px 44px 36px;">

                    <!-- Heading -->
                    <h1 style="margin:0 0 14px;font-size:21px;font-weight:700;color:#09090b;letter-spacing:-0.4px;line-height:1.3;font-family:${FONT_STACK};">
                      Confirm your email address
                    </h1>

                    <!-- Body text -->
                    <p style="margin:0 0 30px;font-size:15px;color:#52525b;line-height:1.65;font-family:${FONT_STACK};">
                      ${userName ? `Hi ${userName},<br><br>` : ""}Thanks for signing up. Please confirm that <strong style="color:#3f3f46;font-weight:600;">${userEmail}</strong> belongs to you to finish setting up your ${companyName} account.
                    </p>

                    <!-- CTA button (bulletproof) -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="border-radius:9px;background-color:#2563eb;">
                          <a href="${verificationLink}"
                             style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:9px;font-family:${FONT_STACK};letter-spacing:0.1px;">
                            Verify email address
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Expiry note -->
                    <p style="margin:30px 0 0;font-size:13px;color:#a1a1aa;line-height:1.6;font-family:${FONT_STACK};">
                      This link expires in <span style="color:#71717a;font-weight:600;">1 hour</span>. If you didn&#8217;t create an account, you can safely ignore this email &#8212; nothing will happen.
                    </p>

                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding:0 44px;font-size:0;line-height:0;">
                    <div style="height:1px;background-color:#f0f0f1;">&nbsp;</div>
                  </td>
                </tr>

                <!-- Fallback URL -->
                <tr>
                  <td style="padding:22px 44px 34px;">
                    <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#a1a1aa;letter-spacing:0.6px;text-transform:uppercase;font-family:${FONT_STACK};">
                      Button not working?
                    </p>
                    <p style="margin:0;font-size:12px;color:#71717a;line-height:1.6;font-family:${FONT_STACK};">
                      Copy and paste this link into your browser:<br>
                      <a href="${verificationLink}" style="color:#2563eb;text-decoration:none;word-break:break-all;">${verificationLink}</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:28px 8px 0;">
              <p style="margin:0 0 6px;font-size:12px;color:#a1a1aa;line-height:1.5;font-family:${FONT_STACK};">
                This message was sent to ${userEmail}.
              </p>
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;font-family:${FONT_STACK};">
                <a href="${companyUrl}" style="color:#71717a;text-decoration:none;font-weight:600;">${companyName}</a>
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

${userName ? `Hi ${userName},\n\n` : ""}Thanks for signing up. Please confirm that ${userEmail} belongs to you to finish setting up your ${companyName} account.

Verify your email address:
${verificationLink}

This link expires in 1 hour. If you didn't create an account, you can safely ignore this email.

—
${companyName}
${companyUrl}
Support: ${supportEmail}`;

  return { subject, html, text };
};
