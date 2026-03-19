---
id: recaptcha-endpoints
title: "ReCAPTCHA API Reference"
sidebar_label: "ReCAPTCHA"
sidebar_position: 57
---

# ReCAPTCHA API Reference

## Overview

The ReCAPTCHA endpoint provides server-side verification of Google ReCAPTCHA v3 tokens. It acts as a secure proxy between the client and Google's verification API, keeping the secret key server-side. In development mode, verification can be bypassed when the secret key is not configured.

## Endpoints

### POST /api/verify-recaptcha

Verifies a Google ReCAPTCHA v3 token by communicating with Google's `siteverify` API endpoint. Returns the verification result including the bot/human score.

**Request**
```typescript
{
  token: string;   // ReCAPTCHA token from client-side grecaptcha.execute()
}
```

**Response**
```typescript
{
  success: boolean;           // Whether verification passed
  score?: number;             // 0.0 (bot) to 1.0 (human)
  action?: string;            // Action name from the ReCAPTCHA challenge
  hostname?: string;          // Hostname where verification occurred
  challenge_ts?: string;      // ISO 8601 timestamp of the challenge
  error_codes?: string[];     // Error codes from Google's API (if any)
}
```

**Example**
```typescript
// Client-side: get token
const token = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'submit' });

// Server verification
const response = await fetch('/api/verify-recaptcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
});

const result = await response.json();

if (result.success && result.score > 0.5) {
  // Proceed with form submission
} else {
  // Block suspected bot activity
}
```

### Development Mode Behavior

When `RECAPTCHA_SECRET_KEY` is not configured and `NODE_ENV` is `"development"`, the endpoint bypasses Google verification and returns:

```typescript
{
  success: true,
  score: 1.0,
  action: "bypass"
}
```

A warning is logged to the console indicating that verification is being bypassed.

## Authentication

This endpoint is **public** -- no authentication is required. It is designed to be called from client-side form submission flows before or during form processing.

## Error Responses

| Status | Description |
|--------|-------------|
| 400 | Missing or empty `token` in request body |
| 500 | `RECAPTCHA_SECRET_KEY` not configured (production only), Google API request failed, or unexpected runtime error |

## Rate Limiting

No application-level rate limiting is applied. Google's ReCAPTCHA API has its own rate limits. The endpoint uses `application/x-www-form-urlencoded` format when communicating with Google's API.

## Related Endpoints

This is a standalone security endpoint. It is typically invoked prior to form submissions or sensitive actions throughout the application.
