"use client";

import { IconClassic, IconGrid, IconMasonry, IconMap } from "@/components/icons/Icons";
import { useState } from "react";
import { LayoutKey } from "./layouts";

type ViewToggleProps = {
  activeView?: LayoutKey;
  onViewChange?: (view: LayoutKey) => void;
	/** When the parent is sticky, flip the tooltip below to avoid clipping */
	isParentSticky?: boolean;
	/** Whether the map view option should be shown */
	isMapAvailable?: boolean;
	/** Whether the map view is currently active */
	isMapActive?: boolean;
	/** Callback to toggle map view */
	onMapToggle?: () => void;
};

export default function ViewToggle({
  activeView = "classic",
  onViewChange,
	isParentSticky = false,
	isMapAvailable = false,
	isMapActive = false,
	onMapToggle,
}: ViewToggleProps) {
	const [hovered, setHovered] = useState<string | null>(null);

  const handleViewChange = (view: LayoutKey) => {
	if (onViewChange) {
	  onViewChange(view);
	}
  };

  return (
	<div className="relative flex items-center gap-1 justify-end">
	  <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xs rounded-lg p-1 flex items-center shadow-md dark:shadow-lg border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 hover:shadow-lg dark:hover:shadow-xl">
		<button
		  className={`relative ${
			activeView === "classic" && !isMapActive
			  ? "bg-theme-primary text-white shadow-md transform scale-105"
			  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
		  } rounded-md p-1 transition-all duration-300 ease-out transform ${
			hovered === "classic" && (activeView !== "classic" || isMapActive)
			  ? "scale-110 shadow-xs"
			  : ""
		  } focus:outline-hidden focus:ring-1 focus:ring-theme-primary dark:focus:ring-theme-primary/50 focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-gray-800 flex items-center justify-center`}
		  onClick={() => handleViewChange("classic")}
		  onMouseEnter={() => setHovered("classic")}
		  onMouseLeave={() => setHovered(null)}
		  onFocus={() => setHovered("classic")}
		  onBlur={() => setHovered(null)}
		  aria-label="Switch to list view"
		>
		  <div
			className={`transition-all duration-300 w-4 h-4 flex items-center justify-center ${activeView === "classic" && !isMapActive ? "drop-shadow-xs" : ""}`}
		  >
			<IconClassic />
		  </div>
		  {hovered === "classic" && (
		    <div
			  className={`absolute bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-1 rounded-sm text-xs font-medium shadow-lg whitespace-nowrap pointer-events-none ${
			    isParentSticky ? 'top-full mt-2' : '-top-8'
			  }`}
		    >
			  List view
		    </div>
		  )}
		</button>

		<button
		  className={`relative ${
			activeView === "grid" && !isMapActive
			  ? "bg-theme-primary text-white shadow-md transform scale-105"
			  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
		  } rounded-md p-1 transition-all duration-300 ease-out transform ${
			hovered === "grid" && (activeView !== "grid" || isMapActive)
			  ? "scale-110 shadow-xs"
			  : ""
		  } focus:outline-hidden focus:ring-1 focus:ring-theme-primary dark:focus:ring-theme-primary focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-gray-800 flex items-center justify-center`}
		  onClick={() => handleViewChange("grid")}
		  onMouseEnter={() => setHovered("grid")}
		  onMouseLeave={() => setHovered(null)}
		  onFocus={() => setHovered("grid")}
		  onBlur={() => setHovered(null)}
		  aria-label="Switch to grid view"
		>
		  <div
			className={`transition-all duration-300 w-4 h-4 flex items-center justify-center ${activeView === "grid" && !isMapActive ? "drop-shadow-xs" : ""}`}
		  >
			<IconGrid />
		  </div>
		  {hovered === "grid" && (
		    <div
			  className={`absolute bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-1 rounded-sm text-xs font-medium shadow-lg whitespace-nowrap pointer-events-none ${
			    isParentSticky ? 'top-full mt-2' : '-top-8'
			  }`}
		    >
			  Grid view
		    </div>
		  )}
		</button>
		<button
		  className={`relative ${
			activeView === "masonry" && !isMapActive
			  ? "bg-theme-primary text-white shadow-md transform scale-105"
			  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
		  } rounded-md p-1 transition-all duration-300 ease-out transform ${
			hovered === "masonry" && (activeView !== "masonry" || isMapActive)
			  ? "scale-110 shadow-xs"
			  : ""
		  } focus:outline-hidden focus:ring-1 focus:ring-theme-primary dark:focus:ring-theme-primary focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-gray-800 flex items-center justify-center`}
		  onClick={() => handleViewChange("masonry")}
		  onMouseEnter={() => setHovered("masonry")}
		  onMouseLeave={() => setHovered(null)}
		  onFocus={() => setHovered("masonry")}
		  onBlur={() => setHovered(null)}
		  aria-label="Switch to masonry view"
		>
			<div
				className={`transition-all duration-300 w-4 h-4 flex items-center justify-center ${activeView === "masonry" && !isMapActive ? "drop-shadow-xs" : ""}`}
			>
				<IconMasonry />
			</div>
		  {hovered === "masonry" && (
		    <div
			  className={`absolute bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-1 rounded-sm text-xs font-medium shadow-lg whitespace-nowrap pointer-events-none ${
			    isParentSticky ? 'top-full mt-2' : '-top-8'
			  }`}
		    >
			  Masonry view
		    </div>
		  )}
		</button>
		{isMapAvailable && (
		<button
		  className={`relative ${
			isMapActive
			  ? "bg-theme-primary text-white shadow-md transform scale-105"
			  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
		  } rounded-md p-1 transition-all duration-300 ease-out transform ${
			hovered === "map" && !isMapActive
			  ? "scale-110 shadow-xs"
			  : ""
		  } focus:outline-hidden focus:ring-1 focus:ring-theme-primary dark:focus:ring-theme-primary focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-gray-800 flex items-center justify-center`}
		  onClick={onMapToggle}
		  onMouseEnter={() => setHovered("map")}
		  onMouseLeave={() => setHovered(null)}
		  onFocus={() => setHovered("map")}
		  onBlur={() => setHovered(null)}
		  aria-label="Switch to map view"
		>
		  <div
			className={`transition-all duration-300 w-4 h-4 flex items-center justify-center ${isMapActive ? "drop-shadow-xs" : ""}`}
		  >
			<IconMap />
		  </div>
		  {hovered === "map" && (
		    <div
			  className={`absolute bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-1 rounded-sm text-xs font-medium shadow-lg whitespace-nowrap pointer-events-none ${
			    isParentSticky ? 'top-full mt-2' : '-top-8'
			  }`}
		    >
			  Map view
		    </div>
		  )}
		</button>
		)}
	  </div>
	</div>
  );
}
