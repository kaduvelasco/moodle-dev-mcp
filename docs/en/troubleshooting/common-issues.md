🇧🇷 [Português (BR)](../../pt-br/troubleshooting/common-issues.md) | **English** | 🏠 [Index](../index.md)

---

# Troubleshooting

Running into issues with `moodle-dev-mcp`? This page covers the most common errors with direct solutions.

---

## 🔍 Initial Diagnosis

Before investigating any specific problem, run these two steps — they resolve most cases:

**Step 1 — Check if the server is connected:**

In your AI client chat, run:
```
/mcp
```

If `moodle-dev-mcp` appears as connected with 11 tools, the server is working. The problem is in the context configuration, not the connection.

If it does not appear, the problem is in the server configuration — see the [Connection Errors](#-connection-and-path-errors) section below.

**Step 2 — Check environment health:**

```
Run the moodle-dev-mcp doctor.
```

The AI will call the `doctor` tool and return a report with: Node.js version, Moodle path, detected version, index freshness, and cache statistics. Any configuration problem will appear here.

---

## 🚫 Connection and PATH Errors

### The AI client cannot find `node` or `npx`

**Symptom:** Claude Code or Gemini Code Assist report they cannot connect to the server, or the server appears as "Connecting..." and never completes.

**Cause:** Version managers like `nvm`, `asdf`, and `mise` install Node in directories not included in the system's global PATH — which is the PATH the IDE inherits, not your interactive shell's.

**Solution:** Add the PATH explicitly in the `env` block of the server configuration.

```bash
# Find the correct path
which node
# → /home/user/.nvm/versions/node/v22.0.0/bin/node
```

**Claude Code (`~/.claude.json`):**
```json
{
  "mcpServers": {
    "moodle-dev-mcp": {
      "command": "npx",
      "args": ["-y", "moodle-dev-mcp"],
      "env": {
        "PATH": "/home/user/.nvm/versions/node/v22.0.0/bin:/usr/local/bin:/usr/bin:/bin",
        "MOODLE_PATH": "/home/user/workspace/www/html/moodle"
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
        "PATH": "/home/user/.nvm/versions/node/v22.0.0/bin:/usr/local/bin:/usr/bin:/bin",
        "MOODLE_PATH": "/home/user/workspace/www/html/moodle"
      }
    }
  }
}
```

**OpenAI Codex (`~/.codex/config.toml`):**
```toml
[mcp_servers.moodle-dev-mcp]
command  = "npx"
args     = ["-y", "moodle-dev-mcp"]
env_vars = ["PATH"]
env      = { MOODLE_PATH = "/home/user/workspace/www/html/moodle" }
```

**OpenCode (`opencode.json` at the Moodle root):**
```json
{
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

---

### Gemini stuck at "Connecting..."

**Symptom:** The server appears but never leaves the "Connecting..." state. No tools are listed.

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

---

### Moodle path not found

**Symptom:** The server starts but returns: _"Invalid Moodle path: version.php not found"_.

**Cause:** `MOODLE_PATH` points to a subdirectory or uses a relative path.

**Solution:**
- The path must point to the **Moodle root** — the directory containing `version.php` and the folders `admin/`, `local/`, `mod/`
- Use an **absolute path** (e.g. `/home/user/workspace/www/html/moodle`), never relative (e.g. `./moodle`)

---

## 🛠️ Build and Runtime Errors

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

After that, `dist/index.js` will be available. Whenever you modify source code in `src/`, run `npm run build` again.

---

### Permission denied when creating `.md` files (EACCES)

**Symptom:** The server connects, but when generating context it returns a permission error. The `PLUGIN_*.md` files are not created.

**Cause:** The user running Node does not have write permission on the Moodle directory or plugin directories.

**Solution on Linux (direct installation):**
```bash
sudo chown -R $USER:$USER /path/to/your/moodle/local/
```

**Solution with Docker (Scenario B — sidecar):**

Make sure the volume is not mounted as `:ro` (read-only). The server needs to write the `.md` context files:

```yaml
volumes:
  - ./www/html/moodle:/var/www/moodle  # without :ro
```

---

## 🔄 Context and Cache Issues

### The AI suggests code from an older version of the plugin

**Symptom:** You modified `db/install.xml` or a PHP file, but the AI still references the previous version of the fields or functions.

**Cause:** The mtime cache may not have detected the change, or the plugin context was not regenerated after the changes.

**Solution — for a specific plugin:**
```
Regenerate the context for local_myplugin.
```

**Solution — for all global indexes:**
```
Regenerate all Moodle indexes ignoring the cache.
```

The AI will call `update_indexes` with `force=true`, clearing the cache and regenerating all files.

---

### Stale context after a Moodle upgrade

**Symptom:** After upgrading Moodle to a new version, the AI still reports the old version and functions that were deprecated or removed.

**Solution:**
```
Reinitialize the moodle-dev-mcp context for the Moodle installation.
```

The AI will call `init_moodle_context`, detect the new version, and regenerate all 13 global indexes from scratch.

---

### Watch mode stops after restarting the server

**Symptom:** Automatic plugin monitoring stops working after restarting VS Code, Claude Code, or the MCP server.

**Cause:** Watch mode is **in-memory** — it does not persist across server restarts.

**Solution:** Reactivate monitoring after each restart:
```
Start monitoring local_myplugin for file changes.
```

---

### `.md` files appearing in `git status`

**Symptom:** `git status` shows dozens of new Markdown files in the Moodle installation.

**Solution:** Add to `.gitignore` at the Moodle root:

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

### MCP on the host cannot see Moodle in Docker

**Symptom:** The server reports the folder is empty or does not exist, even with Moodle running in containers.

**Cause:** `MOODLE_PATH` must be the path **on the host** (your machine), not the internal container path.

**Solution:** In LuminaStack or any stack with a mounted volume, use the host path:

```json
"env": {
  "MOODLE_PATH": "/home/user/workspace/www/html/moodle"
}
```

The MCP on the host reads directly from the mounted volume files — without needing to access the container.

---

## ❓ Common Questions

### `scaffold_plugin` does not appear as a tool in `/mcp`

**This is expected.** `scaffold_plugin` is an **MCP Prompt**, not a Tool. It does not appear in the `/mcp` tool list — it is invoked directly in chat as a prompt or slash command:

```
/scaffold_plugin type="local" name="mytools" description="..."
```

For the complete list of tools vs. prompts, see the [Tools Reference](../reference/tools.md) and the [Prompts Reference](../reference/prompts.md).

---

### The AI says it doesn't know `moodle-dev-mcp`

**Symptom:** The AI responds that it doesn't have access to the server or doesn't know what `moodle-dev-mcp` is.

**Solution:** Be more explicit in your instruction:

```
Use the get_plugin_info tool to load the context for local_myplugin.
```

```
Use the search_api tool to find functions related to enrollment.
```

Naming the tool explicitly ensures the AI uses it instead of responding with generic knowledge.

---

## 📝 Reporting a New Bug

If your problem is not listed here:

1. Ask your assistant: _"Run the moodle-dev-mcp doctor"_ and copy the full output
2. Note which AI client you are using (Claude Code, Gemini Code Assist, OpenAI Codex, OpenCode) and the version
3. Open an **Issue** on GitHub: [github.com/kaduvelasco/moodle-dev-mcp/issues](https://github.com/kaduvelasco/moodle-dev-mcp/issues)
4. Describe the steps to reproduce the error and include the `doctor` output

---

> **Tip:** Restarting the IDE or the AI client process resolves most MCP server hang issues — especially after editing configuration files like `~/.claude.json`, `~/.gemini/settings.json`, `~/.codex/config.toml`, or `opencode.json`.

---

[🏠 Back to Index](../index.md)
