---
id: cron-jobs
title: Cron Jobs Configuration
sidebar_label: Cron Jobs
sidebar_position: 8
---

# Cron Jobs Configuration Guide

## Overview

This template supports **three scheduling mechanisms** for background jobs:

1. **Local** - `LocalJobManager` using `setInterval` (development)
2. **Vercel Crons** - Vercel's built-in cron system (production on Vercel)
3. **Trigger.dev** - Third-party service (optional, for large-scale directories)

### Priority Order (Auto-detection)

The system automatically selects the scheduling mode based on environment:

```typescript
// From lib/background-jobs/config.ts
export function getSchedulingMode(): SchedulingMode {
  // 1. Check if disabled
  if (DISABLE_AUTO_SYNC === 'true') return 'disabled';
  
  // 2. Trigger.dev (if fully configured in production)
  if (shouldUseTriggerDev()) return 'trigger-dev';
  
  // 3. Vercel (if VERCEL=1)
  if (isVercelEnvironment()) return 'vercel';
  
  // 4. Local (fallback)
  return 'local';
}
```

---

## 📋 Registered Background Jobs

### 1. Repository Synchronization

**Job ID:** `repository-sync`  
**Schedule:** Every 5 minutes (`*/5 * * * *`)  
**Description:** Syncs content from the Git-based CMS repository

- **Vercel Endpoint:** `/api/cron/sync`
- **Local Interval:** `5 * 60 * 1000` ms (5 minutes)
- **Function:** `syncManager.performSync()`

### 2. Subscription Renewal Reminders

**Job ID:** `subscription-renewal-reminder`  
**Schedule:** Daily at 9:00 AM (`0 9 * * *`)  
**Description:** Sends email reminders to users with subscriptions expiring in 7 days

- **Vercel Endpoint:** `/api/cron/subscription-reminders`
- **Local Cron:** `0 9 * * *`
- **Function:** `subscriptionRenewalReminderJob()`

### 3. Subscription Expiration Cleanup

**Job ID:** `subscription-expired-cleanup`  
**Schedule:** Daily at midnight (`0 0 * * *`)  
**Description:** Processes expired subscriptions and sends expiration notifications

- **Vercel Endpoint:** `/api/cron/subscription-expiration`
- **Local Cron:** `0 0 * * *`
- **Function:** `subscriptionService.processExpiredSubscriptions()`

---

## 🚀 Vercel Deployment Configuration

### vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Environment Variables

**Required for Vercel Crons:**

```bash
CRON_SECRET=your-secure-random-secret-here
```

Vercel automatically sends this in the `Authorization: Bearer <CRON_SECRET>` header when calling cron endpoints.

**Optional (to disable Trigger.dev):**

```bash
# Do NOT set these if you want to use Vercel Crons:
# TRIGGER_SECRET_KEY=
# TRIGGER_API_KEY=
# TRIGGER_API_URL=
```

---

## ✅ How to Verify Cron Jobs on Vercel

### 1. Check Vercel Dashboard

**Navigate to:**
```
https://vercel.com/<team>/<project>/settings/cron-jobs
```

**Example:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/settings/cron-jobs
```

**What to Look For:**
- ✅ All 3 cron jobs should be listed
- ✅ Correct schedules (every 5 min, daily at 9am, daily at midnight)
- ✅ Status should be "Active"

### 2. Check Logs

**Navigate to:**
```
https://vercel.com/<team>/<project>/logs
```

**Filter by Request Path:**
- `/api/cron/sync`
- `/api/cron/subscription-reminders`
- `/api/cron/subscription-expiration`

**Example:**
```
https://vercel.com/ever-works/awesome-time-tracking-website/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```

**What to Look For:**
- ✅ Regular execution timestamps
- ✅ 200 status codes (success)
- ✅ No 401 errors (authentication failures)
- ✅ No 500 errors (internal errors)

### 3. Check Application Logs

**Search for these log messages:**

```bash
# Initialization
[BACKGROUND_JOBS] All background jobs registered with BackgroundJobManager

# Sync job
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: ...

# Renewal reminders
[Cron] Subscription reminders job completed

# Expiration cleanup
[SubscriptionExpiration] Starting expired subscription processing...
[SubscriptionExpiration] Completed: X subscriptions expired
```

### 4. Test Manually (Development)

**Test endpoints locally with curl:**

```bash
# Set your CRON_SECRET
export CRON_SECRET="your-secret"

# Test sync endpoint
curl -X GET http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer $CRON_SECRET"

# Test subscription reminders
curl -X GET http://localhost:3000/api/cron/subscription-reminders \
  -H "Authorization: Bearer $CRON_SECRET"

# Test subscription expiration
curl -X GET http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Expected Response:**
```json
{
  "success": true,
  "timestamp": "2026-01-06T...",
  "message": "...",
  "duration": 123
}
```

---

## 🔧 Troubleshooting

### Cron Jobs Not Running

**Check 1: Environment Variables**
```bash
# Verify CRON_SECRET is set in Vercel
vercel env ls

# Should show:
# CRON_SECRET (Production, Preview, Development)
```

**Check 2: Deployment**
```bash
# Ensure vercel.json is deployed
git status
git log --oneline -1 -- vercel.json

# Verify last deployment includes vercel.json changes
```

**Check 3: Logs**
```bash
# Check for errors in Vercel logs
vercel logs --follow
```

### 401 Unauthorized Errors

**Problem:** `CRON_SECRET` mismatch

**Solution:**
1. Verify `CRON_SECRET` in Vercel environment variables
2. Redeploy the project after updating env vars
3. Check that the secret doesn't have trailing spaces

### Jobs Running Too Frequently

**Problem:** Using Local mode instead of Vercel mode

**Check:**
```typescript
// Should log "vercel" in production on Vercel
console.log(getSchedulingMode()); 
```

**Solution:**
- Ensure `VERCEL=1` is set (Vercel does this automatically)
- Check that Trigger.dev env vars are NOT set

---

## 🔄 Migration Guide

### From Local to Vercel

1. **Add cron jobs to `vercel.json`** (already done)
2. **Set `CRON_SECRET` in Vercel dashboard**
3. **Deploy to Vercel**
4. **Verify in logs**

### From Vercel to Trigger.dev

1. **Create Trigger.dev account** at https://trigger.dev
2. **Set environment variables:**
   ```bash
   TRIGGER_SECRET_KEY=tr_prod_...
   TRIGGER_API_KEY=...
   TRIGGER_API_URL=https://api.trigger.dev
   TRIGGER_ENABLED=true
   ```
3. **Redeploy**
4. **System automatically switches to Trigger.dev mode**

### From Trigger.dev Back to Vercel

1. **Remove Trigger.dev environment variables:**
   ```bash
   vercel env rm TRIGGER_SECRET_KEY production
   vercel env rm TRIGGER_API_KEY production
   vercel env rm TRIGGER_API_URL production
   vercel env rm TRIGGER_ENABLED production
   ```
2. **Redeploy**
3. **System automatically falls back to Vercel mode**

---

## 📊 Monitoring & Analytics

### Key Metrics to Track

1. **Execution Frequency**
   - Sync: Should run every 5 minutes (288 times/day)
   - Reminders: Should run once per day at 9:00 AM
   - Expiration: Should run once per day at midnight

2. **Success Rate**
   - Target: > 99% success rate
   - Monitor 401 errors (auth issues)
   - Monitor 500 errors (application issues)

3. **Duration**
   - Sync: < 30 seconds typical
   - Reminders: Depends on user count
   - Expiration: Depends on subscription count

### Setting Up Alerts

**Vercel Monitoring:**
1. Go to Project → Monitoring
2. Set up alerts for:
   - Error rate > 5%
   - Duration > 30s (for sync)
   - 4XX/5XX responses

---

## 📚 Related Files

- `vercel.json` - Vercel cron configuration
- `lib/background-jobs/config.ts` - Scheduling mode detection
- `lib/background-jobs/initialize-jobs.ts` - Job registration
- `lib/background-jobs/local-job-manager.ts` - Local scheduling
- `lib/background-jobs/trigger-dev-job-manager.ts` - Trigger.dev integration
- `app/api/cron/*/route.ts` - Cron endpoint implementations

---

## 🤝 Support

For issues or questions:
1. Check logs in Vercel dashboard
2. Review this documentation
3. Contact the development team
4. Open an issue in the repository

---

**Last Updated:** January 6, 2026  
**Version:** 1.0.0

