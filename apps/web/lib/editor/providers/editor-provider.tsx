import { createContext, useMemo } from 'react';
import { useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
	HorizontalRule,
	TextAlign,
	TaskItem,
	TaskList,
	Highlight,
	Typography,
	Superscript,
	Subscript,
	Selection
} from '@/lib/editor';
import { Image } from '@tiptap/extension-image';
import { cn, handleImageUpload, MAX_FILE_SIZE } from '@/lib/editor/utils';
import { ImageUploadNode } from '../components/node/image-upload-node';

export const EditorContext = createContext<Editor | null>(null);

export function EditorContextProvider({ children }: { children: React.ReactNode }) {
	const extensions = useMemo(
		() => [
			StarterKit?.configure({
				horizontalRule: false,
				link: {
					openOnClick: false,
					enableClickSelection: true
				}
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
		],
		[]
	);

	const editor = useEditor({
		immediatelyRender: false,
		shouldRerenderOnTransaction: false,
		editorProps: {
			attributes: {
				autocomplete: 'on',
				autocorrect: 'on',
				autocapitalize: 'off',
				'aria-label': 'Main content area, start typing to enter text.',

				class: cn('min-h-96')
			}
		},
		extensions
	});

	return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>;
}
