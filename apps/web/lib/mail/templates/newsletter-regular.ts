export const getRegularNewsletterTemplate = (
  email: string, 
  appName: string = "Ever Works",
  content: {
    title: string;
    subtitle?: string;
    articles: Array<{
      title: string;
      excerpt: string;
      image?: string;
      link: string;
      category?: string;
    }>;
    featured?: {
      title: string;
      description: string;
      image?: string;
      link: string;
      cta: string;
    };
    stats?: {
      totalUsers: number;
      newFeatures: number;
      updates: number;
    };
  }
) => {
  return {
    subject: content.title,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${content.title}</title>
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
          }
          
          .header .logo {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 10px;
            letter-spacing: -0.5px;
          }
          
          .header .date {
            font-size: 14px;
            opacity: 0.8;
            font-weight: 400;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .newsletter-title {
            text-align: center;
            margin-bottom: 30px;
          }
          
          .newsletter-title h1 {
            font-size: 28px;
            color: #1f2937;
            margin-bottom: 8px;
            font-weight: 700;
          }
          
          .newsletter-title p {
            font-size: 16px;
            color: #6b7280;
            font-weight: 400;
          }
          
          .featured-section {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-radius: 12px;
            padding: 30px;
            margin: 30px 0;
            text-align: center;
          }
          
          .featured-section h2 {
            font-size: 20px;
            color: #0369a1;
            margin-bottom: 16px;
            font-weight: 600;
          }
          
          .featured-section p {
            font-size: 16px;
            color: #0c4a6e;
            margin-bottom: 20px;
            line-height: 1.6;
          }
          
          .featured-cta {
            display: inline-block;
            background: linear-gradient(135deg, #0369a1 0%, #0c4a6e 100%);
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px -1px rgba(3, 105, 161, 0.3);
          }
          
          .featured-cta:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 15px -3px rgba(3, 105, 161, 0.4);
          }
          
          .articles-section {
            margin: 40px 0;
          }
          
          .articles-section h2 {
            font-size: 22px;
            color: #1f2937;
            margin-bottom: 24px;
            font-weight: 600;
            text-align: center;
          }
          
          .article {
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 20px;
            border-left: 4px solid #667eea;
            transition: all 0.3s ease;
          }
          
          .article:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 15px -3px rgba(0, 0, 0, 0.1);
          }
          
          .article-category {
            font-size: 12px;
            color: #667eea;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          
          .article-title {
            font-size: 18px;
            color: #1f2937;
            margin-bottom: 12px;
            font-weight: 600;
            line-height: 1.4;
          }
          
          .article-excerpt {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 16px;
            line-height: 1.6;
          }
          
          .article-link {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
            font-size: 14px;
            display: inline-flex;
            align-items: center;
          }
          
          .article-link:hover {
            text-decoration: underline;
          }
          
          .article-link::after {
            content: "→";
            margin-left: 4px;
            transition: transform 0.2s ease;
          }
          
          .article-link:hover::after {
            transform: translateX(2px);
          }
          
          .stats-section {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-radius: 12px;
            padding: 30px;
            margin: 30px 0;
            text-align: center;
          }
          
          .stats-section h3 {
            font-size: 18px;
            color: #92400e;
            margin-bottom: 20px;
            font-weight: 600;
          }
          
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          
          .stat-item {
            text-align: center;
          }
          
          .stat-number {
            font-size: 24px;
            font-weight: 700;
            color: #92400e;
            margin-bottom: 4px;
          }
          
          .stat-label {
            font-size: 12px;
            color: #a16207;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
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
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
          }
          
          .footer a:hover {
            text-decoration: underline;
          }
          
          .social-links {
            margin-top: 20px;
          }
          
          .social-links a {
            display: inline-block;
            margin: 0 8px;
            color: #6b7280;
            text-decoration: none;
            font-size: 14px;
          }
          
          .unsubscribe-link {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
          }
          
          .unsubscribe-link a {
            color: #9ca3af;
            font-size: 12px;
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
            
            .newsletter-title h1 {
              font-size: 24px;
            }
            
            .featured-section {
              padding: 20px;
            }
            
            .stats-grid {
              grid-template-columns: 1fr;
              gap: 16px;
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
            <div class="logo">${appName}</div>
            <div class="date">${new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</div>
          </div>
          
          <div class="content">
            <div class="newsletter-title">
              <h1>${content.title}</h1>
              ${content.subtitle ? `<p>${content.subtitle}</p>` : ''}
            </div>
            
            ${content.featured ? `
              <div class="featured-section">
                <h2>${content.featured.title}</h2>
                <p>${content.featured.description}</p>
                <a href="${content.featured.link}" class="featured-cta">
                  ${content.featured.cta}
                </a>
              </div>
            ` : ''}
            
            <div class="articles-section">
              <h2>📰 Latest news</h2>
              ${content.articles.map(article => `
                <div class="article">
                  ${article.category ? `<div class="article-category">${article.category}</div>` : ''}
                  <div class="article-title">${article.title}</div>
                  <div class="article-excerpt">${article.excerpt}</div>
                  <a href="${article.link}" class="article-link">Read more</a>
                </div>
              `).join('')}
            </div>
            
            ${content.stats ? `
              <div class="stats-section">
                <h3>📊 This week's statistics</h3>
                <div class="stats-grid">
                  <div class="stat-item">
                    <div class="stat-number">${content.stats.totalUsers.toLocaleString()}</div>
                    <div class="stat-label">Users</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-number">${content.stats.newFeatures}</div>
                    <div class="stat-label">New features</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-number">${content.stats.updates}</div>
                    <div class="stat-label">Updates</div>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>This email was sent to <strong>${email}</strong></p>
            <p>© 2024 ${appName}. All rights reserved.</p>
            
            <div class="social-links">
              <a href="#">Twitter</a>
              <a href="#">LinkedIn</a>
              <a href="#">GitHub</a>
            </div>
            
            <div class="unsubscribe-link">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://ever.works'}/newsletter/unsubscribe">Unsubscribe</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
${content.title}
${content.subtitle ? content.subtitle : ''}

${content.featured ? `
FEATURED: ${content.featured.title}
${content.featured.description}
${content.featured.link}
` : ''}

LATEST NEWS:
${content.articles.map(article => `
• ${article.title}
  ${article.excerpt}
  ${article.link}
`).join('\n')}

${content.stats ? `
THIS WEEK'S STATISTICS:
• ${content.stats.totalUsers.toLocaleString()} users
• ${content.stats.newFeatures} new features  
• ${content.stats.updates} updates
` : ''}

This email was sent to ${email}
© 2024-Present ${appName}. All rights reserved.

Unsubscribe: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://ever.works'}/newsletter/unsubscribe
    `
  };
}; 
