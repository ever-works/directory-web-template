---
id: current-user-api-endpoints
title: Endpoint API Utente Corrente
sidebar_label: API Utente Corrente
sidebar_position: 60
---

# Endpoint API Utente Corrente

L'API Utente Corrente fornisce un singolo endpoint per recuperare le informazioni del profilo dell'utente autenticato. È utilizzata dal frontend per determinare lo stato di autenticazione e i privilegi dell'utente.

**Sorgente:** `template/app/api/current-user/route.ts`

---

## Ottieni Utente Corrente

Restituisce le informazioni di profilo sicure dell'utente autenticato corrente. Restituisce `null` se nessun utente è autenticato.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `GET` |
| **Percorso** | `/api/current-user` |
| **Autenticazione** | Nessuna richiesta (restituisce `null` se non autenticato) |

### Risposta

**Stato 200** -- Utente autenticato.

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

**Stato 200** -- Nessun utente autenticato.

```json
null
```

### Campi della risposta

| Campo | Tipo | Nullable | Descrizione |
|-------|------|----------|-------------|
| `id` | `string` | No | Identificatore univoco dell'utente |
| `name` | `string` | Sì | Nome completo dell'utente |
| `email` | `string` | Sì | Indirizzo email dell'utente |
| `image` | `string` | Sì | URL dell'immagine del profilo |
| `provider` | `string` | Sì | Provider di autenticazione (es. `google`, `github`, `credentials`) |
| `isAdmin` | `boolean` | No | Se l'utente ha privilegi di amministratore (predefinito `false`) |

### Esempi di risposta

**Utente OAuth (Google):**
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

**Utente amministratore (credentials):**
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

**Utente GitHub:**
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

### Esempi curl

```bash
# Ottieni utente corrente (autenticato)
curl -s http://localhost:3000/api/current-user \
  -H "Cookie: next-auth.session-token=<session_token>"

# Ottieni utente corrente (non autenticato -- restituisce null)
curl -s http://localhost:3000/api/current-user
```

### Utilizzo TypeScript

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

// Utilizzo
const user = await getCurrentUser();
if (user) {
  console.log(`Autenticato come ${user.name} (${user.provider})`);
  if (user.isAdmin) {
    console.log('L\'utente ha privilegi di amministratore');
  }
} else {
  console.log('Non autenticato');
}
```

### Note di implementazione

- L'endpoint utilizza la funzione `auth()` da `@/lib/auth` (NextAuth.js) per leggere la sessione lato server.
- La risposta è sanificata -- vengono restituiti solo i campi di profilo sicuri. I campi sensibili come hash delle password, metadati interni e token sono esclusi.
- Questo endpoint restituisce sempre HTTP 200, anche quando nessun utente è autenticato. Il chiamante distingue verificando se la risposta è `null`.
- Il campo `isAdmin` predefinito è `false` se non impostato nella sessione, garantendo un comportamento sicuro per gli utenti non amministratori.
