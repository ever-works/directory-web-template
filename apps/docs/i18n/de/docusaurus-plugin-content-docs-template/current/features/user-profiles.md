---
id: user-profiles
title: Benutzerprofile und Einstellungen
sidebar_label: Benutzerprofile
sidebar_position: 18
---

# Benutzerprofile und Einstellungen

Die Ever Works-Vorlage umfasst ein Benutzerprofilsystem mit öffentlichen Profilseiten, Tab-Navigation, Avatar-Verwaltung, sozialen Links und Profilanzeigekomponenten. Benutzer können ihre Informationen, ihr Portfolio, ihre Fähigkeiten und eingereichten Artikel über eine strukturierte Profiloberfläche präsentieren.

## Architekturübersicht

| Komponente | Pfad | Zweck |
|---|---|---|
| `ProfileContent` | `components/profile/profile-content.tsx` | Inhalt der Hauptprofilseite mit Tab-Routing |
| `ProfileNavigation` | `components/profile/profile-navigation.tsx` | Sticky-Tab-Navigationsleiste |
| `ProfileHeader` | `components/profile/profile-header.tsx` | Profilcover, Avatar, Biografie und soziale Links |
| `ProfileTag` | `components/profile/profile-tag.tsx` | Fähigkeits-/Interessen-Tag-Komponente |
| `ProfileButton` | `components/header/profile-button.tsx` | Auslöser für das Header-Profilmenü |
| `ProfileMenu` | `components/profile-button/profile-menu.tsx` | Dropdown-Profilmenü |

## Profildatenstruktur

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

## Profilkopfzeile

Die `ProfileHeader` -Komponente rendert den oberen Abschnitt eines Benutzerprofils mit einem Verlaufs-Cover-Banner, einem Avatar mit Bearbeitungsschaltfläche und biografischen Informationen:

```tsx
import { ProfileHeader } from '@/components/profile/profile-header';

<ProfileHeader profile={userProfile} isOwnProfile={true} />
```

### Funktionen

| Funktion | Beschreibung |
|---|---|
| Cover-Banner | Hintergrund mit Farbverlauf unter Verwendung von Primär- und Sekundärfarben des Themas |
| Avatar | Kreisförmiges Bild mit Ringrand, responsive Größe (24x24 bis 28x28) |
| Schaltfläche „Bearbeiten“ | Wird nur angezeigt, wenn `isOwnProfile` wahr ist |
| Bild-Fallback | Zeigt den Platzhalter für das Benutzersymbol bei einem Bildladefehler | an
| Soziale Links | Rendert plattformspezifische Symbole (GitHub, LinkedIn, Twitter) |
| Standort & Unternehmen | Displays mit Kartenstecknadel und Aktentaschensymbolen |
| Website-Link | Externer Link mit Globus-Symbol |

### Avatar-Fehlerbehandlung

Die Komponente umfasst eine robuste Bildfehlerbehandlung:

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

### Symbole für soziale Plattformen

| Plattform | Symbol |
|---|---|
| `github` | `FiGithub` |
| `linkedin` | `FiLinkedin` |
| `twitter` | `FiTwitter` |
| Andere | `FiGlobe` (allgemein) |

## Profilnavigation

Die `ProfileNavigation` -Komponente bietet eine Sticky-Tab-Navigation:

```tsx
import { ProfileNavigation } from '@/components/profile/profile-navigation';

<ProfileNavigation
  activeTab="about"
  onTabChange={(tab) => setActiveTab(tab)}
/>
```

### Verfügbare Registerkarten

| Tab-ID | Etikett | Symbol |
|---|---|---|
| `about` | Über | `FiUser` |
| `portfolio` | Portfolio | `FiBriefcase` |
| `skills` | Fähigkeiten | `FiAward` |
| `submissions` | Einsendungen | `FiFileText` |

### Navigationsfunktionen

- **Klebrige Positionierung** – Bleibt beim Scrollen mit unscharfem Hintergrund oben
- **Mobilfreundlich** – Horizontales Scrollen auf kleinen Bildschirmen
- **Fokus sichtbar** – Ringanzeige für Tastaturnavigation
- **Themenorientiert** – Die aktive Registerkarte verwendet die Primärfarben des Themas

## Profilinhalt

Die `ProfileContent` -Komponente orchestriert die Profilseite durch die Kombination von Navigation und Tab-Inhalt:

```tsx
import { ProfileContent } from '@/components/profile/profile-content';

function ProfilePage({ profile }) {
  return <ProfileContent profile={profile} />;
}
```

### Tab-Abschnitte

| Abschnitt | Komponente | Inhalt |
|---|---|---|
| Über | `AboutSection` | Persönliche Informationen, Biografie, Details |
| Portfolio | `PortfolioSection` | Arbeitsproben und Projekte |
| Fähigkeiten | `SkillsSection` | Tags für Fähigkeiten und Fachkenntnisse |
| Einsendungen | `SubmissionsSection` | Vom Benutzer übermittelte Elemente |

Jeder Abschnitt wird mit einem konsistenten Header gerendert:

```tsx
function ProfileSectionHeader({ title }) {
  return (
    <h2 className="text-2xl font-bold border-b border-gray-200 dark:border-gray-800 pb-2">
      {title}
    </h2>
  );
}
```

## Komponenten der Profilschaltfläche

### Schaltfläche „Kopfzeilenprofil“.

Eine Schaltfläche im Site-Header, die das Profilmenü öffnet:

```tsx
import { ProfileButton } from '@/components/header/profile-button';

<ProfileButton />
```

### Profilkopfzeilenanzeige

Zeigt den Namen und den Avatar des Benutzers in kompakter Form an:

```tsx
import { ProfileHeaderButton } from '@/components/profile-button/profile-header';

<ProfileHeaderButton user={currentUser} />
```

### Profilmenü

Ein Dropdown-Menü mit Profilaktionen:

```tsx
import { ProfileMenu } from '@/components/profile-button/profile-menu';

<ProfileMenu
  user={currentUser}
  onSignOut={handleSignOut}
/>
```

## Responsives Design

Die Profilkomponenten werden mit einem Mobile-First-Ansatz erstellt:

| Haltepunkt | Verhalten |
|---|---|
| Mobil | Zentrierter Avatar, gestapeltes Layout, horizontaler Tab-Scroll |
| Tablet+ | Linksbündiger Avatar, nebeneinander angeordnet |
| Desktop | Karte in voller Breite mit maximalen Breitenbeschränkungen |

### Avatar-Größe

| Bildschirm | Größe |
|---|---|
| Mobil | 24x24 (96px) |
| Desktop | 28x28 (112px) |

## Theme-Integration

Das Profilsystem verwendet das Themensystem der Vorlage:

- Der Farbverlauf des Cover-Banners verwendet die CSS-Variablen `--theme-primary` und `--theme-secondary` - Aktive Tab-Status verwenden die Primärfarben des Themes
- Der Dunkelmodus wird mit entsprechenden Kontrastverhältnissen vollständig unterstützt
- Hover-Zustände verwenden themenbezogene Farbübergänge

## Layoutstruktur

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

## Schlüsseldateien

| Datei | Pfad |
|---|---|
| Profilinhalt | `components/profile/profile-content.tsx` |
| Profilnavigation | `components/profile/profile-navigation.tsx` |
| Profilkopfzeile | `components/profile/profile-header.tsx` |
| Profil-Tag | `components/profile/profile-tag.tsx` |
| Schaltfläche „Kopfzeilenprofil“ | `components/header/profile-button.tsx` |
| Profilmenü | `components/profile-button/profile-menu.tsx` |
| Profiltypen | `lib/types/profile.ts` |
