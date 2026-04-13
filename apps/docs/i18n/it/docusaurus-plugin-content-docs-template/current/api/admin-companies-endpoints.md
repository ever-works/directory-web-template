---
id: admin-companies-endpoints
title: "Endpoint API Admin Aziende"
sidebar_label: "Admin Aziende"
---

# Endpoint API Admin Aziende

L'API Admin Aziende fornisce endpoint di gestione per i record aziendali. Le aziende rappresentano organizzazioni associate agli elementi elencati. L'API supporta operazioni CRUD complete con validazione basata su Zod, controllo dell'unicità di dominio/slug e sincronizzazione CRM opzionale sugli aggiornamenti.

## Riepilogo delle route

| Metodo | Percorso | Auth | Descrizione |
|--------|------|------|-------------|
| `GET` | `/api/admin/companies` | Amministratore | Elenca aziende (paginata, ricercabile) |
| `POST` | `/api/admin/companies` | Amministratore | Crea una nuova azienda |
| `GET` | `/api/admin/companies/{id}` | Amministratore | Ottieni una singola azienda per UUID |
| `PUT` | `/api/admin/companies/{id}` | Amministratore | Aggiorna un'azienda |
| `DELETE` | `/api/admin/companies/{id}` | Amministratore | Elimina definitivamente un'azienda |

## Autenticazione

Tutti gli endpoint aziendali verificano che la sessione abbia privilegi amministrativi:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Endpoint

### GET `/api/admin/companies`

Restituisce un elenco paginato di aziende con filtri di ricerca e stato. Restituisce anche i conteggi globali di aziende attive e inattive indipendentemente dai filtri applicati.

**Parametri di query:**

| Parametro | Tipo | Predefinito | Descrizione |
|-----------|------|---------|-------------|
| `page` | intero | `1` | Numero di pagina (deve essere >= 1) |
| `limit` | intero | `10` | Elementi per pagina (1--100) |
| `q` | stringa | -- | Cerca per nome o dominio (senza distinzione maiuscole/minuscole) |
| `status` | stringa | -- | Filtro: `"active"` o `"inactive"` |

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Acme Corporation",
        "website": "https://acme.com",
        "domain": "acme.com",
        "slug": "acme-corporation",
        "status": "active",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 47,
    "limit": 10,
    "activeCount": 40,
    "inactiveCount": 7
  }
}
```

I valori `meta.activeCount` e `meta.inactiveCount` riflettono i totali globali e non sono influenzati dai filtri `q` o `status`. Ciò consente all'interfaccia utente di mostrare i conteggi delle schede insieme ai risultati filtrati.

### POST `/api/admin/companies`

Crea un nuovo record aziendale. I dati della richiesta vengono validati con lo schema Zod (`createCompanySchema`). I valori di dominio e slug vengono normalizzati in minuscolo. L'unicità viene verificata sia per `domain` che per `slug` prima dell'inserimento.

**Corpo della richiesta:**

```json
{
  "name": "Acme Corporation",
  "website": "https://acme.com",
  "domain": "acme.com",
  "slug": "acme-corporation",
  "status": "active"
}
```

| Campo | Tipo | Richiesto | Descrizione |
|-------|------|----------|-------------|
| `name` | stringa | Sì | Nome azienda (1--255 caratteri) |
| `website` | stringa (URI) | No | URL completo del sito web |
| `domain` | stringa | No | Dominio normalizzato (max 255 caratteri) |
| `slug` | stringa | No | Identificatore URL-friendly (`^[a-z0-9-]+$`, max 255) |
| `status` | stringa | No | `"active"` o `"inactive"` (predefinito: `"active"`) |

**Validazione:** Utilizza la validazione dello schema Zod. In caso di errore, restituisce errori dettagliati a livello di campo:

```json
{
  "error": "Validation error",
  "details": [
    { "field": "name", "message": "Company name is required" }
  ]
}
```

**Risposta (201):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "website": "https://acme.com",
    "domain": "acme.com",
    "slug": "acme-corporation",
    "status": "active",
    "createdAt": "2024-01-20T16:45:00.000Z",
    "updatedAt": "2024-01-20T16:45:00.000Z"
  }
}
```

### GET `/api/admin/companies/{id}`

Recupera una singola azienda tramite il suo UUID.

**Parametri di percorso:**

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `id` | stringa (UUID) | Identificatore univoco dell'azienda |

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "website": "https://acme.com",
    "domain": "acme.com",
    "slug": "acme-corporation",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z"
  }
}
```

### PUT `/api/admin/companies/{id}`

Aggiorna un'azienda esistente. Supporta aggiornamenti parziali -- vengono modificati solo i campi forniti. Validato con `updateCompanySchema`. L'unicità di dominio e slug viene ri-verificata quando questi campi cambiano. Dopo un aggiornamento riuscito, i dati aziendali vengono opzionalmente sincronizzati con un sistema CRM.

**Parametri di percorso:**

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `id` | stringa (UUID) | Identificatore univoco dell'azienda |

**Corpo della richiesta:**

```json
{
  "name": "Acme Corporation Updated",
  "website": "https://acme.com",
  "status": "active"
}
```

Tutti i campi sono opzionali. Verranno aggiornati solo i campi forniti.

**Sincronizzazione CRM:**

Quando `TWENTY_CRM_ENABLED` non è impostato su `"false"`, l'azienda aggiornata viene automaticamente sincronizzata con il sistema Twenty CRM. Questa sincronizzazione è non bloccante -- se fallisce, l'API restituisce comunque il successo per l'aggiornamento del database:

```typescript
const syncService = createTwentyCrmSyncServiceFromEnv();
const companyPayload = mapCompanyToTwentyCompany(company);
await syncService.upsertCompany(companyPayload);
```

**Risposta (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation Updated",
    "status": "active",
    "updatedAt": "2024-01-20T16:30:00.000Z"
  }
}
```

### DELETE `/api/admin/companies/{id}`

Elimina definitivamente un'azienda. Questa è un'eliminazione hard -- il record viene rimosso dal database. I link elemento-azienda associati vengono rimossi tramite i vincoli CASCADE.

**Parametri di percorso:**

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `id` | stringa (UUID) | Identificatore univoco dell'azienda |

**Risposta (200):**

```json
{
  "success": true,
  "message": "Company deleted successfully"
}
```

:::caution
L'eliminazione dell'azienda è permanente e non può essere annullata. Tutte le associazioni elemento per l'azienda eliminata verranno rimosse tramite le regole CASCADE del database.
:::

## Regole di validazione

I dati aziendali vengono validati usando gli schemi Zod definiti in `lib/validations/company.ts`:

| Campo | Regola |
|-------|------|
| `name` | Obbligatorio, 1--255 caratteri |
| `website` | Opzionale, deve essere in formato URI valido |
| `domain` | Opzionale, max 255 caratteri, normalizzato in minuscolo |
| `slug` | Opzionale, max 255 caratteri, solo alfanumerici minuscoli e trattini |
| `status` | Opzionale, deve essere `"active"` o `"inactive"` |

## Codici di errore

| Stato | Errore | Causa |
|--------|-------|-------|
| `400` | Errore di validazione | Errore di validazione schema Zod (include dettagli del campo) |
| `400` | Parametro pagina non valido | La pagina non è un intero positivo |
| `400` | Parametro limite non valido | Limite fuori dall'intervallo 1--100 |
| `401` | Non autorizzato | Sessione mancante o non amministratore |
| `404` | Azienda non trovata | Nessuna azienda con il dato UUID |
| `409` | Esiste già un'azienda con questo dominio | Violazione dell'unicità del dominio |
| `409` | Esiste già un'azienda con questo slug | Violazione dell'unicità dello slug |
| `500` | Impossibile creare/aggiornare/eliminare l'azienda | Errore del server o del database |

## Documentazione correlata

- [Panoramica degli endpoint Admin](./admin-endpoints.md)
- [Pattern di risposta](./response-patterns.md)
- [Validazione delle richieste](./request-validation.md)
