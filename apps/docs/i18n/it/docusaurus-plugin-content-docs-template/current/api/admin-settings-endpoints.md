---
id: admin-settings-endpoints
title: "Endpoint API Admin Impostazioni"
sidebar_label: "Admin Impostazioni"
---

# Endpoint API Admin Impostazioni

L'API Impostazioni fornisce l'accesso alla configurazione dell'applicazione, incluse le impostazioni di sistema, la configurazione del provider mappe e le opzioni funzionali. Tutti gli endpoint richiedono l'autenticazione come amministratore.

## Percorso base

```
/api/admin/settings
```

## Riepilogo delle route

| Metodo  | Percorso                             | Auth  | Descrizione                      |
| ------- | --------------------------------- | ----- | -------------------------------- |
| `GET`   | `/api/admin/settings`             | Amministratore | Ottieni tutte le impostazioni           |
| `PATCH` | `/api/admin/settings`             | Amministratore | Aggiorna le impostazioni              |
| `GET`   | `/api/admin/settings/map-status`  | Amministratore | Ottieni lo stato del provider mappa |

---

## Ottieni impostazioni

```
GET /api/admin/settings
```

Restituisce tutte le impostazioni dell'applicazione come oggetto chiave-valore. Le impostazioni sensibili (chiavi API, segreti) vengono oscurate nella risposta.

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "site_name": "My Directory",
    "site_description": "The best directory for tools",
    "site_url": "https://mydirectory.com",
    "contact_email": "admin@mydirectory.com",
    "items_per_page": "12",
    "enable_comments": "true",
    "enable_votes": "true",
    "enable_map": "true",
    "map_provider": "google",
    "map_api_key": "***REDACTED***",
    "enable_sponsor_ads": "true",
    "enable_newsletter": "false",
    "maintenance_mode": "false"
  }
}
```

---

## Aggiorna impostazioni

```
PATCH /api/admin/settings
```

Aggiorna una o più impostazioni. Solo i campi forniti vengono aggiornati (aggiornamento parziale).

**Corpo della richiesta:**

```json
{
  "site_name": "Updated Directory Name",
  "enable_comments": "true",
  "items_per_page": "24"
}
```

Le impostazioni sono memorizzate come stringhe. Valori booleani e numerici vengono convertiti in stringa.

**Risposta (200):**

```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    "updated": ["site_name", "enable_comments", "items_per_page"]
  }
}
```

---

## Ottieni stato mappa

```
GET /api/admin/settings/map-status
```

Restituisce lo stato di configurazione e disponibilità del provider mappe corrente. Utile per verificare la corretta configurazione dell'integrazione mappe prima di abilitarla per gli utenti.

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "provider": "google",
    "configured": true,
    "hasApiKey": true,
    "testResult": {
      "success": true,
      "latency": 245
    }
  }
}
```

---

## Architettura della configurazione

Le impostazioni sono memorizzate nella tabella `settings` del database come coppie chiave-valore. Questo approccio consente:

- Aggiornamenti delle impostazioni senza distribuzione del codice
- La cronologia di audit può essere aggiunta a livello di database
- Configurazione specifica per ambiente sovrascrivendo le variabili di ambiente

**Ordine di priorità:** Le variabili d'ambiente sovrascrivono le impostazioni del database per le impostazioni sensibili come le chiavi API.

### Impostazioni comuni

| Chiave                    | Tipo    | Descrizione                                      |
| ------------------------- | ------- | ------------------------------------------------ |
| `site_name`               | stringa  | Nome del sito visualizzato nell'intestazione     |
| `site_description`        | stringa  | Meta descrizione per i motori di ricerca         |
| `site_url`                | stringa  | URL base del sito (usato per i link canonici)    |
| `contact_email`           | stringa  | Email di contatto principale                     |
| `items_per_page`          | intero  | Elementi per pagina nella paginazione            |
| `enable_comments`         | booleano | Abilita/disabilita il sistema di commenti        |
| `enable_votes`            | booleano | Abilita/disabilita la funzione di voto           |
| `enable_map`              | booleano | Abilita la visualizzazione su mappa              |
| `map_provider`            | stringa  | `google`, `mapbox` o `leaflet`                   |
| `map_api_key`             | stringa  | Chiave API del provider mappa (oscurata)         |
| `enable_sponsor_ads`      | booleano | Abilita la funzione annunci sponsor              |
| `maintenance_mode`        | booleano | Mette il sito in modalità manutenzione           |

## Codici di errore

| Stato | Significato                                       |
| ------ | ------------------------------------------------- |
| `400`  | Impostazione non valida o valore non consentito   |
| `401`  | Autenticazione richiesta                          |
| `403`  | Privilegi amministrativi richiesti                |
| `500`  | Errore interno del server                         |

## Documentazione correlata

- [Endpoint Admin](./admin-endpoints.md) -- panoramica di tutti i gruppi di risorse admin
- [Analisi Geografiche Admin](./admin-analytics-endpoints.md) -- analisi geografiche e configurazione mappa
