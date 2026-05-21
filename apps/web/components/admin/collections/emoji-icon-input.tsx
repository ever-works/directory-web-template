"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMOJI_DATA, EmojiEntry, findEmojiByName, searchEmojis } from "./emoji-data";

const RECENT_KEY = "evw_admin_collections_recent_emojis_v1";
const RECENT_LIMIT = 16;
const RESULT_LIMIT = 28;

// Match the last `:query` token at the end of the input. The leading `:` may
// sit at the very start of the value or be preceded by whitespace, mirroring
// how GitHub / Discord triggers their pickers.
const COLON_TRIGGER = /(?:^|\s):([a-z0-9_-]*)$/i;
const URL_PATTERN = /^(?:https?:\/\/|\/|data:image\/)/i;

function isLikelyUrl(value: string): boolean {
	return URL_PATTERN.test(value.trim());
}

function loadRecent(): string[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(RECENT_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((x): x is string => typeof x === "string").slice(0, RECENT_LIMIT);
	} catch {
		return [];
	}
}

function saveRecent(list: readonly string[]): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_LIMIT)));
	} catch {
		// quota / private mode — non-fatal
	}
}

function recentEntry(char: string): EmojiEntry {
	const known = EMOJI_DATA.find((e) => e.char === char);
	return known ?? { char, name: "recent", keywords: [] };
}

export interface EmojiIconInputProps {
	value: string;
	onChange: (next: string) => void;
	placeholder?: string;
	disabled?: boolean;
	id?: string;
	inputClassName?: string;
	"aria-label"?: string;
	"aria-describedby"?: string;
}

export function EmojiIconInput({
	value,
	onChange,
	placeholder,
	disabled,
	id,
	inputClassName,
	"aria-label": ariaLabel,
	"aria-describedby": ariaDescribedBy,
}: EmojiIconInputProps) {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLUListElement>(null);

	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);
	const [recent, setRecent] = useState<readonly string[]>([]);
	// Defer reads of localStorage until after mount to avoid SSR mismatch.
	useEffect(() => {
		setRecent(loadRecent());
	}, []);

	// Derive the colon-triggered query straight from `value` rather than
	// storing it in state — keeps a single source of truth.
	const colonMatch = useMemo(() => COLON_TRIGGER.exec(value), [value]);
	const query = colonMatch ? colonMatch[1] : "";
	const deferredQuery = useDeferredValue(query);

	const suggestions = useMemo<EmojiEntry[]>(() => {
		if (deferredQuery.length > 0) {
			return searchEmojis(deferredQuery, RESULT_LIMIT);
		}
		// Bare `:` — show recent first, then top picks not already in recent.
		const recentEntries = recent.map(recentEntry);
		const recentChars = new Set(recent);
		const filler = EMOJI_DATA.filter((e) => !recentChars.has(e.char)).slice(
			0,
			Math.max(0, RESULT_LIMIT - recentEntries.length)
		);
		return [...recentEntries, ...filler];
	}, [deferredQuery, recent]);

	// Open the popover whenever the user is in the middle of a `:query`.
	useEffect(() => {
		if (colonMatch) {
			setIsOpen(true);
			setActiveIndex(0);
		} else {
			setIsOpen(false);
		}
	}, [colonMatch]);

	// Reset activeIndex if the result list shrinks past the current cursor.
	useEffect(() => {
		if (activeIndex >= suggestions.length) {
			setActiveIndex(0);
		}
	}, [activeIndex, suggestions.length]);

	// Scroll the active option into view as the user arrows through.
	useEffect(() => {
		if (!isOpen || !listRef.current) return;
		const node = listRef.current.querySelector<HTMLElement>(
			`[data-emoji-index="${activeIndex}"]`
		);
		node?.scrollIntoView({ block: "nearest" });
	}, [activeIndex, isOpen]);

	// Click outside closes the popover. Use `mousedown` so it fires before
	// the input's blur runs the rest of the toolbar logic.
	useEffect(() => {
		if (!isOpen) return;
		function handleDocMouseDown(event: MouseEvent) {
			if (!wrapperRef.current) return;
			if (!wrapperRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}
		document.addEventListener("mousedown", handleDocMouseDown);
		return () => document.removeEventListener("mousedown", handleDocMouseDown);
	}, [isOpen]);

	const commitEmoji = useCallback(
		(entry: EmojiEntry) => {
			const replacement = entry.char;
			let next: string;
			if (colonMatch) {
				// Replace just the `:query` token; preserve any leading prefix.
				const matchStart = colonMatch.index ?? 0;
				const leading = value.slice(0, matchStart);
				// Skip the optional whitespace captured into the match boundary.
				const matchedText = colonMatch[0];
				const prefix =
					matchedText.length > 0 && /\s/.test(matchedText[0])
						? leading + matchedText[0]
						: leading;
				next = prefix + replacement;
			} else {
				// Direct click without `:query` (e.g. recent chip) replaces value
				// entirely so the field always represents a single icon.
				next = replacement;
			}
			onChange(next);
			setIsOpen(false);

			setRecent((prev) => {
				const filtered = prev.filter((c) => c !== replacement);
				const updated = [replacement, ...filtered].slice(0, RECENT_LIMIT);
				saveRecent(updated);
				return updated;
			});

			// Restore focus so the user can keep typing without re-clicking.
			window.requestAnimationFrame(() => inputRef.current?.focus());
		},
		[colonMatch, onChange, value]
	);

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (!isOpen || suggestions.length === 0) {
			// Pressing Escape with the picker closed should not eat the key.
			return;
		}

		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				setActiveIndex((i) => (i + 1) % suggestions.length);
				break;
			case "ArrowUp":
				event.preventDefault();
				setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
				break;
			case "Home":
				event.preventDefault();
				setActiveIndex(0);
				break;
			case "End":
				event.preventDefault();
				setActiveIndex(suggestions.length - 1);
				break;
			case "Enter":
			case "Tab": {
				// Tab also commits — matches GitHub.
				const choice = suggestions[activeIndex];
				if (choice) {
					event.preventDefault();
					commitEmoji(choice);
				}
				break;
			}
			case "Escape":
				event.preventDefault();
				setIsOpen(false);
				break;
			default:
				break;
		}
	};

	// `:shortname` exact match shortcut: if the user types `:rocket` and then
	// hits space, replace the token. We only auto-replace on a trailing space
	// so a fresh `:fire` stays editable while it's still a draft query.
	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const raw = event.target.value;
		const autoExpand = /(?:^|\s):([a-z0-9_-]+)(\s)$/i.exec(raw);
		if (autoExpand) {
			const hit = findEmojiByName(autoExpand[1]);
			if (hit) {
				const start = autoExpand.index ?? 0;
				const leading = raw.slice(0, start);
				const prefix =
					autoExpand[0].length > 0 && /\s/.test(autoExpand[0][0])
						? leading + autoExpand[0][0]
						: leading;
				onChange(prefix + hit.char);
				setRecent((prev) => {
					const updated = [hit.char, ...prev.filter((c) => c !== hit.char)].slice(0, RECENT_LIMIT);
					saveRecent(updated);
					return updated;
				});
				setIsOpen(false);
				return;
			}
		}
		onChange(raw);
	};

	const looksLikeUrl = isLikelyUrl(value);
	const showEmojiPreview = !looksLikeUrl && value.trim().length > 0;

	const listboxId = id ? `${id}-listbox` : "emoji-icon-listbox";
	const activeOptionId =
		isOpen && suggestions[activeIndex]
			? `${listboxId}-opt-${activeIndex}`
			: undefined;

	return (
		<div ref={wrapperRef} className="relative">
			<div className="flex items-stretch gap-2">
				<IconPreview value={value} looksLikeUrl={looksLikeUrl} showEmoji={showEmojiPreview} />
				<div className="relative flex-1">
					<input
						ref={inputRef}
						type="text"
						id={id}
						value={value}
						onChange={handleChange}
						onKeyDown={handleKeyDown}
						placeholder={placeholder ?? "🤖 or :rocket or https://…"}
						disabled={disabled}
						className={inputClassName}
						role="combobox"
						aria-expanded={isOpen}
						aria-controls={listboxId}
						aria-autocomplete="list"
						aria-activedescendant={activeOptionId}
						aria-label={ariaLabel}
						aria-describedby={ariaDescribedBy}
						spellCheck={false}
						autoComplete="off"
					/>
					<button
						type="button"
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => {
							if (disabled) return;
							if (isOpen) {
								setIsOpen(false);
							} else {
								// Insert a `:` if the value doesn't end in one already so the
								// trigger regex matches; otherwise just open.
								const trimmed = value.replace(/:\w*$/, "");
								const next =
									trimmed.length > 0 && !/\s$/.test(trimmed) ? trimmed + " :" : trimmed + ":";
								onChange(next);
								window.requestAnimationFrame(() => {
									inputRef.current?.focus();
									setIsOpen(true);
								});
							}
						}}
						aria-label={isOpen ? "Close emoji picker" : "Open emoji picker"}
						disabled={disabled}
						className={cn(
							"absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center",
							"w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
							"hover:bg-gray-100 dark:hover:bg-white/8",
							"transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400",
							"disabled:opacity-40 disabled:cursor-not-allowed"
						)}
					>
						<Smile className="w-4 h-4" aria-hidden="true" />
					</button>
				</div>
			</div>

			{isOpen && suggestions.length > 0 ? (
				<EmojiSuggestions
					listRef={listRef}
					listboxId={listboxId}
					suggestions={suggestions}
					activeIndex={activeIndex}
					query={query}
					hasRecent={!query && recent.length > 0}
					onHover={setActiveIndex}
					onSelect={commitEmoji}
				/>
			) : null}
		</div>
	);
}

function IconPreview({
	value,
	looksLikeUrl,
	showEmoji,
}: {
	value: string;
	looksLikeUrl: boolean;
	showEmoji: boolean;
}) {
	const baseClass =
		"shrink-0 w-10 h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/3 flex items-center justify-center overflow-hidden";

	if (looksLikeUrl) {
		return (
			<div className={baseClass} aria-hidden="true">
				<img
					src={value.trim()}
					alt=""
					className="w-full h-full object-cover"
					onError={(e) => {
						(e.currentTarget as HTMLImageElement).style.display = "none";
					}}
				/>
			</div>
		);
	}

	if (showEmoji) {
		return (
			<div className={cn(baseClass, "text-2xl leading-none")} aria-hidden="true">
				<span>{value.trim()}</span>
			</div>
		);
	}

	return (
		<div className={baseClass} aria-hidden="true">
			<ImageIcon className="w-4 h-4 text-gray-400" />
		</div>
	);
}

interface EmojiSuggestionsProps {
	listRef: React.RefObject<HTMLUListElement | null>;
	listboxId: string;
	suggestions: readonly EmojiEntry[];
	activeIndex: number;
	query: string;
	hasRecent: boolean;
	onHover: (index: number) => void;
	onSelect: (entry: EmojiEntry) => void;
}

function EmojiSuggestions({
	listRef,
	listboxId,
	suggestions,
	activeIndex,
	query,
	hasRecent,
	onHover,
	onSelect,
}: EmojiSuggestionsProps) {
	const active = suggestions[activeIndex];

	return (
		<div
			className={cn(
				"absolute z-50 left-0 right-0 mt-1.5",
				"rounded-xl border border-gray-200 dark:border-white/10",
				"bg-white dark:bg-[#1a1a1a] shadow-lg shadow-black/5 dark:shadow-black/40",
				"overflow-hidden"
			)}
		>
			<div className="px-3 py-1.5 border-b border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/2 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 flex items-center justify-between">
				<span>
					{query.length > 0
						? `Search :${query}`
						: hasRecent
						? "Recent"
						: "Pick an emoji"}
				</span>
				<span className="text-gray-400 dark:text-gray-500 normal-case tracking-normal">
					{suggestions.length} {suggestions.length === 1 ? "match" : "matches"}
				</span>
			</div>
			<ul
				ref={listRef}
				role="listbox"
				id={listboxId}
				className="max-h-56 overflow-y-auto p-1.5 grid grid-cols-8 gap-0.5"
			>
				{suggestions.map((entry, idx) => {
					const isActive = idx === activeIndex;
					return (
						<li
							key={`${entry.char}-${idx}`}
							role="option"
							id={`${listboxId}-opt-${idx}`}
							data-emoji-index={idx}
							aria-selected={isActive}
							onMouseEnter={() => onHover(idx)}
							onMouseDown={(e) => {
								// Prevent input blur before click handler fires.
								e.preventDefault();
								onSelect(entry);
							}}
							className={cn(
								"cursor-pointer flex items-center justify-center text-xl leading-none",
								"w-9 h-9 rounded-lg select-none",
								"transition-colors duration-75",
								isActive
									? "bg-gray-900/8 dark:bg-white/12 ring-1 ring-gray-900/10 dark:ring-white/20"
									: "hover:bg-gray-100 dark:hover:bg-white/6"
							)}
							title={`:${entry.name}:`}
						>
							<span aria-hidden="true">{entry.char}</span>
							<span className="sr-only">{entry.name}</span>
						</li>
					);
				})}
			</ul>
			{active ? (
				<div className="px-3 py-2 border-t border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/2 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
					<span className="text-base leading-none" aria-hidden="true">
						{active.char}
					</span>
					<span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
						:{active.name}:
					</span>
					<span className="ml-auto text-[11px] text-gray-400 dark:text-gray-500">
						↵ insert · esc close
					</span>
				</div>
			) : null}
		</div>
	);
}
