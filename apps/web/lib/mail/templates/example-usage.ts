import { getRegularNewsletterTemplate } from './newsletter-regular';
import { EmailService } from '../index';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://demo.ever.works");

// Example usage for sending a regular newsletter
export const sendRegularNewsletter = async (subscribers: string[]) => {
  const emailConfig = {
    provider: "resend",
    defaultFrom: "newsletter@ever.works",
    domain: appUrl,
    apiKeys: {
      resend: process.env.RESEND_API_KEY || "",
      novu: process.env.NOVU_API_KEY || "",
    },
  };

  const emailService = new EmailService(emailConfig);

  // Newsletter content
  const newsletterContent = {
    title: "🚀 New features and updates",
    subtitle: "Discover the latest improvements to our platform",
    featured: {
      title: "✨ New user interface",
      description: "We've completely redesigned our interface for an optimal user experience. Discover the new features and improvements.",
      link: "https://ever.works/blog/new-ui",
      cta: "Discover the new interface"
    },
    articles: [
      {
        title: "📊 Enhanced performance statistics",
        excerpt: "We've added new charts and metrics to better track your performance.",
        category: "Feature",
        link: "https://ever.works/blog/performance-stats"
      },
      {
        title: "🔒 Enhanced security",
        excerpt: "Updated our security protocols to protect your data.",
        category: "Security",
        link: "https://ever.works/blog/security-update"
      },
      {
        title: "📱 Mobile app available",
        excerpt: "Access all features from your smartphone.",
        category: "Mobile",
        link: "https://ever.works/blog/mobile-app"
      }
    ],
    stats: {
      totalUsers: 15420,
      newFeatures: 8,
      updates: 12
    }
  };

  // Send newsletter to all subscribers
  for (const email of subscribers) {
    try {
      const template = getRegularNewsletterTemplate(email, "Ever Works", newsletterContent);
      
      await emailService.sendCustomEmail({
        from: emailConfig.defaultFrom,
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Newsletter sent successfully to ${email}`);
    } catch (error) {
      console.error(`Error sending to ${email}:`, error);
    }
  }
};

// Example usage for a personalized welcome email
export const sendWelcomeEmail = async (email: string, userName?: string) => {
  const emailConfig = {
    provider: "resend",
    defaultFrom: "welcome@ever.works",
    domain: appUrl,
    apiKeys: {
      resend: process.env.RESEND_API_KEY || "",
      novu: process.env.NOVU_API_KEY || "",
    },
  };

  const emailService = new EmailService(emailConfig);
  const { getWelcomeEmailTemplate } = await import('./newsletter-welcome');
  
  const template = getWelcomeEmailTemplate(email, "Ever Works");
  
  // Personalize template if needed
  const personalizedHtml = template.html.replace(
    'Thank you for subscribing!',
    userName ? `Thank you for subscribing, ${userName}!` : 'Thank you for subscribing!'
  );

  await emailService.sendCustomEmail({
    from: emailConfig.defaultFrom,
    to: email,
    subject: template.subject,
    html: personalizedHtml,
    text: template.text,
  });
}; 
