---
id: currency-formatting
title: "Currency Formatting"
sidebar_label: "Currency Formatting"
sidebar_position: 24
---

# Currency Formatting

The template includes a set of currency formatting utilities that provide consistent, locale-aware monetary value display with support for over 20 currencies and automatic handling of zero-decimal currencies.

**Source:** `lib/utils/currency-format.ts`

## Overview

The currency formatting module addresses several common challenges:

- **Minor-to-major unit conversion** -- payment providers like Stripe store amounts in minor units (cents). The utilities handle conversion to display-ready major units.
- **Zero-decimal currencies** -- currencies like JPY (Japanese Yen) and KRW (Korean Won) have no minor units. These are handled automatically.
- **Locale-aware formatting** -- uses `Intl.NumberFormat` for proper symbol placement, decimal separators, and thousands grouping based on locale.
- **Graceful fallback** -- if a currency code is not recognized by `Intl.NumberFormat`, the utilities fall back to a manual symbol + amount format.

## Functions

### `formatCurrency(amountInMinorUnits, currency?, locale?)`

Converts an amount in **minor units** (e.g., cents) to a formatted currency string:

```ts
import { formatCurrency } from '@/lib/utils/currency-format';

formatCurrency(1999, 'USD');
// "$19.99"

formatCurrency(1999, 'USD', 'de-DE');
// "19,99 $"

formatCurrency(1500, 'EUR', 'fr-FR');
// "15,00 €"
```

**Zero-decimal currencies** are not divided by 100:

```ts
formatCurrency(1500, 'JPY');
// "¥1,500"

formatCurrency(50000, 'KRW');
// "₩50,000"
```

**Parameters:**

| Parameter            | Type     | Default   | Description                    |
|----------------------|----------|-----------|--------------------------------|
| `amountInMinorUnits` | `number` | required  | Amount in minor units (cents)  |
| `currency`           | `string` | `'USD'`   | ISO 4217 currency code         |
| `locale`             | `string` | `'en-US'` | BCP 47 locale tag              |

### `formatCurrencyAmount(amount, currency?, locale?)`

Formats an amount already in **major units** (dollars, not cents):

```ts
import { formatCurrencyAmount } from '@/lib/utils/currency-format';

formatCurrencyAmount(19.99, 'USD');
// "$19.99"

formatCurrencyAmount(19.99, 'GBP');
// "£19.99"

formatCurrencyAmount(1500, 'JPY');
// "¥1,500"
```

This is useful when the amount comes from a source that already provides major units (e.g., a user-entered price field).

**Parameters:**

| Parameter  | Type     | Default   | Description                    |
|------------|----------|-----------|--------------------------------|
| `amount`   | `number` | required  | Amount in major units          |
| `currency` | `string` | `'USD'`   | ISO 4217 currency code         |
| `locale`   | `string` | `'en-US'` | BCP 47 locale tag              |

### `getCurrencySymbol(currency)`

Returns the symbol for a currency code from a built-in lookup table:

```ts
import { getCurrencySymbol } from '@/lib/utils/currency-format';

getCurrencySymbol('USD');  // "$"
getCurrencySymbol('EUR');  // "€"
getCurrencySymbol('GBP');  // "£"
getCurrencySymbol('JPY');  // "¥"
getCurrencySymbol('INR');  // "₹"
getCurrencySymbol('BRL');  // "R$"
getCurrencySymbol('KRW');  // "₩"
getCurrencySymbol('XYZ');  // "XYZ" (unknown code returned as-is)
```

### `formatAmountWithSymbol(amount, currency?)`

Low-level formatter that combines a currency symbol with a fixed-decimal amount. Used as the fallback when `Intl.NumberFormat` does not recognize a currency code:

```ts
import { formatAmountWithSymbol } from '@/lib/utils/currency-format';

formatAmountWithSymbol(19.99, 'USD');
// "$19.99"

formatAmountWithSymbol(1500, 'JPY');
// "¥1500"

formatAmountWithSymbol(29.5, 'EUR');
// "€29.50"
```

This function respects zero-decimal conventions -- JPY, KRW, VND, CLP, and IDR are formatted with 0 decimal places.

## Supported Currencies

The symbol lookup table includes:

| Code | Symbol | Currency                    |
|------|--------|-----------------------------|
| USD  | $      | US Dollar                   |
| EUR  | E      | Euro                        |
| GBP  | P      | British Pound               |
| JPY  | Y      | Japanese Yen                |
| CNY  | Y      | Chinese Yuan                |
| CAD  | C$     | Canadian Dollar             |
| AUD  | A$     | Australian Dollar           |
| CHF  | CHF    | Swiss Franc                 |
| INR  | R      | Indian Rupee                |
| BRL  | R$     | Brazilian Real              |
| MXN  | $      | Mexican Peso                |
| KRW  | W      | South Korean Won            |
| RUB  | R      | Russian Ruble               |
| TRY  | T      | Turkish Lira                |
| ZAR  | R      | South African Rand          |
| SGD  | S$     | Singapore Dollar            |
| HKD  | HK$    | Hong Kong Dollar            |
| NOK  | kr     | Norwegian Krone             |
| SEK  | kr     | Swedish Krona               |
| DKK  | kr     | Danish Krone                |
| PLN  | zl     | Polish Zloty                |
| CZK  | Kc     | Czech Koruna                |
| HUF  | Ft     | Hungarian Forint            |

Currencies not in the table return the uppercase code as the symbol.

## Zero-Decimal Currencies

The following currencies do not use minor units (no cents):

| Code | Currency          |
|------|-------------------|
| JPY  | Japanese Yen      |
| KRW  | South Korean Won  |
| VND  | Vietnamese Dong   |
| CLP  | Chilean Peso      |
| IDR  | Indonesian Rupiah |

For these currencies:
- `formatCurrency` treats the input as already in major units (no division by 100)
- `formatAmountWithSymbol` uses 0 decimal places
- `Intl.NumberFormat` handles them automatically

## Error Handling

Both `formatCurrency` and `formatCurrencyAmount` catch `RangeError` exceptions from `Intl.NumberFormat` (which occur for unrecognized currency codes) and fall back to `formatAmountWithSymbol`:

```ts
// Unrecognized currency code
formatCurrency(1999, 'FAKE');
// Falls back to: "FAKE19.99"

// Invalid locale (other errors) are re-thrown
```

This ensures the UI never breaks due to an unexpected currency code from a payment provider.

## Integration Examples

### Displaying Subscription Prices

```ts
import { formatCurrency } from '@/lib/utils/currency-format';

function PricingCard({ plan }) {
  return (
    <div>
      <span>{formatCurrency(plan.amountInCents, plan.currency)}</span>
      <span>/{plan.interval}</span>
    </div>
  );
}
```

### Formatting User-Entered Amounts

```ts
import { formatCurrencyAmount } from '@/lib/utils/currency-format';

// User enters 29.99 in a form
const display = formatCurrencyAmount(29.99, userCurrency, userLocale);
```

### Multi-Locale Support

```ts
import { formatCurrencyAmount } from '@/lib/utils/currency-format';

const amount = 1234.56;

formatCurrencyAmount(amount, 'EUR', 'en-US');  // "€1,234.56"
formatCurrencyAmount(amount, 'EUR', 'de-DE');  // "1.234,56 €"
formatCurrencyAmount(amount, 'EUR', 'fr-FR');  // "1 234,56 €"
```

### Sponsor Ad Pricing

The `SponsorAdService` uses currency formatting for display:

```ts
import { formatCurrencyAmount } from '@/lib/utils/currency-format';

const price = sponsorAdService.getAmountForInterval('weekly');
const currency = sponsorAdService.getCurrency();
const display = formatCurrencyAmount(price, currency);
// "$29.00" (or configured amount)
```
