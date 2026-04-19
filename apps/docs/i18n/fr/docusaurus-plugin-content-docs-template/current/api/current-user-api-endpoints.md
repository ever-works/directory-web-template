---
id: current-user-api-endpoints
title: "Points de terminaison API Utilisateur Actuel"
sidebar_label: "API Utilisateur Actuel"
sidebar_position: 60
---

# Points de terminaison API Utilisateur Actuel

L'API Utilisateur Actuel fournit un point de terminaison unique pour récupérer les informations de profil de l'utilisateur authentifié. Elle est utilisée par le frontend pour déterminer l'état d'authentification et les privilèges de l'utilisateur.

**Source :** `template/app/api/current-user/route.ts`

---

## Obtenir l'utilisateur actuel

Retourne les informations de profil sécurisées de l'utilisateur authentifié actuel. Retourne `null` si aucun utilisateur n'est authentifié.

| Propriété | Valeur |
|-----------|--------|
| **Méthode** | `GET` |
| **Chemin** | `/api/current-user` |
| **Auth** | Aucune requise (retourne `null` si non authentifié) |

### Réponse

**Statut 200** -- Utilisateur authentifié.

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

**Statut 200** -- Aucun utilisateur authentifié.

```json
null
```

### Champs de réponse

| Champ | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | `string` | Non | Identifiant unique de l'utilisateur |
| `name` | `string` | Oui | Nom complet de l'utilisateur |
| `email` | `string` | Oui | Adresse e-mail de l'utilisateur |
| `image` | `string` | Oui | URL de l'image de profil |
| `provider` | `string` | Oui | Fournisseur d'authentification (ex. : `google`, `github`, `credentials`) |
| `isAdmin` | `boolean` | Non | Indique si l'utilisateur a des privilèges administrateur (par défaut `false`) |

### Exemples de réponse

**Utilisateur OAuth (Google) :**
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

**Utilisateur administrateur (credentials) :**
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

**Utilisateur GitHub :**
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

### Exemples curl

```bash
# Obtenir l'utilisateur actuel (authentifié)
curl -s http://localhost:3000/api/current-user \
  -H "Cookie: next-auth.session-token=<session_token>"

# Obtenir l'utilisateur actuel (non authentifié -- retourne null)
curl -s http://localhost:3000/api/current-user
```

### Utilisation TypeScript

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

// Utilisation
const user = await getCurrentUser();
if (user) {
  console.log(`Logged in as ${user.name} (${user.provider})`);
  if (user.isAdmin) {
    console.log('User has admin privileges');
  }
} else {
  console.log('Not authenticated');
}
```

### Notes d'implémentation

- Le point de terminaison utilise la fonction `auth()` de `@/lib/auth` (NextAuth.js) pour lire la session côté serveur.
- La réponse est assainie -- seuls les champs de profil sécurisés sont retournés. Les champs sensibles comme les hachages de mots de passe, les métadonnées internes et les tokens sont exclus.
- Ce point de terminaison retourne toujours HTTP 200, même lorsqu'aucun utilisateur n'est authentifié. L'appelant distingue les cas en vérifiant si la réponse est `null`.
- Le champ `isAdmin` prend la valeur `false` par défaut s'il n'est pas défini dans la session, garantissant un comportement sécurisé pour les utilisateurs non-administrateurs.
