---
id: newsletter-endpoints
title: "Newsletter Server Actions"
sidebar_label: "Newsletter Server Actions"
---

# Newsletter-Server-Aktionen

## Übersicht

Der Newsletter-Service stellt **Server-Aktionen** (keine REST-Endpunkte) zur Verwaltung von E-Mail-Newsletterabonnements bereit. Alle Aktionen laufen mit `'use server'`-Direktive im Next.js App Router.

## Aktionsübersicht

| Aktion | Beschreibung |
|--------|--------------|
| `subscribeToNewsletter` | E-Mail-Adresse bei der Newsletter-Liste registrieren |
| `unsubscribeFromNewsletter` | Abonnement einer E-Mail-Adresse kündigen |
| `getNewsletterStatistics` | Statistiken zu Abonnements abrufen (nur Admin) |

## Server-Aktionsdetails

### subscribeToNewsletter

Meldet einen Benutzer für den Newsletter an.

**Eingabevalidierung**
```typescript
const schema = z.object({
  email: z.string().email(),
  source: z.string().optional(),   // z. B. 'homepage', 'checkout', 'profile'
});
```

**Verarbeitungsschritte:**
1. Validiert die E-Mail-Adresse mit Zod
2. Prüft, ob die E-Mail bereits abonniert ist
3. Speichert das Abonnement in der Datenbank
4. Sendet Willkommens-E-Mail über den konfigurierten E-Mail-Provider
5. Gibt Erfolgs- oder Fehlerstatus zurück

**Erfolgsantwort**
```typescript
{ success: true; message: "Successfully subscribed to newsletter" }
```

**Fehlerantworten**
```typescript
{ success: false; error: "Invalid email address" }           // Validierungsfehler
{ success: false; error: "Email already subscribed" }        // Duplikat
{ success: false; error: "Newsletter service unavailable" }  // Provider-Fehler
```

### unsubscribeFromNewsletter

Kündigt das Newsletter-Abonnement einer E-Mail-Adresse.

**Eingabevalidierung**
```typescript
const schema = z.object({
  email: z.string().email(),
  token: z.string().optional(),   // Signierter Abmeldetoken aus E-Mail-Link
});
```

**Verarbeitungsschritte:**
1. Validiert E-Mail und optionalen Abmeldetoken
2. Aktualisiert den Abonnementstatus in der Datenbank auf `unsubscribed`
3. Benachrichtigt den E-Mail-Provider über die Abmeldung
4. Gibt Erfolgs- oder Fehlerstatus zurück

### getNewsletterStatistics

Gibt Statistiken zu Newsletter-Abonnements zurück. **Nur Admin-Zugriff.**

**Antwort**
```typescript
{
  success: true;
  data: {
    totalSubscribers: number;
    activeSubscribers: number;
    unsubscribed: number;
    bySource: Record<string, number>;   // Abonnenten nach Quelle
  };
}
```

## Datenbankabfragen

| Operation | Beschreibung |
|-----------|--------------|
| `findSubscriberByEmail` | Prüft bestehende Abonnements |
| `createSubscription` | Neues Abonnement erstellen |
| `updateSubscriptionStatus` | Status auf `active` / `unsubscribed` setzen |
| `getSubscriptionStats` | Aggregierte Statistiken abrufen |

## Konfiguration

### Quellen (sources)

| Konstante | Wert | Beschreibung |
|-----------|------|---------------|
| `NEWSLETTER_SOURCE_HOMEPAGE` | `'homepage'` | Anmeldung über die Startseite |
| `NEWSLETTER_SOURCE_CHECKOUT` | `'checkout'` | Anmeldung beim Checkout |
| `NEWSLETTER_SOURCE_PROFILE` | `'profile'` | Anmeldung über das Benutzerprofil |
| `NEWSLETTER_SOURCE_ADMIN` | `'admin'` | Admin-Import |

### E-Mail-Provider

| Provider | Umgebungsvariable | Beschreibung |
|----------|-------------------|--------------|
| Resend | `RESEND_API_KEY` | Transaktionale E-Mails über Resend |
| Novu | `NOVU_API_KEY` | Benachrichtigungsinfrastruktur über Novu |

Der aktive Provider wird durch `EMAIL_PROVIDER` in der Umgebungskonfiguration bestimmt.

## Wichtige Implementierungsdetails

- Alle Aktionen laufen serverseitig mit `'use server'` – keine direkte Client-Exposition
- E-Mail-Adressen werden vor der Speicherung normalisiert (Kleinbuchstaben, Trim)
- Abmeldetoken werden signiert, um One-Click-Abmeldungen aus E-Mails zu unterstützen
- Doppeltes Registrieren gibt keinen Fehler zurück, aktualisiert jedoch den Quellenwert

## Verwandte Seiten

- [E-Mail-Konfiguration](../configuration/email) – Provider-Setup und Vorlagen
- [Benutzerprofile](./current-user-api-endpoints) – Newsletter-Einstellungen im Profil
