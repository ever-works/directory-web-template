---
id: auth-endpoints
title: "Authentication API Endpoints"
sidebar_label: "Authentication API Endpoints"
---

# Authentifizierungs-API Endpunkte

Die Authentifizierung basiert auf **NextAuth.js v5** (Auth.js). Es gibt keinen separaten Satz benutzerdefinierter Auth-Endpunkte – stattdessen werden alle Auth-Operationen über einen einzelnen universellen NextAuth-Handler abgewickelt.

## Basispfad

```
/api/auth/[...nextauth]
```

## Routenübersicht

| Methode | Pfad | Beschreibung |
| -------- | ------------------------------------------ | ---------------------------------------- |
| `GET` | `/api/auth/[...nextauth]` | NextAuth-Anfrage verarbeiten (OAuth-Callback, Session, CSRF, Anmeldeseite) |
| `POST` | `/api/auth/[...nextauth]` | NextAuth-Anfrage verarbeiten (Anmeldung, Abmeldung, Callback) |

---

## NextAuth-Handler

Der Handler ist in `app/api/auth/[...nextauth]/route.ts` implementiert:

```typescript
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

Beide HTTP-Methoden werden von NextAuth intern geleitet, je nach dem Pfad-Segment nach `/api/auth/`.

---

## Wichtige Endpunkte (intern von NextAuth behandelt)

| Pfad | Beschreibung |
| --------------------------------------- | ------------------------------------------------- |
| `GET /api/auth/signin` | Zeigt die angepasste Anmeldeseite an |
| `POST /api/auth/signin/credentials` | Verarbeitet Anmeldung mit E-Mail und Passwort |
| `GET /api/auth/signout` | Leitet zur Abmeldeseite weiter |
| `POST /api/auth/signout` | Beendet die aktuelle Sitzung |
| `GET /api/auth/session` | Gibt aktuelle Sitzungsdaten zurück (JSON) |
| `GET /api/auth/csrf` | Gibt CSRF-Token für Formulare zurück |
| `GET /api/auth/callback/{provider}` | OAuth-Callback nach externer Anbieter-Weiterleitung |

---

## OAuth-Callback-Flow

```
Benutzer klickt "Anmelden mit Google"
  → GET /api/auth/signin/google
  → Weiterleitung zu Google
  → GET /api/auth/callback/google?code=...
  → NextAuth tauscht Code gegen Token
  → Sitzung wird erstellt
  → Weiterleitung zur Startseite
```

---

## Angepasste Seiten

In `auth.config.ts` definiert:

```typescript
pages: {
  signIn: "/signin",
  error: "/auth/error"
}
```

| Seite | Pfad | Beschreibung |
| ----------- | -------------- | ----------------------------------------- |
| Anmelden | `/signin` | Benutzerdefinierte Anmeldeseite |
| Fehler | `/auth/error` | Zeigt Auth-Fehler an (ungültige Anmeldedaten etc.) |

---

## Passwortverwaltung

Obwohl sie keine direkte NextAuth-Routen sind, hängen diese API-Routen eng mit der Authentifizierung zusammen:

| Methode | Pfad | Beschreibung |
| -------- | ----------------------------------- | ---------------------------------- |
| `POST` | `/api/auth/forgot-password` | Passwort-Zurücksetzungs-E-Mail senden |
| `POST` | `/api/auth/reset-password` | Passwort mit Token zurücksetzen |
| `POST` | `/api/auth/change-password` | Passwort des aktuellen Benutzers ändern |

---

## Aktueller Benutzer

| Methode | Pfad | Beschreibung |
| -------- | ------------------- | --------------------------------------- |
| `GET` | `/api/auth/me` | Gibt den aktuell authentifizierten Benutzer zurück |

**Antwort (200):**

```json
{
  "id": "user_123abc",
  "username": "johndoe",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "role": "admin",
  "isAdmin": true,
  "avatar": "https://example.com/avatars/john.jpg"
}
```

**Antwort (401):** Wenn keine Sitzung aktiv ist.

---

## Sitzungs-Cookies

NextAuth setzt `HTTP-only`-Cookies zur Sitzungsverwaltung:

| Cookie | Beschreibung |
| ---------------------- | --------------------------------------------- |
| `next-auth.session-token` | JWT-verschlüsseltes Sitzungstoken |
| `next-auth.csrf-token` | CSRF-Schutztoken für POST-Anfragen |
| `next-auth.callback-url` | Umleitungs-URL nach erfolgreicher Anmeldung |

---

## CSRF-Schutz

NextAuth erzwingt CSRF-Validierung für alle Formulare, die `POST /api/auth/signin` oder `POST /api/auth/signout` aufrufen. Rufen Sie zunächst `GET /api/auth/csrf` ab, um das Token zu erhalten, und fügen Sie es in alle Formular-POSTs ein.

---

## Fehlercodes

| Status | Bedeutung |
| ------ | --------------------------------------------- |
| `200` | Erfolgreiche Authentifizierung |
| `302` | Weiterleitung (OAuth-Flow, nach Anmeldung) |
| `400` | Fehlender oder ungültiger Parameter |
| `401` | Ungültige Anmeldedaten oder Sitzung abgelaufen |
| `403` | Konto deaktiviert oder gesperrt |
| `500` | Interner Auth-Fehler |

---

## Auth-Ereignisse

NextAuth löst Ereignisse aus, auf die in `auth.config.ts` reagiert werden kann:

```typescript
events: {
  async signOut({ token }) {
    // Serverbereinigung bei Abmeldung
  },
  async updateUser({ user }) {
    // Profilaktualisierungen behandeln
  }
}
```

---

## Verwandte Konfiguration

| Datei | Beschreibung |
| --------------------------------------- | --------------------------------------------- |
| `apps/web/auth.config.ts` | Provider, Callbacks, Seitenrouten, Ereignisse |
| `apps/web/auth.ts` | NextAuth-Initialisierung und Handler-Export |
| `apps/web/lib/services/auth-service.ts` | Hilfsfunktionen für Anmeldung, Passwortzurücksetzung |

## Verwandte Dokumentation

- [NextAuth-Konfiguration](../architecture/nextauth-configuration.md) – Provider-Setup, JWT-Callbacks, Sitzungsstruktur
- [Passwort-Zurücksetzung](../authentication/password-reset.md) – Vollständiger Passwort-Zurücksetzung-Flow
- [OAuth-Provider](../authentication/oauth-providers.md) – Google, GitHub und andere Provider konfigurieren

See the [English documentation](/api/auth-endpoints) for the full content of this section.
