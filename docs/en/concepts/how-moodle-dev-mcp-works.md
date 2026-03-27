🌐 [Português](../../pt-br/concepts/how-moodle-dev-mcp-works.md) | **English** | 🏠 [Index](../index.md)

---

# How moodle-dev-mcp works

`moodle-dev-mcp` reads your Moodle installation from disk and gives your AI assistant deep and accurate knowledge of your codebase — without copying and pasting anything manually.

---

## The pipeline

The flow has three stages: **Extractors** read the PHP files, **Generators** transform that content into context `.md` files, and the **MCP Server** serves that context to the AI client via Tools, Resources, and Prompts.

```
Moodle PHP files (on disk)
         │
         ▼  Extractors
    Parse db/install.xml, db/events.php, db/hooks.php,
    lib/*.php, classes/, db/tasks.php, db/services.php,
    db/access.php, db/upgrade.php
         │
         ▼  Generators + mtime cache
    Write context .md files in the Moodle installation:
    MOODLE_API_INDEX.md, PLUGIN_AI_CONTEXT.md, etc.
    (unchanged files are skipped via mtime cache)
         │
         ▼  MCP Server
    Serves context via Tools, Resources and Prompts
    to the AI client via stdio or HTTP
```

---

## Extractors

Each extractor parses a type of Moodle PHP file and feeds the generators with structured data:

| Extractor         | Parses                           | Produces                                                       |
| ----------------- | -------------------------------- | -------------------------------------------------------------- |
| `api.ts`          | `lib/*.php`                      | Functions with PHPDoc visibility → `MOODLE_API_INDEX.md`       |
| `schema.ts`       | `db/install.xml`                 | Database schema (tables, fields, keys) → `PLUGIN_DB_TABLES.md` |
| `events.ts`       | `db/events.php`                  | Event observer registrations → `PLUGIN_EVENTS.md`              |
| `hooks.ts`        | `db/hooks.php` + `classes/hook/` | Hook API callbacks (4.3+) → `PLUGIN_CALLBACK_INDEX.md`         |
| `tasks.ts`        | `db/tasks.php`                   | Scheduled task definitions → `PLUGIN_DEPENDENCIES.md`          |
| `services.ts`     | `db/services.php`                | Web service registrations → `PLUGIN_ENDPOINT_INDEX.md`         |
| `capabilities.ts` | `db/access.php`                  | Capability definitions → `PLUGIN_DEPENDENCIES.md`              |
| `upgrade.ts`      | `db/upgrade.php`                 | Upgrade step history → `PLUGIN_DEPENDENCIES.md`                |
| `classes.ts`      | `classes/**/*.php`               | PHP classes, interfaces and traits → `MOODLE_CLASSES_INDEX.md` |
| `plugin.ts`       | `version.php` + language files   | Plugin metadata → `PLUGIN_CONTEXT.md`                          |

For the complete list of generated files, see the [Generated Files Reference](../reference/generated-files.md).

---

## Generators

Generators receive the output of the extractors and write structured Markdown files directly into the Moodle installation:

- **Global generators** — write 13 files in the Moodle root (`MOODLE_API_INDEX.md`, `MOODLE_PLUGIN_INDEX.md`, `MOODLE_DB_TABLES_INDEX.md`, etc.)
- **Plugin generators** — write 11 files in each plugin directory (`PLUGIN_AI_CONTEXT.md`, `PLUGIN_DB_TABLES.md`, `PLUGIN_FUNCTION_INDEX.md`, etc.)

The **mtime cache** compares the modification date of each source file with the corresponding `.md` file and skips regeneration when nothing changed — making subsequent runs much faster.

> To force a full regeneration ignoring the cache, ask the assistant: _"Regenerate all Moodle indexes ignoring the cache"_. The AI will call `update_indexes` with `force=true`.

---

## Tools, Resources and Prompts

With the context files created, the MCP server exposes them to the AI client in three ways:

- **Tools** — the AI calls them explicitly to trigger actions (`init_moodle_context`, `search_api`, `get_plugin_info`, `watch_plugins`, etc.)
- **Resources** — the AI reads them passively as context, without explicit user action (`moodle://api-index`, `moodle://plugin/{component}`, etc.)
- **Prompts** — prebuilt templates that automatically inject context and guide the AI in complex tasks (`scaffold_plugin`, `review_plugin`, `debug_plugin`)

---

## See also

- [Why moodle-dev-mcp?](./why-moodle-dev-mcp.md)
- [Architecture](./architecture.md)
- [Tools Reference](../reference/tools.md)
- [Generated Files Reference](../reference/generated-files.md)

---

[🏠 Back to Index](../index.md)
