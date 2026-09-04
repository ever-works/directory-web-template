export interface TwoFactorCodeEmailData {
	/** The plaintext one-time code. Only ever exists in this email. */
	code: string;
	/** Recipient address, echoed in the footer like the sibling templates. */
	customerEmail: string;
	/** Optional display name for the greeting. */
	userName?: string;
	/** Minutes the code stays valid — shown so the user knows to hurry. */
	expiresInMinutes: number;
	companyName?: string;
	companyUrl?: string;
	supportEmail?: string;
	securityUrl?: string;
}

/**
 * Branded sign-in verification email for email two-factor authentication
 * (EW-138).
 *
 * Modelled on `password-change-confirmation.ts` so the whole security
 * mail family looks alike: same 600px shell, same header / content /
 * footer rhythm, same inline styles (email clients ignore `<style>`
 * blocks and external CSS). The code itself is rendered in a large
 * monospaced block that survives a client stripping colours, and the
 * expiry window plus the "you did not try to sign in" warning are
 * spelled out because this mail is the one an attacker's victim sees
 * first.
 */
export const getTwoFactorCodeTemplate = (data: TwoFactorCodeEmailData) => {
	const {
		code,
		customerEmail,
		userName,
		expiresInMinutes,
		companyName = 'Ever Works',
		companyUrl = 'https://ever.works',
		supportEmail = 'support@ever.works',
		securityUrl = `${companyUrl}/client/settings/security`
	} = data;

	const subject = `${code} is your ${companyName} verification code`;

	const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your verification code</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #ffffff; margin: 0; padding: 20px;">

      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #ddd; padding: 0;">

        <!-- Header -->
        <div style="padding: 30px; text-align: center; border-bottom: 1px solid #ddd;">
          <h1 style="margin: 0; font-size: 24px; color: #333;">Your verification code</h1>
          <p style="margin: 10px 0 0 0; color: #666;">Two-factor authentication for your ${companyName} account</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">

          <p style="margin: 0 0 20px 0; font-size: 16px;">
            Hello${userName ? ` ${userName}` : ''},
          </p>

          <p style="margin: 0 0 25px 0; font-size: 16px; color: #666;">
            Enter this code to finish signing in to your ${companyName} account.
          </p>

          <!-- Code -->
          <div style="border: 1px solid #ddd; padding: 24px; margin: 25px 0; text-align: center;">
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px;">
              Verification code
            </p>
            <p style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: bold; letter-spacing: 8px; color: #111;">
              ${code}
            </p>
            <p style="margin: 12px 0 0 0; font-size: 14px; color: #666;">
              This code expires in ${expiresInMinutes} minutes and can be used once.
            </p>
          </div>

          <!-- Security Notice -->
          <div style="border: 1px solid #ddd; padding: 20px; margin: 25px 0;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">Didn't try to sign in?</h3>
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
              Someone may have your password. Do not share this code with anyone — ${companyName} will never ask you
              for it. Change your password and review your security settings right away.
            </p>
            <p style="margin: 0; font-size: 14px; color: #666;">
              Need help? Contact us at
              <a href="mailto:${supportEmail}" style="color: #333; text-decoration: underline;">${supportEmail}</a>
            </p>
          </div>

          <!-- Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${securityUrl}" style="display: inline-block; background-color: #333; color: white; text-decoration: none; padding: 12px 24px; border: 1px solid #333;">
              Review Security Settings
            </a>
          </div>

        </div>

        <!-- Footer -->
        <div style="padding: 20px; text-align: center; border-top: 1px solid #ddd;">
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #666;">
            This email was sent to <strong>${customerEmail}</strong>
          </p>
          <p style="margin: 0; font-size: 12px; color: #666;">
            &copy; ${new Date().getFullYear()} <a href="${companyUrl}" style="color: #333; text-decoration: underline;">${companyName}</a>. All rights reserved.
          </p>
        </div>

      </div>

    </body>
    </html>
  `;

	const text = `
Your ${companyName} verification code

Hello${userName ? ` ${userName}` : ''},

Enter this code to finish signing in to your ${companyName} account:

    ${code}

This code expires in ${expiresInMinutes} minutes and can be used once.

DIDN'T TRY TO SIGN IN? Someone may have your password. Do not share this code with
anyone — ${companyName} will never ask you for it. Change your password and review
your security settings right away: ${securityUrl}

Need help? Contact us at ${supportEmail}

© ${new Date().getFullYear()} ${companyName}. All rights reserved.
${companyUrl}
  `;

	return {
		subject,
		html,
		text
	};
};
