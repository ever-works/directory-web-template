---
id: features
title: Platform Features
sidebar_label: Features
sidebar_position: 3
---

# Platform Features

This document provides a comprehensive overview of all features available in the Ever Works platform, organized by functional area.

## User Authentication & Account Management

### User Registration

**Description**: Allows new users to create accounts on the platform.

**How it works**:

- Users can register via email/password or OAuth providers (Google, GitHub, Facebook, Twitter)
- Email verification is sent upon registration
- Password is hashed using bcrypt before storage
- Upon successful registration, a client profile is automatically created

**User flow**:

1. User clicks "Sign Up" on homepage
2. Chooses registration method (email or OAuth)
3. Fills in required information (name, email, password)
4. Receives verification email
5. Clicks verification link to activate account
6. Redirected to client dashboard

**Key files**: `/lib/auth/index.ts`, `/app/[locale]/auth/`

[Learn more about authentication setup →](/template/authentication/setup-guide)

---

### User Login

**Description**: Authenticates existing users to access their accounts.

**How it works**:

- Supports credential-based login (email/password)
- Supports OAuth login via multiple providers
- Creates JWT session token valid for 30 days
- Session refreshes automatically after 24 hours of activity
- Admins are redirected to admin portal; clients to client portal

**Security features**:

- Password hashing with bcrypt
- ReCAPTCHA integration for bot prevention
- Session invalidation on logout
- Automatic session expiration

**Key files**: `/lib/auth/index.ts`, `/app/[locale]/auth/signin/`

---

### Password Management

**Description**: Allows users to change or reset their passwords.

**Features**:

- **Change Password**: Authenticated users can update their password from settings
- **Forgot Password**: Users receive email with reset link
- **Reset Token**: Time-limited token for secure password reset

**How it works**:

1. User requests password reset
2. System generates secure token stored in `passwordResetTokens` table
3. Email sent with reset link containing token
4. User clicks link and enters new password
5. Token is invalidated after use

**Key files**: `/app/api/auth/change-password/`, `/lib/db/schema.ts`

---

## Item Listing & Discovery

### Item Browsing

**Description**: The core feature allowing users to browse and discover items on the platform.

**How it works**:

- Items are loaded from Git-based CMS (`.content` folder)
- Supports pagination with configurable page sizes
- Two view modes: "classic" grid and "alternative" layout
- Real-time filtering without page reload

**Display options**:

- Grid layout with thumbnails
- List layout with descriptions
- Sorting by popularity, date, or name

**Key files**: `/app/[locale]/(listing)/listing.tsx`, `/components/globals-client.tsx`

---

### Search & Filtering

**Description**: Enables users to find specific items using various criteria.

**Filter types**:

- **Text Search**: Full-text search across item names and descriptions
- **Category Filter**: Filter by single or multiple categories
- **Tag Filter**: Filter by tags assigned to items
- **Combined Filters**: Apply multiple filters simultaneously

**How it works**:

1. Filters are stored in URL parameters for shareability
2. `FilterProvider` context manages filter state
3. `FilterURLParser` syncs URL with filter state
4. Items are filtered server-side and returned to client

**User experience**:

- Filters persist in URL (bookmarkable/shareable)
- Real-time results update
- Clear all filters option

**Key files**: `/components/filter-provider.tsx`, `/components/filter-url-parser.tsx`

---

### Category Navigation

**Description**: Hierarchical organization of items into categories.

**Features**:

- Nested category structure (parent/child)
- Category pages with item listings
- Category icons and descriptions
- Breadcrumb navigation

**How it works**:

- Categories stored in `.content/categories/` as markdown files
- Support for multi-level hierarchy
- Can be enabled/disabled via admin settings
- Reorderable via admin panel

**Key files**: `/app/[locale]/categories/`, `/lib/services/category-git.service.ts`

---

### Tag System

**Description**: Flat taxonomy for cross-category item organization.

**Features**:

- Multiple tags per item
- Tag cloud display
- Tag-based filtering
- Can be enabled/disabled via admin settings

**How it works**:

- Tags stored in `.content/tags/` as markdown files
- Many-to-many relationship with items
- Clickable tags filter item listing

**Key files**: `/app/[locale]/tags/`, `/lib/services/tag-git.service.ts`

---

## Item Engagement Features

### Voting System

**Description**: Allows users to upvote or downvote items.

**How it works**:

1. User clicks vote button on item
2. System checks if user is authenticated
3. Checks for existing vote and updates or creates new vote
4. Vote count updates in real-time
5. Stores vote in `votes` table with timestamp

**Rules**:

- One vote per user per item
- Users can change vote direction
- Users can remove their vote
- Vote counts displayed on item cards

**Key files**: `/hooks/use-item-vote.ts`, `/app/api/items/[slug]/votes/`

---

### Rating System

**Description**: Users can rate items on a 1-5 star scale.

**How it works**:

- Rating is part of the comment system
- Each comment can include a rating
- Average rating calculated and displayed
- Rating distribution shown (how many 5-star, 4-star, etc.)

**Display**:

- Star icons showing average rating
- Rating count next to stars
- Rating breakdown in item detail page

**Key files**: `/hooks/use-item-rating.ts`, `/lib/db/schema.ts` (comments table)

---

### Comments System

**Description**: Users can leave comments and reviews on items.

**Features**:

- Text comments with optional rating
- Edit own comments
- Delete own comments
- Admin moderation capabilities
- Threaded replies (if enabled)

**How it works**:

1. User writes comment on item detail page
2. Optionally selects star rating (1-5)
3. Comment stored in `comments` table linked to user's client profile
4. Comments displayed in chronological or relevance order
5. Admin can delete inappropriate comments

**Moderation**:

- Admin can view all comments in admin panel
- Delete functionality for inappropriate content
- Report system triggers admin notification

**Key files**: `/hooks/use-comments.ts`, `/app/api/items/[slug]/comments/`

---

### Favorites System

**Description**: Users can save items to their favorites list for quick access.

**How it works**:

1. User clicks heart/favorite icon on item
2. Item added to `favorites` table
3. Favorites accessible from user's profile
4. Toggle action (click again to remove)

**Features**:

- Favorites list in client portal
- Quick unfavorite action
- Favorites count on items (optional)
- Export favorites list

**Key files**: `/hooks/use-favorites.ts`, `/app/api/favorites/`, `/app/[locale]/favorites/`

---

## Featured Items

**Description**: Admin-curated items displayed prominently on the homepage.

**How it works**:

1. Admin selects items to feature from admin panel
2. Sets display order for featured items
3. Featured items appear in dedicated section on homepage
4. Can set expiration date for featured status

**Features**:

- Manual ordering/ranking
- Separate from algorithmic popularity
- Highlighted display on homepage
- Configurable number of featured items

**Key files**: `/hooks/use-admin-featured-items.ts`, `/app/api/admin/featured-items/`

---

## Item Submission

**Description**: Allows users to submit new items to the platform.

**How it works**:

1. User navigates to submit page
2. Fills in item details (name, description, URL, logo)
3. Selects category and tags
4. Submits for review
5. Admin receives notification of new submission
6. Admin reviews and approves/rejects
7. Approved items appear on platform

**Form fields**:

- Item name (required)
- Description (required)
- Website URL
- Logo/image upload
- Category selection
- Tag selection
- Additional metadata

**Workflow states**:

- Draft → Pending Review → Approved/Rejected

**Key files**: `/app/[locale]/submit/`, `/app/api/admin/items/[id]/review/`

---

## Survey System

**Description**: Create and manage surveys for collecting user feedback.

**Types**:

- **Global surveys**: Available to all users
- **Item-specific surveys**: Attached to specific items

**Question types** (via SurveyJS):

- Multiple choice
- Text input
- Rating scales
- Matrix questions
- File upload

**Features**:

- Survey preview before publishing
- Response analytics
- Export to CSV/Excel
- Anonymous or authenticated responses

**Key files**: `/lib/services/survey.service.ts`, `/app/api/surveys/`

[Learn more about surveys →](/template/guides/survey-system)

---

## Subscription & Payment System

**Description**: Monetization through subscription-based access or premium features.

**Supported providers**:

- **Stripe**: Full subscription management, invoicing, customer portal
- **LemonSqueezy**: Alternative payment processor with tax compliance

**How it works**:

1. Plans defined in payment provider (Stripe/LemonSqueezy)
2. Users select plan on pricing page
3. Redirected to payment provider checkout
4. Webhook handles successful payment
5. Subscription record created in database
6. User gains access to premium features

**Key files**: `/app/api/stripe/`, `/app/api/lemonsqueezy/`

[Learn more about payment integration →](/template/payment)

---

## User Profile Management

**Description**: Users can manage their personal information and preferences.

**Basic Profile Information**:

- Name, email, avatar
- Bio and social links
- Notification preferences
- Privacy settings

**Features**:

- Profile editing
- Avatar upload
- Email change with verification
- Account deletion

**Key files**: `/app/[locale]/profile/`, `/app/api/profile/`

---

## Notification System

**Description**: System-generated notifications for important events.

**Notification types**:

- New comments on user's items
- Subscription updates
- Admin announcements
- Item approval/rejection

**Delivery channels**:

- In-app notifications
- Email notifications (via Resend/Novu)
- Push notifications (optional)

**Key files**: `/lib/services/notification.service.ts`, `/app/api/notifications/`

---

## Company Profiles

**Description**: Manage company entities associated with items.

**Features**:

- Company name, logo, description
- Link multiple items to a company
- Company detail pages
- Company directory

**Key files**: `/app/[locale]/companies/`, `/lib/services/company.service.ts`

---

## CRM Integration (Twenty CRM)

**Description**: Sync platform data with Twenty CRM for customer relationship management.

**Features**:

- Automatic contact creation from user registrations
- Sync user activities and interactions
- Track subscriptions and payments
- Custom field mapping
- Webhook-based synchronization

**Key files**: `/lib/services/crm.service.ts`, `/app/api/webhooks/crm/`

---

## Analytics & Reporting

**Description**: Track platform usage and generate reports.

**Analytics providers**:

- **PostHog**: Product analytics, feature flags, session recording
- **Sentry**: Error tracking, performance monitoring
- **Vercel Analytics**: Core Web Vitals

**Tracked events**:

- Page views
- Item interactions (views, votes, favorites)
- User registrations and logins
- Subscription events
- Error occurrences

**Key files**: `/lib/analytics/`, `/lib/error-tracking/`

---

## Internationalization (i18n)

**Description**: Multi-language support for the platform.

**Supported languages**: 13+ languages including English, French, Spanish, Chinese, German, Arabic (RTL), and more.

**Features**:

- Automatic locale detection
- URL-based locale switching
- RTL support for Arabic
- Date/number formatting per locale
- Pluralization rules

**Key files**: `/messages/`, `/lib/i18n/`, `/middleware.ts`

[Learn more about internationalization →](/template/internationalization)

---

## Content Management

**Description**: Git-based CMS for managing items, categories, and tags.

**How it works**:

- Content stored in `.content` folder
- Synced from external Git repository
- Markdown files with frontmatter
- Version control via Git
- Collaborative editing

**Content types**:

- Items (`.content/items/`)
- Categories (`.content/categories/`)
- Tags (`.content/tags/`)
- Pages (`.content/pages/`)

**Key files**: `/lib/services/*-git.service.ts`, `/lib/git/`

---

## Admin Dashboard

**Description**: Central hub for administrators to monitor and manage the platform.

**Dashboard widgets**:

- Total users, items, subscriptions
- Recent activity feed
- Pending submissions
- System health status
- Analytics overview

**Key features**:

- Real-time statistics
- Quick actions
- System notifications
- Performance metrics

**Key files**: `/app/[locale]/admin/dashboard/`

---

## User & Role Management

**Description**: Admin management of user accounts and permissions.

**User Management**:

- View all users
- Edit user profiles
- Suspend/activate accounts
- Reset passwords
- View user activity

**Role Management**:

- Admin role (full access)
- Client role (standard user)
- Custom roles (extensible)

**Key files**: `/app/[locale]/admin/users/`, `/lib/auth/roles.ts`

---

## Client Management

**Description**: Admin management of client profiles.

**Features**:

- View all client profiles
- Edit client information
- Link clients to companies
- View client submissions
- Manage client subscriptions

**Key files**: `/app/[locale]/admin/clients/`, `/app/api/admin/clients/`

---

## Content Moderation

**Description**: Admin tools for reviewing and moderating user-generated content.

**Item Review**:

- Approve/reject submitted items
- Edit item details
- Feature/unfeature items
- Delete items

**Comment Moderation**:

- View all comments
- Delete inappropriate comments
- Ban users for violations

**Key files**: `/app/[locale]/admin/moderation/`, `/app/api/admin/items/[id]/review/`

---

## Settings Management

**Description**: Platform-wide configuration options.

**Settings categories**:

- **General**: Site name, description, logo
- **Features**: Enable/disable features (categories, tags, voting, etc.)
- **Email**: SMTP configuration, email templates
- **Payment**: Stripe/LemonSqueezy API keys
- **Analytics**: PostHog, Sentry configuration
- **Security**: ReCAPTCHA, rate limiting

**Key files**: `/app/[locale]/admin/settings/`, `/lib/config/`

---

## Data Export

**Description**: Export platform data for analysis or backup.

**Export formats**:

- CSV
- JSON
- Excel

**Exportable data**:

- Users
- Items
- Comments
- Subscriptions
- Survey responses

**Key files**: `/app/api/admin/export/`

---

## Additional Features

### Email Templates

Customizable email templates for:

- Welcome emails
- Password reset
- Email verification
- Subscription confirmations
- Newsletter

[Learn more about email templates →](/template/guides/email-templates)

### Theme System

Multiple pre-built themes:

- EverWorks (default)
- Corporate
- Material
- Funny

[Learn more about theming →](/template/guides/theming)

### Dynamic Color System

Automatic color palette generation (shades 50-950) from base colors.

[Learn more about dynamic colors →](/template/guides/dynamic-colors)

### Responsive Testing

Cross-device testing guidelines and best practices.

[Learn more about testing →](/template/development/testing)

---

## Feature Summary

| Category | Features |
|----------|----------|
| **Authentication** | Registration, Login, OAuth, Password Reset |
| **Discovery** | Browsing, Search, Filtering, Categories, Tags |
| **Engagement** | Voting, Rating, Comments, Favorites |
| **Submission** | User submissions, Admin review, Approval workflow |
| **Monetization** | Stripe, LemonSqueezy, Subscriptions |
| **User Management** | Profiles, Notifications, Preferences |
| **Admin Tools** | Dashboard, Moderation, Settings, Export |
| **Integrations** | CRM, Analytics, Email, Surveys |
| **Customization** | Themes, Colors, i18n, Email templates |

---

## Next Steps

- [Tech Stack](./tech-stack) - Explore the technology stack
- [Architecture Overview](./overview) - Understand the architecture

## Resources

- [Development Setup](/template/development/local-setup) - Set up your environment
- [Deployment Guide](/template/deployment/overview) - Deploy to production
- [API Documentation](/template/development/api-documentation) - API reference
