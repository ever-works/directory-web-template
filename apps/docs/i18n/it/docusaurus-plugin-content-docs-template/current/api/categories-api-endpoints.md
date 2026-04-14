---
id: categories-api-endpoints
title: "Endpoint API Categorie"
sidebar_label: "API Categorie"
---

# Endpoint API Categorie

L'API Categorie fornisce l'accesso pubblico ai dati delle categorie, incluso un endpoint per verificare l'esistenza di una categoria tramite slug.

## Percorso base

```
/api/categories
```

## Riepilogo delle route

| Metodo | Percorso                    | Auth    | Descrizione                          |
| ------ | ------------------------- | ------- | ------------------------------------ |
| `GET`  | `/api/categories/exists`  | Nessuna | Verifica se una categoria esiste     |

---

## Verifica esistenza categoria

```
GET /api/categories/exists
```

Verifica se una categoria con lo slug specificato esiste nel sistema. Questo endpoint è pubblico e non richiede autenticazione.

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
    "slug": "productivity",
    "description": "Tools to boost your productivity"
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
curl "https://yourdomain.com/api/categories/exists?slug=productivity"
```

---

## Utilizzo TypeScript

```typescript
async function categoryExists(slug: string): Promise<boolean> {
  const response = await fetch(`/api/categories/exists?slug=${encodeURIComponent(slug)}`);
  const data = await response.json();
  return data.exists;
}
```

---

## Note di implementazione

Questo endpoint interroga direttamente il database (non usa la cache) per garantire risultati accurati in tempo reale. È utile per:

- Validare gli slug delle categorie nel lato client prima dell'invio dei moduli
- Verificare i riferimenti alle categorie nelle integrazioni esterne
- Controllare la coerenza dei dati nelle migrazioni

## Documentazione correlata

- [Endpoint Categorie Admin](./admin-categories-endpoints.md) -- gestione admin delle categorie
- [Endpoint Elementi Client](./client-api-endpoints.md) -- recupera elementi per categoria
