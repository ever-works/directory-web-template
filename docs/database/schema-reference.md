---
id: schema-reference
title: Schema Reference
sidebar_label: Schema Reference
sidebar_position: 1
---

# Schema Reference

All database tables are defined in `lib/db/schema.ts`. This document catalogs every table, its key columns, relationships, and purpose.

## Users & Authentication

### users

Core user table, used by NextAuth.js for authentication.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | UUID, auto-generated |
| `email` | text | Unique |
| `image` | text | Profile image URL |
| `emailVerified` | timestamp | Email verification date |
| `passwordHash` | text | Bcrypt hash for credentials auth |
| `createdAt` | timestamp | Auto-set |
| `updatedAt` | timestamp | Auto-set |
| `deletedAt` | timestamp | Soft delete |

**Indexes**: `users_created_at_idx`

### accounts

OAuth and credentials account links, following the NextAuth.js adapter schema.

| Column | Type | Notes |
|--------|------|-------|
| `userId` | text (FK) | References `users.id` (cascade delete) |
| `type` | text | Account type (oauth, credentials, etc.) |
| `provider` | text | Provider name (google, github, credentials) |
| `providerAccountId` | text | Provider-specific account ID |
| `email` | text | Account email |
| `passwordHash` | text | For client credentials auth |
| `refresh_token` | text | OAuth refresh token |
| `access_token` | text | OAuth access token |
| `expires_at` | integer | Token expiration |

**Primary key**: Composite on (`provider`, `providerAccountId`)
**Indexes**: `accounts_email_idx`, `accounts_provider_idx`

### sessions

Active user sessions.

| Column | Type | Notes |
|--------|------|-------|
| `sessionToken` | text (PK) | Session identifier |
| `userId` | text (FK) | References `users.id` |
| `expires` | timestamp | Session expiration |

### verificationTokens

Email verification tokens.

| Column | Type | Notes |
|--------|------|-------|
| `identifier` | text | User identifier |
| `email` | text | Email address |
| `token` | text | Verification token |
| `expires` | timestamp | Token expiration |

**Primary key**: Composite on (`identifier`, `token`)

### authenticators

WebAuthn/FIDO2 credential storage.

| Column | Type | Notes |
|--------|------|-------|
| `credentialID` | text | Unique credential identifier |
| `userId` | text (FK) | References `users.id` |
| `providerAccountId` | text | Provider account reference |
| `credentialPublicKey` | text | Public key for verification |
| `counter` | integer | Authentication counter |

### passwordResetTokens

Password reset tokens for forgot-password flow.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | UUID |
| `email` | text | Target email |
| `token` | text | Unique reset token |
| `expires` | timestamp | Token expiration |

### activityLogs

Tracks user and client activities for audit purposes.

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial (PK) | Auto-increment |
| `userId` | text (FK) | References `users.id` (nullable) |
| `clientId` | text (FK) | References `clientProfiles.id` (nullable) |
| `action` | text | Activity type (SIGN_UP, SIGN_IN, etc.) |
| `timestamp` | timestamp | When the activity occurred |
| `ipAddress` | varchar(45) | Client IP address |

**Indexes**: `activity_logs_user_idx`, `activity_logs_timestamp_idx`, `activity_logs_action_idx`

## Roles & Permissions

### roles

Role definitions for RBAC.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | Role identifier (e.g., "admin", "client") |
| `name` | text | Unique role name |
| `description` | text | Human-readable description |
| `isAdmin` | boolean | Whether this is an admin role |
| `status` | text | "active" or "inactive" |
| `created_by` | text | Who created the role |

### permissions

Granular permission definitions.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | UUID |
| `key` | text | Unique permission key (e.g., "items:create") |
| `description` | text | Human-readable description |

### rolePermissions

Many-to-many join table linking roles to permissions.

| Column | Type | Notes |
|--------|------|-------|
| `roleId` | text (FK) | References `roles.id` (cascade) |
| `permissionId` | text (FK) | References `permissions.id` (cascade) |

**Primary key**: Composite on (`roleId`, `permissionId`)

### userRoles

Many-to-many join table linking users to roles.

| Column | Type | Notes |
|--------|------|-------|
| `userId` | text (FK) | References `users.id` (cascade) |
| `roleId` | text (FK) | References `roles.id` (cascade) |

**Primary key**: Composite on (`userId`, `roleId`)

## Client Profiles

### clientProfiles

Extended profile information for registered client users.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | UUID |
| `userId` | text (FK) | References `users.id` (unique, cascade) |
| `email` | text | Client email |
| `name` | text | Full name |
| `displayName` | text | Display name |
| `username` | text | Unique username |
| `bio` | text | User biography |
| `jobTitle` | text | Professional title |
| `company` | text | Company name |
| `industry` | text | Industry sector |
| `phone` | text | Phone number |
| `website` | text | Personal website |
| `location` | text | Location string |
| `avatar` | text | Avatar URL |
| `accountType` | text | "individual", "business", or "enterprise" |
| `status` | text | "active", "inactive", "suspended", "banned", "trial" |
| `plan` | text | "free", "standard", or "premium" |
| `timezone` | text | Timezone (default "UTC") |
| `language` | text | Preferred language (default "en") |
| `country` | text | Country code |
| `currency` | text | Preferred currency (default "USD") |
| `defaultLatitude` | double | Default location latitude |
| `defaultLongitude` | double | Default location longitude |
| `twoFactorEnabled` | boolean | 2FA status |
| `totalSubmissions` | integer | Submission count |
| `warningCount` | integer | Moderation warning count |
| `suspendedAt` | timestamp | When suspended |
| `bannedAt` | timestamp | When banned |

**Indexes**: Multiple indexes on `userId`, `email`, `status`, `plan`, `accountType`, `username`, `createdAt`

## Content & Engagement

### comments

User comments on items.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | UUID |
| `content` | text | Comment text |
| `userId` | text (FK) | References `clientProfiles.id` |
| `itemId` | text | Item slug |
| `rating` | integer | Rating (0-5) |
| `editedAt` | timestamp | Last edit time |
| `deletedAt` | timestamp | Soft delete |

### votes

Upvote/downvote on items.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | UUID |
| `userId` | text (FK) | References `clientProfiles.id` |
| `itemId` | text | Item slug |
| `voteType` | text | "upvote" or "downvote" |

**Unique index**: (`userId`, `itemId`) -- one vote per user per item

### favorites

User favorites (bookmarks).

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | UUID |
| `userId` | text (FK) | References `users.id` |
| `itemSlug` | text | Item slug |
| `itemName` | text | Denormalized item name |
| `itemIconUrl` | text | Denormalized item icon |
| `itemCategory` | text | Denormalized category |

**Unique index**: (`userId`, `itemSlug`)

### itemViews

Tracks unique daily item views for analytics.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | UUID |
| `itemId` | text | Item slug |
| `viewerId` | text | Anonymous cookie-based viewer ID |
| `viewedDateUtc` | text | Date in YYYY-MM-DD format |
| `viewedAt` | timestamp | Exact view time |

**Unique index**: (`itemId`, `viewerId`, `viewedDateUtc`) -- one view per viewer per day

## Subscriptions & Payments

### subscriptions

User subscription records supporting multiple payment providers.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | UUID |
| `userId` | text (FK) | References `users.id` |
| `planId` | text | Plan identifier (free, standard, premium) |
| `status` | text | active, cancelled, expired, pending, paused |
| `paymentProvider` | text | stripe, lemonsqueezy, polar, solidgate |
| `subscriptionId` | text | Provider subscription ID |
| `customerId` | text | Provider customer ID |
| `autoRenewal` | boolean | Auto-renewal enabled |
| `cancelAtPeriodEnd` | boolean | Cancel at period end |
| `amount` | integer | Subscription amount (cents) |
| `currency` | text | Currency code |
| `interval` | text | Billing interval (month, year) |

**Indexes**: `user_subscription_idx`, `subscription_status_idx`, `provider_subscription_idx` (unique)

### subscriptionHistory

Audit trail for subscription changes.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | UUID |
| `subscriptionId` | text (FK) | References `subscriptions.id` |
| `action` | text | Change action |
| `previousStatus` | text | Status before change |
| `newStatus` | text | Status after change |

### paymentProviders

Registry of available payment providers.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | UUID |
| `name` | text | Provider name (unique) |
| `isActive` | boolean | Whether provider is enabled |

### paymentAccounts

Links users to their payment provider accounts.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | UUID |
| `userId` | text (FK) | References `users.id` |
| `providerId` | text (FK) | References `paymentProviders.id` |
| `customerId` | text | Provider customer ID |

**Unique indexes**: (`userId`, `providerId`), (`customerId`, `providerId`)

## Admin & Moderation

### notifications

In-app admin notifications.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | UUID |
| `userId` | text (FK) | References `users.id` |
| `type` | text | item_submission, comment_reported, etc. |
| `title` | text | Notification title |
| `message` | text | Notification body |
| `isRead` | boolean | Read status |

### reports

Content report system for items and comments.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | UUID |
| `contentType` | text | "item" or "comment" |
| `contentId` | text | Reported content ID |
| `reason` | text | spam, harassment, inappropriate, other |
| `status` | text | pending, reviewed, resolved, dismissed |
| `resolution` | text | content_removed, user_warned, etc. |
| `reportedBy` | text (FK) | References `clientProfiles.id` |
| `reviewedBy` | text (FK) | References `users.id` |

### moderationHistory

Complete moderation action history.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | UUID |
| `userId` | text (FK) | References `clientProfiles.id` |
| `action` | text | warn, suspend, ban, unsuspend, unban, content_removed |
| `reportId` | text (FK) | References `reports.id` |
| `performedBy` | text (FK) | References `users.id` |
| `details` | jsonb | Additional context |

### itemAuditLogs

Tracks changes to items in the admin panel.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | UUID |
| `itemId` | text | Item slug (not FK; items are in Git) |
| `itemName` | text | Denormalized item name |
| `action` | text | created, updated, status_changed, reviewed, deleted, restored |
| `changes` | jsonb | Field-level change details |
| `performedBy` | text (FK) | References `users.id` |

## Other Tables

### sponsorAds

Sponsored item advertisements with full payment lifecycle.

Key columns: `userId`, `itemSlug`, `status` (pending_payment, pending, rejected, active, expired, cancelled), `interval` (weekly, monthly), `amount`, `paymentProvider`, `subscriptionId`.

### companies / itemsCompanies

Company records and item-company associations for directory listings.

### surveys / surveyResponses

Survey builder with JSON-based question definitions and response storage.

### twentyCrmConfig / integrationMappings

CRM integration tables for Twenty CRM sync functionality. The config table enforces a singleton pattern (only one row allowed).

### newsletterSubscriptions

Email newsletter subscription tracking with subscribe/unsubscribe timestamps.

### seedStatus

Singleton table tracking database seeding status (seeding, completed, failed) to prevent concurrent seed operations.

## Type Exports

The schema file exports TypeScript types for every table using Drizzle's inference:

```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
// ... and so on for all tables
```

These types are used throughout the application for type-safe database operations.
