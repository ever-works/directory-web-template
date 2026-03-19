"use client";

import { useContext } from "react";
import { SettingsModalContext, type SettingsModalContextValue } from "@/components/providers/settings-modal-provider";

export function useSettingsModal(): SettingsModalContextValue {
	const context = useContext(SettingsModalContext);
	if (!context) {
		throw new Error("useSettingsModal must be used within SettingsModalProvider");
	}
	return context;
}
