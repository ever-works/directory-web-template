---
id: url-extraction
title: URL-Extraktionssystem
sidebar_label: URL-Extraktion
sidebar_position: 13
---

# URL-Extraktionssystem

Die Ever Works-Vorlage enthält ein KI-gestütztes URL-Extraktionssystem, das automatisch Metadaten aus URLs extrahiert, einschließlich Produktnamen, Beschreibungen, Kategorien, Tags, Markeninformationen und Bilder. Diese Funktion optimiert den Artikelübermittlungsprozess, indem Formularfelder automatisch über eine bereitgestellte URL ausgefüllt werden.

## Architekturübersicht

| Komponente | Pfad | Zweck |
|---|---|---|
| `useUrlExtraction` Haken | `hooks/use-url-extraction.ts` | Clientseitiger React-Hook zum Auslösen der Extraktion |
| `/api/extract` Endpunkt | `app/api/extract/` | Serverseitige API-Route, die die eigentliche Extraktion durchführt |

## Wie es funktioniert

1. Der Benutzer gibt im Übermittlungsformular eine URL an
2. Der `useUrlExtraction` -Hook sendet die URL an den `/api/extract` -Endpunkt
3. Der Server extrahiert Metadaten (Name, Beschreibung, Kategorie, Tags, Marke, Bilder)
4. Die extrahierten Daten werden zurückgegeben und können zum automatischen Ausfüllen von Formularfeldern verwendet werden

## Der `useUrlExtraction` -Haken

### Schnittstelle

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

### Nutzung

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

## Extrahierte Datenfelder

| Feld | Geben Sie | ein Beschreibung |
|---|---|---|
| `name` | `string` | Aus der Seite extrahierter Produkt- oder Servicename |
| `description` | `string` | Produktbeschreibung oder Metabeschreibung |
| `category` | `string?` | Vorgeschlagene Kategorie, abgeglichen mit vorhandenen Kategorien, sofern angegeben |
| `tags` | `string[]?` | Aus dem Seiteninhalt extrahierte relevante Tags |
| `brand` | `string?` | Marken- oder Firmenname |
| `brand_logo_url` | `string?` | URL zum Markenlogobild |
| `images` | `string[]?` | Array relevanter Bild-URLs, die auf der Seite gefunden wurden |

## Kategoriezuordnung

Die Funktion `extractFromUrl` akzeptiert einen optionalen Parameter `existingCategories` . Sofern bereitgestellt, versucht die Extraktions-API, den extrahierten Inhalt mit diesen Kategorien abzugleichen, um sicherzustellen, dass die vorgeschlagene Kategorie mit der Taxonomie der Website übereinstimmt:

```tsx
const existingCategories = ['Analytics', 'Marketing', 'Development'];
const result = await extractFromUrl('https://example.com/product', existingCategories);
// result.category will be one of the existing categories if a match is found
```

## Fehlerbehandlung

Der Hook implementiert mehrere Ebenen der Fehlerbehandlung:

| Szenario | Verhalten |
|---|---|
| Leere URL | Gibt einen Fehler aus: „Keine URL angegeben“ |
| HTTP-Anfragefehler | Protokolliert Fehler, zeigt Toastbenachrichtigung an |
| Funktion deaktiviert | Gibt `null` lautlos zurück (anmutige Verschlechterung) |
| API-Fehler | Protokolliert Fehler, zeigt Toast mit der Meldung | an
| Unerwarteter Fehler | Fängt alle Fehler ab, zeigt allgemeinen Toast an und gibt `null` | zurück

###Anmutige Erniedrigung

Das System unterstützt eine ordnungsgemäße Verschlechterung, wenn die Extraktionsfunktion nicht konfiguriert ist:

```tsx
// Server response when feature is disabled
if (response.data.featureDisabled) {
  // Returns null without showing an error
  return null;
}
```

Dadurch funktioniert das Übermittlungsformular auch dann normal, wenn der KI-Extraktionsdienst nicht konfiguriert ist, und der Schritt zum automatischen Ausfüllen wird einfach übersprungen.

## Abfrageintegration reagieren

Der Hook verwendet `useMutation` von TanStack Query zur Verwaltung der Extraktionsanforderung:

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

Vorteile der Verwendung von `useMutation` :
- Automatische Ladezustandsverwaltung über `isPending` - Integrierte Fehlerbehandlung mit `onError` -Rückruf
- Versprechenbasierte API über `mutateAsync` ## Integration mit Submit Form

Die URL-Extraktion ist normalerweise in den Artikelübermittlungsablauf integriert:

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

## API-Client

Der Hook verwendet das `serverClient` der Vorlage für die HTTP-Kommunikation:

```tsx
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

// POST request to the extraction endpoint
const response = await serverClient.post('/api/extract', { url, existingCategories });

// Response validation
if (!apiUtils.isSuccess(response)) {
  throw new Error(apiUtils.getErrorMessage(response));
}
```

## Schlüsseldateien

| Datei | Pfad |
|---|---|
| URL-Extraktions-Hook | `hooks/use-url-extraction.ts` |
| API-Route extrahieren | `app/api/extract/route.ts` |
| Server-API-Client | `lib/api/server-api-client.ts` |
