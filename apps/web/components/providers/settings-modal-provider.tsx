"use client";

import { createContext, useState, useCallback, useEffect, useRef, PropsWithChildren } from "react";

export interface SettingsModalContextValue {
	isOpen: boolean;
	openModal: () => void;
	closeModal: () => void;
	toggleModal: () => void;
}

export const SettingsModalContext = createContext<SettingsModalContextValue | null>(null);

export function SettingsModalProvider({ children }: PropsWithChildren) {
	const [isOpen, setIsOpen] = useState(false);
	const previouslyFocusedElement = useRef<HTMLElement | null>(null);

	const openModal = useCallback(() => {
		// Store the currently focused element before opening modal
		previouslyFocusedElement.current = document.activeElement as HTMLElement;
		setIsOpen(true);
	}, []);

	const closeModal = useCallback(() => {
		setIsOpen(false);
		// Restore focus to the previously focused element
		if (previouslyFocusedElement.current) {
			previouslyFocusedElement.current.focus();
			previouslyFocusedElement.current = null;
		}
	}, []);

	const toggleModal = useCallback(() => {
		setIsOpen((prev) => !prev);
	}, []);

	// Handle Escape key to close modal globally
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				closeModal();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleKeyDown);
			// Prevent body scroll when modal is open
			document.body.style.overflow = "hidden";

			return () => {
				document.removeEventListener("keydown", handleKeyDown);
				document.body.style.overflow = "";
			};
		}
	}, [isOpen, closeModal]);

	return (
		<SettingsModalContext.Provider value={{ isOpen, openModal, closeModal, toggleModal }}>
			{children}
		</SettingsModalContext.Provider>
	);
}
