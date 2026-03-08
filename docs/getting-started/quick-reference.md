---
id: quick-reference
title: Quick Reference
sidebar_label: Quick Reference
sidebar_position: 6
---

# Quick Reference

Essential commands, patterns, and conventions for Ever Works development.

## Essential Commands

### Development

```bash
# Start development server
npm run dev
# or
yarn dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Run type checking
npm run type-check
```

### Database

```bash
# Push schema changes
npx drizzle-kit push

# Generate migrations
npx drizzle-kit generate

# Run migrations
npx drizzle-kit migrate

# Open Drizzle Studio
npx drizzle-kit studio

# Seed database
npm run db:seed
```

### API Documentation

```bash
# Generate documentation
yarn generate-docs

# Watch mode for development
yarn docs:watch

# Validate annotations
yarn docs:validate

# Access documentation
open http://localhost:3000/api/reference
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test path/to/test.ts
```

---

## API Documentation Template

### Basic Route Template

```typescript
/**
 * @swagger
 * /api/your-endpoint:
 *   post:
 *     tags: ["Category - Subcategory"]
 *     summary: "Action description"
 *     description: "Detailed description with business context"
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *                 description: "Field description"
 *                 example: "example_value"
 *             required: ["field"]
 *     responses:
 *       200:
 *         description: "Success response"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *               required: ["success"]
 *       400:
 *         description: "Bad request"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Validation failed"
 */
export async function POST(request: NextRequest) {
  // Implementation
}
```

### Standardized Tags

**Admin Operations**:

- `"Admin - Users"`

---

## Common Data Types

### Standard Success Response

```yaml
type: object
properties:
  success:
    type: boolean
    example: true
  data:
    type: object
  message:
    type: string
    example: "Operation completed successfully"
required: ["success"]
```

### Standard Error Response

```yaml
type: object
properties:
  success:
    type: boolean
    example: false
  error:
    type: string
    example: "Error message"
  details:
    type: array
    items:
      type: object
required: ["success", "error"]
```

### Pagination Response

```yaml
type: object
properties:
  data:
    type: array
    items:
      type: object
  pagination:
    type: object
    properties:
      page:
        type: integer
        example: 1
      limit:
        type: integer
        example: 10
      total:
        type: integer
        example: 100
      totalPages:
        type: integer
        example: 10
```

---

## Common Field Types

### String with Validation

```yaml
field:
  type: string
  minLength: 3
  maxLength: 50
  pattern: "^[a-zA-Z0-9-]+$"
  description: "Alphanumeric identifier"
  example: "user-123"
```

### Email

```yaml
email:
  type: string
  format: email
  description: "User email address"
  example: "user@example.com"
```

### Date/Time

```yaml
createdAt:
  type: string
  format: date-time
  description: "Creation timestamp"
  example: "2024-01-15T10:30:00.000Z"
```

### Enum

```yaml
status:
  type: string
  enum: ["active", "inactive", "pending"]
  description: "User status"
  example: "active"
```

### Array

```yaml
tags:
  type: array
  items:
    type: string
  description: "List of tags"
  example: ["productivity", "tools"]
```

---

## Standard Error Codes

```yaml
responses:
  200:
    description: "Success (GET, PUT, PATCH)"
  201:
    description: "Created (POST)"
  400:
    description: "Bad request - Validation failed"
  401:
    description: "Unauthorized - Authentication required"
  403:
    description: "Forbidden - Insufficient permissions"
  404:
    description: "Not found"
  409:
    description: "Conflict - Resource already exists"
  422:
    description: "Unprocessable entity - Business logic error"
  500:
    description: "Internal server error"
```

---

## Pre-commit Checklist

Before committing API changes:

- [ ] `yarn generate-docs` executed without error
- [ ] Documentation visible on `/api/reference`
- [ ] All parameters documented
- [ ] Realistic examples added
- [ ] Appropriate error codes documented
- [ ] Tag consistent with conventions
- [ ] Clear and useful description

---

## Quick Troubleshooting

### Documentation Generation Error

```bash
# Restore backup
cp public/openapi.backup.json public/openapi.json

# Check syntax
yarn docs:validate

# Regenerate
yarn generate-docs
```

### Annotation Not Detected

**Common causes**:

- Missing `@swagger` at beginning
- File not in `app/api/**/route.ts`
- Incorrect YAML syntax
- Watcher not running

**Solution**:

```bash
# Restart watcher
yarn docs:watch

# Verify file location
find app/api -name "route.ts" | grep your-route

# Check annotation exists
grep -n "@swagger" app/api/your-route/route.ts
```

### Incomplete Documentation

**Checklist**:

- Add `description` to all fields
- Include realistic `example` values
- Document all error codes (400, 401, 403, 404, 500)
- Check required fields are marked

---

## Environment Variables

### Required

```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
```

### Optional (Development)

```bash
# OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Payment
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Email
RESEND_API_KEY="re_..."

# Analytics
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_SENTRY_DSN="https://..."
```

[Learn more about environment variables →](/template/deployment/environment-variables)

---

## Useful Links

- [Architecture Overview](/template/architecture/overview)
- [Tech Stack](/template/architecture/tech-stack)
- [Authentication Guide](/template/authentication/setup-guide)
- [API Documentation](/template/development/api-documentation)
- [Testing Guide](/template/development/testing)
- [Deployment Guide](/template/deployment/overview)
- [Production Checklist](/template/deployment/production-checklist)
- [Team Training](/template/team-training)

---

## Tips

:::tip Development Workflow
Use `yarn docs:watch` during development to see API documentation changes in real-time.
:::

:::tip Code Quality
Run `npm run lint` and `npm run type-check` before committing to catch issues early.
:::

:::tip Database Changes
Always test database migrations locally before pushing to production.
:::

:::tip API Testing
Use the Scalar UI at `/api/reference` to test endpoints interactively.
:::
