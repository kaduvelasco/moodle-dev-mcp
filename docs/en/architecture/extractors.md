🌐 [Português](../../pt-br/architecture/extractors.md) | **English** | 🏠 [Index](../index.md)

---

# Extractors

**Extractors** are the modules responsible for reading and interpreting PHP and XML files from the Moodle installation. Each extractor specializes in a specific file type and produces structured data that the [Generators](./generators.md) transform into `.md` context files.

---

## Overview

```

src/extractors/
├── api.ts           ← lib/*.php
├── capabilities.ts  ← db/access.php
├── classes.ts       ← classes/**/*.php
├── events.ts        ← db/events.php
├── hooks.ts         ← db/hooks.php + classes/hook/
├── moodle-detect.ts ← version.php (Moodle root)
├── plugin.ts        ← version.php (plugin) + lang/
├── schema.ts        ← db/install.xml
├── services.ts      ← db/services.php
├── tasks.ts         ← db/tasks.php
└── upgrade.ts       ← db/upgrade.php

```

All extractors are pure functions: they receive a file or directory path, return structured data (validated with Zod where applicable), and **never write to disk** — this is exclusively the responsibility of the Generators.

---

## Reference table

| Extractor          | Source file                      | Produced data                                                              | Validation |
| ------------------ | -------------------------------- | -------------------------------------------------------------------------- | ---------- |
| `api.ts`           | `lib/*.php`                      | Functions with name, signature, PHPDoc visibility, `@since`, `@deprecated` | —          |
| `capabilities.ts`  | `db/access.php`                  | Capabilities with name, riskbitmask and archetypes                         | Zod        |
| `classes.ts`       | `classes/**/*.php`               | Classes, interfaces and traits with namespace and file                     | Zod        |
| `events.ts`        | `db/events.php`                  | Observers with eventname, callback and includefile                         | —          |
| `hooks.ts`         | `db/hooks.php` + `classes/hook/` | Hook API callbacks with hook class, callback and priority                  | —          |
| `moodle-detect.ts` | `version.php`                    | Moodle version (string and numeric)                                        | —          |
| `plugin.ts`        | `version.php` + `lang/`          | Type, name, component, version and display string                          | —          |
| `schema.ts`        | `db/install.xml`                 | Tables, fields, keys and indexes                                           | Zod        |
| `services.ts`      | `db/services.php`                | Web services with classname, methodname and capabilities                   | —          |
| `tasks.ts`         | `db/tasks.php`                   | Tasks with classname, type and schedule                                    | —          |
| `upgrade.ts`       | `db/upgrade.php`                 | History of steps with version and inferred description                     | —          |

---

## Details by extractor

### `api.ts` — Core functions

**Source file:** `lib/*.php` in the Moodle root and in selected subdirectories.

**Parsing strategy:** line-by-line reading with PHPDoc block accumulation. The extractor identifies `/** ... */` blocks immediately followed by a `function` declaration, extracts the signature and classifies visibility based on PHPDoc content:

| PHPDoc tag                      | Assigned visibility |
| ------------------------------- | ------------------- |
| `@deprecated`                   | `deprecated`        |
| `@internal`                     | `internal`          |
| `@access private` or `@private` | `private`           |
| No restrictive tag              | `public`            |
| No PHPDoc                       | `unverified`        |

**Produced data:**

```typescript
{
  name: string,
  signature: string,
  visibility: 'public' | 'deprecated' | 'internal' | 'private' | 'unverified',
  since: string | null,
  file: string
}
```

**Feeds:** `MOODLE_API_INDEX.md` via `generators/moodle.ts`.

---

### `schema.ts` — Database

**Source file:** `db/install.xml` of any plugin.

**Parsing strategy:** uses `fast-xml-parser` to convert XMLDB into a JavaScript object, followed by validation with Zod. The Zod schema silently rejects malformed tables without throwing exceptions, allowing the extractor to continue processing the rest of the file.

**Special case:** XMLDB format uses attributes such as `NOTNULL`, `SEQUENCE` and `NEXT` as strings `"true"`/`"false"` — the extractor normalizes them to booleans before returning.

**Produced data:**

```typescript
{
  tables: [{
    name: string,
    fields: [{ name, type, length, notnull, default, sequence }],
    keys:   [{ name, type, fields }],
    indexes:[{ name, unique, fields }]
  }]
}
```

**Feeds:** `PLUGIN_DB_TABLES.md` and `MOODLE_DB_TABLES_INDEX.md`.

---

### `events.ts` — Event observers

**Source file:** `db/events.php` of any plugin.

**Parsing strategy:** **block splitter** instead of simple regex. The text is divided into blocks delimited by `[` and `]`, and each block is parsed individually.

**Why block splitter?** Regex fails when there are inline comments, irregular line breaks or nested arrays — common patterns in real plugins. Block-based correlation is more robust.

**Produced data:**

```typescript
{
    observers: [
        {
            eventname: string,
            callback: string,
            includefile: string | null,
        },
    ];
}
```

**Feeds:** `PLUGIN_EVENTS.md` and `MOODLE_EVENTS_INDEX.md`.

---

### `hooks.ts` — Hook API (Moodle 4.3+)

**Source file:** `db/hooks.php` (registered callbacks) + `classes/hook/*.php` (hook definitions).

**Parsing strategy:** two distinct passes:

1. `db/hooks.php` — block splitter to extract callback records (hook class, callback class, priority)
2. `classes/hook/*.php` — PHP class reading to extract hook metadata (description, tags)

**Special case:** the extractor detects legacy callbacks from `lib.php` that have an equivalent in the Hook API and marks them with a migration warning — this information appears in `PLUGIN_CALLBACK_INDEX.md`.

**Produced data:**

```typescript
{
  callbacks: [{
    hookclass:  string,
    callback:   string,
    priority:   number
  }],
  hookDefinitions: [{
    classname:   string,
    description: string | null
  }]
}
```

**Feeds:** `PLUGIN_CALLBACK_INDEX.md` and `PLUGIN_DEPENDENCIES.md`.

---

### `capabilities.ts` — Capabilities

**Source file:** `db/access.php` of any plugin.

**Parsing strategy:** block splitter + Zod validation. The PHP file defines an array `$capabilities` with keys in the format `component:capabilityname` — the extractor normalizes the keys and validates the structure of each capability.

**Produced data:**

```typescript
{
    capabilities: [
        {
            name: string,
            riskbitmask: number,
            captype: string,
            archetypes: Record<string, number>,
        },
    ];
}
```

**Feeds:** `PLUGIN_DEPENDENCIES.md` and `MOODLE_CAPABILITIES_INDEX.md`.

---

### `classes.ts` — PHP classes

**Source file:** `classes/**/*.php` from any plugin or from the core.

**Parsing strategy:** line-by-line reading searching for `class`, `interface` and `trait` declarations, capturing the namespace via the `namespace` statement. Validated with Zod before returning.

**Produced data:**

```typescript
{
    classes: [
        {
            name: string,
            type: "class" | "interface" | "trait",
            namespace: string | null,
            file: string,
        },
    ];
}
```

**Feeds:** `MOODLE_CLASSES_INDEX.md`.

---

### `services.ts` — Web services

**Source file:** `db/services.php` of any plugin.

**Parsing strategy:** block splitter over the `$functions` array — each entry is parsed individually to extract `classname`, `methodname`, `description` and `capabilities`.

**Produced data:**

```typescript
{
    services: [
        {
            name: string,
            classname: string,
            methodname: string,
            capabilities: string,
        },
    ];
}
```

**Feeds:** `PLUGIN_ENDPOINT_INDEX.md` and `MOODLE_SERVICES_INDEX.md`.

---

### `tasks.ts` — Scheduled tasks

**Source file:** `db/tasks.php` of any plugin.

**Parsing strategy:** block splitter over the array returned by the PHP file, extracting `classname`, type and default schedule.

**Produced data:**

```typescript
{
    tasks: [
        {
            classname: string,
            type: "scheduled" | "adhoc",
            minute: string,
            hour: string,
            day: string,
            month: string,
            dayofweek: string,
        },
    ];
}
```

**Feeds:** `PLUGIN_DEPENDENCIES.md` and `MOODLE_TASKS_INDEX.md`.

---

### `upgrade.ts` — Upgrade history

**Source file:** `db/upgrade.php` of any plugin.

**Parsing strategy:** line-by-line reading searching for `if ($oldversion < X.Y.Z)` blocks, extracting the version and the step description comment when available.

**Produced data:**

```typescript
{
    steps: [
        {
            version: string,
            description: string | null,
        },
    ];
}
```

**Feeds:** `PLUGIN_DEPENDENCIES.md`.

---

### `moodle-detect.ts` — Moodle version

**Source file:** `version.php` in the Moodle root.

**Parsing strategy:** regex over variables `$version` (numeric, e.g. `2024042200`) and `$release` (string, e.g. `4.4 (Build: 20240422)`). Both are normalized for use in the context.

**Feeds:** `.moodle-mcp` configuration and `AI_CONTEXT.md` header.

---

### `plugin.ts` — Plugin metadata

**Source file:** plugin `version.php` + `lang/en/<component>.php`.

**Parsing strategy:** regex over `$plugin->component`, `$plugin->version` and `$plugin->requires`. Uses `utils/plugin-types.ts` (`PLUGIN_TYPE_TO_DIR` map) as the **single source of truth** to resolve the plugin type from the directory path — avoiding duplicated mappings that previously existed in 6 places before the refactor.

**Produced data:**

```typescript
{
  component:   string,
  type:        string,
  name:        string,
  version:     string,
  requires:    string,
  displayName: string | null
}
```

**Feeds:** `PLUGIN_CONTEXT.md` and `MOODLE_PLUGIN_INDEX.md`.

---

## Adding a new extractor

To add support for a new Moodle file type:

**1. Create the file in `src/extractors/`:**

```typescript
// src/extractors/meu-extractor.ts
export interface MeuDado {
    campo: string;
}

export function extractMeuDado(filePath: string): MeuDado[] {
    // read the file, parse it, return structured data
    return [];
}
```

**2. Add Zod validation (recommended for critical data):**

```typescript
import { z } from "zod";

const MeuDadoSchema = z.object({
    campo: z.string(),
});
```

**3. Connect to the relevant generator in `src/generators/`:**

Import and call the extractor inside `moodle.ts` (global indexes) or `plugin.ts` (plugin context).

**4. Add a test case in `src/tests/extractors.test.ts`:**

```typescript
test("extractMeuDado returns empty array for non-existent file", () => {
    const result = extractMeuDado("/nonexistent/path.php");
    assert.deepEqual(result, []);
});
```

**5. Build and test:**

```bash
npm run build && npm test
```

---

## See also

- [Generators](./generators.md) — how extractor data becomes `.md` files
- [Cache System](./cache-system.md) — when the extractor is called and when it is skipped
- [Generated Files](../reference/generated-files.md) — the `.md` files each extractor feeds

---

[🏠 Back to Index](../index.md)
