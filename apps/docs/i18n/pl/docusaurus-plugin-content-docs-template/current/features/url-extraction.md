---
id: url-extraction
title: System ekstrakcji adresów URL
sidebar_label: Wyodrębnianie adresów URL
sidebar_position: 13
---

# System ekstrakcji adresów URL

Szablon Ever Works zawiera system ekstrakcji adresów URL oparty na sztucznej inteligencji, który automatycznie wyodrębnia metadane z adresów URL, w tym nazwy produktów, opisy, kategorie, tagi, informacje o marce i obrazy. Ta funkcja usprawnia proces przesyłania przedmiotu, automatycznie wypełniając pola formularza z podanego adresu URL.

## Przegląd architektury

| Składnik | Ścieżka | Cel |
|---|---|---|
| `useUrlExtraction` hak | `hooks/use-url-extraction.ts` | Hak reakcji po stronie klienta do wyzwalania ekstrakcji |
| `/api/extract` punkt końcowy | `app/api/extract/` | Trasa API po stronie serwera, która wykonuje rzeczywistą ekstrakcję |

## Jak to działa

1. Użytkownik w formularzu zgłoszeniowym podaje adres URL
2. Hook `useUrlExtraction` wysyła adres URL do punktu końcowego `/api/extract` 3. Serwer wyodrębnia metadane (nazwę, opis, kategorię, tagi, markę, obrazy)
4. Wyodrębnione dane są zwracane i można je wykorzystać do automatycznego wypełnienia pól formularza

## Hak `useUrlExtraction` ### Interfejs

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

### Użycie

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

## Wyodrębnione pola danych

| Pole | Wpisz | Opis |
|---|---|---|
| `name` | `string` | Nazwa produktu lub usługi pobrana ze strony |
| `description` | `string` | Opis produktu lub metaopis |
| `category` | `string?` | Sugerowana kategoria, dopasowana do istniejących kategorii, jeśli je podano |
| `tags` | `string[]?` | Odpowiednie tagi wyodrębnione z treści strony |
| `brand` | `string?` | Nazwa marki lub firmy |
| `brand_logo_url` | `string?` | Adres URL obrazu logo marki |
| `images` | `string[]?` | Tablica odpowiednich adresów URL obrazów znalezionych na stronie |

## Dopasowanie kategorii

Funkcja `extractFromUrl` akceptuje opcjonalny parametr `existingCategories` . Jeśli jest dostępny, interfejs API wyodrębniania próbuje dopasować wyodrębnioną treść do tych kategorii, upewniając się, że sugerowana kategoria jest zgodna z taksonomią witryny:

```tsx
const existingCategories = ['Analytics', 'Marketing', 'Development'];
const result = await extractFromUrl('https://example.com/product', existingCategories);
// result.category will be one of the existing categories if a match is found
```

## Obsługa błędów

Hak implementuje wiele warstw obsługi błędów:

| Scenariusz | Zachowanie |
|---|---|
| Pusty adres URL | Zgłasza błąd „Brak podanego adresu URL” |
| Błąd żądania HTTP | Rejestruje błąd, wyświetla powiadomienie toastowe |
| Funkcja wyłączona | Zwraca `null` po cichu (wdzięczna degradacja) |
| Awaria API | Rejestruje błąd, wyświetla toast z komunikatem |
| Nieoczekiwany błąd | Wychwytuje wszystkie błędy, wyświetla ogólny tost, zwraca `null` |

### Pełna wdzięku degradacja

System obsługuje płynną degradację, gdy funkcja wyodrębniania nie jest skonfigurowana:

```tsx
// Server response when feature is disabled
if (response.data.featureDisabled) {
  // Returns null without showing an error
  return null;
}
```

Dzięki temu formularz przesyłania może działać normalnie, nawet jeśli usługa ekstrakcji AI nie jest skonfigurowana, wystarczy pominąć krok automatycznego wypełniania.

## Integracja zapytań Reaguj

Hak wykorzystuje wartość `useMutation` TanStack Query do zarządzania żądaniem ekstrakcji:

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

Korzyści ze stosowania `useMutation` :
- Automatyczne zarządzanie stanem ładowania poprzez `isPending` - Wbudowana obsługa błędów z wywołaniem zwrotnym `onError` - API oparte na obietnicach poprzez `mutateAsync` ## Integracja z formularzem przesyłania

Wyodrębnianie adresów URL jest zazwyczaj zintegrowane z procesem przesyłania przedmiotu:

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

## Klient API

Hook wykorzystuje `serverClient` szablonu do komunikacji HTTP:

```tsx
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

// POST request to the extraction endpoint
const response = await serverClient.post('/api/extract', { url, existingCategories });

// Response validation
if (!apiUtils.isSuccess(response)) {
  throw new Error(apiUtils.getErrorMessage(response));
}
```

## Kluczowe pliki

| Plik | Ścieżka |
|---|---|
| Hak do wyodrębniania adresów URL | `hooks/use-url-extraction.ts` |
| Wyodrębnij trasę API | `app/api/extract/route.ts` |
| Klient API serwera | `lib/api/server-api-client.ts` |
