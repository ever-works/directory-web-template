---
id: vote-endpoints
title: "Endpoint Voti"
sidebar_label: "Voti"
---

# Endpoint Voti

Il sistema di voto fornisce endpoint per votare positivamente o negativamente gli elementi. I voti utilizzano un modello a punteggio netto dove il conteggio rappresenta i voti positivi meno i voti negativi. Gli endpoint pubblici restituiscono i conteggi dei voti mentre gli endpoint autenticati consentono di esprimere, aggiornare e rimuovere voti. Gli utenti bloccati non possono votare.

## Panoramica

| Endpoint | Metodo | Auth | Descrizione |
|---|---|---|---|
| `/api/items/[slug]/votes` | GET | Pubblico | Ottieni il conteggio dei voti e lo stato del voto utente |
| `/api/items/[slug]/votes` | POST | Utente | Esprimi o aggiorna un voto |
| `/api/items/[slug]/votes` | DELETE | Utente | Rimuovi un voto |
| `/api/items/[slug]/votes/count` | GET | Pubblico | Ottieni solo il conteggio netto dei voti |
| `/api/items/[slug]/votes/status` | GET | Utente | Ottieni il record completo del voto per l'utente |

## Endpoint Voto Combinato

### Ottieni Informazioni sui Voti

```
GET /api/items/[slug]/votes
```

Restituisce il conteggio netto dei voti per un elemento e lo stato del voto dell'utente corrente se autenticato. Non è richiesta autenticazione, ma gli utenti autenticati ricevono il loro stato del voto nella risposta.

**Parametri di Percorso:**

| Parametro | Tipo | Descrizione |
|---|---|---|
| `slug` | string | Slug dell'elemento |

**Risposta di Successo (200):**

```json
{
  "success": true,
  "count": 15,
  "userVote": "up"
}
```

| Campo | Tipo | Descrizione |
|---|---|---|
| `success` | boolean | Sempre `true` in caso di successo |
| `count` | integer | Conteggio netto dei voti (voti positivi meno voti negativi) |
| `userVote` | string o null | `"up"`, `"down"`, o `null` se non autenticato o senza voto |

Per gli utenti non autenticati, `userVote` è sempre `null`. Il `count` può essere negativo se ci sono più voti negativi che positivi.

**Fonte:** `template/app/api/items/[slug]/votes/route.ts`

### Esprimi o Aggiorna un Voto

```
POST /api/items/[slug]/votes
```

Esprime un nuovo voto o sostituisce un voto esistente su un elemento. Se l'utente ha già un voto, il voto precedente viene eliminato prima di creare quello nuovo. Ciò significa che cambiare da voto positivo a negativo (o viceversa) è un'operazione singola.

**Autenticazione:** Richiesta

**Corpo della Richiesta:**

```json
{
  "type": "up"
}
```

| Campo | Tipo | Richiesto | Descrizione |
|---|---|---|---|
| `type` | string | Sì | `"up"` per voto positivo, `"down"` per voto negativo |

**Risposta di Successo (200):**

```json
{
  "success": true,
  "count": 16,
  "userVote": "up"
}
```

La risposta restituisce il conteggio netto aggiornato dei voti dopo l'applicazione del voto.

**Risposte di Errore:**

| Stato | Condizione |
|---|---|
| 400 | Tipo di voto non valido (deve essere `"up"` o `"down"`) |
| 401 | Non autenticato |
| 403 | L'utente è sospeso o bannato |
| 404 | Profilo cliente non trovato |

**Fonte:** `template/app/api/items/[slug]/votes/route.ts`

### Rimuovi un Voto

```
DELETE /api/items/[slug]/votes
```

Rimuove il voto dell'utente corrente da un elemento. Se non esiste alcun voto, l'operazione si completa correttamente senza errore (idempotente). Dopo la rimozione, `userVote` è `null`.

**Autenticazione:** Richiesta

**Risposta di Successo (200):**

```json
{
  "success": true,
  "count": 14,
  "userVote": null
}
```

| Stato | Condizione |
|---|---|
| 401 | Non autenticato |
| 404 | Profilo cliente non trovato |

**Fonte:** `template/app/api/items/[slug]/votes/route.ts`

## Endpoint Conteggio Voti

### Ottieni Conteggio Voti

```
GET /api/items/[slug]/votes/count
```

Restituisce solo il conteggio netto dei voti per un elemento. Questo è un endpoint pubblico leggero ottimizzato per il recupero rapido del conteggio senza lo stato del voto specifico dell'utente.

**Risposta di Successo (200):**

```json
{
  "success": true,
  "count": 15
}
```

Il conteggio può essere positivo, negativo o zero in base al bilanciamento tra voti positivi e negativi.

**Fonte:** `template/app/api/items/[slug]/votes/count/route.ts`

## Endpoint Stato Voto

### Ottieni Stato Voto Utente

```
GET /api/items/[slug]/votes/status
```

Restituisce il record completo del voto per l'utente autenticato su un elemento specifico. Restituisce `null` se l'utente non ha votato sull'elemento.

**Autenticazione:** Richiesta

**Risposta di Successo (200) -- L'Utente Ha Votato:**

```json
{
  "id": "vote_123abc",
  "userId": "client_456def",
  "itemId": "item_123abc",
  "voteType": "UPVOTE",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-20T10:30:00.000Z"
}
```

**Risposta di Successo (200) -- Nessun Voto:**

```json
null
```

Nota che questo endpoint restituisce i valori grezzi del database `voteType` (`"UPVOTE"` o `"DOWNVOTE"`) anziché il formato semplificato `"up"` / `"down"` utilizzato dall'endpoint combinato.

| Stato | Condizione |
|---|---|
| 401 | Non autenticato |
| 404 | Profilo cliente non trovato |

**Fonte:** `template/app/api/items/[slug]/votes/status/route.ts`

## Dettagli Implementativi Principali

- **Punteggio Netto:** Il conteggio dei voti è calcolato come voti positivi meno voti negativi. Un conteggio negativo indica più voti negativi che positivi.
- **Sostituzione del Voto:** Quando un utente cambia il tipo di voto, il voto esistente viene eliminato e ne viene creato uno nuovo. Non c'è aggiornamento in loco.
- **Prevenzione Utenti Bloccati:** Il controllo `isUserBlocked()` sull'endpoint POST impedisce agli utenti sospesi o bannati di votare. Il controllo è applicato solo alla creazione del voto, non alla sua rimozione.
- **Enum VoteType:** Il database memorizza i voti come `VoteType.UPVOTE` e `VoteType.DOWNVOTE`. L'API traduce questi valori in `"up"` e `"down"` per i consumatori esterni.
- **Eliminazione Idempotente:** L'eliminazione di un voto che non esiste restituisce comunque una risposta 200 con il conteggio corrente e `userVote: null`.
