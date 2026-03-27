🌐 [Português](../../pt-br/architecture/cache-system.md) | **English** | 🏠 [Index](../index.md)

---

# Cache System

`moodle-dev-mcp` uses a cache system based on **mtime** (file modification time) to avoid regenerating context files unnecessarily. Without caching, every call to `update_indexes` or `generate_plugin_context` would reprocess all PHP and XML files in the installation — regardless of whether they changed or not.

---

## How it works

The cache compares the modification date (`mtime`) of each PHP/XML source file with the corresponding context `.md` file:

```

PHP/XML File (source)         .md File (output)
│                               │
│  mtime: 2024-04-20 10:00      │  mtime: 2024-04-21 09:00
│                               │
└──────────── comparison ───────┘
│
source older than output?
│            │
YES           NO
│             │
SKIP          REGENERATE
(skipped: true)  (writes .md)

```

**Three possible results per file:**

| Result   | Condition                                          | Counted as     |
| -------- | -------------------------------------------------- | -------------- |
| **Hit**  | File has already been marked fresh in this session | `cache.hits`   |
| **Skip** | All sources are older than the output              | `cache.skips`  |
| **Miss** | Output does not exist or some source is newer      | `cache.misses` |

---

## Implementation

The cache is implemented in the `MtimeCache` class in `src/cache.ts`. A single shared instance — `globalCache` — is used by all generators in the process.

```typescript
class MtimeCache {
  // In-memory map: path of the .md file → timestamp when it was marked
  private readonly marked = new Map<string, number>();
  private stats: CacheStats = { hits: 0, misses: 0, skips: 0 };

  isStale(outputFile: string, sourceFiles: string[]): boolean { ... }
  mark(outputFile: string): void { ... }
  invalidate(outputFile: string): void { ... }
  invalidateAll(): void { ... }
  getStats(): CacheStats { ... }
}

export const globalCache = new MtimeCache();
```

### `isStale()` logic

The regeneration decision follows this sequence:

```
1. Does the output .md file exist?
   NO → miss (regenerate)
   YES → continue

2. Has the file already been marked fresh in this session (marked.has)?
   YES → hit (skip)
   NO → continue

3. Is any source file newer than the output?
   YES → miss (regenerate)
   NO → skip (skip)
```

### Monitored source files

**For global files** (`getMoodleSourcePatterns`):

```
{moodlePath}/version.php
{moodlePath}/lib/moodlelib.php
{moodlePath}/lib/accesslib.php
```

**For plugin files** (`getPluginSourceFiles`):

```
version.php
lib.php
locallib.php
db/install.xml
db/access.php
db/events.php
db/tasks.php
db/services.php
db/upgrade.php
db/hooks.php
```

If a source file does not exist, it is simply ignored in the comparison — it does not cause an error.

---

## In-memory cache: session vs restart

The cache is **exclusively in-memory** — there is no cache file persisted on disk. This has important consequences:

| Situation                                           | Behavior                                                   |
| --------------------------------------------------- | ---------------------------------------------------------- |
| First execution after starting the server           | Cold cache — all files are checked via mtime               |
| Second call in the same session for the same plugin | Warm cache — files marked as fresh are skipped immediately |
| Server restart (MCP restarted)                      | Cold cache again — no state persists between sessions      |

**Why not persist the cache?**
In-memory cache is the safest default: it eliminates the risk of outdated cache after Moodle upgrades, manual file changes or installation changes. The cost of checking disk mtime on the first run is low compared to the risk of serving outdated context.

---

## Cache invalidation

### By `force=true`

When the user requests forced regeneration, the `update_indexes` tool calls `globalCache.invalidateAll()` before starting the generators:

```typescript
if (force) globalCache.invalidateAll();
```

This clears the `marked` map — all files are treated as if they had never been generated in this session, forcing the mtime comparison for each one.

### Per individual file

The `update_indexes` tool also invalidates specific plugin files when necessary:

```typescript
if (force) {
    globalCache.invalidate(`${pluginDir}/PLUGIN_AI_CONTEXT.md`);
    // ...
}
```

This allows forcing regeneration of a specific plugin without invalidating the cache of the entire installation.

---

## Cache statistics

`globalCache` accumulates statistics throughout the entire session. The `doctor` tool exposes these statistics in the health report:

```
Cache stats:
  hits:   42   ← files skipped because they were marked fresh
  skips:  18   ← files skipped by mtime (sources older)
  misses:  7   ← files regenerated (sources newer or missing .md)
```

**How to interpret:**

- **Many hits:** watch mode is active or `update_indexes` was called multiple times in the same session
- **Many skips:** the installation is stable — few PHP files have been modified
- **Many misses:** first execution, or many files were changed (e.g. Moodle upgrade)

---

## Interaction with watch mode

`watcher.ts` uses `watch_plugins` to monitor file changes in real time. When a PHP file is saved inside a dev plugin, the watcher:

1. Detects the `change` event via `fs.watch()`
2. Calls `globalCache.invalidate()` for the corresponding `.md` file
3. Triggers `generateAllForPlugin()` for the modified plugin

This ensures the context always reflects the most recent state of the code without requiring manual intervention.

---

## See also

- [Extractors](./extractors.md) — the modules whose results the cache avoids recalculating
- [Generators](./generators.md) — where `isStale()` and `mark()` are called
- [Tools Reference](../reference/tools.md) — `update_indexes` (`force`) and `doctor` (stats)

---

[🏠 Back to Index](../index.md)
