---
id: user-profiles
title: Profils utilisateur et paramètres
sidebar_label: Profils utilisateur
sidebar_position: 18
---

# Profils utilisateur et paramètres

The Ever Works Template includes a user profile system with public profile pages, tabbed navigation, avatar management, social links, and profile display components. Users can showcase their about information, portfolio, skills, and submitted items through a structured profile interface.

## Architecture Overview

| Component | Path | Purpose |
|---|---|---|
| `ProfileContent` | `components/profile/profile-content.tsx` | Main profile page content with tab routing |
| `ProfileNavigation` | `components/profile/profile-navigation.tsx` | Sticky tab navigation bar |
| `ProfileHeader` | `components/profile/profile-header.tsx` | Profile cover, avatar, bio, and social links |
| `ProfileTag` | `components/profile/profile-tag.tsx` | Skill/interest tag component |
| `ProfileButton` | `components/header/profile-button.tsx` | Header profile menu trigger |
| `ProfileMenu` | `components/profile-button/profile-menu.tsx` | Dropdown profile menu |

## Profile Data Structure

```tsx
// lib/types/profile.ts
interface Profile {
  displayName: string;
  jobTitle: string;
  bio: string;
  avatar: string | null;
  location: string | null;
  company: string | null;
  website: string | null;
  socialLinks: SocialLink[];
}

interface SocialLink {
  platform: string;    // 'github', 'linkedin', 'twitter', etc.
  url: string;
  displayName: string;
}
```

## Profile Header

The `ProfileHeader` component renders the top section of a user profile with a gradient cover banner, avatar with edit button, and biographical information:

```tsx
import { ProfileHeader } from '@/components/profile/profile-header';

<ProfileHeader profile={userProfile} isOwnProfile={true} />
```

### Features

| Feature | Description |
|---|---|
| Cover banner | Gradient background using theme primary and secondary colors |
| Avatar | Circular image with ring border, responsive sizing (24x24 to 28x28) |
| Edit button | Shown only when `isOwnProfile` is true |
| Image fallback | Shows user icon placeholder on image load error |
| Social links | Renders platform-specific icons (GitHub, LinkedIn, Twitter) |
| Location & company | Displays with map pin and briefcase icons |
| Website link | External link with globe icon |

### Avatar Error Handling

The component includes robust image error handling:

```tsx
const [imageError, setImageError] = useState(false);

// Reset error when avatar URL changes
useEffect(() => {
  setImageError(false);
}, [profile.avatar]);

// Render fallback on error
{!imageError && profile.avatar ? (
  <Image src={profile.avatar} onError={() => setImageError(true)} />
) : (
  <FiUser className="w-8 h-8 text-gray-400" />
)}
```

### Social Platform Icons

| Platform | Icon |
|---|---|
| `github` | `FiGithub` |
| `linkedin` | `FiLinkedin` |
| `twitter` | `FiTwitter` |
| Other | `FiGlobe` (generic) |

## Profile Navigation

The `ProfileNavigation` component provides a sticky tabbed navigation:

```tsx
import { ProfileNavigation } from '@/components/profile/profile-navigation';

<ProfileNavigation
  activeTab="about"
  onTabChange={(tab) => setActiveTab(tab)}
/>
```

### Available Tabs

| Tab ID | Label | Icon |
|---|---|---|
| `about` | About | `FiUser` |
| `portfolio` | Portfolio | `FiBriefcase` |
| `skills` | Skills | `FiAward` |
| `submissions` | Submissions | `FiFileText` |

### Navigation Features

- **Sticky positioning** -- Stays at top when scrolling with blur backdrop
- **Mobile-friendly** -- Horizontal scroll on small screens
- **Focus visible** -- Ring indicator for keyboard navigation
- **Theme-aware** -- Active tab uses theme primary colors

## Profile Content

The `ProfileContent` component orchestrates the profile page by combining navigation and tab content:

```tsx
import { ProfileContent } from '@/components/profile/profile-content';

function ProfilePage({ profile }) {
  return <ProfileContent profile={profile} />;
}
```

### Tab Sections

| Section | Component | Content |
|---|---|---|
| About | `AboutSection` | Personal information, bio, details |
| Portfolio | `PortfolioSection` | Work samples and projects |
| Skills | `SkillsSection` | Skills and expertise tags |
| Submissions | `SubmissionsSection` | Items submitted by the user |

Each section is rendered with a consistent header:

```tsx
function ProfileSectionHeader({ title }) {
  return (
    <h2 className="text-2xl font-bold border-b border-gray-200 dark:border-gray-800 pb-2">
      {title}
    </h2>
  );
}
```

## Profile Button Components

### Header Profile Button

A button in the site header that opens the profile menu:

```tsx
import { ProfileButton } from '@/components/header/profile-button';

<ProfileButton />
```

### Profile Header Display

Shows the user's name and avatar in compact form:

```tsx
import { ProfileHeaderButton } from '@/components/profile-button/profile-header';

<ProfileHeaderButton user={currentUser} />
```

### Profile Menu

A dropdown menu with profile actions:

```tsx
import { ProfileMenu } from '@/components/profile-button/profile-menu';

<ProfileMenu
  user={currentUser}
  onSignOut={handleSignOut}
/>
```

## Responsive Design

The profile components are built with a mobile-first approach:

| Breakpoint | Behavior |
|---|---|
| Mobile | Centered avatar, stacked layout, horizontal tab scroll |
| Tablet+ | Left-aligned avatar, side-by-side layout |
| Desktop | Full-width card with maximum width constraints |

### Avatar Sizing

| Screen | Size |
|---|---|
| Mobile | 24x24 (96px) |
| Desktop | 28x28 (112px) |

## Theme Integration

The profile system uses the template's theme system:

- Cover banner gradient uses `--theme-primary` and `--theme-secondary` CSS variables
- Active tab states use theme primary colors
- Dark mode is fully supported with appropriate contrast ratios
- Hover states use theme-aware color transitions

## Layout Structure

```
ProfileHeader (cover + avatar + info card)
  |
  +-- Cover Banner (gradient)
  +-- Avatar (overlapping cover)
  +-- Info Card
      +-- Name & Title
      +-- Bio
      +-- Location / Company / Website
      +-- Social Links

ProfileContent
  |
  +-- ProfileNavigation (sticky tabs)
  +-- Active Section
      +-- AboutSection
      +-- PortfolioSection
      +-- SkillsSection
      +-- SubmissionsSection
```

## Key Files

| File | Path |
|---|---|
| Profile Content | `components/profile/profile-content.tsx` |
| Profile Navigation | `components/profile/profile-navigation.tsx` |
| Profile Header | `components/profile/profile-header.tsx` |
| Profile Tag | `components/profile/profile-tag.tsx` |
| Header Profile Button | `components/header/profile-button.tsx` |
| Profile Menu | `components/profile-button/profile-menu.tsx` |
| Profile Types | `lib/types/profile.ts` |