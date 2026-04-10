---
id: recaptcha
title: Intégration reCAPTCHA
sidebar_label: reCAPTCHA
sidebar_position: 24
---

# Intégration reCAPTCHA

The template integrates Google reCAPTCHA v3 for bot protection on authentication and form submission flows. It includes a server-side verification endpoint, client-side hooks for token management, and a development mode that bypasses verification when credentials are not configured.

## Architecture Overview

```
app/api/verify-recaptcha/
  route.ts                          -- Server-side token verification endpoint

app/[locale]/auth/hooks/
  useRecaptchaVerification.ts       -- React Query mutation for verification
  useAutoRecaptchaVerification.ts   -- Auto-trigger on mount or condition

lib/api/
  server-api-client.ts              -- externalClient used for Google API calls

lib/config/
  config-service.ts                 -- analyticsConfig.recaptcha.secretKey
```

## Server-Side Verification Endpoint

The `POST /api/verify-recaptcha` route at `app/api/verify-recaptcha/route.ts` handles token verification against the Google reCAPTCHA API:

```tsx
// app/api/verify-recaptcha/route.ts
import { NextRequest, NextResponse } from "next/server";
import { externalClient, apiUtils } from "@/lib/api/server-api-client";
import { coreConfig, analyticsConfig } from "@/lib/config/config-service";

interface RecaptchaApiResponse {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  'error-codes'?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "ReCAPTCHA token is required" },
        { status: 400 }
      );
    }

    const secretKey = analyticsConfig.recaptcha.secretKey;
    if (!secretKey) {
      if (coreConfig.NODE_ENV === "development") {
        console.warn(
          "[ReCAPTCHA] WARNING: Secret key not configured -- bypassing verification in development mode."
        );
        return NextResponse.json({ success: true, score: 1.0, action: "bypass" });
      }
      return NextResponse.json(
        { success: false, error: "ReCAPTCHA not configured" },
        { status: 500 }
      );
    }

    const response = await externalClient.postForm<RecaptchaApiResponse>(
      "https://www.google.com/recaptcha/api/siteverify",
      { secret: secretKey, response: token }
    );

    if (!apiUtils.isSuccess(response)) {
      console.error("ReCAPTCHA API request failed:", apiUtils.getErrorMessage(response));
      return NextResponse.json(
        { success: false, error: "Failed to verify ReCAPTCHA" },
        { status: 500 }
      );
    }

    const data = response.data;

    return NextResponse.json({
      success: data.success,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
      challenge_ts: data.challenge_ts,
      error_codes: data['error-codes'],
    });
  } catch (error) {
    console.error("ReCAPTCHA verification error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
```

### Key Implementation Details

- **Token validation**: Returns 400 if no token is provided in the request body.
- **Development bypass**: When the secret key is not configured and `NODE_ENV` is `development`, the endpoint returns a successful response with `score: 1.0` and `action: "bypass"` without contacting Google.
- **External client**: Uses the pre-configured `externalClient` from `lib/api/server-api-client.ts` with its `postForm` method, which sends `application/x-www-form-urlencoded` data to Google's verification API.
- **API utilities**: Uses `apiUtils.isSuccess()` and `apiUtils.getErrorMessage()` for consistent response handling.
- **Full response forwarding**: Returns the complete verification result including score, action, hostname, challenge timestamp, and error codes.

### Development Mode Bypass

When `RECAPTCHA_SECRET_KEY` is not set and the application runs in development mode, the endpoint automatically bypasses verification:

```tsx
if (!secretKey) {
  if (coreConfig.NODE_ENV === "development") {
    return NextResponse.json({ success: true, score: 1.0, action: "bypass" });
  }
  return NextResponse.json(
    { success: false, error: "ReCAPTCHA not configured" },
    { status: 500 }
  );
}
```

In production, a missing secret key returns a 500 error instead of silently bypassing.

## Client-Side Verification Hook

The `useRecaptchaVerification` hook at `app/[locale]/auth/hooks/useRecaptchaVerification.ts` wraps the verification call in a React Query mutation:

```tsx
// app/[locale]/auth/hooks/useRecaptchaVerification.ts
import { useMutation } from '@tanstack/react-query';

function useRecaptchaVerification() {
  const mutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch('/api/verify-recaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('reCAPTCHA verification failed');
      }

      return response.json();
    },
  });

  return {
    verifyRecaptcha: mutation.mutateAsync,
    isVerifying: mutation.isPending,
    isVerified: mutation.isSuccess,
    error: mutation.error,
    reset: mutation.reset,
  };
}
```

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `verifyRecaptcha` | `(token: string) => Promise` | Mutation function to verify a token |
| `isVerifying` | `boolean` | Whether verification is in progress |
| `isVerified` | `boolean` | Whether verification succeeded |
| `error` | `Error or null` | Error from the last verification attempt |
| `reset` | `() => void` | Reset verification state |

## Auto-Verification Hook

The `useAutoRecaptchaVerification` hook triggers reCAPTCHA verification automatically when a component mounts or when a condition becomes true:

```tsx
function useAutoRecaptchaVerification(options?: {
  action?: string;       // reCAPTCHA action name (default: 'submit')
  enabled?: boolean;     // Whether to auto-verify (default: true)
}): {
  isVerified: boolean;
  isVerifying: boolean;
  error: Error | null;
  token: string | null;
}
```

### Usage Example

```tsx
function ProtectedForm() {
  const { isVerified, isVerifying } = useAutoRecaptchaVerification({
    action: 'login',
    enabled: true,
  });

  return (
    <form>
      {/* Form fields */}
      <button disabled={!isVerified || isVerifying}>
        {isVerifying ? 'Verifying...' : 'Submit'}
      </button>
    </form>
  );
}
```

## Google API Integration

The endpoint communicates with Google's reCAPTCHA API using the `externalClient.postForm` method from `lib/api/server-api-client.ts`. This method sends URL-encoded form data:

```tsx
const response = await externalClient.postForm<RecaptchaApiResponse>(
  "https://www.google.com/recaptcha/api/siteverify",
  { secret: secretKey, response: token }
);
```

The `externalClient` is a pre-configured `ServerClient` instance designed for external API calls. The `postForm` method handles the `application/x-www-form-urlencoded` content type automatically.

### Score Interpretation

reCAPTCHA v3 returns a score between 0.0 and 1.0:

| Score Range | Interpretation | Typical Action |
|-------------|---------------|----------------|
| 0.7 - 1.0 | Likely human | Allow submission |
| 0.3 - 0.7 | Uncertain | May require additional verification |
| 0.0 - 0.3 | Likely bot | Block submission |

## Integration with Authentication

The `CredentialsForm` component uses reCAPTCHA verification before submitting credentials:

```tsx
function CredentialsForm({ type, onSuccess }) {
  const { verifyRecaptcha, isVerifying } = useRecaptchaVerification();

  const handleSubmit = async (formData: FormData) => {
    const token = await grecaptcha.execute(siteKey, { action: type });
    const result = await verifyRecaptcha(token);

    if (!result.verified) {
      toast.error('Verification failed. Please try again.');
      return;
    }

    await signIn(formData);
  };
}
```

## Environment Variables

```bash
# Client-side site key (public, exposed to browser)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Le...

# Server-side secret key (private, never exposed to client)
RECAPTCHA_SECRET_KEY=6Le...
```

The secret key is accessed through `analyticsConfig.recaptcha.secretKey` from the centralized configuration service, not directly from `process.env`.

## Swagger Documentation

The verification endpoint includes comprehensive Swagger/JSDoc annotations that document all request and response schemas, status codes, and examples. This is served through the template's built-in API documentation system.

## Conditional Activation

| Condition | Behavior |
|-----------|----------|
| Secret key set | Full verification against Google API |
| Secret key missing, development mode | Automatic bypass with `success: true` |
| Secret key missing, production mode | Returns 500 error |
| Site key not set on client | Script not loaded, forms submit without verification |

## Error Handling

The endpoint handles three categories of errors:

1. **Client errors (400)**: Missing or invalid token in the request body
2. **Configuration errors (500)**: Missing secret key in production
3. **Upstream errors (500)**: Google API request failures or unexpected exceptions

All errors are logged to the server console and return a consistent JSON structure with `success: false` and an `error` message.

## File Reference

| File | Purpose |
|------|---------|
| `app/api/verify-recaptcha/route.ts` | Server-side verification endpoint |
| `app/[locale]/auth/hooks/useRecaptchaVerification.ts` | React Query verification mutation |
| `app/[locale]/auth/hooks/useAutoRecaptchaVerification.ts` | Auto-trigger verification hook |
| `lib/api/server-api-client.ts` | `externalClient` and `postForm` method |
| `lib/config/config-service.ts` | `analyticsConfig.recaptcha.secretKey` |