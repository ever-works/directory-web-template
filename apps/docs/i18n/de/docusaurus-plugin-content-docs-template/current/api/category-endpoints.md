---
id: category-endpoints
title: "Category API Endpoints"
sidebar_label: "Category API Endpoints"
---

# Kategorie API Endpunkte

Die Kategorien API stellt einen leichtgewichtigen öffentlichen Endpunkt bereit, um zu prüfen, ob Kategorien im System vorhanden sind. Kategorien werden aus der Content-Schicht (Git-basiertes CMS) abgeleitet und benötigen keine Datenbankverbindung.

**Quelldatei:** `template/app/api/categories/exists/route.ts`

## Routenübersicht

| Methode | Pfad | Authentifizierung | Beschreibung |
| ------- | ----------------------------- | -------- | ----------------------------------- |
| `GET` | `/api/categories/exists` | Keine | Prüfen, ob Kategorien vorhanden sind |

---

## GET `/api/categories/exists`

Prüft, ob Kategorien im Inhalts-Repository vorhanden sind. Gibt ein boolesches `exists`-Flag und die Gesamtanzahl zurück.

**Abfrageparameter:**

| Parameter | Typ | Erforderlich | Standard | Beschreibung |
| --------- | ------ | -------- | ------- | -------------------------------------------- |
| `locale` | string | Nein | `"en"` | Locale-Code für lokalisierte Kategorien |

**Implementierung:**

```ts
const locale = request?.nextUrl?.searchParams?.get('locale') || 'en';
const { categories } = await fetchItems({ lang: locale });

const hasCategories = Array.isArray(categories) && categories.length > 0;

return NextResponse.json({
  exists: hasCategories,
  count: categories?.length || 0
});
```

**Antwort (200) – Kategorien gefunden:**

```json
{ "exists": true, "count": 12 }
```

**Antwort (200) – Keine Kategorien:**

```json
{ "exists": false, "count": 0 }
```

**Fehlerbehandlung:** Bei Fehler wird ein sicherer Fallback zurückgegeben statt einem 500-Status. Fehler werden nur im Entwicklungsmodus protokolliert.

**Hinweise:**

- Kategorien stammen aus dem Git-basierten CMS, nicht aus der Datenbank.
- Der Endpunkt ist locale-abhängig; verschiedene Locales können unterschiedliche Kategorienanzahlen haben.
- Keine Caching-Header werden vom Handler gesetzt; Caching wird auf Infrastrukturebene verwaltet.

See the [English documentation](/api/category-endpoints) for the full content of this section.
