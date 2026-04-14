---
id: geocode-endpoints
title: "Riferimento API Geocodifica"
sidebar_label: "Geocodifica"
sidebar_position: 50
---

# Riferimento API Geocodifica

## Panoramica

Gli endpoint di geocodifica forniscono funzionalità di geocodifica diretta (indirizzo a coordinate) e inversa (coordinate a indirizzo). I risultati vengono memorizzati nella cache per 15 minuti per ridurre le chiamate alle API esterne. Questi endpoint richiedono l'autenticazione come amministratore per prevenire abusi dei costi dei servizi di geocodifica Mapbox/Google sottostanti.

## Endpoint

### POST /api/geocode

Converte un indirizzo in coordinate (geocodifica diretta) o coordinate in un indirizzo (geocodifica inversa). Il corpo della richiesta determina quale operazione viene eseguita in base ai campi `address` o `latitude`/`longitude` forniti.

#### Geocodifica Diretta (indirizzo a coordinate)

**Richiesta**
```typescript
{
  address: string;          // 1-500 caratteri, obbligatorio
  options?: {
    countryCodes?: string[];  // Codici ISO 3166-1 alpha-2, es. ["US", "CA"]
    language?: string;        // Codice lingua ISO 639-1, es. "en"
    proximity?: {
      latitude: number;       // -90 a 90
      longitude: number;      // -180 a 180
    };
  };
}
```

**Risposta**
```typescript
{
  success: true;
  data: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    postalCode: string;
    confidence: number;       // 0 a 1
  };
}
```

**Esempio**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: '1600 Amphitheatre Parkway, Mountain View, CA',
    options: {
      countryCodes: ['US'],
      language: 'en'
    }
  })
});
const data = await response.json();
```

#### Geocodifica Inversa (coordinate a indirizzo)

**Richiesta**
```typescript
{
  latitude: number;         // -90 a 90, obbligatorio
  longitude: number;        // -180 a 180, obbligatorio
  options?: {
    language?: string;        // Codice lingua ISO 639-1
  };
}
```

**Risposta**
```typescript
{
  success: true;
  data: {
    formattedAddress: string;
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    postalCode: string;
  };
}
```

**Esempio**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: 37.4224764,
    longitude: -122.0842499,
    options: { language: 'en' }
  })
});
const data = await response.json();
```

### GET /api/geocode

Restituisce lo stato del servizio di geocodifica, inclusi i provider configurati e le statistiche della cache.

**Richiesta**

Nessun corpo della richiesta richiesto. Autenticazione tramite cookie di sessione.

**Risposta**
```typescript
{
  success: true;
  data: {
    enabled: boolean;         // Se le funzionalità di posizione sono abilitate
    configured: boolean;      // Se è configurato almeno un provider di geocodifica
    providers: {
      mapbox: boolean;
      google: boolean;
    };
    cache: {
      size: number;           // Dimensione attuale della cache
      maxSize: number;        // Dimensione massima della cache (1000)
      ttlMs: number;          // TTL della cache in millisecondi (900000 = 15 min)
    };
  };
}
```

**Esempio**
```typescript
const response = await fetch('/api/geocode');
const status = await response.json();
// status.data.providers.mapbox === true
```

## Autenticazione

- **GET /api/geocode**: Richiede una sessione autenticata (qualsiasi utente).
- **POST /api/geocode**: Richiede una sessione autenticata con **ruolo amministratore**. Gli utenti non amministratori ricevono una risposta `403 Forbidden`. Questa restrizione previene abusi dei costi delle API.

## Codici di Errore

| Stato | Descrizione |
|--------|-------------|
| 400 | Dati della richiesta non validi -- indirizzo malformato, coordinate non valide o errore di validazione schema |
| 401 | Non autorizzato -- nessuna sessione autenticata |
| 403 | Accesso negato -- accesso amministratore richiesto (solo POST) |
| 404 | Nessun risultato di geocodifica trovato per l'indirizzo o le coordinate fornite |
| 503 | Le funzionalità di posizione sono disabilitate nelle impostazioni, o il servizio di geocodifica non è configurato |

## Limite di Frequenza

I risultati vengono memorizzati nella cache per 15 minuti (TTL 900.000 ms) con una dimensione massima di 1.000 voci. Tutte le richieste di geocodifica vengono registrate nel log di audit per il monitoraggio dei costi.

## Endpoint Correlati

- [Endpoint di Posizione](./location-endpoints) -- Ricerca per posizione, città, paesi e coordinate
