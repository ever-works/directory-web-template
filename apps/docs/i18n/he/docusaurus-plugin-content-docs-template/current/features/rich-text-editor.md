---
id: rich-text-editor
title: עורך טקסט עשיר
sidebar_label: עורך טקסט עשיר
sidebar_position: 12
---

# עורך טקסט עשיר

תבנית Ever Works כוללת עורך טקסט עשיר משולב במלואו המופעל על ידי [TipTap](https://tiptap.dev/), מסגרת עורך חסרת ראש שנבנתה על גבי ProseMirror. העורך תומך בעיצוב תוכן, העלאת תמונות, רשימות משימות וסנכרון דו-כיווני עם נתוני טופס.

## סקירה כללית של אדריכלות

מערכת העורך מאורגנת במבנה מודולרי תחת `lib/editor/` :

| מדריך / קובץ | מטרה |
|---|---|
| `providers/editor-provider.tsx` | ספק ההקשר של React מאתחל את עורך TipTap עם כל ההרחבות |
| `hooks/use-tiptap-editor.ts` | הוק לגישה למופע העורך מהקשר או תמיכה ישירה |
| `hooks/use-editor.ts` | הוק צרכני בהקשר פשוט |
| `hooks/use-editor-sync.ts` | סנכרון דו-כיווני בין עורך למצב טופס |
| `contents/editor-content.tsx` | רכיב עטיפה לעיבוד אזור תוכן העורך |
| `contents/use-editor-toolbar.ts` | הוק לניהול מצב סרגל הכלים (נייד/שולחן עבודה, תצוגות) |

## TipTap הרחבות

העורך מוגדר עם קבוצה מקיפה של הרחבות דרך `EditorContextProvider` :

```tsx
// lib/editor/providers/editor-provider.tsx
const extensions = useMemo(() => [
  StarterKit?.configure({
    horizontalRule: false,
    link: { openOnClick: false, enableClickSelection: true }
  }),
  HorizontalRule,
  TextAlign?.configure({ types: ['heading', 'paragraph'] }),
  ImageUploadNode?.configure({
    accept: 'image/*',
    maxSize: MAX_FILE_SIZE,
    limit: 3,
    upload: handleImageUpload,
    onError: (error) => console.error('Upload failed:', error)
  }),
  TaskList,
  TaskItem?.configure({ nested: true }),
  Highlight?.configure({ multicolor: true }),
  Image,
  Typography,
  Superscript,
  Subscript,
  Selection
], []);
```

### הפניה להרחבה

| הרחבה | תיאור |
|---|---|
| `StarterKit` | עיצוב ליבה: מודגש, נטוי, כותרות, רשימות, ציטוטים, בלוקי קוד, קישורים |
| `HorizontalRule` | הכנסת כלל אופקי מותאם אישית |
| `TextAlign` | יישור טקסט (שמאל, מרכז, ימין, יישור) עבור כותרות ופסקאות |
| `ImageUploadNode` | העלאת תמונה בגרור ושחרר עם מגבלות גודל והגבלות על ספירת קבצים |
| `TaskList` / `TaskItem` | רשימות משימות/תיבת סימון אינטראקטיביות עם תמיכה מקוננת |
| `Highlight` | הדגשת טקסט עם תמיכה מרובת צבעים |
| `Image` | הטמעת תמונה רגילה באמצעות `@tiptap/extension-image` |
| `Typography` | החלפות טיפוגרפיות אוטומטיות (מרכאות חכמות, מקפים) |
| `Superscript` / `Subscript` | עיצוב טקסט עילי ותחתית |
| `Selection` | טיפול משופר בבחירה |

## ספק הקשר של עורך

אתחול העורך דרך ספק הקשר של React. עטוף את עץ הרכיבים שלך עם `EditorContextProvider` כדי להפוך את העורך לזמין:

```tsx
import { EditorContextProvider } from '@/lib/editor/providers';

function MyPage() {
  return (
    <EditorContextProvider>
      <MyEditorComponent />
    </EditorContextProvider>
  );
}
```

הספק יוצר את העורך עם התצורה הבאה:

- ** `immediatelyRender: false` ** -- מונע חוסר התאמה של הידרציה של SSR
- ** `shouldRerenderOnTransaction: false` ** -- אופטימיזציה של ביצועים להפחתת עיבוד מחדש מיותר
- **תכונות נגישות** - תוויות השלמה אוטומטית, תיקון אוטומטי ותוויות ARIA מוגדרות
- **גובה מינימלי** -- `min-h-96` מבטיח אזור עריכה שמיש

## גישה למופע העורך

### באמצעות `useTiptapEditor` ה-hook העיקרי לגישה לעורך תומך הן בהזרקה ישירה והן בהקשר חוזר:

```tsx
import { useTiptapEditor } from '@/lib/editor/hooks/use-tiptap-editor';

function MyToolbar({ editor: externalEditor }) {
  const { editor, editorState, canCommand } = useTiptapEditor(externalEditor);

  if (!editor) return null;

  return (
    <div>
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!canCommand?.().toggleBold()}
      >
        Bold
      </button>
    </div>
  );
}
```

### באמצעות `useEditor` קרס פשוט יותר שמצריך בהחלט להיות בתוך `EditorContextProvider` :

```tsx
import { useEditor } from '@/lib/editor/hooks/use-editor';

function EditorStatus() {
  const editor = useEditor();
  // Throws if not inside EditorContextProvider
  return <span>{editor?.isFocused ? 'Editing' : 'Idle'}</span>;
}
```

## סנכרון תוכן

הוו `useEditorSync` מטפל בסנכרון דו-כיווני בין עורך TipTap ומצב הטופס. זה חיוני לשילוב העורך בטפסים המנוהלים על ידי מצב React או ספריות טפסים.

### סנכרון בסיסי

```tsx
import { useEditorSync } from '@/lib/editor/hooks/use-editor-sync';

function DescriptionEditor({ editor }) {
  const [content, setContent] = useState('');

  useEditorSync({
    editor,
    content,
    onContentChange: setContent,
    fieldName: 'description',
    enableLogging: false
  });

  return <EditorContent editor={editor} />;
}
```

### סנכרון שדות טופס

עבור טפסים עם מספר שדות, `useEditorFieldSync` מספק קיצור:

```tsx
import { useEditorFieldSync } from '@/lib/editor/hooks/use-editor-sync';

function ItemForm({ editor }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    notes: ''
  });

  // Synchronizes formData.description with the editor
  useEditorFieldSync(editor, formData, 'description', setFormData);

  return <EditorContent editor={editor} />;
}
```

### התנהגות סנכרון

| כיוון | טריגר | מצב |
|---|---|---|
| טופס לעורך | `content` שינויים באביזרי | רק כאשר העורך ריק או התוכן שונה באופן משמעותי |
| עורך טופס | אירועים `update` ו `blur` | מפיץ תמיד את ה-HTML הנוכחי לטופס התקשרות חוזרת |

ה-hook נמנע מלולאות עדכון אינסופיות על ידי בדיקה אם תוכן העורך ריק או שונה מהותית לפני ההחלפה.

## רכיב תוכן של עורך

העטיפה `EditorContent` מטפלת בגלישת מילים ובסגנון ProseMirror:

```tsx
import { EditorContent } from '@/lib/editor/contents/editor-content';

function MyEditor({ editor }) {
  return (
    <EditorContent
      editor={editor}
      toolbar={<MyToolbar editor={editor} />}
      className="prose dark:prose-invert"
      onPaste={handlePaste}
      onDrop={handleDrop}
    />
  );
}
```

הרכיב מחיל כללי CSS עבור גלישת טקסט נכונה:
- `break-words` על מיכל ProseMirror
- `whitespace-pre-wrap` לשמירה על רווח לבן
- `overflow-wrap-anywhere` למניעת גלישה אופקית

## ניהול סרגל כלים

ה- `useEditorToolbar` הוק מנהל את מצב סרגל הכלים כולל היענות לנייד:

```tsx
import { useEditorToolbar } from '@/lib/editor/contents/use-editor-toolbar';

function Toolbar({ editor }) {
  const { rect, toolbarRef, isMobile, mobileView, setMobileView } = useEditorToolbar(editor);

  return (
    <div ref={toolbarRef}>
      {isMobile ? (
        <MobileToolbar view={mobileView} onViewChange={setMobileView} />
      ) : (
        <DesktopToolbar />
      )}
    </div>
  );
}
```

סרגל הכלים תומך בשלושה מצבי תצוגה ניידים: `"main"` , `"highlighter"` ו- `"link"` .

## העלאת תמונה

העורך תומך בהעלאת תמונות דרך ההרחבה `ImageUploadNode` :

| הגדרה | ערך |
|---|---|
| סוגים מקובלים | `image/*` |
| גודל קובץ מקסימלי | מוגדר על ידי קבוע `MAX_FILE_SIZE` |
| מקסימום תמונות להעלאה | 3 |
| מטפל בהעלאה | `handleImageUpload` פונקציית השירות |

ניתן להעלות תמונות באמצעות גרירה ושחרור או כפתור העלאת סרגל הכלים.

## קבצי מפתח

| קובץ | נתיב |
|---|---|
| ספק עורך | `lib/editor/providers/editor-provider.tsx` |
| TipTap Editor Hook | `lib/editor/hooks/use-tiptap-editor.ts` |
| עורך סינכרון הוק | `lib/editor/hooks/use-editor-sync.ts` |
| תוכן עורך | `lib/editor/contents/editor-content.tsx` |
| וו סרגל הכלים | `lib/editor/contents/use-editor-toolbar.ts` |
| עורך הקשר Hook | `lib/editor/hooks/use-editor.ts` |
