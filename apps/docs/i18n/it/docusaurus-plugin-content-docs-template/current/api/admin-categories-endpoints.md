---
id: admin-categories-endpoints
title: "Endpoint API Admin Categorie"
sidebar_label: "Admin Categorie"
---

# Endpoint API Admin Categorie

L'API Admin Categorie fornisce operazioni CRUD complete per la gestione delle categorie di contenuto, inclusi il riordinamento e la sincronizzazione basata su Git con un repository di dati remoto. Tutti gli endpoint richiedono l'autenticazione come amministratore tramite auth basata su sessione.

## Riepilogo delle route

| Metodo | Percorso | Auth | Descrizione |
|--------|------|------|-------------|
| `GET` | `/api/admin/categories` | Amministratore | Elenca categorie (con paginazione) |
| `POST` | `/api/admin/categories` | Amministratore | Crea una nuova categoria |
| `GET` | `/api/admin/categories/all` | Amministratore | Ottieni tutte le categorie (dalla cache dei contenuti) |
| `GET` | `/api/admin/categories/{id}` | Amministratore | Ottieni una singola categoria per ID |
| `PUT` | `/api/admin/categories/{id}` | Amministratore | Aggiorna una categoria |
| `DELETE` | `/api/admin/categories/{id}` | Amministratore | Eliminazione soft o permanente di una categoria |
| `PUT` | `/api/admin/categories/reorder` | Amministratore | Riordina le categorie tramite array di ID |
| `GET` | `/api/admin/categories/git` | Amministratore | Ottieni lo stato del repo Git e le categorie |
| `POST` | `/api/admin/categories/git` | Amministratore | Crea una categoria tramite commit Git |

## Autenticazione

Tutti gli endpoint di gestione delle categorie verificano la presenza di una sessione attiva con privilegi amministrativi:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Unauthorized. Admin access required." },
    { status: 401 }
  );
}
```

## Endpoint

### GET `/api/admin/categories`

Restituisce un elenco paginato di categorie con filtri e ordinamento opzionali.

**Parametri di query:**

| Parametro | Tipo | Predefinito | Descrizione |
|-----------|------|---------|-------------|
| `page` | intero | `1` | Numero di pagina (minimo: 1) |
| `limit` | intero | `10` | Elementi per pagina (1--100) |
| `includeInactive` | stringa | `"false"` | Includi categorie inattive |
| `sortBy` | stringa | `"name"` | Campo di ordinamento: `"name"` o `"id"` |
| `sortOrder` | stringa | `"asc"` | Direzione di ordinamento: `"asc"` o `"desc"` |

**Risposta (200):**

```json
{
  "success": true,
  "categories": [
    {
      "id": "productivity",
      "name": "Productivity",
      "isActive": true,
      "itemCount": 15,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

### POST `/api/admin/categories`

Crea una nuova categoria. Il campo `id` è opzionale e verrà generato automaticamente dal nome se non fornito. Invalida le cache dei contenuti in caso di successo.

**Corpo della richiesta:**

```json
{
  "id": "productivity",
  "name": "Productivity"
}
```

| Campo | Tipo | Richiesto | Descrizione |
|-------|------|----------|-------------|
| `id` | stringa | No | Slug URL-friendly (`^[a-z0-9-]+$`). Generato automaticamente se omesso. |
| `name` | stringa | Sì | Nome visualizzato (2--100 caratteri) |

**Risposta (201):**

```json
{
  "success": true,
  "category": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 0,
    "createdAt": "2024-01-20T15:30:00.000Z",
    "updatedAt": "2024-01-20T15:30:00.000Z"
  },
  "message": "Category created successfully"
}
```

### GET `/api/admin/categories/all`

Restituisce tutte le categorie dalla cache dei contenuti per una determinata lingua. Utile per i menu a tendina e i selettori nell'area amministrativa.

**Parametri di query:**

| Parametro | Tipo | Predefinito | Descrizione |
|-----------|------|---------|-------------|
| `locale` | stringa | `"en"` | Codice lingua per il recupero dei contenuti |

**Risposta (200):**

```json
{
  "success": true,
  "data": [
    { "id": "productivity", "name": "Productivity", "isActive": true, "itemCount": 15 }
  ]
}
```

### GET `/api/admin/categories/{id}`

Recupera una singola categoria tramite il suo identificatore univoco.

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 15,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### PUT `/api/admin/categories/{id}`

Aggiorna il nome di una categoria esistente. Invalida le cache dei contenuti in caso di successo.

**Corpo della richiesta:**

```json
{ "name": "Productivity Tools" }
```

**Risposta (200):**

```json
{
  "success": true,
  "data": { "id": "productivity", "name": "Productivity Tools", "isActive": true },
  "message": "Category updated successfully"
}
```

### DELETE `/api/admin/categories/{id}`

Elimina una categoria. Per impostazione predefinita esegue un'eliminazione soft (disattivazione). Utilizza il parametro di query `hard=true` per l'eliminazione permanente. Invalida le cache dei contenuti in caso di successo.

**Parametri di query:**

| Parametro | Tipo | Predefinito | Descrizione |
|-----------|------|---------|-------------|
| `hard` | stringa | `"false"` | Impostare su `"true"` per l'eliminazione permanente |

**Risposta (200):**

```json
{
  "success": true,
  "message": "Category deactivated successfully"
}
```

### PUT `/api/admin/categories/reorder`

Riordina le categorie in base a un array di ID di categoria. La posizione di ogni ID nell'array determina il nuovo ordine di visualizzazione.

**Corpo della richiesta:**

```json
{ "categoryIds": ["productivity", "design", "development", "marketing"] }
```

**Regole di validazione:**
- `categoryIds` deve essere un array non vuoto
- Tutti i valori devono essere stringhe

**Risposta (200):**

```json
{
  "success": true,
  "message": "Categories reordered successfully"
}
```

### GET `/api/admin/categories/git`

Recupera lo stato del repository Git e le categorie dal repository di dati GitHub configurato. Richiede le variabili d'ambiente `DATA_REPOSITORY` e `GITHUB_TOKEN`.

**Risposta (200):**

```json
{
  "success": true,
  "status": {
    "repository": "ever-co/awesome-time-tracking-data",
    "branch": "main",
    "lastCommit": "abc123def456",
    "lastCommitDate": "2024-01-20T10:30:00.000Z",
    "isUpToDate": true
  },
  "categories": [],
  "message": "Git repository status retrieved successfully"
}
```

### POST `/api/admin/categories/git`

Crea una nuova categoria e la trasferisce direttamente nel repository di dati GitHub. Richiede le variabili d'ambiente `DATA_REPOSITORY` e `GH_TOKEN`.

**Corpo della richiesta:**

```json
{ "id": "productivity", "name": "Productivity" }
```

Both `id` and `name` are required for Git-based creation.

**Risposta (200):**

```json
{
  "success": true,
  "category": { "id": "productivity", "name": "Productivity" },
  "message": "Category created and committed to Git repository"
}
```

## Codici di errore

| Stato | Errore | Causa |
|--------|-------|-------|
| `400` | Parametri di paginazione non validi | Pagina < 1 o limite fuori dall'intervallo 1--100 |
| `400` | Il nome della categoria è obbligatorio | `name` mancante nella richiesta di creazione |
| `400` | categoryIds deve essere un array | Payload di riordinamento non valido |
| `401` | Non autorizzato. Accesso amministratore richiesto. | Sessione mancante o non amministratore |
| `404` | Categoria non trovata | ID categoria non valido |
| `409` | Esiste già una categoria con questo nome | Nome duplicato su creazione/aggiornamento |
| `500` | DATA_REPOSITORY non configurato | Variabile d'ambiente mancante per gli endpoint Git |
| `500` | Token GitHub non configurato | `GITHUB_TOKEN` o `GH_TOKEN` mancante |

## Invalidazione della cache

Tutte le operazioni di scrittura (creazione, aggiornamento, eliminazione, riordinamento) chiamano `invalidateContentCaches()` per garantire che le modifiche siano immediatamente visibili nell'intera applicazione.

## Documentazione correlata

- [Panoramica degli endpoint Admin](./admin-endpoints.md)
- [Endpoint pubblici delle categorie](./category-endpoints.md)
- [Pattern di risposta](./response-patterns.md)
- [Validazione delle richieste](./request-validation.md)
