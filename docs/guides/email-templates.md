---
id: email-templates
title: Email Templates
sidebar_label: Email Templates
sidebar_position: 5
---

# Email Templates

Ever Works includes professional, responsive email templates for newsletters and transactional emails.

## Overview

The email template system provides:
- 📧 **Pre-built templates** - Welcome, newsletter, unsubscribe
- 📱 **Responsive design** - Optimized for mobile and desktop
- 🎨 **Modern styling** - Gradients, rounded borders, shadows
- ✅ **Email client compatibility** - Works across all major clients
- 🔧 **Customizable** - Easy to modify and extend

## Available Templates

### 1. Welcome Email

Sent to new newsletter subscribers.

**Function**: `getWelcomeEmailTemplate(email, appName)`

**Parameters**:
- `email` (string): Subscriber's email address
- `appName` (string, optional): Application name (default: "Ever Works")

**Usage**:
```typescript
import { getWelcomeEmailTemplate } from '@/lib/mail/templates';

const template = getWelcomeEmailTemplate('user@example.com', 'My App');

await emailService.sendCustomEmail({
  from: 'welcome@myapp.com',
  to: 'user@example.com',
  subject: template.subject,
  html: template.html,
  text: template.text,
});
```

### 2. Unsubscribe Email

Confirms user unsubscription.

**Function**: `getUnsubscribeEmailTemplate(email, appName)`

**Parameters**:
- `email` (string): User's email address
- `appName` (string, optional): Application name

**Usage**:
```typescript
import { getUnsubscribeEmailTemplate } from '@/lib/mail/templates';

const template = getUnsubscribeEmailTemplate('user@example.com', 'My App');
```

### 3. Regular Newsletter

Weekly/monthly newsletters with dynamic content.

**Function**: `getRegularNewsletterTemplate(email, appName, content)`

**Parameters**:
- `email` (string): Subscriber's email address
- `appName` (string, optional): Application name
- `content` (object): Newsletter content

**Content Structure**:
```typescript
interface NewsletterContent {
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
```

**Usage Example**:
```typescript
import { getRegularNewsletterTemplate } from '@/lib/mail/templates';

const content = {
  title: "🚀 New Features This Week",
  subtitle: "Discover the latest improvements",
  featured: {
    title: "✨ New Interface",
    description: "Completely redesigned user interface",
    link: "https://myapp.com/blog/new-ui",
    cta: "Learn More"
  },
  articles: [
    {
      title: "📊 Enhanced Statistics",
      excerpt: "New charts and metrics for better insights",
      category: "Feature",
      link: "https://myapp.com/blog/stats"
    },
    {
      title: "🔒 Improved Security",
      excerpt: "Two-factor authentication now available",
      category: "Security",
      link: "https://myapp.com/blog/2fa"
    }
  ],
  stats: {
    totalUsers: 15420,
    newFeatures: 8,
    updates: 12
  }
};

const template = getRegularNewsletterTemplate(
  'user@example.com',
  'My App',
  content
);
```

## Template Features

### Responsive Design
- ✅ Optimized for mobile and desktop
- ✅ Maximum width of 600px (email standard)
- ✅ Adaptive grid for statistics
- ✅ Touch-friendly buttons

### Modern Styles
- ✅ Colorful gradients for headers
- ✅ Rounded borders and shadows
- ✅ Subtle CSS animations
- ✅ Optimized typography
- ✅ Professional color scheme

### Modular Sections
- **Header**: Logo and date
- **Main title**: Customizable title and subtitle
- **Featured section**: Highlight main content (optional)
- **Articles**: News list with categories
- **Statistics**: Weekly metrics (optional)
- **Footer**: Social links and unsubscribe

## Email Configuration

### Environment Variables

```env
# Email Provider (Resend or Novu)
RESEND_API_KEY=your_resend_api_key
NOVU_API_KEY=your_novu_api_key

# Email Settings
NEXT_PUBLIC_APP_URL=https://yourdomain.com
EMAIL_FROM=newsletter@yourdomain.com
```

### Email Service Configuration

```typescript
const emailConfig = {
  provider: "resend", // or "novu"
  defaultFrom: "newsletter@yourdomain.com",
  domain: "https://yourdomain.com",
  apiKeys: {
    resend: process.env.RESEND_API_KEY,
    novu: process.env.NOVU_API_KEY,
  },
};
```

## Customization

### Template Colors

```typescript
// Modify gradient colors
const customHtml = template.html.replace(
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%)'
);
```

### Personalization

```typescript
// Personalize content based on user
const personalizedContent = {
  ...newsletterContent,
  title: `Hello ${userName}, here are your updates!`,
  articles: getUserSpecificArticles(userId)
};
```

### Add UTM Tracking

```typescript
// Add UTM parameters for analytics
const trackingUrl = `${article.link}?utm_source=newsletter&utm_medium=email&utm_campaign=weekly`;
```

## Email Client Compatibility

### Supported Clients
- ✅ Gmail (Web and Mobile)
- ✅ Outlook (Web and Desktop)
- ✅ Apple Mail
- ✅ Thunderbird
- ✅ Yahoo Mail
- ✅ Native mobile clients

### Supported CSS Features
- ✅ Flexbox and Grid
- ✅ Gradients
- ✅ Rounded borders
- ✅ Shadows
- ✅ Media queries
- ✅ CSS animations (limited)

## Best Practices

### Content
1. **Catchy titles** - Use emojis and descriptive text
2. **Short content** - Keep it concise and impactful
3. **Clear CTAs** - Make actions obvious
4. **Optimized images** - Max 1MB, use CDN
5. **Alt text** - Always include for accessibility

### Technical
1. **Test thoroughly** - Check on different email clients
2. **Verify links** - Test all links before sending
3. **Respect limits** - Follow email provider sending limits
4. **Monitor metrics** - Track open rates, clicks, bounces

### Legal
1. **Unsubscribe link** - Always include and make it easy
2. **GDPR compliance** - Get explicit consent
3. **Privacy policy** - Link to your privacy policy
4. **Subscription proof** - Keep records of opt-ins

## Troubleshooting

### Images Not Displaying

**Issue**: Images don't show in emails

**Solution**: Use absolute URLs

```typescript
// ❌ Bad
image: "/images/logo.png"

// ✅ Good
image: "https://yourdomain.com/images/logo.png"
```

### Styles Not Applied

**Issue**: CSS styles not working

**Solution**: Use inline CSS for critical styles

```html
<p style="color: #333; font-size: 16px;">Text</p>
```

### Emails Going to Spam

**Issue**: Emails end up in spam folder

**Solution**:
- Avoid spam trigger words
- Set up SPF, DKIM, DMARC records
- Use reputable email service
- Maintain good sender reputation

## Analytics and Tracking

### Recommended Metrics
- 📊 Open rate
- 🖱️ Click-through rate
- 📉 Unsubscribe rate
- ⏱️ Reading time
- 📍 Engagement by section

### Testing Tools
- [Mail Tester](https://www.mail-tester.com/) - Deliverability testing
- [Litmus](https://www.litmus.com/) - Email client testing
- [Email on Acid](https://www.emailonacid.com/) - Comprehensive testing

## Next Steps

- [Customization](./customization) - General customization guide
- [Deployment](/template/deployment) - Deploy your application
- [Environment Variables](/template/deployment/environment-variables) - Configure email settings

## Resources

- [Email Best Practices](https://www.emailonacid.com/blog/)
- [CSS Compatibility](https://www.campaignmonitor.com/css/)
- [Resend Documentation](https://resend.com/docs)
- [Novu Documentation](https://docs.novu.co/)

