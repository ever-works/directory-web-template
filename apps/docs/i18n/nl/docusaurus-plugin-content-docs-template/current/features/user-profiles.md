---
id: user-profiles
title: Gebruikersprofielen en instellingen
sidebar_label: Gebruikersprofielen
sidebar_position: 18
---

# Gebruikersprofielen en instellingen

De Ever Works-sjabloon bevat een gebruikersprofielsysteem met openbare profielpagina's, navigatie met tabbladen, avatarbeheer, sociale links en componenten voor profielweergave. Gebruikers kunnen hun informatie, portfolio, vaardigheden en ingediende items presenteren via een gestructureerde profielinterface.

## Architectuuroverzicht

| Onderdeel | Pad | Doel |
|---|---|---|
| `ProfileContent` | `components/profile/profile-content.tsx` | Inhoud hoofdprofielpagina met tabrouting |
| `ProfileNavigation` | `components/profile/profile-navigation.tsx` | Navigatiebalk voor vastzittende tabbladen |
| `ProfileHeader` | `components/profile/profile-header.tsx` | Profielomslag, avatar, biografie en sociale links |
| `ProfileTag` | `components/profile/profile-tag.tsx` | Component voor vaardigheids-/interessetag |
| `ProfileButton` | `components/header/profile-button.tsx` | Koptekstprofielmenutrigger |
| `ProfileMenu` | `components/profile-button/profile-menu.tsx` | Dropdownmenu profiel |

## Profielgegevensstructuur

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

## Profielkop

De component `ProfileHeader` geeft het bovenste gedeelte van een gebruikersprofiel weer met een verloopbanner, avatar met bewerkingsknop en biografische informatie:

```tsx
import { ProfileHeader } from '@/components/profile/profile-header';

<ProfileHeader profile={userProfile} isOwnProfile={true} />
```

### Kenmerken

| Kenmerk | Beschrijving |
|---|---|
| Omslagbanner | Achtergrondverloop met primaire en secundaire themakleuren |
| Avatar | Ronde afbeelding met ringrand, responsief formaat (24x24 tot 28x28) |
| Knop Bewerken | Alleen weergegeven als `isOwnProfile` waar is |
| Terugval van afbeeldingen | Toont tijdelijke aanduiding voor gebruikerspictogram bij fout bij laden van afbeelding |
| Sociale banden | Rendert platformspecifieke pictogrammen (GitHub, LinkedIn, Twitter) |
| Locatie & bedrijf | Displays met kaartspeld- en kofferpictogrammen |
| Websitelink | Externe link met wereldbolpictogram |

### Avatar-foutafhandeling

Het onderdeel omvat een robuuste afhandeling van afbeeldingsfouten:

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

### Sociale platformpictogrammen

| Platform | Icoon |
|---|---|
| `github` | `FiGithub` |
| `linkedin` | `FiLinkedin` |
| `twitter` | `FiTwitter` |
| Overige | `FiGlobe` (algemeen) |

## Profielnavigatie

De component `ProfileNavigation` biedt een vastgezette navigatie met tabbladen:

```tsx
import { ProfileNavigation } from '@/components/profile/profile-navigation';

<ProfileNavigation
  activeTab="about"
  onTabChange={(tab) => setActiveTab(tab)}
/>
```

### Beschikbare tabbladen

| Tab-ID | Etiket | Icoon |
|---|---|---|
| `about` | Over | `FiUser` |
| `portfolio` | Portefeuille | `FiBriefcase` |
| `skills` | Vaardigheden | `FiAward` |
| `submissions` | Inzendingen | `FiFileText` |

### Navigatiefuncties

- **Kleverige positionering** - Blijft bovenaan tijdens het scrollen met een onscherpe achtergrond
- **Mobielvriendelijk** -- Horizontaal scrollen op kleine schermen
- **Focus zichtbaar** -- Ringindicator voor toetsenbordnavigatie
- **Themabewust**: het actieve tabblad gebruikt de primaire kleuren van het thema

## Profielinhoud

De component `ProfileContent` orkestreert de profielpagina door navigatie en tabbladinhoud te combineren:

```tsx
import { ProfileContent } from '@/components/profile/profile-content';

function ProfilePage({ profile }) {
  return <ProfileContent profile={profile} />;
}
```

### Tabsecties

| Sectie | Onderdeel | Inhoud |
|---|---|---|
| Over | `AboutSection` | Persoonlijke informatie, biografie, details |
| Portefeuille | `PortfolioSection` | Werkvoorbeelden en projecten |
| Vaardigheden | `SkillsSection` | Vaardigheden en expertise-tags |
| Inzendingen | `SubmissionsSection` | Items ingediend door de gebruiker |

Elke sectie wordt weergegeven met een consistente header:

```tsx
function ProfileSectionHeader({ title }) {
  return (
    <h2 className="text-2xl font-bold border-b border-gray-200 dark:border-gray-800 pb-2">
      {title}
    </h2>
  );
}
```

## Componenten van profielknoppen

### Koptekstprofielknop

Een knop in de sitekop waarmee het profielmenu wordt geopend:

```tsx
import { ProfileButton } from '@/components/header/profile-button';

<ProfileButton />
```

### Weergave profielkoptekst

Toont de naam en avatar van de gebruiker in compacte vorm:

```tsx
import { ProfileHeaderButton } from '@/components/profile-button/profile-header';

<ProfileHeaderButton user={currentUser} />
```

### Profielmenu

Een vervolgkeuzemenu met profielacties:

```tsx
import { ProfileMenu } from '@/components/profile-button/profile-menu';

<ProfileMenu
  user={currentUser}
  onSignOut={handleSignOut}
/>
```

## Responsief ontwerp

De profielcomponenten zijn gebouwd met een mobile-first-benadering:

| Breekpunt | Gedrag |
|---|---|
| Mobiel | Gecentreerde avatar, gestapelde lay-out, horizontale tabscroll |
| Tablet+ | Links uitgelijnde avatar, lay-out naast elkaar |
| Bureaublad | Kaart over de volledige breedte met maximale breedtebeperkingen |

### Avatar-grootte

| Scherm | Maat |
|---|---|
| Mobiel | 24x24 (96px) |
| Bureaublad | 28x28 (112px) |

## Thema-integratie

Het profielsysteem gebruikt het themasysteem van de sjabloon:

- De kleurovergang van de omslagbanner gebruikt CSS-variabelen `--theme-primary` en `--theme-secondary` - Actieve tabbladstatussen gebruiken primaire themakleuren
- De donkere modus wordt volledig ondersteund met de juiste contrastverhoudingen
- Hover-statussen gebruiken themabewuste kleurovergangen

## Lay-outstructuur

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

## Sleutelbestanden

| Bestand | Pad |
|---|---|
| Profielinhoud | `components/profile/profile-content.tsx` |
| Profielnavigatie | `components/profile/profile-navigation.tsx` |
| Profielkop | `components/profile/profile-header.tsx` |
| Profieltag | `components/profile/profile-tag.tsx` |
| Koptekstprofielknop | `components/header/profile-button.tsx` |
| Profielmenu | `components/profile-button/profile-menu.tsx` |
| Profieltypen | `lib/types/profile.ts` |
