---
id: collection-endpoints
title: "Endpoint Collezione"
sidebar_label: "Collezione"
---

# Endpoint Collezione

L'endpoint collezione fornisce accesso pubblico per verificare l'esistenza di una collezione nel sistema tramite il suo slug.

## Percorso base

```
/api/collections
```

## Riepilogo delle route

| Metodo | Percorso                     | Auth    | Descrizione                         |
| ------ | -------------------------- | ------- | ----------------------------------- |
| `GET`  | `/api/collections/exists`  | Nessuna | Verifica se una collezione esiste   |

---

## Verifica esistenza collezione

```
GET /api/collections/exists?slug={slug}
```

Verifica se esiste una collezione con lo slug specificato.

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
{ "exists": false }
```

---

## Come funziona

Il sistema verifica l'esistenza della collezione cercando nella tabella delle collezioni uno slug corrispondente:

```typescript
// Implementazione di esempio
const collection = await db.query.collections.findFirst({
  where: eq(collections.slug, slug)
});

return NextResponse.json({
  exists: !!collection,
  ...(collection && { collection })
});
```

---

## Differenze rispetto all'endpoint Categorie

| Aspetto              | Categorie (`/api/categories/exists`) | Collezioni (`/api/collections/exists`) |
| -------------------- | ----------------------------------- | -------------------------------------- |
| Tipo di contenuto    | Tassonomia di navigazione            | Raccolte curate di elementi            |
| Struttura gerarchica | Supporta sotto-categorie            | Piatta (nessuna gerarchia)             |
| Creata da            | Amministratori                       | Amministratori                         |
| Usata per            | Filtri di navigazione e categoria   | Gruppi tematici di elementi            |

---

## Gestione degli errori

| Stato | Significato                                        |
| ------ | -------------------------------------------------- |
| `400`  | Parametro `slug` mancante                          |
| `500`  | Errore interno del server                          |

## Documentazione correlata

- [Endpoint Categoria](./category-endpoints.md) -- endpoint simile per le categorie
- [Endpoint API Collezioni](./collections-api-endpoints.md) -- dettagli aggiuntivi sull'API
- [Endpoint Collezioni Admin](./admin-endpoints.md) -- gestione admin delle collezioni
