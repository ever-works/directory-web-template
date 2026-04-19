---
id: config-feature-endpoints
title: "Riferimento API Config & Feature Flags"
sidebar_label: "Config & Feature Flags"
sidebar_position: 53
---

# Riferimento API Config & Feature Flags

## Panoramica

L'endpoint Config Features espone i flag di disponibilità delle funzionalità correnti dell'applicazione. Questi flag indicano quali funzionalità dipendenti dal database sono attive, consentendo al frontend di degradare gracefully quando le funzionalità non sono disponibili. Si tratta di un endpoint pubblico e memorizzato nella cache, progettato per un consumo ad alta frequenza.

## Endpoint

### GET /api/config/features

Restituisce la disponibilità corrente delle funzionalità in base alla configurazione di sistema e alla disponibilità del database.

**Richiesta**

Nessun parametro o corpo richiesto.

**Risposta**
```typescript
{
  ratings: boolean;         // Se la funzionalità di valutazione è disponibile
  comments: boolean;        // Se la funzionalità di commenti è disponibile
  favorites: boolean;       // Se la funzionalità dei preferiti è disponibile
  featuredItems: boolean;   // Se la funzionalità degli elementi in evidenza è disponibile
  surveys: boolean;         // Se la funzionalità dei sondaggi è disponibile
}
```

**Esempio**
```typescript
const response = await fetch('/api/config/features');
const features = await response.json();

if (features.ratings) {
  // Renderizza il componente di valutazione
}

if (!features.surveys) {
  // Nascondi la sezione dei sondaggi
}
```

## Autenticazione

Questo endpoint è **pubblico** -- non è richiesta alcuna autenticazione. È progettato per essere consumato dal frontend al caricamento iniziale della pagina per determinare quali funzionalità dell'interfaccia utente devono essere renderizzate.

## Risposte di errore

| Stato | Descrizione |
|--------|-------------|
| 200 | Flag delle funzionalità recuperati con successo |
| 500 | Errore interno -- restituisce tutti i flag come `false` per sicurezza con intestazione `no-cache` |

In caso di errore, l'endpoint restituisce tutte le funzionalità come `false` per garantire che l'applicazione fallisca in modo sicuro anziché esporre funzionalità non funzionanti.

## Limitazione della frequenza

Le risposte sono memorizzate nella cache con le seguenti intestazioni:
- `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
- Memorizzato nella cache effettivamente per 5 minuti a livello CDN con una finestra stale-while-revalidate di 10 minuti.

Le risposte di errore utilizzano `Cache-Control: no-cache` per evitare la memorizzazione nella cache dello stato degradato.

## Endpoint correlati

- [Endpoint di salute](./health-endpoints) -- Controllo della connettività del database
