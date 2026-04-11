---
id: url-extraction
title: URL-extractiesysteem
sidebar_label: URL-extractie
sidebar_position: 13
---

# URL-extractiesysteem

De Ever Works-sjabloon bevat een door AI aangedreven URL-extractiesysteem dat automatisch metadata uit URL's extraheert, waaronder productnamen, beschrijvingen, categorieën, tags, merkinformatie en afbeeldingen. Deze functie stroomlijnt het indieningsproces van artikelen door formuliervelden automatisch in te vullen vanaf een opgegeven URL.

## Architectuuroverzicht

| Onderdeel | Pad | Doel |
|---|---|---|
| `useUrlExtraction` haak | `hooks/use-url-extraction.ts` | Client-side React-haak voor het activeren van extractie |
| `/api/extract` eindpunt | `app/api/extract/` | API-route aan de serverzijde die de daadwerkelijke extractie uitvoert |

## Hoe het werkt

1. De gebruiker geeft een URL op in het inzendingsformulier
2. De `useUrlExtraction` hook stuurt de URL naar het `/api/extract` eindpunt
3. De server extraheert metadata (naam, beschrijving, categorie, tags, merk, afbeeldingen)
4. De geëxtraheerde gegevens worden geretourneerd en kunnen worden gebruikt om formuliervelden automatisch in te vullen

## De `useUrlExtraction` haak

### Interface

```tsx
interface ExtractionResult {
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  brand?: string;
  brand_logo_url?: string;
  images?: string[];
}

interface UseUrlExtractionReturn {
  isLoading: boolean;
  extractFromUrl: (url: string, existingCategories?: string[]) => Promise<ExtractionResult | null>;
}
```

### Gebruik

```tsx
import { useUrlExtraction } from '@/hooks/use-url-extraction';

function SubmitForm() {
  const { isLoading, extractFromUrl } = useUrlExtraction();

  const handleUrlSubmit = async (url: string) => {
    const existingCategories = ['Project Management', 'Time Tracking', 'CRM'];
    const result = await extractFromUrl(url, existingCategories);

    if (result) {
      // Auto-fill form fields with extracted data
      setFormData({
        name: result.name,
        description: result.description,
        category: result.category || '',
        tags: result.tags || [],
      });
    }
  };

  return (
    <div>
      <input
        type="url"
        placeholder="Enter product URL..."
        onBlur={(e) => handleUrlSubmit(e.target.value)}
      />
      {isLoading && <span>Extracting data...</span>}
    </div>
  );
}
```

## Geëxtraheerde gegevensvelden

| Veld | Typ | Beschrijving |
|---|---|---|
| `name` | `string` | Product- of dienstnaam geëxtraheerd uit de pagina |
| `description` | `string` | Productbeschrijving of metabeschrijving |
| `category` | `string?` | Voorgestelde categorie, indien opgegeven vergeleken met bestaande categorieën |
| `tags` | `string[]?` | Relevante tags geëxtraheerd uit de pagina-inhoud |
| `brand` | `string?` | Merk- of bedrijfsnaam |
| `brand_logo_url` | `string?` | URL naar de merklogoafbeelding |
| `images` | `string[]?` | Reeks relevante afbeeldings-URL's gevonden op de pagina |

## Categorie-matching

De functie `extractFromUrl` accepteert een optionele parameter `existingCategories` . Indien beschikbaar, probeert de extractie-API de geëxtraheerde inhoud te matchen met deze categorieën, zodat de voorgestelde categorie aansluit bij de taxonomie van de site:

```tsx
const existingCategories = ['Analytics', 'Marketing', 'Development'];
const result = await extractFromUrl('https://example.com/product', existingCategories);
// result.category will be one of the existing categories if a match is found
```

## Foutafhandeling

De hook implementeert meerdere lagen voor foutafhandeling:

| Scenario | Gedrag |
|---|---|
| Lege URL | Genereert een foutmelding met "Geen URL opgegeven" |
| Mislukt HTTP-verzoek | Registreert fout, toont toastmelding |
| Functie uitgeschakeld | Retourneert stil `null` (sierlijke degradatie) |
| API-fout | Registreert een fout, toont toast met bericht |
| Onverwachte fout | Vangt alle fouten op, toont generieke toast, retourneert `null` |

### Sierlijke degradatie

Het systeem ondersteunt sierlijke degradatie wanneer de extractiefunctie niet is geconfigureerd:

```tsx
// Server response when feature is disabled
if (response.data.featureDisabled) {
  // Returns null without showing an error
  return null;
}
```

Hierdoor kan het indieningsformulier normaal werken, zelfs als de AI-extractieservice niet is geconfigureerd, waarbij eenvoudigweg de stap voor automatisch invullen wordt overgeslagen.

## React Query-integratie

De hook gebruikt TanStack Query's `useMutation` voor het beheren van het extractieverzoek:

```tsx
const mutation = useMutation({
  mutationFn: async ({ url, existingCategories }) => {
    const response = await serverClient.post('/api/extract', {
      url,
      existingCategories
    });
    // ... validation and error handling
    return response.data.data;
  },
  onError: (error) => {
    toast.error(error.message || 'Failed to extract data from URL');
  }
});
```

Voordelen van het gebruik van `useMutation` :
- Automatisch laadstatusbeheer via `isPending` - Ingebouwde foutafhandeling met `onError` terugbellen
- Op belofte gebaseerde API via `mutateAsync` ## Integratie met formulier indienen

De URL-extractie is doorgaans geïntegreerd in de procedure voor het indienen van artikelen:

```tsx
function ItemSubmitForm() {
  const { isLoading, extractFromUrl } = useUrlExtraction();
  const [formData, setFormData] = useState({
    name: '', description: '', category: '', tags: []
  });

  const handleUrlChange = async (url: string) => {
    if (!url) return;

    const result = await extractFromUrl(url, availableCategories);
    if (result) {
      setFormData(prev => ({
        ...prev,
        name: result.name || prev.name,
        description: result.description || prev.description,
        category: result.category || prev.category,
        tags: result.tags?.length ? result.tags : prev.tags,
      }));
    }
  };

  return (
    <form>
      <input
        name="url"
        placeholder="Product URL"
        onBlur={(e) => handleUrlChange(e.target.value)}
        disabled={isLoading}
      />
      {/* Form fields auto-populated from extraction */}
    </form>
  );
}
```

## API-client

De hook gebruikt de `serverClient` van de sjabloon voor HTTP-communicatie:

```tsx
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

// POST request to the extraction endpoint
const response = await serverClient.post('/api/extract', { url, existingCategories });

// Response validation
if (!apiUtils.isSuccess(response)) {
  throw new Error(apiUtils.getErrorMessage(response));
}
```

## Sleutelbestanden

| Bestand | Pad |
|---|---|
| URL-extractiehaak | `hooks/use-url-extraction.ts` |
| API-route extraheren | `app/api/extract/route.ts` |
| Server API-client | `lib/api/server-api-client.ts` |
