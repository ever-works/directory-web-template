"use client";

import { memo, useState } from "react";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsModal } from "@/hooks/use-settings-modal";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";

const BUTTON_CLASSES = cn(
	"flex items-center gap-1.5",
	"transition-all duration-200",
	"font-medium whitespace-nowrap",
	"text-sm lg:text-base xl:text-lg",
	"text-gray-700 dark:text-gray-300",
	"hover:text-theme-primary dark:hover:text-theme-primary",
	"hover:scale-105",
	"cursor-pointer"
);

function SettingsButtonComponent() {
	const { openModal } = useSettingsModal();
	const t = useTranslations("settings");
	const [hovered, setHovered] = useState(false);
	const [pos, setPos] = useState({ top: 0, left: 0 });

	const showTooltip = (btn: HTMLButtonElement) => {
		const r = btn.getBoundingClientRect();
		setPos({ top: r.bottom + 8, left: r.left + r.width / 2 });
		setHovered(true);
	};

	const hideTooltip = () => setHovered(false);

	return (
		<>
			<button
				onClick={() => {
					hideTooltip();
					openModal();
				}}
				onMouseEnter={(e) => showTooltip(e.currentTarget as HTMLButtonElement)}
				onMouseLeave={hideTooltip}
				onFocus={(e) => showTooltip(e.currentTarget as HTMLButtonElement)}
				onBlur={hideTooltip}
				className={BUTTON_CLASSES}
				aria-label={t("OPEN_SETTINGS")}
				type="button"
			>
				<Settings className="h-4 w-4 lg:h-5 lg:w-5" />
			</button>
			{hovered && typeof document !== 'undefined' && createPortal(
				<div
					className="fixed z-[9999] px-2 py-1 rounded-lg shadow-xl text-xs font-medium border pointer-events-none bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-800 dark:border-gray-300"
					style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
				>
					{t("SETTINGS")}
				</div>, document.body)
			}
		</>
	);
}

export const SettingsButton = memo(SettingsButtonComponent);
SettingsButton.displayName = "SettingsButton";
