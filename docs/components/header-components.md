---
id: header-components
title: Header Components
sidebar_label: Header Components
sidebar_position: 31
---

# Header Components

The main application header lives in `components/header/` and provides responsive navigation with feature-flag-driven link visibility, profile actions, theme switching, and a "More" dropdown menu.

## File Structure

```
components/header/
  index.tsx           # Main Header component and ChevronDown icon
  avatar.tsx          # Avatar component with image fallback
  more-menu.tsx       # "More" dropdown (desktop) and collapsible (mobile)
  profile-button.tsx  # Re-exports ProfileButton
  theme-switch.tsx    # Theme switcher popover with live previews
```

## Header (Main Component)

The default export renders a HeroUI `Navbar` with three layout modes:

- **Desktop (lg+):** Three-column flex layout with brand on the left, navigation links in the center, and profile/settings on the right.
- **Mobile (below lg):** Hamburger toggle on the left, centered brand, profile button on the right. The `NavbarMenu` slides out with all navigation items.

### NavigationItem Interface

```ts
interface NavigationItem {
    key: string;
    label: string;
    href: string;
    translationKey?: string;
    translationNamespace?: "common" | "listing" | "survey";
    isExternal?: boolean;
}
```

### Feature-Flag Filtering

Navigation items are filtered dynamically based on:

- **Collections:** Hidden when no collections exist.
- **Categories:** Hidden when categories are disabled or absent.
- **Tags:** Hidden when tags are disabled or absent.
- **Favorites:** Hidden when the feature flag is off or the user is not authenticated.
- **Surveys:** Hidden when surveys are disabled or no global surveys exist.
- **Pricing / Submit:** Controlled by `headerSettings.pricingEnabled` and `headerSettings.submitEnabled`.
- **Custom Items:** Added from `config.custom_header`, supporting both internal and external links.

While navigation data loads, a `HeaderNavSkeleton` renders animated placeholder bars.

### Active Link Detection

```ts
const isActiveLink = useCallback((href: string): boolean => {
    const cleanedPathname = pathname.split("?")[0];
    const cleanedHref = href.split("?")[0];
    if (cleanedHref === "/") {
        return cleanedPathname === "/" || cleanedPathname === "";
    }
    if (cleanedHref === "#") return false;
    return cleanedPathname === cleanedHref
        || cleanedPathname.startsWith(cleanedHref + "/");
}, [pathname]);
```

Active links receive a themed underline dot indicator via the `STYLES.linkActive` class string.

---

## Avatar

Renders a user avatar with automatic fallback to initials when the image fails to load or is not provided.

### Props

```ts
interface AvatarProps {
    src?: string | null;
    alt?: string;
    fallback?: string;
    size?: "sm" | "md" | "lg";
    className?: string;
}
```

Sizes map to Tailwind dimension classes:

| Size | Classes |
|---|---|
| `sm` | `h-8 w-8 text-xs` |
| `md` | `h-10 w-10 text-sm` |
| `lg` | `h-12 w-12 text-base` |

When an image is available and valid, `next/image` is used with `onError` to detect load failures. The fallback state renders a gradient circle with the first character of the alt text.

---

## MoreMenu

A navigation dropdown with links to blog, help, docs, API docs, about, and contacts. It renders differently depending on the `inline` prop.

### Props

```ts
interface MoreMenuProps {
    inline?: boolean;
    onItemClick?: () => void;
}
```

- **Desktop (inline=false):** Uses Radix UI `DropdownMenu` with a hover trigger. A 300ms timeout on `pointerLeave` prevents accidental closing.
- **Mobile (inline=true):** Renders a collapsible section with a toggle button and animated chevron.

Both variants translate labels via `next-intl` and support internal links (`next/link`) and external links (`target="_blank"`).

---

## ThemeSwitcher

A theme selection popover that displays color-coded previews and descriptions for each available theme.

### Props

```ts
interface ThemeSwitcherProps {
    compact?: boolean;
    className?: string;
}
```

- **Standard mode:** A button showing the current theme name and color indicator. Clicking opens a popover positioned with absolute right alignment, closed by outside click or Escape.
- **Compact mode:** Renders the theme list inline without a popover (used in settings panels).

Each theme is rendered via `ThemeItem`, which shows a `ThemePreview` thumbnail, `ColorIndicators`, and a label/description pair. Selecting a theme calls the `changeTheme` function from the `useTheme` hook.

### Sub-Components

| Component | Purpose |
|---|---|
| `ThemePreview` | Renders a small colored rectangle preview for each theme key |
| `ColorIndicators` | Shows primary/secondary color dots in `sm` or `lg` sizes |
| `ThemeItem` | A button row with preview, label, description, and active indicator |

---

## Key Dependencies

- **HeroUI:** `Navbar`, `NavbarBrand`, `NavbarContent`, `NavbarItem`, `NavbarMenuToggle`, `NavbarMenu`, `NavbarMenuItem`
- **Radix UI:** `@radix-ui/react-dropdown-menu` (MoreMenu desktop variant)
- **next-intl:** All labels are translated
- **next-auth:** Session used for conditional nav items (favorites)
- **lucide-react:** Icons throughout
