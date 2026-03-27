🌐 [Português](../../../pt-br/guides/clients/codex.md) | **English** | 🏠 [Index](../../index.md)

---

# Using with OpenAI Codex

**OpenAI Codex** is OpenAI’s development agent, available as a CLI (`codex`) and as a VS Code extension. Unlike other clients, Codex uses the **TOML** format for configuration and an **`AGENTS.md`** file as persistent context — instead of JSON and `CLAUDE.md`/`GEMINI.md`.

> **Important:** The CLI and the VS Code extension share the same configuration file `~/.codex/config.toml`. Configuring in one place activates it for both.

---

## 🛠️ MCP Server Configuration

### Option 1 — Via CLI (recommended)

```bash
codex mcp add moodle-dev-mcp \
  --env MOODLE_PATH=/home/user/workspace/www/html/moodle \
  -- npx -y moodle-dev-mcp
```

Check if it was registered:

```bash
codex mcp list
# → moodle-dev-mcp  (stdio)
```

### Option 2 — Editing config.toml directly

Create or edit `~/.codex/config.toml`:

```toml
[mcp_servers.moodle-dev-mcp]
command = "npx"
args    = ["-y", "moodle-dev-mcp"]
env     = { MOODLE_PATH = "/home/user/workspace/www/html/moodle" }
```

For project-specific configuration (only in projects marked as trusted), create `.codex/config.toml` at the workspace root.

> **TOML warning:** a syntax error in `config.toml` breaks **both** the CLI and the VS Code extension simultaneously. Validate the file before saving at [toml-lint.com](https://www.toml-lint.com) or with `codex --config` for a quick check.

### Issue with nvm / mise / asdf

Codex may not inherit the PATH from your shell. If `npx` is not found, use `env_vars` to inherit the PATH from the parent environment, or specify the PATH explicitly:

```toml
[mcp_servers.moodle-dev-mcp]
command  = "npx"
args     = ["-y", "moodle-dev-mcp"]
env_vars = ["PATH"]
env      = { MOODLE_PATH = "/home/user/workspace/www/html/moodle" }
```

Or with an absolute path:

```toml
[mcp_servers.moodle-dev-mcp]
command = "/home/user/.nvm/versions/node/v22.0.0/bin/npx"
args    = ["-y", "moodle-dev-mcp"]
env     = { MOODLE_PATH = "/home/user/workspace/www/html/moodle" }
```

Run `which npx` in the terminal to find the correct path.

---

## 📄 Boosting with AGENTS.md

`AGENTS.md` is the equivalent of `CLAUDE.md` and `GEMINI.md` in Codex. It is automatically read in every session — from the global scope to the most specific:

| Scope        | Location                                     |
| ------------ | -------------------------------------------- |
| Global       | `~/.codex/AGENTS.md`                         |
| Project root | `AGENTS.md` at the workspace root (Git root) |
| Subdirectory | `AGENTS.md` in any project subfolder         |

Codex loads the files in cascade — from global to the most specific — and the one closest to the current directory takes precedence.

Create the file at the root of your Moodle installation:

```bash
touch /home/user/workspace/www/html/moodle/AGENTS.md
```

**Recommended template:**

```markdown
# Moodle Development Context

## Environment

- Moodle version: 4.4 (adjust according to your installation)
- Path: /home/user/workspace/www/html/moodle
- Stack: Docker with Nginx + PHP-FPM + MariaDB

## moodle-dev-mcp

The moodle-dev-mcp MCP server is configured.
Use get_plugin_info to load context before analyzing a plugin.
Use search_api to find core functions before suggesting alternatives.
After significant changes in a plugin, run generate_plugin_context.
After installing new plugins in Moodle, run update_indexes.

## Plugins in development

- local_myplugin — briefly describe the purpose

## Conventions

- Coding standard: Moodle Coding Style (PSR-12 + Frankenstyle)
- All database access via $DB — never direct SQL
- All output via $OUTPUT or renderers — never direct echo
- Capabilities always checked with require_capability() or has_capability()
```

---

## 💡 Recommended Workflows

### Starting a session

```bash
# Enter the Moodle directory before starting Codex
cd /home/user/workspace/www/html/moodle
codex
```

Starting from the Moodle directory ensures that the project `AGENTS.md` is loaded and that Codex understands the workspace context.

In the first session after configuring:

```
Initialize the moodle-dev-mcp context for this Moodle installation.
```

### Loading plugin context

```
Load the context of the plugin local_myplugin and give me a summary
of the architecture, database, and main functions.
```

### Searching the core API

```
Use the search_api tool to find Moodle core API functions
related to enrollment that are not deprecated.
```

### Creating a new plugin

```
scaffold_plugin
  type="local"
  name="audit_log"
  description="Audit history of user actions"
  features="database tables, scheduled tasks, capabilities, event observers"
```

### Review before commit

```
/review_plugin plugin="local/myplugin" focus="security"
```

---

## ⚠️ Troubleshooting

### Server does not appear after adding

Codex reads `config.toml` at startup. After editing the file, restart the session:

```bash
# End the current session and start a new one
exit
codex
```

In the VS Code extension, reload the window: `Ctrl+Shift+P` → **Developer: Reload Window**.

### TOML syntax error breaks CLI and VS Code simultaneously

This is a characteristic of the shared configuration. If both stop working after an edit, the issue is almost certainly invalid TOML syntax. Check:

- Strings must use double quotes: `"value"`, not `'value'`
- Arrays use brackets: `args = ["-y", "moodle-dev-mcp"]`
- The section name must be exact: `[mcp_servers.moodle-dev-mcp]`

Validate the file:

```bash
# Basic syntax check via Python (available on most systems)
python3 -c "import tomllib; tomllib.load(open('/home/user/.codex/config.toml', 'rb'))"
```

### SSE is not supported

Codex supports only **stdio** for local servers. `moodle-dev-mcp` uses stdio by default — no additional configuration required. The server’s HTTP mode (`--http`) is not compatible with Codex for local usage.

### Outdated context after changes

- **Changes in a plugin:** _"Regenerate the context of the plugin local_myplugin."_
- **New plugin installed:** _"Regenerate all global Moodle indexes."_

---

## ➡️ Next Steps

- [Claude Code](./claude-code.md) — Anthropic CLI with JSON configuration
- [Gemini Code Assist](./gemini-code-assist.md) — VS Code extension with Agent Mode
- [Workflow examples](../workflows/examples.md) — ready prompts for real scenarios
- [Tools Reference](../../reference/tools.md) — complete parameters for all tools
- [Back to Index](../../index.md)
