---
id: auth-components
title: "Authentication Components"
sidebar_label: "Auth Components"
sidebar_position: 11
---

# Authentication Components

The authentication UI is split across two directories: shared layout components in `components/auth/` and form implementations in `app/[locale]/auth/components/`. The system supports credentials-based login and signup, multiple social OAuth providers, ReCAPTCHA verification, auto-login flows, and both modal and full-page variants.

## Component Architecture

| Component | File | Purpose |
|-----------|------|---------|
| `LoginContent` | `components/auth/login-content.tsx` | Shared login/signup layout for modal and page contexts |
| `AuthForm` | `app/[locale]/auth/components/auth-form.tsx` | Full-page auth with illustrations and animations |
| `CredentialsForm` | `app/[locale]/auth/components/credentials-form.tsx` | Email/password form with ReCAPTCHA and auto-login |
| `SocialLogin` | `app/[locale]/auth/components/social-login.tsx` | OAuth provider buttons |

## LoginContent

The `LoginContent` component at `components/auth/login-content.tsx` provides a two-column layout used in both modal dialogs and standalone pages.

### Props

```ts
interface LoginContentProps {
  variant?: 'modal' | 'page';
  message?: string;
  type?: 'login' | 'signup';
  onSuccess?: () => void;
  callbackUrl?: string;
}
```

### Layout

The left column displays the site logo, a heading, and a feature list from `authFeatures`. The right column contains the credentials form with social login below it:

```tsx
<LoginContent variant="modal" type="login" onSuccess={handleClose}>
  {/* Renders two-column layout with CredentialsForm + SocialLogin */}
</LoginContent>
```

Feature items are styled with color variants (`primary`, `accent`, `secondary`) that map to theme tokens:

```tsx
{authFeatures.map((feature) => {
  const bgClasses = colorVariant === 'primary'
    ? 'bg-linear-to-br from-primary-50 to-primary-100/50 ...'
    : colorVariant === 'accent'
      ? 'bg-linear-to-br from-accent-50 to-accent-100/50 ...'
      : 'bg-linear-to-br from-secondary-50 to-secondary-100/50 ...';

  return (
    <div key={feature.titleKey} className="flex items-start group">
      <div className={cn('p-2 rounded-lg mr-3', bgClasses)}>
        <feature.icon className={cn('h-4 w-4', iconClasses)} />
      </div>
      <div>
        <h3>{t(feature.titleKey)}</h3>
        <p>{t(feature.descriptionKey)}</p>
      </div>
    </div>
  );
})}
```

## AuthForm

The `AuthForm` at `app/[locale]/auth/components/auth-form.tsx` provides the full-page authentication experience with animated illustrations and trust badges.

### Props

```ts
interface AuthFormProps {
  form: 'login' | 'signup';
  showSocialLogin?: boolean;
  onSuccess?: () => void;
  clientMode?: boolean;
}
```

### Features

- Animated background patterns via `AnimatedBackground` and `GeometricDecoration`
- Context-sensitive illustrations: `LoginIllustration` for login, `SignupIllustration` for signup
- Staggered feature list animations via `StaggerContainer`
- Admin-specific messaging when `showSocialLogin` is `false`
- `TrustBadge` component for security indicators

The admin variant shows dedicated features:

```tsx
{showSocialLogin === false ? (
  <>
    <h2>{tAuth('ADMIN_WELCOME_TITLE')}</h2>
    <div className="flex items-center">
      <User className="h-5 w-5 text-theme-primary" />
      <span>{tAuth('USER_MANAGEMENT')}</span>
    </div>
    <div className="flex items-center">
      <Building className="h-5 w-5 text-theme-accent" />
      <span>{tAuth('CONTENT_MODERATION')}</span>
    </div>
    <div className="flex items-center">
      <Globe className="h-5 w-5 text-theme-secondary" />
      <span>{tAuth('ANALYTICS_DASHBOARD')}</span>
    </div>
  </>
) : (
  /* Standard auth features from authFeatures config */
)}
```

## CredentialsForm

The `CredentialsForm` at `app/[locale]/auth/components/credentials-form.tsx` handles email/password authentication with extensive client-side logic.

### Props

```ts
interface CredentialsFormProps {
  type: 'login' | 'signup';
  children?: React.ReactNode;
  hideSwitchButton?: boolean;
  onSuccess?: () => void;
  clientMode?: boolean;
  callbackUrl?: string;
}
```

### Server Actions

The form uses React 19 `useActionState` to call server actions:

```tsx
const [state, formAction, pending] = useActionState<ActionState, FormData>(
  isLogin ? signInAction : signUp,
  {}
);
```

### ReCAPTCHA Integration

When a ReCAPTCHA site key is configured, the form requires verification before submission:

```tsx
const isRecaptchaRequired = !!(
  RECAPTCHA_SITE_KEY.value ||
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
);
const isRecaptchaBlocking = isRecaptchaRequired && !captchaToken;
```

The `useAutoRecaptchaVerification` hook handles token verification against the server.

### Auto-Login Flow

After successful registration or login via server action, the form performs client-side sign-in to ensure cookies are properly set (important for Vercel deployments):

```tsx
useEffect(() => {
  if (!state.success) return;

  const autoLoginEmail = state.email || state.credentials?.email;
  const autoLoginPassword = pendingPassword || state.credentials?.password;

  if (state.autoLogin && autoLoginEmail && autoLoginPassword) {
    const doAutoLogin = async () => {
      const { signIn } = await import('next-auth/react');
      const res = await signIn('credentials', {
        email: autoLoginEmail,
        password: autoLoginPassword,
        redirect: false,
      });

      await refreshSession();
      invalidateAllUserData();

      const redirectPath = redirect || callbackUrlProp || state.redirect
        || '/client/dashboard';
      window.location.href = redirectPath;
    };
    void doAutoLogin();
  }
}, [state.success, ...]);
```

### Error Translation

Authentication errors use translated error codes:

```tsx
const getTranslatedErrorMessage = (errorCode: string | undefined): string => {
  switch (errorCode) {
    case AuthErrorCode.ACCOUNT_NOT_FOUND:
      return tCred('ACCOUNT_NOT_FOUND');
    case AuthErrorCode.INVALID_PASSWORD:
      return tCred('INVALID_PASSWORD');
    case AuthErrorCode.RATE_LIMITED:
      return tCred('RATE_LIMITED');
    case AuthErrorCode.USE_OAUTH_PROVIDER:
      return tCred('USE_OAUTH_PROVIDER');
    default:
      return tCred('GENERIC_ERROR_MESSAGE');
  }
};
```

### Callback URL Validation

Redirect URLs are validated to prevent open redirect attacks:

```tsx
const rawRedirect = searchParams.get('redirect') || searchParams.get('callbackUrl');
const redirect = isValidCallbackUrl(rawRedirect) ? rawRedirect : null;
```

Locale-aware redirects avoid double-prefixing:

```tsx
const shouldPrefixLocale =
  state.preserveLocale && locale !== 'en' && !redirectPath.startsWith(`/${locale}`);
const finalRedirectPath = shouldPrefixLocale
  ? `/${locale}${redirectPath}`
  : redirectPath;
```

## SocialLogin

The `SocialLogin` component at `app/[locale]/auth/components/social-login.tsx` renders OAuth provider buttons based on the application configuration.

### Supported Providers

Five providers are available, each conditionally enabled through the CMS configuration:

```tsx
const socialProviders: SocialProvider[] = [
  { icon: <IconGithub />, provider: 'github', isEnabled: !!auth.github },
  { icon: <IconGoogle />, provider: 'google', isEnabled: !!auth.google },
  { icon: <IconFacebook />, provider: 'facebook', isEnabled: !!auth.fb },
  { icon: <IconX />, provider: 'x', isEnabled: !!auth.x },
  { icon: <IconMicrosoft />, provider: 'microsoft', isEnabled: !!auth.microsoft },
].filter((provider) => provider.isEnabled);
```

If no providers are enabled, the component returns `null`.

### Dual Auth Provider Support

The component supports both `next-auth` and `supabase` as the underlying auth provider:

```tsx
const handleSocialAuth = async (provider, formData) => {
  if (authProvider === 'next-auth') {
    await signIn(provider.provider, {
      callbackUrl: redirectUrl,
      redirect: true,
    });
  } else {
    // Supabase flow via server action
    safeFormData.append('authProvider', config.authConfig?.provider || 'supabase');
    return formAction(safeFormData);
  }
};
```

### Provider Styling

Each provider has unique gradient and border styling:

```tsx
const getProviderStyles = () => {
  switch (provider.provider) {
    case 'google':
      return {
        gradient: 'from-red-500/10 to-orange-500/10',
        border: 'border-red-200/50 dark:border-red-800/50',
      };
    case 'github':
      return {
        gradient: 'from-gray-500/10 to-slate-500/10',
        border: 'border-gray-200/50 dark:border-gray-700/50',
      };
    // ... facebook, microsoft, x
  }
};
```

### Accessibility

Each button includes an `aria-label` with the provider name:

```tsx
<Button
  aria-label={`Continue with ${provider.provider === 'github' ? 'GitHub' : ...}`}
  className="w-9 h-9 rounded-md border ..."
>
  <span className="text-base">{provider.icon}</span>
</Button>
```

## Internationalization

All auth components use `next-intl` with multiple translation namespaces:

- `auth` -- general auth strings
- `common` -- shared labels like "OR_CONTINUE_WITH" and "SECURE_CONNECTION"
- `admin.CREDENTIALS_FORM` -- error messages and form labels
- `admin.AUTH_FORM` -- full-page auth section titles

## Related Files

| File | Description |
|------|-------------|
| `components/auth/login-content.tsx` | Shared login/signup layout |
| `components/auth/login-modal.tsx` | Modal wrapper for LoginContent |
| `components/auth/login-modal-provider.tsx` | Modal context provider |
| `app/[locale]/auth/components/auth-form.tsx` | Full-page auth layout |
| `app/[locale]/auth/components/credentials-form.tsx` | Email/password form |
| `app/[locale]/auth/components/social-login.tsx` | OAuth provider buttons |
| `app/[locale]/auth/actions.ts` | Server actions for auth |
| `lib/auth/auth-error-codes.ts` | Error code constants |
| `lib/auth/validate-callback-url.ts` | Redirect URL validation |
| `lib/config/auth-features.ts` | Auth feature list configuration |
| `components/ui/auth-illustrations.tsx` | SVG illustrations and decorations |
