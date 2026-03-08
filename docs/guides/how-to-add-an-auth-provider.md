---
id: how-to-add-an-auth-provider
title: "How to Add an Auth Provider"
sidebar_label: "Add an Auth Provider"
sidebar_position: 4
---

# How to Add an Auth Provider

This guide explains how to add a new OAuth or social login provider to the template. The authentication system uses **NextAuth.js** with a configurable provider pattern defined in `lib/auth/providers.ts`.

We will use **LinkedIn** as the example provider.

## Prerequisites

- OAuth application credentials (Client ID and Client Secret) from the provider
- Familiarity with NextAuth.js provider configuration
- Understanding of the `lib/auth/` directory structure
- Development server running (`pnpm dev`)

---

## Architecture Overview

The auth system is organized as follows:

```
lib/auth/
  providers.ts         # Provider configuration and factory
  credentials.ts       # Email/password credentials provider
  config.ts            # Auth configuration types
  index.ts             # Auth initialization (exports auth())
lib/config/
  config-service.ts    # Centralized config including authConfig
```

The `providers.ts` file defines:
1. `OAuthProviderConfig` -- per-provider configuration shape
2. `OAuthProvidersConfig` -- all provider configs together
3. `createNextAuthProviders()` -- factory function that builds NextAuth providers
4. `configureOAuthProviders()` -- integrates providers into the auth config

Currently supported providers: **Google**, **GitHub**, **Facebook**, **Twitter**, and **Credentials** (email/password).

---

## Step 1: Install the NextAuth Provider Package

Most OAuth providers are built into `next-auth`. Check if your provider needs an additional package:

```bash
# LinkedIn is built into next-auth, no extra package needed.
# For providers that need one:
pnpm add next-auth-provider-xyz
```

---

## Step 2: Update the Provider Types

Add the new provider to the type definitions in `lib/auth/providers.ts`:

```ts
// lib/auth/providers.ts

import LinkedInProvider from 'next-auth/providers/linkedin'; // Add import

/**
 * Supported OAuth provider types
 */
export type OAuthProviderType =
  | 'google'
  | 'github'
  | 'facebook'
  | 'twitter'
  | 'linkedin'        // Add new provider
  | 'credentials';

/**
 * OAuth providers configuration
 */
export interface OAuthProvidersConfig {
  google?: OAuthProviderConfig;
  github?: OAuthProviderConfig;
  facebook?: OAuthProviderConfig;
  twitter?: OAuthProviderConfig;
  linkedin?: OAuthProviderConfig;   // Add new provider
  credentials?: OAuthProviderConfig;
}
```

---

## Step 3: Add Default Configuration

Update `defaultOAuthProvidersConfig` to pull values from the config service:

```ts
// lib/auth/providers.ts (continued)

export const defaultOAuthProvidersConfig: OAuthProvidersConfig = {
  google: {
    enabled: authConfig.google.enabled,
    clientId: authConfig.google.clientId,
    clientSecret: authConfig.google.clientSecret,
  },
  github: {
    enabled: authConfig.github.enabled,
    clientId: authConfig.github.clientId,
    clientSecret: authConfig.github.clientSecret,
  },
  facebook: {
    enabled: authConfig.facebook.enabled,
    clientId: authConfig.facebook.clientId,
    clientSecret: authConfig.facebook.clientSecret,
  },
  twitter: {
    enabled: authConfig.twitter.enabled,
    clientId: authConfig.twitter.clientId,
    clientSecret: authConfig.twitter.clientSecret,
  },
  // Add LinkedIn configuration
  linkedin: {
    enabled: !!process.env.LINKEDIN_CLIENT_ID,
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  },
};
```

---

## Step 4: Register the Provider in the Factory

Add the provider creation logic to `createNextAuthProviders()`:

```ts
// lib/auth/providers.ts (continued)

export function createNextAuthProviders(
  config: OAuthProvidersConfig = defaultOAuthProvidersConfig,
) {
  const providers = [];

  // ... existing providers (Google, GitHub, Facebook, Twitter) ...

  // LinkedIn
  if (
    config.linkedin?.enabled &&
    config.linkedin.clientId &&
    config.linkedin.clientSecret
  ) {
    providers.push(
      LinkedInProvider({
        clientId: config.linkedin.clientId,
        clientSecret: config.linkedin.clientSecret,
        ...config.linkedin.options,
      }),
    );
  }

  // Credentials
  if (config.credentials?.enabled) {
    providers.push(credentialsProvider);
  }

  return providers;
}
```

---

## Step 5: Add Environment Variables

Add the provider credentials to your `.env.local`:

```bash
# .env.local

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
```

Update `.env.example` to document the new variables:

```bash
# .env.example

# LinkedIn OAuth (optional)
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
```

---

## Step 6: Configure the OAuth Application

Every OAuth provider requires you to configure an application on their developer portal. For LinkedIn:

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Create a new application
3. Under **Auth** settings, add the authorized redirect URI:
   ```
   http://localhost:3000/api/auth/callback/linkedin
   ```
4. For production, add:
   ```
   https://yourdomain.com/api/auth/callback/linkedin
   ```
5. Copy the Client ID and Client Secret to your environment variables

The callback URL format is always:
```
{APP_URL}/api/auth/callback/{provider-id}
```

---

## Step 7: Update the Auth Config Schema (Optional)

If the project uses a centralized config schema, add validation for the new provider:

```ts
// lib/config/schemas/auth.schema.ts (extend existing)

linkedin: z.object({
  enabled: z.boolean().default(false),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
}).default({}),
```

---

## Step 8: Add the UI Login Button

The login page typically displays buttons for each enabled provider. Update the login component:

```tsx
// components/auth/social-login-buttons.tsx

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

const providers = [
  { id: 'google', name: 'Google', icon: GoogleIcon },
  { id: 'github', name: 'GitHub', icon: GitHubIcon },
  { id: 'facebook', name: 'Facebook', icon: FacebookIcon },
  { id: 'twitter', name: 'Twitter', icon: TwitterIcon },
  { id: 'linkedin', name: 'LinkedIn', icon: LinkedInIcon }, // Add LinkedIn
];

export function SocialLoginButtons() {
  return (
    <div className="space-y-2">
      {providers.map((provider) => (
        <Button
          key={provider.id}
          variant="outline"
          className="w-full"
          onClick={() => signIn(provider.id)}
        >
          <provider.icon className="mr-2 h-4 w-4" />
          Sign in with {provider.name}
        </Button>
      ))}
    </div>
  );
}
```

---

## Step 9: Handle User Creation on First Login

NextAuth callbacks handle user creation automatically via the adapter. If you need custom logic on first sign-in (such as creating a client profile), check the existing callback configuration:

```ts
// lib/auth/index.ts or auth configuration file

callbacks: {
  async signIn({ user, account, profile }) {
    // Custom logic for new users
    if (account?.provider === 'linkedin') {
      // LinkedIn-specific profile mapping
      // e.g., extract company info from LinkedIn profile
    }
    return true;
  },

  async jwt({ token, user, account }) {
    if (user) {
      token.id = user.id;
      token.provider = account?.provider;
    }
    return token;
  },

  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.id as string;
    }
    return session;
  },
},
```

---

## Step 10: Add Translation Keys

Add sign-in button text for all supported locales:

```json
// messages/en.json
{
  "common": {
    "SIGN_IN_WITH": "Sign in with"
  }
}
```

The button text follows the pattern: `{SIGN_IN_WITH} {ProviderName}`.

---

## Provider-Specific Scopes

Some providers require additional OAuth scopes. Pass them via the `options` field:

```ts
linkedin: {
  enabled: true,
  clientId: process.env.LINKEDIN_CLIENT_ID,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  options: {
    authorization: {
      params: {
        scope: 'openid profile email',
      },
    },
  },
},
```

---

## File Structure Summary

```
lib/auth/
  providers.ts                   # Modified -- added LinkedIn provider
lib/config/
  schemas/
    auth.schema.ts               # Modified -- added LinkedIn schema (optional)
components/auth/
  social-login-buttons.tsx       # Modified -- added LinkedIn button
messages/
  en.json                        # Unchanged or updated for new strings
.env.local                       # Modified -- added LinkedIn credentials
.env.example                     # Modified -- documented LinkedIn variables
```

---

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| "No provider found" error | Verify the provider is enabled and both `clientId` and `clientSecret` are set. |
| Redirect URI mismatch | Ensure the callback URL in the OAuth application matches `{APP_URL}/api/auth/callback/{provider-id}` exactly. |
| User not created in database | Check the NextAuth adapter is configured and the database is accessible. |
| Profile data missing after login | Some providers require specific scopes. Check provider documentation for required scopes. |
| Provider not showing on login page | Verify the environment variables are set and the component checks for enabled providers. |
| "OAuthCallbackError" in development | Ensure `AUTH_SECRET` is set and `NEXTAUTH_URL=http://localhost:3000` is in `.env.local`. |

---

## Checklist

- [ ] Provider import added to `lib/auth/providers.ts`
- [ ] `OAuthProviderType` union updated
- [ ] `OAuthProvidersConfig` interface updated
- [ ] Default configuration added with environment variable references
- [ ] Provider registered in `createNextAuthProviders()` factory function
- [ ] Environment variables added to `.env.local` and `.env.example`
- [ ] OAuth application created on the provider's developer portal
- [ ] Redirect/callback URI configured correctly
- [ ] Login button added to the UI
- [ ] Translation keys added for the provider name
- [ ] Tested sign-in flow end-to-end (sign in, callback, session, sign out)
- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm lint` passes

---

## Related Guides

- [How to Add a New Feature](./how-to-add-a-new-feature.md)
- [How to Add an API Endpoint](./how-to-add-an-api-endpoint.md)
- [How to Add Translations](./how-to-add-translations.md)
