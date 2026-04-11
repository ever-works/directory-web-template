---
id: editor-system-deep-dive
title: Análisis profundo del sistema de edición de texto enriquecido
sidebar_label: Sistema de edición
sidebar_position: 7
---

# Análisis profundo del sistema de edición de texto enriquecido

Esta guía cubre el sistema de edición de texto enriquecido basado en TipTap, incluida la configuración de extensiones, nodos personalizados, arquitectura de barra de herramientas, manejo de imágenes y sincronización de formularios.

## Descripción general de la arquitectura

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

## Configuración de extensión

El editor está configurado en `lib/editor/providers/editor-provider.tsx` con un completo conjunto de extensiones:

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

### Referencia de extensión

| Ampliación | Fuente | Propósito |
|-----------|--------|---------|
| `StarterKit` | `@tiptap/starter-kit` | Base: párrafos, títulos, listas, código, negrita, cursiva |
| `HorizontalRule` | `@tiptap/extension-horizontal-rule` | Divisores de líneas horizontales |
| `TextAlign` | `@tiptap/extension-text-align` | Izquierda, centro, derecha, justificar alineación |
| `ImageUploadNode` | Personalizado | Carga de imágenes con arrastrar y soltar con progreso |
| `TaskList` / `TaskItem` | `@tiptap/extension-list` | Listas de tareas con casillas de verificación (anidadas) |
| `Highlight` | `@tiptap/extension-highlight` | Resaltado de texto multicolor |
| `Image` | `@tiptap/extension-image` | Visualización de imágenes en línea |
| `Typography` | `@tiptap/extension-typography` | Comillas tipográficas, guiones, puntos suspensivos |
| `Superscript` | `@tiptap/extension-superscript` | Texto en superíndice |
| `Subscript` | `@tiptap/extension-subscript` | Texto subíndice |
| `Selection` | `@tiptap/extensions` | Manejo de selección mejorado |

## Proveedor de editores

La instancia del editor se crea a través del contexto de React para acceso a toda la aplicación:

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

### Optimizaciones de rendimiento

- ** `immediatelyRender: false` **: Previene los desajustes de hidratación en SSR.
- ** `shouldRerenderOnTransaction: false` **: Reduce los renderizados de React en cada pulsación de tecla. Sólo los cambios de estado de la barra de herramientas activan la repetición de renderizados.

## Ganchos personalizados

### `useTiptapEditor` Proporciona acceso a la instancia del editor desde el contexto o directamente:

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

### `useEditor` Gancho simple basado en contexto:

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

## Nodo de carga de imágenes

El `ImageUploadNode` es una extensión TipTap personalizada para cargar imágenes con la función de arrastrar y soltar:

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

### Cargar interfaz de función

```typescript
export type UploadFunction = (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
) => Promise<string>;  // Returns the URL of the uploaded image
```

### Controlador de carga de imágenes

El controlador predeterminado en `lib/editor/utils/utils.ts` :

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

### Atajos de teclado

El nodo de carga de imágenes registra el manejo de claves de entrada:

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

## Configuración de la barra de herramientas

La barra de herramientas se define en `lib/editor/contents/toolbar-content.tsx` como un componente modular:

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

## Sincronización de datos del formulario

### `useEditorSync` Gancho

Sincronización bidireccional entre el editor y el estado del formulario:

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

### `useEditorFieldSync` Gancho práctico

Para integración directa con datos de formulario basados en `useState` :

```typescript
// Usage in a form component
useEditorFieldSync(editor, formData, 'description', setFormData);
```

## Funciones de utilidad

### Validación del esquema

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

### Desinfección de URL

```typescript
import { sanitizeUrl, isAllowedUri } from '@/lib/editor/utils';

// Validate link URLs before inserting
const safeUrl = sanitizeUrl(userInput, window.location.href);
// Returns the URL if safe, or "#" if not
```

## Consideraciones de rendimiento

1. ** `React.memo` en ToolbarContent**: evita que la barra de herramientas se vuelva a representar cuando cambia el estado no relacionado.
2. ** `shouldRerenderOnTransaction: false` **: Solo los cambios de estado esenciales activan los renderizados de React.
3. ** `useMemo` para extensiones**: la matriz de extensiones se calcula una vez y se reutiliza.
4. **Sincronización basada en eventos**: la sincronización del editor a formulario utiliza eventos TipTap ( `update` , `blur` ) en lugar de sondeo.
5. ** `MAX_FILE_SIZE` validación**: la verificación del tamaño del archivo del lado del cliente evita intentos de carga innecesarios.

## Solución de problemas

### El editor no renderiza

1. Asegúrese de que `EditorContextProvider` envuelva el árbol de componentes.
2. Verifique que `immediatelyRender: false` esté configurado (requerido para SSR).
3. Verifique que todas las dependencias de TipTap estén instaladas.

### Los datos del formulario no se sincronizan

1. Asegúrese de que se llame a `useEditorSync` o `useEditorFieldSync` con los parámetros correctos.
2. Compruebe que la instancia del editor no sea nula cuando se ejecute el enlace.
3. Verifique que `onContentChange` actualice correctamente el estado del formulario.

### La carga de la imagen falla

1. Verifique que el controlador de carga devuelva una cadena de URL válida.
2. Verifique que `MAX_FILE_SIZE` coincida con los límites del lado del servidor.
3. Verifique la consola del navegador para ver si hay errores CORS si carga en un dominio diferente.

## Documentación relacionada

- [Arquitectura de cliente API] (./api-client-architecture.md)
- [Patrones de recuperación de errores](./error-recovery-patterns.md)
- [Análisis profundo de la arquitectura de almacenamiento en caché] (./caching-deep-dive.md)
