---
id: spec-059-collection-item-list
title: Spec 059 — Collection page item list in structured data
sidebar_label: 059 Collection item list
---

# Feature spec — `059-collection-item-list`

> **Status:** in-progress (shipped in code; not yet checked against a live page)

## 1. Summary

A collection page (`/collections/{slug}`) lists its items in its `CollectionPage`
JSON-LD as `ItemList` → `itemListElement`: ordered `ListItem` entries with the
item's name and its item-page URL.

## 2. Motivation

The page's structured data only carried `numberOfItems`, so a search engine
learned that a collection holds N listings but not which ones. Naming them lets
the collection page be understood as a curated list of the item pages.

## 3. Requirements

- **R1.** Each item shown on the page becomes a `ListItem` with a 1-based `position`
  (page order), `name` and `url` (the localized item page, `/items/{slug}`).
- **R2.** Entries with a blank name or URL are dropped before positions are assigned.
- **R3.** At most 50 entries are listed (`MAX_COLLECTION_SCHEMA_ITEMS`), so a large
  collection cannot bloat the HTML. `numberOfItems` still states the true count.
- **R4.** With no items passed, the output is unchanged (`numberOfItems` only, or no
  `mainEntity` without a count).
- **R5.** No new route, setting, dependency or outbound call.

## 4. Out of scope

- `ItemList` on category and home listings.
- Page-by-page splitting of collections over 50 items.
