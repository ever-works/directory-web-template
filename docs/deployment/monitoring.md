---
id: monitoring
title: Monitoring & Analytics
sidebar_label: Monitoring
sidebar_position: 6
---

# Monitoring & Analytics

Monitor your Ever Works deployment's performance, errors, and user behavior.

## Application Monitoring

## Exception Tracking

Ever Works provides flexible exception tracking that allows you to choose between **PostHog**, **Sentry**, or **both** for error monitoring.

### Configuration Options

The application supports four exception tracking modes:

- **PostHog**: Lightweight exception tracking integrated with your analytics
- **Sentry**: Full-featured error monitoring and performance tracking
- **Both**: Use both services simultaneously (useful during migration)
- **None**: Disable exception tracking

### Environment Variables

Add these variables to your `.env.local` file:

```bash
# Exception Tracking Configuration
# Options: "sentry", "posthog", "both", or "none"
EXCEPTION_TRACKING_PROVIDER=both

# Enable/disable exception tracking for each service
POSTHOG_EXCEPTION_TRACKING=true
SENTRY_EXCEPTION_TRACKING=true

# PostHog Configuration
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
POSTHOG_DEBUG=false
POSTHOG_SESSION_RECORDING_ENABLED=true
POSTHOG_AUTO_CAPTURE=false

# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ENABLE_DEV=false
SENTRY_DEBUG=false
```

#### Configuration Explained

**EXCEPTION_TRACKING_PROVIDER**:

- `"sentry"`: Only use Sentry for exception tracking
- `"posthog"`: Only use PostHog for exception tracking
- `"both"`: Use both services (errors sent to both)
- `"none"`: Disable all exception tracking

**Service-Specific Toggles**:

- `POSTHOG_EXCEPTION_TRACKING`: Enable/disable PostHog exception tracking
- `SENTRY_EXCEPTION_TRACKING`: Enable/disable Sentry exception tracking

These toggles work in conjunction with `EXCEPTION_TRACKING_PROVIDER`. For example, if you set `EXCEPTION_TRACKING_PROVIDER=both` but `POSTHOG_EXCEPTION_TRACKING=false`, only Sentry will receive exceptions.

---

### Error Tracking with Sentry

Sentry provides comprehensive error monitoring with detailed stack traces, release tracking, and performance monitoring.

#### Installation

```bash
npm install @sentry/nextjs
```

#### Configuration

```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  // Enable performance monitoring
  integrations: [
    new Sentry.BrowserTracing(),
  ],
  // Sample rate for performance monitoring
  tracesSampleRate: 0.1,
  // Capture 100% of errors
  sampleRate: 1.0,
});
```

#### Benefits of Sentry

- ✅ Advanced error grouping and deduplication
- ✅ Source map support for production debugging
- ✅ Integration with version control (GitHub, GitLab)
- ✅ Sophisticated alerting rules
- ✅ Release tracking and regression detection
- ✅ Performance monitoring
- ✅ Breadcrumbs for debugging context

---

### Error Tracking with PostHog

PostHog captures exceptions as `$exception` events integrated with your product analytics.

#### Benefits of PostHog

- ✅ Integrated with your product analytics
- ✅ See exceptions in context with user sessions
- ✅ Lightweight, no additional SDK needed
- ✅ Can correlate errors with feature usage
- ✅ Session recording shows what led to errors

#### PostHog Exception Properties

PostHog captures exceptions with the following properties:

- `$exception_message`: Error message
- `$exception_type`: Error type/name
- `$exception_stack_trace_raw`: Full stack trace
- `$exception_handled`: Whether the error was handled
- Any additional context you provide

#### PostHog Dashboard Setup

1. Go to your PostHog dashboard
2. Create a new dashboard for exceptions
3. Add insights filtering for `$exception` events
4. Group by `$exception_type` or `$exception_message`

---

### Capturing Exceptions

The analytics service provides a unified API for exception tracking:

```typescript
import { analytics } from '@/lib/analytics';

// Capture an exception
try {
  // Your code here
  await processPayment(order);
} catch (error) {
  analytics.captureException(error, {
    // Optional context
    userId: user.id,
    action: 'checkout',
    metadata: { cartTotal: 100 }
  });
  throw error; // Re-throw if needed
}

// Capture a string error
analytics.captureException('Something went wrong', {
  severity: 'warning'
});

// Check current provider
const provider = analytics.getExceptionTrackingProvider();
console.log(`Currently using: ${provider}`);
```

### Automatic Exception Tracking

When exception tracking is enabled, the following are automatically captured:

- ✅ Unhandled JavaScript errors (`window.onerror`)
- ✅ Unhandled promise rejections
- ✅ React error boundaries (when integrated)
- ✅ API route errors (when using error handlers)

---

### Using Both Services

When `EXCEPTION_TRACKING_PROVIDER=both`, exceptions are sent to both services. This is useful for:

- **Transitioning between services**: Gradually migrate from one to another
- **Product analytics correlation**: Use PostHog to see errors in user context
- **Detailed debugging**: Use Sentry for comprehensive error analysis
- **A/B testing**: Compare different error tracking approaches

---

### Best Practices

#### 1. Choose the Right Provider

- Use **PostHog** if you want simple, integrated exception tracking
- Use **Sentry** for comprehensive error monitoring and debugging
- Use **both** during migration or for complete coverage

#### 2. Add Context

Always include relevant context when capturing exceptions:

```typescript
analytics.captureException(error, {
  userId: user.id,
  featureFlags: getActiveFlags(),
  sessionId: session.id,
  route: router.pathname,
  metadata: {
    itemId: item.id,
    action: 'submit'
  }
});
```

#### 3. Handle Sensitive Data

- Both services support data scrubbing
- Configure PII removal in service dashboards
- Never log passwords, tokens, or credit card numbers

#### 4. Monitor Performance

- Exception tracking has minimal overhead
- PostHog: ~0.5KB bundle size
- Sentry: ~30KB (gzipped)
- Sample rates can be configured for high-traffic apps

#### 5. Set Up Alerts

Configure alerts for critical errors:

- **Sentry**: Use issue alerts and metric alerts
- **PostHog**: Create insights and set up webhooks
- Alert on error rate spikes, not individual errors

---

### Troubleshooting Exception Tracking

#### Exceptions Not Appearing

If exceptions aren't showing up in your dashboard:

1. **Check environment variables are set correctly**

   ```bash
   # Verify in your terminal
   echo $EXCEPTION_TRACKING_PROVIDER
   echo $NEXT_PUBLIC_SENTRY_DSN
   echo $NEXT_PUBLIC_POSTHOG_KEY
   ```

2. **Verify services are initialized**
   - Open browser console
   - Look for initialization messages
   - Check for any error messages

3. **Ensure you're not in development mode** (unless enabled)
   - Set `SENTRY_ENABLE_DEV=true` to test in development
   - PostHog works in development by default

4. **Check browser ad blockers**
   - Ad blockers may block analytics/tracking requests
   - Test with ad blocker disabled
   - Consider using a proxy for production

#### Provider Fallback

The system automatically falls back if a requested provider isn't available:

- If **Sentry** requested but not configured → falls back to **PostHog**
- If **PostHog** requested but not configured → falls back to **Sentry**
- If **neither** available → exception tracking disabled

Check the browser console for warnings about provider fallback.

---

### Migration Guide

#### From Sentry-only to PostHog

1. Set `EXCEPTION_TRACKING_PROVIDER=both`
2. Monitor both dashboards for a few days
3. Once comfortable, set `EXCEPTION_TRACKING_PROVIDER=posthog`
4. Optionally remove Sentry configuration

```bash
# Step 1: Enable both
EXCEPTION_TRACKING_PROVIDER=both

# Step 2: After testing, switch to PostHog only
EXCEPTION_TRACKING_PROVIDER=posthog
```

#### From PostHog-only to Sentry

1. Add Sentry configuration variables
2. Set `EXCEPTION_TRACKING_PROVIDER=both`
3. Verify Sentry is receiving events
4. Set `EXCEPTION_TRACKING_PROVIDER=sentry`

```bash
# Step 1: Add Sentry config
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project

# Step 2: Enable both
EXCEPTION_TRACKING_PROVIDER=both

# Step 3: After testing, switch to Sentry only
EXCEPTION_TRACKING_PROVIDER=sentry
```

---

### Performance Monitoring

#### Core Web Vitals

Monitor Core Web Vitals automatically:

```javascript
// pages/_app.js
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics service
  console.log(metric);
}

export function reportWebVitals(metric) {
  sendToAnalytics(metric);
}
```

#### Custom Performance Metrics

```javascript
// utils/performance.js
export function measurePerformance(name, fn) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  console.log(`${name} took ${end - start} milliseconds`);
  return result;
}
```

## Infrastructure Monitoring

### Health Checks

Create health check endpoints:

```javascript
// pages/api/health.js
export default function handler(req, res) {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  };

  try {
    // Add database connectivity check
    // Add external service checks
    res.status(200).json(healthCheck);
  } catch (error) {
    res.status(503).json({
      ...healthCheck,
      status: 'unhealthy',
      error: error.message,
    });
  }
}
```

### Uptime Monitoring

Use services like:

- **Pingdom** - Website uptime monitoring
- **UptimeRobot** - Free uptime monitoring
- **StatusCake** - Website monitoring

Example configuration:

- Monitor `/api/health` endpoint
- Check every 5 minutes
- Alert on failures

## Analytics

### Google Analytics 4

1. **Install GA4**

```bash
npm install gtag
```

2. **Configure GA4**

```javascript
// lib/gtag.js
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

export const pageview = (url) => {
  window.gtag('config', GA_TRACKING_ID, {
    page_path: url,
  });
};

export const event = ({ action, category, label, value }) => {
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};
```

3. **Track Page Views**

```javascript
// pages/_app.js
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import * as gtag from '../lib/gtag';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url) => {
      gtag.pageview(url);
    };
    
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return <Component {...pageProps} />;
}
```

### Alternative Analytics

#### Plausible Analytics

```javascript
// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        <script
          defer
          data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
          src="https://plausible.io/js/plausible.js"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

## Logging

### Structured Logging

```javascript
// lib/logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

export default logger;
```

### Usage Example

```javascript
// pages/api/example.js
import logger from '../../lib/logger';

export default function handler(req, res) {
  try {
    logger.info('API request received', { 
      method: req.method, 
      url: req.url 
    });
    
    // Your API logic here
    
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('API error', { 
      error: error.message, 
      stack: error.stack 
    });
    
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

## Alerting

### Email Alerts

```javascript
// lib/alerts.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendAlert(subject, message) {
  await transporter.sendMail({
    from: process.env.ALERT_FROM_EMAIL,
    to: process.env.ALERT_TO_EMAIL,
    subject: `[ALERT] ${subject}`,
    text: message,
  });
}
```

### Slack Notifications

```javascript
// lib/slack.js
export async function sendSlackAlert(message) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });
}
```

## Dashboard Setup

### Grafana Dashboard

Create monitoring dashboards with:

- Response time metrics
- Error rate tracking
- User activity metrics
- System resource usage

### Custom Admin Dashboard

```javascript
// pages/admin/monitoring.js
import { useState, useEffect } from 'react';

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    // Fetch metrics from your API
    fetch('/api/admin/metrics')
      .then(res => res.json())
      .then(setMetrics);
  }, []);

  return (
    <div>
      <h1>System Monitoring</h1>
      {metrics && (
        <div>
          <div>Uptime: {metrics.uptime}</div>
          <div>Active Users: {metrics.activeUsers}</div>
          <div>Error Rate: {metrics.errorRate}%</div>
        </div>
      )}
    </div>
  );
}
```

## Next Steps

- [Environment Variables](/docs/deployment/environment-variables) - Configure your deployment
- [Docker Deployment](/docs/deployment/docker) - Deploy with Docker
- [Support](/docs/advanced-guide/support) - Get help with monitoring
