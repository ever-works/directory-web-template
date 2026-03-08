---
id: navigation-hooks
title: Navigation & Menu Hooks
sidebar_label: Navigation & Menu Hooks
sidebar_position: 13
---

# Navigation & Menu Hooks

Hooks for keyboard-driven menu navigation, profile menu management, home page item logic, and success page feature mapping.

## useMenuNavigation

Implements keyboard navigation for dropdown menus and command palettes. Supports arrow keys, Tab, Home/End, Enter for selection, and Escape to close. Compatible with both Tiptap editors and regular DOM containers.

```
useMenuNavigation<T>(options: MenuNavigationOptions<T>): {
  selectedIndex: number | undefined;
  setSelectedIndex: Dispatch<SetStateAction<number>>;
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `items` | `T[]` | -- | Array of items to navigate through (required) |
| `editor` | `Editor \| null` | -- | Tiptap editor instance (for editor-integrated menus) |
| `containerRef` | `RefObject<HTMLElement>` | -- | Container element for keyboard event handling |
| `query` | `string` | -- | Search query; resets selection when it changes |
| `onSelect` | `(item: T) => void` | -- | Callback when Enter is pressed on an item |
| `onClose` | `() => void` | -- | Callback when Escape is pressed |
| `orientation` | `'horizontal' \| 'vertical' \| 'both'` | `"vertical"` | Navigation direction |
| `autoSelectFirstItem` | `boolean` | `true` | Auto-select the first item on open |

### Keyboard Bindings

| Key | Action |
|-----|--------|
| `ArrowUp` / `ArrowDown` | Navigate vertically (when orientation allows) |
| `ArrowLeft` / `ArrowRight` | Navigate horizontally (when orientation allows) |
| `Tab` / `Shift+Tab` | Move forward/backward through items |
| `Home` / `End` | Jump to first/last item |
| `Enter` | Select the current item |
| `Escape` | Close the menu |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `selectedIndex` | `number \| undefined` | Currently highlighted item index; `undefined` if no items |
| `setSelectedIndex` | `Dispatch` | Manually set the selected index |

```tsx
import { useMenuNavigation } from '@/hooks/use-menu-navigation';

function CommandPalette({ items, onSelect, onClose }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const { selectedIndex } = useMenuNavigation({
    items: filtered,
    containerRef,
    query,
    onSelect,
    onClose,
    orientation: 'vertical',
  });

  return (
    <div ref={containerRef} tabIndex={0}>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>
        {filtered.map((item, index) => (
          <li
            key={item.id}
            className={index === selectedIndex ? 'bg-blue-100' : ''}
            onClick={() => onSelect(item)}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## useProfileMenu

Manages the profile dropdown menu state with click-outside detection, Escape key handling, and focus management.

```
useProfileMenu(): UseProfileMenuReturn
```

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `isProfileMenuOpen` | `boolean` | Whether the profile menu is open |
| `menuRef` | `RefObject<HTMLDivElement>` | Ref for the menu container |
| `buttonRef` | `RefObject<HTMLButtonElement>` | Ref for the trigger button |
| `toggleMenu` | `() => void` | Toggle the menu open/closed |
| `closeMenu` | `() => void` | Close the menu and restore focus to trigger |

### Behavior

- Closes when clicking outside both the menu and trigger button
- Closes on Escape key press
- Restores focus to the trigger button when closing
- Event listeners are only attached while the menu is open

```tsx
import { useProfileMenu } from '@/hooks/use-profile-menu';

function ProfileDropdown() {
  const { isProfileMenuOpen, menuRef, buttonRef, toggleMenu, closeMenu } =
    useProfileMenu();

  return (
    <div className="relative">
      <button ref={buttonRef} onClick={toggleMenu} aria-expanded={isProfileMenuOpen}>
        <Avatar />
      </button>

      {isProfileMenuOpen && (
        <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white shadow-lg">
          <a href="/profile" onClick={closeMenu}>Profile</a>
          <a href="/settings" onClick={closeMenu}>Settings</a>
          <button onClick={closeMenu}>Sign Out</button>
        </div>
      )}
    </div>
  );
}
```

---

## useHomeTwoLogic

Filters and paginates items for the "Home Two" layout variant. Supports multi-category filtering.

```
useHomeTwoLogic(props: UseHome2LogicProps): {
  items: ItemData[];
  paginatedItems: ItemData[];
}
```

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `items` | `ItemData[]` | Full array of items to filter |
| `start` | `number` | Starting index for pagination (offset-based) |
| `selectedCategories` | `string[]` | Category IDs to filter by (empty = show all) |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `items` | `ItemData[]` | All items matching the category filter |
| `paginatedItems` | `ItemData[]` | Filtered items sliced by `start` and `PER_PAGE` |

### Category Matching

The hook supports items with categories in multiple formats:
- String categories: `item.category === "AI Tools"`
- Array of strings: `item.category.includes("AI Tools")`
- Array of objects: `item.category.some(c => c.id === "ai-tools")`

```tsx
import { useHomeTwoLogic } from '@/hooks/use-home-two-logic';

function HomePageTwo({ allItems }) {
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  const { items: filtered, paginatedItems } = useHomeTwoLogic({
    items: allItems,
    start: page * PER_PAGE,
    selectedCategories: categories,
  });

  return (
    <div>
      <CategoryFilter
        selected={categories}
        onChange={setCategories}
      />
      <p>{filtered.length} items found</p>
      <ItemGrid items={paginatedItems} />
      <Pagination total={filtered.length} page={page} onChange={setPage} />
    </div>
  );
}
```

### Helper: getTagId

Exported utility function that normalizes tag values:

```
getTagId(tag: string | Tag): string
```

Returns the tag string directly if it is a string, or `tag.id` if it is a `Tag` object.

---

## useSuccessPageFeatures

Maps payment plan features to icons and colors for rendering on success/confirmation pages. Reads feature text from `usePricingFeatures` and assigns appropriate Lucide icons.

```
useSuccessPageFeatures(): {
  getPlanFeaturesWithIcons: (planType: PaymentPlan) => SuccessPageFeature[];
}
```

### SuccessPageFeature Shape

| Field | Type | Description |
|-------|------|-------------|
| `icon` | `LucideIcon` | Lucide icon component for the feature |
| `text` | `string` | Feature description text (from pricing features) |
| `color` | `string` | Tailwind color class (e.g., `"text-blue-400"`) |

### Supported Plans

| Plan | Icon Count | Example Icons |
|------|------------|---------------|
| `FREE` | Up to 8 | FileText, ImageIcon, Globe, Eye, Clock, Mail |
| `STANDARD` | Up to 9 | FileText, ImageIcon, Shield, Zap, Share2, BarChart3 |
| `PREMIUM` | Up to 11 | TrendingUp, Star, Shield, Video, Globe, BarChart3, Phone |

```tsx
import { useSuccessPageFeatures } from '@/hooks/use-success-page-features';
import { PaymentPlan } from '@/lib/constants';

function SuccessPage({ plan }) {
  const { getPlanFeaturesWithIcons } = useSuccessPageFeatures();
  const features = getPlanFeaturesWithIcons(plan);

  return (
    <div>
      <h2>Your plan includes:</h2>
      <ul>
        {features.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <li key={i} className="flex items-center gap-2">
              <Icon className={`w-5 h-5 ${feature.color}`} />
              <span>{feature.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

---

## Summary Table

| Hook | Purpose | Source File |
|------|---------|-------------|
| `useMenuNavigation` | Keyboard navigation for menus/palettes | `use-menu-navigation.ts` |
| `useProfileMenu` | Profile dropdown state management | `use-profile-menu.ts` |
| `useHomeTwoLogic` | Category filtering and pagination for Home Two | `use-home-two-logic.ts` |
| `useSuccessPageFeatures` | Plan features with icons for success pages | `use-success-page-features.ts` |
