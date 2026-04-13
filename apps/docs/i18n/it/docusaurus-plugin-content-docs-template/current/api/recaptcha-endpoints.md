---
id: recaptcha-endpoints
title: "Riferimento API reCAPTCHA"
sidebar_label: "reCAPTCHA"
---

# Riferimento API reCAPTCHA

## Panoramica

L'endpoint reCAPTCHA fornisce la verifica lato server dei token Google reCAPTCHA v3. Funge da proxy sicuro tra il client e l'API di verifica di Google, mantenendo la chiave segreta lato server. In modalità sviluppo, la verifica può essere ignorata quando la chiave segreta non è configurata.

## Endpoint

### POST /api/verify-recaptcha

Verifica un token Google reCAPTCHA v3 comunicando con l'endpoint API `siteverify` di Google. Restituisce il risultato della verifica, incluso il punteggio bot/umano.

**Richiesta**
```typescript
{
  token: string;   // Token reCAPTCHA da grecaptcha.execute() lato client
}
```

**Risposta**
```typescript
{
  success: boolean;           // Se la verifica è passata
  score?: number;             // Da 0.0 (bot) a 1.0 (umano)
  action?: string;            // Nome dell'azione dalla sfida reCAPTCHA
  hostname?: string;          // Hostname dove è avvenuta la verifica
  challenge_ts?: string;      // Timestamp ISO 8601 della sfida
  error_codes?: string[];     // Codici di errore dall'API di Google (se presenti)
}
```

**Esempio**
```typescript
// Lato client: ottieni il token
const token = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'submit' });

// Verifica lato server
const response = await fetch('/api/verify-recaptcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
});

const result = await response.json();

if (result.success && result.score > 0.5) {
  // Procedi con l'invio del modulo
} else {
  // Blocca l'attività sospetta di bot
}
```

### Comportamento in Modalità Sviluppo

Quando `RECAPTCHA_SECRET_KEY` non è configurata e `NODE_ENV` è `"development"`, l'endpoint ignora la verifica di Google e restituisce:

```typescript
{
  success: true,
  score: 1.0,
  action: "bypass"
}
```

Viene registrato un avviso nella console indicando che la verifica viene ignorata.

## Autenticazione

Questo endpoint è **pubblico** -- non è richiesta autenticazione. È progettato per essere chiamato dai flussi di invio moduli lato client prima o durante l'elaborazione del modulo.

## Risposte di Errore

| Stato | Descrizione |
|--------|-------------|
| 400 | `token` mancante o vuoto nel corpo della richiesta |
| 500 | `RECAPTCHA_SECRET_KEY` non configurata (solo in produzione), richiesta API di Google fallita o errore di runtime inaspettato |

## Limitazione delle Richieste

Non viene applicata alcuna limitazione delle richieste a livello applicativo. L'API reCAPTCHA di Google ha i propri limiti di frequenza. L'endpoint utilizza il formato `application/x-www-form-urlencoded` quando comunica con l'API di Google.

## Endpoint Correlati

Questo è un endpoint di sicurezza autonomo. Viene tipicamente richiamato prima degli invii di moduli o azioni sensibili in tutta l'applicazione.
