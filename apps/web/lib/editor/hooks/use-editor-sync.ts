'use client';

import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';

interface UseEditorSyncOptions {
  /**
   * The editor instance to synchronize
   */
  editor: Editor | null;
  
  /**
   * The current content value from form data
   */
  content: string | undefined;
  
  /**
   * Function to update the form data with new content
   */
  onContentChange: (content: string) => void;
  
  /**
   * Optional field name for logging purposes
   */
  fieldName?: string;
  
  /**
   * Whether to enable console logging for debugging
   */
  enableLogging?: boolean;
}

/**
 * Custom hook for synchronizing TipTap editor content with form data.
 * 
 * This hook handles bidirectional synchronization:
 * - Updates editor content when form data changes
 * - Updates form data when editor content changes
 * 
 * @example
 * ```tsx
 * // Basic usage with form data object
 * useEditorFieldSync(editor, formData, 'description', setFormData);
 * 
 * // With custom options
 * useEditorFieldSync(editor, formData, 'content', setFormData, {
 *   fieldName: 'article-content',
 *   enableLogging: true
 * });
 * 
 * // Advanced usage with custom callback
 * useEditorSync({
 *   editor,
 *   content: formData.introduction,
 *   onContentChange: (content) => {
 *     setFormData(prev => ({ ...prev, introduction: content }));
 *   },
 *   fieldName: 'introduction',
 *   enableLogging: false
 * });
 * ```
 * 
 * @param options - Configuration options for the synchronization
 */
export function useEditorSync({
  editor,
  content,
  onContentChange,
  fieldName = 'content',
  enableLogging = false
}: UseEditorSyncOptions) {
  
  // Synchronize editor content with form data
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getHTML();
      
      // Only update if content is significantly different to avoid infinite loops
      if (currentContent !== content && (currentContent === '<p></p>' || !currentContent.trim())) {
        editor.commands.setContent(content || '');
        
        if (enableLogging) {
          console.log(`Editor ${fieldName} synchronized from form data:`, content);
        }
      }
    }
  }, [editor, content, fieldName, enableLogging]);

  // Update form data when editor content changes
  useEffect(() => {
    if (!editor) return;

    const updateContent = () => {
      const newContent = editor.getHTML();
      onContentChange(newContent);

      if (enableLogging) {
        console.log(`Form data ${fieldName} updated from editor:`, newContent);
      }
    };

    // Listen to editor events
    editor.on('update', updateContent);
    editor.on('blur', updateContent);

    // Cleanup event listeners
    return () => {
      editor.off('update', updateContent);
      editor.off('blur', updateContent);
    };
  }, [editor, onContentChange, fieldName, enableLogging]);
}

/**
 * Hook for synchronizing editor content with a specific form field
 * 
 * @param editor - The editor instance
 * @param formData - The form data object
 * @param fieldKey - The key of the field in formData to synchronize with
 * @param setFormData - Function to update form data
 * @param options - Additional options
 */
export function useEditorFieldSync<T extends Record<string, any>>(
  editor: Editor | null,
  formData: T,
  fieldKey: keyof T,
  setFormData: (updater: (prev: T) => T) => void,
  options?: {
    fieldName?: string;
    enableLogging?: boolean;
  }
) {
  const content = formData[fieldKey] as string | undefined;
  
  const onContentChange = (newContent: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldKey]: newContent
    }));
  };

  useEditorSync({
    editor,
    content,
    onContentChange,
    fieldName: options?.fieldName || String(fieldKey),
    enableLogging: options?.enableLogging || false
  });
}
