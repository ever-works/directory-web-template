---
id: editor-system-deep-dive
title: מערכת עורך טקסט עשיר Deep Dive
sidebar_label: מערכת עורך
sidebar_position: 7
---

# מערכת עורך טקסט עשיר Deep Dive

מדריך זה מכסה את מערכת עורך הטקסט העשיר המבוססת על TipTap, כולל תצורת הרחבות, צמתים מותאמים אישית, ארכיטקטורת סרגלי כלים, טיפול בתמונות וסנכרון טפסים.

## סקירה כללית של אדריכלות

```
Editor System Architecture
============================

  EditorContextProvider
  |
  +-- useEditor() hook      <-- StarterKit + extensions
  |
  +-- EditorContent          <-- TipTap EditorContent wrapper
  |   |
  |   +-- ToolbarContent     <-- Modular toolbar components
  |   |   |
  |   |   +-- HeadingDropdownMenu
  |   |   +-- ListDropdownMenu
  |   |   +-- MarkButton (bold, italic, strike, etc.)
  |   |   +-- TextAlignButton
  |   |   +-- ImageUploadButton
  |   |   +-- LinkPopover
  |   |   +-- ColorHighlightPopover
  |   |   +-- UndoRedoButton
  |   |
  |   +-- ProseMirror (content area)
  |
  +-- useEditorSync()        <-- Bidirectional form sync
  |
  +-- Custom Node Extensions
      |
      +-- ImageUploadNode
      +-- HorizontalRuleNode
```

## תצורת הרחבה

העורך מוגדר ב- `lib/editor/providers/editor-provider.tsx` עם קבוצה מקיפה של הרחבות:

```typescript
// lib/editor/providers/editor-provider.tsx
const extensions = useMemo(() => [
  StarterKit.configure({
    horizontalRule: false,
    link: {
      openOnClick: false,
      enableClickSelection: true,
    },
  }),
  HorizontalRule,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  ImageUploadNode.configure({
    accept: 'image/*',
    maxSize: MAX_FILE_SIZE,   // 5MB
    limit: 3,
    upload: handleImageUpload,
    onError: (error) => console.error('Upload failed:', error),
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Highlight.configure({ multicolor: true }),
  Image,
  Typography,
  Superscript,
  Subscript,
  Selection,
], []);
```

### הפניה להרחבה

| הרחבה | מקור | מטרה |
|--------|--------|--------|
| `StarterKit` | `@tiptap/starter-kit` | בסיס: פסקאות, כותרות, רשימות, קוד, מודגש, נטוי |
| `HorizontalRule` | `@tiptap/extension-horizontal-rule` | חוצצי קו אופקיים |
| `TextAlign` | `@tiptap/extension-text-align` | שמאל, מרכז, ימין, יישור יישור |
| `ImageUploadNode` | מותאם אישית | העלאת תמונה עם התקדמות גרור ושחרר |
| `TaskList` / `TaskItem` | `@tiptap/extension-list` | רשימות משימות תיבת סימון (מקוננות) |
| `Highlight` | `@tiptap/extension-highlight` | הדגשת טקסט רב צבעים |
| `Image` | `@tiptap/extension-image` | תצוגת תמונה מוטבעת |
| `Typography` | `@tiptap/extension-typography` | ציטוטים חכמים, מקפים, אליפסיס |
| `Superscript` | `@tiptap/extension-superscript` | טקסט עילי |
| `Subscript` | `@tiptap/extension-subscript` | טקסט מנוי |
| `Selection` | `@tiptap/extensions` | טיפול משופר בבחירה |

## ספק עורך

מופע העורך נוצר באמצעות הקשר React לגישה לכל האפליקציה:

```typescript
// lib/editor/providers/editor-provider.tsx
export const EditorContext = createContext<Editor | null>(null);

export function EditorContextProvider({ children }) {
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        autocomplete: 'on',
        autocorrect: 'on',
        autocapitalize: 'off',
        'aria-label': 'Main content area, start typing to enter text.',
        class: cn('min-h-96'),
      },
    },
    extensions,
  });

  return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>;
}
```

### מיטוב ביצועים

- ** `immediatelyRender: false` **: מונע אי התאמה של הידרציה ב-SSR.
- ** `shouldRerenderOnTransaction: false` **: מפחית עיבוד מחדש של React בכל הקשה. רק שינויים במצב סרגל הכלים מפעילים עיבוד מחדש.

## ווים מותאמים אישית

### `useTiptapEditor` מספק גישה למופע העורך מהקשר או ישירות:

```typescript
// lib/editor/hooks/use-tiptap-editor.ts
export function useTiptapEditor(providedEditor?: Editor | null) {
  const { editor: coreEditor } = useCurrentEditor();
  const mainEditor = useMemo(
    () => providedEditor || coreEditor,
    [providedEditor, coreEditor]
  );

  const editorState = useEditorState({
    editor: mainEditor,
    selector(context) {
      return {
        editor: context.editor,
        editorState: context.editor?.state,
        canCommand: context.editor?.can,
      };
    },
  });

  return editorState || { editor: null };
}
```

### `useEditor` הוק פשוט מבוסס הקשר:

```typescript
// lib/editor/hooks/use-editor.ts
export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error("useEditor must be used within a EditorProvider");
  }
  return context;
}
```

## צומת העלאת תמונה

ה- `ImageUploadNode` הוא תוסף TipTap מותאם אישית להעלאת תמונות בגרירה ושחרור:

```typescript
// lib/editor/components/node/image-upload-node/image-upload-node-extension.ts
export const ImageUploadNode = Node.create<ImageUploadNodeOptions>({
  name: "imageUpload",
  group: "block",
  draggable: true,
  atom: true,

  addOptions() {
    return {
      type: "image",
      accept: "image/*",
      limit: 1,
      maxSize: 0,         // 0 = unlimited
      upload: undefined,
      onError: undefined,
      onSuccess: undefined,
      HTMLAttributes: {},
    };
  },
});
```

### ממשק פונקציית העלאה

```typescript
export type UploadFunction = (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
) => Promise<string>;  // Returns the URL of the uploaded image
```

### מטפל להעלאת תמונה

מטפל ברירת המחדל ב- `lib/editor/utils/utils.ts` :

```typescript
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const handleImageUpload = async (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  if (!file) throw new Error("No file provided");
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum (${MAX_FILE_SIZE / (1024 * 1024)}MB)`);
  }

  // Replace with your upload implementation
  // e.g., upload to S3, Cloudflare R2, or your API
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/upload', { method: 'POST', body: formData });
  const { url } = await response.json();
  return url;
};
```

### קיצורי מקלדת

צומת העלאת התמונה רושם טיפול במפתחות:

```typescript
addKeyboardShortcuts() {
  return {
    Enter: ({ editor }) => {
      const { selection } = editor.state;
      const { nodeAfter } = selection.$from;
      if (nodeAfter?.type.name === "imageUpload" && editor.isActive("imageUpload")) {
        // Trigger file picker
        const nodeEl = editor.view.nodeDOM(selection.$from.pos);
        nodeEl?.firstChild?.click();
        return true;
      }
      return false;
    },
  };
}
```

## תצורת סרגל הכלים

סרגל הכלים מוגדר ב- `lib/editor/contents/toolbar-content.tsx` כרכיב מודולרי:

```typescript
// lib/editor/contents/toolbar-content.tsx
export const ToolbarContent = React.memo(({ editor }) => (
  <>
    <ToolbarGroup>
      <UndoRedoButton action="undo" editor={editor} />
      <UndoRedoButton action="redo" editor={editor} />
    </ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup>
      <HeadingDropdownMenu levels={[1, 2, 3, 4]} editor={editor} />
      <ListDropdownMenu types={['bulletList', 'orderedList', 'taskList']} editor={editor} />
      <BlockquoteButton editor={editor} />
      <CodeBlockButton editor={editor} />
    </ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup>
      <MarkButton type="bold" editor={editor} />
      <MarkButton type="italic" editor={editor} />
      <MarkButton type="strike" editor={editor} />
      <MarkButton type="code" editor={editor} />
      <MarkButton type="underline" editor={editor} />
      <ColorHighlightPopover editor={editor} />
      <LinkPopover editor={editor} />
    </ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup>
      <TextAlignButton align="left" editor={editor} />
      <TextAlignButton align="center" editor={editor} />
      <TextAlignButton align="right" editor={editor} />
      <TextAlignButton align="justify" editor={editor} />
    </ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup>
      <ImageUploadButton text="Add" editor={editor} />
    </ToolbarGroup>
  </>
));
```

## סנכרון נתוני טופס

### `useEditorSync` הוק

סנכרון דו-כיווני בין העורך למצב הטופס:

```typescript
// lib/editor/hooks/use-editor-sync.ts
export function useEditorSync({
  editor, content, onContentChange, fieldName, enableLogging
}: UseEditorSyncOptions) {

  // Form -> Editor (initial load / reset)
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getHTML();
      if (currentContent !== content && (!currentContent.trim() || currentContent === '<p></p>')) {
        editor.commands.setContent(content || '');
      }
    }
  }, [editor, content]);

  // Editor -> Form (on change)
  useEffect(() => {
    if (!editor) return;
    const updateContent = () => onContentChange(editor.getHTML());
    editor.on('update', updateContent);
    editor.on('blur', updateContent);
    return () => {
      editor.off('update', updateContent);
      editor.off('blur', updateContent);
    };
  }, [editor, onContentChange]);
}
```

### `useEditorFieldSync` וו נוחות

לשילוב ישיר עם נתוני טופס מבוססי `useState` :

```typescript
// Usage in a form component
useEditorFieldSync(editor, formData, 'description', setFormData);
```

## פונקציות שירות

### אימות סכימה

```typescript
import { isMarkInSchema, isNodeInSchema, isExtensionAvailable } from '@/lib/editor/utils';

// Check if a mark exists before toggling
if (isMarkInSchema('highlight', editor)) {
  editor.chain().focus().toggleHighlight().run();
}

// Check if a node type is available
if (isNodeInSchema('taskList', editor)) {
  editor.chain().focus().toggleTaskList().run();
}

// Check extension availability (logs warning if not found)
if (isExtensionAvailable(editor, ['imageUpload', 'image'])) {
  editor.commands.setImageUploadNode();
}
```

### חיטוי כתובות אתרים

```typescript
import { sanitizeUrl, isAllowedUri } from '@/lib/editor/utils';

// Validate link URLs before inserting
const safeUrl = sanitizeUrl(userInput, window.location.href);
// Returns the URL if safe, or "#" if not
```

## שיקולי ביצועים

1. ** `React.memo` ב-ToolbarContent**: מונע עיבוד מחדש של סרגל הכלים כאשר מצב לא קשור משתנה.
2. ** `shouldRerenderOnTransaction: false` **: רק שינויי מצב חיוניים מפעילים עיבוד מחדש של React.
3. ** `useMemo` עבור הרחבות**: מערך ההרחבות מחושב פעם אחת ועושה שימוש חוזר.
4. **סנכרון מבוסס אירועים**: הסנכרון של עורך לטופס משתמש באירועי TipTap ( `update` , `blur` ) במקום סקר.
5. ** `MAX_FILE_SIZE` אימות**: בדיקת גודל הקובץ בצד הלקוח מונעת ניסיונות העלאה מיותרים.

## פתרון בעיות

### העורך לא מעבד

1. ודא ש- `EditorContextProvider` עוטף את עץ הרכיבים.
2. בדוק ש- `immediatelyRender: false` מוגדר (נדרש עבור SSR).
3. ודא שכל התלות של TipTap מותקנים.

### נתוני הטופס אינם מסתנכרנים

1. ודא `useEditorSync` או `useEditorFieldSync` נקראים עם הפרמטרים הנכונים.
2. בדוק שמופע העורך אינו null כאשר ה-hook פועל.
3. ודא ש- `onContentChange` מעדכן נכון את מצב הטופס.

### העלאת התמונה נכשלה

1. בדוק שמטפל ההעלאה מחזיר מחרוזת URL חוקית.
2. ודא ש- `MAX_FILE_SIZE` מתאים למגבלות בצד השרת שלך.
3. בדוק את מסוף הדפדפן עבור שגיאות CORS אם אתה מעלה לדומיין אחר.

## תיעוד קשור

- [API Client Architecture](./api-client-architecture.md)
- [דפוסי שחזור שגיאות](./error-recovery-patterns.md)
- [Caching Architecture Deep Dive](./caching-deep-dive.md)
