---
id: extraction-endpoints
title: "Endpoint di Estrazione e Verifica"
sidebar_label: "Estrazione e Verifica"
sidebar_position: 19
---

# Endpoint di Estrazione e Verifica

Questi endpoint forniscono l'estrazione dei metadati degli URL (tramite l'API della Piattaforma Ever Works) e la verifica del token Google reCAPTCHA. Entrambi fungono da proxy sicuri lato server per mantenere le chiavi API e i segreti fuori dal codice lato client.

**File sorgente:**
- `template/app/api/extract/route.ts`
- `template/app/api/verify-recaptcha/route.ts`

## Riepilogo degli endpoint

| Metodo | Percorso | Autenticazione | Descrizione |
|--------|------|------|-------------|
| POST | `/api/extract` | Nessuna | Estrai metadati degli elementi da un URL |
| POST | `/api/verify-recaptcha` | Nessuna | Verifica un token reCAPTCHA |

---

## POST `/api/extract`

Un proxy sicuro che estrae i metadati degli elementi (nome, descrizione, suggerimenti di categoria) da un URL specificato utilizzando l'API della Piattaforma Ever Works. L'endpoint mantiene le credenziali `PLATFORM_API_URL` e `PLATFORM_API_SECRET_TOKEN` lato server.

### Disponibilità della funzionalità

Questo endpoint richiede la configurazione di `PLATFORM_API_URL`. Quando non configurato, restituisce una risposta che indica che la funzionalità è disabilitata anziché un errore:

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

### Corpo della richiesta

| Campo | Tipo | Richiesto | Descrizione |
|-------|------|----------|-------------|
| `url` | string (URL) | **Sì** | L'URL da cui estrarre i metadati |
| `existingCategories` | string[] | No | Nomi di categorie esistenti per aiutare con la categorizzazione |

Validato utilizzando uno schema Zod:

```ts
const extractSchema = z.object({
  url: z.string().url('Invalid URL format'),
  existingCategories: z.array(z.string()).optional()
});
```

### Esempio di richiesta

```json
{
  "url": "https://example.com/product",
  "existingCategories": ["Productivity", "Developer Tools"]
}
```

### Come funziona

Il gestore effettua il proxy della richiesta all'endpoint `/extract-item-details` dell'API della Piattaforma:

```ts
const extractionEndpoint =
  `${platformApiUrl.replace(/\/+$/, '')}/extract-item-details`;

const response = await fetch(extractionEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(platformApiToken
      ? { Authorization: `Bearer ${platformApiToken}` }
      : {})
  },
  body: JSON.stringify({
    source_url: url,
    existing_data: existingCategories?.length > 0
      ? existingCategories
      : undefined
  })
});
```

### Risposta: 200 (Successo)

La risposta viene passata direttamente dall'API della Piattaforma:

```json
{
  "success": true,
  "data": {
    "name": "Awesome Product",
    "description": "A great product description",
    "category": "Productivity",
    "tags": ["saas", "tool"],
    "icon_url": "https://example.com/favicon.ico"
  }
}
```

### Risposta: 200 (Funzionalità disabilitata)

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

### Risposte di errore

| Stato | Descrizione |
|--------|-------------|
| 400 | Formato URL non valido (validazione Zod) |
| Varia | Errore API upstream (codice di stato passato dall'API della Piattaforma) |
| 500 | Errore interno del server durante l'estrazione |

### Variabili d'ambiente

| Variabile | Richiesta | Descrizione |
|----------|----------|-------------|
| `PLATFORM_API_URL` | Sì (per la funzionalità) | URL base dell'API della Piattaforma Ever Works |
| `PLATFORM_API_SECRET_TOKEN` | No | Token Bearer per chiamate autenticate all'API della Piattaforma |

---

## POST `/api/verify-recaptcha`

Verifica un token Google reCAPTCHA comunicando con l'API `siteverify` di Google. Supporta token reCAPTCHA v2 e v3. In modalità sviluppo, l'endpoint può bypassare la verifica quando la chiave segreta non è configurata.

### Corpo della richiesta

| Campo | Tipo | Richiesto | Descrizione |
|-------|------|----------|-------------|
| `token` | string | **Sì** | Token reCAPTCHA dalla verifica lato client |

### Esempio di richiesta

```json
{
  "token": "03AGdBq25SiXT-pmSeBXjzScW..."
}
```

### Come funziona

Il gestore invia il token all'endpoint di verifica di Google usando dati del modulo URL-encoded:

```ts
const response = await externalClient.postForm(
  "https://www.google.com/recaptcha/api/siteverify",
  {
    secret: secretKey,
    response: token,
  }
);
```

### Risposta: 200 (Verificato)

```json
{
  "success": true,
  "score": 0.9,
  "action": "submit",
  "hostname": "example.com",
  "challenge_ts": "2024-01-15T10:30:00Z",
  "error_codes": []
}
```

### Risposta: 200 (Verifica fallita)

```json
{
  "success": false,
  "score": 0.1,
  "action": "submit",
  "hostname": "example.com",
  "challenge_ts": "2024-01-15T10:30:00Z",
  "error_codes": ["invalid-input-response"]
}
```

### Bypass in modalità sviluppo

Quando `RECAPTCHA_SECRET_KEY` non è configurato e `NODE_ENV` è `"development"`, l'endpoint bypassa la verifica e restituisce successo:

```ts
if (!secretKey) {
  if (coreConfig.NODE_ENV === "development") {
    return NextResponse.json({
      success: true,
      score: 1.0,
      action: "bypass",
    });
  }
  return NextResponse.json(
    { success: false, error: "ReCAPTCHA not configured" },
    { status: 500 }
  );
}
```

### Risposte di errore

| Stato | Descrizione |
|--------|-------------|
| 400 | Campo `token` mancante o vuoto |
| 500 | Chiave segreta non configurata (solo produzione) |
| 500 | Richiesta API Google fallita |
| 500 | Errore imprevisto durante la verifica |

### Campi della risposta

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `success` | boolean | Se la verifica è superata |
| `score` | number (0.0-1.0) | Punteggio reCAPTCHA v3 (1.0 = probabilmente umano, 0.0 = probabilmente bot) |
| `action` | string | Nome dell'azione da reCAPTCHA |
| `hostname` | string | Hostname dove è avvenuta la verifica |
| `challenge_ts` | string | Timestamp della sfida |
| `error_codes` | string[] | Codici di errore dall'API di Google |

### Variabili d'ambiente

| Variabile | Richiesta | Descrizione |
|----------|----------|-------------|
| `RECAPTCHA_SECRET_KEY` | Sì (produzione) | Chiave segreta Google reCAPTCHA |

---

## Esempi di utilizzo

### Estrazione URL

```ts
// Estrai metadati da un URL per il modulo di invio degli elementi
const res = await fetch('/api/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/product',
    existingCategories: ['Productivity', 'Developer Tools']
  })
});

const data = await res.json();

if (data.featureDisabled) {
  // Funzionalità non disponibile, salta il riempimento automatico
  console.log('Estrazione non disponibile');
} else if (data.success) {
  // Riempi automaticamente i campi del modulo
  setName(data.data.name);
  setDescription(data.data.description);
}
```

### Verifica reCAPTCHA

```ts
// Verifica il token reCAPTCHA prima dell'invio del modulo
const recaptchaToken = await grecaptcha.execute(siteKey, {
  action: 'submit'
});

const res = await fetch('/api/verify-recaptcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: recaptchaToken })
});

const { success, score } = await res.json();

if (success && score >= 0.5) {
  // Procedi con l'invio del modulo
  submitForm();
} else {
  // Mostra la sfida di verifica umana
  showCaptchaChallenge();
}
```

---

## File sorgente correlati

| File | Scopo |
|------|---------|
| `template/app/api/extract/route.ts` | Proxy di estrazione URL |
| `template/app/api/verify-recaptcha/route.ts` | Proxy di verifica reCAPTCHA |
| `template/lib/api/server-api-client.ts` | Client API esterno con supporto `postForm` |
| `template/lib/config/config-service.ts` | Servizio di configurazione per le variabili d'ambiente |
