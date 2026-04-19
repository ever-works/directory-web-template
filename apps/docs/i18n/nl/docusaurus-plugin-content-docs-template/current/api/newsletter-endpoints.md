---
id: newsletter-endpoints
title: "Newsletter Server Actions"
sidebar_label: "Newsletter Server Actions"
---

# Nieuwsbrief Server Actions

:::info
Dit zijn Next.js Server Actions, geen standaard REST API-eindpunten. Ze worden rechtstreeks vanuit Client Components aangeroepen zonder HTTP-aanvragen.
:::

## Overzicht

De nieuwsbrieffunctionaliteit is geïmplementeerd als Next.js Server Actions voor directe server-client communicatie. Er zijn drie acties beschikbaar voor het beheren van nieuwsbriefabonnementen.

| Actie | Beschrijving |
|------|-------------|
| `subscribeToNewsletter` | Gebruiker aanmelden voor de nieuwsbrief |
| `unsubscribeFromNewsletter` | Gebruiker afmelden van de nieuwsbrief |
| `getNewsletterStatistics` | Abonnee-statistieken ophalen (beheerder) |

## Aanmelden voor nieuwsbrief

### Handtekening

```typescript
async function subscribeToNewsletter(
  email: string,
  source?: string
): Promise<{ success: boolean; message?: string }>
```

### Parameters

| Parameter | Type | Vereist | Beschrijving |
|-----------|------|---------|-------------|
| `email` | string | Ja | E-mailadres van de abonnee |
| `source` | string | Nee | Bron van de aanmelding (bijv. `"footer"`, `"popup"`) |

### Verwerking

1. E-mailadres valideren met Zod
2. Controleren op bestaand abonnement in de database
3. Nieuw abonnementrecord aanmaken of bestaand opnieuw activeren
4. E-mailprovider-API aanroepen (Mailchimp, Resend, enz.)
5. Welkomstmail sturen indien geconfigureerd

### Geslaagde reactie

```typescript
{ success: true }
```

### Foutreacties

| Fout | Beschrijving |
|-------|-------------|
| `Invalid email address` | E-mailvalidatie mislukt |
| `Already subscribed` | Gebruiker is al actief abonnee |
| `Failed to subscribe` | Databasefout of fout bij e-mailprovider |

## Afmelden van nieuwsbrief

### Handtekening

```typescript
async function unsubscribeFromNewsletter(
  email: string
): Promise<{ success: boolean; message?: string }>
```

### Parameters

| Parameter | Type | Vereist | Beschrijving |
|-----------|------|---------|-------------|
| `email` | string | Ja | E-mailadres om af te melden |

### Verwerking

1. E-mailadres valideren met Zod
2. Abonnementrecord opzoeken in de database
3. Status bijwerken naar `unsubscribed`
4. Afmeldingsmelding sturen bij e-mailprovider

### Geslaagde reactie

```typescript
{ success: true }
```

### Foutreacties

| Fout | Beschrijving |
|-------|-------------|
| `Invalid email address` | E-mailvalidatie mislukt |
| `Not subscribed` | E-mailadres niet gevonden als abonnee |
| `Failed to unsubscribe` | Databasefout of fout bij e-mailprovider |

## Abonnee-statistieken ophalen

### Handtekening

```typescript
async function getNewsletterStatistics(): Promise<NewsletterStats>
```

:::caution
Deze actie vereist beheerdersbevoegdheden. Niet-beheerders ontvangen een fout `Unauthorized`.
:::

### Geslaagde reactie

```typescript
interface NewsletterStats {
  total: number;           // Totaal aantal abonnees (actief)
  unsubscribed: number;    // Totaal afgemeld
  sources: {
    [source: string]: number;   // Abonnees per bron
  };
  recentSignups: number;       // Aanmeldingen afgelopen 30 dagen
}
```

### Voorbeeld

```json
{
  "total": 1234,
  "unsubscribed": 89,
  "sources": {
    "footer": 745,
    "popup": 412,
    "checkout": 77
  },
  "recentSignups": 43
}
```

## Databasevragen

De Server Actions gebruiken de volgende databasebewerkingen:

| Bewerking | Beschrijving |
|-----------|-------------|
| `findSubscriberByEmail` | Abonneerecord opzoeken op e-mailadres |
| `createSubscriber` | Nieuw abonneerecord aanmaken |
| `updateSubscriberStatus` | Status bijwerken naar `subscribed` of `unsubscribed` |
| `countActiveSubscribers` | Totaal aantal actieve abonnees tellen |
| `getSubscribersBySource` | Abonnees groeperen op aanmeldingsbron |

## Configuratie

| Variabele | Beschrijving |
|----------|-------------|
| `NEWSLETTER_PROVIDER` | E-mailprovider (`mailchimp`, `resend`, `none`) |
| `MAILCHIMP_API_KEY` | API-sleutel voor Mailchimp (indien gebruikt) |
| `MAILCHIMP_LIST_ID` | Mailchimp doelgroep-ID |
| `RESEND_API_KEY` | API-sleutel voor Resend (indien gebruikt) |
| `RESEND_AUDIENCE_ID` | Resend doelgroep-ID |

## Aanmeldingsbronnen

De `source`-parameter bijhouden maakt marketinganalyse mogelijk. Aanbevolen bronwaarden:

| Bron | Beschrijving |
|------|-------------|
| `footer` | Formulier in de paginavoettekst |
| `popup` | Pop-up bij intentie om te vertrekken |
| `checkout` | Aanmelding tijdens afrekeningsproces |
| `profile` | Gebruikersprofielpagina |
| `blog` | Inschrijvingsformulier voor de blog |

## E-mailproviders

De nieuwsbriefintegratie ondersteunt meerdere e-mailproviders:

| Provider | Omgevingsvariabelen | Beschrijving |
|----------|---------------------|-------------|
| Mailchimp | `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID` | Volledig functionele e-marketingdienst |
| Resend | `RESEND_API_KEY`, `RESEND_AUDIENCE_ID` | Op ontwikkelaars gerichte e-maildienst |
| Geen | — | Alleen lokale databaseopslag, geen externe provider |

## Belangrijkste implementatiedetails

- Server Actions voeren CSRF-bescherming automatisch uit via het Next.js-framework
- E-mailadressen worden genormaliseerd naar kleine letters vóór de databaseopslag
- Dubbele aanmeldingen worden zonder fout verwerkt (idempotent ontwerp)
- Afmeldingsverzoeken voor niet-bestaande e-mailadressen worden stilzwijgend geslaagd
- Beheerdersstatus wordt geverifieerd via de `auth()`-helper bij elke aanroep van `getNewsletterStatistics`
