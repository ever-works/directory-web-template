---
id: use-menu-navigation-reference
title: useMenuNavigation Hook Reference
sidebar_label: useMenuNavigation
sidebar_position: 97
---

# useMenuNavigation

## Overview

`useMenuNavigation` is a generic React hook that implements keyboard navigation for dropdown menus, command palettes, and autocomplete lists. It handles arrow keys, Tab, Home/End, Enter for selection, and Escape to close. The hook supports both Tiptap editor contexts and regular DOM elements, with configurable orientation (horizontal, vertical, or both).

**Source:** `template/hooks/use-menu-navigation.ts`

## Signature

```typescript
function useMenuNavigation<T>(options: MenuNavigationOptions<T>): {
  selectedIndex: number | undefined;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
}
```

## Parameters

### `MenuNavigationOptions<T>`

| Property               | Type                              | Default        | Description                                                       |
|-----------------------|-----------------------------------|----------------|-------------------------------------------------------------------|
| `items`               | `T[]`                             | **Required**   | Array of items to navigate through                                |
| `editor`              | `Editor \| null`                  | `undefined`    | Tiptap editor instance; keyboard events are attached to `editor.view.dom` |
| `containerRef`        | `React.RefObject<HTMLElement \| null>` | `undefined` | Reference to the container element for keyboard events (used when `editor` is not provided) |
| `query`               | `string`                          | `undefined`    | Search query; when it changes, the selected index resets          |
| `onSelect`            | `(item: T) => void`               | `undefined`    | Callback fired when the user presses Enter on a selected item     |
| `onClose`             | `() => void`                      | `undefined`    | Callback fired when the user presses Escape                       |
| `orientation`         | `'horizontal' \| 'vertical' \| 'both'` | `'vertical'` | Controls which arrow keys are active                          |
| `autoSelectFirstItem` | `boolean`                         | `true`         | Whether to pre-select the first item when the menu opens          |

## Return Values

| Property          | Type                                          | Description                                               |
|------------------|-----------------------------------------------|-----------------------------------------------------------|
| `selectedIndex`  | `number \| undefined`                         | The currently selected item index, or `undefined` if the items array is empty |
| `setSelectedIndex` | `React.Dispatch<React.SetStateAction<number>>` | Manual setter for the selected index                    |

## Keyboard Bindings

The following keys are handled based on the `orientation` setting:

| Key          | Orientation Restriction | Behavior                                                |
|-------------|------------------------|---------------------------------------------------------|
| `ArrowUp`   | Not `horizontal`       | Move selection to the previous item (wraps around)      |
| `ArrowDown` | Not `horizontal`       | Move selection to the next item (wraps around)          |
| `ArrowLeft` | Not `vertical`         | Move selection to the previous item (wraps around)      |
| `ArrowRight`| Not `vertical`         | Move selection to the next item (wraps around)          |
| `Tab`       | Any                    | Move to next item; `Shift+Tab` moves to previous item  |
| `Home`      | Any                    | Jump to the first item                                  |
| `End`       | Any                    | Jump to the last item                                   |
| `Enter`     | Any                    | Call `onSelect` with the currently selected item (skipped during IME composition) |
| `Escape`    | Any                    | Call `onClose`                                          |

All handled keys call `event.preventDefault()` to avoid interfering with surrounding page behavior.

## Implementation Details

- **Event target resolution:** The hook attaches a `keydown` listener to either `editor.view.dom` (for Tiptap integration) or `containerRef.current` (for regular DOM elements). If neither is provided, no listener is attached.
- **Capture phase:** The event listener uses the capture phase (`true` as the third argument) to intercept keyboard events before they reach other handlers.
- **Wrapping navigation:** Both `moveNext` and `movePrev` use modulo arithmetic to wrap around the items array, so navigating past the last item returns to the first.
- **Query-based reset:** When the `query` prop changes, `selectedIndex` resets to `0` (or `-1` if `autoSelectFirstItem` is `false`), ensuring the selection stays relevant to filtered results.
- **IME composition guard:** The Enter key handler checks `event.isComposing` to avoid triggering selection while the user is composing characters in an input method editor.
- **Cleanup:** The effect returns a cleanup function that removes the event listener when the component unmounts or dependencies change.

## Usage Examples

### Dropdown menu with keyboard navigation

```tsx
import { useRef, useState } from 'react';
import { useMenuNavigation } from '@/hooks/use-menu-navigation';

function DropdownMenu({ items, onItemClick, onClose }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { selectedIndex } = useMenuNavigation({
    items,
    containerRef,
    onSelect: onItemClick,
    onClose,
    orientation: 'vertical',
  });

  return (
    <div ref={containerRef} role="listbox" tabIndex={0}>
      {items.map((item, index) => (
        <div
          key={item.id}
          role="option"
          aria-selected={index === selectedIndex}
          className={index === selectedIndex ? 'selected' : ''}
          onClick={() => onItemClick(item)}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}
```

### Tiptap editor slash command menu

```tsx
import { useMenuNavigation } from '@/hooks/use-menu-navigation';

function SlashCommandMenu({ editor, query, commands, onSelect, onClose }) {
  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  const { selectedIndex } = useMenuNavigation({
    editor,
    query,
    items: filteredCommands,
    onSelect,
    onClose,
    autoSelectFirstItem: true,
  });

  return (
    <div className="slash-command-menu">
      {filteredCommands.map((cmd, index) => (
        <button
          key={cmd.id}
          className={index === selectedIndex ? 'active' : ''}
          onClick={() => onSelect(cmd)}
        >
          {cmd.icon} {cmd.label}
        </button>
      ))}
    </div>
  );
}
```

### Horizontal toolbar navigation

```tsx
import { useRef } from 'react';
import { useMenuNavigation } from '@/hooks/use-menu-navigation';

function Toolbar({ tools, onToolSelect }) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  const { selectedIndex } = useMenuNavigation({
    items: tools,
    containerRef: toolbarRef,
    onSelect: onToolSelect,
    orientation: 'horizontal',
    autoSelectFirstItem: false,
  });

  return (
    <div ref={toolbarRef} role="toolbar" tabIndex={0}>
      {tools.map((tool, index) => (
        <button
          key={tool.id}
          aria-pressed={index === selectedIndex}
          onClick={() => onToolSelect(tool)}
        >
          {tool.name}
        </button>
      ))}
    </div>
  );
}
```

## Related Hooks

- [`useDebouncedSearch`](./use-debounced-search-reference.md) -- Debounced search input, often used alongside menu navigation for filtered lists.
- [`useOnClickOutside`](./use-on-click-outside-reference.md) -- Detect clicks outside a menu to close it.
