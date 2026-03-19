---
id: tech-stack
title: Technology Stack
sidebar_label: Tech Stack
sidebar_position: 2
---

# Technology Stack

This document provides a comprehensive overview of all technologies used in the Ever Works.

## System Requirements

- **Node.js**: 20.19.0 or higher
- **PostgreSQL**: 14.0 or higher
- **Package Manager**: npm, pnpm, yarn, or bun

## Frontend Technologies {#frontend}

### Core Framework

- **[Next.js 15.4.7](https://nextjs.org/)** - React framework with App Router
  - Server-side rendering (SSR)
  - Static site generation (SSG)
  - Incremental static regeneration (ISR)
  - Server Actions for mutations
  - Built-in optimization
  - File-based routing with `[locale]` dynamic segments

- **[React 19.1.0](https://react.dev/)** - UI library
  - Latest features and improvements
  - Concurrent rendering
  - Automatic batching
  - Suspense for data fetching
  - Server Components by default

### Language & Type Safety

- **[TypeScript 5.x](https://www.typescriptlang.org/)** - Static type checking
  - Strict mode enabled
  - Path mapping configured (`@/` alias)
  - Custom type definitions
  - Full type inference

### Styling & UI

- **[Tailwind CSS 3.4](https://tailwindcss.com/)** - Utility-first CSS framework
  - Custom design system
  - Dark mode support
  - Responsive design utilities
  - JIT compilation
  - Dynamic color system (50-950 shades)

- **[HeroUI React 2.6](https://www.heroui.com/)** - Modern React components
  - Accessible components
  - Customizable themes
  - TypeScript support
  - Tree-shakeable

- **[Radix UI](https://www.radix-ui.com/)** - Unstyled accessible components
  - Headless UI primitives
  - Full keyboard navigation
  - ARIA compliant
  - Composable

- **[Framer Motion 12.x](https://www.framer.com/motion/)** - Animation library
  - Declarative animations
  - Gesture support
  - Layout animations
  - SVG animations

### Rich Text Editing

- **[TipTap](https://tiptap.dev/)** - Headless rich text editor
  - Extensible architecture
  - Markdown support
  - Collaborative editing ready
  - Custom extensions

### State Management

- **[Zustand 5](https://zustand-demo.pmnd.rs/)** - Lightweight state management
  - Simple API
  - TypeScript support
  - Minimal boilerplate
  - DevTools integration
  - Middleware support

- **[TanStack React Query 5](https://tanstack.com/query/)** - Server state management
  - Caching and synchronization
  - Background updates
  - Optimistic updates
  - Error handling
  - Infinite queries

### Data Visualization

- **[TanStack Table](https://tanstack.com/table/)** - Headless table library
  - Sorting, filtering, pagination
  - Column resizing
  - Row selection
  - TypeScript support

- **[TanStack Virtual](https://tanstack.com/virtual/)** - Virtualization library
  - Virtual scrolling
  - Performance optimization
  - Dynamic row heights

### Form Handling

- **[React Hook Form 7](https://react-hook-form.com/)** - Performant forms
  - Minimal re-renders
  - Built-in validation
  - TypeScript support
  - Easy integration
  - Field arrays support

- **[Zod 4](https://zod.dev/)** - Schema validation
  - TypeScript-first
  - Runtime validation
  - Type inference
  - Error handling
  - Custom validators

## Backend Technologies

### Database & ORM

- **[PostgreSQL 14+](https://www.postgresql.org/)** - Relational database
  - ACID compliance
  - Advanced features (JSONB, full-text search)
  - Excellent performance
  - JSON support
  - Triggers and stored procedures

- **[Drizzle ORM 0.40.0](https://orm.drizzle.team/)** - TypeScript ORM
  - Type-safe queries
  - Minimal overhead
  - SQL-like syntax
  - Migration system
  - Relation queries
  - Prepared statements

- **[Supabase](https://supabase.com/)** - Backend-as-a-Service (optional)
  - Hosted PostgreSQL
  - Real-time subscriptions
  - Row-level security
  - Built-in auth
  - Storage buckets
  - Edge functions

### Authentication

- **[NextAuth.js 5.0 (beta)](https://authjs.dev/)** - Authentication library
  - Multiple OAuth providers (Google, GitHub, Facebook, Twitter)
  - JWT and database sessions
  - TypeScript support
  - Security best practices
  - Credential-based auth
  - Session management

- **[Supabase Auth](https://supabase.com/auth)** - Alternative auth solution
  - Built-in user management
  - Social providers
  - Email verification
  - Password reset
  - Magic links
  - Phone auth

### Dual Auth Architecture

Ever Works supports **both NextAuth.js and Supabase Auth** simultaneously:

- NextAuth for traditional OAuth flows
- Supabase Auth for real-time features
- Unified session management
- Seamless provider switching

## Content Management

### Git-based CMS

- **[isomorphic-git](https://isomorphic-git.org/)** - Git operations in JavaScript
  - Clone repositories
  - Pull changes
  - Commit files
  - Branch management

- **[js-yaml](https://github.com/nodeca/js-yaml)** - YAML parser
  - Parse YAML files
  - Generate YAML
  - Schema validation
  - Error handling

### File Processing

- **[gray-matter](https://github.com/jonschlinkert/gray-matter)** - Frontmatter parser
  - Parse markdown files
  - Extract metadata
  - Support multiple formats

## Internationalization

- **[next-intl 3.26](https://next-intl-docs.vercel.app/)** - i18n for Next.js
  - App Router support
  - Type-safe translations
  - Pluralization
  - Date/number formatting

### Supported Languages

Ever Works supports **13+ languages** out of the box:

- 🇬🇧 English (en)
- 🇫🇷 French (fr)
- 🇪🇸 Spanish (es)
- 🇨🇳 Chinese (zh)
- 🇩🇪 German (de)
- 🇸🇦 Arabic (ar) - with RTL support
- 🇮🇹 Italian (it)
- 🇵🇹 Portuguese (pt)
- 🇯🇵 Japanese (ja)
- 🇰🇷 Korean (ko)
- 🇷🇺 Russian (ru)
- 🇳🇱 Dutch (nl)
- 🇵🇱 Polish (pl)

[Learn more about internationalization →](/internationalization)

## Analytics & Monitoring

### Analytics

- **[PostHog](https://posthog.com/)** - Product analytics
  - Event tracking
  - User identification
  - Feature flags
  - Session recording

### Error Tracking

- **[Sentry 9.38](https://sentry.io/)** - Error monitoring
  - Error tracking
  - Performance monitoring
  - Release tracking
  - User feedback

### Performance

- **[Vercel Analytics](https://vercel.com/analytics)** - Web vitals
  - Core Web Vitals
  - Real user monitoring
  - Performance insights

## Payment Processing

### Payment Providers

- **[Stripe](https://stripe.com/)** - Comprehensive payment platform
  - One-time payments
  - Recurring subscriptions
  - Multiple payment methods (cards, Apple Pay, Google Pay)
  - Multiple currencies
  - Advanced analytics and reporting
  - Customer portal
  - Invoicing
  - Webhooks

- **[LemonSqueezy](https://lemonsqueezy.com/)** - Merchant of record platform
  - Automatic tax compliance
  - Global payments (135+ countries)
  - Subscriptions
  - Fraud prevention
  - Simplified setup
  - Affiliate program support

[Learn more about payment integration →](/payment)

### Payment SDKs

- **[@stripe/stripe-js 7.3.0](https://github.com/stripe/stripe-js)** - Stripe client SDK
- **[stripe 18.1.0](https://github.com/stripe/stripe-node)** - Stripe server SDK
- **[@lemonsqueezy/lemonsqueezy.js 3.0.0](https://github.com/lmsqueezy/lemonsqueezy.js)** - LemonSqueezy SDK

## CRM Integration

- **[Twenty CRM](https://twenty.com/)** - Open-source CRM
  - Customer relationship management
  - Contact synchronization
  - Activity tracking
  - Custom fields
  - API integration
  - Self-hosted or cloud

### CRM Features

- Automatic contact creation from user registrations
- Sync user activities and interactions
- Track subscriptions and payments
- Custom field mapping
- Webhook-based synchronization

## Email Services

- **[Resend 4](https://resend.com/)** - Email API
  - Transactional emails
  - Template support
  - Delivery tracking
  - Developer-friendly

- **[Novu 2.6](https://novu.co/)** - Notification infrastructure
  - Multi-channel notifications
  - Template management
  - Workflow automation
  - Analytics

## Survey System

- **[SurveyJS](https://surveyjs.io/)** - Survey and form builder
  - Multiple question types (multiple choice, text, rating, matrix)
  - Conditional logic
  - Survey preview
  - Response analytics
  - Export to CSV/Excel
  - Anonymous or authenticated responses
  - Custom themes

[Learn more about surveys →](/guides/survey-system)

## Security

### Authentication Security

- **[bcryptjs 3](https://github.com/dcodeIO/bcrypt.js)** - Password hashing
  - Secure password storage
  - Salt generation
  - Timing attack protection

- **[jose 6](https://github.com/panva/jose)** - JWT operations
  - Token generation
  - Token verification
  - Encryption support

### Input Validation

- **[React Google reCAPTCHA 3](https://github.com/dozoisch/react-google-recaptcha)** - Bot protection
  - Form protection
  - Invisible reCAPTCHA
  - Score-based verification

## Development Tools

### Code Quality

- **[ESLint 9](https://eslint.org/)** - JavaScript linter
  - Code quality rules
  - Custom configurations
  - TypeScript support
  - Next.js rules

- **[Prettier 3.5](https://prettier.io/)** - Code formatter
  - Consistent formatting
  - Editor integration
  - Custom rules

### Build Tools

- **[PostCSS 8](https://postcss.org/)** - CSS processor
  - Tailwind CSS processing
  - Autoprefixer
  - CSS optimization

- **[Webpack 5](https://webpack.js.org/)** - Module bundler (via Next.js)
  - Code splitting
  - Tree shaking
  - Asset optimization

## Deployment & Infrastructure

### Hosting Platforms

- **[Vercel](https://vercel.com/)** - Recommended platform
  - Next.js optimization
  - Edge functions
  - Global CDN
  - Automatic deployments

- **[Netlify](https://netlify.com/)** - Alternative platform
  - Static site hosting
  - Serverless functions
  - Form handling

### Database Hosting

- **[Supabase](https://supabase.com/)** - Managed PostgreSQL
  - Automatic backups
  - Connection pooling
  - Real-time features

- **[PlanetScale](https://planetscale.com/)** - Serverless MySQL
  - Branching workflow
  - Automatic scaling
  - Schema management

- **[Neon](https://neon.tech/)** - Serverless PostgreSQL
  - Instant branching
  - Autoscaling
  - Point-in-time recovery

## Package Management

- **[pnpm](https://pnpm.io/)** - Fast, disk space efficient package manager
  - Faster installations
  - Shared dependencies
  - Strict dependency resolution

- **[npm](https://npmjs.com/)** - Default Node.js package manager
  - Widely supported
  - Large ecosystem
  - Security auditing

## Version Requirements

### Node.js

- **Minimum**: Node.js 20.19.0
- **Recommended**: Latest LTS version
- **Package Manager**: npm 10+, yarn 1.13+, or pnpm 8+

### Browser Support

- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **No IE support**: Modern features only

## Performance Considerations

### Bundle Size

- **Core bundle**: ~200KB gzipped
- **Code splitting**: Route-based and component-based
- **Tree shaking**: Unused code elimination
- **Dynamic imports**: Lazy loading for non-critical components

### Runtime Performance

- **React 19**: Concurrent features for better UX
- **Next.js 15**: Optimized rendering and caching
- **Image optimization**: WebP/AVIF support with lazy loading
- **Font optimization**: Self-hosted fonts with preloading

### Database Performance

- **Connection pooling**: Efficient database connections
- **Query optimization**: Indexed queries and efficient joins
- **Caching**: Application-level and database-level caching

## Security Stack

### Application Security

- **HTTPS**: Enforced in production
- **CSRF protection**: Built into NextAuth.js
- **XSS protection**: Content sanitization
- **SQL injection**: Parameterized queries via Drizzle

### Infrastructure Security

- **Environment variables**: Secure secret management
- **Rate limiting**: API endpoint protection
- **Input validation**: Zod schema validation
- **File upload security**: Type and size restrictions

## Monitoring Stack

### Application Monitoring

- **Error tracking**: Sentry for error monitoring
- **Performance**: Core Web Vitals tracking
- **Analytics**: PostHog for user behavior
- **Uptime**: External monitoring services

### Infrastructure Monitoring

- **Database**: Connection and query monitoring
- **API**: Response time and error rate tracking
- **CDN**: Cache hit rates and performance
- **Deployment**: Build and deployment monitoring

## Future Considerations

### Planned Upgrades

- **React 19**: Stable release adoption
- **Next.js 16**: When available
- **TypeScript 5.x**: Latest features
- **Node.js 22**: LTS upgrade

### Potential Additions

- **GraphQL**: For complex data requirements
- **WebSockets**: Real-time features
- **PWA**: Progressive web app features
- **Edge computing**: Enhanced performance

## Technology Decision Matrix

| Requirement | Technology Choice | Rationale |
|-------------|-------------------|-----------|
| **Framework** | Next.js 15 | Best-in-class React framework with App Router |
| **Database** | PostgreSQL + Drizzle | Type-safe, performant, scalable |
| **Auth** | NextAuth.js + Supabase | Dual provider flexibility |
| **Styling** | Tailwind CSS + HeroUI | Rapid development, consistent design |
| **State** | Zustand + React Query | Simple client state + powerful server state |
| **Forms** | React Hook Form + Zod | Performance + type safety |
| **i18n** | next-intl | Best Next.js App Router support |
| **Payment** | Stripe + LemonSqueezy | Flexibility + global compliance |
| **Email** | Resend + Novu | Developer-friendly + multi-channel |
| **Analytics** | PostHog + Sentry | Product insights + error tracking |

## Next Steps

- [Architecture Overview](./overview) - Understand the system architecture
- [Platform Features](./features) - Explore all platform features
- [Development Setup](/development/local-setup) - Set up your environment

## Resources

### Official Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)

### Community Resources

- [Next.js GitHub](https://github.com/vercel/next.js)
- [React GitHub](https://github.com/facebook/react)
- [Tailwind GitHub](https://github.com/tailwindlabs/tailwindcss)
- [Ever Works Community](https://github.com/ever-co/ever-works)
