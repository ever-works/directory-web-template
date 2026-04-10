---
id: best-practices
title: 最佳实践
sidebar_label: 最佳实践
sidebar_position: 4
---

# 最佳实践

学习 Ever Works 中使用的代码编写标准、模式和最佳实践。

## 🎯 学习目标

- ✅ 理解 TypeScript 最佳实践
- ✅ 遵循 React 模式和优化方法
- ✅ 应用数据库最佳实践
- ✅ 实施安全建议
- ✅ 优化性能
- ✅ 编写简洁可维护的代码

**预计时间**：1–2 天

---

## TypeScript 最佳实践

### 使用显式类型

```typescript
// ❌ 避免隐式 any
function processData(data) {
  return data.map(item => item.value);
}

// ✅ 使用显式类型
function processData(data: Array<{ value: number }>): number[] {
  return data.map(item => item.value);
}
```

### 使用类型守卫

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

[了解更多 TypeScript →](https://www.typescriptlang.org/docs/)

---

## React 最佳实践

### 使用记忆化

```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
```

### 创建自定义 Hooks

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

[了解更多 React →](/architecture/tech-stack#frontend)

---

## 数据库最佳实践

### 使用事务

```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values(newUser);
  await tx.insert(profiles).values(newProfile);
  await tx.insert(settings).values(defaultSettings);
});
```

### 添加适当的索引

```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
}));
```

[了解更多 Drizzle ORM →](https://orm.drizzle.team)

---

## 安全最佳实践

### 验证所有输入

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

### 实施速率限制

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

[了解更多安全知识 →](/deployment/production-checklist#security)

---

## 性能优化

### 代码分割

```typescript
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false,
});
```

### 图片优化

```typescript
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="主图"
  width={1200}
  height={600}
  priority
  placeholder="blur"
/>
```
