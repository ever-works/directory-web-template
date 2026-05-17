"use client";

import { memo, useState } from "react";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsModal } from "@/hooks/use-settings-modal";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";

// Visual treatment matches the `SettingsCard` icon container on `/client/settings`
// (tinted theme-primary square, 8x8 wrapper, 4x4 icon, theme-primary-600/400 ink).
// See `apps/web/app/[locale]/client/settings/settings-content.tsx`.
const BUTTON_CLASSES = cn(
	"relative inline-flex items-center justify-center",
	"h-9 w-9",
	"rounded-lg",
	"transition-colors duration-150",
	"cursor-pointer",
	"group"
);

const ICON_WRAPPER_CLASSES = cn(
	"w-8 h-8",
	"flex items-center justify-center",
	"rounded-lg",
	"bg-theme-primary-50 dark:bg-theme-primary-900/30",
	"group-hover:bg-theme-primary-100 dark:group-hover:bg-theme-primary-800/40",
	"transition-colors duration-150"
);

const ICON_CLASSES = cn(
	"w-4 h-4",
	"text-theme-primary-600 dark:text-theme-primary-400"
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
				<span className={ICON_WRAPPER_CLASSES}>
					<Settings className={ICON_CLASSES} />
				</span>
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
