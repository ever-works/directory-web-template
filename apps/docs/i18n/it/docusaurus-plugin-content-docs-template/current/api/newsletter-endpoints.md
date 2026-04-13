---
id: newsletter-endpoints
title: Azioni Server Newsletter
sidebar_label: Newsletter
sidebar_position: 26
---

# Azioni Server Newsletter

Il sistema newsletter utilizza le Server Actions di Next.js anziché i tradizionali handler delle route API. Queste azioni gestiscono le iscrizioni email inclusa la sottoscrizione, la disiscrizione e il recupero delle statistiche. Le notifiche email vengono inviate per entrambi gli eventi di iscrizione e disiscrizione utilizzando provider email configurabili.

## Panoramica

| Azione | Autenticazione | Descrizione |
|---|---|---|
| `subscribeToNewsletter` | Pubblica | Iscrive un'email alla newsletter |
| `unsubscribeFromNewsletter` | Pubblica | Disiscrivi un'email dalla newsletter |
| `getNewsletterStatistics` | Nessuna | Ottieni le statistiche di iscrizione |

Queste sono Server Actions definite con `'use server'` e invocate dai componenti React tramite invii di form o chiamate dirette, non tramite endpoint HTTP.

## Azioni Server

### Iscrizione alla Newsletter

```typescript
subscribeToNewsletter(data: { email: string })
```

Iscrive un indirizzo email alla newsletter. Valida l'email usando Zod, verifica la presenza di iscrizioni attive duplicate, crea il record nel database e invia un'email di benvenuto. L'email viene automaticamente normalizzata in minuscolo e ripulita dagli spazi.

**Validazione dell'Input (Zod):**

| Campo | Tipo | Richiesto | Vincoli |
|---|---|---|---|
| `email` | string | Sì | Deve essere un formato email valido |

**Risposta di Successo:**

```json
{
  "success": true
}
```

**Risposte di Errore:**

```json
{
  "error": "Email is already subscribed to the newsletter",
  "email": "user@example.com"
}
```

| Errore | Condizione |
|---|---|
| `"Please enter a valid email address"` | Formato email non valido (validazione Zod) |
| `"Email is already subscribed to the newsletter"` | Esiste già un'iscrizione attiva |
| `"Failed to create subscription. Please try again."` | Inserimento nel database fallito |
| `"Failed to subscribe to newsletter. Please try again."` | Errore imprevisto |

**Fasi di Elaborazione:**

1. Valida e normalizza l'email (minuscolo, rimozione spazi)
2. Verifica un'iscrizione attiva esistente tramite `getNewsletterSubscriptionByEmail`
3. Crea il record di iscrizione con sorgente `"footer"` tramite `createNewsletterSubscription`
4. Invia l'email di benvenuto usando il provider email configurato (Resend o Novu)

I fallimenti nell'invio email vengono catturati silenziosamente e non impediscono il completamento dell'iscrizione.

**Sorgente:** `template/app/[locale]/newsletter/actions.ts`

### Disiscrizione dalla Newsletter

```typescript
unsubscribeFromNewsletter(data: { email: string })
```

Disiscrivi un'email dalla newsletter impostando `isActive` su `false`. Invia un'email di conferma della disiscrizione.

**Risposta di Successo:**

```json
{
  "success": true
}
```

**Risposte di Errore:**

| Errore | Condizione |
|---|---|
| `"Email is not subscribed to the newsletter"` | Nessuna iscrizione attiva trovata |
| `"Failed to unsubscribe. Please try again."` | Aggiornamento del database fallito |

**Sorgente:** `template/app/[locale]/newsletter/actions.ts`

### Ottieni Statistiche Newsletter

```typescript
getNewsletterStatistics()
```

Restituisce le statistiche aggregate della newsletter. Nessun parametro di input richiesto.

**Risposta di Successo:**

```json
{
  "success": true,
  "data": {
    "totalActive": 1250,
    "recentSubscriptions": 45
  }
}
```

| Campo | Tipo | Descrizione |
|---|---|---|
| `totalActive` | integer | Numero di iscrizioni attualmente attive |
| `recentSubscriptions` | integer | Iscrizioni create negli ultimi 30 giorni |

Restituisce zero per entrambi i campi in caso di errore nella query, garantendo una degradazione elegante.

**Sorgente:** `template/app/[locale]/newsletter/actions.ts`

## Query del Database

I dati delle iscrizioni alla newsletter sono gestiti tramite funzioni di query dedicate in `lib/db/queries/newsletter.queries.ts`.

### Operazioni sulle Iscrizioni

| Funzione | Descrizione |
|---|---|
| `createNewsletterSubscription(email, source)` | Crea un nuovo record di iscrizione |
| `getNewsletterSubscriptionByEmail(email)` | Cerca un'iscrizione per email |
| `updateNewsletterSubscription(email, updates)` | Aggiorna i campi dell'iscrizione |
| `unsubscribeFromNewsletter(email)` | Imposta `isActive: false` e registra `unsubscribedAt` |
| `resubscribeToNewsletter(email)` | Imposta `isActive: true` e cancella `unsubscribedAt` |
| `getNewsletterStats()` | Restituisce il conteggio attivo e il conteggio iscrizioni di 30 giorni |

Tutte le ricerche email normalizzano l'input in minuscolo e rimuovono gli spazi prima di effettuare la query.

**Sorgente:** `template/lib/db/queries/newsletter.queries.ts`

## Configurazione

Le costanti di configurazione della newsletter sono definite in `lib/newsletter/config.ts`:

```
NEWSLETTER_CONFIG.DEFAULT_PROVIDER = "resend"
NEWSLETTER_CONFIG.DEFAULT_FROM = "onboarding@resend.dev"
NEWSLETTER_CONFIG.DEFAULT_COMPANY_NAME = "Ever Works"
```

### Sorgenti di Iscrizione

| Sorgente | Descrizione |
|---|---|
| `footer` | Iscrizione dal form nel piè di pagina del sito |
| `popup` | Iscrizione da un dialogo popup |
| `signup` | Iscrizione durante la registrazione dell'utente |

### Schema di Validazione

Due schema Zod vengono esportati per la validazione:

- **`emailSchema`** -- valida e normalizza un singolo campo email
- **`newsletterSubscriptionSchema`** -- valida email e sorgente (predefinito: `"footer"`)

### Provider Email

Il sistema supporta due provider email configurati tramite `config.yml` e variabili d'ambiente:

| Provider | Variabile d'Ambiente | Descrizione |
|---|---|---|
| Resend | `RESEND_API_KEY` | Provider email predefinito |
| Novu | `NOVU_API_KEY` | Provider alternativo con supporto per template |

Il provider viene selezionato in base al campo `mail.provider` in `config.yml`. La configurazione email viene costruita dinamicamente dalla configurazione dell'app usando `createEmailConfig()`.

**Sorgente:** `template/lib/newsletter/config.ts`

## Dettagli Chiave di Implementazione

- **Server Actions:** Non sono endpoint REST API. Usano il wrapper `validatedAction` da `lib/auth/middleware` che fornisce la validazione dello schema Zod prima dell'esecuzione dell'azione.
- **Normalizzazione Email:** Tutte le email vengono normalizzate in minuscolo e ripulite sia a livello di azione che a livello di query del database per ricerche coerenti.
- **Fallimenti Email Eleganti:** Le email di benvenuto e di conferma disiscrizione vengono inviate tramite `sendEmailSafely()`, che cattura gli errori silenziosamente. Un'email fallita non impedisce il completamento dell'operazione di iscrizione.
- **Prevenzione Duplicati:** Prima di creare un'iscrizione, il sistema verifica la presenza di un'iscrizione attiva esistente usando `validateExistingSubscription()`.
- **Disiscrizione Soft:** La disiscrizione imposta `isActive: false` invece di eliminare il record, preservando la cronologia delle iscrizioni.
