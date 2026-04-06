🇧🇷 [Português (BR)](../../../pt-br/guides/clients/claude-code.md) | **English** | 🏠 [Index](../../index.md)

---

# Using with Claude Code

**Claude Code** is Anthropic's CLI for AI-assisted development. It is one of the most efficient MCP clients for Moodle development, enabling a fully terminal-based workflow with native MCP protocol support via stdio.

---

## 🛠️ Initial Setup

### 1. Add the server

In your terminal, run (adjust paths to match your machine):

```bash
claude mcp add moodle-dev-mcp \
  -e MOODLE_PATH=/home/user/workspace/www/html/moodle \
  -- npx -y moodle-dev-mcp
```

Claude will create or update `~/.claude.json`. From this point on, every time you start `claude`, it will automatically connect to the MCP server in the background.

### 2. Verify the connection

Inside a Claude Code session, run:

```
/mcp
```

You will see `moodle-dev-mcp` listed as connected with all 11 tools available. If the server does not appear, see the [Troubleshooting](#️-troubleshooting) section.

### 3. Initialize the Moodle context

In the first session after setup, ask Claude:

```
Initialize the moodle-dev-mcp context for my Moodle installation.
```

Claude will call `init_moodle_context`, detect the Moodle version, and generate all global indexes. This step only needs to be done once per installation.

---

## 📄 Enhancing with CLAUDE.md

Claude Code automatically reads the `CLAUDE.md` file at the project root when starting each session — eliminating the need to re-explain the environment every time.

Create the file at the root of your Moodle installation:

```bash
touch /home/user/workspace/www/html/moodle/CLAUDE.md
```

**Recommended template:**

```markdown
# Moodle Plugin Development Context

## Environment
- Moodle version: 4.4 (adjust to match your installation)
- Path: /home/user/workspace/www/html/moodle
- Stack: Docker with Nginx + PHP-FPM + MariaDB

## moodle-dev-mcp
The moodle-dev-mcp MCP server is connected and indexes have been generated.
Available tools: init_moodle_context, generate_plugin_context, plugin_batch,
update_indexes, watch_plugins, search_plugins, search_api, get_plugin_info,
list_dev_plugins, doctor, explain_plugin.

## Plugins under development
- local_myplugin — briefly describe the purpose

## Conventions
- Code standard: Moodle Coding Style (PSR-12 + Frankenstyle)
- All database access via $DB — never direct SQL
- All output via $OUTPUT or renderers — never echo directly
- Capabilities always checked with require_capability() or has_capability()

## Workflow
1. Before working on a plugin, load its context with get_plugin_info.
2. Use search_api before suggesting core functions — prefer documented APIs.
3. After adding new plugins to the installation, run update_indexes.
4. After significant changes to a plugin, run generate_plugin_context.
```

---

## 💡 Recommended Workflows

### Starting a development session

At the beginning of each session, load the context of the plugin you will work on:

```
I'm working on the local_myplugin plugin. Load the full context.
```

Claude will call `get_plugin_info` and gain knowledge of the plugin's architecture, database schema, functions, events, and coding patterns.

### Searching the core API

Instead of opening a browser to check the official documentation:

```
Which core API functions should I use to handle grade persistence?
Prefer public, non-deprecated functions.
```

Claude will use `search_api` and return functions with signatures, source files, and version info (`@since`).

### Creating new plugins

Use the `scaffold_plugin` prompt to generate a complete plugin structure:

```
scaffold_plugin
  type="block"
  name="student_monitor"
  description="Displays a student activity summary for teachers"
  features="capabilities, caching"
```

After the files are created, generate context so Claude understands the new plugin:

```
Generate the AI context for block_student_monitor and explain
the generated class structure.
```

### Debugging errors

Paste the error directly into the chat:

```
I'm getting this error in Moodle:

[PASTE ERROR HERE]

Load the context for local_myplugin and help me identify
the root cause and fix.
```

### Enabling watch mode during development

To have the context update automatically as you code:

```
Start monitoring local_myplugin for file changes.
```

Claude will call `watch_plugins action="start"`. Any PHP file saved in the plugin triggers a background context update.

---

## ⚠️ Troubleshooting

### First step: verify the connection

Before any other investigation, run `/mcp` inside the Claude session. If `moodle-dev-mcp` does not appear as connected, the problem is in the server configuration, not your prompt.

### `node: command not found`

Claude Code does not inherit your shell's PATH. If Node.js was installed via a version manager (nvm, mise, asdf), provide the absolute path in the `env` block:

```bash
# Find the correct path
which node
# → /home/user/.nvm/versions/node/v22.0.0/bin/node

# Re-add the server with explicit PATH
claude mcp remove moodle-dev-mcp
claude mcp add moodle-dev-mcp \
  -e MOODLE_PATH=/home/user/workspace/www/html/moodle \
  -e PATH=/home/user/.nvm/versions/node/v22.0.0/bin:/usr/local/bin:/usr/bin:/bin \
  -- npx -y moodle-dev-mcp
```

### Permission errors

If Claude Code reports it cannot run the server, verify that `node` and `npx` are executable:

```bash
which npx && npx --version
```

### Server connected but tools don't respond

Run the diagnostic by asking Claude:

```
Run the moodle-dev-mcp doctor.
```

Claude will call the `doctor` tool and return a report with server status, Moodle version, index freshness, and cache stats.

### Stale context after changes

- **New plugin installed in Moodle:** _"Regenerate all global Moodle indexes."_ → `update_indexes`
- **Significant changes to a plugin:** _"Regenerate the context for local_myplugin."_ → `generate_plugin_context`

---

## ➡️ Next Steps

- [Gemini Code Assist](./gemini-code-assist.md) — equivalent guide for VS Code
- [OpenAI Codex](./codex.md) — OpenAI's CLI with TOML configuration
- [OpenCode](./opencode.md) — open-source agent with TUI interface
- [Workflow Examples](../workflows/examples.md) — real-world use cases and ready-to-use prompts
- [Tools Reference](../../reference/tools.md) — complete parameters for all tools
- [Back to Index](../../index.md)
