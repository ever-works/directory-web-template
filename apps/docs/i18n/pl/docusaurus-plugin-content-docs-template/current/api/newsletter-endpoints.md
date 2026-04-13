---
id: newsletter-endpoints
title: "Akcje Serwera Biuletynu"
sidebar_label: "Biuletyn"
---

# Akcje Serwera Biuletynu

Funkcjonalność biuletynu jest zaimplementowana jako **Akcje Serwera Next.js** (nie tradycyjne punkty końcowe REST API). Zapewniają one subskrypcję do biuletynu e-mail, rezygnację z subskrypcji oraz pobieranie statystyk. Akcje serwera działają bezpośrednio z komponentów React bez konfiguracji tras API.

## Dostępne akcje serwera

| Akcja | Opis |
|-------|------|
| `subscribeToNewsletter(email)` | Zapisz adres e-mail do listy biuletynu |
| `unsubscribeFromNewsletter(email)` | Usuń adres e-mail z listy biuletynu |
| `getNewsletterStatistics()` | Pobierz zestawienie statystyk biuletynu |

---

## subscribeToNewsletter

```typescript
subscribeToNewsletter(email: string): Promise<{ success: boolean; message: string }>
```

Subskrybuje dostarczony adres e-mail do biuletynu. Jeśli subskrypcja dla tego adresu e-mail już istnieje, status jest aktualizowany do `"active"` (umożliwiając ponowne subskrybowanie po wypisaniu się).

### Parametry

| Parametr | Typ | Wymagane | Opis |
|----------|-----|----------|------|
| `email` | string | Tak | Adres e-mail do zasubskrybowania (musi być prawidłowym adresem e-mail) |

### Odpowiedź sukcesu

```json
{
  "success": true,
  "message": "Successfully subscribed to newsletter"
}
```

### Odpowiedź błędu

```json
{
  "success": false,
  "message": "A valid email address is required"
}
```

### Przykład użycia

```typescript
import { subscribeToNewsletter } from '@/lib/newsletter/actions';

// Z komponentu React lub formularza
const result = await subscribeToNewsletter('user@example.com');
if (result.success) {
  console.log('Subscribed!');
}
```

---

## unsubscribeFromNewsletter

```typescript
unsubscribeFromNewsletter(email: string): Promise<{ success: boolean; message: string }>
```

Wypisuje dostarczony adres e-mail z biuletynu poprzez ustawienie statusu na `"unsubscribed"`. Jeśli adres e-mail nie jest znaleziony na liście subskrybentów, aksja kończy się pomyślnie bez zgłaszania błędu (idempotentne).

### Parametry

| Parametr | Typ | Wymagane | Opis |
|----------|-----|----------|------|
| `email` | string | Tak | Adres e-mail do wypisania |

### Odpowiedź sukcesu

```json
{
  "success": true,
  "message": "Successfully unsubscribed from newsletter"
}
```

### Przykład użycia

```typescript
import { unsubscribeFromNewsletter } from '@/lib/newsletter/actions';

const result = await unsubscribeFromNewsletter('user@example.com');
```

---

## getNewsletterStatistics

```typescript
getNewsletterStatistics(): Promise<NewsletterStats>
```

Zwraca zestawienie statystyk subskrypcji biuletynu. Dostępne tylko dla administratorów.

### Odpowiedź

```typescript
{
  total: number;         // Łączna liczba rekordów subskrypcji
  active: number;        // Aktywne subskrypcje
  unsubscribed: number;  // Wypisane subskrypcje
}
```

**Przykład odpowiedzi:**

```json
{
  "total": 1250,
  "active": 1100,
  "unsubscribed": 150
}
```

---

## Funkcje zapytań bazy danych

Akcje serwera są wspierane przez następujące funkcje warstwy dostępu do danych:

| Funkcja | Opis |
|---------|------|
| `createOrUpdateNewsletterSubscription(email, status)` | Wstaw lub zaktualizuj rekord subskrypcji |
| `getNewsletterSubscriptionByEmail(email)` | Pobierz rekord subskrypcji według adresu e-mail |
| `updateNewsletterSubscriptionStatus(email, status)` | Zmień status isniejącej subskrypcji |
| `getNewsletterStats()` | Agreguj statystyki subskrypcji |

---

## Konfiguracja

Ustawienia biuletynu są zarządzane w `lib/newsletter/config.ts`:

| Ustawienie | Opis |
|------------|------|
| `NEWSLETTER_ENABLED` | Przełącznik włączania/wyłączania funkcji biuletynu |
| `MAX_SUBSCRIPTIONS` | Opcjonalny limit całkowitej liczby subskrybentów |
| `DOUBLE_OPT_IN` | Czy wymagać potwierdzenia subskrypcji przez e-mail |

Jeśli `NEWSLETTER_ENABLED` ma wartość `false`, akcje serwera natychmiast zwracają odpowiedź błędu.

---

## Bezpieczeństwo

- Adresy e-mail są weryfikowane przez Zod przed przetworzeniem.
- Akcja `getNewsletterStatistics` wymaga aktywnej sesji administratora.
- Żadne hasła ani tokeny nie są przechowywane -- przechowywany jest tylko adres e-mail i stan subskrypcji.
