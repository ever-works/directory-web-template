---
id: schema-relationships
title: Schema Relationships
sidebar_label: Schema Relationships
sidebar_position: 15
---

# Schema Relationships

This page documents all table relationships, foreign keys, and junction tables in the template database schema. The schema is defined in `lib/db/schema.ts` using Drizzle ORM with PostgreSQL.

## Entity Relationship Overview

The database centers around three primary entities: **users** (admin), **client_profiles** (end users), and **items** (stored in Git, referenced by slug). Most engagement and commerce tables relate to these three.

## Core Authentication Tables

### users

The top-level identity table for all authenticated accounts.

**Referenced by:**
- `accounts.userId` (cascade delete)
- `sessions.userId` (cascade delete)
- `authenticators.userId` (cascade delete)
- `activityLogs.userId` (cascade delete)
- `client_profiles.userId` (cascade delete)
- `subscriptions.userId` (cascade delete)
- `payment_accounts.userId` (cascade delete)
- `notifications.user_id` (cascade delete)
- `favorites.userId` (cascade delete)
- `user_roles.user_id` (cascade delete)
- `reports.reviewed_by` (set null)
- `sponsor_ads.user_id` (cascade delete)
- `moderation_history.performed_by` (set null)

### accounts

OAuth and credential accounts linked to users.

| Relationship | Target | On Delete |
|-------------|--------|-----------|
| `userId` | `users.id` | CASCADE |

Composite primary key on `(provider, providerAccountId)`.

### sessions

Active login sessions.

| Relationship | Target | On Delete |
|-------------|--------|-----------|
| `userId` | `users.id` | CASCADE |

### authenticators

WebAuthn/passkey credentials.

| Relationship | Target | On Delete |
|-------------|--------|-----------|
| `userId` | `users.id` | CASCADE |

Composite primary key on `(userId, credentialID)`.

## Client Profile System

### client_profiles

End-user profiles with plan, status, and location data.

| Relationship | Target | On Delete |
|-------------|--------|-----------|
| `userId` | `users.id` | CASCADE |

Unique index on `userId` ensures one profile per user.

**Referenced by:**
- `comments.userId` (cascade delete)
- `votes.userid` (cascade delete)
- `reports.reported_by` (cascade delete)
- `moderation_history.user_id` (cascade delete)
- `activityLogs.clientId` (cascade delete)

## Role-Based Access Control

The RBAC system uses three tables in a many-to-many pattern.

### roles

Named roles with admin flag.

### permissions

Individual permission keys (e.g., `items:create`).

### role_permissions (junction table)

Links roles to permissions.

| Column | Target | On Delete |
|--------|--------|-----------|
| `role_id` | `roles.id` | CASCADE |
| `permission_id` | `permissions.id` | CASCADE |

Composite primary key on `(role_id, permission_id)`.

### user_roles (junction table)

Assigns roles to users.

| Column | Target | On Delete |
|--------|--------|-----------|
| `user_id` | `users.id` | CASCADE |
| `role_id` | `roles.id` | CASCADE |

Composite primary key on `(user_id, role_id)`.

### RBAC Entity Diagram

```
users ---< user_roles >--- roles ---< role_permissions >--- permissions
```

A user can have many roles, each role can have many permissions, and multiple users can share the same role.

## Engagement Tables

### comments

| Relationship | Target | On Delete |
|-------------|--------|-----------|
| `userId` | `client_profiles.id` | CASCADE |

The `itemId` column stores the item slug (not a foreign key, since items live in Git).

### votes

| Relationship | Target | On Delete |
|-------------|--------|-----------|
| `userid` | `client_profiles.id` | CASCADE |

Unique index on `(userid, item_id)` ensures one vote per user per item. The `item_id` column stores the item slug.

### favorites

| Relationship | Target | On Delete |
|-------------|--------|-----------|
| `userId` | `users.id` | CASCADE |

Unique index on `(userId, item_slug)` ensures one favorite per user per item. The `item_slug` column stores the item slug.

### item_views

No foreign keys. Uses a unique index on `(item_id, viewer_id, viewed_date_utc)` for daily deduplication.

## Content Moderation Tables

### reports

| Column | Target | On Delete |
|--------|--------|-----------|
| `reported_by` | `client_profiles.id` | CASCADE |
| `reviewed_by` | `users.id` | SET NULL |

Indexes on `content_type`, `content_id`, `status`, `reported_by`, and a composite `(content_type, content_id)`.

### moderation_history

| Column | Target | On Delete |
|--------|--------|-----------|
| `user_id` | `client_profiles.id` | CASCADE |
| `performed_by` | `users.id` | SET NULL |
| `report_id` | `reports.id` | SET NULL |

## Payment & Subscription Tables

### subscriptions

| Relationship | Target | On Delete |
|-------------|--------|-----------|
| `userId` | `users.id` | CASCADE |

Unique index on `(payment_provider, subscription_id)`.

### subscriptionHistory

| Relationship | Target | On Delete |
|-------------|--------|-----------|
| `subscription_id` | `subscriptions.id` | CASCADE |

### paymentProviders

No foreign keys. Stores available payment providers.

### paymentAccounts

| Column | Target | On Delete |
|--------|--------|-----------|
| `userId` | `users.id` | CASCADE |
| `providerId` | `paymentProviders.id` | CASCADE |

Unique indexes on `(userId, providerId)` and `(customerId, providerId)`.

## Sponsor Ads

### sponsor_ads

| Column | Target | On Delete |
|--------|--------|-----------|
| `user_id` | `users.id` | CASCADE |
| `reviewed_by` | `users.id` | SET NULL |

## Notification System

### notifications

| Relationship | Target | On Delete |
|-------------|--------|-----------|
| `user_id` | `users.id` | CASCADE |

Indexes on `user_id`, `type`, `is_read`, and `created_at`.

## Activity Logging

### activityLogs

| Column | Target | On Delete |
|--------|--------|-----------|
| `userId` | `users.id` | CASCADE |
| `clientId` | `client_profiles.id` | CASCADE |

Both columns are nullable; each log entry relates to either an admin user or a client user.

## Other Tables

### newsletterSubscriptions

No foreign keys. The `email` column has a unique index.

### passwordResetTokens

No foreign keys. Composite primary key on `(identifier, token)`.

### verificationTokens

No foreign keys. Composite primary key on `(identifier, token)`.

### featured_items

No foreign keys. Uses `item_slug` to reference Git-based items and `featured_by` as a plain text field (not a foreign key).

### surveys

No foreign keys. The `slug` column has a unique index.

### twenty_crm_config

No foreign keys. Singleton pattern enforced by a unique expression index.

### integration_mappings

No foreign keys. Unique index on `(ever_id, object_type)`.

### companies

No foreign keys.

### seed_status

Singleton table with a unique index on `id`.

## Cascade Delete Summary

When a **user** is deleted, the following are cascade-deleted:

- Accounts, sessions, authenticators
- Client profiles (and transitively: comments, votes, reports by that client, moderation history)
- Subscriptions
- Payment accounts
- Notifications
- Favorites
- User role assignments
- Activity logs
- Sponsor ads

When a **client profile** is deleted:

- Comments by that user
- Votes by that user
- Reports filed by that user
- Moderation history for that user
- Activity logs for that client

When a **role** is deleted:

- All role-permission assignments for that role
- All user-role assignments for that role

## Item References

Items are stored in the Git-based CMS, not in the database. Several tables reference items by slug:

- `comments.itemId` -- item slug
- `votes.item_id` -- item slug
- `favorites.item_slug` -- item slug
- `item_views.item_id` -- item slug
- `featured_items.item_slug` -- item slug
- `sponsor_ads.item_slug` -- item slug

These are plain text columns without foreign key constraints.

## Related Documentation

- [Schema Reference](/template/database/schema-reference) -- Column-level schema docs
- [Drizzle Patterns](/template/database/drizzle-patterns) -- ORM usage patterns
- [Migrations Guide](/template/database/migrations-guide) -- Database migrations
