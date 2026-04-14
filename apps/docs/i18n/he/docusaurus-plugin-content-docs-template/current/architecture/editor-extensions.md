---
id: editor-extensions
title: "הרחבות עורך"
sidebar_label: "הרחבות עורך"
sidebar_position: 49
---

# הרחבות עורך

## סקירה כללית

מודול הרחבות עורך מספק ייצוא חבית מרכזי של הרחבות עורך TipTap המשמשות בעורך הטקסט העשיר של היישום. הוא מאגד תוספי עיצוב, מבניים ואינטראקציה מהמערכת האקולוגית של TipTap לנקודת ייבוא ​​אחת, מה שמבטיח יכולות עורך עקביות בכל מופעי העורך באפליקציה.

## אדריכלות

המודול (`lib/editor/extensions/index.tsx`) פועל כצובר ייצוא מחדש המייבא הרחבות טיפטאפ בודדות ומייצא אותן כסט מאוחד. דפוס זה מאפשר למופעי עורך לייבא את כל ההרחבות הנדרשות ממיקום אחד במקום לפזר יבוא תלות של TipTap על פני רכיבים.

```
lib/editor/extensions/
  |-- index.tsx
      |-- TaskItem, TaskList     (from @tiptap/extension-list)
      |-- TextAlign              (from @tiptap/extension-text-align)
      |-- HorizontalRule         (from @tiptap/extension-horizontal-rule)
      |-- Typography             (from @tiptap/extension-typography)
      |-- Subscript              (from @tiptap/extension-subscript)
      |-- Superscript            (from @tiptap/extension-superscript)
      |-- Selection              (from @tiptap/extensions)
      |-- Highlight              (from @tiptap/extension-highlight)
```

הרחבות אלו נצרכים על ידי רכיבי העורך המאתחלים את TipTap עם רשימת הרחבות מוגדרת.

## הפניה ל-API

### יצוא

כל הייצוא הוא ייצוא חוזר של מחלקות/אובייקטים של תוסף TipTap. כל אחד מהם יכול להיות מועבר ישירות לבנאי `useEditor()` של TipTap או ל-`Editor`.

#### `Selection`

מאת `@tiptap/extensions`. מספק טיפול בבחירת טקסט ומחווני בחירה חזותית בעורך.

#### `Highlight`

מאת `@tiptap/extension-highlight`. מאפשר הדגשת טקסט עם צבעי רקע הניתנים להתאמה אישית. תומך במספר צבעי הדגשה באמצעות סימנים.

#### `Superscript`

מאת `@tiptap/extension-superscript`. מוסיף עיצוב טקסט עילי (למשל, x^2).

#### `Subscript`

מאת `@tiptap/extension-subscript`. מוסיף עיצוב טקסט תחתי (למשל, H~2~O).

#### `Typography`

מאת `@tiptap/extension-typography`. מספק החלפות טיפוגרפיות אוטומטיות כגון מרכאות חכמות, מקפים, אליפסות ותווים טיפוגרפיים אחרים.

#### `HorizontalRule`

מאת `@tiptap/extension-horizontal-rule`. מוסיף תמיכה בצומת של כלל אופקי (מחלק), המעובד כ`<hr>` בפלט.

#### `TextAlign`

מאת `@tiptap/extension-text-align`. מאפשר בקרת יישור טקסט (שמאל, מרכז, ימין, יישר) בצמתים ברמת הבלוק.

#### `TaskItem`

מאת `@tiptap/extension-list`. מספק צמתי משימות/תיבת סימון בודדים עבור רשימות משימות אינטראקטיביות.

#### `TaskList`

מאת `@tiptap/extension-list`. מספק את צומת המכולה עבור פריטי משימות, עיבוד כרשימה אינטראקטיבית.

## פרטי יישום

**דפוס יצוא חבית**: המודול משתמש בייצוא חוזר בשם כדי לשמור על משטח הייבוא נקי. זה מאפשר לטלטול עצים לעבוד כראוי -- הרחבות שאינן בשימוש לא ייכללו בחבילה אם הן לא יובאו על ידי הרכיב הצורך.

**סיומת קובץ TSX**: הקובץ משתמש ב-@@TOK000@@@ מכיוון שהוא חלק ממערכת האקולוגית של רכיבי העורך ועשוי להיות מורחב עם עקיפות רכיבי React (תצוגות צמתים מותאמות אישית) בעתיד.

**אין תצורה בחבית**: ההרחבות מיוצאות בצורת ברירת המחדל שלהן. תצורה (כגון `TextAlign.configure({ types: ['heading', 'paragraph'] })`) מוחלת ברמת מופע העורך, לא במודול זה.

## תצורה

הרחבות מוגדרות בעת אתחול עורך TipTap, לא במודול זה. תצורות נפוצות כוללות:

```typescript
TextAlign.configure({
  types: ['heading', 'paragraph'],
  alignments: ['left', 'center', 'right', 'justify'],
})

Highlight.configure({
  multicolor: true,
})

TaskItem.configure({
  nested: true,
})
```

## דוגמאות לשימוש

```typescript
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Selection,
  Highlight,
  Superscript,
  Subscript,
  Typography,
  HorizontalRule,
  TextAlign,
  TaskItem,
  TaskList,
} from '@/lib/editor/extensions';

function RichTextEditor({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Selection,
      Highlight.configure({ multicolor: true }),
      Superscript,
      Subscript,
      Typography,
      HorizontalRule,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content,
  });

  return <EditorContent editor={editor} />;
}

// Using individual extensions for a minimal editor
import { Typography, Highlight } from '@/lib/editor/extensions';

function SimpleEditor({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Typography,
      Highlight,
    ],
    content,
  });

  return <EditorContent editor={editor} />;
}
```

## שיטות עבודה מומלצות

- ייבא תמיד הרחבות מ`@/lib/editor/extensions` במקום ישירות מחבילות `@tiptap/*` כדי לשמור על מקור אמת יחיד עבור ערכת ההרחבות של העורך.
- הגדר הרחבות ברמת מופע העורך, לא במודול החבית, כך שמופעי עורך שונים יוכלו להשתמש בתצורות שונות.
- בעת הוספת תוספי TipTap חדשים לפרויקט, הוסף אותם לייצוא החבית הזה ותעד אותם כאן.
- שמור על רשימת התוספים מינימלית -- כלול רק הרחבות המשמשות בפועל ביישום כדי למזער את גודל החבילה.
- בדוק הרחבות חדשות בבידוד לפני הוספתן לחבית כדי להבטיח תאימות לסט הרחבות הקיים.

## מודולים קשורים

- [תבניות רכיבים](/template/architecture/component-patterns) -- רכיבי עורך שצורכים את ההרחבות האלה
