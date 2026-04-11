---
id: best-practices
title: Melhores Práticas
sidebar_label: Melhores Práticas
sidebar_position: 4
---

# Melhores Práticas

Aprenda os padrões de codificação, padrões e melhores práticas usados no Ever Works.

## 🎯 Objetivos

- ✅ Entender as melhores práticas de TypeScript
- ✅ Seguir padrões React e técnicas de otimização
- ✅ Aplicar melhores práticas de banco de dados
- ✅ Implementar diretrizes de segurança
- ✅ Otimizar para desempenho
- ✅ Escrever código limpo e manutenível

**Tempo estimado**: 1–2 dias

---

## Melhores Práticas TypeScript

### Use Tipos Explícitos

```typescript
// ❌ Evite any implícito
function processData(data) {
  return data.map(item => item.value);
}

// ✅ Use tipos explícitos
function processData(data: Array<{ value: number }>): number[] {
  return data.map(item => item.value);
}
```

### Use Type Guards

```typescript
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj
  );
}
```

[Saiba mais sobre TypeScript →](https://www.typescriptlang.org/docs/)

---

## Melhores Práticas React

### Use Memoização

```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
```

### Crie Hooks Personalizados

```typescript
function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  return { user, loading, error };
}
```

[Saiba mais sobre React →](/architecture/tech-stack#frontend)

---

## Melhores Práticas de Banco de Dados

### Use Transações

```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values(newUser);
  await tx.insert(profiles).values(newProfile);
  await tx.insert(settings).values(defaultSettings);
});
```

### Adicione Índices Apropriados

```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
}));
```

[Saiba mais sobre Drizzle ORM →](https://orm.drizzle.team)

---

## Melhores Práticas de Segurança

### Valide Todas as Entradas

```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const result = schema.safeParse(req.body);
if (!result.success) {
  return NextResponse.json(
    { error: 'Validation failed', details: result.error },
    { status: 400 }
  );
}
```

### Implemente Rate Limiting

```typescript
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const identifier = request.ip ?? 'anonymous';
  const { success } = await rateLimit.limit(identifier);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
}
```

[Saiba mais sobre segurança →](/deployment/production-checklist#security)

---

## Otimização de Desempenho

### Code Splitting

```typescript
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false,
});
```

### Otimização de Imagens

```typescript
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Imagem principal"
  width={1200}
  height={600}
  priority
  placeholder="blur"
/>
```
