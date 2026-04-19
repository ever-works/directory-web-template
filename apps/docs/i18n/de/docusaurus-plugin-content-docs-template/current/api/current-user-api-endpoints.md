---
id: current-user-api-endpoints
title: "Current User API Endpoints"
sidebar_label: "Current User API Endpoints"
---

# Aktueller-Benutzer-API-Endpunkte

Die Aktueller-Benutzer-API stellt einen einzelnen Endpunkt bereit, um die Profilinformationen des authentifizierten Benutzers abzurufen. Sie wird vom Frontend verwendet, um den Authentifizierungsstatus und die Benutzerberechtigungen zu ermitteln.

**Quelle:** `template/app/api/current-user/route.ts`

---

## Aktuellen Benutzer abrufen

Gibt die sicheren Profilinformationen des aktuell authentifizierten Benutzers zurück. Gibt `null` zurück, wenn kein Benutzer authentifiziert ist.

| Eigenschaft | Wert |
|-------------|------|
| **Methode** | `GET` |
| **Pfad** | `/api/current-user` |
| **Authentifizierung** | Keine erforderlich (gibt `null` zurück, wenn nicht authentifiziert) |

### Antwort

**Status 200** – Authentifizierter Benutzer.

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

**Status 200** – Kein authentifizierter Benutzer.

```json
null
```

### Antwortfelder

| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|--------------|
| `id` | `string` | Nein | Eindeutiger Benutzeridentifikator |
| `name` | `string` | Ja | Vollständiger Name des Benutzers |
| `email` | `string` | Ja | E-Mail-Adresse des Benutzers |
| `image` | `string` | Ja | Profilbild-URL |
| `provider` | `string` | Ja | Authentifizierungsanbieter (z. B. `google`, `github`, `credentials`) |
| `isAdmin` | `boolean` | Nein | Ob der Benutzer Admin-Rechte hat (Standard: `false`) |

### Antwortbeispiele

**OAuth-Benutzer (Google):**
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

**Admin-Benutzer (Credentials):**
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

**GitHub-Benutzer:**
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

### curl-Beispiele

```bash
# Aktuellen Benutzer abrufen (authentifiziert)
curl -s http://localhost:3000/api/current-user \
  -H "Cookie: next-auth.session-token=<session_token>"
```
