---
id: url-extraction
title: Sistema di estrazione URL
sidebar_label: Estrazione URL
sidebar_position: 13
---

# Sistema di estrazione URL

Il modello Ever Works include un sistema di estrazione URL basato sull'intelligenza artificiale che estrae automaticamente i metadati dagli URL, inclusi nomi di prodotti, descrizioni, categorie, tag, informazioni sul marchio e immagini. Questa funzionalità semplifica il processo di invio degli elementi compilando automaticamente i campi del modulo da un URL fornito.

## Panoramica dell'architettura

| Componente | Percorso | Scopo |
|---|---|---|
| `useUrlExtraction` gancio | `hooks/use-url-extraction.ts` | Hook React lato client per l'attivazione dell'estrazione |
| `/api/extract` punto finale | `app/api/extract/` | Route API lato server che esegue l'estrazione effettiva |

## Come funziona

1. L'utente fornisce un URL nel modulo di invio
2. L'hook `useUrlExtraction` invia l'URL all'endpoint `/api/extract` 3. Il server estrae i metadati (nome, descrizione, categoria, tag, marchio, immagini)
4. I dati estratti vengono restituiti e possono essere utilizzati per compilare automaticamente i campi del modulo

## Il gancio `useUrlExtraction` ### Interfaccia

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

### Utilizzo

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

## Campi dati estratti

| Campo | Digitare | Descrizione |
|---|---|---|
| `name` | `string` | Nome del prodotto o servizio estratto dalla pagina |
| `description` | `string` | Descrizione del prodotto o meta descrizione |
| `category` | `string?` | Categoria suggerita, confrontata con le categorie esistenti quando fornita |
| `tags` | `string[]?` | Tag rilevanti estratti dal contenuto della pagina |
| `brand` | `string?` | Marchio o nome dell'azienda |
| `brand_logo_url` | `string?` | URL dell'immagine del logo del marchio |
| `images` | `string[]?` | Matrice di URL di immagini pertinenti trovati nella pagina |

## Corrispondenza categoria

La funzione `extractFromUrl` accetta un parametro opzionale `existingCategories` . Quando fornita, l'API di estrazione tenta di abbinare il contenuto estratto a queste categorie, garantendo che la categoria suggerita sia allineata alla tassonomia del sito:

```tsx
const existingCategories = ['Analytics', 'Marketing', 'Development'];
const result = await extractFromUrl('https://example.com/product', existingCategories);
// result.category will be one of the existing categories if a match is found
```

## Gestione degli errori

L'hook implementa più livelli di gestione degli errori:

| Scenario | Comportamento |
|---|---|
| URL vuoto | Genera un errore con "Nessun URL fornito" |
| Errore richiesta HTTP | Errore nei registri, mostra la notifica di avviso popup |
| Funzionalità disabilitata | Restituisce `null` silenziosamente (degradazione aggraziata) |
| Errore API | Errore nei registri, mostra il toast con il messaggio |
| Errore imprevisto | Rileva tutti gli errori, mostra un toast generico, restituisce `null` |

### Degradazione aggraziata

Il sistema supporta la degradazione normale quando la funzionalità di estrazione non è configurata:

```tsx
// Server response when feature is disabled
if (response.data.featureDisabled) {
  // Returns null without showing an error
  return null;
}
```

Ciò consente al modulo di invio di funzionare normalmente anche se il servizio di estrazione AI non è configurato, saltando semplicemente la fase di compilazione automatica.

## Integrazione delle query di reazione

L'hook utilizza `useMutation` di TanStack Query per gestire la richiesta di estrazione:

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

Vantaggi dell'utilizzo di `useMutation` :
- Gestione automatica dello stato di caricamento tramite `isPending` - Gestione degli errori integrata con richiamata `onError` - API basata su promesse tramite `mutateAsync` ## Integrazione con il modulo di invio

L'estrazione dell'URL è in genere integrata nel flusso di invio dell'elemento:

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

##Cliente API

L'hook utilizza il `serverClient` del modello per la comunicazione HTTP:

```tsx
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

// POST request to the extraction endpoint
const response = await serverClient.post('/api/extract', { url, existingCategories });

// Response validation
if (!apiUtils.isSuccess(response)) {
  throw new Error(apiUtils.getErrorMessage(response));
}
```

## File chiave

| File | Percorso |
|---|---|
| Hook estrazione URL | `hooks/use-url-extraction.ts` |
| Estrai percorso API | `app/api/extract/route.ts` |
| Client API server | `lib/api/server-api-client.ts` |
