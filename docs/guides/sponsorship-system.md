---
id: sponsorship-system
title: Sponsorship System
sidebar_label: Sponsorship System
sidebar_position: 7
---

# Sponsorship System

The Sponsorship System allows users to promote their items on your directory for a fee. It includes a complete workflow from purchase to admin approval and expiration.

## Overview

The system allows users to "Sponsor" an existing item in the directory. Sponsored items typically receive:
- Premium placement (e.g., sticky sidebar, top of lists)
- Special badging ("Sponsored")
- Enhanced visibility

## Workflow

1.  **Purchase**: A user selects an item they own and chooses a sponsorship plan (Weekly or Monthly).
2.  **Payment**: The user completes payment via the configured provider (Stripe, LemonSqueezy, etc.).
3.  **Review**: The sponsorship enters a `Pending Review` state.
4.  **Approval**: An admin reviews and approves the sponsorship.
5.  **Active**: The sponsorship becomes `Active` for the purchased duration.
6.  **Expiration**: Once the period ends, the sponsorship automatically expires.

## Configuration

Sponsorship settings are configured in `.content/config.yml` and environment variables.

### Pricing Configuration

```yaml
# .content/config.yml
settings:
  monetization:
    sponsor_ads:
      currency: USD
      weekly_price: 300
      monthly_price: 1000
```

### Environment Variables

Ensure your payment provider is configured (see [Payment Integration](../payment)).

## Admin Management

Admins can manage sponsorships from the **Admin Dashboard > Sponsorships** page:
- **Approve**: Activate a pending sponsorship.
- **Reject**: Deny a sponsorship (e.g., for inappropriate content).
- **Cancel**: End an active sponsorship early.

## Statuses

| Status | Description |
|--------|-------------|
| `PENDING_PAYMENT` | User has initiated but not completed payment. |
| `PENDING` | Payment received, awaiting admin approval. |
| `ACTIVE` | Approved and currently running. |
| `REJECTED` | Denied by an admin. |
| `EXPIRED` | Duration has ended. |
| `CANCELLED` | Manually stopped before expiration. |

## Developer API

The `SponsorAdService` (`lib/services/sponsor-ad.service.ts`) handles the business logic:

```typescript
// Example: Get active ads for display
const activeAds = await sponsorAdService.getActiveSponsorAdsWithItems(5);
```
