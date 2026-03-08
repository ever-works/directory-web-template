---
id: profile-components
title: Profile Components
sidebar_label: Profile
sidebar_position: 5
---

# Profile Components

The profile components render user profile pages with a cover banner, avatar, personal information, social links, and tabbed content sections for about, portfolio, skills, and submissions.

## Architecture Overview

```
template/components/profile/
  index.ts                         # Barrel exports
  profile-content.tsx              # Tabbed content container
  profile-header.tsx               # Cover banner, avatar, info card
  profile-navigation.tsx           # Tab navigation bar
  profile-tag.tsx                  # Profile tag badge component
  sections/
    about-section.tsx              # About/bio section
    portfolio-section.tsx          # Portfolio showcase section
    skills-section.tsx             # Skills and expertise display
    submissions-section.tsx        # User's directory submissions
```

## Exports

The `index.ts` barrel provides all public exports:

```typescript
export { ProfileHeader } from "./profile-header";
export { ProfileNavigation } from "./profile-navigation";
export { ProfileContent } from "./profile-content";
export { AboutSection } from "./sections/about-section";
export { PortfolioSection } from "./sections/portfolio-section";
export { SkillsSection } from "./sections/skills-section";
export { SubmissionsSection } from "./sections/submissions-section";
```

## ProfileHeader

The hero section of the profile page, featuring a gradient cover banner, overlapping circular avatar, and a card with user details.

```tsx
import { ProfileHeader } from '@/components/profile';

<ProfileHeader
  profile={userProfile}
  isOwnProfile={true}
/>
```

### ProfileHeaderProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `profile` | `Profile` | required | User profile data object |
| `isOwnProfile` | `boolean` | `false` | Show edit controls when viewing own profile |

### Profile Data Shape

The component expects a `Profile` type from `@/lib/types/profile`:

| Property | Type | Description |
|----------|------|-------------|
| `displayName` | `string` | User's display name |
| `jobTitle` | `string` | Professional title |
| `bio` | `string` | Short biography text |
| `avatar` | `string` | URL to avatar image |
| `location` | `string` | Geographic location |
| `company` | `string` | Company name |
| `website` | `string` | Personal website URL |
| `socialLinks` | `SocialLink[]` | Array of social platform links |

### Social Links

Each social link has the shape:

```typescript
interface SocialLink {
  platform: string;   // "github", "linkedin", "twitter", or other
  url: string;        // Full URL
  displayName: string; // Display text
}
```

Platform icons are mapped automatically:

| Platform | Icon |
|----------|------|
| `github` | `FiGithub` |
| `linkedin` | `FiLinkedin` |
| `twitter` | `FiTwitter` |
| (default) | `FiGlobe` |

### Visual Design

- **Cover Banner**: Gradient from `--theme-primary` to `--theme-secondary` CSS variables with dark overlay
- **Avatar**: 24x28px circular image with white ring, shadow, and error fallback (shows `FiUser` icon)
- **Info Card**: Positioned to overlap the cover with shadow and border-0 styling
- **Edit Button**: Shown only for `isOwnProfile`, positioned on the avatar with `FiEdit2` icon

Avatar error handling resets when the avatar URL changes via a `useEffect` dependency.

## ProfileContent

The tabbed content area below the header. Manages tab state and renders the appropriate section.

```tsx
import { ProfileContent } from '@/components/profile';

<ProfileContent profile={userProfile} />
```

### ProfileContentProps

| Prop | Type | Description |
|------|------|-------------|
| `profile` | `Profile` | User profile data |

### Available Tabs

| Tab ID | Label | Component |
|--------|-------|-----------|
| `"about"` | About | `AboutSection` |
| `"portfolio"` | Portfolio | `PortfolioSection` |
| `"skills"` | Skills & Expertise | `SkillsSection` |
| `"submissions"` | Submissions | `SubmissionsSection` |

Each section is wrapped with a `ProfileSectionHeader` that renders a styled `h2` with a bottom border.

## ProfileNavigation

Tab navigation bar for switching between profile sections.

```tsx
import { ProfileNavigation } from '@/components/profile';

<ProfileNavigation
  activeTab="about"
  onTabChange={(tab) => setActiveTab(tab)}
/>
```

### ProfileNavigationProps

| Prop | Type | Description |
|------|------|-------------|
| `activeTab` | `string` | Currently active tab ID |
| `onTabChange` | `(tab: string) => void` | Tab selection callback |

## Profile Sections

### AboutSection

Displays the user's detailed biography and personal information. Renders formatted text content from the profile data.

```tsx
<AboutSection profile={profile} />
```

### PortfolioSection

Showcases the user's portfolio items with images, descriptions, and links. Useful for creators and freelancers to display their work.

```tsx
<PortfolioSection profile={profile} />
```

### SkillsSection

Displays the user's skills and areas of expertise, typically rendered as tags or badges with optional proficiency indicators.

```tsx
<SkillsSection profile={profile} />
```

### SubmissionsSection

Lists the directory items that the user has submitted. Shows submission status, dates, and links to the items.

```tsx
<SubmissionsSection profile={profile} />
```

## ProfileTag

A badge component for displaying tags on profile pages with consistent styling.

## Styling Patterns

The profile components follow these design conventions:

- **Responsive Layout**: Mobile-first with `md:` breakpoints for desktop
- **Centering**: Avatar centered on mobile, left-aligned on desktop via `left-1/2 md:left-12`
- **Hover Effects**: Social link buttons with backdrop blur and shadow transitions
- **Dark Mode**: Full support through `dark:` Tailwind variants
- **Glass-morphism**: Social link buttons use `bg-white/80 dark:bg-gray-800/80 backdrop-blur-xs`

## Integration Example

```tsx
import { ProfileHeader, ProfileContent } from '@/components/profile';
import type { Profile } from '@/lib/types/profile';

function ProfilePage({ profile, isOwner }: { profile: Profile; isOwner: boolean }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ProfileHeader profile={profile} isOwnProfile={isOwner} />
      <div className="py-8">
        <ProfileContent profile={profile} />
      </div>
    </div>
  );
}
```

## Icon Dependencies

Profile components use `react-icons/fi` (Feather Icons) for all icons:

| Icon | Usage |
|------|-------|
| `FiEdit2` | Edit profile button |
| `FiMapPin` | Location display |
| `FiBriefcase` | Company display |
| `FiGlobe` | Website link and fallback social icon |
| `FiGithub` | GitHub social link |
| `FiLinkedin` | LinkedIn social link |
| `FiTwitter` | Twitter social link |
| `FiUser` | Avatar fallback |
