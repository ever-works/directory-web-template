---
id: response-patterns
title: "API Response Patterns"
sidebar_label: "API Response Patterns"
---

# API-Antwortmuster

Alle API-Routen in der Vorlage geben JSON-Antworten im konsistenten Format zurück, das auf einem `ApiResponse<T>`-Typ basiert. Dieses Dokument beschreibt die Struktur, die HTTP-Statuscodes und Hilfsfunktionen zur Fehlerbehandlung.

## `ApiResponse<T>` Typ

Befolge immer die diskriminierende Union für typsicheres Response-Handling:

```typescript
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

Die Typdefinition befindet sich in `types/api.ts`.

## `PaginatedResponse<T>` Typ

Für paginierte Datensätze wird eine erweiterter Typ verwendet:

```typescript
export type PaginatedResponse<T> = ApiResponse<{
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}>;
```

## HTTP-Statuscodes

| Status | Bedeutung |
|--------|-----------|
| 200 | Erfolg (GET, PUT, DELETE) |
| 201 | Erfolgreich erstellt (POST) |
| 400 | Ungültige Anfrage / Validierungsfehler |
| 401 | Nicht authentifiziert |
| 403 | Nicht autorisiert (keine Berechtigung) |
| 404 | Ressource nicht gefunden |
| 409 | Konflikt (z. B. bereits vorhanden) |
| 413 | Anfragekörper zu groß |
| 500 | Interner Serverfehler |
| 503 | Service nicht verfügbar |

## `safeErrorResponse` Hilfsfunktion

Alle Route Handler verwenden `safeErrorResponse` aus `lib/utils/error.ts`, um konsistente Fehlerantworten zu erzeugen:

```typescript
export function safeErrorResponse(
  error: unknown,
  fallback = "An unexpected error occurred"
): NextResponse<ApiResponse<never>> {
  const message = safeErrorMessage(error, fallback);
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}
```

## `safeErrorMessage` Hilfsfunktion

Extrahiert eine sichere, benutzerseitig lesbare Fehlermeldung:

```typescript
export function safeErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred"
): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}
```

## Kanonisches GET-Handler-Beispiel

```typescript
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" } satisfies ApiResponse<never>,
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const paginationResult = validatePaginationParams(searchParams);
    if ("error" in paginationResult) {
      return NextResponse.json(
        { success: false, error: paginationResult.error } satisfies ApiResponse<never>,
        { status: paginationResult.status }
      );
    }
    const { page, limit } = paginationResult;

    const items = await getItems({ page, limit });
    return NextResponse.json(
      { success: true, data: items } satisfies ApiResponse<typeof items>
    );
  } catch (error) {
    return safeErrorResponse(error);
  }
}
```

## Kanonisches POST-Handler-Beispiel

```typescript
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" } satisfies ApiResponse<never>,
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = mySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }

    const result = await createItem(parsed.data);
    return NextResponse.json(
      { success: true, data: result } satisfies ApiResponse<typeof result>,
      { status: 201 }
    );
  } catch (error) {
    return safeErrorResponse(error);
  }
}
```

## Antwortforma-Konsistenz

Regeln für alle API-Routes:

1. **Immer** `success: true | false` setzen – kein direktes Objekt ohne Wrapper zurückgeben
2. **Immer** `satisfies ApiResponse<T>` verwenden, um TypeScript-Konformität sicherzustellen
3. **Fehler** über `safeErrorResponse` oder inline mit `{ success: false, error: string }` zurückgeben
4. **Statuscodes** gemäß Tabelle oben setzen (nicht bei jedem GET 201 zurückgeben)
5. **Paginierte Antworten** folgen `PaginatedResponse<T>` für konsistenten Client-Code
