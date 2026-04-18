---
id: third-party-analytics
title: "Third-Party Analytics Integration"
sidebar_label: "Third-Party Analytics"
sidebar_position: 7
---

# Third-Party Analytics Integration

To provide maximum flexibility and respect for privacy, the template includes a built-in architecture supporting multiple third-party analytics platforms: **Google Analytics**, **Plausible**, **DataFast**, **Jitsu**, and **Segment**.

These platforms are managed through centralized environment variables and a dynamic React component (`<ThirdPartyAnalytics />`).

## Supported Platforms & Environment Setup

All integrations are disabled by default within `analytics.schema.ts`. To enable a platform, you must configure its respective environment variables in `apps/web/.env.local` and ensure its `enabled` property is set to `true` in your configuration load schema.

### 1. Plausible Analytics (Privacy-first)

Plausible is a lightweight and open-source web analytics tool. No cookies and fully compliant with GDPR, CCPA, and PECR.

**Environment Variables:**
```env
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=demo.ever.works
NEXT_PUBLIC_PLAUSIBLE_SCRIPT_ID=pa-custom-script-id  # Optional, for advanced tracking features
```

### 2. DataFast Analytics

DataFast (based on Umami API architecture) provides clean, cookie-less tracking.

**Environment Variables:**
```env
NEXT_PUBLIC_DATAFAST_WEBSITE_ID=dfid_your_website_id
NEXT_PUBLIC_DATAFAST_DOMAIN=demo.ever.works
```

### 3. Segment (Centralized CDP)

Segment is a Customer Data Platform (CDP) that gathers all your analytics data and routes it to any other marketing or analytics tool securely.

**Environment Variables:**
```env
NEXT_PUBLIC_SEGMENT_WRITE_KEY=your_segment_write_key
```

### 4. Google Analytics (GA4)

**Environment Variables:**
```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 5. Jitsu

Jitsu is a highly flexible, open-source data collection platform.

**Environment Variables:**
```env
NEXT_PUBLIC_JITSU_KEY=your_jitsu_key
NEXT_PUBLIC_JITSU_HOST=https://t.jitsu.com
```

---

## Tracking Custom Events in React

For standard platforms like Plausible, tracking custom events (e.g., clicking a 'Sign Up' button, form submissions) requires invoking a tracking method dynamically. 

The template offers a unified custom hook `usePlausible` located in `apps/web/app/[locale]/integration/analytics/use-plausible.ts`.

### Example Use Case

```tsx
'use client'; // Required for click tracking in Next.js

import { usePlausible } from '@/app/[locale]/integration/analytics/use-plausible';

export function CheckoutButton() {
  const { trackEvent } = usePlausible();

  const handleCheckout = () => {
    // Standard logic...
    
    // Trigger Plausible Custom Event ('Checkout_Action' MUST be declared in Plausible Dashboard Goals)
    trackEvent('Checkout_Action', { props: { plan: 'Premium_Plan' } });
  };

  return (
    <button onClick={handleCheckout} className="btn-primary">
      Complete Purchase
    </button>
  );
}
```

---

## Localhost Testing Guide ⚠️

Privacy-first platforms (like Plausible and DataFast) **automatically ignore traffic originating from `localhost`** to prevent developers from polluting production data. 

If you want to verify that tracking works in your local environment, you have several options:

### 1. Using `/etc/hosts` (The Professional Method)
Fool your local machine into thinking it's on the production domain.
1. Open your terminal: `sudo nano /etc/hosts`
2. Add your production domain: `127.0.0.1 demo.ever.works`
3. Serve your local app: `pnpm dev:web`
4. Visit `http://demo.ever.works:3000` in your browser. The platform will accept the data!

### 2. Using "Local" Scripts (Plausible Only)
Plausible offers a `script.local.js` variant specifically designed to allow localhost testing. This only works if you disable your advanced custom scripts.
1. Clear the `SCRIPT_ID` environment variable: `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_ID=`
2. Use `script.local.js` dynamically when `process.env.NODE_ENV === 'development'`.

### 3. Disable Ad-Blockers
No matter the testing method, modern Ad-blockers (uBlock Origin, Brave Browser) will completely block the network request to analytics servers. **Always test analytics on a profile with no extensions or Ad-blockers active.**
