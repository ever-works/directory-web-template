---
id: best-practices
title: Bonnes pratiques
sidebar_label: Bonnes pratiques
sidebar_position: 4
---

# Bonnes pratiques

Apprenez les normes de codage, les modèles et les bonnes pratiques utilisés dans Ever Works.

## Objectifs

À la fin de ce module, vous serez capable de :

- Comprendre les bonnes pratiques TypeScript
- Suivre les modèles React et les techniques d'optimisation
- Appliquer les bonnes pratiques de base de données
- Mettre en œuvre les directives de sécurité
- Optimiser les performances
- Écrire du code propre et maintenable

**Durée estimée** : 1-2 jours

---

## Bonnes pratiques TypeScript

### Utiliser des types explicites

```typescript
// ❌ Éviter les types implicites (any)
function processData(data) {
  return data.map(item => item.value);
}

// ✅ Utiliser des types explicites
function processData(data: Array<{ value: number }>): number[] {
  return data.map(item => item.value);
}
```

### Éviter `any`

```typescript
// ❌ Ne pas utiliser any
const fetchData = async (): Promise<any> => {
  // ...
};

// ✅ Définir des types appropriés
interface UserData {
  id: string;
  name: string;
  email: string;
}

const fetchData = async (): Promise<UserData> => {
  // ...
};
```

### Utiliser les type guards

```typescript
// ✅ Type guards pour la sécurité à l'exécution
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj
  );
}

if (isUser(data)) {
  // TypeScript sait que data est un User ici
  console.log(data.email);
}
```

---

## Bonnes pratiques React

### Préférer les composants fonctionnels

```typescript
// ✅ Composant fonctionnel avec types explicites
interface ItemCardProps {
  item: Item;
  onSelect: (id: string) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onSelect }) => {
  return (
    <div onClick={() => onSelect(item.id)}>
      <h3>{item.title}</h3>
    </div>
  );
};
```

### Mémoïser prudemment

```typescript
// ✅ Mémoïser les composants coûteux en rendu
const ExpensiveList = React.memo(({ items }: { items: Item[] }) => {
  return (
    <ul>
      {items.map(item => <li key={item.id}>{item.title}</li>)}
    </ul>
  );
});

// ✅ Mémoïser les callbacks passés aux composants enfants
const handleSelect = useCallback((id: string) => {
  setSelectedId(id);
}, []);
```

### Séparer la logique métier des composants

```typescript
// ❌ Logique métier dans le composant
const ItemList = () => {
  const [items, setItems] = useState([]);
  
  useEffect(() => {
    fetch('/api/items')
      .then(res => res.json())
      .then(data => setItems(data));
  }, []);
  
  // ...
};

// ✅ Logique extraite dans un service et un hook
const ItemList = () => {
  const { items, isLoading } = useItems();
  // ...
};
```

---

## Bonnes pratiques de base de données

### Utiliser les requêtes paramétrées (anti-injection SQL)

```typescript
// ❌ Concaténation de chaînes (vulnérable à l'injection SQL)
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// ✅ Requêtes paramétrées avec Drizzle ORM
const user = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
```

### Optimiser avec des index

```typescript
// Dans le schéma Drizzle
export const items = pgTable('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  categoryId: uuid('category_id').references(() => categories.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  slugIdx: index('items_slug_idx').on(table.slug),
  categoryIdx: index('items_category_idx').on(table.categoryId),
}));
```

### Utiliser des transactions pour les opérations atomiques

```typescript
// ✅ Transaction pour garantir la cohérence des données
await db.transaction(async (tx) => {
  await tx.insert(subscriptions).values(newSubscription);
  await tx.update(users)
    .set({ subscriptionStatus: 'active' })
    .where(eq(users.id, userId));
});
```

---

## Directives de sécurité

### Validation des entrées avec Zod

```typescript
import { z } from 'zod';

const createItemSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  categoryId: z.string().uuid(),
  price: z.number().positive().optional(),
});

// Dans le gestionnaire API
const result = createItemSchema.safeParse(await request.json());
if (!result.success) {
  return NextResponse.json(
    { error: result.error.flatten() },
    { status: 400 }
  );
}
```

### Vérification des autorisations

```typescript
// ✅ Toujours vérifier les autorisations côté serveur
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  
  // Vérifier que l'utilisateur est propriétaire de la ressource
  const item = await itemRepository.findById(params.id);
  if (item.userId !== session.user.id && !session.user.isAdmin) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 });
  }
  
  await itemRepository.delete(params.id);
  return NextResponse.json({ success: true });
}
```

---

## Bonnes pratiques de performance

### Utiliser le rendu côté serveur quand approprié

```typescript
// ✅ Composant serveur pour les données initiales (pas d'état côté client requis)
const ItemPage = async ({ params }: { params: { slug: string } }) => {
  const item = await itemRepository.findBySlug(params.slug);
  
  return <ItemDetail item={item} />;
};
```

### Paginer les grandes listes

```typescript
// ✅ Toujours paginer les requêtes potentiellement grandes
const items = await db
  .select()
  .from(itemsTable)
  .where(eq(itemsTable.categoryId, categoryId))
  .orderBy(desc(itemsTable.createdAt))
  .limit(PAGE_SIZE)
  .offset((page - 1) * PAGE_SIZE);
```

---

## Ressources supplémentaires

- [Guide TypeScript officiel](https://www.typescriptlang.org/docs/)
- [Bonnes pratiques React](https://react.dev/learn/thinking-in-react)
- [Sécurité OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Documentation Drizzle ORM](https://orm.drizzle.team/docs/overview)
