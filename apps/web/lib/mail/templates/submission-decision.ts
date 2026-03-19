const escapeHtml = (text: string): string => {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
};

export const getSubmissionDecisionTemplate = (data: {
	itemName: string;
	status: "approved" | "rejected";
	reviewNotes?: string;
	appName?: string;
}) => {
	const { status, appName = "Ever Works" } = data;
	const itemName = escapeHtml(data.itemName);
	const reviewNotes = data.reviewNotes ? escapeHtml(data.reviewNotes) : undefined;

	const isApproved = status === "approved";
	const subject = isApproved
		? `Your submission "${itemName}" has been approved`
		: `Update on your submission "${itemName}"`;

	const currentDate = new Date().toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	return {
		subject,
		html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
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
            background: linear-gradient(135deg, ${isApproved ? "#059669 0%, #10b981 100%" : "#dc2626 0%, #ef4444 100%"});
            padding: 40px 30px;
            text-align: center;
            color: white;
          }

          .header .icon {
            font-size: 48px;
            margin-bottom: 16px;
            display: block;
          }

          .header .title {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
          }

          .header .subtitle {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 400;
          }

          .content {
            padding: 40px 30px;
          }

          .message {
            font-size: 16px;
            line-height: 1.8;
            color: #475569;
            margin-bottom: 24px;
          }

          .item-name {
            font-weight: 600;
            color: #1e293b;
          }

          .feedback-box {
            background-color: #f1f5f9;
            border-left: 4px solid #64748b;
            padding: 20px;
            border-radius: 8px;
            margin: 24px 0;
          }

          .feedback-label {
            font-size: 14px;
            font-weight: 600;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }

          .feedback-text {
            font-size: 15px;
            color: #1e293b;
            line-height: 1.7;
            white-space: pre-wrap;
          }

          .footer {
            background-color: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }

          .footer-text {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 8px;
          }

          .footer-link {
            color: #3b82f6;
            text-decoration: none;
          }

          .date-info {
            font-size: 13px;
            color: #94a3b8;
            margin-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="icon">${isApproved ? "✅" : "❌"}</span>
            <h1 class="title">Submission ${isApproved ? "Approved" : "Not Approved"}</h1>
            <p class="subtitle">${itemName}</p>
          </div>

          <div class="content">
            <p class="message">
              Hello,
            </p>

            <p class="message">
              Your submission <span class="item-name">"${itemName}"</span> has been reviewed and ${isApproved ? "approved" : "was not approved at this time"}.
              ${isApproved ? "It is now live on the platform." : ""}
            </p>

            ${reviewNotes ? `
            <div class="feedback-box">
              <div class="feedback-label">Reviewer Feedback</div>
              <div class="feedback-text">${reviewNotes}</div>
            </div>
            ` : ""}

            <p class="message">
              Thank you for your ${isApproved ? "contribution" : "interest in contributing"}.
            </p>

            <p class="message">
              Best regards,<br>
              The ${appName} Team
            </p>
          </div>

          <div class="footer">
            <p class="footer-text">
              This is an automated notification from <strong>${appName}</strong>.
            </p>
            <p class="date-info">${currentDate}</p>
          </div>
        </div>
      </body>
      </html>
    `,
		text: `
${isApproved ? "Submission Approved" : "Submission Not Approved"}
${data.itemName}

Hello,

Your submission "${data.itemName}" has been reviewed and ${isApproved ? "approved" : "was not approved at this time"}.
${isApproved ? "It is now live on the platform." : ""}

${data.reviewNotes ? `Reviewer feedback: ${data.reviewNotes}` : ""}

Thank you for your ${isApproved ? "contribution" : "interest in contributing"}.

Best regards,
The ${appName} Team

---
This is an automated notification from ${appName}.
${currentDate}
    `,
	};
};

// Helper function for EmailNotificationService
export const SubmissionDecisionEmailHtml = getSubmissionDecisionTemplate;
