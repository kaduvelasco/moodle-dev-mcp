🌐 [Português](../../pt-br/reference/tools.md) | **English** | 🏠 [Índice](../index.md)

---

# Tools Reference (MCP)

**Tools** are executable functions that your AI assistant can call to interact with the Moodle installation. Unlike Resources — which are passive reading — Tools perform active actions such as context generation, searches, diagnostics, and monitoring.

## How to use

You do not need to memorize the names of the tools. Just give commands in natural language:

- _"Initialize the context of moodle-dev-mcp for my Moodle installation."_
- _"Generate the context of the plugin local_myplugin."_
- _"Search for core API functions related to enrollments."_

The assistant identifies which tool to call and executes it automatically. For scaffold, review, and debugging tasks, use the **MCP Prompts** — which automatically inject additional context. See the [Prompts Reference](./prompts.md).

---

## 🗂 Context Management

### `init_moodle_context`

Initializes the context for a Moodle installation. It should be executed once per installation — or whenever Moodle is updated to a new major version.

| Parameter     | Type   | Required | Description                                                              |
| ------------- | ------ | :------: | ------------------------------------------------------------------------ |
| `moodle_path` | string |    ✅    | Absolute path to the Moodle root (directory that contains `version.php`) |

**What it does:** detects the Moodle version via `version.php`, generates all 13 global index files (`MOODLE_API_INDEX.md`, `MOODLE_PLUGIN_INDEX.md`, etc.) and saves the configuration in `.moodle-mcp`.

> Skip this tool if `MOODLE_PATH` is already defined as an environment variable — the server will use the configured path automatically.

**Example:**

```
Initialize the context of moodle-dev-mcp for the installation at
/home/usuario/workspace/www/html/moodle.
```

---

### `generate_plugin_context`

Generates the complete AI context package for a specific plugin. Creates all `PLUGIN_*.md` files inside the plugin directory.

| Parameter     | Type   | Required | Description                                                               |
| ------------- | ------ | :------: | ------------------------------------------------------------------------- |
| `plugin_path` | string |    ✅    | Relative path (`local/myplugin`) or absolute path to the plugin directory |

**What it does:** runs all extractors on the plugin and generates 11 context files (`PLUGIN_AI_CONTEXT.md`, `PLUGIN_DB_TABLES.md`, `PLUGIN_FUNCTION_INDEX.md`, etc.).

**Example:**

```
Generate the complete AI context for the plugin local_myplugin.
```

---

### `plugin_batch`

Generates or updates context for multiple plugins at once. Useful for initializing all plugins under development or processing the entire installation.

| Parameter     | Type     | Required | Default | Description                                                                         |
| ------------- | -------- | :------: | ------- | ----------------------------------------------------------------------------------- |
| `mode`        | string   |    ✅    | `dev`   | `dev` — plugins with `.moodle-mcp-dev`; `all` — all plugins; `list` — specific list |
| `plugins`     | string[] |    ⚠️    | —       | Required when `mode=list`. List of frankenstyles (ex: `["local_a", "local_b"]`)     |
| `force`       | boolean  |    ⭕    | `false` | If `true`, ignores the mtime cache and regenerates everything                       |
| `mark_as_dev` | boolean  |    ⭕    | `false` | If `true`, creates the `.moodle-mcp-dev` file in the processed plugins              |

**Example:**

```
Generate the context for all plugins that I am developing.
```

```
Generate the context for the plugins local_relatorios and local_auditoria,
marking them as under development.
```

---

### `update_indexes`

Regenerates the global Moodle indexes. Use it after installing or removing plugins from the installation.

| Parameter         | Type    | Required | Default | Description                                                  |
| ----------------- | ------- | :------: | ------- | ------------------------------------------------------------ |
| `force`           | boolean |    ⭕    | `false` | If `true`, ignores the mtime cache and regenerates all files |
| `include_plugins` | boolean |    ⭕    | `false` | If `true`, also regenerates the context of dev plugins       |

**What it does:** re-scans the installation using mtime cache — PHP files that have not changed since the last execution are skipped, making subsequent runs fast.

**Example:**

```
Regenerate all global Moodle indexes.
```

```
Regenerate all indexes ignoring the cache — I just upgraded Moodle.
```

---

## 🔎 Search and Discovery

### `search_api`

Searches functions in the Moodle core API by name or keyword.

| Parameter    | Type   | Required | Default  | Description                                                                   |
| ------------ | ------ | :------: | -------- | ----------------------------------------------------------------------------- |
| `query`      | string |    ✅    | —        | Function name or keyword                                                      |
| `visibility` | string |    ⭕    | `public` | `public` — only public functions; `deprecated` — only deprecated; `all` — all |
| `limit`      | number |    ⭕    | `30`     | Maximum number of returned results                                            |

**Example:**

```
Search for core API functions related to enrollment
that are not deprecated.
```

---

### `search_plugins`

Finds plugins installed in the Moodle installation by name, component, or type.

| Parameter | Type   | Required | Default | Description                                      |
| --------- | ------ | :------: | ------- | ------------------------------------------------ |
| `query`   | string |    ✅    | —       | Search term — name, frankenstyle, or plugin type |
| `limit`   | number |    ⭕    | `20`    | Maximum number of returned results               |

**Example:**

```
Which plugins of type "local" are installed in this Moodle instance?
```

---

### `get_plugin_info`

Loads the complete context of a plugin into the current AI session. Always use it before starting to work on an existing plugin.

| Parameter | Type   | Required | Description                                                |
| --------- | ------ | :------: | ---------------------------------------------------------- |
| `plugin`  | string |    ✅    | Frankenstyle (`local_myplugin`), relative or absolute path |

**What it does:** reads all `PLUGIN_*.md` files from the plugin and loads them into the session context. The AI then becomes aware of the plugin architecture, database, functions, events, and patterns of the plugin.

**Example:**

```
Load the complete context of the plugin local_myplugin. I want to analyze
its database structure.
```

---

### `list_dev_plugins`

Lists all plugins marked as under development in the installation — that is, those that have the `.moodle-mcp-dev` file in their directory.

No parameters.

**Example:**

```
Which plugins are marked as under development?
```

---

## 🔄 Monitoring

### `watch_plugins`

Enables or disables automatic monitoring of files in plugins under development. When active, any PHP file saved inside a dev plugin triggers context regeneration in the background.

| Parameter | Type   | Required | Description                                                                   |
| --------- | ------ | :------: | ----------------------------------------------------------------------------- |
| `action`  | string |    ✅    | `start` — start monitoring; `stop` — stop; `status` — show the current status |

> Watch mode is **in-memory** — it does not survive server restarts. Maximum of 20 plugins monitored simultaneously.

**Example:**

```
Start monitoring the plugin local_myplugin for file changes.
```

```
What is the current status of plugin monitoring?
```

---

## 🧪 Diagnosis and Analysis

### `explain_plugin`

Generates a detailed architectural explanation of a plugin. It can be requested for the entire plugin or focused on a specific section.

| Parameter | Type   | Required | Description                                                                           |
| --------- | ------ | :------: | ------------------------------------------------------------------------------------- |
| `plugin`  | string |    ✅    | Frankenstyle, relative or absolute path                                               |
| `section` | string |    ⭕    | Specific section: `database`, `events`, `functions`, `callbacks`, `endpoints`, `flow` |

**Example:**

```
Use explain_plugin to explain the complete architecture of the plugin local_myplugin.
```

```
Explain only the database section of the plugin local_myplugin.
Are there tables without indexes or poorly typed fields?
```

---

### `doctor`

Diagnoses the `moodle-dev-mcp` environment and generates a health report.

No parameters.

**Checks performed:**

- Node.js version (>= 18 required)
- Validity and accessibility of `MOODLE_PATH`
- Detected Moodle version
- Freshness and integrity of the global indexes
- Cache statistics (hits, misses, skips)
- Optional tools available (`universal-ctags`)

> `doctor` is an **MCP tool** — not a CLI command. Run it by asking the assistant: _"Run the moodle-dev-mcp doctor."_

**Example:**

```
Run the moodle-dev-mcp doctor and tell me if there is any problem
with the current configuration.
```

---

## See also

- [Resources Reference](./resources.md) — data that the AI reads passively
- [Prompts Reference](./prompts.md) — scaffold_plugin, review_plugin, debug_plugin
- [Generated Files](./generated-files.md) — the `.md` files created in the installation
- [Usage Examples](../guides/workflows/examples.md) — ready prompts for real scenarios

---

[🏠 Back to Index](../index.md)
