🌐 [Português](../../../pt-br/guides/clients/gemini-code-assist.md) | **English** | 🏠 [Index](../../index.md)

---

# Using with Gemini Code Assist (VS Code)

**Gemini Code Assist** integrates Google’s AI directly into VS Code. With MCP support via **Agent Mode**, Gemini gains real-time access to the structure of your Moodle installation, enabling more precise and context-aware code suggestions.

---

## 🛠️ MCP Server Configuration

Gemini Code Assist reads MCP server configuration from a JSON file in the user directory.

### 1. Locate or create the configuration file

| Operating System | Path                                  |
| ---------------- | ------------------------------------- |
| Linux / macOS    | `~/.gemini/settings.json`             |
| Windows          | `%USERPROFILE%\.gemini\settings.json` |

### 2. Add the moodle-dev-mcp server

**Via NPM (recommended — after publication):**

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

> **Issue with nvm / mise / asdf:** Gemini Code Assist inherits the environment from the VS Code process, which may not include your shell PATH. If `node` or `npx` cannot be found, explicitly add the PATH:
>
> ```json
> "env": {
>     "PATH": "/home/user/.nvm/versions/node/v22.0.0/bin:/usr/local/bin:/usr/bin:/bin",
>     "MOODLE_PATH": "/path/to/your/moodle"
> }
> ```
>
> Run `which node` in your terminal to find the correct path.

### 3. Reload VS Code

After saving `settings.json`, reload the VS Code window:

`Ctrl+Shift+P` → **Developer: Reload Window**

---

## 🤖 Enabling Agent Mode

MCP servers **only work in Agent Mode** — not in the standard Gemini chat.

1. Open the Gemini panel in VS Code (activity bar icon)
2. Toggle **Agent** at the top of the panel
3. Verify the server is detected by typing in chat:

```
/mcp
```

You should see `moodle-dev-mcp` listed as connected with the available tools. If it does not appear, check the [Troubleshooting](#️-troubleshooting) section.

### Initializing the Moodle context

In the first session, ask Gemini:

```
Initialize the moodle-dev-mcp context for my Moodle installation.
```

Gemini will call `init_moodle_context`, detect the version, and generate all global indexes.

---

## 📄 Boosting with GEMINI.md

Gemini Code Assist automatically reads `GEMINI.md` files when starting each session. It supports multiple scopes — from general to specific:

| Scope        | Location                                 |
| ------------ | ---------------------------------------- |
| Global       | `~/.gemini/GEMINI.md`                    |
| Project root | `GEMINI.md` in the workspace root        |
| Subdirectory | `GEMINI.md` inside any project subfolder |

Create the file at the root of your Moodle installation:

```bash
touch /home/user/workspace/www/html/moodle/GEMINI.md
```

**Recommended template:**

```markdown
# Moodle Development Context

## Environment

- Moodle version: 4.4 (adjust according to your installation)
- Path: /home/user/workspace/www/html/moodle
- Stack: Docker with Nginx + PHP-FPM + MariaDB

## moodle-dev-mcp

The moodle-dev-mcp MCP server is connected in Agent mode.
Use get_plugin_info to load context before analyzing a plugin.
Use search_api to find core functions before suggesting alternatives.
Use the slash commands /scaffold_plugin, /review_plugin, and /debug_plugin
for complex development tasks.

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

### Starting a development session

At the beginning of each Agent Mode session, load the plugin context:

```
I am working on the plugin local_myplugin. Load the full context.
```

Gemini will call `get_plugin_info` and learn the plugin architecture, database, functions, and patterns.

### Querying the core API

```
Which Moodle core API functions should I use to check if a user
is enrolled in a course? Prefer public and non-deprecated functions.
```

Gemini will use `search_api` and return the functions with signatures and source files.

### Inspecting database structure

```
What are the fields of the mdl_course table? Use moodle-dev-mcp to verify.
```

Gemini will query the resource `moodle://db-tables` without needing direct database access.

### Creating new plugins with a slash command

In Agent Mode, use the slash command directly:

```
/scaffold_plugin type="local" name="web_service_test" description="Test plugin for web services" features="web services, capabilities"
```

After creating the files, generate the AI context:

```
Generate the AI context for the plugin local_web_service_test.
```

### Reviewing before committing

```
/review_plugin plugin="local/myplugin" focus="security"
```

---

## ⚠️ Troubleshooting

### First step: check the connection

Run `/mcp` in the Agent Mode chat. If `moodle-dev-mcp` does not appear, the issue is in the configuration — not your prompt.

### Server appears as "Connecting..." and hangs

Common issue in VS Code. Fix:

1. Confirm you are in **Agent Mode** — MCP does not work in standard chat
2. Reload the window: `Ctrl+Shift+P` → **Developer: Reload Window**
3. Verify that `node` or `npx` is accessible in the PATH configured in `settings.json`

### Relative paths do not work

`settings.json` requires **absolute paths**. Relative paths such as `./dist/index.js` are not resolved by Gemini Code Assist.

### Incorrect MOODLE_PATH

Ensure `MOODLE_PATH` points to the directory containing the `version.php` file. The server fails silently if it cannot validate the installation.

### Outdated context after changes

- **New plugin installed:** _"Regenerate all global Moodle indexes."_ → `update_indexes`
- **Plugin changes:** _"Regenerate the context of plugin local_myplugin."_ → `generate_plugin_context`

---

## ➡️ Next Steps

- [Claude Code](./claude-code.md) — equivalent guide for the Anthropic CLI
- [Workflow examples](../workflows/examples.md) — real-world use cases and ready prompts
- [Tools Reference](../../reference/tools.md) — full parameters for all tools
- [Common Issues](../../troubleshooting/common-issues.md) — detailed troubleshooting
- [Back to Index](../../index.md)
