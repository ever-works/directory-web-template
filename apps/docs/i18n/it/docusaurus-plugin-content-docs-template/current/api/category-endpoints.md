---
id: category-endpoints
title: "Endpoint Categoria"
sidebar_label: "Categoria"
---

# Endpoint Categoria

L'endpoint categoria fornisce accesso pubblico per verificare l'esistenza di una categoria nel sistema tramite il suo slug.

## Percorso base

```
/api/categories
```

## Riepilogo delle route

| Metodo | Percorso                    | Auth    | Descrizione                         |
| ------ | ------------------------- | ------- | ----------------------------------- |
| `GET`  | `/api/categories/exists`  | Nessuna | Verifica se una categoria esiste    |

---

## Verifica esistenza categoria

```
GET /api/categories/exists?slug={slug}
```

Verifica se esiste una categoria con lo slug specificato.

**Parametri di query:**

| Parametro | Tipo   | Richiesto | Descrizione                              |
| --------- | ------ | -------- | ---------------------------------------- |
| `slug`    | stringa | Sì      | Lo slug della categoria da verificare    |

**Risposta (200) -- Trovata:**

```json
{
  "exists": true,
  "category": {
    "id": "cat_abc123",
    "name": "Productivity",
    "slug": "productivity"
  }
}
```

**Risposta (200) -- Non trovata:**

```json
{ "exists": false }
```

---

## Come funziona

Il sistema verifica l'esistenza della categoria cercando nella tabella delle categorie uno slug corrispondente:

```typescript
// Implementazione di esempio
const category = await db.query.categories.findFirst({
  where: eq(categories.slug, slug)
});

return NextResponse.json({
  exists: !!category,
  ...(category && { category })
});
```

---

## Gestione degli errori

| Stato | Significato                                       |
| ------ | ------------------------------------------------- |
| `400`  | Parametro `slug` mancante                         |
| `500`  | Errore interno del server                         |

## Documentazione correlata

- [Endpoint Collezioni](./collection-endpoints.md) -- endpoint simile per le collezioni
- [Endpoint Categorie Admin](./admin-categories-endpoints.md) -- gestione admin delle categorie
