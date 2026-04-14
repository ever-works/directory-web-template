---
id: moderation-endpoints
title: "Moderation System"
sidebar_label: "Moderation System"
---

# Moderationssystem

## Übersicht

Das Moderationssystem ist kein eigenständiger REST-Endpunkt, sondern wird durch Admin-Report-Auflösungen ausgelöst. Wenn ein Moderator einen Bericht löst, wendet das System die entsprechende Moderationsaktion automatisch an.

**Ausgelöst durch:** `PUT /api/admin/reports/[id]` mit dem Feld `resolution`

## Auflösungswerte und Aktionen

| Auflösungswert | Ausgelöste Funktion | Beschreibung |
|----------------|--------------------|--------------|
| `content_removed` | `removeContent()` | Gemeldeten Inhalt löschen |
| `user_warned` | `warnUser()` | Benutzer warnen und Aktivität protokollieren |
| `user_suspended` | `suspendUser()` | Benutzer vorübergehend sperren |
| `user_banned` | `banUser()` | Benutzer dauerhaft sperren |
| `no_action` | (keine Aktion) | Bericht schließen ohne Maßnahme |

## Moderationsaktionen

### removeContent

Löscht oder versteckt den gemeldeten Inhalt (Kommentare, Einträge, Rezensionen usw.).

**Verarbeitungsschritte:**
1. Bestimmt den Inhalt-Typ aus den Report-Daten
2. Löscht das entsprechende Datenbankelement
3. Setzt `contentRemoved: true` im Bericht
4. Protokolliert die Moderationshandlung

```typescript
await moderationService.removeContent({
  reportId: string;
  contentType: 'comment' | 'item' | 'review' | 'message';
  contentId: string;
  moderatorId: string;
});
```

### warnUser

Erteilt dem Benutzer eine Warnung und protokolliert diese.

**Verarbeitungsschritte:**
1. Erstellt einen Warnungs-Eintrag in der Moderationshistorie
2. Inkrementiert den Warnungszähler des Benutzers
3. Sendet optional eine Benachrichtigungs-E-Mail

```typescript
await moderationService.warnUser({
  userId: string;
  reportId: string;
  reason: string;
  moderatorId: string;
});
```

### suspendUser

Sperrt den Benutzer vorübergehend (konfigurierbare Dauer).

**Verarbeitungsschritte:**
1. Setzt `status: 'suspended'` in der Benutzertabelle
2. Setzt das Ablaufdatum der Sperrung
3. Ungültig macht alle aktiven Sitzungen
4. Protokolliert die Suspendierung in der Moderationshistorie

```typescript
await moderationService.suspendUser({
  userId: string;
  reportId: string;
  durationDays: number;   // Standard: 7
  reason: string;
  moderatorId: string;
});
```

### banUser

Sperrt den Benutzer dauerhaft und verhindert zukünftige Anmeldungen.

**Verarbeitungsschritte:**
1. Setzt `status: 'banned'` in der Benutzertabelle
2. Ungültig macht alle aktiven Sitzungen
3. Blockiert künftige Registrierungen mit derselben E-Mail
4. Protokolliert das Verbot in der Moderationshistorie

```typescript
await moderationService.banUser({
  userId: string;
  reportId: string;
  reason: string;
  moderatorId: string;
});
```

## Inhaltseigenstümer-Auflösung

Bevor eine Inhalts-Aktion ausgeführt wird, löst das System den Inhaltseigenstümer auf:

```typescript
async function resolveContentOwner(contentType: string, contentId: string): Promise<string | null> {
  switch (contentType) {
    case 'comment':  return db.query.comments.findFirst(...);
    case 'item':     return db.query.items.findFirst(...);
    case 'review':   return db.query.reviews.findFirst(...);
    default:         return null;
  }
}
```

## Moderationshistorie

Alle Aktionen werden in der Tabelle `moderation_history` protokolliert.

### Felder der Moderationshistorie

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | `string` | Eindeutiger Bezeichner |
| `reportId` | `string` | Zugehöriger Bericht-ID |
| `moderatorId` | `string` | Admin-Benutzer-ID |
| `targetUserId` | `string \| null` | Betroffener Benutzer |
| `contentType` | `string \| null` | Typ des betroffenen Inhalts |
| `contentId` | `string \| null` | Betroffener Inhalts-ID |
| `action` | `string` | Durchgeführte Aktion |
| `reason` | `string \| null` | Begründung für die Aktion |
| `createdAt` | `timestamp` | Zeitstempel der Aktion |

## Benutzerstatus-Verwaltung

| Status | Beschreibung |
|--------|--------------|
| `active` | Standard-Benutzer-Status |
| `warned` | Benutzer hat eine oder mehrere Warnungen erhalten |
| `suspended` | Vorübergehend gesperrt – kann sich nicht anmelden |
| `banned` | Dauerhaft gesperrt – alle Zugriffsmöglichkeiten gesperrt |

## Verwandte API-Referenzen

- [Admin-Berichte-Endpunkte](./admin-reports-endpoints) – REST-API für den Berichts-Auflösungsworkflow
- [Admin-Benutzer-Endpunkte](./admin-users-endpoints) – Direktes Benutzer-Status-Management
