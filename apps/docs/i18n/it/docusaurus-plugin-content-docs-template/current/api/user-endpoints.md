---
id: user-endpoints
title: "Endpoint Utente"
sidebar_label: "Utente"
---

# Endpoint Utente

L'API utente fornisce endpoint per la gestione delle preferenze dell'utente autenticato, dei dettagli dell'abbonamento, della cronologia dei pagamenti e delle impostazioni di posizione del profilo. Tutti gli endpoint richiedono l'autenticazione basata su sessione.

## Panoramica

| Endpoint | Metodo | Auth | Descrizione |
|---|---|---|---|
| `/api/user/currency` | GET | Pubblico | Rileva la valuta dell'utente dalle intestazioni |
| `/api/user/currency` | PUT | Utente | Aggiorna la preferenza della valuta |
| `/api/user/payments` | GET | Utente | Ottieni la cronologia dei pagamenti da Stripe |
| `/api/user/plan-status` | GET | Utente | Ottieni lo stato del piano con le informazioni di scadenza |
| `/api/user/subscription` | GET | Utente | Ottieni i dettagli dell'abbonamento |
| `/api/user/profile/location` | GET | Utente | Ottieni le impostazioni di posizione salvate |
| `/api/user/profile/location` | PATCH | Utente | Aggiorna le impostazioni di posizione |

## Rilevamento e Preferenze della Valuta

### Rileva Valuta

```
GET /api/user/currency
```

Rileva la valuta dell'utente in base alle intestazioni HTTP dei provider CDN/proxy. Questo endpoint utilizza la degradazione graduale -- restituisce sempre 200 OK con un codice di valuta valido, tornando a USD se il rilevamento fallisce. Non è richiesta autenticazione.

**Parametri di Query:**

| Parametro | Tipo | Predefinito | Descrizione |
|---|---|---|---|
| `provider` | string | `"smart"` | Provider di rilevamento: `"cloudflare"`, `"vercel"`, `"cloudfront"`, `"fastly"`, `"generic"`, `"auto"`, `"smart"` |

**Risposta di Successo (200):**

```json
{
  "currency": "EUR",
  "country": "FR",
  "detected": true
}
```

| Campo | Tipo | Descrizione |
|---|---|---|
| `currency` | string | Codice valuta ISO 4217 (3 caratteri), predefinito `"USD"` |
| `country` | string o null | Codice paese ISO 3166-1 alpha-2, null se il rilevamento è fallito |
| `detected` | boolean | Se il rilevamento è riuscito o il valore è un fallback |

Quando il rilevamento fallisce, la risposta restituisce comunque 200 con `"USD"` e `detected: false`.

**Fonte:** `template/app/api/user/currency/route.ts`

### Aggiorna Preferenza Valuta

```
PUT /api/user/currency
```

Aggiorna la valuta e il paese preferiti dell'utente autenticato. Validato tramite Zod con l'elenco `SUPPORTED_CURRENCIES` da `lib/config/billing`.

**Autenticazione:** Richiesta

**Corpo della Richiesta:**

```json
{
  "currency": "EUR",
  "country": "FR"
}
```

| Campo | Tipo | Richiesto | Descrizione |
|---|---|---|---|
| `currency` | string | Sì | Codice valuta ISO 4217 (esattamente 3 caratteri, maiuscolo) |
| `country` | string o null | No | Codice paese ISO 3166-1 alpha-2 (esattamente 2 caratteri) |

**Risposta di Successo (200):**

```json
{
  "currency": "EUR",
  "country": "FR"
}
```

| Stato | Condizione |
|---|---|
| 400 | JSON non valido, codice valuta non supportato o formato paese non valido |
| 401 | Utente non autenticato |
| 500 | Impossibile persistere l'aggiornamento |

**Fonte:** `template/app/api/user/currency/route.ts`

## Cronologia dei Pagamenti

### Ottieni Cronologia Pagamenti

```
GET /api/user/payments
```

Recupera la cronologia completa dei pagamenti dell'utente autenticato da Stripe. Recupera le fatture e gli abbonamenti, li arricchisce con i metadati del piano e restituisce un elenco ordinato di record di pagamento.

**Autenticazione:** Richiesta

**Risposta di Successo (200):**

```json
[
  {
    "id": "in_1234567890abcdef",
    "date": "2024-01-15T10:30:00.000Z",
    "amount": 29.99,
    "currency": "USD",
    "plan": "Premium Plan",
    "planId": "pro",
    "status": "Paid",
    "billingInterval": "monthly",
    "paymentProvider": "stripe",
    "subscriptionId": "sub_1234567890abcdef",
    "description": "Premium Plan - monthly billing",
    "invoiceUrl": "https://invoice.stripe.com/i/acct_123/test_abc",
    "invoicePdf": "https://pay.stripe.com/invoice/acct_123/test_abc/pdf",
    "invoiceNumber": "INV-2024-001",
    "period_end": "2024-02-15T10:30:00.000Z",
    "period_start": "2024-01-15T10:30:00.000Z"
  }
]
```

Dettagli chiave dell'elaborazione:

- Filtra solo le fatture `"paid"` e `"open"`
- Converte gli importi dai centesimi alle unità di valuta principali (divide per 100)
- Ordina per data, più recente prima
- Mappa lo stato in valori leggibili dall'utente: `"Paid"`, `"Pending"`, `"Draft"`, `"Unknown"`
- Restituisce un array vuoto `[]` se non esiste alcun cliente Stripe

**Fonte:** `template/app/api/user/payments/route.ts`

## Stato del Piano

### Ottieni Stato del Piano

```
GET /api/user/plan-status
```

Restituisce informazioni complete sullo stato del piano inclusi i dettagli di scadenza. Utilizzato dal frontend per visualizzare avvisi sul piano e limitare le funzionalità in base ai controlli del piano.

**Autenticazione:** Richiesta

**Risposta di Successo (200):**

```json
{
  "success": true,
  "data": {
    "planId": "premium",
    "effectivePlan": "premium",
    "isExpired": false,
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "daysUntilExpiration": 45,
    "isInWarningPeriod": false,
    "canAccessPlanFeatures": true,
    "warningMessage": null,
    "status": "active"
  }
}
```

| Campo | Tipo | Descrizione |
|---|---|---|
| `planId` | string | Il piano sottoscritto dall'utente: `"free"`, `"standard"`, `"premium"` |
| `effectivePlan` | string | Il piano a cui l'utente può effettivamente accedere (può differire se scaduto) |
| `isExpired` | boolean | Se l'abbonamento è scaduto |
| `expiresAt` | string o null | Data di scadenza in formato ISO |
| `daysUntilExpiration` | integer o null | Giorni alla scadenza (negativo se già scaduto) |
| `isInWarningPeriod` | boolean | True se l'abbonamento scade entro 7 giorni |
| `canAccessPlanFeatures` | boolean | Se l'utente può accedere alle funzionalità del suo piano |
| `warningMessage` | string o null | Messaggio di avviso per l'utente, se applicabile |
| `status` | string o null | Stato grezzo dell'abbonamento |

Utilizza `subscriptionService.getUserPlanWithExpiration()` da `lib/services/subscription.service`.

**Fonte:** `template/app/api/user/plan-status/route.ts`

## Dettagli dell'Abbonamento

### Ottieni Stato dell'Abbonamento

```
GET /api/user/subscription
```

Recupera informazioni dettagliate sull'abbonamento da Stripe incluso l'abbonamento attivo corrente e la cronologia completa degli abbonamenti.

**Autenticazione:** Richiesta

**Risposta di Successo (200) -- Abbonamento Attivo:**

```json
{
  "hasActiveSubscription": true,
  "currentSubscription": {
    "id": "sub_1234567890abcdef",
    "planId": "price_1234567890abcdef",
    "planName": "Premium Plan",
    "status": "active",
    "startDate": "2024-01-15T10:30:00.000Z",
    "endDate": "2024-02-15T10:30:00.000Z",
    "nextBillingDate": "2024-02-15T10:30:00.000Z",
    "paymentProvider": "stripe",
    "subscriptionId": "sub_1234567890abcdef",
    "amount": 29.99,
    "currency": "USD",
    "billingInterval": "monthly"
  },
  "subscriptionHistory": [
    {
      "id": "sub_1234567890abcdef",
      "planId": "price_1234567890abcdef",
      "planName": "Premium Plan",
      "status": "active",
      "startDate": "2024-01-15T10:30:00.000Z",
      "endDate": "2024-02-15T10:30:00.000Z",
      "amount": 29.99,
      "currency": "USD",
      "billingInterval": "monthly"
    }
  ]
}
```

Gli abbonamenti attivi sono identificati da `status === "active"` o `status === "trialing"`. Le voci della cronologia possono includere `cancelledAt` e `cancelReason` per gli abbonamenti cancellati.

**Fonte:** `template/app/api/user/subscription/route.ts`

## Posizione del Profilo

### Ottieni Impostazioni di Posizione

```
GET /api/user/profile/location
```

Restituisce la posizione predefinita salvata dell'utente autenticato e la preferenza di privacy.

**Autenticazione:** Richiesta (profilo cliente)

**Risposta di Successo (200):**

```json
{
  "defaultLatitude": 48.8566,
  "defaultLongitude": 2.3522,
  "defaultCity": "Paris",
  "defaultCountry": "FR",
  "locationPrivacy": "city"
}
```

**Fonte:** `template/app/api/user/profile/location/route.ts`

### Aggiorna Impostazioni di Posizione

```
PATCH /api/user/profile/location
```

Aggiorna la posizione predefinita e la preferenza di privacy dell'utente autenticato. Validato tramite `updateLocationSchema` da `lib/validations/user-location`.

**Corpo della Richiesta:**

```json
{
  "defaultLatitude": 48.8566,
  "defaultLongitude": 2.3522,
  "defaultCity": "Paris",
  "defaultCountry": "FR",
  "locationPrivacy": "city"
}
```

| Campo | Tipo | Richiesto | Descrizione |
|---|---|---|---|
| `defaultLatitude` | number o null | No | Coordinata latitudine |
| `defaultLongitude` | number o null | No | Coordinata longitudine |
| `defaultCity` | string o null | No | Nome della città |
| `defaultCountry` | string o null | No | Codice paese |
| `locationPrivacy` | string | No | Livello di privacy: `"private"`, `"city"`, `"exact"` |

Latitudine e longitudine devono essere fornite insieme.

**Fonte:** `template/app/api/user/profile/location/route.ts`
