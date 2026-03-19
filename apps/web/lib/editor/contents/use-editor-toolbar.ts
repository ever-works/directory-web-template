import { useCursorVisibility } from "@/lib/editor/hooks/use-cursor-visibility";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWindowSize } from "@/lib/editor/hooks/use-window-size";
import { Editor } from "@tiptap/react";
import { useRef, useState } from "react";

export const useEditorToolbar = ( editor: Editor | null ) => {
    const toolbarRef = useRef<HTMLDivElement>(null)
    const isMobile = useIsMobile()
    const { height } = useWindowSize()
    const [mobileView, setMobileView] = useState<
      "main" | "highlighter" | "link"
    >("main")
    const rect = useCursorVisibility({
        editor,
        overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
      })
      return { rect, toolbarRef, isMobile, height, mobileView, setMobileView }
};