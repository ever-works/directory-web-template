---
id: view-tracking
title: Bekijk tracking en betrokkenheid
sidebar_label: Bekijk volgen
sidebar_position: 35
---

# Bekijk tracking en betrokkenheid

De sjabloon bevat een privacybewust weergavevolgsysteem dat unieke dagelijkse weergaven per item registreert. Het maakt het aantal weergaven op itempagina's, dashboardanalyses, rankings van populaire items en populariteitsscores mogelijk.

## Architectuuroverzicht

```
components/tracking/
  item-view-tracker.tsx       # Client-side tracking component

app/api/items/[slug]/views/
  route.ts                    # POST endpoint for recording views

lib/db/queries/
  item-view.queries.ts        # Aggregation and recording functions

lib/utils/
  bot-detection.ts            # User-agent bot pattern matching

lib/constants/
  analytics.ts                # Cookie names and configuration
```

## Verwerkingspijplijn

Wanneer een gebruiker een itemdetailpagina bezoekt, vuurt de `ItemViewTracker` -component een POST-verzoek af. De server verwerkt het via een meertrapspijplijn:

```
Request arrives
  |
  +--> Database availability check
  |      (returns 503 if unavailable)
  |
  +--> Bot detection (user-agent analysis)
  |      (skips recording if bot detected)
  |
  +--> Item existence check
  |      (returns 404 if not found)
  |
  +--> Owner exclusion
  |      (skips if session user owns the item)
  |
  +--> Cookie-based viewer identification
  |      (reads or creates first-party cookie)
  |
  +--> Daily deduplication insert
         (ON CONFLICT DO NOTHING)
```

### Antwoordformaat

```json
{ "success": true, "counted": true }
```

| Reactie | Betekenis |
|----------|---------|
| `counted: true` | Er is een nieuw uitzicht vastgelegd |
| `counted: false` | Duplicaat voor vandaag (dezelfde viewer + item + datum) |
| `counted: false, reason: "bot"` | Bot-user-agent gedetecteerd |
| `counted: false, reason: "owner"` | Geauthenticeerde gebruiker bekijkt zijn eigen item |

## Tracker aan de clientzijde

De `ItemViewTracker` is een clientcomponent die een enkel POST-verzoek bij mount afvuurt:

```tsx
// Simplified from components/tracking/item-view-tracker.tsx
"use client";

export function ItemViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/items/${slug}/views`, { method: 'POST' })
      .catch(() => {}); // Best-effort, never blocks rendering
  }, [slug]);

  return null; // Renders nothing
}
```

De tracker maakt gebruik van een best-effort-benadering: fouten worden stilzwijgend genegeerd, zodat het volgen van weergaven de gebruikerservaring nooit verstoort.

## Botdetectie

De `lib/utils/bot-detection.ts` -module houdt een lijst bij van bekende bot-user-agent-patronen, waaronder crawlers van zoekmachines, monitoringtools en geautomatiseerde clients. Wanneer een bot wordt gedetecteerd, retourneert het eindpunt een succesvol antwoord met `counted: false` zonder de database aan te raken.

## Identificatie van de kijker

Weergaven worden toegeschreven aan een kijkers-ID die is opgeslagen in een first-party HTTP-only cookie:

```ts
let viewerId = cookieStore.get(VIEWER_COOKIE_NAME)?.value;
if (!viewerId) {
  viewerId = crypto.randomUUID();
  cookieStore.set(VIEWER_COOKIE_NAME, viewerId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: VIEWER_COOKIE_MAX_AGE,
    path: '/',
  });
}
```

### Privacy-eigenschappen

- **Geen persoonlijke gegevens** -- de cookie bevat alleen een willekeurige UUID, niet de identiteit van de gebruiker.
- **Alleen HTTP** -- JavaScript kan de cookie niet lezen, waardoor op XSS gebaseerde tracking-exfiltratie wordt voorkomen.
- **Same-site lax**: de cookie wordt niet verzonden bij cross-origin-verzoeken.
- **Veilige vlag** - afgedwongen in productie om HTTPS te vereisen.
- **Geen services van derden**: alle trackinggegevens blijven in uw database.

## Dagelijkse ontdubbeling

De kernregistratielogica maakt gebruik van PostgreSQL's `ON CONFLICT DO NOTHING` :

```ts
export async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean> {
  const result = await db
    .insert(itemViews)
    .values(view)
    .onConflictDoNothing()
    .returning({ id: itemViews.id });
  return result.length > 0;
}
```

De `itemViews` -tabel heeft een unieke beperking voor `(itemId, viewerId, viewedDateUtc)` . De eerste weergave van de dag voor een kijker-itempaar voegt een rij in en retourneert `true` . Volgende weergaven op dezelfde dag worden stilzwijgend overgeslagen. De datum wordt berekend als UTC `YYYY-MM-DD` voor consistente ontdubbeling, ongeacht de tijdzone.

## Uitsluiting van eigenaar

Wanneer een geverifieerde gebruiker zijn eigen item bekijkt, wordt de weergave niet meegeteld:

```ts
if (session?.user?.id && item.submitted_by === session.user.id) {
  return NextResponse.json({ success: true, counted: false, reason: 'owner' });
}
```

Dit voorkomt dat itemeigenaren hun weergaveaantallen kunstmatig kunnen verhogen.

## Aggregatiequery's

Het `item-view.queries.ts` -bestand exporteert verschillende functies voor analyse:

| Functie | Retourtype | Beschrijving |
|----------|-------------|------------|
| `getTotalViewsCount(slugs)` | `number` | Totaal aantal weergaven aller tijden voor item-slugs |
| `getRecentViewsCount(slugs, days)` | `number` | Weergaven binnen een schuifvenster (standaard 7 dagen) |
| `getDailyViewsData(slugs, days)` | `Map<string, number>` | Datumgecodeerde kaart voor sparkline-diagrammen |
| `getViewsPerItem(slugs)` | `Map<string, number>` | Totaal aantal weergaven per item voor ranglijsten |

## Analytics-integratie

### Populariteitsscore

Weergavetellingen worden meegenomen in het logaritmische populariteitsscore-algoritme dat wordt gebruikt door het gedeelde kaartsysteem:

```ts
const viewScore = logScale(viewCount, 1.5); // Logarithmic scaling with 1.5 weight
```

Dit zorgt ervoor dat items met veel weergaven hoger scoren in de sorteermodus 'Populair' en voorkomen dat er sprake is van overmatige scores van virale items.

### Klantendashboard

Het klantendashboard op `/client/dashboard` geeft het volgende weer:
- Totaal aantal weergaven van alle ingediende items
- Weergaven van de afgelopen 7 dagen met trendindicatoren
- Een dagelijkse weergavegrafiek via `getDailyViewsData` ### Beheerdersdashboard

Het beheerdersdashboard gebruikt `GET /api/admin/dashboard/stats` voor statistieken voor de hele site. Het geo-analyse-eindpunt biedt een geografische distributie van weergaven.

## Foutafhandeling

Bekijk trackingfouten worden tijdens de productie stil afgehandeld:

```ts
catch (error) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error recording item view:', error);
  }
  return NextResponse.json(
    { success: false, error: 'Failed to record view' },
    { status: 500 }
  );
}
```

De ontwikkelingsmodus registreert fouten voor foutopsporing. De productie onderdrukt de console-uitvoer om ruis te voorkomen.

## Configuratie

Het volgen van weergaven werkt automatisch zonder vereiste omgevingsvariabelen. Het systeem verslechtert op elegante wijze:

- **Geen database** -- het eindpunt retourneert 503 en de client negeert de fout.
- **Databasesimulatiemodus** -- indien ingeschakeld, worden weergaven bijgehouden aan de hand van gesimuleerde gegevens.
- **Functievlaggen**: het aantal weergaven wordt voorwaardelijk weergegeven op basis van de sjablooninstellingen.

## Toegankelijkheid

- De `ItemViewTracker` geeft geen DOM-elementen weer, waardoor er geen impact is op de pagina-indeling en schermlezers.
- Weergavetellingen die op kaarten worden weergegeven, gebruiken `aria-label` -attributen voor de context van de schermlezer.
- Dashboardweergavegrafieken bevatten beschrijvende kopjes en samenvattende tekst.

## Gerelateerde documentatie

- [Dashboardcomponenten](/docs/template/components/dashboard-components) -- Bekijk de weergave van statistieken
- [Gedeelde kaartcomponenten](/docs/template/components/shared-card-components) -- Populariteitsscore
- [Admin Analytics](/docs/template/features/admin-analytics) -- Statistieken voor de hele site
- [Stemmen en opmerkingen](/docs/template/features/voting-comments) -- Andere engagementfuncties
