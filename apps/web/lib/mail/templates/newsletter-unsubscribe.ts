export const getUnsubscribeEmailTemplate = (email: string, appName: string = "Ever Works") => {
  return {
    subject: `Unsubscription confirmed - ${appName}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Unsubscription confirmed</title>
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
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
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
          
          .content {
            padding: 40px 30px;
          }
          
          .message {
            text-align: center;
            margin-bottom: 40px;
          }
          
          .message h2 {
            font-size: 24px;
            color: #1f2937;
            margin-bottom: 16px;
            font-weight: 600;
          }
          
          .message p {
            font-size: 16px;
            color: #6b7280;
            line-height: 1.7;
            margin-bottom: 16px;
          }
          
          .info-box {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            text-align: center;
          }
          
          .info-box h3 {
            font-size: 18px;
            color: #dc2626;
            margin-bottom: 12px;
            font-weight: 600;
          }
          
          .info-box p {
            font-size: 14px;
            color: #7f1d1d;
            margin-bottom: 8px;
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
          }
          
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 15px -3px rgba(59, 130, 246, 0.4);
          }
          
          .resubscribe-section {
            background-color: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            padding: 30px;
            margin: 30px 0;
            text-align: center;
          }
          
          .resubscribe-section h3 {
            font-size: 18px;
            color: #0369a1;
            margin-bottom: 16px;
            font-weight: 600;
          }
          
          .resubscribe-section p {
            font-size: 14px;
            color: #0c4a6e;
            margin-bottom: 20px;
          }
          
          .resubscribe-button {
            display: inline-block;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 500;
            font-size: 14px;
            transition: all 0.3s ease;
          }
          
          .resubscribe-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px -2px rgba(16, 185, 129, 0.3);
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
            
            .resubscribe-section {
              padding: 20px;
            }
            
            .footer {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👋 Goodbye!</h1>
            <p>Your unsubscription has been confirmed</p>
          </div>
          
          <div class="content">
            <div class="message">
              <h2>Unsubscription successful</h2>
              <p>We confirm that you have been unsubscribed from our newsletter.</p>
              <p>You will no longer receive emails from us regarding news and offers.</p>
            </div>
            
            <div class="info-box">
              <h3>📧 Email address</h3>
              <p><strong>${email}</strong></p>
              <p>Unsubscribed on ${new Date().toLocaleDateString('en-US')}</p>
            </div>
            
            <div class="cta-section">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://ever.works'}" class="cta-button">
                Visit our website
              </a>
            </div>
            
            <div class="resubscribe-section">
              <h3>💡 Changed your mind?</h3>
              <p>If you'd like to receive our news again, you can resubscribe at any time.</p>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://ever.works'}" class="resubscribe-button">
                Resubscribe
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>This email was sent to <strong>${email}</strong></p>
            <p>© 2025 ${appName}. All rights reserved.</p>
            <p>For any questions, contact us at <a href="mailto:support@${appName.toLowerCase().replace(' ', '')}.com">support@${appName.toLowerCase().replace(' ', '')}.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Unsubscription confirmed

We confirm that you have been unsubscribed from our newsletter.

Email address: ${email}
Unsubscription date: ${new Date().toLocaleDateString('en-US')}

You will no longer receive emails from us regarding news and offers.

Visit our website: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://ever.works'}

Changed your mind?
If you'd like to receive our news again, you can resubscribe at any time on our website.

© 2025 ${appName}. All rights reserved.
For any questions, contact us at support@${appName.toLowerCase().replace(' ', '')}.com
    `
  };
}; 
