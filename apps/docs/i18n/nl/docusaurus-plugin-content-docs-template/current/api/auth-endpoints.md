---
id: auth-endpoints
title: "Authentication API Endpoints"
sidebar_label: "Authentication API Endpoints"
---

# Authenticatie API Eindpunten

Authenticatie-eindpunten verwerken NextAuth.js-routeafhandeling, wachtwoordbeheer en ophaling van de huidige gebruikerssessie. De centrale NextAuth catch-all route beheert automatisch alle OAuth-callbacks, sessiebeheer en CSRF-beveiliging.

## NextAuth Handler (`/api/auth/[...nextauth]`)

De catch-all route exporteert de handlers van NextAuth vanuit `lib/auth/index.ts`:

```typescript
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

Deze enkele route verwerkt alle NextAuth-bewerkingen:

### GET-eindpunten (via NextAuth)

| Pad | Beschrijving |
|-----|--------------|
| `/api/auth/signin` | Aanmeldpagina weergeven of doorverwijzen naar provider |
| `/api/auth/signout` | Afmelding verwerken |
| `/api/auth/session` | Huidige sessie als JSON ophalen |
| `/api/auth/csrf` | CSRF-token ophalen |
| `/api/auth/providers` | Beschikbare auth-providers weergeven |
| `/api/auth/callback/[provider]` | OAuth-callback verwerken |

### POST-eindpunten (via NextAuth)

| Pad | Beschrijving |
|-----|--------------|
| `/api/auth/signin/[provider]` | Aanmelding starten met provider |
| `/api/auth/signout` | Afmelding verwerken |
| `/api/auth/callback/credentials` | Aanmelding met inloggegevens verwerken |
| `/api/auth/_log` | Interne Auth.js logging |

### OAuth-callback stroom

Wanneer een gebruiker zich aanmeldt via een OAuth-provider:

```
1. Gebruiker klikt op "Aanmelden met Google"
2. Doorverwijzing naar Google toestemmingsscherm
3. Google verwijst terug naar /api/auth/callback/google
4. NextAuth verifieert de OAuth-code
5. signIn-callback wordt uitgevoerd (lib/auth/index.ts)
   -> Valideert gebruikers-e-mail
   -> Staat accountkoppeling toe voor OAuth
6. jwt-callback verrijkt token
   -> Stelt userId, provider, isAdmin in
   -> Maakt clientprofiel aan voor nieuwe OAuth-gebruikers
7. Sessie aangemaakt, gebruiker doorgestuurd naar callback-URL
```

### Aangepaste Pagina's

NextAuth is geconfigureerd om aangepaste authenticatiepagina's te gebruiken in plaats van de standaard NextAuth-UI:

| Doel | Aangepast pad |
|------|---------------|
| Aanmelden | `/auth/signin` |
| Afmelden | `/auth/signout` |
| Fout | `/auth/error` |
| Verificatieverzoek | `/auth/verify-request` |
| Nieuwe gebruikersregistratie | `/auth/register` |

## Wachtwoordbeheer (`/api/auth/change-password`)

| Methode | Pad | Beschrijving |
| ------- | --- | ------------ |
| `POST` | `/api/auth/change-password` | Wachtwoord van geverifieerde gebruiker wijzigen |

### Verzoeklichaam

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-secure-password"
}
```

### Authenticatie

Vereist een geldige sessie. Het eindpunt verifieert het huidige wachtwoord alvorens bij te werken.

### Antwoord

```json
// Succes
{ "success": true, "message": "Password changed successfully" }

// Fout
{ "success": false, "error": "Current password is incorrect" }
```

## Huidige Gebruiker (`/api/current-user`)

| Methode | Pad | Beschrijving |
| ------- | --- | ------------ |
| `GET` | `/api/current-user` | Huidige geverifieerde gebruikersgegevens ophalen |

### Antwoord

Geeft het sessiegebruikersobject terug verrijkt met applicatiespecifieke velden:

```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://...",
    "isAdmin": false,
    "clientProfileId": "profile-uuid",
    "provider": "google"
  }
}
```

### Niet-geverifieerd Antwoord

Geeft `null` of een `401`-status terug als er geen geldige sessie bestaat.

## Sessietoken Verwerking

NextAuth slaat sessietokens op in HTTP-only cookies:

| Cookienaam | Omgeving |
|------------|----------|
| `next-auth.session-token` | Ontwikkeling (HTTP) |
| `__Secure-next-auth.session-token` | Productie (HTTPS) |

### CSRF-beveiliging

NextAuth bevat ingebouwde CSRF-beveiliging. Een CSRF-tokencookie (`next-auth.csrf-token`) wordt ingesteld op de client en moet worden meegestuurd bij POST-verzoeken naar NextAuth-eindpunten.

## Foutafhandeling

Authenticatiefouten worden vertaald naar gebruiksvriendelijke berichten in `lib/auth/error-handler.ts`:

| Foutpatroon | Gebruikersbericht |
|-------------|-------------------|
| `GOOGLE_CLIENT_ID` betrekking | Google-authenticatie is niet correct geconfigureerd |
| `GITHUB_CLIENT_ID` betrekking | GitHub-authenticatie is niet correct geconfigureerd |
| `FB_CLIENT_ID` betrekking | Facebook-authenticatie is niet correct geconfigureerd |
| `MICROSOFT_CLIENT_ID` betrekking | Microsoft-authenticatie is niet correct geconfigureerd |
| `SUPABASE` betrekking | Supabase-authenticatie is niet correct geconfigureerd |
| `NEXTAUTH` betrekking | NextAuth is niet correct geconfigureerd |

De functie `handleAuthError()` vangt deze fouten op en geeft een gestructureerd `{ error: string }`-antwoord terug.

## Auth-gebeurtenissen

De NextAuth-configuratie in `lib/auth/index.ts` verwerkt levenscyclusgebeurtenissen:

### Afmeldgebeurtenis

Invalideert de sessiecache voor de gebruiker om te voorkomen dat verouderde sessiegegevens worden geretourneerd:

```typescript
events: {
  signOut: async (event) => {
    const token = 'token' in event ? event.token : undefined;
    if (token?.userId) {
      await invalidateSessionCache(undefined, token.userId);
    }
  }
}
```

### Gebruikersupdategebeurtenis

Invalideert de sessiecache wanneer gebruikersgegevens wijzigen (bijv. profielupdate, rolwijziging):

```typescript
events: {
  updateUser: async ({ user }) => {
    if (user?.id) {
      await invalidateSessionCache(undefined, user.id);
    }
  }
}
```

## Gerelateerde Configuratie

| Bestand | Doel |
|---------|------|
| `auth.config.ts` | Configuratie van providers op topniveau |
| `lib/auth/index.ts` | NextAuth-instantie met callbacks en gebeurtenissen |
| `lib/auth/providers.ts` | OAuth-providerfabriek |
| `lib/auth/credentials.ts` | E-mail/wachtwoord provider |
| `lib/auth/cached-session.ts` | Sessiecachinglaag |
