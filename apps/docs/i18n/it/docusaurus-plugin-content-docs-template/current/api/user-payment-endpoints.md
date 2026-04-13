---
id: user-payment-endpoints
title: "Riferimento API Pagamenti Utente"
sidebar_label: "Pagamenti Utente"
---

# Riferimento API Pagamenti Utente

## Panoramica

Gli endpoint di Pagamento Utente gestiscono le preferenze valutarie, la cronologia dei pagamenti, lo stato del piano e i dettagli dell'abbonamento per gli utenti autenticati. Il rilevamento della valuta utilizza le intestazioni CDN/proxy (Cloudflare, Vercel, CloudFront, Fastly) per determinare automaticamente la valuta dell'utente. I dati di pagamento e abbonamento provengono da Stripe.

## Endpoint

### GET /api/user/currency

Rileva e restituisce la preferenza valutaria dell'utente in base alle intestazioni HTTP dei provider CDN/proxy. Restituisce sempre `200 OK` con degradazione graduale -- torna a USD se il rilevamento fallisce.

**Richiesta**

| Parametro | Tipo | In | Descrizione |
|-----------|--------|-------|-------------|
| provider | string | query | Provider di rilevamento: `"cloudflare"`, `"vercel"`, `"cloudfront"`, `"fastly"`, `"generic"`, `"auto"`, `"smart"` (predefinito: `"smart"`) |

**Risposta**
```typescript
{
  currency: string;     // Codice ISO 4217, es. "USD", "EUR", "GBP"
  country: string | null; // ISO 3166-1 alpha-2, es. "US", "FR", o null se il rilevamento è fallito
  detected: boolean;    // true se rilevato dalle intestazioni, false se si usa il fallback
}
```

**Esempio**
```typescript
const response = await fetch('/api/user/currency?provider=smart');
const { currency, country, detected } = await response.json();
// { currency: "EUR", country: "FR", detected: true }
```

### PUT /api/user/currency

Aggiorna la preferenza di valuta e paese dell'utente autenticato. Richiede una sessione valida.

**Richiesta**
```typescript
{
  currency: string;       // Codice ISO 4217, esattamente 3 caratteri, obbligatorio
  country?: string | null; // ISO 3166-1 alpha-2, esattamente 2 caratteri, opzionale
}
```

**Risposta**
```typescript
{
  currency: string;       // Codice valuta aggiornato
  country: string | null; // Codice paese aggiornato o null
}
```

**Esempio**
```typescript
const response = await fetch('/api/user/currency', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ currency: 'EUR', country: 'FR' })
});
const data = await response.json();
```

### GET /api/user/payments

Recupera la cronologia completa dei pagamenti dell'utente autenticato da Stripe. Restituisce le fatture con i dettagli del piano, gli intervalli di fatturazione e i link alle fatture, ordinate per data (più recente prima).

**Richiesta**

Nessun parametro richiesto. Autenticazione tramite cookie di sessione.

**Risposta**
```typescript
Array<{
  id: string;                // ID fattura Stripe
  date: string;              // Data ISO 8601
  amount: number;            // In unità di valuta principali (es. 29.99)
  currency: string;          // Codice valuta in maiuscolo
  plan: string;              // Nome visualizzato del piano
  planId: string;            // Identificatore del piano
  status: "Paid" | "Pending" | "Draft" | "Unknown";
  billingInterval: "monthly" | "yearly" | "weekly" | "daily";
  paymentProvider: "stripe";
  subscriptionId: string;    // ID abbonamento associato
  description: string;       // es. "Premium Plan - monthly billing"
  invoiceUrl: string | null; // URL fattura ospitata
  invoicePdf: string | null; // URL download PDF fattura
  invoiceNumber: string | null;
  period_end: string | null;   // Fine periodo di fatturazione (ISO 8601)
  period_start: string | null; // Inizio periodo di fatturazione (ISO 8601)
}>
```

**Esempio**
```typescript
const response = await fetch('/api/user/payments');
const payments = await response.json();
// payments[0] = { id: "in_123...", amount: 29.99, status: "Paid", ... }
```

### GET /api/user/plan-status

Restituisce il piano corrente dell'utente con i dettagli completi di scadenza, incluso il piano effettivo (a cui l'utente può effettivamente accedere), i periodi di avviso e lo stato di accesso alle funzionalità.

**Richiesta**

Nessun parametro richiesto. Autenticazione tramite cookie di sessione.

**Risposta**
```typescript
{
  success: true;
  data: {
    planId: "free" | "standard" | "premium";
    effectivePlan: "free" | "standard" | "premium"; // Può differire se scaduto
    isExpired: boolean;
    expiresAt: string | null;          // Data ISO 8601
    daysUntilExpiration: number | null; // Negativo se già scaduto
    isInWarningPeriod: boolean;        // true se scade entro 7 giorni
    canAccessPlanFeatures: boolean;
    warningMessage: string | null;     // Testo di avviso per l'utente
    status: string | null;             // Stato grezzo dell'abbonamento
  };
}
```

**Esempio**
```typescript
const response = await fetch('/api/user/plan-status');
const { data } = await response.json();

if (data.isInWarningPeriod) {
  showWarning(data.warningMessage);
}

if (!data.canAccessPlanFeatures) {
  redirectToUpgrade();
}
```

### GET /api/user/subscription

Recupera informazioni complete sull'abbonamento inclusi i dettagli dell'abbonamento attivo corrente e la cronologia completa degli abbonamenti da Stripe.

**Richiesta**

Nessun parametro richiesto. Autenticazione tramite cookie di sessione.

**Risposta**
```typescript
{
  hasActiveSubscription: boolean;
  message?: string;                    // Solo quando non viene trovato alcun cliente Stripe
  currentSubscription?: {
    id: string;                        // ID abbonamento Stripe
    planId: string;                    // ID prezzo Stripe
    planName: string;
    status: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
    startDate: string;                 // ISO 8601
    endDate: string;
    nextBillingDate: string;
    paymentProvider: "stripe";
    subscriptionId: string;
    amount: number;                    // Unità di valuta principali
    currency: string;                  // Maiuscolo
    billingInterval: "monthly" | "yearly" | "weekly" | "daily";
    currentPeriodEnd: string;
    currentPeriodStart: string;
  };
  subscriptionHistory: Array<{
    id: string;
    planId: string;
    planName: string;
    status: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete";
    startDate: string;
    endDate: string;
    cancelledAt?: string;
    cancelReason?: string;
    amount: number;
    currency: string;
    billingInterval: "monthly" | "yearly" | "weekly" | "daily";
  }>;
}
```

## Autenticazione

- **GET /api/user/currency**: Pubblico (nessuna autenticazione richiesta) -- rileva la valuta dalle intestazioni.
- **PUT /api/user/currency**: Richiede sessione autenticata.
- **GET /api/user/payments**: Richiede sessione autenticata.
- **GET /api/user/plan-status**: Richiede sessione autenticata.
- **GET /api/user/subscription**: Richiede sessione autenticata.

## Risposte di Errore

| Stato | Descrizione |
|--------|-------------|
| 400 | Codice valuta non valido, formato del codice paese non valido o payload JSON malformato |
| 401 | Non autorizzato -- nessuna sessione autenticata |
| 500 | Errore interno del server -- errore API Stripe o del database |

## Limitazione delle Richieste

Nessuna limitazione delle richieste esplicita. L'endpoint di rilevamento della valuta restituisce sempre `200 OK` per la degradazione graduale. I dati di pagamento e abbonamento vengono recuperati direttamente da Stripe con un limite di 100 record per richiesta.

## Endpoint Correlati

- [Endpoint Configurazione Funzionalità](./config-feature-endpoints) -- Verifica la disponibilità delle funzionalità in base al piano
