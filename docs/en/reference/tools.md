# Tools Reference

[🇧🇷 Leia em Português](../../pt-br/reference/tools.md)  |  [← Back to Index](../index.md)

---

All 11 MCP tools exposed by moodle-dev-mcp.

## `init_moodle_context`

Initializes context for a Moodle installation. Run once per installation.

| Parameter | Type | Description |
|-----------|------|-------------|
| `moodle_path` | string | Absolute path to the Moodle root |

**What it does:** detects version from `version.php`, generates all 13 global index files, saves configuration to `.moodle-mcp`.

> Skip this tool if `MOODLE_PATH` is set as an environment variable.

---

## `generate_plugin_context`

Generates the full AI context package for a specific plugin.

| Parameter | Type | Description |
|-----------|------|-------------|
| `plugin_path` | string | Relative path (`local/myplugin`) or absolute path |

**What it does:** creates all 11 `PLUGIN_*.md` files in the plugin directory.

---

## `plugin_batch`

Generates or refreshes context for multiple plugins at once.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `mode` | `dev`/`all`/`list` | `dev` | Which plugins to process |
| `plugins` | string[] | — | Required when `mode=list` |
| `force` | boolean | `false` | Bypass mtime cache |
| `mark_as_dev` | boolean | `false` | Mark processed plugins with `.moodle-mcp-dev` |

---

## `update_indexes`

Regenerates global Moodle indexes.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `force` | boolean | `false` | Bypass mtime cache — regenerate everything |
| `include_plugins` | boolean | `false` | Also regenerate dev plugin contexts |

---

## `watch_plugins`

Auto-regenerates context when plugin source files change.

| Parameter | Type | Description |
|-----------|------|-------------|
| `action` | `start`/`stop`/`status` | Action to perform |

> Watch mode is in-memory — it does not survive server restarts.

---

## `search_plugins`

Searches installed plugins by name, component, or type.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | — | Search term |
| `limit` | number | `20` | Maximum results |

---

## `search_api`

Searches Moodle core API functions by name.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | — | Function name or partial name |
| `visibility` | `public`/`deprecated`/`all` | `public` | Filter by visibility |
| `limit` | number | `30` | Maximum results |

---

## `get_plugin_info`

Loads the full context for a specific plugin into the AI session.

| Parameter | Type | Description |
|-----------|------|-------------|
| `plugin` | string | Component (`local_myplugin`), relative path, or absolute path |

---

## `list_dev_plugins`

Lists all plugins marked as in development — i.e., those that have a `.moodle-mcp-dev` file in their directory.

No parameters.

**Example:**
```
Which plugins are marked as under development?
```

---

## 🏷️ Marking Plugins as Under Development

The server identifies which plugins you are developing by the presence of a `.moodle-mcp-dev` file in the plugin directory. This marker is used by `list_dev_plugins`, `watch_plugins`, and `plugin_batch mode="dev"`.

### How to mark a plugin

**Option 1 — Manual (simplest):**

```bash
touch /your/moodle/local/myplugin/.moodle-mcp-dev
```

**Option 2 — Via assistant (when generating context):**

```
Generate the context for local_myplugin and mark it as under development.
```

The assistant will call `plugin_batch` with `mark_as_dev=true`, creating the file automatically.

**Option 3 — Multiple plugins at once:**

```
Generate context for local_reports and local_audit
and mark both as under development.
```

### How to unmark a plugin

```bash
rm /your/moodle/local/myplugin/.moodle-mcp-dev
```

Or ask the assistant:

```
Remove the development marker from local_myplugin.
```

### Check which plugins are marked

```
Which plugins are marked as under development?
```

The assistant will call `list_dev_plugins` and list all directories containing `.moodle-mcp-dev`.

### Why use markers?

With plugins marked, you can:

- **`watch_plugins action="start"`** — automatically monitor only dev plugins for file changes
- **`plugin_batch mode="dev"`** — regenerate context for all of them at once
- **`list_dev_plugins`** — get a quick overview of what is currently in progress

---

## `doctor`

Diagnoses the environment and reports health.

No parameters. Reports: Node.js version, Moodle path, index freshness, cache stats (hits/misses/skips), optional tools (ctags).

---

## `explain_plugin`

Explains a plugin's architecture, optionally focused on one section.

| Parameter | Type | Description |
|-----------|------|-------------|
| `plugin` | string | Component, relative path, or absolute path |
| `section` | string | Optional: `database`, `events`, `functions`, `callbacks`, `endpoints`, `flow` |

---

[← Back to Index](../index.md)
