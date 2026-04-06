🇧🇷 [Português (BR)](../../../pt-br/guides/clients/codex.md) | **English** | 🏠 [Index](../../index.md)

---

# Using with OpenAI Codex

**OpenAI Codex** is OpenAI's development agent, available as a CLI (`codex`) and as a VS Code extension. Unlike other clients, Codex uses **TOML** for configuration and an **`AGENTS.md`** file for persistent context — instead of JSON and `CLAUDE.md`/`GEMINI.md`.

> **Important:** The CLI and the VS Code extension share the same configuration file `~/.codex/config.toml`. Configuring it once applies to both.

---

## 🛠️ MCP Server Configuration

### Option 1 — Via CLI (recommended)

```bash
codex mcp add moodle-dev-mcp \
  --env MOODLE_PATH=/home/user/workspace/www/html/moodle \
  -- npx -y moodle-dev-mcp
```

Verify it was registered:

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

For project-scoped configuration (only in trusted projects), create `.codex/config.toml` at the workspace root.

> **Watch out for TOML syntax:** a syntax error in `config.toml` breaks **both** the CLI and the VS Code extension simultaneously. Validate the file before saving at [toml-lint.com](https://www.toml-lint.com) or with a quick check:
> ```bash
> python3 -c "import tomllib; tomllib.load(open('/home/user/.codex/config.toml', 'rb'))"
> ```

### Problem with nvm / mise / asdf

Codex may not inherit your shell's PATH. Use `env_vars` to inherit PATH from the parent environment, or specify it explicitly:

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

Run `which npx` in your terminal to find the correct path.

---

## 📄 Enhancing with AGENTS.md

`AGENTS.md` is the Codex equivalent of `CLAUDE.md` and `GEMINI.md`. It is read automatically at each session — from the most general scope to the most specific:

| Scope | Location |
|-------|----------|
| Global | `~/.codex/AGENTS.md` |
| Project root | `AGENTS.md` at the workspace root (Git root) |
| Subdirectory | `AGENTS.md` in any project subfolder |

Codex loads files in cascade — from global to most specific — and the closest to the current directory takes precedence.

Create the file at the root of your Moodle installation:

```bash
touch /home/user/workspace/www/html/moodle/AGENTS.md
```

**Recommended template:**

```markdown
# Moodle Plugin Development Context

## Environment
- Moodle version: 4.4 (adjust to match your installation)
- Path: /home/user/workspace/www/html/moodle
- Stack: Docker with Nginx + PHP-FPM + MariaDB

## moodle-dev-mcp
The moodle-dev-mcp MCP server is configured.
Use get_plugin_info to load context before analyzing a plugin.
Use search_api to find core functions before suggesting alternatives.
After significant changes to a plugin, run generate_plugin_context.
After installing new plugins in Moodle, run update_indexes.

## Plugins under development
- local_myplugin — briefly describe the purpose

## Conventions
- Code standard: Moodle Coding Style (PSR-12 + Frankenstyle)
- All database access via $DB — never direct SQL
- All output via $OUTPUT or renderers — never echo directly
- Capabilities always checked with require_capability() or has_capability()
```

---

## 💡 Recommended Workflows

### Starting a session

```bash
# Navigate to the Moodle directory before starting Codex
cd /home/user/workspace/www/html/moodle
codex
```

Starting from the Moodle directory ensures the project `AGENTS.md` is loaded and Codex understands the workspace context.

In the first session after setup:

```
Initialize the moodle-dev-mcp context for this Moodle installation.
```

### Loading plugin context

```
Load the context for local_myplugin and give me a summary
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
  description="Audit log for user actions"
  features="database tables, scheduled tasks, capabilities, event observers"
```

### Pre-commit review

```
/review_plugin plugin="local/myplugin" focus="security"
```

---

## ⚠️ Troubleshooting

### Server not appearing after adding

Codex reads `config.toml` at startup. After editing the file, restart the session:

```bash
exit
codex
```

In the VS Code extension, reload the window: `Ctrl+Shift+P` → **Developer: Reload Window**.

### TOML syntax error breaks CLI and VS Code simultaneously

This is a characteristic of the shared configuration. If both stop working after an edit, the problem is almost certainly invalid TOML syntax. Check:

- Strings must use double quotes: `"value"`, not `'value'`
- Arrays use brackets: `args = ["-y", "moodle-dev-mcp"]`
- Section name must be exact: `[mcp_servers.moodle-dev-mcp]`

### SSE is not supported

Codex only supports **stdio** for local servers. `moodle-dev-mcp` uses stdio by default — no additional configuration needed. The server's HTTP mode (`--http`) is not compatible with Codex for local use.

### Stale context after changes

- **Changes to a plugin:** _"Regenerate the context for local_myplugin."_
- **New plugin installed:** _"Regenerate all global Moodle indexes."_

---

## ➡️ Next Steps

- [Claude Code](./claude-code.md) — Anthropic's CLI with JSON configuration
- [Gemini Code Assist](./gemini-code-assist.md) — VS Code extension with Agent Mode
- [OpenCode](./opencode.md) — open-source agent with TUI interface
- [Workflow Examples](../workflows/examples.md) — ready-to-use prompts for real scenarios
- [Tools Reference](../../reference/tools.md) — complete parameters for all tools
- [Back to Index](../../index.md)
