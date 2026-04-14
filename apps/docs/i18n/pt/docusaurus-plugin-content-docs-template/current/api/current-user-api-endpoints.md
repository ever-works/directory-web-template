---
id: current-user-api-endpoints
title: Endpoints de API do Usuário Atual
sidebar_label: API de Usuário Atual
sidebar_position: 60
---

# Endpoints de API do Usuário Atual

A API de Usuário Atual fornece um único endpoint para recuperar as informações de perfil do usuário autenticado. Ela é usada pelo frontend para determinar o estado de autenticação e os privilégios do usuário.

**Origem:** `template/app/api/current-user/route.ts`

---

## Obter usuário atual

Retorna as informações de perfil seguras do usuário autenticado atual. Retorna `null` se nenhum usuário estiver autenticado.

| Propriedade | Valor |
|-------------|-------|
| **Método** | `GET` |
| **Caminho** | `/api/current-user` |
| **Auth** | Nenhuma necessária (retorna `null` se não autenticado) |

### Resposta

**Status 200** -- Usuário autenticado.

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

**Status 200** -- Nenhum usuário autenticado.

```json
null
```

### Campos da resposta

| Campo | Tipo | Anulável | Descrição |
|-------|------|----------|-----------|
| `id` | `string` | Não | Identificador único do usuário |
| `name` | `string` | Sim | Nome completo do usuário |
| `email` | `string` | Sim | Endereço de e-mail do usuário |
| `image` | `string` | Sim | URL da imagem de perfil |
| `provider` | `string` | Sim | Provedor de autenticação (ex.: `google`, `github`, `credentials`) |
| `isAdmin` | `boolean` | Não | Se o usuário tem privilégios de administrador (padrão: `false`) |

### Exemplos de resposta

**Usuário OAuth (Google):**
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

**Usuário administrador (credenciais):**
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

**Usuário GitHub:**
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

### Exemplos com curl

```bash
# Obter usuário atual (autenticado)
curl -s http://localhost:3000/api/current-user \
  -H "Cookie: next-auth.session-token=<session_token>"

# Obter usuário atual (não autenticado -- retorna null)
curl -s http://localhost:3000/api/current-user
```

### Uso em TypeScript

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

// Uso
const user = await getCurrentUser();
if (user) {
  console.log(`Logado como ${user.name} (${user.provider})`);
  if (user.isAdmin) {
    console.log('Usuário tem privilégios de administrador');
  }
} else {
  console.log('Não autenticado');
}
```

### Notas de implementação

- O endpoint usa a função `auth()` de `@/lib/auth` (NextAuth.js) para ler a sessão do servidor.
- A resposta é higienizada -- apenas campos de perfil seguros são retornados. Campos sensíveis como hashes de senha, metadados internos e tokens são excluídos.
- Este endpoint sempre retorna HTTP 200, mesmo quando nenhum usuário está autenticado. O chamador distingue verificando se a resposta é `null`.
- O campo `isAdmin` assume o valor padrão `false` se não estiver definido na sessão, garantindo comportamento seguro para usuários não administradores.
