---
id: editor-extensions
title: "Extensions de l'éditeur"
sidebar_label: "Extensions de l'éditeur"
sidebar_position: 49
---

# Extensions de l'éditeur

## Aperçu

Le module Editor Extensions fournit une exportation centralisée des extensions de l'éditeur TipTap utilisées dans l'éditeur de texte enrichi de l'application. Il regroupe les extensions de formatage, de structure et d'interaction de l'écosystème TipTap en un seul point d'importation, garantissant des capacités d'édition cohérentes dans toutes les instances d'éditeur de l'application.

## Architecture

Le module (`lib/editor/extensions/index.tsx`) agit comme un agrégateur de réexportation qui importe des extensions TipTap individuelles et les exporte sous la forme d'un ensemble unifié. Ce modèle permet aux instances de l'éditeur d'importer toutes les extensions requises à partir d'un seul emplacement plutôt que de disperser les importations de dépendances TipTap entre les composants.

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

Ces extensions sont consommées par les composants de l'éditeur qui initialisent TipTap avec une liste d'extensions configurée.

## Référence API

### Exportations

Toutes les exportations sont des réexportations de classes/objets d’extension TipTap. Chacun peut être transmis directement au hook `useEditor()` de TipTap ou au constructeur `Editor`.

#### `Selection`

De `@tiptap/extensions`. Fournit une gestion de la sélection de texte et des indicateurs de sélection visuelle dans l'éditeur.

#### `Highlight`

De `@tiptap/extension-highlight`. Permet la mise en évidence du texte avec des couleurs d'arrière-plan personnalisables. Prend en charge plusieurs couleurs de surbrillance via des marques.

#### `Superscript`

De `@tiptap/extension-superscript`. Ajoute un formatage de texte en exposant (par exemple, x^2).

#### `Subscript`

De `@tiptap/extension-subscript`. Ajoute un formatage de texte en indice (par exemple, H~2~O).

#### `Typography`

De `@tiptap/extension-typography`. Fournit des remplacements typographiques automatiques tels que des guillemets intelligents, des tirets cadratins, des ellipses et d'autres caractères typographiques.

#### `HorizontalRule`

De `@tiptap/extension-horizontal-rule`. Ajoute la prise en charge du nœud de règle horizontale (diviseur), rendu sous la forme `<hr>` dans la sortie.

#### `TextAlign`

De `@tiptap/extension-text-align`. Active le contrôle de l'alignement du texte (gauche, centre, droite, justification) sur les nœuds au niveau du bloc.

#### `TaskItem`

De `@tiptap/extension-list`. Fournit des nœuds d’éléments de tâches/cases à cocher individuels pour les listes de tâches interactives.

#### `TaskList`

De `@tiptap/extension-list`. Fournit le nœud conteneur pour les éléments de tâche, affiché sous forme de liste de contrôle interactive.

## Détails de mise en œuvre

**Modèle d'exportation en barillet** : le module utilise des réexportations nommées pour garder la surface d'importation propre. Cela permet à l'arborescence de fonctionner correctement : les extensions inutilisées ne seront pas incluses dans le bundle si elles ne sont pas importées par le composant consommateur.

**Extension de fichier TSX** : le fichier utilise `.tsx` car il fait partie de l'écosystème des composants de l'éditeur et peut être étendu avec des remplacements de composants React (vues de nœuds personnalisées) à l'avenir.

**Aucune configuration dans le tonneau** : Les extensions sont exportées sous leur forme par défaut. La configuration (telle que `TextAlign.configure({ types: ['heading', 'paragraph'] })`) est appliquée au niveau de l'instance de l'éditeur, pas dans ce module.

## Configuration

Les extensions sont configurées lors de l'initialisation de l'éditeur TipTap, pas dans ce module. Les configurations courantes incluent :

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

## Exemples d'utilisation

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

## Meilleures pratiques

- Importez toujours les extensions depuis `@/lib/editor/extensions` plutôt que directement depuis les packages `@tiptap/*` afin de conserver une source unique de vérité pour l'ensemble d'extensions de l'éditeur.
- Configurez les extensions au niveau de l'instance de l'éditeur, et non dans le module Barrel, afin que différentes instances de l'éditeur puissent utiliser différentes configurations.
- Lorsque vous ajoutez de nouvelles extensions TipTap au projet, ajoutez-les à cette exportation de baril et documentez-les ici.
- Gardez la liste d'extensions minimale : incluez uniquement les extensions réellement utilisées dans l'application afin de minimiser la taille du bundle.
- Testez les nouvelles extensions de manière isolée avant de les ajouter au canon pour garantir la compatibilité avec le jeu d'extensions existant.

## Modules associés

- [Modèles de composants](/template/architecture/component-patterns) -- Composants de l'éditeur qui consomment ces extensions
