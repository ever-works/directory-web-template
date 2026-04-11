---
id: user-profiles
title: Profile i ustawienia użytkowników
sidebar_label: Profile użytkowników
sidebar_position: 18
---

# Profile i ustawienia użytkowników

Szablon Ever Works zawiera system profili użytkowników ze stronami profili publicznych, nawigacją w zakładkach, zarządzaniem awatarami, linkami społecznościowymi i komponentami wyświetlania profili. Użytkownicy mogą prezentować swoje informacje, portfolio, umiejętności i przesłane elementy za pośrednictwem uporządkowanego interfejsu profilu.

## Przegląd architektury

| Składnik | Ścieżka | Cel |
|---|---|---|
| `ProfileContent` | `components/profile/profile-content.tsx` | Zawartość głównej strony profilu z routingiem zakładek |
| `ProfileNavigation` | `components/profile/profile-navigation.tsx` | Pasek nawigacji przyklejonej karty |
| `ProfileHeader` | `components/profile/profile-header.tsx` | Okładka profilu, awatar, biografia i linki społecznościowe |
| `ProfileTag` | `components/profile/profile-tag.tsx` | Komponent znacznika umiejętności/zainteresowań |
| `ProfileButton` | `components/header/profile-button.tsx` | Wyzwalacz menu profilu nagłówka |
| `ProfileMenu` | `components/profile-button/profile-menu.tsx` | Rozwijane menu profilu |

## Struktura danych profilu

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

## Nagłówek profilu

Komponent `ProfileHeader` renderuje górną część profilu użytkownika z gradientowym banerem na okładce, awatarem z przyciskiem edycji i informacjami biograficznymi:

```tsx
import { ProfileHeader } from '@/components/profile/profile-header';

<ProfileHeader profile={userProfile} isOwnProfile={true} />
```

### Funkcje

| Funkcja | Opis |
|---|---|
| Baner na okładce | Tło gradientowe wykorzystujące kolory podstawowe i dodatkowe |
| Awatar | Okrągły obraz z obramowaniem pierścieniowym, responsywny rozmiar (24x24 do 28x28) |
| Przycisk Edytuj | Wyświetlane tylko wtedy, gdy `isOwnProfile` jest prawdą |
| Obraz zastępczy | Pokazuje symbol zastępczy ikony użytkownika w przypadku błędu ładowania obrazu |
| Linki społecznościowe | Renderuje ikony specyficzne dla platformy (GitHub, LinkedIn, Twitter) |
| Lokalizacja i firma | Wyświetlacze z ikonami pinezki do mapy i teczki |
| Link do strony internetowej | Link zewnętrzny z ikoną globusa |

### Obsługa błędów awatara

Komponent zawiera solidną obsługę błędów obrazu:

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

### Ikony platform społecznościowych

| Platforma | Ikona |
|---|---|
| `github` | `FiGithub` |
| `linkedin` | `FiLinkedin` |
| `twitter` | `FiTwitter` |
| Inne | `FiGlobe` (ogólne) |

## Nawigacja po profilu

Komponent `ProfileNavigation` zapewnia nawigację przy użyciu lepkich zakładek:

```tsx
import { ProfileNavigation } from '@/components/profile/profile-navigation';

<ProfileNavigation
  activeTab="about"
  onTabChange={(tab) => setActiveTab(tab)}
/>
```

### Dostępne karty

| Identyfikator karty | Etykieta | Ikona |
|---|---|---|
| `about` | O | `FiUser` |
| `portfolio` | Portfolio | `FiBriefcase` |
| `skills` | Umiejętności | `FiAward` |
| `submissions` | Zgłoszenia | `FiFileText` |

### Funkcje nawigacji

- **Przyklejone pozycjonowanie** -- Pozostaje na górze podczas przewijania z rozmytym tłem
- **Przystosowany do urządzeń mobilnych** -- Przewijanie w poziomie na małych ekranach
- **Widoczna ostrość** -- Wskaźnik pierścieniowy do nawigacji za pomocą klawiatury
- **Obsługuje motyw** - Aktywna karta używa podstawowych kolorów motywu

## Treść profilu

Komponent `ProfileContent` organizuje stronę profilu, łącząc nawigację i zawartość zakładek:

```tsx
import { ProfileContent } from '@/components/profile/profile-content';

function ProfilePage({ profile }) {
  return <ProfileContent profile={profile} />;
}
```

### Sekcje zakładek

| Sekcja | Składnik | Treść |
|---|---|---|
| O | `AboutSection` | Dane osobowe, biografia, szczegóły |
| Portfolio | `PortfolioSection` | Próbki prac i projekty |
| Umiejętności | `SkillsSection` | Tagi umiejętności i wiedzy specjalistycznej |
| Zgłoszenia | `SubmissionsSection` | Elementy przesłane przez użytkownika |

Każda sekcja jest renderowana ze spójnym nagłówkiem:

```tsx
function ProfileSectionHeader({ title }) {
  return (
    <h2 className="text-2xl font-bold border-b border-gray-200 dark:border-gray-800 pb-2">
      {title}
    </h2>
  );
}
```

## Komponenty przycisku profilu

### Przycisk profilu nagłówka

Przycisk w nagłówku witryny otwierający menu profilu:

```tsx
import { ProfileButton } from '@/components/header/profile-button';

<ProfileButton />
```

### Wyświetlanie nagłówka profilu

Pokazuje nazwę użytkownika i awatar w kompaktowej formie:

```tsx
import { ProfileHeaderButton } from '@/components/profile-button/profile-header';

<ProfileHeaderButton user={currentUser} />
```

### Menu profilu

Rozwijane menu z działaniami profilu:

```tsx
import { ProfileMenu } from '@/components/profile-button/profile-menu';

<ProfileMenu
  user={currentUser}
  onSignOut={handleSignOut}
/>
```

## Responsywny projekt

Komponenty profili są tworzone z myślą o urządzeniach mobilnych:

| Punkt przerwania | Zachowanie |
|---|---|
| Komórka | Wyśrodkowany awatar, układ skumulowany, przewijanie kart w poziomie |
| Tablet+ | Awatar wyrównany do lewej strony, układ obok siebie |
| Pulpit | Karta o pełnej szerokości z ograniczeniami maksymalnej szerokości |

### Rozmiar awatara

| Ekran | Rozmiar |
|---|---|
| Komórka | 24x24 (96px) |
| Pulpit | 28x28 (112px) |

## Integracja motywu

System profili wykorzystuje system motywów szablonu:

- Gradient banera na okładce wykorzystuje zmienne CSS `--theme-primary` i `--theme-secondary` - Stany aktywnych zakładek korzystają z podstawowych kolorów motywu
- Tryb ciemny jest w pełni obsługiwany przy odpowiednich współczynnikach kontrastu
- Stany najechania wykorzystują przejścia kolorów uwzględniające motyw

## Struktura układu

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

## Kluczowe pliki

| Plik | Ścieżka |
|---|---|
| Treść profilu | `components/profile/profile-content.tsx` |
| Nawigacja po profilu | `components/profile/profile-navigation.tsx` |
| Nagłówek profilu | `components/profile/profile-header.tsx` |
| Znacznik profilu | `components/profile/profile-tag.tsx` |
| Przycisk profilu nagłówka | `components/header/profile-button.tsx` |
| Menu profilu | `components/profile-button/profile-menu.tsx` |
| Typy profili | `lib/types/profile.ts` |
