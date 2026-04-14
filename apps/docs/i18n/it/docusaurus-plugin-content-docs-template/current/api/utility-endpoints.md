---
id: utility-endpoints
title: "Endpoint API di Utilità"
sidebar_label: "Endpoint di Utilità"
---

# Endpoint API di Utilità

Gli endpoint di utilità forniscono servizi infrastrutturali tra cui controlli dello stato, informazioni sulla versione, configurazione delle funzionalità, geocodifica, verifica reCAPTCHA, estrazione URL, dati sulla posizione e operazioni interne.

## Controllo Stato (`/api/health`)

### Stato del Database

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/health/database` | Controlla la connettività al database |

Restituisce lo stato della connessione al database. Utilizzato da sistemi di monitoraggio e controlli di stato del deployment.

**Risposta (integro):**

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Risposta (non integro):**

```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Connection refused",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Autenticazione:** Pubblico (nessuna autenticazione richiesta). Questo endpoint deve essere accessibile dai load balancer e dai servizi di monitoraggio.

## Versione (`/api/version`)

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/version` | Ottieni le informazioni sulla versione dell'applicazione |
| `GET` | `/api/version/sync` | Ottieni la versione e lo stato di sincronizzazione |

### Risposta della Versione

Restituisce la versione dell'applicazione, le informazioni di build e l'ambiente di runtime:

```json
{
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Versione + Stato di Sincronizzazione

L'endpoint `/api/version/sync` estende le informazioni sulla versione con lo stato di sincronizzazione del repository dei contenuti, utile per il debug dell'aggiornamento dei contenuti.

**Autenticazione:** Pubblico.

## Configurazione Funzionalità (`/api/config`)

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/config/features` | Ottieni i flag di funzionalità abilitati |

Restituisce la configurazione corrente dei flag di funzionalità per l'applicazione lato client. Ciò consente al frontend di visualizzare condizionalmente le funzionalità in base alla configurazione lato server.

**Risposta:**

```json
{
  "features": {
    "payments": true,
    "sponsorAds": true,
    "surveys": false,
    "map": true,
    "newsletter": true
  }
}
```

**Autenticazione:** Pubblico. I flag di funzionalità non sono dati sensibili.

## Estrazione URL (`/api/extract`)

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `POST` | `/api/extract` | Estrai i metadati da un URL |

Recupera un URL ed estrae i metadati inclusi titolo, descrizione, immagine e favicon. Utilizzato dal modulo di invio degli elementi per compilare automaticamente i campi da un URL.

**Richiesta:**

```json
{
  "url": "https://example.com/product"
}
```

**Risposta:**

```json
{
  "success": true,
  "data": {
    "title": "Product Name",
    "description": "Product description from meta tags",
    "image": "https://example.com/og-image.png",
    "favicon": "https://example.com/favicon.ico",
    "siteName": "Example.com"
  }
}
```

**Autenticazione:** Richiesta. Previene l'abuso del recupero URL lato server.

## Geocodifica (`/api/geocode`)

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `POST` | `/api/geocode` | Geocodifica un indirizzo in coordinate |

Converte un indirizzo testuale in coordinate geografiche (latitudine/longitudine) utilizzando un servizio di geocodifica esterno.

**Richiesta:**

```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA"
}
```

**Risposta:**

```json
{
  "success": true,
  "data": {
    "lat": 37.4224764,
    "lng": -122.0842499,
    "formattedAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA"
  }
}
```

**Autenticazione:** Richiesta.

## Dati sulla Posizione (`/api/location`)

Endpoint per la ricerca di posizioni e dati di riferimento.

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/location/countries` | Elenca tutti i paesi |
| `GET` | `/api/location/cities` | Elenca le città (con filtro per paese) |
| `GET` | `/api/location/coordinates` | Ottieni le coordinate per una posizione |
| `GET` | `/api/location/search` | Cerca posizioni per stringa di query |

### Paesi

Restituisce un elenco di paesi con codici ISO, nomi e metadati opzionali.

### Città

Support il filtraggio per codice paese:

```
GET /api/location/cities?country=US
```

### Ricerca Posizione

Ricerca testuale completa delle posizioni:

```
GET /api/location/search?q=San Francisco
```

**Autenticazione:** Pubblico.

## Verifica reCAPTCHA (`/api/verify-recaptcha`)

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `POST` | `/api/verify-recaptcha` | Verifica un token reCAPTCHA |

Verifica lato server dei token Google reCAPTCHA. Utilizzato dai moduli che richiedono protezione contro i bot.

**Richiesta:**

```json
{
  "token": "recaptcha-response-token"
}
```

**Risposta:**

```json
{
  "success": true,
  "score": 0.9,
  "action": "submit"
}
```

**Autenticazione:** Pubblico (reCAPTCHA è tipicamente sui moduli pubblici).

## Dati di Riferimento (`/api/reference`)

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `GET` | `/api/reference` | Ottieni i dati di riferimento per i menu a discesa dei moduli |

Restituisce i dati di riferimento utilizzati per popolare menu a discesa e campi di selezione nell'applicazione, come modelli di prezzo, tipi di licenza e categorie di piattaforma.

**Autenticazione:** Pubblico.

## Operazioni Interne (`/api/internal`)

| Metodo | Percorso | Descrizione |
|--------|------|-------------|
| `POST` | `/api/internal/db-init` | Inizializza lo schema del database e i dati seed |

### Inizializzazione del Database

L'endpoint `/api/internal/db-init` avvia la migrazione del database e l'inserimento opzionale di dati seed. Viene tipicamente chiamato una volta durante il deployment iniziale o quando si reimposta un ambiente di sviluppo.

**Autenticazione:** Questo endpoint deve essere protetto tramite controlli di accesso specifici per l'ambiente o un segreto condiviso. Non è destinato all'uso regolare.

## Considerazioni sulla Sicurezza

### Endpoint Pubblici

I seguenti endpoint di utilità sono intenzionalmente pubblici:
- Controlli dello stato (necessari da monitoraggio/load balancer)
- Informazioni sulla versione (non sensibili)
- Flag di funzionalità (configurazione non sensibile)
- Dati sulla posizione (dati di riferimento)
- Verifica reCAPTCHA (protezione moduli pubblici)
- Dati di riferimento (valori dei menu a discesa)

### Endpoint Protetti

Questi endpoint richiedono autenticazione per prevenire abusi:
- Estrazione URL (previene l'abuso di server-side request forgery)
- Geocodifica (chiamate API esterne a limitazione di frequenza)
- Inizializzazione del database (operazione distruttiva)
