

export const getAdminNotificationTemplate = (
  data: {
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    notificationType: string;
    timestamp: string;
    appName?: string;
  }
) => {
  const {
    title,
    message,
    actionUrl,
    actionText = "View Details",
    notificationType,
    timestamp,
    appName = "Ever Works"
  } = data;

  const notificationTypeLabel = notificationType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return {
    subject: `Admin Notification: ${title}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Notification: ${title}</title>
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
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
          }
          
          .header .icon {
            font-size: 32px;
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
            opacity: 0.8;
            font-weight: 400;
          }
          
          .header .date {
            font-size: 14px;
            opacity: 0.7;
            margin-top: 16px;
            font-weight: 400;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .notification-badge {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: inline-block;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
          }
          
          .notification-title {
            text-align: center;
            margin-bottom: 30px;
          }
          
          .notification-title h1 {
            font-size: 28px;
            color: #1f2937;
            margin-bottom: 8px;
            font-weight: 700;
          }
          
          .notification-title p {
            font-size: 16px;
            color: #6b7280;
            font-weight: 400;
          }
          
          .notification-details {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-radius: 12px;
            padding: 30px;
            margin: 30px 0;
          }
          
          .detail-item {
            margin-bottom: 20px;
          }
          
          .detail-item:last-child {
            margin-bottom: 0;
          }
          
          .detail-label {
            font-size: 12px;
            color: #0369a1;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          
          .detail-value {
            font-size: 16px;
            color: #0c4a6e;
            font-weight: 500;
            line-height: 1.5;
          }
          
          .message-content {
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 24px;
            margin: 20px 0;
            border-left: 4px solid #3b82f6;
            font-size: 16px;
            color: #374151;
            line-height: 1.6;
          }
          
          .action-section {
            text-align: center;
            margin: 40px 0;
          }
          
          .action-button {
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
          
          .action-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 15px -3px rgba(59, 130, 246, 0.4);
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
          
          .priority-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            background-color: #ef4444;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse 2s infinite;
          }
          
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          
          @media (max-width: 600px) {
            .container {
              margin: 10px;
              border-radius: 8px;
            }
            
            .header {
              padding: 30px 20px;
            }
            
            .content {
              padding: 30px 20px;
            }
            
            .notification-title h1 {
              font-size: 24px;
            }
            
            .notification-details {
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
            <span class="icon">🔔</span>
            <div class="title">Admin Notification</div>
            <div class="subtitle">System Alert</div>
            <div class="date">${currentDate}</div>
          </div>
          
          <div class="content">
            <div style="text-align: center;">
              <div class="notification-badge">
                ${notificationTypeLabel}
              </div>
            </div>
            
            <div class="notification-title">
              <h1>${title}</h1>
              <p><span class="priority-indicator"></span>Requires immediate attention</p>
            </div>
            
            <div class="notification-details">
              <div class="detail-item">
                <div class="detail-label">Type</div>
                <div class="detail-value">${notificationTypeLabel}</div>
              </div>
              
              <div class="detail-item">
                <div class="detail-label">Timestamp</div>
                <div class="detail-value">${timestamp}</div>
              </div>
            </div>
            
            <div class="message-content">
              ${message}
            </div>
            
            ${actionUrl ? `
              <div class="action-section">
                <a href="${actionUrl}" class="action-button">
                  ${actionText}
                </a>
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>This is an automated notification from <strong>${appName}</strong> admin system.</p>
            <p>You can manage your notification preferences in the admin dashboard.</p>
            <p>© 2024 ${appName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
ADMIN NOTIFICATION: ${title}

Type: ${notificationTypeLabel}
Timestamp: ${timestamp}

Message:
${message}

${actionUrl ? `${actionText}: ${actionUrl}` : ''}

This is an automated notification from ${appName} admin system.
You can manage your notification preferences in the admin dashboard.

© 2024 ${appName}. All rights reserved.
    `
  };
};

export const AdminNotificationEmailHtml = (props: {
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  notificationType: string;
  timestamp: string;
}) => {
  return getAdminNotificationTemplate(props);
};
