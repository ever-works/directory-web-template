export interface InvitationEmailData {
	inviterName: string;
	organizationName: string;
	invitationLink: string;
	userEmail: string;
	companyName?: string;
	companyUrl?: string;
	supportEmail?: string;
}

export const getInvitationEmailTemplate = (data: InvitationEmailData) => {
	const {
		inviterName,
		organizationName,
		invitationLink,
		userEmail,
		companyName = 'Ever Works',
		companyUrl = 'https://ever.works',
		supportEmail = 'support@ever.works'
	} = data;

	const subject = `📬 You've been invited to join ${organizationName} on ${companyName}`;

	const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You've been invited</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; color: white; }
        .header h1 { font-size: 24px; font-weight: 700; margin-bottom: 10px; }
        .content { padding: 40px 30px; }
        .message { text-align: center; margin-bottom: 30px; }
        .message h2 { font-size: 20px; color: #1f2937; margin-bottom: 16px; }
        .cta-section { text-align: center; margin: 40px 0; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: all 0.3s ease; }
        .cta-button:hover { transform: translateY(-2px); box-shadow: 0 8px 15px -3px rgba(59, 130, 246, 0.4); }
        .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
        .footer a { color: #3b82f6; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>You've been invited!</h1>
        </div>
        
        <div class="content">
          <div class="message">
            <h2>Hello!</h2>
            <p><strong>${inviterName}</strong> has invited you to join the organization <strong>${organizationName}</strong> on ${companyName}.</p>
            <p>Accept the invitation to collaborate with your team.</p>
          </div>
          
          <div class="cta-section">
            <a href="${invitationLink}" class="cta-button">Accept Invitation</a>
          </div>
          
          <p style="text-align: center; font-size: 14px; color: #6b7280;">
            This invitation was sent to ${userEmail}. If you were not expecting this invitation, you can ignore this email.
          </p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
          <p><a href="${companyUrl}">Visit our website</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

	const text = `
You've been invited to join ${organizationName} on ${companyName}

Hello!

${inviterName} has invited you to join the organization ${organizationName} on ${companyName}.

To accept the invitation, please click the link below:
${invitationLink}

This invitation was sent to ${userEmail}. If you were not expecting this invitation, you can ignore this email.

© ${new Date().getFullYear()} ${companyName}. All rights reserved.
  `;

	return {
		subject,
		html,
		text
	};
};
