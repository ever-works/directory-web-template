"use client";

import { useLayoutTheme } from "./context";
import ViewToggle from "./view-toggle";
import { LayoutKey } from "./layouts";

interface LayoutSettingsProps {
  className?: string;
  isParentSticky?: boolean;
}

export function LayoutSettings({ className, isParentSticky = false }: LayoutSettingsProps) {
  const { layoutKey, setLayoutKey } = useLayoutTheme();

  return (
    <div className={`flex items-center gap-3 justify-end ${className}`}>
      <ViewToggle
        activeView={layoutKey}
        onViewChange={(newView: LayoutKey) => setLayoutKey(newView)}
        isParentSticky={isParentSticky}
      />
    </div>
  );
} 