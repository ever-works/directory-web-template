---
title: "הגדרת סביבה"
sidebar_label: "הגדרת סביבה"
sidebar_position: 3
---

# הגדרת סביבה

## משתני סביבה נדרשים

```env
NODE_ENV=development
AUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
COOKIE_SECRET=your-cookie-secret
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
GH_TOKEN=your-github-token
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
```

## משתני סביבה אופציונליים

### ספקי OAuth

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
```

### שירותי תשלום

```env
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
LEMONSQUEEZY_API_KEY=
POLAR_API_KEY=
```

### שירותי דואר אלקטרוני

```env
EMAIL_SERVER=
EMAIL_FROM=
```

### אנליטיקס

```env
NEXT_PUBLIC_ANALYTICS_ID=
SENTRY_DSN=
```
