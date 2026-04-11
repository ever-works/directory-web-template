---
id: sentry-logs
title: Sentry Logboek Configuratie
sidebar_label: Sentry Logboeken
sidebar_position: 7
---

# Sentry Logboek Configuratie

Dit document legt uit hoe u Sentry Logs configureert en gebruikt in de Template-repository en de Ever Works-repository.

## Overzicht

Sentry Logs biedt gecentraliseerd logbeheer, waarmee u applicatielogs kunt vastleggen, doorsturen en analyseren in Sentry's Logs Explorer. Alle logs worden automatisch doorgestuurd naar Sentry wanneer ingeschakeld, wat een uniforme weergave biedt van het applicatiegedrag in verschillende omgevingen.

## Functies

- ✅ Automatisch doorsturen van logs naar Sentry
- ✅ Ondersteuning voor alle log-niveaus (debug, info, warn, error)
- ✅ Contextbewust loggen met automatische taggen
- ✅ Omgevingsspecifieke configuratie
- ✅ Gestructureerd loggen met metagegevensondersteuning
- ✅ Integratie met bestaand logger-hulpprogramma

## Configuratie

### Omgevingsvariabelen

Voeg deze variabelen toe aan uw `.env.local`-bestand voor lokale ontwikkeling:

```env
# Sentry-configuratie (vereist voor logs)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token

# Sentry inschakelen in ontwikkeling (optioneel, standaard alleen in productie)
SENTRY_ENABLE_DEV=true

# Sentry debug-modus (optioneel)
SENTRY_DEBUG=false

# Sentry logconfiguratie
SENTRY_LOGS_ENABLED=true  # Sentry Logs in-/uitschakelen (standaard: true)
SENTRY_LOGS_LEVEL=info    # Minimaal log-niveau om vast te leggen (standaard: info)
```

### Omgevingsspecifieke instelling

#### Lokale ontwikkeling

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=debug  # Alle logs vastleggen in ontwikkeling
```

#### Ontwikkeling/Staging

```env
SENTRY_ENABLE_DEV=true
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=info  # Info-, warn- en error-logs vastleggen
```

#### Productie

```env
SENTRY_ENABLE_DEV=false  # Niet nodig in productie
SENTRY_LOGS_ENABLED=true
SENTRY_LOGS_LEVEL=warn  # Alleen waarschuwingen en fouten vastleggen in productie
```

## Gebruik

### Basis loggen

De logger stuurt logs automatisch door naar Sentry wanneer ingeschakeld:

```typescript
import { logger } from '@/lib/logger';

// Info-log
logger.info('User logged in', { userId: '12345' });

// Waarschuwingslog
logger.warn('Rate limit approaching', { current: 90, limit: 100 });

// Foutlog
logger.error('Payment failed', { orderId: '67890', error: errorObject });

// Debug-log (alleen in ontwikkeling)
logger.debug('API request', { method: 'GET', url: '/api/users' });
```

### Contextueel loggen

Maak een logger met een specifieke context voor betere organisatie:

```typescript
import { Logger } from '@/lib/logger';

const paymentLogger = Logger.create('PaymentService');

paymentLogger.info('Processing payment', { amount: 100, currency: 'USD' });
paymentLogger.error('Payment failed', error);
```

### Log-niveaus

De logger ondersteunt vier log-niveaus, automatisch toegewezen aan Sentry-ernstniveaus:

| Logger-niveau | Sentry-niveau | Beschrijving |
|-------------|-------------|-------------|
| `DEBUG` | `debug` | Gedetailleerde debug-informatie (alleen ontwikkeling) |
| `INFO` | `info` | Algemene informatieve berichten |
| `WARN` | `warning` | Waarschuwingsberichten voor potentiële problemen |
| `ERROR` | `error` | Foutberichten voor storingen |

## Werking

### Initialisatie

Sentry Logs is ingeschakeld in zowel client- als server-instrumentatie:

1. **Serverside** (`instrumentation.ts`): Initialiseert Sentry voor Node.js-runtime
2. **Clientside** (`instrumentation-client.ts`): Initialiseert Sentry voor browser-runtime

Beide configuraties bevatten:
```typescript
_experiments: {
  enableLogs: SENTRY_LOGS_ENABLED,
}
```

### Log doorsturen

Het logger-hulpprogramma (`lib/logger.ts`) voert automatisch het volgende uit:
1. Controleert of Sentry Logs is ingeschakeld
2. Formatteert logvermeldingen met context en metagegevens
3. Stuurt logs door naar Sentry via `Sentry.captureMessage()` met de juiste tags en niveaus
4. Valt terug op normaal werken als Sentry niet beschikbaar is

### Logstructuur

Elke naar Sentry verzonden logvermelding bevat:
- **Bericht**: Het logbericht met optioneel contextprefix
- **Niveau**: Ernstniveau (debug, info, warning, error)
- **Tags**:
  - `logLevel`: Het oorspronkelijke log-niveau
  - `logType`: Altijd `application_log`
  - `context`: Optionele contextidentificatie
- **Extra gegevens**:
  - `data`: Eventuele aanvullende verstrekte gegevens
  - `timestamp`: ISO-tijdstempel

## Logs bekijken in Sentry

### Logs Explorer

1. Navigeer naar uw Sentry-project
2. Ga naar **Logs** → **Logs Explorer**
3. Gebruik filters om specifieke logs te vinden:
   - Filteren op `logLevel`-tag (debug, info, warn, error)
   - Filteren op `context`-tag om logs van specifieke modules te zien
   - Filteren op `logType:application_log` om alleen applicatielogs te zien

### Logs opvragen

Voorbeeldquery's in Sentry Logs Explorer:

```
# Alle foutlogs
logLevel:error

# Logs uit een specifieke context
context:PaymentService

# Alle applicatielogs
logType:application_log

# Fouten uit een specifiek tijdsbereik
logLevel:error timestamp:>2024-01-01
```

## Integratie met het monitoringpakket

Als u het `@ever-works/monitoring`-pakket gebruikt, zorg ervoor dat het samenwerkt met Sentry Logs:

1. Het monitoringpakket moet Sentry initialiseren met logs ingeschakeld
2. Het logger-hulpprogramma in dit template stuurt logs automatisch door naar Sentry
3. Beide systemen werken samen voor uitgebreide monitoring

## Probleemoplossing

### Logs verschijnen niet in Sentry

1. **DSN-configuratie controleren**
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```
   Zorg dat de DSN correct is ingesteld en toegankelijk is.

2. **Controleer of logs zijn ingeschakeld**
   ```bash
   echo $SENTRY_LOGS_ENABLED
   ```
   Moet `true` zijn opdat logs worden doorgestuurd.

3. **Sentry-initialisatie controleren**
   - Verifieer dat `SENTRY_ENABLED` true is
   - Controleer de browserconsole op Sentry-initialisatiefouten
   - Verifieer dat `_experiments.enableLogs` is ingesteld op `true`

4. **Log-niveau filtering controleren**
   - Zorg dat uw log-niveau voldoet aan de `SENTRY_LOGS_LEVEL`-drempelwaarde
   - Debug-logs worden alleen vastgelegd als het niveau is ingesteld op `debug`

### Prestatieoverwegingen

- Logs worden asynchroon verzonden en blokkeren uw applicatie niet
- In productie kunt u `SENTRY_LOGS_LEVEL=warn` instellen om het logvolume te verminderen
- Sentry verwerkt rate limiting en batching automatisch

### Logs uitschakelen

Sentry Logs uitschakelen zonder Sentry volledig uit te schakelen:

```env
SENTRY_LOGS_ENABLED=false
```

De logger blijft normaal werken, maar logs worden niet doorgestuurd naar Sentry.

## Best practices

1. **Geschikte log-niveaus gebruiken**
   - Gebruik `debug` voor gedetailleerde ontwikkelingsinformatie
   - Gebruik `info` voor algemene applicatiestroom
   - Gebruik `warn` voor potentiële problemen die de functionaliteit niet verstoren
   - Gebruik `error` voor daadwerkelijke fouten en uitzonderingen

2. **Context opnemen**
   - Gebruik contextloggers voor betere organisatie
   - Neem relevante metagegevens op in loggegevens

3. **Gevoelige gegevens vermijden**
   - Log nooit wachtwoorden, tokens of persoonsgegevens
   - Schoon gegevens op voor het loggen

4. **Productieconfiguratie**
   - Stel `SENTRY_LOGS_LEVEL=warn` in voor productie
   - Bewaak uw Sentry-quotumgebruik
   - Bekijk logs regelmatig op patronen

## Validatiechecklist

- [ ] Sentry DSN is correct geconfigureerd
- [ ] `SENTRY_LOGS_ENABLED=true` is ingesteld
- [ ] Logs verschijnen in Sentry Logs Explorer
- [ ] Log-niveaus zijn correct toegewezen (info, warn, error, debug)
- [ ] Contexttags zijn zichtbaar in Sentry
- [ ] Logs werken zowel lokaal als in de implementatieomgeving
- [ ] QA kan logs zien en filteren in Sentry Logs Explorer

## Aanvullende bronnen

- [Sentry Logs Documentatie](https://docs.sentry.io/product/logs/)
- [Sentry Next.js Integratie](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Logs Explorer Gids](https://docs.sentry.io/product/logs/explorer/)
