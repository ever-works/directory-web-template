"use client";

import { IconClassic, IconGrid, IconMasonry } from "@/components/icons/Icons";
import { useState, useEffect } from "react";
import { LayoutKey } from "./layouts";

type ViewToggleProps = {
  activeView?: LayoutKey;
  onViewChange?: (view: LayoutKey) => void;
	/** When the parent is sticky, flip the tooltip below to avoid clipping */
	isParentSticky?: boolean;
};

export default function ViewToggle({
  activeView = "classic",
  onViewChange,
	isParentSticky = false,
}: ViewToggleProps) {
  const [hovered, setHovered] = useState<LayoutKey | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);

  useEffect(() => {
	if (hovered === "classic") setTooltip("List view");
	else if (hovered === "grid") setTooltip("Grid view");
	else if (hovered === "masonry") setTooltip("Masonry view");
	else setTooltip(null);
  }, [hovered]);

  const handleViewChange = (view: LayoutKey) => {
	if (onViewChange) {
	  onViewChange(view);
	}
  };

  return (
	<div className="relative flex items-center gap-1 justify-end">
	  <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xs rounded-lg p-1 flex items-center shadow-md dark:shadow-lg border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 hover:shadow-lg dark:hover:shadow-xl">
		<button
		  className={`${
			activeView === "classic"
			  ? "bg-theme-primary text-white shadow-md transform scale-105"
			  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
		  } rounded-md p-1 transition-all duration-300 ease-out transform ${
			hovered === "classic" && activeView !== "classic"
			  ? "scale-110 shadow-xs"
			  : ""
		  } focus:outline-hidden focus:ring-1 focus:ring-theme-primary dark:focus:ring-theme-primary/50 focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-gray-800 flex items-center justify-center`}
		  onClick={() => handleViewChange("classic")}
		  onMouseEnter={() => setHovered("classic")}
		  onMouseLeave={() => setHovered(null)}
		  aria-label="Switch to list view"
		>
		  <div
			className={`transition-all duration-300 w-4 h-4 flex items-center justify-center ${activeView === "classic" ? "drop-shadow-xs" : ""}`}
		  >
			<IconClassic />
		  </div>
		</button>

		<button
		  className={`${
			activeView === "grid"
			  ? "bg-theme-primary text-white shadow-md transform scale-105"
			  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
		  } rounded-md p-1 transition-all duration-300 ease-out transform ${
			hovered === "grid" && activeView !== "grid"
			  ? "scale-110 shadow-xs"
			  : ""
		  } focus:outline-hidden focus:ring-1 focus:ring-theme-primary dark:focus:ring-theme-primary focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-gray-800 flex items-center justify-center`}
		  onClick={() => handleViewChange("grid")}
		  onMouseEnter={() => setHovered("grid")}
		  onMouseLeave={() => setHovered(null)}
		  aria-label="Switch to grid view"
		>
		  <div
			className={`transition-all duration-300 w-4 h-4 flex items-center justify-center ${activeView === "grid" ? "drop-shadow-xs" : ""}`}
		  >
			<IconGrid />
		  </div>
		</button>
		<button
		  className={`${
			activeView === "masonry"
			  ? "bg-theme-primary text-white shadow-md transform scale-105"
			  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
		  } rounded-md p-1 transition-all duration-300 ease-out transform ${
			hovered === "masonry" && activeView !== "masonry"
			  ? "scale-110 shadow-xs"
			  : ""
		  } focus:outline-hidden focus:ring-1 focus:ring-theme-primary dark:focus:ring-theme-primary focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-gray-800 flex items-center justify-center`}
		  onClick={() => handleViewChange("masonry")}
		  onMouseEnter={() => setHovered("masonry")}
		  onMouseLeave={() => setHovered(null)}
		  aria-label="Switch to masonry view"
		>
		  <div
			className={`transition-all duration-300 w-4 h-4 flex items-center justify-center ${activeView === "cards" ? "drop-shadow-xs" : ""}`}
		  >
			<IconMasonry />
		  </div>
		</button>
		{tooltip && (
		  <div
			className={`absolute left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-1 rounded-sm text-xs font-medium shadow-lg whitespace-nowrap pointer-events-none ${
			  isParentSticky ? 'top-full mt-2' : '-top-8'
			}`}
		  >
			{tooltip}
		  </div>
		)}
	  </div>
	</div>
  );
}
