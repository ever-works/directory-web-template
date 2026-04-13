---
id: admin-endpoints
title: "Endpoint API Admin"
sidebar_label: "Endpoint Admin"
---

# Endpoint API Admin

L'API admin contiene circa 60 route handler distribuiti in 19 gruppi di risorse. Tutti gli endpoint admin sono protetti dal middleware `withAdminAuth`, che verifica sia l'autenticazione che l'assegnazione del ruolo admin tramite query al database.

## Autenticazione

Ogni endpoint admin richiede:

1. Una sessione JWT valida (verificata tramite `auth()`)
2. Un ruolo admin nella tabella `user_roles` (verificato tramite `isAdmin()` da `lib/db/roles.ts`)

Le richieste non autenticate ricevono una risposta `401`. Le richieste autenticate ma non admin ricevono una risposta `403`.

## Gruppi di risorse

### Categorie (`/api/admin/categories`)

Gestisci le categorie di contenuto con persistenza basata su Git.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/admin/categories` | Elenca categorie con paginazione |
| `POST` | `/api/admin/categories` | Crea una nuova categoria |
| `GET` | `/api/admin/categories/all` | Ottieni tutte le categorie (senza paginazione) |
| `POST` | `/api/admin/categories/git` | Sincronizza le categorie con il repository Git |
| `POST` | `/api/admin/categories/reorder` | Riordina le posizioni delle categorie |
| `GET` | `/api/admin/categories/[id]` | Ottieni categoria per ID |
| `PUT` | `/api/admin/categories/[id]` | Aggiorna categoria |
| `DELETE` | `/api/admin/categories/[id]` | Elimina categoria |

### Clienti (`/api/admin/clients`)

Gestisci gli account utente client e i profili.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/admin/clients` | Elenca profili cliente con paginazione |
| `POST` | `/api/admin/clients/advanced-search` | Ricerca avanzata clienti con filtri |
| `POST` | `/api/admin/clients/bulk` | Operazioni bulk sui clienti |
| `GET` | `/api/admin/clients/dashboard` | Statistiche della dashboard clienti |
| `GET` | `/api/admin/clients/stats` | Statistiche aggregate dei clienti |
| `GET` | `/api/admin/clients/[clientId]` | Ottieni dettagli profilo cliente |
| `PUT` | `/api/admin/clients/[clientId]` | Aggiorna profilo cliente |
| `DELETE` | `/api/admin/clients/[clientId]` | Elimina account cliente |

### Collezioni (`/api/admin/collections`)

Gestisci le collezioni di elementi curate.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/admin/collections` | Elenca tutte le collezioni |
| `POST` | `/api/admin/collections` | Crea una nuova collezione |
| `GET` | `/api/admin/collections/[id]` | Ottieni dettagli collezione |
| `PUT` | `/api/admin/collections/[id]` | Aggiorna collezione |
| `DELETE` | `/api/admin/collections/[id]` | Elimina collezione |
| `GET` | `/api/admin/collections/[id]/items` | Elenca elementi in una collezione |
| `PUT` | `/api/admin/collections/[id]/items` | Aggiorna gli elementi della collezione |

### Commenti (`/api/admin/comments`)

Modera i commenti degli utenti.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/admin/comments` | Elenca commenti con filtri di moderazione |
| `GET` | `/api/admin/comments/[id]` | Ottieni dettagli del commento |
| `PUT` | `/api/admin/comments/[id]` | Aggiorna commento (approva/rifiuta) |
| `DELETE` | `/api/admin/comments/[id]` | Elimina commento |

### Aziende (`/api/admin/companies`)

Gestisci i profili aziendali collegati agli elementi.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/admin/companies` | Elenca aziende |
| `POST` | `/api/admin/companies` | Crea azienda |
| `GET` | `/api/admin/companies/[id]` | Ottieni dettagli azienda |
| `PUT` | `/api/admin/companies/[id]` | Aggiorna azienda |
| `DELETE` | `/api/admin/companies/[id]` | Elimina azienda |

### Dashboard (`/api/admin/dashboard`)

Analisi aggregate della dashboard.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/admin/dashboard/stats` | Statistiche riassuntive della dashboard |

### Elementi in evidenza (`/api/admin/featured-items`)

Gestisci i highlight degli elementi in evidenza.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/admin/featured-items` | Elenca elementi in evidenza |
| `POST` | `/api/admin/featured-items` | Metti in evidenza un elemento |
| `GET` | `/api/admin/featured-items/[id]` | Ottieni dettagli elemento in evidenza |
| `PUT` | `/api/admin/featured-items/[id]` | Aggiorna impostazioni elemento in evidenza |
| `DELETE` | `/api/admin/featured-items/[id]` | Rimuovi dall'evidenza |

### Analisi geografiche (`/api/admin/geo-analytics`)

Analisi geografica e dati di distribuzione dei visitatori.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/admin/geo-analytics` | Ottieni dati di analisi geografica |

### Elementi (`/api/admin/items`)

Gestione completa del contenuto degli elementi.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/admin/items` | Elenca elementi con filtri e paginazione |
| `POST` | `/api/admin/items` | Crea un nuovo elemento |
| `POST` | `/api/admin/items/bulk` | Operazioni bulk sugli elementi (approva, rifiuta, elimina) |
| `GET` | `/api/admin/items/stats` | Statistiche aggregate degli elementi |
| `GET` | `/api/admin/items/[id]` | Ottieni dettagli elemento |
| `PUT` | `/api/admin/items/[id]` | Aggiorna elemento |
| `DELETE` | `/api/admin/items/[id]` | Elimina elemento |
| `GET` | `/api/admin/items/[id]/history` | Ottieni la cronologia di audit dell'elemento |
| `POST` | `/api/admin/items/[id]/review` | Invia la revisione dell'elemento (approva/rifiuta) |

### Indice posizioni (`/api/admin/location-index`)

Gestisci l'indicizzazione della ricerca geografica delle posizioni.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `POST` | `/api/admin/location-index` | Ricostruisci l'indice di ricerca delle posizioni |

### Navigazione (`/api/admin/navigation`)

Configurazione della navigazione dell'amministratore.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/admin/navigation` | Ottieni la struttura di navigazione |
| `PUT` | `/api/admin/navigation` | Aggiorna la navigazione |

### Notifiche (`/api/admin/notifications`)

Gestione delle notifiche dell'amministratore.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/admin/notifications` | Elenca le notifiche dell'amministratore |
| `POST` | `/api/admin/notifications/mark-all-read` | Segna tutte le notifiche come lette |
| `POST` | `/api/admin/notifications/[id]/read` | Segna una singola notifica come letta |

### Rapporti (`/api/admin/reports`)

Gestione e moderazione dei rapporti sui contenuti.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/admin/reports` | Elenca i rapporti sui contenuti |
| `GET` | `/api/admin/reports/stats` | Statistiche dei rapporti |
| `GET` | `/api/admin/reports/[id]` | Ottieni dettagli del rapporto |
| `PUT` | `/api/admin/reports/[id]` | Aggiorna lo stato del rapporto (risolvi, ignora) |

### Ruoli (`/api/admin/roles`)

Gestione dei ruoli e delle autorizzazioni per RBAC.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/admin/roles` | Elenca ruoli con paginazione |
| `POST` | `/api/admin/roles` | Crea un nuovo ruolo |
| `GET` | `/api/admin/roles/active` | Ottieni solo i ruoli attivi |
| `GET` | `/api/admin/roles/stats` | Statistiche dei ruoli |
| `GET` | `/api/admin/roles/[id]` | Ottieni dettagli del ruolo |
| `PUT` | `/api/admin/roles/[id]` | Aggiorna ruolo |
| `DELETE` | `/api/admin/roles/[id]` | Elimina ruolo (eliminazione soft) |
| `GET` | `/api/admin/roles/[id]/permissions` | Ottieni le autorizzazioni del ruolo |
| `PUT` | `/api/admin/roles/[id]/permissions` | Aggiorna le autorizzazioni del ruolo |

### Impostazioni (`/api/admin/settings`)

Gestione delle impostazioni dell'applicazione.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/admin/settings` | Ottieni tutte le impostazioni |
| `PUT` | `/api/admin/settings` | Aggiorna le impostazioni |
| `GET` | `/api/admin/settings/map-status` | Ottieni lo stato della funzione mappa |

### Annunci Sponsor (`/api/admin/sponsor-ads`)

Moderazione degli annunci pubblicitari sponsorizzati.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/admin/sponsor-ads` | Elenca gli annunci sponsor |
| `GET` | `/api/admin/sponsor-ads/[id]` | Ottieni dettagli annuncio |
| `PUT` | `/api/admin/sponsor-ads/[id]` | Aggiorna annuncio |
| `POST` | `/api/admin/sponsor-ads/[id]/approve` | Approva annuncio sponsor |
| `POST` | `/api/admin/sponsor-ads/[id]/reject` | Rifiuta annuncio sponsor |
| `POST` | `/api/admin/sponsor-ads/[id]/cancel` | Annulla annuncio sponsor |

### Tag (`/api/admin/tags`)

Gestione dei tag dei contenuti.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/admin/tags` | Elenca tag con paginazione |
| `POST` | `/api/admin/tags` | Crea un nuovo tag |
| `GET` | `/api/admin/tags/all` | Ottieni tutti i tag (senza paginazione) |
| `GET` | `/api/admin/tags/[id]` | Ottieni dettagli del tag |
| `PUT` | `/api/admin/tags/[id]` | Aggiorna tag |
| `DELETE` | `/api/admin/tags/[id]` | Elimina tag |

### Twenty CRM (`/api/admin/twenty-crm`)

Configurazione e test dell'integrazione CRM.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/admin/twenty-crm/config` | Ottieni la configurazione CRM |
| `PUT` | `/api/admin/twenty-crm/config` | Aggiorna la configurazione CRM |
| `POST` | `/api/admin/twenty-crm/test-connection` | Testa la connessione CRM |

### Utenti (`/api/admin/users`)

Gestione degli utenti amministratori.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/admin/users` | Elenca utenti con paginazione |
| `POST` | `/api/admin/users` | Crea un nuovo utente |
| `GET` | `/api/admin/users/stats` | Statistiche utenti |
| `GET` | `/api/admin/users/check-email` | Verifica disponibilità email |
| `GET` | `/api/admin/users/check-username` | Verifica disponibilità nome utente |
| `GET` | `/api/admin/users/[id]` | Ottieni dettagli utente |
| `PUT` | `/api/admin/users/[id]` | Aggiorna utente |
| `DELETE` | `/api/admin/users/[id]` | Elimina utente |

## Pattern comuni

### Operazioni bulk

Diversi gruppi di risorse supportano operazioni bulk tramite POST con un array di ID:

```json
POST /api/admin/items/bulk
{
  "action": "approve",
  "ids": ["item-1", "item-2", "item-3"]
}
```

### Endpoint delle statistiche

La maggior parte dei gruppi di risorse include un endpoint `/stats` che restituisce conteggi aggregati:

```json
GET /api/admin/items/stats
{
  "success": true,
  "data": {
    "total": 1250,
    "published": 980,
    "pending": 120,
    "rejected": 50,
    "draft": 100
  }
}
```

### Cronologia di audit

Gli elementi supportano il tracciamento della cronologia di audit tramite l'endpoint `/[id]/history`, che registra chi ha apportato modifiche e quando.
