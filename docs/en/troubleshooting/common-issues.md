🌐 [Português](../../pt-br/troubleshooting/common-issues.md) | **English** | 🏠 [Índice](../index.md)

---

# Troubleshooting

Encountered a problem while using `moodle-dev-mcp`? This page covers the most common errors with direct solutions.

---

## 🔍 Initial diagnosis

Before investigating any specific issue, run these two steps — they solve most cases:

**Step 1 — Check if the server is connected:**

In your AI client chat, run:

```
/mcp
```

If `moodle-dev-mcp` appears as connected with 11 tools, the server is working. The issue is in the context configuration, not in the connection.

If it does not appear, the issue is in the server configuration — see the [Connection and PATH Errors](#-connection-and-path-errors) sections below.

**Step 2 — Check the environment health:**

```
Run the moodle-dev-mcp doctor.
```

The AI will call the `doctor` tool and return a report with: Node.js version, Moodle path, detected version, index freshness, and cache statistics. Any configuration problem will appear here.

---

## 🚫 Connection and PATH Errors

### The AI client cannot find `node` or `npx`

**Symptom:** Claude Code or Gemini Code Assist report that they cannot connect to the server, or the server appears as "Connecting..." and never completes.

**Cause:** Version managers such as `nvm`, `asdf`, and `mise` install Node in directories not included in the system global PATH — which is the PATH the IDE inherits, not the one from your interactive shell.

**Solution:** Add the PATH explicitly in the `env` block of the server configuration.

```bash
# Find the correct path
which node
# → /home/usuario/.nvm/versions/node/v22.0.0/bin/node
```

**Claude Code (`~/.claude.json`):**

```json
{
    "mcpServers": {
        "moodle-dev-mcp": {
            "command": "npx",
            "args": ["-y", "moodle-dev-mcp"],
            "env": {
                "PATH": "/home/usuario/.nvm/versions/node/v22.0.0/bin:/usr/local/bin:/usr/bin:/bin",
                "MOODLE_PATH": "/home/usuario/workspace/www/html/moodle"
            }
        }
    }
}
```

**Gemini Code Assist (`~/.gemini/settings.json`):**

```json
{
    "mcpServers": {
        "moodle-dev-mcp": {
            "command": "npx",
            "args": ["-y", "moodle-dev-mcp"],
            "env": {
                "PATH": "/home/usuario/.nvm/versions/node/v22.0.0/bin:/usr/local/bin:/usr/bin:/bin",
                "MOODLE_PATH": "/home/usuario/workspace/www/html/moodle"
            }
        }
    }
}
```

---

### Gemini Code Assist stuck on "Connecting..."

**Symptom:** The server appears in `/mcp` but never leaves the "Connecting..." state. No tool is listed.

**Cause:** Gemini Code Assist only loads MCP servers in **Agent Mode**. In the standard chat, the server is not initialized.

**Solution:**

1. Confirm that the **Agent** toggle is enabled at the top of the Gemini panel
2. Reload the window: `Ctrl+Shift+P` → **Developer: Reload Window**
3. Run `/mcp` again in the Agent Mode chat

---

### Moodle path not found

**Symptom:** The server starts but returns: _"Invalid Moodle path: version.php not found"_.

**Cause:** `MOODLE_PATH` points to a subdirectory or uses a relative path.

**Solution:**

- The path must point to the **Moodle root** — the directory that contains `version.php` and the folders `admin/`, `local/`, `mod/`
- Use an **absolute** path (ex: `/home/usuario/workspace/www/html/moodle`), never relative (ex: `./moodle`)
- In LuminaStack, the correct path is `~/workspace/www/html/<project-name>`

---

## 🛠️ Build and Execution Errors

### The `dist/` folder does not exist

**Symptom:** Error when trying to run `node dist/index.js` after cloning the repository.

**Cause:** TypeScript must be compiled before use. The `dist/` folder is not versioned in git.

**Solution:**

```bash
# Option 1 — full setup script (recommended)
./setup.sh

# Option 2 — compile only
npm run build
```

After that, `dist/index.js` will be available. Whenever you modify the source code in `src/`, run `npm run build` again.

---

### Permission denied when creating `.md` files (EACCES)

**Symptom:** The server connects, but when generating context it returns a permission error. The `PLUGIN_*.md` files are not created.

**Cause:** The user running Node does not have write permission in the Moodle directory or plugin directories.

**Solution on Linux (direct installation):**

```bash
sudo chown -R $USER:$USER /caminho/para/seu/moodle/local/
```

**Solution with Docker (Scenario B — sidecar):**

Make sure the volume is not mounted as `:ro` (read-only). The server needs to write the `.md` context files:

```yaml
volumes:
    - ./www/html/moodle:/var/www/moodle
```

---

## 🔄 Context and Cache Issues

### The AI suggests code from an old plugin version

**Symptom:** You modified `db/install.xml` or a PHP file, but the AI still cites the previous version of fields or functions.

**Cause:** The mtime cache may not have detected the change, or the plugin context was not regenerated after the changes.

**Solution — for a specific plugin:**

```
Regenerate the context of the plugin local_myplugin.
```

**Solution — for all global indexes:**

```
Regenerate all Moodle indexes ignoring the cache.
```

The AI will call `update_indexes` with `force=true`, clearing the cache and regenerating all files.

---

### Outdated context after a Moodle upgrade

**Symptom:** After updating Moodle to a new version, the AI still reports the old version and functions that were deprecated or removed.

**Solution:**

```
Reinitialize the moodle-dev-mcp context for the Moodle installation.
```

The AI will call `init_moodle_context`, detect the new version, and regenerate all 13 global indexes from scratch.

---

### Watch mode stops after restarting the server

**Symptom:** Automatic plugin monitoring stops working after restarting VS Code, Claude Code, or the MCP server.

**Cause:** Watch mode is **in-memory** — it does not persist between server restarts.

**Solution:** Reactivate monitoring after each restart:

```
Start monitoring the plugin local_myplugin for file changes.
```

---

### `.md` files appearing in `git status`

**Symptom:** `git status` shows dozens of new Markdown files in the Moodle installation.

**Solution:** Add the following to `.gitignore` in the Moodle root:

```gitignore
# moodle-dev-mcp context files
AI_CONTEXT.md
MOODLE_AI_*.md
MOODLE_*_INDEX.md
MOODLE_DEV_RULES.md
MOODLE_PLUGIN_GUIDE.md
PLUGIN_AI_*.md
PLUGIN_*_INDEX.md
PLUGIN_STRUCTURE.md
PLUGIN_DB_TABLES.md
PLUGIN_EVENTS.md
PLUGIN_ARCHITECTURE.md
PLUGIN_RUNTIME_FLOW.md
.moodle-mcp
```

---

## 🐳 Docker and Virtual Environments

### The MCP on the host cannot see Moodle in Docker

**Symptom:** The server returns that the folder is empty or does not exist, even with Moodle running in containers.

**Cause:** `MOODLE_PATH` must be the **host path** (your machine), not the internal container path.

**Solution:** In LuminaStack or any stack with a mounted volume, use the host path:

```json
"env": {
  "MOODLE_PATH": "/home/usuario/workspace/www/html/moodle"
}
```

The MCP on the host reads the files directly from the mounted volume — without needing to access the container.

---

## ❓ Common questions

### `scaffold_plugin` does not appear as a tool in `/mcp`

**This is expected.** `scaffold_plugin` is an **MCP Prompt**, not a Tool. It does not appear in the `/mcp` tool list — it is invoked directly in the chat as a prompt or slash command:

```
/scaffold_plugin type="local" name="mytools" description="..."
```

For the complete list of tools vs. prompts, see the [Tools Reference](../reference/tools.md) and the [Prompts Reference](../reference/prompts.md).

---

### The AI says it does not know `moodle-dev-mcp`

**Symptom:** The AI replies that it does not have access to the server or does not know what `moodle-dev-mcp` is.

**Solution:** Be more explicit in the instruction:

```
Use the get_plugin_info tool to load the context of the plugin local_myplugin.
```

```
Use the search_api tool to search for functions related to enrollment.
```

Naming the tool explicitly ensures the AI uses it instead of responding with generic knowledge.

---

## 📝 Reporting a new bug

If your issue is not listed here:

1. Ask the assistant: _"Run the moodle-dev-mcp doctor"_ and copy the full output
2. Note which AI client you are using (Claude Code, Gemini Code Assist) and its version
3. Open an **Issue** on GitHub: [https://github.com/kaduvelasco/moodle-dev-mcp/issues](https://github.com/kaduvelasco/moodle-dev-mcp/issues)
4. Describe the steps to reproduce the error and include the `doctor` output

---

> **Tip:** Restarting the IDE or the AI client process resolves many MCP server lock issues — especially after editing configuration files such as `~/.claude.json` or `~/.gemini/settings.json`.

---

[🏠 Back to Index](../index.md)
