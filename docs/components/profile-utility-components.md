---
id: profile-utility-components
title: Profile Utility Components
sidebar_label: Profile Utilities
sidebar_position: 63
---

# Profile Utility Components

## Overview

The profile utility components handle user authentication UI, profile management, content reporting, and item favoriting. The `ProfileButton` is a composite dropdown component with lazy-loaded menu content, role-based menu items, and admin controls. `ReportButton` provides a modal-based content reporting flow, and `FavoriteButton` enables star/heart-based item bookmarking with feature flag gating.

**Source:** `components/profile-button/`, `components/report-button.tsx`, `components/favorite-button.tsx`

## Architecture

```
components/
  profile-button/
    index.tsx           # ProfileButton root + ProfileAvatar
    profile-menu.tsx    # Lazy-loaded dropdown menu container
    profile-header.tsx  # User info section in dropdown
    menu-items.tsx      # Role-based menu item lists
    logout-button.tsx   # Sign-out action button
  report-button.tsx     # Content reporting modal
  favorite-button.tsx   # Star/heart favorite toggle
```

**Data Flow:**

1. `ProfileButton` reads `next-auth` session via `useSession()`
2. On click, it lazy-loads `ProfileMenu` using `React.lazy` + `Suspense`
3. `ProfileMenu` renders `ProfileHeader`, `MenuItems`, and `LogoutButton`
4. `MenuItems` checks user role to render admin or standard menu items
5. `ReportButton` opens a HeroUI `Modal` and submits via POST to `/api/reports`
6. `FavoriteButton` checks the `favorites` feature flag and toggles favorite state via API

## Components

### ProfileButton

Root component rendering a clickable avatar that opens a dropdown menu.

```tsx
import { ProfileButton } from "@/components/profile-button";

<ProfileButton />
```

Features:
- Reads auth session from `next-auth`
- Shows login button when unauthenticated
- Renders `ProfileAvatar` with user image or initials
- Admin indicator badge (shield icon) for admin users
- Online status dot (green indicator)
- Keyboard navigation support (Escape to close)
- Lazy-loads `ProfileMenu` on first open via `React.lazy` with `Suspense` fallback

### ProfileAvatar

Avatar display with admin badge and online status.

```tsx
// Internal component, rendered by ProfileButton
<ProfileAvatar
  user={session.user}
  showAdminBadge={true}
  showOnlineStatus={true}
  size="md"
/>
```

- Uses `next/image` for user avatar with fallback to initials
- Admin badge: Small shield icon overlay at bottom-right
- Online status: Green dot at top-right corner

### ProfileMenu

Dropdown menu container with scrollable content.

```tsx
// Lazy-loaded by ProfileButton
<ProfileMenu user={session.user} onClose={closeMenu} />
```

Renders three sections:
1. `ProfileHeader` -- User avatar, name, email, role badge
2. `MenuItems` -- Navigation links based on user role
3. `LogoutButton` -- Sign-out action

### ProfileHeader

User information section at the top of the profile dropdown.

```tsx
<ProfileHeader user={session.user} />
```

Displays:
- Large avatar with fallback
- User display name
- Email address
- Role badge (admin/user) with colored styling
- Online status indicator

### MenuItems

Role-based menu item lists.

```tsx
<MenuItems user={session.user} onClose={closeMenu} />
```

**Admin menu items** (12+ items):
- Dashboard, Items Management, Categories, Tags, Featured Items, Sponsors, Users, Analytics, Settings, Newsletter, Reports, Import/Export

**User menu items** (4 items):
- My Profile, My Favorites, My Submissions, Settings

Each item renders as a navigation link with an icon and label.

### LogoutButton

Sign-out button with loading state.

```tsx
<LogoutButton />
```

- Calls `signOut()` from `next-auth/react`
- Shows spinner during sign-out process
- Styled as a danger/destructive action

### ReportButton

Modal-based content reporting component.

```tsx
import ReportButton from "@/components/report-button";

<ReportButton itemSlug="tool-name" itemName="Tool Name" />
```

Report flow:
1. User clicks the report icon button
2. Modal opens with a dropdown for selecting reason: Spam, Harassment, Inappropriate Content, Other
3. Optional text area for additional details
4. Submit sends POST to `/api/reports` with item slug, reason, and details
5. Success/error toast notification via `sonner`

### FavoriteButton

Toggle button for bookmarking items with star or heart icons.

```tsx
import { FavoriteButton } from "@/components/favorite-button";

<FavoriteButton
  itemSlug="tool-name"
  itemName="Tool Name"
  itemIconUrl="/icons/tool.png"
  itemCategory="Productivity"
  variant="star"
  size="md"
  className="opacity-0 group-hover:opacity-100"
  hideIndicatorInSimilarProducts={false}
/>
```

Features:
- Two visual variants: `star` (filled/outline star) and `heart` (filled/outline heart)
- Three sizes: `sm`, `md`, `lg`
- Gated by `favorites` feature flag via `useFeatureFlagsWithSimulation()`
- Requires authenticated session; triggers login modal when clicked while unauthenticated
- Optimistic UI updates with API sync
- Click event stops propagation to prevent parent link navigation

## Props Reference

### FavoriteButtonProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `itemSlug` | `string` | required | Item URL slug for API calls |
| `itemName` | `string` | required | Item display name |
| `itemIconUrl` | `string` | `undefined` | Item icon for display |
| `itemCategory` | `string` | `undefined` | Item category name |
| `variant` | `"star" \| "heart"` | `"star"` | Icon style |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Button size |
| `className` | `string` | `undefined` | Additional CSS classes |
| `hideIndicatorInSimilarProducts` | `boolean` | `false` | Hide in similar products context |

### ReportButton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `itemSlug` | `string` | required | Item slug for the report |
| `itemName` | `string` | required | Item name shown in modal |

### ProfileButton Props

`ProfileButton` accepts no external props. It reads all data from the `next-auth` session context.

## Styling

- **ProfileButton**: Circular avatar button with `ring-2 ring-transparent hover:ring-theme-primary` focus ring
- **Admin badge**: `bg-blue-500 text-white` small shield icon with `w-4 h-4 rounded-full`
- **Online status**: `bg-green-500 w-3 h-3 rounded-full` absolute positioned dot
- **ProfileMenu**: `bg-white dark:bg-gray-800` dropdown with `shadow-xl rounded-2xl`, max-height with scroll
- **Role badge**: Admin uses `bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`, User uses `bg-gray-100 text-gray-700`
- **Menu items**: `hover:bg-gray-50 dark:hover:bg-gray-700/50` with left icon and label
- **LogoutButton**: `text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`
- **ReportButton**: Icon button with `text-gray-400 hover:text-red-500`, modal uses HeroUI `Modal` components
- **FavoriteButton**: Star variant uses `text-amber-500` (filled) / `text-gray-400` (outline); Heart variant uses `text-red-500` (filled) / `text-gray-400` (outline)
- Favorite button opacity transitions: `opacity-0 group-hover:opacity-100 transition-opacity duration-300`

## Usage Examples

### Profile button in header

```tsx
<header className="flex items-center justify-end gap-4">
  <NavigationControls />
  <ProfileButton />
</header>
```

### Favorite button on item card

```tsx
{session?.user?.id && (
  <FavoriteButton
    itemSlug={item.slug}
    itemName={item.name}
    itemIconUrl={item.icon_url}
    itemCategory={item.category?.name}
    variant="star"
    size="sm"
    className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
  />
)}
```

### Report button on item detail page

```tsx
<div className="flex items-center gap-2">
  <ShareButton />
  <ReportButton itemSlug={item.slug} itemName={item.name} />
</div>
```

## Related Components

- **[Item Utilities](./item-utility-components.md)** -- `Item` card component that includes `FavoriteButton`
- **[Navigation](./navigation-components.md)** -- `NavigationControls` placed alongside `ProfileButton` in header
- **[Utility Display](./utility-display-components.md)** -- Settings and theme controls in the same header area
