---
id: sponsor-checkout-endpoints
title: "Riferimento API Sponsor Ads & Checkout"
sidebar_label: "Sponsor Ads & Checkout"
---

# Riferimento API Sponsor Ads & Checkout

## Panoramica

Gli endpoint Sponsor Ads gestiscono l'intero ciclo di vita dei posizionamenti di annunci sponsorizzati sugli elementi della directory. Ciò include la navigazione degli annunci attivi, l'invio di nuove richieste sponsor, la gestione degli annunci di proprietà dell'utente, l'elaborazione dei pagamenti attraverso molteplici provider (Stripe, LemonSqueezy, Polar) e la gestione di cancellazioni e rinnovi. Il flusso di checkout supporta intervalli di fatturazione settimanali e mensili.

## Endpoint

### GET /api/sponsor-ads

Restituisce un elenco degli annunci sponsor attualmente attivi con i dati dell'elemento associato per la visualizzazione pubblica.

**Richiesta**

| Parametro | Tipo    | In    | Descrizione |
| --------- | ------- | ----- | ----------- |
| limit     | integer | query | Numero massimo di annunci sponsor da restituire (predefinito: 10, max: 50) |

**Risposta**

```typescript
{
  success: true;
  data: Array<{
    sponsor: {
      id: string;
      itemSlug: string;
      status: string;
      interval: string;
    };
    item: {
      name: string;
      slug: string;
      description: string;
      icon_url: string;
      category: string;
    } | null;
  }>;
}
```

**Esempio**

```typescript
const response = await fetch("/api/sponsor-ads?limit=5");
const { data: sponsoredItems } = await response.json();
```

### GET /api/sponsor-ads/user

Restituisce un elenco paginato degli annunci sponsor inviati dall'utente autenticato.

**Richiesta**

| Parametro | Tipo    | In    | Descrizione |
| --------- | ------- | ----- | ----------- |
| page      | integer | query | Numero di pagina (predefinito: 1) |
| limit     | integer | query | Elementi per pagina (predefinito: 10) |
| status    | string  | query | Filtro: `"pending"`, `"approved"`, `"rejected"`, `"active"`, `"expired"`, `"cancelled"` |
| interval  | string  | query | Filtro: `"weekly"`, `"monthly"` |
| search    | string  | query | Termine di ricerca |

**Risposta**

```typescript
{
  success: true;
  data: Array<SponsorAd>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }
}
```

**Esempio**

```typescript
const response = await fetch("/api/sponsor-ads/user?status=active&page=1");
const { data, pagination } = await response.json();
```

### POST /api/sponsor-ads/user

Crea una nuova submission di annuncio sponsor per l'utente autenticato. La submission inizia in stato pending in attesa dell'approvazione dell'amministratore.

**Richiesta**

```typescript
{
  itemSlug: string;          // Slug dell'elemento da sponsorizzare (obbligatorio)
  itemName: string;          // Nome dell'elemento (obbligatorio)
  itemIconUrl?: string;      // URL icona
  itemCategory?: string;     // Categoria dell'elemento
  itemDescription?: string;  // Descrizione (max 500 caratteri)
  interval: "weekly" | "monthly"; // Intervallo di fatturazione (obbligatorio)
}
```

**Risposta**

```typescript
{
  success: true;
  data: SponsorAd;
  message: "Sponsor ad submission created successfully. Pending admin approval.";
}
```

**Esempio**

```typescript
const response = await fetch("/api/sponsor-ads/user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    itemSlug: "my-awesome-tool",
    itemName: "My Awesome Tool",
    interval: "monthly",
  }),
});
```

### GET /api/sponsor-ads/user/stats

Restituisce le statistiche per gli annunci sponsor dell'utente autenticato, inclusi i conteggi per stato, la distribuzione degli intervalli e le metriche di fatturato.

**Richiesta**

Nessun parametro richiesto. Autenticazione tramite cookie di sessione.

**Risposta**

```typescript
{
  success: true;
  stats: {
    overview: {
      total: number;
      pendingPayment: number;
      pending: number;
      active: number;
      rejected: number;
      expired: number;
      cancelled: number;
    }
    byInterval: {
      weekly: number;
      monthly: number;
    }
    revenue: {
      totalRevenue: number; // In unità di valuta minori (centesimi)
      weeklyRevenue: number;
      monthlyRevenue: number;
    }
  }
}
```

**Esempio**

```typescript
const response = await fetch("/api/sponsor-ads/user/stats");
const { stats } = await response.json();
console.log(
  `Active ads: ${stats.overview.active}, Total revenue: ${stats.revenue.totalRevenue}`,
);
```

### GET `/api/sponsor-ads/user/{id}`

Restituisce un singolo annuncio sponsor di proprietà dell'utente autenticato.

**Richiesta**

| Parametro | Tipo   | In   | Descrizione |
| --------- | ------ | ---- | ----------- |
| id        | string | path | ID annuncio sponsor (obbligatorio) |

**Risposta**

```typescript
{
  success: true;
  data: SponsorAd;
}
```

### POST /api/sponsor-ads/checkout

Crea una sessione di checkout per un annuncio sponsor approvato. L'annuncio sponsor deve essere nello stato `pending_payment` e di proprietà dell'utente autenticato.

**Richiesta**

```typescript
{
  sponsorAdId: string;      // ID dell'annuncio sponsor approvato (obbligatorio)
  successUrl?: string;      // URL di reindirizzamento dopo il pagamento riuscito
  cancelUrl?: string;       // URL di reindirizzamento dopo il pagamento annullato
}
```

**Risposta**

```typescript
{
  success: true;
  data: {
    checkoutId: string; // ID sessione di checkout del provider
    checkoutUrl: string; // URL per reindirizzare l'utente al pagamento
    provider: string; // "stripe", "lemonsqueezy", oppure "polar"
  }
  message: "Checkout session created successfully";
}
```

**Esempio**

```typescript
const response = await fetch("/api/sponsor-ads/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sponsorAdId: "ad-123",
    successUrl: "https://myapp.com/sponsor/success?sponsorAdId=ad-123",
    cancelUrl: "https://myapp.com/sponsor?cancelled=true",
  }),
});

const { data } = await response.json();
window.location.href = data.checkoutUrl; // Reindirizza al pagamento
```

### POST `/api/sponsor-ads/user/{id}/cancel`

Annulla un annuncio sponsor di proprietà dell'utente autenticato. È possibile annullare solo gli annunci con stato `pending_payment`, `pending` o `active`.

**Richiesta**

```typescript
{
  cancelReason?: string;   // Motivo opzionale della cancellazione (max 500 caratteri)
}
```

**Risposta**

```typescript
{
  success: true;
  data: SponsorAd; // L'annuncio sponsor annullato
  message: "Sponsor ad cancelled successfully";
}
```

**Esempio**

```typescript
const response = await fetch("/api/sponsor-ads/user/ad-123/cancel", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ cancelReason: "No longer needed" }),
});
```

### POST `/api/sponsor-ads/user/{id}/renew`

Crea una sessione di checkout per rinnovare un annuncio sponsor attivo o scaduto. Solo gli annunci con stato `active` o `expired` possono essere rinnovati.

**Richiesta**

```typescript
{
  successUrl?: string;     // URL di reindirizzamento dopo il pagamento riuscito
  cancelUrl?: string;      // URL di reindirizzamento dopo il pagamento annullato
}
```

**Risposta**

```typescript
{
  success: true;
  data: {
    checkoutId: string;
    checkoutUrl: string;
    provider: string;
  }
  message: "Renewal checkout session created successfully";
}
```

**Esempio**

```typescript
const response = await fetch("/api/sponsor-ads/user/ad-123/renew", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    successUrl:
      "https://myapp.com/sponsor/success?sponsorAdId=ad-123&renewal=true",
  }),
});
const { data } = await response.json();
window.location.href = data.checkoutUrl;
```

## Autenticazione

| Endpoint | Auth Richiesta |
| ---------------------------------------- | ------------------------------------- |
| GET /api/sponsor-ads | Pubblica |
| GET /api/sponsor-ads/user | Sessione richiesta |
| POST /api/sponsor-ads/user | Sessione richiesta |
| GET /api/sponsor-ads/user/stats | Sessione richiesta |
| `GET /api/sponsor-ads/user/{id}` | Sessione richiesta (verifica proprietà) |
| POST /api/sponsor-ads/checkout | Sessione richiesta (verifica proprietà) |
| `POST /api/sponsor-ads/user/{id}/cancel` | Sessione richiesta (verifica proprietà) |
| `POST /api/sponsor-ads/user/{id}/renew` | Sessione richiesta (verifica proprietà) |

Tutti gli endpoint specifici per utente verificano la proprietà: tentare di accedere all'annuncio sponsor di un altro utente restituisce `404` (per GET) o `403` (per le azioni).

## Risposte di Errore

| Stato | Descrizione |
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| 400    | Input non valido, submission duplicata, stato non annullabile/non rinnovabile, configurazione prezzo mancante o JSON non valido |
| 401    | Non autorizzato -- nessuna sessione autenticata |
| 403    | Vietato -- l'utente non possiede l'annuncio sponsor |
| 404    | Annuncio sponsor non trovato |
| 500    | Errore interno del server -- errore del provider di pagamento o del database |

## Limitazione della Velocità

Nessuna limitazione della velocità esplicita. Gli URL di reindirizzamento negli endpoint di checkout e rinnovo vengono convalidati rispetto al dominio dell'applicazione per prevenire vulnerabilità di open redirect. Il provider di pagamento attivo è determinato dalla variabile d'ambiente `NEXT_PUBLIC_PAYMENT_PROVIDER` (predefinito Stripe).

## Endpoint Correlati

- [Endpoint Pagamenti Utente](./user-payment-endpoints) -- Cronologia pagamenti utente e gestione abbonamenti
