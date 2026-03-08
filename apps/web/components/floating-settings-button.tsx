"use client";

import { memo } from "react";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettingsModal } from "@/hooks/use-settings-modal";
import { useTranslations } from "next-intl";

const BUTTON_CLASSES = cn(
	"fixed bottom-24 right-6",
	"w-12 h-12",
	"flex items-center justify-center",
	"bg-theme-primary hover:bg-theme-primary-600",
	"text-white",
	"rounded-full",
	"shadow-lg hover:shadow-xl",
	"hover:scale-110",
	"transition-all duration-300",
	"z-[60]",
	"cursor-pointer",
	"group"
);

const TOOLTIP_CLASSES = cn(
	"absolute right-full mr-3",
	"px-3 py-2",
	"bg-gray-900 dark:bg-gray-700",
	"text-white text-sm font-medium",
	"rounded-lg shadow-lg",
	"whitespace-nowrap",
	"opacity-0 group-hover:opacity-100",
	"transition-opacity duration-200",
	"pointer-events-none"
);

function FloatingSettingsButtonComponent() {
	const { openModal } = useSettingsModal();
	const t = useTranslations("settings");

	return (
		<button
			onClick={openModal}
			className={BUTTON_CLASSES}
			aria-label={t("OPEN_SETTINGS")}
			type="button"
		>
			<Settings className="h-6 w-6" />
			{/* Tooltip - visibility controlled by CSS group-hover */}
			<span className={TOOLTIP_CLASSES}>
				{t("SETTINGS")}
			</span>
		</button>
	);
}

export const FloatingSettingsButton = memo(FloatingSettingsButtonComponent);
FloatingSettingsButton.displayName = "FloatingSettingsButton";
