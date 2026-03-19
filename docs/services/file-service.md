---
id: file-service
title: "File Service Deep Dive"
sidebar_label: "File Service"
sidebar_position: 43
---

# File Service

## Overview

The File Service is a generic, reusable YAML file persistence layer that provides full CRUD operations, backup management, translation support, and positional insertion for any data type stored in YAML files. It follows the Single Responsibility Principle and is designed as a class-based service (`FileService<T>`) with a factory function for easy instantiation. This is the foundation for all file-based content storage in the template.

## Architecture

The File Service operates at the filesystem level, reading and writing YAML files within a configurable base directory (defaults to the content directory). It is a server-only module (marked with `"server-only"`) and uses Node.js `fs` APIs directly. The class is generic (`FileService<T extends YamlData>`) so it can be reused for any data shape that has an `id` field.

```
Any Service Needing File Persistence
        |
   file.service.ts (FileService<T>)
        |
   +-------+--------+
   | YAML  | Backup  |
   | Files | Files   |
   +-------+--------+
        |
   Content Directory (.content/)
```

## API Reference

### Types

#### `YamlData`

Base interface for all data stored in YAML files.

```typescript
interface YamlData {
  id: string;
  [key: string]: any;
}
```

#### `FileServiceConfig`

Configuration options for creating a `FileService` instance.

```typescript
interface FileServiceConfig {
  baseDir?: string;        // Default: content directory
  extension?: string;      // Default: '.yml'
  createBackups?: boolean; // Default: true
  backupDir?: string;      // Default: baseDir/backups
  yamlOptions?: {
    indent?: number;       // Default: 2
    lineWidth?: number;    // Default: 0 (no wrapping)
    minContentWidth?: number; // Default: 0
  };
}
```

### Constructor

#### `new FileService<T>(fileName: string, config?: FileServiceConfig)`

Creates a new file service instance for a specific YAML file.

### Core CRUD Methods

#### `read(lang?: string): Promise<T[]>`

Reads all data from the YAML file. Optionally applies translations for non-English languages by merging data from a language-specific file (e.g., `items.fr.yml`).

---

#### `write(data: T[], createBackup?: boolean): Promise<void>`

Writes data to the YAML file, replacing all existing content. Optionally creates a backup first.

---

#### `findById(id: string): Promise<T | null>`

Finds a single item by its `id` field.

---

#### `findBy(criteria: Partial<T>): Promise<T[]>`

Finds items matching all key-value pairs in the criteria object (AND logic).

---

#### `updateById(id: string, updatedData: Partial<T>, createBackup?: boolean): Promise<T | null>`

Updates a single item by merging the provided partial data. Returns the updated item or `null` if not found.

---

#### `deleteById(id: string, createBackup?: boolean): Promise<boolean>`

Deletes a single item by `id`. Returns `true` if the item was found and removed.

---

#### `clear(createBackup?: boolean): Promise<void>`

Removes all data from the file (writes an empty array).

### Item Addition Methods

#### `addItem(item: T, createBackup?: boolean): Promise<void>`

Adds a single item. If an item with the same `id` exists, it is updated (merge) instead of creating a duplicate.

---

#### `addItems(items: T[], createBackup?: boolean, skipDuplicates?: boolean): Promise<{ added: number; updated: number; skipped: number }>`

Batch-adds multiple items with configurable duplicate handling. Returns a summary of operations.

---

#### `addItemAt(item: T, position: number, createBackup?: boolean): Promise<void>`

Inserts an item at a specific zero-based position. If the item already exists, it is moved to the new position.

---

#### `addItemFirst(item: T, createBackup?: boolean): Promise<void>`

Adds an item to the beginning of the list.

---

#### `addItemLast(item: T, createBackup?: boolean): Promise<void>`

Adds an item to the end of the list.

---

#### `addItemAfter(item: T, afterId: string, createBackup?: boolean): Promise<boolean>`

Inserts an item after another item identified by `afterId`. Returns `false` if the reference item is not found.

---

#### `addItemBefore(item: T, beforeId: string, createBackup?: boolean): Promise<boolean>`

Inserts an item before another item identified by `beforeId`. Returns `false` if the reference item is not found.

---

#### `addItemsIfFileExists(items: T[], createBackup?: boolean): Promise<{ added: number; skipped: number; fileNotFound: boolean }>`

Adds items only if the target file already exists. Skips duplicates (by `id`) without overwriting.

---

#### `addContentToExistingFile(items: T[], createBackup?: boolean): Promise<{ added: number; fileNotFound: boolean }>`

Appends items to an existing file without any duplicate checking. Fastest bulk insert option.

---

#### `append(newData: T[], createBackup?: boolean): Promise<void>`

Appends data to the end of the file (reads existing + appends + writes).

### Backup and Utility Methods

#### `createBackup(customTimestamp?: string): Promise<string>`

Creates a timestamped backup copy of the current file. Returns the backup file path.

---

#### `fileExists(): Promise<boolean>`

Checks whether the underlying YAML file exists.

---

#### `getStats(): Promise<{ size: number; lastModified: Date; itemCount: number }>`

Returns file size, last modified date, and total item count.

---

#### `getDirectoryInfo(): Promise<object>`

Returns directory paths, existence status, and file existence for diagnostics.

---

#### `createDirectories(createBackupDir?: boolean): Promise<void>`

Ensures that the base directory and optionally the backup directory exist.

### Factory Function

#### `createFileService<T>(fileName: string, config?: FileServiceConfig): FileService<T>`

Creates a new `FileService` instance. Convenience wrapper around the constructor.

## Implementation Details

- **Backup-by-default:** All write operations create a backup before modifying the file, unless explicitly disabled. Backups are stored in a `backups/` subdirectory with ISO timestamps in the filename.
- **Translation overlay:** When a language parameter is passed to `read()`, the service looks for a translation file (e.g., `items.fr.yml`) and merges translated fields on top of the base data, matched by `id`.
- **Positional insertion:** Methods like `addItemAt`, `addItemFirst`, `addItemAfter` support precise ordering, which is important for curated content lists where display order matters.
- **Upsert semantics:** `addItem` uses upsert logic -- existing items (matched by `id`) are merged, new items are appended.
- **YAML formatting:** The default YAML options disable line wrapping (`lineWidth: 0`) to prevent unexpected line breaks in content fields.
- **Path safety:** `path.basename()` is used to sanitize the file name, preventing directory traversal attacks.

## Database Interactions

This service does **not** interact with a database. It is a pure filesystem service operating on YAML files within the content directory.

## Error Handling

- `read()` returns an empty array for missing files (`ENOENT` errors are caught).
- All other file operations throw descriptive errors with the pattern: `Failed to [operation] [fileName]: [error message]`.
- Translation failures are logged as warnings but do not prevent the base data from being returned.
- The private `isFileNotFoundError` method checks for Node.js `ENOENT` error codes.

## Usage Examples

```typescript
import { FileService, createFileService } from '@/lib/services/file.service';

// Define your data type
interface Tool extends YamlData {
  id: string;
  name: string;
  category: string;
  url: string;
}

// Create a service instance
const toolService = createFileService<Tool>('tools');

// Read all tools
const tools = await toolService.read();

// Read with French translations
const toolsFr = await toolService.read('fr');

// Add a new tool at the top of the list
await toolService.addItemFirst({
  id: 'new-tool',
  name: 'New Tool',
  category: 'productivity',
  url: 'https://newtool.com',
});

// Find tools by category
const productivityTools = await toolService.findBy({ category: 'productivity' });

// Update a tool
await toolService.updateById('new-tool', { name: 'Updated Tool Name' });

// Get file statistics
const stats = await toolService.getStats();
console.log(`${stats.itemCount} items, last modified: ${stats.lastModified}`);
```

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| Content directory path | Yes | Set via `getContentPath()` from `lib/lib` (typically `.content/`) |

Custom configuration can be passed via `FileServiceConfig` at instantiation time.

## Related Services

- [Content Services](./content-services.md) -- Built on top of the File Service for content management
- [Category Service](./category-service.md) -- Uses file-based persistence for categories
- [Tag Service](./tag-service.md) -- Uses file-based persistence for tags
- [Git Operations](./git-operations.md) -- Git-backed content versioning that works alongside file operations
