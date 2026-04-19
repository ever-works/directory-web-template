---
id: editor-extensions
title: "ملحقات المحرر"
sidebar_label: "ملحقات المحرر"
sidebar_position: 49
---

# ملحقات المحرر

## نظرة عامة

توفر وحدة Editor Extensions تصديرًا مركزيًا للبرميل لامتدادات محرر TipTap المستخدمة في محرر النص المنسق للتطبيق. فهو يجمع امتدادات التنسيق والهيكلية والتفاعل من النظام البيئي TipTap في نقطة استيراد واحدة، مما يضمن قدرات محرر متسقة عبر جميع مثيلات المحرر في التطبيق.

## الهندسة المعمارية

تعمل الوحدة (`lib/editor/extensions/index.tsx`) كمجمع لإعادة التصدير حيث يستورد امتدادات TipTap الفردية ويصدرها كمجموعة موحدة. يسمح هذا النمط لمثيلات المحرر باستيراد جميع الامتدادات المطلوبة من موقع واحد بدلاً من تشتيت استيرادات تبعية TipTap عبر المكونات.

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

يتم استهلاك هذه الملحقات بواسطة مكونات المحرر التي تقوم بتهيئة TipTap باستخدام قائمة الملحقات التي تم تكوينها.

## مرجع واجهة برمجة التطبيقات

### الصادرات

جميع الصادرات عبارة عن إعادة تصدير لفئات/كائنات ملحق TipTap. يمكن تمرير كل منها مباشرة إلى الخطاف `useEditor()` الخاص بـ TipTap أو مُنشئ `Editor`.

#### `Selection`

من `@tiptap/extensions`. يوفر معالجة اختيار النص ومؤشرات التحديد المرئية في المحرر.

#### `Highlight`

من `@tiptap/extension-highlight`. تمكين تمييز النص بألوان خلفية قابلة للتخصيص. يدعم ألوان التمييز المتعددة عبر العلامات.

#### `Superscript`

من `@tiptap/extension-superscript`. إضافة تنسيق نص مرتفع (على سبيل المثال، x^2).

#### `Subscript`

من `@tiptap/extension-subscript`. إضافة تنسيق نص منخفض (على سبيل المثال، H~2~O).

#### `Typography`

من `@tiptap/extension-typography`. يوفر بدائل مطبعية تلقائية مثل علامات الاقتباس الذكية، والشرطات em، وعلامات الحذف، والأحرف المطبعية الأخرى.

#### `HorizontalRule`

من `@tiptap/extension-horizontal-rule`. إضافة دعم عقدة القاعدة الأفقية (المقسم)، والتي يتم تقديمها كـ `<hr>` في الإخراج.

#### `TextAlign`

من `@tiptap/extension-text-align`. لتمكين التحكم في محاذاة النص (يسار، وسط، يمين، ضبط) على العقد على مستوى الكتلة.

#### `TaskItem`

من `@tiptap/extension-list`. يوفر عقد عناصر مهمة/مربع اختيار فردي لقوائم المهام التفاعلية.

#### `TaskList`

من `@tiptap/extension-list`. يوفر عقدة الحاوية لعناصر المهام، ويتم عرضها كقائمة مرجعية تفاعلية.

## تفاصيل التنفيذ

**نمط تصدير البرميل**: تستخدم الوحدة عمليات إعادة التصدير المسماة للحفاظ على نظافة سطح الاستيراد. يسمح هذا لاهتزاز الشجرة بالعمل بشكل صحيح - لن يتم تضمين الامتدادات غير المستخدمة في الحزمة إذا لم يتم استيرادها بواسطة المكون المستهلك.

**امتداد ملف TSX**: يستخدم الملف `.tsx` لأنه جزء من النظام البيئي لمكون المحرر ويمكن توسيعه بتجاوزات مكون React (عروض العقدة المخصصة) في المستقبل.

**لا يوجد تكوين في البرميل**: يتم تصدير الامتدادات بشكلها الافتراضي. يتم تطبيق التكوين (مثل `TextAlign.configure({ types: ['heading', 'paragraph'] })`) على مستوى مثيل المحرر، وليس في هذه الوحدة.

## التكوين

يتم تكوين الملحقات عند تهيئة محرر TipTap، وليس في هذه الوحدة. تتضمن التكوينات الشائعة ما يلي:

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

## أمثلة الاستخدام

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

## أفضل الممارسات

- قم دائمًا باستيراد الامتدادات من `@/lib/editor/extensions` بدلاً من استيراد الامتدادات مباشرةً من حزم `@tiptap/*` للحفاظ على مصدر واحد حقيقي لمجموعة امتدادات المحرر.
- قم بتكوين الامتدادات على مستوى مثيل المحرر، وليس في وحدة البرميل، بحيث يمكن لمثيلات المحرر المختلفة استخدام تكوينات مختلفة.
- عند إضافة ملحقات TipTap جديدة إلى المشروع، قم بإضافتها إلى تصدير البرميل هذا وتوثيقها هنا.
- حافظ على الحد الأدنى من قائمة الملحقات - قم فقط بتضمين الملحقات المستخدمة فعليًا في التطبيق لتقليل حجم الحزمة.
- اختبر الامتدادات الجديدة بشكل منفصل قبل إضافتها إلى البرميل لضمان التوافق مع مجموعة الامتدادات الحالية.

## الوحدات ذات الصلة

- [أنماط المكونات](/template/architecture/component-patterns) - مكونات المحرر التي تستهلك هذه الامتدادات
