🇧🇷 [Português (BR)](../../../pt-br/guides/clients/opencode.md) | **English** | 🏠 [Index](../../index.md)

---

# Using with OpenCode

**OpenCode** is an open-source terminal-based coding agent with native MCP server support. Its TUI (Text User Interface) enables a fully terminal-based workflow, similar to Claude Code.

> **More complete installation available:** The **Lumia Dev** project provides a pre-configured and more complete OpenCode setup, with integrations and settings ready for Moodle development. If you use or plan to use Lumia Dev, consider using the configuration from there.

---

## 🛠️ Installing OpenCode

### Check if already installed

Before installing, verify whether OpenCode is already available on your system:

```bash
which opencode && opencode --version
```

If a path and version are displayed, OpenCode is already installed — skip to the [MCP Server Configuration](#️-mcp-server-configuration) section.

### Install via npm (recommended)

```bash
npm install -g opencode-ai
```

Verify the installation:

```bash
opencode --version
```

### Install via official script

```bash
curl -fsSL https://opencode.ai/install | bash
```

> **More complete installation:** The **Lumia Dev** project has a more complete OpenCode configuration, with setup scripts, additional integrations, and environment settings ready to use. If you already use Lumia Dev or plan to, prefer the installation and configuration available there.

---

## ⚙️ MCP Server Configuration

OpenCode reads MCP server configuration from `opencode.json` at the project root, or from `~/.config/opencode/config.json` for global configuration.

### Option 1 — Project-scoped configuration (recommended)

Create or edit `opencode.json` at the root of your Moodle installation:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "moodle-dev-mcp": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "moodle-dev-mcp"],
      "env": {
        "MOODLE_PATH": "/home/user/workspace/www/html/moodle"
      }
    }
  }
}
```

### Option 2 — Global configuration

Create or edit `~/.config/opencode/config.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "moodle-dev-mcp": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "moodle-dev-mcp"],
      "env": {
        "MOODLE_PATH": "/home/user/workspace/www/html/moodle"
      }
    }
  }
}
```

### Problem with nvm / mise / asdf

OpenCode may not inherit your shell's PATH. If `npx` is not found, specify the absolute path:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "moodle-dev-mcp": {
      "type": "local",
      "command": "/home/user/.nvm/versions/node/v22.0.0/bin/npx",
      "args": ["-y", "moodle-dev-mcp"],
      "env": {
        "MOODLE_PATH": "/home/user/workspace/www/html/moodle"
      }
    }
  }
}
```

Run `which npx` in your terminal to find the correct path.

### Verify the connection

Start OpenCode in your Moodle installation directory:

```bash
cd /home/user/workspace/www/html/moodle
opencode
```

Inside the session, verify the server is connected — `moodle-dev-mcp` should appear in the list of active MCP servers.

---

## 📄 Enhancing with AGENTS.md

OpenCode automatically reads `AGENTS.md` to load project context at each session.

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
# Navigate to the Moodle directory before starting OpenCode
cd /home/user/workspace/www/html/moodle
opencode
```

Starting from the Moodle directory ensures the project `AGENTS.md` is loaded.

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

### Server not appearing after configuration

OpenCode reads `opencode.json` at startup. After editing the file, restart the session.

Also verify the JSON is well-formed — a syntax error prevents the entire configuration from loading:

```bash
node -e "JSON.parse(require('fs').readFileSync('opencode.json', 'utf8'))" && echo "Valid JSON"
```

### `npx` or `node` not found

If OpenCode does not inherit the shell PATH, use the absolute path in the `command` field (see the configuration section above).

```bash
# Find the correct path
which npx
# → /home/user/.nvm/versions/node/v22.0.0/bin/npx
```

### Stale context after changes

- **Changes to a plugin:** _"Regenerate the context for local_myplugin."_
- **New plugin installed:** _"Regenerate all global Moodle indexes."_

---

## ➡️ Next Steps

- [Claude Code](./claude-code.md) — Anthropic's CLI with JSON configuration
- [OpenAI Codex](./codex.md) — OpenAI's CLI with TOML configuration
- [Workflow Examples](../workflows/examples.md) — ready-to-use prompts for real scenarios
- [Tools Reference](../../reference/tools.md) — complete parameters for all tools
- [Back to Index](../../index.md)
