🇧🇷 [Português (BR)](../../../pt-br/guides/clients/gemini-code-assist.md) | **English** | 🏠 [Index](../../index.md)

---

# Using with Gemini Code Assist

**Gemini Code Assist** is available as a terminal CLI (`gemini`) and as a VS Code extension. Both support MCP servers and share the same configuration file `~/.gemini/settings.json`.

---

## 🛠️ MCP Server Configuration

### Option 1 — Via CLI (recommended)

```bash
gemini mcp add moodle-dev-mcp \
  --command "npx" \
  --args "-y,moodle-dev-mcp" \
  --env MOODLE_PATH=/path/to/your/moodle
```

Verify it was registered:

```bash
gemini mcp list
# → moodle-dev-mcp: npx -y moodle-dev-mcp
```

### Option 2 — Editing settings.json directly

The configuration file is located at:

| Operating system | Path |
|------------------|------|
| Linux / macOS | `~/.gemini/settings.json` |
| Windows | `%USERPROFILE%\.gemini\settings.json` |

**Via NPM:**

```json
{
    "mcpServers": {
        "moodle-dev-mcp": {
            "command": "npx",
            "args": ["-y", "moodle-dev-mcp"],
            "env": {
                "MOODLE_PATH": "/path/to/your/moodle"
            }
        }
    }
}
```

**Via cloned repository:**

```json
{
    "mcpServers": {
        "moodle-dev-mcp": {
            "command": "node",
            "args": ["/absolute/path/to/moodle-dev-mcp/dist/index.js"],
            "env": {
                "MOODLE_PATH": "/path/to/your/moodle"
            }
        }
    }
}
```

> **Problem with nvm / mise / asdf:** Gemini inherits the environment of the parent process, which may not include your shell's PATH. If `npx` is not found, add the PATH explicitly:
> ```json
> "env": {
>     "PATH": "/home/user/.nvm/versions/node/v22.0.0/bin:/usr/local/bin:/usr/bin:/bin",
>     "MOODLE_PATH": "/path/to/your/moodle"
> }
> ```
> Run `which node` in your terminal to find the correct path.

### After configuring

**CLI:** restart the Gemini session (`Ctrl+C` then `gemini` again) to load the new server.

**VS Code:** reload the window after saving `settings.json`:

`Ctrl+Shift+P` → **Developer: Reload Window**

---

## 🤖 Enabling Agent Mode

MCP servers **only work in Agent Mode** — not in the standard Gemini chat.

1. Open the Gemini panel in VS Code (icon in the activity bar)
2. Click the **Agent** toggle at the top of the panel
3. Verify the server was detected by typing in the chat:

```
/mcp
```

You will see `moodle-dev-mcp` listed as connected with all 11 tools available. If it does not appear, see the [Troubleshooting](#️-troubleshooting) section.

### Initialize the Moodle context

In the first session, ask Gemini:

```
Initialize the moodle-dev-mcp context for my Moodle installation.
```

Gemini will call `init_moodle_context`, detect the version, and generate all global indexes.

---

## 📄 Enhancing with GEMINI.md

Gemini Code Assist automatically reads `GEMINI.md` files at session start. It supports multiple scopes — from most general to most specific:

| Scope | Location |
|-------|----------|
| Global | `~/.gemini/GEMINI.md` |
| Project root | `GEMINI.md` at the workspace root |
| Subdirectory | `GEMINI.md` inside any subfolder |

Create the file at the root of your Moodle installation:

```bash
touch /home/user/workspace/www/html/moodle/GEMINI.md
```

**Recommended template:**

```markdown
# Moodle Plugin Development Context

## Environment
- Moodle version: 4.4 (adjust to match your installation)
- Path: /home/user/workspace/www/html/moodle
- Stack: Docker with Nginx + PHP-FPM + MariaDB

## moodle-dev-mcp
The moodle-dev-mcp MCP server is connected in Agent Mode.
Use get_plugin_info to load context before analyzing a plugin.
Use search_api to find core functions before suggesting alternatives.
Use slash commands /scaffold_plugin, /review_plugin and /debug_plugin
for complex development tasks.

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

### Starting a development session

At the beginning of each Agent Mode session, load the plugin context:

```
I'm working on local_myplugin. Load the full context.
```

Gemini will call `get_plugin_info` and gain knowledge of the plugin's architecture, database, functions, and coding patterns.

### Querying the core API

```
Which core API functions should I use to check if a user
is enrolled in a course? Prefer public, non-deprecated functions.
```

Gemini will use `search_api` and return functions with signatures and source files.

### Creating new plugins with a slash command

In Agent Mode, use the slash command directly:

```
/scaffold_plugin type="local" name="web_service_test" description="Web service test plugin" features="web services, capabilities"
```

After creating the files, generate context:

```
Generate the AI context for local_web_service_test.
```

### Pre-commit review

```
/review_plugin plugin="local/myplugin" focus="security"
```

---

## ⚠️ Troubleshooting

### First step: verify the connection

Run `/mcp` in the Agent Mode chat. If `moodle-dev-mcp` does not appear, the problem is in the configuration — not your prompt.

### Gemini stuck at "Connecting..."

**In VS Code (Gemini Code Assist):**

**Cause:** Gemini Code Assist only loads MCP servers in **Agent Mode**. In standard chat, the server is not initialized.

**Solution:**
1. Confirm the **Agent** toggle is active at the top of the Gemini panel
2. Reload the window: `Ctrl+Shift+P` → **Developer: Reload Window**
3. Run `/mcp` again in the Agent Mode chat

**In CLI (gemini):**

If the server was added with `gemini mcp add` but does not appear, restart the session:

```bash
Ctrl+C
gemini
```

Then check with `/mcp` inside the session.

### Relative paths don't work

`settings.json` requires **absolute paths**. Relative paths like `./dist/index.js` are not resolved by Gemini Code Assist.

### Incorrect MOODLE_PATH

Make sure `MOODLE_PATH` points to the directory containing `version.php`. The server fails silently if it cannot validate the installation.

### Stale context after changes

- **New plugin installed:** _"Regenerate all global Moodle indexes."_ → `update_indexes`
- **Changes to a plugin:** _"Regenerate the context for local_myplugin."_ → `generate_plugin_context`

---

## ➡️ Next Steps

- [Claude Code](./claude-code.md) — equivalent guide for Anthropic's CLI
- [Workflow Examples](../workflows/examples.md) — real-world use cases and ready-to-use prompts
- [Tools Reference](../../reference/tools.md) — complete parameters for all tools
- [Common Issues](../../troubleshooting/common-issues.md) — detailed troubleshooting
- [Back to Index](../../index.md)
