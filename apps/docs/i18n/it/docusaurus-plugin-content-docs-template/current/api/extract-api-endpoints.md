---
id: extract-api-endpoints
title: Endpoint API Estrazione
sidebar_label: API Estrazione
sidebar_position: 61
---

# Endpoint API Estrazione

L'API Estrazione fornisce un endpoint proxy sicuro per estrarre i metadati degli elementi (nome, descrizione, categorie, ecc.) da un URL specificato. Inoltra le richieste all'API della Piattaforma Ever Works per l'estrazione di contenuti basata su intelligenza artificiale.

**Sorgente:** `template/app/api/extract/route.ts`

---

## Estrai metadati da URL

Estrae i metadati degli elementi da un URL specificato effettuando il proxy della richiesta all'API della Piattaforma.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `POST` |
| **Percorso** | `/api/extract` |
| **Autenticazione** | Nessuna (pubblica, ma richiede la configurazione di `PLATFORM_API_URL`) |

### Corpo della richiesta

```json
{
  "url": "https://example.com/product",
  "existingCategories": ["Productivity", "Developer Tools"]
}
```

| Campo | Tipo | Richiesto | Descrizione |
|-------|------|----------|-------------|
| `url` | `string` (URI) | Sì | L'URL da cui estrarre i metadati |
| `existingCategories` | `string[]` | No | Nomi di categorie esistenti per aiutare con la categorizzazione AI |

### Risposte

**Stato 200** -- Estrazione riuscita.

```json
{
  "success": true,
  "data": {
    "name": "Awesome Product",
    "description": "A great product description extracted from the page.",
    "category": "Productivity",
    "tags": ["automation", "workflow"]
  }
}
```

La forma di `data` dipende dalla risposta dell'API della Piattaforma -- include tipicamente `name`, `description` e i campi di categorizzazione suggeriti.

**Stato 200** -- Funzionalità disabilitata (API della Piattaforma non configurata).

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

:::note
Quando `PLATFORM_API_URL` non è impostato, l'endpoint restituisce uno stato `200` con `featureDisabled: true` anziché un errore. Questo consente al frontend di nascondere gracefully la funzionalità di estrazione.
:::

**Stato 400** -- Richiesta non valida.

```json
{
  "success": false,
  "error": "Invalid URL format"
}
```

**Stato 500** -- Errore del server durante l'estrazione.

```json
{
  "success": false,
  "error": "Internal server error during extraction"
}
```

### Validazione

Il corpo della richiesta è validato con Zod:

- `url` deve essere una stringa URL valida.
- `existingCategories` è un array opzionale di stringhe.

### Esempi curl

```bash
# Estrai metadati da un URL
curl -s -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com/some-project",
    "existingCategories": ["Developer Tools", "Open Source"]
  }'

# Richiesta minimale (solo URL)
curl -s -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://example.com/product" }'
```

### Utilizzo TypeScript

```typescript
interface ExtractRequest {
  url: string;
  existingCategories?: string[];
}

interface ExtractSuccessResponse {
  success: true;
  data: {
    name: string;
    description: string;
    category?: string;
    tags?: string[];
    [key: string]: unknown;
  };
}

interface ExtractDisabledResponse {
  success: false;
  featureDisabled: true;
  message: string;
}

interface ExtractErrorResponse {
  success: false;
  error: string;
}

type ExtractResponse = ExtractSuccessResponse | ExtractDisabledResponse | ExtractErrorResponse;

async function extractMetadata(
  url: string,
  existingCategories?: string[]
): Promise<ExtractResponse> {
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, existingCategories }),
  });
  return res.json();
}

// Utilizzo
const result = await extractMetadata('https://example.com/tool', ['Productivity']);

if ('featureDisabled' in result && result.featureDisabled) {
  console.log('La funzionalità di estrazione non è disponibile');
} else if (result.success) {
  console.log('Estratto:', result.data.name, result.data.description);
} else {
  console.error('Estrazione fallita:', result.error);
}
```

### Variabili d'ambiente

| Variabile | Richiesta | Descrizione |
|----------|----------|-------------|
| `PLATFORM_API_URL` | No | URL base dell'API della Piattaforma Ever Works. Se non impostato, la funzionalità è disabilitata gracefully. |
| `PLATFORM_API_SECRET_TOKEN` | No | Token Bearer opzionale per l'autenticazione con l'API della Piattaforma. |

### Note di implementazione

- Questo endpoint agisce come un **proxy sicuro** -- l'URL dell'API della Piattaforma e il token non vengono mai esposti al client.
- L'endpoint rimuove le barre finali da `PLATFORM_API_URL` prima di costruire l'URL di estrazione.
- L'endpoint dell'API della Piattaforma chiamato è `<PLATFORM_API_URL>/extract-item-details`.
- Il campo `existingCategories` viene inoltrato come `existing_data` nel corpo della richiesta all'API della Piattaforma.
- Le risposte di errore non JSON dall'API della Piattaforma (es. pagine di errore HTML) vengono gestite gracefully con un fallback a `statusText`.
