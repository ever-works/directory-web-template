---
id: production-checklist
title: Production Readiness Checklist
sidebar_label: Production Checklist
sidebar_position: 7
---

# Production Readiness Checklist

A comprehensive checklist to ensure your Ever Works deployment is production-ready.

## Pre-Deployment Checklist

### 1. Environment Configuration

#### Required Environment Variables

- [ ] **Database**
  - `DATABASE_URL` configured with production PostgreSQL
  - Database connection pooling enabled
  - SSL mode enabled for production

- [ ] **Authentication**
  - `NEXTAUTH_URL` set to production domain
  - `NEXTAUTH_SECRET` generated (min 32 characters)
  - OAuth providers configured (Google, GitHub, etc.)
  - Supabase Auth credentials (if using)

- [ ] **Payment Providers**
  - Stripe production keys (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
  - LemonSqueezy production keys (if using)
  - Webhook secrets configured
  - Test mode disabled

- [ ] **Email Services**
  - Resend API key configured
  - Novu credentials set (if using)
  - Email templates tested
  - Sender domain verified

- [ ] **Analytics & Monitoring**
  - PostHog production key
  - Sentry DSN configured
  - Exception tracking provider set
  - Vercel Analytics enabled (if on Vercel)

- [ ] **CRM Integration**
  - Twenty CRM credentials (if using)
  - Webhook endpoints configured

- [ ] **Security**
  - `NODE_ENV=production`
  - Rate limiting configured
  - CORS settings reviewed
  - CSP headers configured

### 2. Database

- [ ] **Schema & Migrations**
  - All migrations applied
  - Database schema matches code
  - Indexes created for performance
  - Foreign key constraints validated

- [ ] **Data Integrity**
  - Seed data loaded (if needed)
  - Test data removed
  - Data validation rules in place

- [ ] **Backup & Recovery**
  - Automated backups configured
  - Backup restoration tested
  - Point-in-time recovery enabled
  - Backup retention policy set

- [ ] **Performance**
  - Connection pooling configured
  - Query performance optimized
  - Slow query logging enabled
  - Database monitoring active

### 3. Security

- [ ] **Authentication & Authorization**
  - Password hashing verified (bcrypt)
  - Session management secure
  - JWT tokens properly signed
  - Role-based access control tested

- [ ] **Data Protection**
  - PII data encrypted at rest
  - Sensitive data scrubbing configured
  - HTTPS enforced
  - Secure cookies enabled

- [ ] **API Security**
  - Rate limiting active
  - API authentication required
  - Input validation on all endpoints
  - SQL injection prevention verified

- [ ] **Dependencies**
  - All dependencies updated
  - Security vulnerabilities scanned (`npm audit`)
  - No critical vulnerabilities
  - Dependency lock file committed

### 4. Performance

- [ ] **Frontend Optimization**
  - Images optimized (Next.js Image component)
  - Code splitting implemented
  - Lazy loading for heavy components
  - Bundle size analyzed

- [ ] **Caching**
  - Static assets cached
  - API responses cached (where appropriate)
  - CDN configured
  - Cache invalidation strategy in place

- [ ] **Core Web Vitals**
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1
  - Performance monitoring active

- [ ] **Database Queries**
  - N+1 queries eliminated
  - Proper indexes created
  - Query caching enabled
  - Connection pooling optimized

### 5. Monitoring & Logging

- [ ] **Error Tracking**
  - Sentry/PostHog configured
  - Error alerts set up
  - Source maps uploaded
  - Error grouping configured

- [ ] **Application Monitoring**
  - Health check endpoint (`/api/health`)
  - Uptime monitoring configured
  - Performance metrics tracked
  - Custom metrics defined

- [ ] **Logging**
  - Structured logging implemented
  - Log levels configured
  - Log aggregation set up
  - Log retention policy defined

- [ ] **Alerting**
  - Critical error alerts
  - Performance degradation alerts
  - Uptime alerts
  - Payment failure alerts

### 6. Content & Data

- [ ] **Git-based CMS**
  - `.content` repository configured
  - Content sync working
  - Git credentials secured
  - Content backup strategy

- [ ] **Media Assets**
  - Images optimized
  - CDN configured for media
  - Upload limits configured
  - Storage quota monitored

- [ ] **Internationalization**
  - All translations complete
  - RTL support tested (Arabic)
  - Locale detection working
  - Date/number formatting verified

### 7. API Documentation

- [ ] **Documentation System**
  - OpenAPI spec generated (`yarn generate-docs`)
  - Scalar UI accessible at `/api/reference`
  - All endpoints documented
  - Examples tested

- [ ] **API Standards**
  - Consistent naming conventions
  - Proper HTTP status codes
  - Error responses standardized
  - Rate limiting documented

### 8. Payment System

- [ ] **Stripe Configuration**
  - Production mode enabled
  - Webhooks configured and tested
  - Customer portal enabled
  - Invoice settings configured

- [ ] **LemonSqueezy Configuration** (if using)
  - Production credentials set
  - Webhooks configured
  - Tax compliance verified

- [ ] **Subscription Management**
  - Plan creation tested
  - Upgrade/downgrade flows tested
  - Cancellation flow tested
  - Refund process documented

### 9. Email System

- [ ] **Transactional Emails**
  - Welcome email tested
  - Password reset tested
  - Email verification tested
  - Subscription emails tested

- [ ] **Email Templates**
  - All templates reviewed
  - Branding consistent
  - Mobile responsive
  - Unsubscribe links working

- [ ] **Deliverability**
  - SPF records configured
  - DKIM configured
  - DMARC policy set
  - Sender reputation monitored

### 10. Testing

- [ ] **Functional Testing**
  - User registration flow
  - Login/logout flow
  - Password reset flow
  - Item submission flow
  - Payment flow
  - Admin functions

- [ ] **Cross-browser Testing**
  - Chrome tested
  - Firefox tested
  - Safari tested
  - Edge tested
  - Mobile browsers tested

- [ ] **Responsive Testing**
  - Mobile (320px - 480px)
  - Tablet (768px - 1024px)
  - Desktop (1280px+)
  - Large screens (1920px+)

- [ ] **Load Testing**
  - Expected traffic simulated
  - Database performance under load
  - API response times acceptable
  - No memory leaks

### 11. Compliance & Legal

- [ ] **Privacy**
  - Privacy policy published
  - Cookie consent implemented
  - GDPR compliance (if EU users)
  - Data export functionality

- [ ] **Terms of Service**
  - Terms of service published
  - User acceptance flow
  - Terms version tracking

- [ ] **Accessibility**
  - WCAG 2.1 AA compliance
  - Keyboard navigation working
  - Screen reader tested
  - Alt text for images

### 12. DevOps & Infrastructure

- [ ] **Deployment**
  - CI/CD pipeline configured
  - Automated tests in pipeline
  - Deployment rollback plan
  - Zero-downtime deployment

- [ ] **Scaling**
  - Auto-scaling configured
  - Load balancer set up
  - Database read replicas (if needed)
  - CDN for static assets

- [ ] **Disaster Recovery**
  - Backup restoration tested
  - Failover plan documented
  - Incident response plan
  - On-call rotation defined

- [ ] **Documentation**
  - Deployment guide updated
  - Runbook created
  - Architecture diagrams current
  - Team training completed

---

## Verification Commands

Run these commands to verify your production readiness:

### Security Audit

```bash
# Check for security vulnerabilities
npm audit --production

# Fix vulnerabilities
npm audit fix

# Check for outdated dependencies
npm outdated
```

### Build Verification

```bash
# Production build
npm run build

# Check build output
ls -lh .next/

# Analyze bundle size
npm run analyze
```

### Database Verification

```bash
# Check migrations status
npx drizzle-kit check

# Generate migration if needed
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit push
```

### API Documentation

```bash
# Generate OpenAPI spec
yarn generate-docs

# Validate documentation
yarn docs:validate

# Check documentation is up-to-date
git diff --exit-code public/openapi.json
```

### Environment Variables

```bash
# Verify all required variables are set
node scripts/check-env.js

# Test environment configuration
npm run test:env
```

---

## Deployment Workflow

### Pre-Deployment

1. **Code Review**
   - All PRs reviewed and approved
   - No merge conflicts
   - CI/CD pipeline passing

2. **Testing**
   - All tests passing
   - Manual QA completed
   - Staging environment tested

3. **Documentation**
   - Changelog updated
   - API docs regenerated
   - Deployment notes prepared

### Deployment Steps

1. **Backup**

   ```bash
   # Backup database
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
   ```

2. **Deploy**

   ```bash
   # Deploy to production
   git push production main

   # Or with Vercel
   vercel --prod
   ```

3. **Verify**

   ```bash
   # Check health endpoint
   curl https://your-domain.com/api/health

   # Check error logs
   tail -f logs/error.log
   ```

4. **Monitor**
   - Watch error rates in Sentry
   - Monitor performance in PostHog
   - Check uptime monitoring

### Post-Deployment

1. **Smoke Tests**
   - Homepage loads
   - User can login
   - Payment flow works
   - Admin panel accessible

2. **Monitoring**
   - Error rates normal
   - Response times acceptable
   - No memory leaks
   - Database performance stable

3. **Communication**
   - Notify team of deployment
   - Update status page
   - Announce new features (if any)

---

## Rollback Plan

If issues are detected after deployment:

### Quick Rollback

```bash
# Revert to previous deployment
git revert HEAD
git push production main

# Or with Vercel
vercel rollback
```

### Database Rollback

```bash
# Restore from backup
psql $DATABASE_URL < backup-YYYYMMDD.sql

# Or use point-in-time recovery
# (if supported by your hosting provider)
```

### Communication

1. Notify team immediately
2. Update status page
3. Communicate with affected users
4. Document incident for post-mortem

---

## Success Metrics

Track these metrics to ensure production health:

### Performance

- **Response Time**: < 200ms (p95)
- **Uptime**: > 99.9%
- **Error Rate**: < 0.1%
- **Core Web Vitals**: All green

### Business

- **User Registration**: Tracking working
- **Payment Success Rate**: > 95%
- **Email Delivery**: > 98%
- **API Availability**: > 99.9%

### Security

- **Failed Login Attempts**: Monitored
- **API Rate Limit Hits**: < 1%
- **Security Vulnerabilities**: 0 critical
- **SSL Certificate**: Valid and auto-renewing

---

## Next Steps

After successful deployment:

- [Monitoring & Analytics](./monitoring) - Set up comprehensive monitoring
- [Environment Variables](./environment-variables) - Manage production secrets
- [Docker Deployment](./docker) - Containerize your application
- [Support](../advanced-guide/support) - Get help when needed

## Resources

### Internal Documentation

- [Architecture Overview](../architecture/overview)
- [Tech Stack](../architecture/tech-stack)
- [API Documentation](../development/api-documentation)
- [Monitoring](./monitoring)

### External Resources

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Production Checklist](https://vercel.com/docs/concepts/deployments/overview)
- [PostgreSQL Production Best Practices](https://www.postgresql.org/docs/current/runtime-config.html)
- [Stripe Production Checklist](https://stripe.com/docs/keys#test-live-modes)

---

## Checklist Summary

Use this quick summary to track overall progress:

- [ ] **Environment**: All variables configured
- [ ] **Database**: Migrations applied, backups configured
- [ ] **Security**: Authentication, encryption, rate limiting
- [ ] **Performance**: Optimized, cached, monitored
- [ ] **Monitoring**: Error tracking, logging, alerts
- [ ] **Content**: CMS configured, media optimized, i18n complete
- [ ] **API**: Documentation generated, standards followed
- [ ] **Payment**: Stripe/LS configured, webhooks tested
- [ ] **Email**: Templates tested, deliverability configured
- [ ] **Testing**: Functional, cross-browser, responsive, load
- [ ] **Compliance**: Privacy, terms, accessibility
- [ ] **DevOps**: CI/CD, scaling, disaster recovery

**Total Progress**: ___/12 sections complete

---

:::tip Production Ready?
When all sections are checked, you're ready to deploy! Remember to monitor closely for the first 24-48 hours after deployment.
:::

:::warning Critical Items
Pay special attention to:

- Database backups
- Payment webhooks
- Error monitoring
- Security configuration
:::
