---
id: collections-api-endpoints
title: "Endpoint API Collezioni"
sidebar_label: "API Collezioni"
---

# Endpoint API Collezioni

L'API Collezioni fornisce l'accesso pubblico ai dati delle collezioni, incluso un endpoint per verificare l'esistenza di una collezione tramite slug.

## Percorso base

```
/api/collections
```

## Riepilogo delle route

| Metodo | Percorso                     | Auth    | Descrizione                          |
| ------ | -------------------------- | ------- | ------------------------------------ |
| `GET`  | `/api/collections/exists`  | Nessuna | Verifica se una collezione esiste    |

---

## Verifica esistenza collezione

```
GET /api/collections/exists
```

Verifica se una collezione con lo slug specificato esiste nel sistema. Questo endpoint è pubblico e non richiede autenticazione.

**Parametri di query:**

| Parametro | Tipo   | Richiesto | Descrizione                              |
| --------- | ------ | -------- | ---------------------------------------- |
| `slug`    | stringa | Sì      | Lo slug della collezione da verificare   |

**Risposta (200) -- Trovata:**

```json
{
  "exists": true,
  "collection": {
    "id": "col_abc123",
    "name": "Best AI Tools",
    "slug": "best-ai-tools",
    "description": "Curated collection of the best AI tools"
  }
}
```

**Risposta (200) -- Non trovata:**

```json
{
  "exists": false
}
```

---

## Gestione degli errori

| Stato | Significato                                            |
| ------ | ------------------------------------------------------ |
| `400`  | Parametro `slug` mancante o non valido                 |
| `500`  | Errore interno del server                              |

---

## Esempio con curl

```bash
curl "https://yourdomain.com/api/collections/exists?slug=best-ai-tools"
```

---

## Utilizzo TypeScript

```typescript
async function collectionExists(slug: string): Promise<boolean> {
  const response = await fetch(`/api/collections/exists?slug=${encodeURIComponent(slug)}`);
  const data = await response.json();
  return data.exists;
}
```

---

## Note di implementazione

Questo endpoint interroga direttamente il database (non usa la cache) per garantire risultati accurati in tempo reale. È utile per:

- Validare gli slug delle collezioni nel lato client prima dell'invio dei moduli
- Verificare i riferimenti alle collezioni nelle integrazioni esterne
- Controllare la coerenza dei dati nelle migrazioni

## Documentazione correlata

- [Endpoint API Categorie](./categories-api-endpoints.md) -- endpoint simile per le categorie
- [Endpoint Admin](./admin-endpoints.md) -- gestione admin delle collezioni
