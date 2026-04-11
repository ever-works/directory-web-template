---
id: rich-text-editor
title: Editor de texto enriquecido
sidebar_label: Editor de texto enriquecido
sidebar_position: 12
---

# Editor de texto enriquecido

La plantilla Ever Works incluye un editor de texto enriquecido totalmente integrado con tecnología [TipTap](https://tiptap.dev/), un marco de edición sin cabeza creado sobre ProseMirror. El editor admite formato de contenido, carga de imágenes, listas de tareas y sincronización bidireccional con datos de formulario.

## Descripción general de la arquitectura

El sistema de edición está organizado en una estructura modular en `lib/editor/` :

| Directorio / Archivo | Propósito |
|---|---|
| `providers/editor-provider.tsx` | Proveedor de contexto React que inicializa el editor TipTap con todas las extensiones |
| `hooks/use-tiptap-editor.ts` | Gancho para acceder a la instancia del editor desde el contexto o la propiedad directa |
| `hooks/use-editor.ts` | Gancho de consumidor de contexto simplificado |
| `hooks/use-editor-sync.ts` | Sincronización bidireccional entre el editor y el estado del formulario |
| `contents/editor-content.tsx` | Componente contenedor para representar el área de contenido del editor |
| `contents/use-editor-toolbar.ts` | Gancho para gestionar el estado de la barra de herramientas (móvil/escritorio, vistas) |

## Extensiones TipTap

El editor se configura con un conjunto completo de extensiones a través del `EditorContextProvider` :

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

### Referencia de extensión

| Ampliación | Descripción |
|---|---|
| `StarterKit` | Formato principal: negrita, cursiva, encabezados, listas, citas en bloque, bloques de código, enlaces |
| `HorizontalRule` | Inserción de regla horizontal personalizada |
| `TextAlign` | Alineación de texto (izquierda, centro, derecha, justificar) para títulos y párrafos |
| `ImageUploadNode` | Carga de imágenes mediante arrastrar y soltar con límites de tamaño y restricciones de recuento de archivos |
| `TaskList` / `TaskItem` | Listas interactivas de tareas/casillas de verificación con soporte anidado |
| `Highlight` | Resaltado de texto con soporte multicolor |
| `Image` | Incrustación de imágenes estándar mediante `@tiptap/extension-image` |
| `Typography` | Reemplazos tipográficos automáticos (comillas tipográficas, guiones) |
| `Superscript` / `Subscript` | Formato de texto en superíndice y subíndice |
| `Selection` | Manejo de selección mejorado |

## Proveedor de contexto del editor

El editor se inicializa a través de un proveedor de contexto de React. Envuelva su árbol de componentes con `EditorContextProvider` para que el editor esté disponible:

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

El proveedor crea el editor con la siguiente configuración:

- ** `immediatelyRender: false` ** -- Previene los desajustes de hidratación SSR
- ** `shouldRerenderOnTransaction: false` ** -- Optimización del rendimiento para reducir renderizaciones innecesarias
- **Atributos de accesibilidad**: las etiquetas Autocompletar, Autocorrección y ARIA están configuradas
- **Altura mínima** -- `min-h-96` garantiza un área de edición utilizable

## Accediendo a la instancia del editor

### Usando `useTiptapEditor` El enlace principal para acceder al editor admite tanto la inyección directa como el retroceso de contexto:

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

### Usando `useEditor` Un gancho más sencillo que requiere estrictamente estar dentro del `EditorContextProvider` :

```tsx
import { useEditor } from '@/lib/editor/hooks/use-editor';

function EditorStatus() {
  const editor = useEditor();
  // Throws if not inside EditorContextProvider
  return <span>{editor?.isFocused ? 'Editing' : 'Idle'}</span>;
}
```

## Sincronización de contenido

El gancho `useEditorSync` maneja la sincronización bidireccional entre el editor TipTap y el estado del formulario. Esto es esencial para integrar el editor en formularios administrados por el estado de React o las bibliotecas de formularios.

### Sincronización básica

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

### Sincronización de campos de formulario

Para formularios con múltiples campos, `useEditorFieldSync` proporciona una abreviatura:

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

### Comportamiento de sincronización

| Dirección | Gatillo | Condición |
|---|---|---|
| Formulario al editor | `content` cambios de accesorios | Sólo cuando el editor está vacío o el contenido difiere significativamente |
| Editor de formulario | Eventos `update` y `blur` | Siempre propaga el HTML actual a la devolución de llamada del formulario |

El gancho evita infinitos bucles de actualización al verificar si el contenido del editor está vacío o es sustancialmente diferente antes de sobrescribirlo.

## Componente de contenido del editor

El contenedor `EditorContent` maneja el ajuste de palabras y el estilo ProseMirror:

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

El componente aplica reglas CSS para ajustar el texto correctamente:
- `break-words` en el contenedor ProseMirror
- `whitespace-pre-wrap` para preservar los espacios en blanco
- `overflow-wrap-anywhere` para evitar el desbordamiento horizontal

## Gestión de la barra de herramientas

El gancho `useEditorToolbar` administra el estado de la barra de herramientas, incluida la capacidad de respuesta móvil:

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

La barra de herramientas admite tres modos de vista móvil: `"main"` , `"highlighter"` y `"link"` .

## Subir imagen

El editor admite la carga de imágenes a través de la extensión `ImageUploadNode` :

| Configuración | Valor |
|---|---|
| Tipos aceptados | `image/*` |
| Tamaño máximo de archivo | Definido por `MAX_FILE_SIZE` constante |
| Máximo de imágenes por carga | 3 |
| Controlador de carga | `handleImageUpload` función de utilidad |

Las imágenes se pueden cargar arrastrando y soltando o con el botón de carga de la barra de herramientas.

## Archivos clave

| Archivo | Camino |
|---|---|
| Proveedor de editor | `lib/editor/providers/editor-provider.tsx` |
| Gancho del editor TipTap | `lib/editor/hooks/use-tiptap-editor.ts` |
| Gancho de sincronización del editor | `lib/editor/hooks/use-editor-sync.ts` |
| Contenido del editor | `lib/editor/contents/editor-content.tsx` |
| Gancho de barra de herramientas | `lib/editor/contents/use-editor-toolbar.ts` |
| Gancho de contexto del editor | `lib/editor/hooks/use-editor.ts` |
