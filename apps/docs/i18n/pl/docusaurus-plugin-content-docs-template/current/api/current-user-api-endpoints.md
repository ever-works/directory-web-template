---
id: current-user-api-endpoints
title: "Punkty końcowe API Bieżącego Użytkownika"
sidebar_label: "API Bieżącego Użytkownika"
---

# Punkty końcowe API Bieżącego Użytkownika

API Bieżącego Użytkownika udostępnia pojedynczy punkt końcowy do pobierania informacji o profilu uwierzytelnionego użytkownika. Jest używany przez interfejs użytkownika do określania stanu uwierzytelnienia i uprawnień użytkownika.

**Źródło:** `template/app/api/current-user/route.ts`

---

## Pobieranie Bieżącego Użytkownika

Zwraca bezpieczne informacje profilowe aktualnie uwierzytelnionego użytkownika. Zwraca `null`, jeśli żaden użytkownik nie jest uwierzytelniony.

| Właściwość | Wartość |
|------------|--------|
| **Metoda** | `GET` |
| **Ścieżka** | `/api/current-user` |
| **Uwierzytelnianie** | Niewymagane (zwraca `null` jeśli nieuwierzytelniony) |

### Odpowiedź

**Status 200** -- Uwierzytelniony użytkownik.

```json
{
  "id": "user_123abc",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "image": "https://example.com/avatars/john.jpg",
  "provider": "google",
  "isAdmin": false
}
```

**Status 200** -- Brak uwierzytelnionego użytkownika.

```json
null
```

### Pola odpowiedzi

| Pole | Typ | Nullable | Opis |
|------|-----|----------|------|
| `id` | `string` | Nie | Unikalny identyfikator użytkownika |
| `name` | `string` | Tak | Pełne imię i nazwisko użytkownika |
| `email` | `string` | Tak | Adres e-mail użytkownika |
| `image` | `string` | Tak | URL zdjęcia profilowego |
| `provider` | `string` | Tak | Dostawca uwierzytelniania (np. `google`, `github`, `credentials`) |
| `isAdmin` | `boolean` | Nie | Czy użytkownik ma uprawnienia administratora (domyślnie `false`) |

### Przykłady odpowiedzi

**Użytkownik OAuth (Google):**
```json
{
  "id": "user_123abc",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "image": "https://lh3.googleusercontent.com/...",
  "provider": "google",
  "isAdmin": false
}
```

**Użytkownik administrator (credentials):**
```json
{
  "id": "user_456def",
  "name": "Jane Admin",
  "email": "jane.admin@example.com",
  "image": null,
  "provider": "credentials",
  "isAdmin": true
}
```

**Użytkownik GitHub:**
```json
{
  "id": "user_789ghi",
  "name": "GitHub User",
  "email": "github.user@example.com",
  "image": "https://avatars.githubusercontent.com/u/123456",
  "provider": "github",
  "isAdmin": false
}
```

### Przykłady curl

```bash
# Pobierz bieżącego użytkownika (uwierzytelniony)
curl -s http://localhost:3000/api/current-user \
  -H "Cookie: next-auth.session-token=<session_token>"

# Pobierz bieżącego użytkownika (nieuwierzytelniony -- zwraca null)
curl -s http://localhost:3000/api/current-user
```

### Użycie w TypeScript

```typescript
interface SafeUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  provider: string | null;
  isAdmin: boolean;
}

async function getCurrentUser(): Promise<SafeUser | null> {
  const res = await fetch('/api/current-user');
  return res.json();
}

// Użycie
const user = await getCurrentUser();
if (user) {
  console.log(`Zalogowany jako ${user.name} (${user.provider})`);
  if (user.isAdmin) {
    console.log('Użytkownik ma uprawnienia administratora');
  }
} else {
  console.log('Nieuwierzytelniony');
}
```

### Uwagi implementacyjne

- Punkt końcowy używa funkcji `auth()` z `@/lib/auth` (NextAuth.js) do odczytu sesji po stronie serwera.
- Odpowiedź jest oczyszczona -- zwracane są tylko bezpieczne pola profilu. Wykluczone są wrażliwe pola, takie jak skróty haseł, wewnętrzne metadane i tokeny.
- Ten punkt końcowy zawsze zwraca HTTP 200, nawet gdy żaden użytkownik nie jest uwierzytelniony. Wywołujący różnicuje przez sprawdzenie, czy odpowiedź jest `null`.
- Pole `isAdmin` domyślnie przyjmuje wartość `false`, jeśli nie jest ustawione w sesji, zapewniając bezpieczne zachowanie dla użytkowników bez uprawnień administratora.
