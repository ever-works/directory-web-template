---
id: current-user-api-endpoints
title: "Current User API Endpoints"
sidebar_label: "Current User API Endpoints"
sidebar_position: 60
---

# Huidige Gebruiker API Eindpunten

De Huidige Gebruiker API biedt één eindpunt om de profielinformatie van de geauthenticeerde gebruiker op te halen. Het wordt door de frontend gebruikt om de authenticatiestatus en gebruikersrechten te bepalen.

**Bron:** `template/app/api/current-user/route.ts`

---

## Huidige Gebruiker Ophalen

Geeft de huidige veilige profielinformatie van de geauthenticeerde gebruiker terug. Geeft `null` terug als er geen gebruiker is ingelogd.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `GET` |
| **Pad** | `/api/current-user` |
| **Authenticatie** | Geen vereist (geeft `null` terug als niet geauthenticeerd) |

### Reactie

**Status 200** -- Geauthenticeerde gebruiker.

```json
{
  "id": "user_123abc",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "image": "https://example.com/avatars/john.jpg",
  "provider": "google",
  "isAdmin": false
}
```

**Status 200** -- Geen geauthenticeerde gebruiker.

```json
null
```

### Reactievelden

| Veld | Type | Nullable | Beschrijving |
|------|------|----------|--------------|
| `id` | `string` | Nee | Unieke gebruikersidentificatie |
| `name` | `string` | Ja | Volledige naam van de gebruiker |
| `email` | `string` | Ja | E-mailadres van de gebruiker |
| `image` | `string` | Ja | URL van de profielfoto |
| `provider` | `string` | Ja | Authenticatieprovider (bijv. `google`, `github`, `credentials`) |
| `isAdmin` | `boolean` | Nee | Of de gebruiker beheerdersrechten heeft (standaard `false`) |

### Reactievoorbeelden

**OAuth-gebruiker (Google):**
```json
{
  "id": "user_123abc",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "image": "https://lh3.googleusercontent.com/...",
  "provider": "google",
  "isAdmin": false
}
```

**Beheerder (credentials):**
```json
{
  "id": "user_456def",
  "name": "Jane Admin",
  "email": "jane.admin@example.com",
  "image": null,
  "provider": "credentials",
  "isAdmin": true
}
```

**GitHub-gebruiker:**
```json
{
  "id": "user_789ghi",
  "name": "GitHub User",
  "email": "github.user@example.com",
  "image": "https://avatars.githubusercontent.com/u/123456",
  "provider": "github",
  "isAdmin": false
}
```

### curl-voorbeelden

```bash
# Huidige gebruiker ophalen (geauthenticeerd)
curl -s http://localhost:3000/api/current-user \
  -H "Cookie: next-auth.session-token=<session_token>"

# Huidige gebruiker ophalen (niet geauthenticeerd -- geeft null terug)
curl -s http://localhost:3000/api/current-user
```

### TypeScript-gebruik

```typescript
interface SafeUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  provider: string | null;
  isAdmin: boolean;
}

async function getCurrentUser(): Promise<SafeUser | null> {
  const res = await fetch('/api/current-user');
  return res.json();
}

// Gebruik
const user = await getCurrentUser();
if (user) {
  console.log(`Ingelogd als ${user.name} (${user.provider})`);
  if (user.isAdmin) {
    console.log('Gebruiker heeft beheerdersrechten');
  }
} else {
  console.log('Niet geauthenticeerd');
}
```

### Implementatienotities

- Het eindpunt gebruikt de functie `auth()` van `@/lib/auth` (NextAuth.js) om de server-side sessie te lezen.
- De reactie is opgeschoond -- alleen veilige profielvelden worden teruggegeven. Gevoelige velden zoals wachtwoord-hashes, interne metadata en tokens worden uitgesloten.
- Dit eindpunt geeft altijd HTTP 200 terug, ook als er geen gebruiker is ingelogd. De aanroeper onderscheidt dit door te controleren of de reactie `null` is.
- Het veld `isAdmin` staat standaard op `false` als het niet in de sessie is ingesteld, wat zorgt voor veilig gedrag voor niet-beheerdersgebruikers.
