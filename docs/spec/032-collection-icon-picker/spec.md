---
id: spec-032-collection-icon-picker
title: 'Spec 032 — Collection Icon Picker (Create Collection modal)'
sidebar_label: '032 Collection Icon Picker'
---

# Feature spec — `032-collection-icon-picker`

> **Status:** in-progress.
>
> **Owner:** Template maintainers.
>
> **Constitution articles invoked:** III (Spec Before Code),
> V (Performance Budget), IX (Test Coverage Bar — Definition of Done).
>
> **Jira:** [EW-646](https://evertech.atlassian.net/browse/EW-646).
>
> **PR:** [#920](https://github.com/ever-works/directory-web-template/pull/920).

## 1. Summary

`/admin/collections` lets admins create or edit a Collection. The
**Icon (emoji or URL)** field on the Create / Edit modal is currently
a bare `<input>` — admins are expected to either paste a single emoji
character or type/paste an image URL. There is no discovery affordance
for emojis (no preview, no list, no shortcode autocomplete), so most
collections ship without an icon or with an inconsistent one.

Spec 030 introduces a co-located **`EmojiIconInput`** component that
replaces the bare input. Typing `:` opens a GitHub-/Discord-style
suggestion popover; existing URL input behaviour is preserved
unchanged.

## 2. Motivation

- Discoverability: admins can't find or remember Unicode emoji glyphs
  without leaving the app.
- Consistency: a curated `:shortname` keyword index keeps usage
  predictable across collections.
- UX symmetry: the platform Items admin (EW-395 / EW-400) already
  trends toward richer in-modal pickers; the Collections modal is the
  current outlier.
- Zero new dependencies: an emoji library would blow the
  spec 018 performance budget. A small static dataset keeps the cost
  in single-digit KB gzipped.

## 3. Goals

- Authenticated admin opening the Create or Edit Collection modal sees:
  - A 40×40 preview tile to the **left** of the icon input, showing
    the current value as an emoji glyph, an `<img>` (when the value
    looks like a URL), or a neutral placeholder.
  - A trailing 😄 toggle inside the input that opens the picker
    without requiring the keyboard.
- Typing `:` (at the start of the value or after whitespace) opens a
  popover anchored below the field with:
  - A header chip showing the active query (`Search :ro`, `Recent`,
    or `Pick an emoji`) and the match count.
  - A grid of up to **28** suggestions, 8 per row, with hover and
    active states (current focus highlighted with a ring + filled
    background, hover with a subtle bg tint, both dark-mode aware).
  - A footer line that previews the selected emoji's `:shortname:` and
    surfaces the keyboard hint (`↵ insert · esc close`).
- Keyboard navigation:
  - **ArrowDown / ArrowUp** — cycle through suggestions (wrap-around).
  - **Home / End** — jump to first / last.
  - **Enter or Tab** — commit the active suggestion.
  - **Escape** — close the popover without changing the value.
- Exact-shortname auto-replace: typing `:rocket ` (note the trailing
  space) replaces the matched `:rocket` token with `🚀` immediately,
  without opening the popover.
- Recent emojis: last **16** picks are persisted in `localStorage`
  under `evw_admin_collections_recent_emojis_v1` (Vercel Best
  Practices rule `client-localstorage-schema`: versioned key, single
  short string per entry, no PII). Shown first when the user opens the
  picker with a bare `:`.
- URL passthrough:
  - `https://…`, `/relative…`, and `data:image/…` values are detected
    and rendered through the preview tile via `<img>`.
  - The picker does **not** open for URL-shaped values — typing or
    pasting a URL behaves exactly as today.
- Debounced / non-blocking search: the search input feeds
  `useDeferredValue` so the field stays responsive even if the
  curated dataset grows.
- Accessibility:
  - Input wired as a `role="combobox"` with `aria-expanded`,
    `aria-controls`, `aria-autocomplete="list"`, and
    `aria-activedescendant`.
  - Each option carries `role="option"`, a stable `id`, and a visible
    title plus a screen-reader-only short name.
  - Trailing 😄 toggle has its own `aria-label` and toggles on click.
- Dark mode parity with the rest of the modal — every surface uses the
  shared neutral tokens already in the form (`bg-white dark:bg-[#1a1a1a]`,
  `border-gray-200 dark:border-white/10`, etc.). No new colours.

## 4. Non-Goals

- **No new dependency** on `emoji-mart`, `emojibase`, `unicode-emoji-json`,
  or similar. The bundled list is hand-curated (~300 entries) and
  lives as a single TypeScript module.
- **No backend changes.** `icon_url` continues to store either a raw
  emoji string or a URL — the picker is presentational only.
- **No image upload flow.** Pasting an external URL stays the only
  way to supply a non-emoji icon (an upload affordance can be a
  follow-up spec if needed).
- **No tone / skin-colour variants.** A single representative glyph
  per concept keeps the list and ranking simple; can be revisited.
- **No re-skin of `collection-form.tsx`.** Only the Icon field is
  touched. Other fields (Collection ID, Name, Description, Active
  toggle, footer buttons) are untouched.
- **No global picker primitive** under `apps/web/components/ui/`.
  The user explicitly chose **co-located** in
  `apps/web/components/admin/collections/` for this iteration; it can
  be promoted to a shared component once a second consumer needs it.

## 5. Implementation overview

Two new files, one edited file:

- `apps/web/components/admin/collections/emoji-data.ts` — the curated
  dataset (`EMOJI_DATA`), an O(1) by-name lookup
  (`findEmojiByName`), and the scored `searchEmojis(query, limit)`
  ranking helper.
- `apps/web/components/admin/collections/emoji-icon-input.tsx` — the
  `EmojiIconInput` component (combobox + suggestion grid +
  localStorage-backed recent list + URL passthrough preview).
- `apps/web/components/admin/collections/collection-form.tsx` —
  swap the bare `<input>` for `<EmojiIconInput>` and tweak the field
  hint copy.

### Ranking

`searchEmojis(query)` returns the dataset ordered by:

1. Exact name match.
2. Name starts with query.
3. Any keyword starts with query.
4. Name contains query.
5. Any keyword contains query.

Ties broken by `name.length` ascending so shorter shortnames bubble up.

### React 19 hooks

- `useDeferredValue` replaces a manual debounce — the search filter
  runs as a low-priority update, keeping the input snappy without the
  ceremony of `setTimeout` plumbing.
- The colon-trigger query is **derived** from `value` (not stored in
  state) per rule `rerender-derived-state-no-effect`. Single source of
  truth, no synchronization bug surface.
- Effects only run for genuinely external behaviours: open/close
  popover on trigger, scroll active option into view, outside-click
  to close, hydrate `recent` from `localStorage` post-mount.

## 6. Acceptance criteria

- [x] Typing `:` inside the icon input opens the suggestion popover.
- [x] Typing `:rocket` filters results to `🚀` (and related entries) at
      the top.
- [x] `ArrowDown`/`ArrowUp` cycles suggestions with visible focus.
- [x] `Enter` (or `Tab`) inserts the active emoji into the input;
      `Escape` closes without changing the value.
- [x] Selecting an emoji from the dropdown writes a single Unicode glyph
      to `icon_url` (suitable for submitting straight to the API).
- [x] Pasting `https://example.com/icon.png` keeps the URL intact and
      renders it through the preview tile.
- [x] Pasting `data:image/svg+xml;base64,…` is handled the same as a
      URL.
- [x] Recent emojis appear first when the user opens the picker with
      a bare `:`.
- [x] Component renders correctly in dark mode (every neutral surface
      has a `dark:` variant).
- [x] Field stays usable on mobile width (the suggestion grid scrolls
      and stays anchored to the input).
- [x] No new package added to `apps/web/package.json`.
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm build` pass on the PR.
      *(Filled in once CI reports.)*

## 7. Out of scope follow-ups

- Promote `EmojiIconInput` to `apps/web/components/ui/emoji-icon-input.tsx`
  once a second consumer surfaces (likely categories, tags).
- Image upload widget alongside URL paste (separate spec).
- Tone / skin variant selector for hand-and-people emojis.
- Localized shortname dictionaries (current dataset is English only).

## 8. Definition of Done checklist

- [x] Spec lives under `docs/spec/032-collection-icon-picker/`.
- [x] Indexed in `docs/spec/README.md`.
- [x] `docs/log.md` updated with date + spec + PR number once the PR
      is opened.
- [ ] PR includes the bundled component, the form swap, and this spec
      in the same commit set; reviewers see them together.
