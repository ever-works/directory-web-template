---
id: editor-extensions
title: "Extensiones del editor"
sidebar_label: "Extensiones del editor"
sidebar_position: 49
---

# Extensiones del editor

## Descripción general

El módulo Extensiones del editor proporciona una exportación de barril centralizada de las extensiones del editor TipTap utilizadas en el editor de texto enriquecido de la aplicación. Incluye extensiones de formato, estructurales y de interacción del ecosistema TipTap en un único punto de importación, lo que garantiza capacidades de editor consistentes en todas las instancias del editor de la aplicación.

## Arquitectura

El módulo (`lib/editor/extensions/index.tsx`) actúa como un agregador de reexportación que importa extensiones TipTap individuales y las exporta como un conjunto unificado. Este patrón permite que las instancias del editor importen todas las extensiones requeridas desde una ubicación en lugar de distribuir las importaciones de dependencias de TipTap entre componentes.

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

Estas extensiones son consumidas por los componentes del editor que inicializan TipTap con una lista de extensiones configuradas.

## Referencia de API

### Exportaciones

Todas las exportaciones son reexportaciones de clases/objetos de extensión TipTap. Cada uno se puede pasar directamente al gancho `useEditor()` de TipTap o al constructor `Editor`.

#### `Selection`

De `@tiptap/extensions`. Proporciona manejo de selección de texto e indicadores de selección visual en el editor.

#### `Highlight`

De `@tiptap/extension-highlight`. Permite resaltar texto con colores de fondo personalizables. Admite múltiples colores de resaltado mediante marcas.

#### `Superscript`

De `@tiptap/extension-superscript`. Agrega formato de texto en superíndice (por ejemplo, x^2).

#### `Subscript`

De `@tiptap/extension-subscript`. Agrega formato de texto de subíndice (por ejemplo, H~2~O).

#### `Typography`

De `@tiptap/extension-typography`. Proporciona reemplazos tipográficos automáticos, como comillas tipográficas, guiones largos, elipses y otros caracteres tipográficos.

#### `HorizontalRule`

De `@tiptap/extension-horizontal-rule`. Agrega compatibilidad con el nodo de regla horizontal (divisor), representado como `<hr>` en la salida.

#### `TextAlign`

De `@tiptap/extension-text-align`. Habilita el control de alineación del texto (izquierda, centro, derecha, justificar) en nodos a nivel de bloque.

#### `TaskItem`

De `@tiptap/extension-list`. Proporciona nodos de elementos de tareas/casillas de verificación individuales para listas de tareas interactivas.

#### `TaskList`

De `@tiptap/extension-list`. Proporciona el nodo contenedor para elementos de tareas, presentándolos como una lista de verificación interactiva.

## Detalles de implementación

**Patrón de exportación de barril**: el módulo utiliza reexportaciones con nombre para mantener limpia la superficie de importación. Esto permite que la agitación de árboles funcione correctamente: las extensiones no utilizadas no se incluirán en el paquete si no las importa el componente consumidor.

**Extensión de archivo TSX**: el archivo usa `.tsx` porque es parte del ecosistema de componentes del editor y puede ampliarse con anulaciones de componentes de React (vistas de nodos personalizadas) en el futuro.

**Sin configuración en el barril**: Las extensiones se exportan en su forma predeterminada. La configuración (como `TextAlign.configure({ types: ['heading', 'paragraph'] })`) se aplica en el nivel de instancia del editor, no en este módulo.

## Configuración

Las extensiones se configuran al inicializar el editor TipTap, no en este módulo. Las configuraciones comunes incluyen:

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

## Ejemplos de uso

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

## Mejores prácticas

- Importe siempre extensiones desde `@/lib/editor/extensions` en lugar de directamente desde paquetes `@tiptap/*` para mantener una única fuente de verdad para el conjunto de extensiones del editor.
- Configure extensiones en el nivel de instancia del editor, no en el módulo de barril, para que diferentes instancias del editor puedan usar diferentes configuraciones.
- Cuando agregue nuevas extensiones TipTap al proyecto, agréguelas a esta exportación de barril y documentelas aquí.
- Mantenga la lista de extensiones al mínimo: incluya únicamente extensiones que realmente se utilicen en la aplicación para minimizar el tamaño del paquete.
- Pruebe nuevas extensiones de forma aislada antes de agregarlas al barril para garantizar la compatibilidad con el conjunto de extensiones existente.

## Módulos relacionados

- [Patrones de componentes](/template/architecture/component-patterns): componentes del editor que consumen estas extensiones
