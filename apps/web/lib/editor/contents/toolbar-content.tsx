import React from 'react';
import type { Editor } from '@tiptap/react';
import {
	BlockquoteButton,
	ColorHighlightPopover,
	HeadingDropdownMenu,
	LinkPopover,
	ListDropdownMenu,
	Spacer,
	ToolbarGroup,
	ToolbarSeparator
} from '../components';
import { UndoRedoButton } from '../components/ui/undo-redo-button';
import { CodeBlockButton } from '../components/ui/code-block-button';
import { MarkButton } from '../components/ui/mark-button';
import { TextAlignButton } from '../components/ui/text-align-button';
import { ImageUploadButton } from '../components/ui/image-upload-button';

export const ToolbarContent = React.memo(({ editor }: { editor: Editor | null }) => {
	return (
		<>
			<Spacer />

			<ToolbarGroup>
				<UndoRedoButton action="undo" editor={editor} />
				<UndoRedoButton action="redo" editor={editor} />
			</ToolbarGroup>

			<ToolbarSeparator />

			<ToolbarGroup>
				{editor && (
					<>
						<HeadingDropdownMenu
							className=""
							key={`heading-${editor?.state.selection.from}`}
							levels={[1, 2, 3, 4]}
							portal={true}
							editor={editor}
						/>
						<ListDropdownMenu
							className=""
							key={`list-${editor.state.selection.from}`}
							types={['bulletList', 'orderedList', 'taskList']}
							portal={true}
							editor={editor}
						/>
					</>
				)}
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
				<MarkButton type="superscript" editor={editor} />
				<MarkButton type="subscript" editor={editor} />
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

			<ToolbarSeparator />
			<Spacer />
		</>
	);
});

ToolbarContent.displayName = 'ToolbarContent';
