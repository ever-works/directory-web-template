---
id: user-profiles
title: Profili utente e impostazioni
sidebar_label: Profili utente
sidebar_position: 18
---

# Profili utente e impostazioni

Il modello Ever Works include un sistema di profili utente con pagine di profili pubblici, navigazione a schede, gestione degli avatar, collegamenti social e componenti di visualizzazione del profilo. Gli utenti possono mostrare le proprie informazioni, portfolio, competenze e elementi inviati attraverso un'interfaccia del profilo strutturato.

## Panoramica dell'architettura

| Componente | Percorso | Scopo |
|---|---|---|
| `ProfileContent` | `components/profile/profile-content.tsx` | Contenuto della pagina del profilo principale con routing delle schede |
| `ProfileNavigation` | `components/profile/profile-navigation.tsx` | Barra di navigazione con scheda fissa |
| `ProfileHeader` | `components/profile/profile-header.tsx` | Copertina del profilo, avatar, biografia e collegamenti social |
| `ProfileTag` | `components/profile/profile-tag.tsx` | Componente tag competenza/interesse |
| `ProfileButton` | `components/header/profile-button.tsx` | Trigger del menu del profilo di intestazione |
| `ProfileMenu` | `components/profile-button/profile-menu.tsx` | Menu profilo a discesa |

## Struttura dei dati del profilo

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

## Intestazione del profilo

Il componente `ProfileHeader` rende la sezione superiore di un profilo utente con un banner di copertina sfumato, avatar con pulsante di modifica e informazioni biografiche:

```tsx
import { ProfileHeader } from '@/components/profile/profile-header';

<ProfileHeader profile={userProfile} isOwnProfile={true} />
```

### Caratteristiche

| Caratteristica | Descrizione |
|---|---|
| Banner di copertina | Sfondo sfumato utilizzando i colori primari e secondari del tema |
| Avatar | Immagine circolare con bordo ad anello, dimensionamento reattivo (da 24x24 a 28x28) |
| Pulsante Modifica | Visualizzato solo quando `isOwnProfile` è vero |
| Immagine di riserva | Mostra il segnaposto dell'icona utente in caso di errore di caricamento dell'immagine |
| Collegamenti sociali | Rende le icone specifiche della piattaforma (GitHub, LinkedIn, Twitter) |
| Posizione e azienda | Visualizza con icone della mappa e della valigetta |
| Collegamento al sito web | Collegamento esterno con l'icona del globo |

### Gestione degli errori dell'avatar

Il componente include una solida gestione degli errori di immagine:

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

### Icone della piattaforma sociale

| Piattaforma | Icona |
|---|---|
| `github` | `FiGithub` |
| `linkedin` | `FiLinkedin` |
| `twitter` | `FiTwitter` |
| Altro | `FiGlobe` (generico) |

## Navigazione del profilo

Il componente `ProfileNavigation` fornisce una navigazione a schede fissa:

```tsx
import { ProfileNavigation } from '@/components/profile/profile-navigation';

<ProfileNavigation
  activeTab="about"
  onTabChange={(tab) => setActiveTab(tab)}
/>
```

### Schede disponibili

| ID scheda | Etichetta | Icona |
|---|---|---|
| `about` | Informazioni su | `FiUser` |
| `portfolio` | Portafoglio | `FiBriefcase` |
| `skills` | Competenze | `FiAward` |
| `submissions` | Invii | `FiFileText` |

### Funzionalità di navigazione

- **Posizionamento fisso** -- Rimane in alto quando si scorre con lo sfondo sfocato
- **Ottimizzazione per dispositivi mobili** -- Scorrimento orizzontale su schermi piccoli
- **Fuoco visibile** -- Indicatore dell'anello per la navigazione tramite tastiera
- **Tema-aware** -- La scheda attiva utilizza i colori primari del tema

## Contenuto del profilo

Il componente `ProfileContent` orchestra la pagina del profilo combinando la navigazione e il contenuto della scheda:

```tsx
import { ProfileContent } from '@/components/profile/profile-content';

function ProfilePage({ profile }) {
  return <ProfileContent profile={profile} />;
}
```

### Sezioni delle schede

| Sezione | Componente | Contenuto |
|---|---|---|
| Informazioni su | `AboutSection` | Informazioni personali, biografia, dettagli |
| Portafoglio | `PortfolioSection` | Esempi e progetti di lavoro |
| Competenze | `SkillsSection` | Tag di competenze e competenze |
| Invii | `SubmissionsSection` | Elementi inviati dall'utente |

Ogni sezione viene visualizzata con un'intestazione coerente:

```tsx
function ProfileSectionHeader({ title }) {
  return (
    <h2 className="text-2xl font-bold border-b border-gray-200 dark:border-gray-800 pb-2">
      {title}
    </h2>
  );
}
```

## Componenti del pulsante del profilo

### Pulsante Profilo intestazione

Un pulsante nell'intestazione del sito che apre il menu del profilo:

```tsx
import { ProfileButton } from '@/components/header/profile-button';

<ProfileButton />
```

### Visualizzazione dell'intestazione del profilo

Mostra il nome e l'avatar dell'utente in forma compatta:

```tsx
import { ProfileHeaderButton } from '@/components/profile-button/profile-header';

<ProfileHeaderButton user={currentUser} />
```

### Menù Profilo

Un menu a discesa con le azioni del profilo:

```tsx
import { ProfileMenu } from '@/components/profile-button/profile-menu';

<ProfileMenu
  user={currentUser}
  onSignOut={handleSignOut}
/>
```

## Design reattivo

I componenti del profilo sono realizzati con un approccio mobile-first:

| Punto di interruzione | Comportamento |
|---|---|
| Cellulare | Avatar centrato, layout in pila, scorrimento scheda orizzontale |
| Tavoletta+ | Avatar allineato a sinistra, layout affiancato |
| Scrivania | Carta a larghezza intera con limiti di larghezza massima |

### Dimensionamento dell'avatar

| Schermo | Taglia |
|---|---|
| Cellulare | 24x24 (96px) |
| Scrivania | 28x28 (112px) |

## Integrazione del tema

Il sistema di profili utilizza il sistema di temi del modello:

- Il gradiente del banner di copertina utilizza le variabili CSS `--theme-primary` e `--theme-secondary` - Gli stati delle schede attive utilizzano i colori primari del tema
- La modalità scura è completamente supportata con rapporti di contrasto appropriati
- Gli stati al passaggio del mouse utilizzano transizioni di colore basate sul tema

## Struttura del layout

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

## File chiave

| File | Percorso |
|---|---|
| Contenuto del profilo | `components/profile/profile-content.tsx` |
| Navigazione del profilo | `components/profile/profile-navigation.tsx` |
| Intestazione profilo | `components/profile/profile-header.tsx` |
| Tag profilo | `components/profile/profile-tag.tsx` |
| Pulsante profilo intestazione | `components/header/profile-button.tsx` |
| Menù Profilo | `components/profile-button/profile-menu.tsx` |
| Tipi di profilo | `lib/types/profile.ts` |
