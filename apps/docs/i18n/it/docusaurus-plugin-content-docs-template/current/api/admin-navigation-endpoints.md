---
id: admin-navigation-endpoints
title: "Endpoint API Admin Navigazione e Indice Posizioni"
sidebar_label: "Admin Navigazione"
---

# Endpoint API Admin Navigazione e Indice Posizioni

L'API di navigazione gestisce sia la struttura di navigazione del sito che l'indice delle posizioni di ricerca geografica. Tutti gli endpoint richiedono l'autenticazione come amministratore.

## Percorso base

```
/api/admin/navigation
/api/admin/location-index
```

## Riepilogo delle route

| Metodo  | Percorso                         | Auth  | Descrizione                               |
| ------- | ------------------------------ | ----- | ----------------------------------------- |
| `GET`   | `/api/admin/navigation`        | Amministratore | Ottieni la struttura di navigazione corrente   |
| `PATCH` | `/api/admin/navigation`        | Amministratore | Aggiorna la struttura di navigazione          |
| `GET`   | `/api/admin/location-index`    | Amministratore | Ottieni lo stato dell'indice delle posizioni         |
| `POST`  | `/api/admin/location-index`    | Amministratore | Ricostruisci o cancella l'indice delle posizioni |

---

## Endpoint di navigazione

### Ottieni navigazione

```
GET /api/admin/navigation
```

Restituisce la struttura di navigazione corrente con tutti gli elementi di menu, le voci del footer e la configurazione della barra laterale.

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "navigation": [
      {
        "type": "link",
        "label": "Home",
        "href": "/",
        "icon": "home"
      },
      {
        "type": "dropdown",
        "label": "Resources",
        "items": [
          { "type": "link", "label": "Blog", "href": "/blog" },
          { "type": "link", "label": "Docs", "href": "/docs" }
        ]
      }
    ],
    "footer": [
      { "type": "link", "label": "Privacy", "href": "/privacy" },
      { "type": "link", "label": "Terms", "href": "/terms" }
    ]
  }
}
```

### Aggiorna navigazione

```
PATCH /api/admin/navigation
```

Sostituisce l'intera struttura di navigazione. I dati vengono validati per prevenire attacchi XSS prima di essere memorizzati.

**Corpo della richiesta:**

```json
{
  "navigation": [
    {
      "type": "link",
      "label": "Home",
      "href": "/"
    }
  ],
  "footer": [
    {
      "type": "link",
      "label": "Privacy",
      "href": "/privacy"
    }
  ]
}
```

**Prevenzione XSS:**

Tutti i valori di stringa vengono sanificati tramite `sanitizeNavigationData()` prima della memorizzazione. I campi sono validati rispetto ai tipi consentiti:

| Campo   | Tipi / Pattern consentiti                    |
| ------- | ------------------------------------------ |
| `href`  | Percorsi relativi (`/...`) o URL assoluti   |
| `label` | Solo testo semplice (no tag HTML)              |
| `type`  | `link`, `dropdown`, `section`, `divider`   |
| `icon`  | Stringa del nome dell'icona (no HTML)              |

**Risposta (200):**

```json
{
  "success": true,
  "message": "Navigation updated successfully"
}
```

---

## Endpoint Indice Posizioni

### Ottieni stato indice posizioni

```
GET /api/admin/location-index
```

Restituisce le statistiche dell'indice delle posizioni corrente, incluso il conteggio delle voci, l'ultima ricostruzione e lo stato di salute.

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "totalIndexed": 842,
    "lastIndexedAt": "2024-01-20T10:30:00.000Z",
    "lastRebuildAt": "2024-01-19T08:00:00.000Z",
    "indexHealth": {
      "synced": true,
      "indexCount": 830,
      "expectedCount": 830
    }
  }
}
```

### Ricostruisci o cancella indice posizioni

```
POST /api/admin/location-index
```

Ricostruisce l'indice delle posizioni da zero oppure cancella tutte le voci.

**Corpo della richiesta:**

| Campo    | Tipo   | Richiesto | Descrizione                                     |
| -------- | ------ | -------- | ----------------------------------------------- |
| `action` | stringa | Sì      | `rebuild` per ricostruire; `clear` per cancellare |

**Risposta (200) -- Ricostruzione:**

```json
{
  "success": true,
  "message": "Location index rebuilt successfully",
  "data": {
    "indexed": 842,
    "duration": 1823
  }
}
```

**Risposta (200) -- Cancellazione:**

```json
{
  "success": true,
  "message": "Location index cleared"
}
```

### Validazione dei percorsi

I percorsi delle voci di navigazione sono validati contro i seguenti pattern:

| Pattern              | Valido | Esempio                              |
| -------------------- | ------ | ------------------------------------ |
| Percorso relativo    | Sì      | `/about`, `/blog/post-slug`          |
| URL assoluto https   | Sì      | `https://external.example.com`       |
| URI mailto           | Sì      | `mailto:contact@example.com`         |
| URI tel              | Sì      | `tel:+1234567890`                    |
| URL javascript:      | No     | `javascript:alert('xss')`           |
| Data URI             | No     | `data:text/html,...`                 |
| URL http (non sicuro)| No     | `http://insecure.example.com`        |

## Codici di errore

| Stato | Significato                                              |
| ------ | -------------------------------------------------------- |
| `400`  | Dati di navigazione non validi o azione non valida       |
| `401`  | Autenticazione richiesta                                 |
| `403`  | Privilegi amministrativi richiesti                       |
| `500`  | Errore interno del server                                |

## Documentazione correlata

- [Endpoint Admin](./admin-endpoints.md) -- panoramica di tutti i gruppi di risorse admin
- [Analisi Geografiche Admin](./admin-analytics-endpoints.md) -- analisi geografiche
