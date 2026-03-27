🌐 [Português](../../../pt-br/guides/clients/claude-code.md) | **English** | 🏠 [Index](../../index.md)

---

# Using with Claude Code

**Claude Code** is Anthropic's CLI for AI-assisted development. It is one of the most efficient MCP clients for Moodle development, as it allows a workflow entirely based on terminal and automation, with native support for the MCP protocol via stdio.

---

## 🛠️ Initial Setup

### 1. Add the server

In your terminal, run (adjust the paths according to your machine):

```bash
claude mcp add moodle-dev-mcp \
  -e MOODLE_PATH=/home/user/workspace/www/html/moodle \
  -- npx -y moodle-dev-mcp
```

Claude will create or edit the `~/.claude.json` file. From this moment on, whenever you start `claude`, it will automatically connect to the MCP server in the background.

### 2. Verify the connection

Inside a Claude Code session, run:

```
/mcp
```

You will see `moodle-dev-mcp` listed as connected, with the 11 available tools. If the server does not appear, see the [Troubleshooting](#️-troubleshooting) section.

### 3. Initialize the Moodle context

In the first session after configuration, ask Claude:

```
Initialize the moodle-dev-mcp context for my Moodle installation.
```

Claude will call `init_moodle_context`, detect the Moodle version, and generate all global indexes. This step only needs to be done once per installation.

---

## 📄 Boosting with CLAUDE.md

Claude Code automatically reads the `CLAUDE.md` file at the project root when starting each session — eliminating the need to re-explain the environment every time.

Create the file at the root of your Moodle installation:

```bash
touch /home/user/workspace/www/html/moodle/CLAUDE.md
```

**Recommended template:**

```markdown
# Moodle Development Context

## Environment

- Moodle version: 4.4 (adjust according to your installation)
- Path: /home/user/workspace/www/html/moodle
- Stack: Docker with Nginx + PHP-FPM + MariaDB

## moodle-dev-mcp

The moodle-dev-mcp MCP server is connected and the indexes have been generated.
Available tools: init_moodle_context, generate_plugin_context, plugin_batch,
update_indexes, watch_plugins, search_plugins, search_api, get_plugin_info,
list_dev_plugins, doctor, explain_plugin.

## Plugins in development

- local_myplugin — briefly describe the purpose

## Conventions

- Coding standard: Moodle Coding Style (PSR-12 + Frankenstyle)
- All database access via $DB — never direct SQL
- All output via $OUTPUT or renderers — never direct echo
- Capabilities always checked with require_capability() or has_capability()

## Workflow

1. Before working on a plugin, load the context with get_plugin_info.
2. Use search_api before suggesting core functions — prefer documented APIs.
3. After adding new plugins to the installation, run update_indexes.
4. After significant changes in a plugin, run generate_plugin_context.
```

---

## 💡 Recommended Workflows

### Starting a development session

At the beginning of each session, load the context of the plugin you will work on:

```
I am working on the plugin local_myplugin. Load the full context.
```

Claude will call `get_plugin_info` and will begin to understand the architecture, database, functions, events, and coding patterns of the plugin.

### Searching the core API

Instead of opening a browser to check the official documentation:

```
Which core API functions should I use to handle grade
persistence? Prefer public and non-deprecated functions.
```

Claude will use `search_api` and return the functions with signatures, source files, and version indication (`@since`).

### Creating new plugins

Use the `scaffold_plugin` prompt to create the complete structure of a plugin:

```
scaffold_plugin
  type="block"
  name="monitor_alunos"
  description="Displays a summary of student activity for teachers"
  features="capabilities, caching"
```

After creating the files, generate the context so Claude becomes aware of the new plugin:

```
Generate the AI context for the plugin block_monitor_alunos and explain
the generated class structure to me.
```

### Debugging errors

Paste the error directly into the chat:

```
I am receiving this error in Moodle:

[PASTE THE ERROR HERE]

Load the context of the plugin local_myplugin and help identify
the root cause and the fix.
```

### Enabling watch mode during development

To keep the context updated automatically while you code:

```
Start monitoring the plugin local_myplugin for changes.
```

Claude will call `watch_plugins action="start"`. Any PHP file saved in the plugin triggers a background context update.

---

## ⚠️ Troubleshooting

### First step: verify the connection

Before any other investigation, run `/mcp` inside the Claude session. If `moodle-dev-mcp` does not appear as connected, the issue is in the server configuration, not your prompt.

### `node: command not found`

Claude Code does not inherit the PATH from your shell. If Node.js was installed via a version manager (nvm, mise, asdf), provide the absolute path in the `env` block:

```bash
# Find the correct path
which node
# → /home/user/.nvm/versions/node/v22.0.0/bin/node

# Re-add the server with the explicit PATH
claude mcp remove moodle-dev-mcp
claude mcp add moodle-dev-mcp \
  -e MOODLE_PATH=/home/user/workspace/www/html/moodle \
  -e PATH=/home/user/.nvm/versions/node/v22.0.0/bin:/usr/local/bin:/usr/bin:/bin \
  -- npx -y moodle-dev-mcp
```

### Permission errors

If Claude Code complains that it cannot execute the server, check if `node` and `npx` have execution permission:

```bash
which npx && npx --version
```

### Server connected but tools do not respond

Run diagnostics by asking Claude:

```
Run the moodle-dev-mcp doctor.
```

Claude will call the `doctor` tool and return a report with the server status, Moodle version, index freshness, and cache stats.

### Outdated context after changes

- **New plugin installed in Moodle:** _"Regenerate all global Moodle indexes."_ → `update_indexes`
- **Significant changes in a plugin:** _"Regenerate the context of the plugin local_myplugin."_ → `generate_plugin_context`

---

## ➡️ Next Steps

- [Gemini Code Assist](./gemini-code-assist.md) — equivalent guide for VS Code
- [Workflow examples](../workflows/examples.md) — real use cases and ready prompts
- [Tools Reference](../../reference/tools.md) — complete parameters for all tools
- [Back to Index](../../index.md)
