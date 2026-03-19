---
id: current-user-api-endpoints
title: Current User API Endpoints
sidebar_label: Current User API
sidebar_position: 60
---

# Current User API Endpoints

The Current User API provides a single endpoint to retrieve the authenticated user's profile information. It is used by the frontend to determine authentication state and user privileges.

**Source:** `template/app/api/current-user/route.ts`

---

## Get Current User

Returns the current authenticated user's safe profile information. Returns `null` if no user is authenticated.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/current-user` |
| **Auth** | None required (returns `null` if unauthenticated) |

### Response

**Status 200** -- Authenticated user.

```json
{
  "id": "user_123abc",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "image": "https://example.com/avatars/john.jpg",
  "provider": "google",
  "isAdmin": false
}
```

**Status 200** -- No authenticated user.

```json
null
```

### Response Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | `string` | No | User unique identifier |
| `name` | `string` | Yes | User's full name |
| `email` | `string` | Yes | User's email address |
| `image` | `string` | Yes | Profile image URL |
| `provider` | `string` | Yes | Authentication provider (e.g., `google`, `github`, `credentials`) |
| `isAdmin` | `boolean` | No | Whether the user has admin privileges (defaults to `false`) |

### Response Examples

**OAuth user (Google):**
```json
{
  "id": "user_123abc",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "image": "https://lh3.googleusercontent.com/...",
  "provider": "google",
  "isAdmin": false
}
```

**Admin user (credentials):**
```json
{
  "id": "user_456def",
  "name": "Jane Admin",
  "email": "jane.admin@example.com",
  "image": null,
  "provider": "credentials",
  "isAdmin": true
}
```

**GitHub user:**
```json
{
  "id": "user_789ghi",
  "name": "GitHub User",
  "email": "github.user@example.com",
  "image": "https://avatars.githubusercontent.com/u/123456",
  "provider": "github",
  "isAdmin": false
}
```

### curl Examples

```bash
# Get current user (authenticated)
curl -s http://localhost:3000/api/current-user \
  -H "Cookie: next-auth.session-token=<session_token>"

# Get current user (unauthenticated -- returns null)
curl -s http://localhost:3000/api/current-user
```

### TypeScript Usage

```typescript
interface SafeUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  provider: string | null;
  isAdmin: boolean;
}

async function getCurrentUser(): Promise<SafeUser | null> {
  const res = await fetch('/api/current-user');
  return res.json();
}

// Usage
const user = await getCurrentUser();
if (user) {
  console.log(`Logged in as ${user.name} (${user.provider})`);
  if (user.isAdmin) {
    console.log('User has admin privileges');
  }
} else {
  console.log('Not authenticated');
}
```

### Implementation Notes

- The endpoint uses the `auth()` function from `@/lib/auth` (NextAuth.js) to read the server-side session.
- The response is sanitized -- only safe profile fields are returned. Sensitive fields like password hashes, internal metadata, and tokens are excluded.
- This endpoint always returns HTTP 200, even when no user is authenticated. The caller distinguishes by checking whether the response is `null`.
- The `isAdmin` field defaults to `false` if not set on the session, ensuring safe behavior for non-admin users.
