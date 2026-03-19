---
id: email-validation
title: Email Validation
sidebar_label: Email Validation
sidebar_position: 27
---

# Email Validation

This page documents the email validation utilities in `lib/utils/email-validation.ts`. The template provides two complementary validation approaches designed to prevent ReDoS (Regular Expression Denial of Service) attacks while thoroughly validating email addresses.

## Overview

Email validation is a common attack vector for ReDoS because naive regex patterns can exhibit catastrophic backtracking on malformed input. The template addresses this with:

1. **`isValidEmail`** -- A step-by-step structural validation function (recommended)
2. **`isValidEmailRegex`** -- A single secure regex alternative

Both functions are exported and can be used interchangeably depending on your needs.

## Structural Validation: `isValidEmail`

The primary validation function uses sequential checks instead of a single complex regex:

```ts
export function isValidEmail(email: string): boolean {
  // Check basic format first (fast fail)
  if (
    typeof email !== "string" ||
    email.length < 5 ||
    email.length > 254
  ) {
    return false;
  }

  // Check for @ symbol
  const atIndex = email.indexOf("@");
  if (
    atIndex === -1 ||
    atIndex === 0 ||
    atIndex === email.length - 1
  ) {
    return false;
  }

  // Split into local and domain parts
  const localPart = email.substring(0, atIndex);
  const domainPart = email.substring(atIndex + 1);

  // Validate local part length (before @)
  if (localPart.length === 0 || localPart.length > 64) {
    return false;
  }

  // Validate domain part length (after @)
  if (domainPart.length === 0 || domainPart.length > 253) {
    return false;
  }

  // Check valid characters in local part
  const localPartRegex =
    /^[a-zA-Z0-9.!#$%&'*+\-/=?^_`{|}~]+$/;
  if (!localPartRegex.test(localPart)) {
    return false;
  }

  // Check valid characters in domain part
  const domainPartRegex = /^[a-zA-Z0-9.-]+$/;
  if (!domainPartRegex.test(domainPart)) {
    return false;
  }

  // Validate domain structure
  const domainParts = domainPart.split(".");
  if (domainParts.length < 2) {
    return false;
  }

  // Validate each domain label
  for (const part of domainParts) {
    if (part.length === 0 || part.length > 63) {
      return false;
    }
    if (
      part.length === 1
        ? !/^[a-zA-Z0-9]$/.test(part)
        : !/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(
            part
          )
    ) {
      return false;
    }
  }

  return true;
}
```

### Validation Steps

The function performs checks in this order, with fast failures first:

| Step | Check | Limit |
|------|-------|-------|
| 1 | Type and total length | 5-254 characters |
| 2 | Presence and position of `@` | Must not be first or last character |
| 3 | Local part length | 1-64 characters |
| 4 | Domain part length | 1-253 characters |
| 5 | Local part characters | Alphanumeric plus `!#$%&'*+-/=?^_` and backtick, pipe, tilde |
| 6 | Domain part characters | Alphanumeric, dots, hyphens |
| 7 | Domain structure | At least two labels separated by dots |
| 8 | Domain label rules | 1-63 chars, must start and end with alphanumeric |

### Why Structural Validation

The step-by-step approach has several advantages over a single regex:

- **No backtracking risk:** Each check is independent and linear
- **Fast failure:** Invalid emails are rejected at the earliest possible step
- **Readable:** Each validation rule is clearly separated and documented
- **Debuggable:** You can easily identify which rule rejected an email

## Regex Validation: `isValidEmailRegex`

For cases where a single-line check is preferred, the template provides a secure regex alternative:

```ts
export function isValidEmailRegex(email: string): boolean {
  const secureEmailRegex =
    /^[a-zA-Z0-9.!#$%&'*+\-/=?^_`{|}~]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  return secureEmailRegex.test(email);
}
```

This regex avoids catastrophic backtracking by:

- Using non-capturing groups `(?:...)` instead of capturing groups
- Limiting quantifier ranges explicitly (`{0,61}`)
- Avoiding nested quantifiers (the primary cause of ReDoS)

## Usage Examples

### In Form Validation

```ts
import { isValidEmail } from "@/lib/utils/email-validation";

function validateRegistrationForm(email: string) {
  if (!isValidEmail(email)) {
    return { error: "Please enter a valid email address" };
  }
  return { success: true };
}
```

### In API Route Handlers

```ts
import { isValidEmail } from "@/lib/utils/email-validation";

export async function POST(request: Request) {
  const body = await request.json();

  if (!isValidEmail(body.email)) {
    return Response.json(
      { error: "Invalid email address" },
      { status: 400 }
    );
  }

  // Proceed with valid email...
}
```

### Choosing Between Functions

| Use Case | Recommended Function |
|----------|---------------------|
| API route input validation | `isValidEmail` (more thorough) |
| Client-side form feedback | `isValidEmailRegex` (simpler, faster) |
| Server-side bulk processing | `isValidEmail` (explicit error handling) |
| Quick inline checks | `isValidEmailRegex` (one-liner) |

## RFC Compliance

Both functions implement a practical subset of RFC 5321 and RFC 5322:

**Supported:**
- Standard alphanumeric local parts
- Common special characters in local parts (`+`, `.`, `-`, `_`)
- Multi-label domain names
- Hyphenated domain labels

**Not supported (by design):**
- Quoted local parts (e.g., `"spaces allowed"@example.com`)
- IP address literals in domain part (e.g., `user@[192.168.1.1]`)
- International domain names (IDN) without ASCII encoding

These restrictions are intentional. The vast majority of real-world email addresses conform to these rules, and supporting edge cases would increase complexity and attack surface.

## Security Considerations

### ReDoS Protection

Regular Expression Denial of Service attacks exploit regex patterns that can be forced into exponential backtracking. Consider this vulnerable pattern:

```
/^([a-zA-Z0-9]+\.)+[a-zA-Z]{2,}$/
```

An input like `aaaaaaaaaaaaaaaaaa!` would cause the regex engine to try exponentially many combinations before failing. The template's patterns avoid this by:

- Never nesting quantifiers (`+` inside `+`)
- Using explicit length bounds (`{0,61}`)
- Splitting validation into independent steps

### Length Limits

The function enforces strict length limits matching RFC standards:

- Total email: 254 characters maximum
- Local part: 64 characters maximum
- Domain part: 253 characters maximum
- Domain label: 63 characters maximum

These limits prevent buffer-related issues and ensure compatibility with SMTP servers.

## Related Resources

- [Error Handling Patterns](/docs/template/guides/error-handler-patterns) -- Returning validation errors from APIs
- [Request Utilities](/docs/template/guides/request-utilities) -- Parsing and validating request bodies
