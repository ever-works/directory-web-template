---
id: moderation-endpoints
title: "Moderation System"
sidebar_label: "Moderation System"
---

# Moderatiesysteem

Het moderatiesysteem biedt programmatische inhoudsmoderatie via een servicelaag in plaats van zelfstandige API-eindpunten. Moderatieacties worden automatisch geactiveerd wanneer beheerders inhoudsrapporten oplossen via de Rapporten-API. Het systeem ondersteunt het waarschuwen van gebruikers, het schorsen van accounts, het verbannen van accounts en het verwijderen van inhoud, met volledige audithistorie en e-mailmeldingen.

## Overzicht

Moderatie is niet beschikbaar als afzonderlijke REST-eindpunten. In plaats daarvan wordt het aangeroepen via de workflow voor het oplossen van rapporten:

```
PUT /api/admin/reports/[id]  -->  resolutie triggert moderatieactie
```

Wanneer een beheerder een `resolution`-waarde instelt op een rapport, wordt de bijbehorende moderatiefunctie automatisch uitgevoerd.

| Resolutiewaarde | Moderatiefunctie | Effect |
|---|---|---|
| `content_removed` | `removeContent()` | Verwijdert de gerapporteerde reactie of het item (soft delete) |
| `user_warned` | `warnUser()` | Verhoogt het waarschuwingsaantal van de gebruiker |
| `user_suspended` | `suspendUser()` | Stelt de gebruikersstatus in op `"suspended"` |
| `user_banned` | `banUser()` | Stelt de gebruikersstatus in op `"banned"` |
| `no_action` | Geen | Er wordt geen moderatieactie ondernomen |

## Moderatieacties

### Inhoud verwijderen

```typescript
removeContent(contentType, contentId, reportId, adminId): Promise<ModerationResult>
```

Verwijdert de gerapporteerde inhoud op basis van het type. Voor reacties wordt een soft delete uitgevoerd (stelt `deletedAt` in). Voor items wordt het item verwijderd uit de Git-gebaseerde contentrepository.

**Parameters:**

| Parameter | Type | Beschrijving |
|---|---|---|
| `contentType` | `"item"` of `"comment"` | Type inhoud om te verwijderen |
| `contentId` | string | ID of slug van de inhoud |
| `reportId` | string | Bijbehorend rapport-ID |
| `adminId` | string | Beheerder die de actie uitvoert |

**Verwerkingsstappen:**

1. Inhoudeigenaar opzoeken via `getContentOwner()`
2. Als reactie: soft delete via `deleteComment()`
3. Als item: verwijderen uit Git-repository via `itemRepository.delete()`
4. Moderatiehistorie registreren met actie `CONTENT_REMOVED`
5. E-mailmelding over inhoudsverwijdering sturen naar de inhoudeigenaar

**Bron:** `template/lib/services/moderation.service.ts`

### Gebruiker waarschuwen

```typescript
warnUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Geeft een waarschuwing aan een gebruiker door het veld `warningCount` te verhogen. Gebruikers die al verbannen zijn kunnen geen waarschuwingen ontvangen.

**Parameters:**

| Parameter | Type | Beschrijving |
|---|---|---|
| `userId` | string | Clientprofiel-ID van de gebruiker |
| `reason` | string | Reden voor de waarschuwing |
| `reportId` | string | Bijbehorend rapport-ID |
| `adminId` | string | Beheerder die de actie uitvoert |

**Verwerkingsstappen:**

1. Verifiëren dat de gebruiker bestaat en niet al verbannen is
2. Waarschuwingsaantal verhogen via `incrementWarningCount()`
3. Moderatiehistorie registreren met actie `WARN`
4. E-mailmelding met waarschuwing sturen inclusief het huidige waarschuwingsaantal

**Succesresultaat:**

```json
{
  "success": true,
  "message": "User warned successfully. Total warnings: 3"
}
```

**Bron:** `template/lib/services/moderation.service.ts`

### Gebruiker schorsen

```typescript
suspendUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Schorst een gebruikersaccount door de status in te stellen op `"suspended"` en een `suspendedAt`-tijdstempel vast te leggen. Geschorste gebruikers kunnen geen reacties plaatsen, stemmen uitbrengen of rapporten indienen.

**Beveiligingen:**

- Geeft een fout terug als de gebruiker al geschorst is
- Geeft een fout terug als de gebruiker al verbannen is

**Verwerkingsstappen:**

1. Verifiëren dat de gebruiker bestaat en niet al geschorst of verbannen is
2. Status instellen op `"suspended"` met `suspendedAt`-tijdstempel
3. Moderatiehistorie registreren met actie `SUSPEND`
4. E-mailmelding over schorsing sturen

**Bron:** `template/lib/services/moderation.service.ts`

### Gebruiker verbannen

```typescript
banUser(userId, reason, reportId, adminId): Promise<ModerationResult>
```

Verbant een gebruikersaccount permanent door de status in te stellen op `"banned"` en een `bannedAt`-tijdstempel vast te leggen. Verbande gebruikers worden geblokkeerd voor alle geauthenticeerde acties.

**Beveiligingen:**

- Geeft een fout terug als de gebruiker al verbannen is

**Verwerkingsstappen:**

1. Verifiëren dat de gebruiker bestaat en niet al verbannen is
2. Status instellen op `"banned"` met `bannedAt`-tijdstempel
3. Moderatiehistorie registreren met actie `BAN`
4. E-mailmelding over verbanning sturen

**Bron:** `template/lib/services/moderation.service.ts`

## Bepaling van inhoudeigenaar

De functie `getContentOwner()` bepaalt wie de eigenaar is van de gerapporteerde inhoud:

| Inhoudstype | Bron van eigenaar |
|---|---|
| `comment` | Veld `comment.userId` uit de reactietabel |
| `item` | Veld `item.submitted_by` uit de itemrepository |

Dit wordt gebruikt door alle moderatieacties op gebruikersniveau (`user_warned`, `user_suspended`, `user_banned`) om de doelgebruiker van de actie te identificeren.

**Bron:** `template/lib/services/moderation.service.ts`

## Moderatiehistorie

Alle moderatieacties maken een auditspoor in de databasetabel `moderationHistory`.

### Velden van het historierecord

| Veld | Type | Beschrijving |
|---|---|---|
| `id` | string | Uniek record-ID |
| `userId` | string | Clientprofiel-ID van de betreffende gebruiker |
| `action` | string | `"CONTENT_REMOVED"`, `"WARN"`, `"SUSPEND"` of `"BAN"` |
| `reason` | string of null | Reden voor de moderatieactie |
| `reportId` | string of null | Bijbehorend rapport-ID |
| `performedBy` | string of null | ID van de beheerder die de actie heeft uitgevoerd |
| `contentType` | string of null | `"item"` of `"comment"` (bij inhoudsverwijdering) |
| `contentId` | string of null | ID van de verwijderde inhoud |
| `details` | object of null | Aanvullende context (bijv. waarschuwingsaantal, itemnaam) |
| `createdAt` | tijdstempel | Wanneer de actie is uitgevoerd |

### Historiequery's

| Functie | Beschrijving |
|---|---|
| `getModerationHistoryByUser(userId, limit)` | Alle moderatieacties voor een gebruiker ophalen (standaard limiet: 50) |
| `getModerationHistoryByReport(reportId)` | Moderatieacties gekoppeld aan een specifiek rapport ophalen |

Beide queryfuncties verrijken resultaten met gebruikersprofielinformatie en de details van de uitvoerende beheerder.

**Bron:** `template/lib/db/queries/moderation.queries.ts`

## Gebruikersstatusbeheer

### Statuswaarden

| Status | Beschrijving |
|---|---|
| `active` | Normaal account, alle functies beschikbaar |
| `suspended` | Tijdelijk beperkt, kan geen inhoud aanmaken |
| `banned` | Permanent beperkt, geblokkeerd voor alle acties |

### Databasebewerkingen

| Functie | Beschrijving |
|---|---|
| `suspendUser(userId)` | Stelt status in op `"suspended"`, legt `suspendedAt` vast |
| `unsuspendUser(userId)` | Herstelt status naar `"active"`, wist `suspendedAt` |
| `banUser(userId)` | Stelt status in op `"banned"`, legt `bannedAt` vast |
| `unbanUser(userId)` | Herstelt status naar `"active"`, wist `bannedAt` |
| `incrementWarningCount(userId)` | Verhoogt `warningCount` met SQL `COALESCE` |

### Controles voor geblokkeerde gebruikers

Twee hulpfuncties controleren de gebruikersstatus in de gehele applicatie:

- **`isUserBlocked(status)`** -- Geeft `true` terug als de status `"suspended"` of `"banned"` is
- **`getBlockReasonMessage(status)`** -- Geeft een gebruikersgerichte melding terug die uitlegt waarom de actie beperkt is

Deze controles worden gebruikt door de eindpunten voor reacties, stemmen en rapporten om te voorkomen dat geblokkeerde gebruikers inhoud aanmaken.

**Bron:** `template/lib/db/queries/moderation.queries.ts`

## E-mailmeldingen

De `EmailNotificationService` verstuurt niet-blokkerende meldingen voor moderatieacties:

| Methode | Trigger |
|---|---|
| `sendContentRemovedEmail(email, type, reason)` | Inhoud verwijderd door beheerder |
| `sendUserWarningEmail(email, reason, count)` | Waarschuwing gegeven |
| `sendUserSuspensionEmail(email, reason)` | Account geschorst |
| `sendUserBanEmail(email, reason)` | Account verbannen |

Alle e-mailverzendingen gebruiken `.catch()` om te voorkomen dat mislukkingen de moderatieworkflow onderbreken. Een mislukte e-mail leidt er niet toe dat de moderatieactie zelf mislukt.

## Belangrijke implementatiedetails

- **Servicelaagpatroon:** Moderatielogica bevindt zich in `lib/services/moderation.service.ts`, niet in API-routeafhandelaars. Dit maakt hergebruik via verschillende ingangspunten mogelijk.
- **Auditspoor:** Elke moderatieactie maakt een `moderationHistory`-record aan, waardoor een volledig auditlog beschikbaar is voor naleving en beoordeling.
- **Niet-blokkerende e-mails:** E-mailmeldingen worden asynchroon verzonden met `.catch()`-afhandelaars. Als de e-mailservice niet beschikbaar is, slaagt de moderatieactie toch.
- **Idempotentiebeveiligingen:** Elke actie controleert de huidige gebruikersstatus voor de uitvoering. Het verbannen van een al verbande gebruiker geeft een fout terug in plaats van een dubbele actie aan te maken.
- **Soft delete vs. hard delete:** Reacties worden soft-deleted (door `deletedAt` in te stellen), terwijl items volledig worden verwijderd uit de Git-repository. Dit verschil weerspiegelt het opslagmodel (database versus op bestanden gebaseerde inhoud).
