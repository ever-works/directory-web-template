---
id: sponsor-ads-endpoints
title: "Endpoint API Sponsor Ads"
sidebar_label: "Sponsor Ads"
---

# Endpoint API Sponsor Ads

L'API Sponsor Ads gestisce l'intero ciclo di vita degli annunci sponsorizzati: creazione, checkout di pagamento, rinnovo, cancellazione e statistiche. Si integra con molteplici provider di pagamento (Stripe, LemonSqueezy, Polar) per la fatturazione.

**File sorgente:**
- `template/app/api/sponsor-ads/route.ts`
- `template/app/api/sponsor-ads/checkout/route.ts`
- `template/app/api/sponsor-ads/user/route.ts`
- `template/app/api/sponsor-ads/user/[id]/route.ts`
- `template/app/api/sponsor-ads/user/[id]/cancel/route.ts`
- `template/app/api/sponsor-ads/user/[id]/renew/route.ts`
- `template/app/api/sponsor-ads/user/stats/route.ts`

## Riepilogo Endpoint

| Metodo | Percorso | Auth | Descrizione |
|--------|------|------|-------------|
| GET | `/api/sponsor-ads` | Nessuna | Ottieni gli annunci sponsor attivi (pubblico) |
| POST | `/api/sponsor-ads/checkout` | Sessione | Crea sessione di checkout |
| GET | `/api/sponsor-ads/user` | Sessione | Elenca gli annunci sponsor dell'utente |
| POST | `/api/sponsor-ads/user` | Sessione | Invia nuovo annuncio sponsor |
| GET | `/api/sponsor-ads/user/{id}` | Sessione | Ottieni un singolo annuncio sponsor |
| POST | `/api/sponsor-ads/user/{id}/cancel` | Sessione | Annulla un annuncio sponsor |
| POST | `/api/sponsor-ads/user/{id}/renew` | Sessione | Rinnova un annuncio sponsor |
| GET | `/api/sponsor-ads/user/stats` | Sessione | Ottieni le statistiche degli annunci dell'utente |

---

## GET `/api/sponsor-ads`

Restituisce gli annunci sponsor attivi con i dati dell'elemento associato per la visualizzazione pubblica. **Autenticazione non richiesta.**

### Parametri di Query

| Parametro | Tipo | Richiesto | Predefinito | Descrizione |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 10 | Numero massimo di annunci da restituire (1-50) |

### Risposta: 200

```json
{
  "success": true,
  "data": [
    {
      "sponsor": {
        "id": "sp_123",
        "itemSlug": "featured-tool",
        "status": "active",
        "interval": "monthly"
      },
      "item": {
        "name": "Featured Tool",
        "slug": "featured-tool",
        "description": "A great tool",
        "icon_url": "https://example.com/icon.png",
        "category": "productivity"
      }
    }
  ]
}
```

---

## POST `/api/sponsor-ads/checkout`

Crea una sessione di checkout di pagamento per un annuncio sponsor approvato. Supporta i provider Stripe, LemonSqueezy e Polar.

### Corpo della Richiesta

| Campo | Tipo | Richiesto | Descrizione |
|-------|------|----------|-------------|
| `sponsorAdId` | string | **Sì** | ID dell'annuncio sponsor approvato |
| `successUrl` | string | No | URL di reindirizzamento dopo il pagamento riuscito |
| `cancelUrl` | string | No | URL di reindirizzamento dopo il pagamento annullato |

### Sicurezza: Prevenzione Open Redirect

Gli URL di reindirizzamento vengono convalidati rispetto all'origine dell'applicazione per prevenire attacchi di open redirect:

```ts
function validateRedirectUrl(url, allowedOrigin) {
  const urlObj = new URL(url, allowedOrigin);
  const allowedUrlObj = new URL(allowedOrigin);
  // Consente solo stesso protocollo, hostname e porta
  return urlObj.protocol === allowedUrlObj.protocol &&
    urlObj.hostname === allowedUrlObj.hostname &&
    urlObj.port === allowedUrlObj.port;
}
```

Gli URL non validi vengono silenziosamente sostituiti con valori predefiniti sicuri.

### Risposta: 200

```json
{
  "success": true,
  "data": {
    "checkoutId": "cs_live_abc123",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_live_abc123",
    "provider": "stripe"
  },
  "message": "Checkout session created successfully"
}
```

### Risposte di Errore

| Stato | Descrizione |
|--------|-------------|
| 400 | ID annuncio sponsor mancante, annuncio non nello stato `pending_payment`, o configurazione prezzo mancante |
| 401 | Non autenticato |
| 403 | L'utente non possiede questo annuncio sponsor |
| 404 | Annuncio sponsor non trovato |

---

## GET `/api/sponsor-ads/user`

Restituisce un elenco paginato degli annunci sponsor appartenenti all'utente autenticato.

### Parametri di Query

| Parametro | Tipo | Richiesto | Predefinito | Descrizione |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Numero di pagina |
| `limit` | integer | No | 10 | Elementi per pagina |
| `status` | string | No | -- | Filtro: `"pending"`, `"approved"`, `"rejected"`, `"active"`, `"expired"`, `"cancelled"` |
| `interval` | string | No | -- | Filtra per intervallo di fatturazione |
| `search` | string | No | -- | Filtro di ricerca testuale |

I parametri di query vengono convalidati usando lo schema Zod `querySponsorAdsSchema`.

### Risposta: 200

```json
{
  "success": true,
  "data": [
    {
      "id": "sp_123",
      "itemSlug": "my-tool",
      "status": "active",
      "interval": "monthly"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

## POST `/api/sponsor-ads/user`

Crea una nuova submission di annuncio sponsor. L'annuncio inizia in stato pending in attesa dell'approvazione dell'amministratore.

### Corpo della Richiesta

| Campo | Tipo | Richiesto | Descrizione |
|-------|------|----------|-------------|
| `itemSlug` | string | **Sì** | Slug dell'elemento da sponsorizzare |
| `itemName` | string | **Sì** | Nome visualizzato dell'elemento |
| `itemIconUrl` | string | No | URL icona |
| `itemCategory` | string | No | Categoria elemento |
| `itemDescription` | string | No | Descrizione (max 500 caratteri) |
| `interval` | `"weekly"` o `"monthly"` | **Sì** | Intervallo di abbonamento |

### Risposta: 201 Creato

```json
{
  "success": true,
  "data": {
    "id": "sp_new123",
    "status": "pending",
    "interval": "monthly"
  },
  "message": "Sponsor ad submission created successfully. Pending admin approval."
}
```

### 400 -- Submission Duplicata

```json
{
  "success": false,
  "error": "You already have an active sponsor ad"
}
```

---

## GET `/api/sponsor-ads/user/{id}`

Recupera un singolo annuncio sponsor di proprietà dell'utente autenticato. Restituisce 404 se l'annuncio non esiste o appartiene a un altro utente (per prevenire la divulgazione di informazioni).

---

## POST `/api/sponsor-ads/user/{id}/cancel`

Annulla un annuncio sponsor. Solo gli annunci con stato `pending_payment`, `pending` o `active` possono essere annullati.

### Corpo della Richiesta

| Campo | Tipo | Richiesto | Descrizione |
|-------|------|----------|-------------|
| `cancelReason` | string | No | Motivo della cancellazione (max 500 caratteri) |

### Risposta: 200

```json
{
  "success": true,
  "data": { "id": "sp_123", "status": "cancelled" },
  "message": "Sponsor ad cancelled successfully"
}
```

### Risposte di Errore

| Stato | Descrizione |
|--------|-------------|
| 400 | Impossibile annullare l'annuncio con lo stato corrente |
| 403 | L'utente non possiede questo annuncio sponsor |
| 404 | Annuncio sponsor non trovato |

---

## POST `/api/sponsor-ads/user/{id}/renew`

Crea una sessione di checkout per rinnovare un annuncio sponsor attivo o scaduto. Solo gli annunci con stato `active` o `expired` possono essere rinnovati.

### Corpo della Richiesta

| Campo | Tipo | Richiesto | Descrizione |
|-------|------|----------|-------------|
| `successUrl` | string | No | URL di reindirizzamento dopo il pagamento |
| `cancelUrl` | string | No | URL di reindirizzamento in caso di cancellazione |

### Risposta: 200

```json
{
  "success": true,
  "data": {
    "checkoutId": "cs_renewal_abc",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_renewal_abc",
    "provider": "stripe"
  },
  "message": "Renewal checkout session created successfully"
}
```

---

## GET `/api/sponsor-ads/user/stats`

Restituisce le statistiche degli annunci sponsor dell'utente autenticato, inclusa la suddivisione per stato, la distribuzione degli intervalli e le metriche di fatturato.

### Risposta: 200

```json
{
  "success": true,
  "stats": {
    "overview": {
      "total": 15,
      "pendingPayment": 2,
      "pending": 3,
      "active": 5,
      "rejected": 1,
      "expired": 3,
      "cancelled": 1
    },
    "byInterval": {
      "weekly": 8,
      "monthly": 7
    },
    "revenue": {
      "totalRevenue": 45000,
      "weeklyRevenue": 20000,
      "monthlyRevenue": 25000
    }
  }
}
```

I valori di fatturato sono in **unità di valuta minori** (ad esempio, centesimi per USD).

---

## Configurazione del Provider di Pagamento

Il provider di pagamento attivo è determinato da `NEXT_PUBLIC_PAYMENT_PROVIDER` (predefinito `"stripe"`). Ogni provider richiede il proprio set di variabili d'ambiente per ID prezzo/variante:

| Provider | Variabile Env Prezzo Settimanale | Variabile Env Prezzo Mensile |
|----------|---------------------|-----------------------|
| Stripe | `STRIPE_SPONSOR_WEEKLY_PRICE_ID` | `STRIPE_SPONSOR_MONTHLY_PRICE_ID` |
| LemonSqueezy | `LEMONSQUEEZY_SPONSOR_WEEKLY_VARIANT_ID` | `LEMONSQUEEZY_SPONSOR_MONTHLY_VARIANT_ID` |
| Polar | `POLAR_SPONSOR_WEEKLY_PRICE_ID` | `POLAR_SPONSOR_MONTHLY_PRICE_ID` |
