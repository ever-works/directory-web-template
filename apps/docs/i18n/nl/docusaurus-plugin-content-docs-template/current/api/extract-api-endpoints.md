---
id: extract-api-endpoints
title: "Extract API Endpoints"
sidebar_label: "Extract API Endpoints"
sidebar_position: 61
---

# Extract API Eindpunten

De Extract API biedt een beveiligde proxy-eindpunt voor het extraheren van itemmetadata (naam, beschrijving, categorieën, enz.) van een opgegeven URL. Het stuurt verzoeken door naar de Ever Works Platform API voor AI-gestuurde inhoudsextractie.

**Bron:** `template/app/api/extract/route.ts`

---

## Metadata Extraheren van URL

Extraheert itemmetadata van een opgegeven URL door het verzoek door te sturen naar de Platform API.

| Eigenschap | Waarde |
|------------|--------|
| **Methode** | `POST` |
| **Pad** | `/api/extract` |
| **Authenticatie** | Geen (publiek, maar vereist dat `PLATFORM_API_URL` is geconfigureerd) |

### Aanvraagbody

```json
{
  "url": "https://example.com/product",
  "existingCategories": ["Productivity", "Developer Tools"]
}
```

| Veld | Type | Vereist | Beschrijving |
|------|------|---------|--------------|
| `url` | `string` (URI) | Ja | De URL waarvan metadata geëxtraheerd moet worden |
| `existingCategories` | `string[]` | Nee | Bestaande categorienamen om de AI-categorisatie te helpen |

### Reacties

**Status 200** -- Extractie geslaagd.

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

De vorm van `data` is afhankelijk van de Platform API-reactie -- het bevat doorgaans `name`, `description` en voorgestelde categorisatievelden.

**Status 200** -- Functie uitgeschakeld (Platform API niet geconfigureerd).

```json
{
  "success": false,
  "featureDisabled": true,
  "message": "URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured."
}
```

:::note
Wanneer `PLATFORM_API_URL` niet is ingesteld, geeft het eindpunt een `200`-status terug met `featureDisabled: true` in plaats van een fout. Hiermee kan de frontend de extractiefunctie op een nette manier verbergen.
:::

**Status 400** -- Ongeldig verzoek.

```json
{
  "success": false,
  "error": "Invalid URL format"
}
```

**Status 500** -- Serverfout tijdens extractie.

```json
{
  "success": false,
  "error": "Internal server error during extraction"
}
```

### Validatie

De aanvraagbody wordt gevalideerd met Zod:

- `url` moet een geldige URL-string zijn.
- `existingCategories` is een optionele reeks strings.

### curl-voorbeelden

```bash
# Metadata extraheren van een URL
curl -s -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com/some-project",
    "existingCategories": ["Developer Tools", "Open Source"]
  }'

# Minimaal verzoek (alleen URL)
curl -s -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://example.com/product" }'
```

### TypeScript-gebruik

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

// Gebruik
const result = await extractMetadata('https://example.com/tool', ['Productivity']);

if ('featureDisabled' in result && result.featureDisabled) {
  console.log('Extractiefunctie is niet beschikbaar');
} else if (result.success) {
  console.log('Geëxtraheerd:', result.data.name, result.data.description);
} else {
  console.error('Extractie mislukt:', result.error);
}
```

### Omgevingsvariabelen

| Variabele | Vereist | Beschrijving |
|-----------|---------|--------------|
| `PLATFORM_API_URL` | Nee | Basis-URL van de Ever Works Platform API. Als niet ingesteld, wordt de functie netjes uitgeschakeld. |
| `PLATFORM_API_SECRET_TOKEN` | Nee | Optioneel Bearer-token voor authenticatie bij de Platform API. |

### Implementatienotities

- Dit eindpunt fungeert als een **beveiligde proxy** -- de Platform API URL en het token worden nooit blootgesteld aan de client.
- Het eindpunt verwijdert afsluitende slashes uit `PLATFORM_API_URL` voordat de extractie-URL wordt opgebouwd.
- Het Platform API-eindpunt dat wordt aangeroepen is `<PLATFORM_API_URL>/extract-item-details`.
- Het veld `existingCategories` wordt als `existing_data` doorgegeven in de aanvraagbody van de Platform API.
- Niet-JSON foutreacties van de Platform API (bijv. HTML-foutpagina's) worden netjes afgehandeld met een terugval naar `statusText`.
